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
import org.web3j.tuples.generated.Tuple3;
import org.web3j.tx.RawTransactionManager;
import org.web3j.tx.TransactionManager;
import org.web3j.tx.gas.DefaultGasProvider;

import java.math.BigInteger;
import java.util.List;

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

    public String updateCandidateOnChain(BigInteger candidateId, BigInteger positionId, String name) {
        log.info("Submitting updateCandidate transaction to blockchain: candidateId={}, positionId={}, name={}", candidateId, positionId, name);
        try {
            VotingSystem contract = loadContract();
            TransactionReceipt receipt = contract.updateCandidate(candidateId, positionId, name).send();
            log.info("updateCandidate transaction succeeded. TxHash: {}", receipt.getTransactionHash());
            return receipt.getTransactionHash();
        } catch (Exception e) {
            log.error("Blockchain error executing updateCandidate(id={}): {}", candidateId, e.getMessage(), e);
            throw new ApiException(HttpStatus.CONFLICT, "Failed to update candidate on-chain: " + e.getMessage());
        }
    }

    public String removeCandidateOnChain(BigInteger candidateId) {
        log.info("Submitting removeCandidate transaction to blockchain: candidateId={}", candidateId);
        try {
            VotingSystem contract = loadContract();
            TransactionReceipt receipt = contract.removeCandidate(candidateId).send();
            log.info("removeCandidate transaction succeeded. TxHash: {}", receipt.getTransactionHash());
            return receipt.getTransactionHash();
        } catch (Exception e) {
            log.error("Blockchain error executing removeCandidate(id={}): {}", candidateId, e.getMessage(), e);
            throw new ApiException(HttpStatus.CONFLICT, "Failed to remove candidate on-chain: " + e.getMessage());
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

    /**
     * Submits a bundled ballot on-chain via castVote(bytes32, uint256[], uint256[]).
     * Converts token hash string to byte[32] and Long lists to BigInteger lists.
     *
     * @param tokenHash Hexadecimal SHA-256 hash string of the voting token
     * @param positionIds List of position IDs selected
     * @param candidateIds List of candidate IDs selected (parallel array to positionIds)
     * @return Ethereum transaction hash of the mined vote transaction
     */
    public String castVote(String tokenHash, List<Long> positionIds, List<Long> candidateIds) throws Exception {
        log.info("Initiating smart contract write: castVote() for token (Hash prefix: {}) at address [{}]",
                tokenHash.substring(0, 10), contractAddress);

        try {
            VotingSystem contract = loadContract();

            // Convert tokenHash string (64-char hex) to byte[32] for bytes32 parameter
            byte[] bytes32TokenHash = hexStringToByteArray(tokenHash);

            // Convert List<Long> to List<BigInteger> for uint256[] parameters
            List<BigInteger> positionIdsBigInt = positionIds.stream()
                    .map(BigInteger::valueOf)
                    .toList();

            List<BigInteger> candidateIdsBigInt = candidateIds.stream()
                    .map(BigInteger::valueOf)
                    .toList();

            TransactionReceipt receipt = contract.castVote(bytes32TokenHash, positionIdsBigInt, candidateIdsBigInt).send();
            String txHash = receipt.getTransactionHash();

            log.info("Smart contract write castVote() succeeded for token (Hash prefix: {}). txHash: {}",
                    tokenHash.substring(0, 10), txHash);

            return txHash;

        } catch (Exception e) {
            log.error("Smart contract write castVote() failed for token (Hash prefix: {}): ", tokenHash.substring(0, 10), e);
            throw e; // Rethrown so VotingService can catch and translate reverts gracefully
        }
    }

    /**
     * Queries getResults(positionId) on-chain.
     * Returns Tuple3 of (candidateIds, names, voteCounts).
     * Translates revert (election still open) vs success (deadline passed or election closed).
     */
    public Tuple3<List<BigInteger>, List<String>, List<BigInteger>> getResults(Long positionId) {
        log.info("Initiating smart contract read call: getResults(positionId={}) at address [{}]", positionId, contractAddress);

        try {
            VotingSystem contract = loadContract();
            Tuple3<List<BigInteger>, List<String>, List<BigInteger>> rawResults =
                    contract.getResults(BigInteger.valueOf(positionId)).send();

            log.info("Smart contract read getResults() succeeded for positionId {}", positionId);
            return rawResults;

        } catch (Exception e) {
            log.info("Smart contract read getResults() failed/reverted at address [{}]: {}", contractAddress, e.getMessage());

            String rawError = e.getMessage() != null ? e.getMessage() : "";
            if (rawError.contains("Results available only after election ends")) {
                throw new ApiException(HttpStatus.OK, "Election is still open. Results are not available yet.");
            }

            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Error querying blockchain contract results: " + e.getMessage()
            );
        }
    }

    /**
     * Issues closeElection() transaction on-chain as housekeeping action.
     */
    public String closeElection() {
        log.info("Initiating smart contract write: closeElection() at address [{}]", contractAddress);

        try {
            VotingSystem contract = loadContract();

            TransactionReceipt receipt = contract.closeElection().send();
            String txHash = receipt.getTransactionHash();

            log.info("Smart contract write closeElection() succeeded. txHash: {}", txHash);
            return txHash;

        } catch (Exception e) {
            log.error("Failed to execute smart contract write closeElection() at address [{}]: ", contractAddress, e);

            String rawError = e.getMessage() != null ? e.getMessage() : "";
            if (rawError.contains("Already closed")) {
                throw new ApiException(HttpStatus.CONFLICT, "Election has already been closed on-chain");
            }

            throw new ApiException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Blockchain error while closing election: " + e.getMessage()
            );
        }
    }

    public boolean isTokenUsedOnChain(String tokenHash) {
        try {
            return VotingSystem.load(contractAddress, web3j, credentials, new DefaultGasProvider())
                    .usedTokens(hexStringToByteArray(tokenHash)).send();
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Unable to query token status on blockchain");
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

    private static byte[] hexStringToByteArray(String s) {
        String cleanHex = s.startsWith("0x") ? s.substring(2) : s;
        int len = cleanHex.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(cleanHex.charAt(i), 16) << 4)
                    + Character.digit(cleanHex.charAt(i + 1), 16));
        }
        return data;
    }

    public record CandidateWriteResult(Long assignedId, String transactionHash) {}
    public record PositionWriteResult(Long assignedId, String transactionHash) {}
}
