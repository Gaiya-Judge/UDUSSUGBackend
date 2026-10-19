const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const artifact = require("../src/main/resources/contracts/VotingSystem.json");

const DAY = 24 * 60 * 60;

async function latestTimestamp() {
  return Number((await ethers.provider.getBlock("latest")).timestamp);
}

async function setTime(timestamp) {
  await network.provider.send("evm_setNextBlockTimestamp", [timestamp]);
  await network.provider.send("evm_mine");
}

async function deploy() {
  const [admin, voter, other] = await ethers.getSigners();
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, admin);
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  return { contract, admin, voter, other };
}

function eventArgs(contract, receipt, eventName) {
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed?.name === eventName) return parsed.args;
    } catch (_) {
      // Ignore logs from other interfaces.
    }
  }
  throw new Error(`Missing ${eventName} event`);
}

async function addPosition(contract, name) {
  const receipt = await (await contract.addPosition(name)).wait();
  return eventArgs(contract, receipt, "PositionAdded").positionId;
}

async function addCandidate(contract, positionId, name) {
  const receipt = await (await contract.addCandidate(positionId, name)).wait();
  return eventArgs(contract, receipt, "CandidateAdded").candidateId;
}

async function setWindow(contract, start, end) {
  await contract.setElectionTimes(start, end);
}

async function preparedElection() {
  const ctx = await deploy();
  const positionId = await addPosition(ctx.contract, "President");
  const candidateId = await addCandidate(ctx.contract, positionId, "Candidate A");
  return { ...ctx, positionId, candidateId };
}

async function activeElection() {
  const ctx = await preparedElection();
  const now = await latestTimestamp();
  await setWindow(ctx.contract, now - 10, now + DAY);
  return ctx;
}

function token(label) {
  return ethers.id(label);
}

describe("VotingSystem", function () {
  it("rejects castVote from a non-admin", async function () {
    const { contract, voter, positionId, candidateId } = await activeElection();
    await expect(contract.connect(voter).castVote(token("unauthorized"), [positionId], [candidateId]))
      .to.be.revertedWith("Not authorized: admin only");
  });

  it("allows the admin to cast a vote during the election and updates candidate counts and turnout", async function () {
    const { contract, positionId, candidateId } = await activeElection();
    await contract.castVote(token("valid vote"), [positionId], [candidateId]);
    const candidate = await contract.candidates(candidateId);
    expect(candidate.voteCount).to.equal(1n);
    expect(await contract.getTurnout()).to.equal(1n);
  });

  it("rejects reuse of the same token", async function () {
    const { contract, positionId, candidateId } = await activeElection();
    const voteToken = token("one use");
    await contract.castVote(voteToken, [positionId], [candidateId]);
    await expect(contract.castVote(voteToken, [positionId], [candidateId]))
      .to.be.revertedWith("Token already used");
  });

  it("rejects voting before the start", async function () {
    const { contract, positionId, candidateId } = await preparedElection();
    const now = await latestTimestamp();
    await setWindow(contract, now + 100, now + 200);
    await expect(contract.castVote(token("before start"), [positionId], [candidateId]))
      .to.be.revertedWith("Election is not active");
  });

  it("rejects voting after the end", async function () {
    const { contract, positionId, candidateId } = await preparedElection();
    const now = await latestTimestamp();
    await setWindow(contract, now - 200, now - 100);
    await expect(contract.castVote(token("after end"), [positionId], [candidateId]))
      .to.be.revertedWith("Election is not active");
  });

  it("rejects voting after closeElection", async function () {
    const { contract, positionId, candidateId } = await activeElection();
    await contract.closeElection();
    await expect(contract.castVote(token("after close"), [positionId], [candidateId]))
      .to.be.revertedWith("Election is not active");
  });

  it("rejects an inactive candidate", async function () {
    const { contract, positionId, candidateId } = await preparedElection();
    await contract.removeCandidate(candidateId);
    const now = await latestTimestamp();
    await setWindow(contract, now - 10, now + DAY);
    await expect(contract.castVote(token("inactive candidate"), [positionId], [candidateId]))
      .to.be.revertedWith("Candidate is no longer active");
  });

  it("rejects a candidate belonging to another position", async function () {
    const { contract, positionId } = await preparedElection();
    const otherPosition = await addPosition(contract, "Treasurer");
    const otherCandidate = await addCandidate(contract, otherPosition, "Candidate B");
    const now = await latestTimestamp();
    await setWindow(contract, now - 10, now + DAY);
    await expect(contract.castVote(token("wrong position"), [positionId], [otherCandidate]))
      .to.be.revertedWith("Candidate does not belong to this position");
  });

  it("locks position and candidate changes after start, then allows available mutations after close", async function () {
    const { contract, positionId, candidateId } = await activeElection();
    const locked = "Election already started: candidates and positions are locked";
    await expect(contract.addPosition("Treasurer")).to.be.revertedWith(locked);
    await expect(contract.addCandidate(positionId, "Candidate B")).to.be.revertedWith(locked);
    await expect(contract.updateCandidate(candidateId, positionId, "Candidate A Updated")).to.be.revertedWith(locked);
    await expect(contract.removeCandidate(candidateId)).to.be.revertedWith(locked);

    await contract.closeElection();
    const newPosition = await addPosition(contract, "Treasurer");
    const newCandidate = await addCandidate(contract, newPosition, "Candidate B");
    await contract.updateCandidate(newCandidate, newPosition, "Candidate B Updated");
    await contract.removeCandidate(newCandidate);
    expect((await contract.candidates(newCandidate)).active).to.equal(false);
  });

  it("rejects getResults while the election is open and returns results after the end", async function () {
    const { contract, positionId, candidateId } = await activeElection();
    await contract.castVote(token("results"), [positionId], [candidateId]);
    await expect(contract.getResults(positionId)).to.be.revertedWith("Results available only after election ends");
    const now = await latestTimestamp();
    await setTime(now + DAY + 1);
    const [ids, names, votes] = await contract.getResults(positionId);
    expect(ids).to.include(candidateId);
    expect(names).to.include("Candidate A");
    expect(votes).to.include(1n);
  });

  it("rejects setElectionTimes during the election", async function () {
    const { contract } = await activeElection();
    const now = await latestTimestamp();
    await expect(contract.setElectionTimes(now + 100, now + 200))
      .to.be.revertedWith("Election in progress: cannot reschedule");
  });

  it("allows setElectionTimes after the end and resets turnout", async function () {
    const { contract, positionId, candidateId } = await activeElection();
    await contract.castVote(token("turnout reset"), [positionId], [candidateId]);
    expect(await contract.getTurnout()).to.equal(1n);
    const now = await latestTimestamp();
    await setTime(now + DAY + 1);
    const endedAt = await latestTimestamp();
    await contract.setElectionTimes(endedAt + 100, endedAt + 200);
    expect(await contract.getTurnout()).to.equal(0n);
  });
});
