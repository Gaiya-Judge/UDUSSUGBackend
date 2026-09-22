package com.udusug.voting.blockchain.service;

import com.udu.sug.voting.contract.VotingSystem;
import com.udusug.voting.exception.ApiException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.tx.RawTransactionManager;
import org.web3j.tx.TransactionManager;
import org.web3j.tx.gas.DefaultGasProvider;

import java.math.BigInteger;

@Slf4j
@Service
@RequiredArgsConstructor
public class VotingContractService {

    private final Web3j web3j;
    private final Credentials credentials;

    @Value("${blockchain.contract.address}")
    private String contractAddress;

    @Value("${app.web3j.chain-id}")
    private long chainId;

    /**
     * Reads total votes cast directly from the deployed VotingSystem smart contract.
     *
     * @return total votes cast as a plain Java long
     */
    public long getTurnout() {
        log.info("Initiating smart contract read call: getTurnout() at address [{}]", contractAddress);

        try {
            VotingSystem contract = VotingSystem.load(
                    contractAddress,
                    web3j,
                    credentials,
                    new DefaultGasProvider()
            );

            BigInteger turnoutBigInt = contract.getTurnout().send();
            long turnout = turnoutBigInt.longValueExact();

            log.info("Smart contract read getTurnout() succeeded. Total votes cast: {}", turnout);
            return turnout;

        } catch (Exception e) {
            log.error("Failed to execute smart contract read call getTurnout() at address [{}]: ", contractAddress, e);
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Error querying blockchain contract turnout: " + e.getMessage()
            );
        }
    }


    /**
     * Reads positionCount BEFORE calling addPosition on-chain to capture the exact assigned ID.
     *
     * @param name Name of the position to add
     * @return Result object containing the captured assigned ID and the transaction hash
     */
    public PositionWriteResult addPosition(String name) {
        log.info("Initiating smart contract write: addPosition(name={}) at address [{}]", name, contractAddress);

        try {
            VotingSystem contract = loadContract();

            // Read-before-write: positionCount IS the ID about to be assigned
            BigInteger assignedIdBigInt = contract.positionCount().send();
            Long assignedId = assignedIdBigInt.longValueExact();
            log.info("Captured target on-chain positionId before write: {}", assignedId);

            TransactionReceipt receipt = contract.addPosition(name).send();
            String txHash = receipt.getTransactionHash();

            log.info("Smart contract write addPosition() succeeded. Assigned positionId: {}, txHash: {}", assignedId, txHash);
            return new PositionWriteResult(assignedId, txHash);

        } catch (Exception e) {
            log.error("Failed to execute smart contract write addPosition(name={}) at address [{}]: ", name, contractAddress, e);
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Blockchain error while adding position: " + e.getMessage()
            );
        }
    }

    /**
     * Reads candidateCount BEFORE calling addCandidate on-chain to capture the exact assigned ID.
     *
     * @param positionId On-chain ID of the position this candidate belongs to
     * @param name Name of the candidate
     * @return Result object containing the captured assigned ID and the transaction hash
     */
    public CandidateWriteResult addCandidate(BigInteger positionId, String name) {
        log.info("Initiating smart contract write: addCandidate(positionId={}, name={}) at address [{}]", positionId, name, contractAddress);

        try {
            VotingSystem contract = loadContract();

            // Read-before-write: candidateCount IS the ID about to be assigned
            BigInteger assignedIdBigInt = contract.candidateCount().send();
            Long assignedId = assignedIdBigInt.longValueExact();
            log.info("Captured target on-chain candidateId before write: {}", assignedId);

            TransactionReceipt receipt = contract.addCandidate(positionId, name).send();
            String txHash = receipt.getTransactionHash();

            log.info("Smart contract write addCandidate() succeeded. Assigned candidateId: {}, txHash: {}", assignedId, txHash);
            return new CandidateWriteResult(assignedId, txHash);

        } catch (Exception e) {
            log.error("Failed to execute smart contract write addCandidate(positionId={}, name={}) at address [{}]: ", positionId, name, contractAddress, e);
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Blockchain error while adding candidate: " + e.getMessage()
            );
        }
    }

    /**
     * Sets the start and end timestamps for the election on-chain.
     *
     * @param startTime Epoch timestamp in seconds
     * @param endTime Epoch timestamp in seconds
     * @return Transaction hash of the submitted transaction
     */
    public String setElectionTimes(BigInteger startTime, BigInteger endTime) {
        log.info("Initiating smart contract write: setElectionTimes(startTime={}, endTime={}) at address [{}]", startTime, endTime, contractAddress);

        try {
            VotingSystem contract = loadContract();

            TransactionReceipt receipt = contract.setElectionTimes(startTime, endTime).send();
            String txHash = receipt.getTransactionHash();

            log.info("Smart contract write setElectionTimes() succeeded. txHash: {}", txHash);
            return txHash;

        } catch (Exception e) {
            log.error("Failed to execute smart contract write setElectionTimes(startTime={}, endTime={}) at address [{}]: ", startTime, endTime, contractAddress, e);
            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Blockchain error while setting election times: " + e.getMessage()
            );
        }
    }

    private VotingSystem loadContract() {
        TransactionManager transactionManager = new RawTransactionManager(web3j, credentials, chainId);
        return VotingSystem.load(
                contractAddress,
                web3j,
                transactionManager,
                new DefaultGasProvider()
        );
    }

    public record CandidateWriteResult(Long assignedId, String transactionHash) {}
    public record PositionWriteResult(Long assignedId, String transactionHash) {}
}
