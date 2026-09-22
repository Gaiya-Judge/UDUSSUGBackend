package com.udu.sug.voting.contract;

import io.reactivex.Flowable;
import java.math.BigInteger;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Callable;
import org.web3j.abi.EventEncoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.Address;
import org.web3j.abi.datatypes.Bool;
import org.web3j.abi.datatypes.DynamicArray;
import org.web3j.abi.datatypes.Event;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Type;
import org.web3j.abi.datatypes.Utf8String;
import org.web3j.abi.datatypes.generated.Bytes32;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameter;
import org.web3j.protocol.core.RemoteCall;
import org.web3j.protocol.core.RemoteFunctionCall;
import org.web3j.protocol.core.methods.request.EthFilter;
import org.web3j.protocol.core.methods.response.BaseEventResponse;
import org.web3j.protocol.core.methods.response.Log;
import org.web3j.protocol.core.methods.response.TransactionReceipt;
import org.web3j.tuples.generated.Tuple3;
import org.web3j.tuples.generated.Tuple5;
import org.web3j.tx.Contract;
import org.web3j.tx.TransactionManager;
import org.web3j.tx.gas.ContractGasProvider;

/**
 * <p>Auto generated code.
 * <p><strong>Do not modify!</strong>
 * <p>Please use the <a href="https://docs.web3j.io/command_line.html">web3j command line tools</a>,
 * or the org.web3j.codegen.SolidityFunctionWrapperGenerator in the 
 * <a href="https://github.com/web3j/web3j/tree/master/codegen">codegen module</a> to update.
 *
 * <p>Generated with web3j version 4.9.8.
 */
@SuppressWarnings("rawtypes")
public class VotingSystem extends Contract {
    public static final String BINARY = "0x6080604052348015600e575f5ffd5b505f80546001600160a01b031916331790556112bf8061002d5f395ff3fe608060405234801561000f575f5ffd5b5060043610610106575f3560e01c806389001b7c1161009e578063c1211c861161006e578063c1211c8614610221578063ce7ea1611461022a578063e7702d0514610233578063f851a4401461023c578063fb9b4cba14610266575f5ffd5b806389001b7c146101db57806399fbab88146101e3578063a9a981a314610205578063c06412da1461020e575f5ffd5b80634c901b99116100d95780634c901b991461018d5780636c6c32d01461019a5780637de418d5146101a257806381a60c0d146101b9575f5ffd5b80631750a3d01461010a57806325d5b5cf1461011f57806330f3de74146101325780633477ee2e14610169575b5f5ffd5b61011d610118366004610dc7565b610279565b005b61011d61012d366004610e0b565b6103a4565b610154610140366004610e2b565b60086020525f908152604090205460ff1681565b60405190151581526020015b60405180910390f35b61017c610177366004610e2b565b610431565b604051610160959493929190610e70565b6003546101549060ff1681565b61011d6104e9565b6101ab60095481565b604051908152602001610160565b6101cc6101c7366004610e2b565b61055b565b60405161016093929190610ee1565b6009546101ab565b6101f66101f1366004610e2b565b610819565b60405161016093929190610f69565b6101ab60075481565b61011d61021c366004611013565b6108c4565b6101ab60015481565b6101ab60025481565b6101ab60055481565b5f5461024e906001600160a01b031681565b6040516001600160a01b039091168152602001610160565b61011d610274366004611080565b610c76565b5f546001600160a01b031633146102ab5760405162461bcd60e51b81526004016102a2906110ba565b60405180910390fd5b5f8281526004602052604090206002015460ff1661030b5760405162461bcd60e51b815260206004820152601760248201527f506f736974696f6e20646f6573206e6f7420657869737400000000000000000060448201526064016102a2565b6040805160a08101825260075480825260208083018681528385018681525f6060860181905260016080870181905294815260069093529490912083518155905191810191909155915190919060028201906103679082611175565b50606082015160038201556080909101516004909101805460ff191691151591909117905560078054905f61039b83611244565b91905055505050565b5f546001600160a01b031633146103cd5760405162461bcd60e51b81526004016102a2906110ba565b8181116104265760405162461bcd60e51b815260206004820152602160248201527f456e642074696d65206d7573742062652061667465722073746172742074696d6044820152606560f81b60648201526084016102a2565b600191909155600255565b60066020525f908152604090208054600182015460028301805492939192610458906110f1565b80601f0160208091040260200160405190810160405280929190818152602001828054610484906110f1565b80156104cf5780601f106104a6576101008083540402835291602001916104cf565b820191905f5260205f20905b8154815290600101906020018083116104b257829003601f168201915b50505050600383015460049093015491929160ff16905085565b5f546001600160a01b031633146105125760405162461bcd60e51b81526004016102a2906110ba565b6003805460ff191660011790556040517f393c4b8e62f1195313cf17dcf00793c668ddfc35881cd8015559c074f6d61e83906105519042815260200190565b60405180910390a1565b606080606060025442116105a75760405162461bcd60e51b815260206004820152601360248201527222b632b1ba34b7b71039ba34b6361037b832b760691b60448201526064016102a2565b5f805b6007548110156105e2575f818152600660205260409020600101548690036105da57816105d681611244565b9250505b6001016105aa565b508067ffffffffffffffff8111156105fc576105fc610d16565b604051908082528060200260200182016040528015610625578160200160208202803683370190505b5093508067ffffffffffffffff81111561064157610641610d16565b60405190808252806020026020018201604052801561067457816020015b606081526020019060019003908161065f5790505b5092508067ffffffffffffffff81111561069057610690610d16565b6040519080825280602002602001820160405280156106b9578160200160208202803683370190505b5091505f805b60075481101561080f575f81815260066020526040902060010154879003610807575f8181526006602052604090205486518790849081106107035761070361125c565b60200260200101818152505060065f8281526020019081526020015f20600201805461072e906110f1565b80601f016020809104026020016040519081016040528092919081815260200182805461075a906110f1565b80156107a55780601f1061077c576101008083540402835291602001916107a5565b820191905f5260205f20905b81548152906001019060200180831161078857829003601f168201915b50505050508583815181106107bc576107bc61125c565b602002602001018190525060065f8281526020019081526020015f20600301548483815181106107ee576107ee61125c565b60209081029190910101528161080381611244565b9250505b6001016106bf565b5050509193909250565b60046020525f90815260409020805460018201805491929161083a906110f1565b80601f0160208091040260200160405190810160405280929190818152602001828054610866906110f1565b80156108b15780601f10610888576101008083540402835291602001916108b1565b820191905f5260205f20905b81548152906001019060200180831161089457829003601f168201915b5050506002909301549192505060ff1683565b60015442101580156108d857506002544211155b61091d5760405162461bcd60e51b8152602060048201526016602482015275456c656374696f6e206973206e6f742061637469766560501b60448201526064016102a2565b60035460ff16156109655760405162461bcd60e51b8152602060048201526012602482015271115b1958dd1a5bdb881a5cc818db1bdcd95960721b60448201526064016102a2565b80518251146109b65760405162461bcd60e51b815260206004820152601c60248201527f496e70757420617272617973206c656e677468206d69736d617463680000000060448201526064016102a2565b5f8381526008602052604090205460ff1615610a095760405162461bcd60e51b8152602060048201526012602482015271151bdad95b88185b1c9958591e481d5cd95960721b60448201526064016102a2565b5f5b8251811015610abe575f610a20826001611270565b90505b8351811015610ab557838181518110610a3e57610a3e61125c565b6020026020010151848381518110610a5857610a5861125c565b602002602001015103610aad5760405162461bcd60e51b815260206004820152601a60248201527f4475706c696361746520706f736974696f6e20696e20766f746500000000000060448201526064016102a2565b600101610a23565b50600101610a0b565b505f5b8251811015610c0b575f828281518110610add57610add61125c565b602002602001015190505f848381518110610afa57610afa61125c565b6020908102919091018101515f848152600690925260409091206004015490915060ff16610b6a5760405162461bcd60e51b815260206004820152601860248201527f43616e64696461746520646f6573206e6f74206578697374000000000000000060448201526064016102a2565b5f828152600660205260409020600101548114610bdc5760405162461bcd60e51b815260206004820152602a60248201527f43616e64696461746520646f6573206e6f742062656c6f6e6720746f2074686960448201526939903837b9b4ba34b7b760b11b60648201526084016102a2565b5f828152600660205260408120600301805491610bf883611244565b909155505060019092019150610ac19050565b505f838152600860205260408120805460ff191660011790556009805491610c3283611244565b9190505550827fd10f6697fe785cf6ab300b0a28e7b2403b8742966ec5535806af5b24613611a442604051610c6991815260200190565b60405180910390a2505050565b5f546001600160a01b03163314610c9f5760405162461bcd60e51b81526004016102a2906110ba565b60408051606081018252600554808252602080830185815260018486018190525f93845260049092529390912082518155925191929190820190610ce39082611175565b50604091909101516002909101805460ff191691151591909117905560058054905f610d0e83611244565b919050555050565b634e487b7160e01b5f52604160045260245ffd5b604051601f8201601f1916810167ffffffffffffffff81118282101715610d5357610d53610d16565b604052919050565b5f82601f830112610d6a575f5ffd5b813567ffffffffffffffff811115610d8457610d84610d16565b610d97601f8201601f1916602001610d2a565b818152846020838601011115610dab575f5ffd5b816020850160208301375f918101602001919091529392505050565b5f5f60408385031215610dd8575f5ffd5b82359150602083013567ffffffffffffffff811115610df5575f5ffd5b610e0185828601610d5b565b9150509250929050565b5f5f60408385031215610e1c575f5ffd5b50508035926020909101359150565b5f60208284031215610e3b575f5ffd5b5035919050565b5f81518084528060208401602086015e5f602082860101526020601f19601f83011685010191505092915050565b85815284602082015260a060408201525f610e8e60a0830186610e42565b6060830194909452509015156080909101529392505050565b5f8151808452602084019350602083015f5b82811015610ed7578151865260209586019590910190600101610eb9565b5093949350505050565b606081525f610ef36060830186610ea7565b828103602084015280855180835260208301915060208160051b840101602088015f5b83811015610f4857601f19868403018552610f32838351610e42565b6020958601959093509190910190600101610f16565b50508581036040870152610f5c8188610ea7565b9998505050505050505050565b838152606060208201525f610f816060830185610e42565b90508215156040830152949350505050565b5f82601f830112610fa2575f5ffd5b813567ffffffffffffffff811115610fbc57610fbc610d16565b8060051b610fcc60208201610d2a565b91825260208185018101929081019086841115610fe7575f5ffd5b6020860192505b83831015611009578235825260209283019290910190610fee565b9695505050505050565b5f5f5f60608486031215611025575f5ffd5b83359250602084013567ffffffffffffffff811115611042575f5ffd5b61104e86828701610f93565b925050604084013567ffffffffffffffff81111561106a575f5ffd5b61107686828701610f93565b9150509250925092565b5f60208284031215611090575f5ffd5b813567ffffffffffffffff8111156110a6575f5ffd5b6110b284828501610d5b565b949350505050565b6020808252601a908201527f4e6f7420617574686f72697a65643a2061646d696e206f6e6c79000000000000604082015260600190565b600181811c9082168061110557607f821691505b60208210810361112357634e487b7160e01b5f52602260045260245ffd5b50919050565b601f82111561117057805f5260205f20601f840160051c8101602085101561114e5750805b601f840160051c820191505b8181101561116d575f815560010161115a565b50505b505050565b815167ffffffffffffffff81111561118f5761118f610d16565b6111a38161119d84546110f1565b84611129565b6020601f8211600181146111d5575f83156111be5750848201515b5f19600385901b1c1916600184901b17845561116d565b5f84815260208120601f198516915b8281101561120457878501518255602094850194600190920191016111e4565b508482101561122157868401515f19600387901b60f8161c191681555b50505050600190811b01905550565b634e487b7160e01b5f52601160045260245ffd5b5f6001820161125557611255611230565b5060010190565b634e487b7160e01b5f52603260045260245ffd5b8082018082111561128357611283611230565b9291505056fea26469706673582212200e2abe0ce1b63a5241277f8578916e31780a4c77ca42c6811d0ae3ba910efe2264736f6c634300081c0033";

    public static final String FUNC_ADDCANDIDATE = "addCandidate";

    public static final String FUNC_ADDPOSITION = "addPosition";

    public static final String FUNC_ADMIN = "admin";

    public static final String FUNC_CANDIDATECOUNT = "candidateCount";

    public static final String FUNC_CANDIDATES = "candidates";

    public static final String FUNC_CASTVOTE = "castVote";

    public static final String FUNC_CLOSEELECTION = "closeElection";

    public static final String FUNC_ELECTIONCLOSED = "electionClosed";

    public static final String FUNC_ELECTIONEND = "electionEnd";

    public static final String FUNC_ELECTIONSTART = "electionStart";

    public static final String FUNC_GETRESULTS = "getResults";

    public static final String FUNC_GETTURNOUT = "getTurnout";

    public static final String FUNC_POSITIONCOUNT = "positionCount";

    public static final String FUNC_POSITIONS = "positions";

    public static final String FUNC_SETELECTIONTIMES = "setElectionTimes";

    public static final String FUNC_TOTALVOTESCAST = "totalVotesCast";

    public static final String FUNC_USEDTOKENS = "usedTokens";

    public static final Event ELECTIONCLOSED_EVENT = new Event("ElectionClosed", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
    ;

    public static final Event VOTECAST_EVENT = new Event("VoteCast", 
            Arrays.<TypeReference<?>>asList(new TypeReference<Bytes32>(true) {}, new TypeReference<Uint256>() {}));
    ;

    @Deprecated
    protected VotingSystem(String contractAddress, Web3j web3j, Credentials credentials, BigInteger gasPrice, BigInteger gasLimit) {
        super(BINARY, contractAddress, web3j, credentials, gasPrice, gasLimit);
    }

    protected VotingSystem(String contractAddress, Web3j web3j, Credentials credentials, ContractGasProvider contractGasProvider) {
        super(BINARY, contractAddress, web3j, credentials, contractGasProvider);
    }

    @Deprecated
    protected VotingSystem(String contractAddress, Web3j web3j, TransactionManager transactionManager, BigInteger gasPrice, BigInteger gasLimit) {
        super(BINARY, contractAddress, web3j, transactionManager, gasPrice, gasLimit);
    }

    protected VotingSystem(String contractAddress, Web3j web3j, TransactionManager transactionManager, ContractGasProvider contractGasProvider) {
        super(BINARY, contractAddress, web3j, transactionManager, contractGasProvider);
    }

    public static List<ElectionClosedEventResponse> getElectionClosedEvents(TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = staticExtractEventParametersWithLog(ELECTIONCLOSED_EVENT, transactionReceipt);
        ArrayList<ElectionClosedEventResponse> responses = new ArrayList<ElectionClosedEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            ElectionClosedEventResponse typedResponse = new ElectionClosedEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.timestamp = (BigInteger) eventValues.getNonIndexedValues().get(0).getValue();
            responses.add(typedResponse);
        }
        return responses;
    }

    public static ElectionClosedEventResponse getElectionClosedEventFromLog(Log log) {
        Contract.EventValuesWithLog eventValues = staticExtractEventParametersWithLog(ELECTIONCLOSED_EVENT, log);
        ElectionClosedEventResponse typedResponse = new ElectionClosedEventResponse();
        typedResponse.log = log;
        typedResponse.timestamp = (BigInteger) eventValues.getNonIndexedValues().get(0).getValue();
        return typedResponse;
    }

    public Flowable<ElectionClosedEventResponse> electionClosedEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(log -> getElectionClosedEventFromLog(log));
    }

    public Flowable<ElectionClosedEventResponse> electionClosedEventFlowable(DefaultBlockParameter startBlock, DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(ELECTIONCLOSED_EVENT));
        return electionClosedEventFlowable(filter);
    }

    public static List<VoteCastEventResponse> getVoteCastEvents(TransactionReceipt transactionReceipt) {
        List<Contract.EventValuesWithLog> valueList = staticExtractEventParametersWithLog(VOTECAST_EVENT, transactionReceipt);
        ArrayList<VoteCastEventResponse> responses = new ArrayList<VoteCastEventResponse>(valueList.size());
        for (Contract.EventValuesWithLog eventValues : valueList) {
            VoteCastEventResponse typedResponse = new VoteCastEventResponse();
            typedResponse.log = eventValues.getLog();
            typedResponse.token = (byte[]) eventValues.getIndexedValues().get(0).getValue();
            typedResponse.timestamp = (BigInteger) eventValues.getNonIndexedValues().get(0).getValue();
            responses.add(typedResponse);
        }
        return responses;
    }

    public static VoteCastEventResponse getVoteCastEventFromLog(Log log) {
        Contract.EventValuesWithLog eventValues = staticExtractEventParametersWithLog(VOTECAST_EVENT, log);
        VoteCastEventResponse typedResponse = new VoteCastEventResponse();
        typedResponse.log = log;
        typedResponse.token = (byte[]) eventValues.getIndexedValues().get(0).getValue();
        typedResponse.timestamp = (BigInteger) eventValues.getNonIndexedValues().get(0).getValue();
        return typedResponse;
    }

    public Flowable<VoteCastEventResponse> voteCastEventFlowable(EthFilter filter) {
        return web3j.ethLogFlowable(filter).map(log -> getVoteCastEventFromLog(log));
    }

    public Flowable<VoteCastEventResponse> voteCastEventFlowable(DefaultBlockParameter startBlock, DefaultBlockParameter endBlock) {
        EthFilter filter = new EthFilter(startBlock, endBlock, getContractAddress());
        filter.addSingleTopic(EventEncoder.encode(VOTECAST_EVENT));
        return voteCastEventFlowable(filter);
    }

    public RemoteFunctionCall<TransactionReceipt> addCandidate(BigInteger _positionId, String _name) {
        final Function function = new Function(
                FUNC_ADDCANDIDATE, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.generated.Uint256(_positionId), 
                new org.web3j.abi.datatypes.Utf8String(_name)), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> addPosition(String _name) {
        final Function function = new Function(
                FUNC_ADDPOSITION, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.Utf8String(_name)), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<String> admin() {
        final Function function = new Function(FUNC_ADMIN, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Address>() {}));
        return executeRemoteCallSingleValueReturn(function, String.class);
    }

    public RemoteFunctionCall<BigInteger> candidateCount() {
        final Function function = new Function(FUNC_CANDIDATECOUNT, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function, BigInteger.class);
    }

    public RemoteFunctionCall<Tuple5<BigInteger, BigInteger, String, BigInteger, Boolean>> candidates(BigInteger param0) {
        final Function function = new Function(FUNC_CANDIDATES, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.generated.Uint256(param0)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}, new TypeReference<Uint256>() {}, new TypeReference<Utf8String>() {}, new TypeReference<Uint256>() {}, new TypeReference<Bool>() {}));
        return new RemoteFunctionCall<Tuple5<BigInteger, BigInteger, String, BigInteger, Boolean>>(function,
                new Callable<Tuple5<BigInteger, BigInteger, String, BigInteger, Boolean>>() {
                    @Override
                    public Tuple5<BigInteger, BigInteger, String, BigInteger, Boolean> call() throws Exception {
                        List<Type> results = executeCallMultipleValueReturn(function);
                        return new Tuple5<BigInteger, BigInteger, String, BigInteger, Boolean>(
                                (BigInteger) results.get(0).getValue(), 
                                (BigInteger) results.get(1).getValue(), 
                                (String) results.get(2).getValue(), 
                                (BigInteger) results.get(3).getValue(), 
                                (Boolean) results.get(4).getValue());
                    }
                });
    }

    public RemoteFunctionCall<TransactionReceipt> castVote(byte[] _token, List<BigInteger> _positionIds, List<BigInteger> _candidateIds) {
        final Function function = new Function(
                FUNC_CASTVOTE, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.generated.Bytes32(_token), 
                new org.web3j.abi.datatypes.DynamicArray<org.web3j.abi.datatypes.generated.Uint256>(
                        org.web3j.abi.datatypes.generated.Uint256.class,
                        org.web3j.abi.Utils.typeMap(_positionIds, org.web3j.abi.datatypes.generated.Uint256.class)), 
                new org.web3j.abi.datatypes.DynamicArray<org.web3j.abi.datatypes.generated.Uint256>(
                        org.web3j.abi.datatypes.generated.Uint256.class,
                        org.web3j.abi.Utils.typeMap(_candidateIds, org.web3j.abi.datatypes.generated.Uint256.class))), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<TransactionReceipt> closeElection() {
        final Function function = new Function(
                FUNC_CLOSEELECTION, 
                Arrays.<Type>asList(), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<Boolean> electionClosed() {
        final Function function = new Function(FUNC_ELECTIONCLOSED, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Bool>() {}));
        return executeRemoteCallSingleValueReturn(function, Boolean.class);
    }

    public RemoteFunctionCall<BigInteger> electionEnd() {
        final Function function = new Function(FUNC_ELECTIONEND, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function, BigInteger.class);
    }

    public RemoteFunctionCall<BigInteger> electionStart() {
        final Function function = new Function(FUNC_ELECTIONSTART, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function, BigInteger.class);
    }

    public RemoteFunctionCall<Tuple3<List<BigInteger>, List<String>, List<BigInteger>>> getResults(BigInteger _positionId) {
        final Function function = new Function(FUNC_GETRESULTS, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.generated.Uint256(_positionId)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<DynamicArray<Uint256>>() {}, new TypeReference<DynamicArray<Utf8String>>() {}, new TypeReference<DynamicArray<Uint256>>() {}));
        return new RemoteFunctionCall<Tuple3<List<BigInteger>, List<String>, List<BigInteger>>>(function,
                new Callable<Tuple3<List<BigInteger>, List<String>, List<BigInteger>>>() {
                    @Override
                    public Tuple3<List<BigInteger>, List<String>, List<BigInteger>> call() throws Exception {
                        List<Type> results = executeCallMultipleValueReturn(function);
                        return new Tuple3<List<BigInteger>, List<String>, List<BigInteger>>(
                                convertToNative((List<Uint256>) results.get(0).getValue()), 
                                convertToNative((List<Utf8String>) results.get(1).getValue()), 
                                convertToNative((List<Uint256>) results.get(2).getValue()));
                    }
                });
    }

    public RemoteFunctionCall<BigInteger> getTurnout() {
        final Function function = new Function(FUNC_GETTURNOUT, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function, BigInteger.class);
    }

    public RemoteFunctionCall<BigInteger> positionCount() {
        final Function function = new Function(FUNC_POSITIONCOUNT, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function, BigInteger.class);
    }

    public RemoteFunctionCall<Tuple3<BigInteger, String, Boolean>> positions(BigInteger param0) {
        final Function function = new Function(FUNC_POSITIONS, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.generated.Uint256(param0)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}, new TypeReference<Utf8String>() {}, new TypeReference<Bool>() {}));
        return new RemoteFunctionCall<Tuple3<BigInteger, String, Boolean>>(function,
                new Callable<Tuple3<BigInteger, String, Boolean>>() {
                    @Override
                    public Tuple3<BigInteger, String, Boolean> call() throws Exception {
                        List<Type> results = executeCallMultipleValueReturn(function);
                        return new Tuple3<BigInteger, String, Boolean>(
                                (BigInteger) results.get(0).getValue(), 
                                (String) results.get(1).getValue(), 
                                (Boolean) results.get(2).getValue());
                    }
                });
    }

    public RemoteFunctionCall<TransactionReceipt> setElectionTimes(BigInteger _start, BigInteger _end) {
        final Function function = new Function(
                FUNC_SETELECTIONTIMES, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.generated.Uint256(_start), 
                new org.web3j.abi.datatypes.generated.Uint256(_end)), 
                Collections.<TypeReference<?>>emptyList());
        return executeRemoteCallTransaction(function);
    }

    public RemoteFunctionCall<BigInteger> totalVotesCast() {
        final Function function = new Function(FUNC_TOTALVOTESCAST, 
                Arrays.<Type>asList(), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Uint256>() {}));
        return executeRemoteCallSingleValueReturn(function, BigInteger.class);
    }

    public RemoteFunctionCall<Boolean> usedTokens(byte[] param0) {
        final Function function = new Function(FUNC_USEDTOKENS, 
                Arrays.<Type>asList(new org.web3j.abi.datatypes.generated.Bytes32(param0)), 
                Arrays.<TypeReference<?>>asList(new TypeReference<Bool>() {}));
        return executeRemoteCallSingleValueReturn(function, Boolean.class);
    }

    @Deprecated
    public static VotingSystem load(String contractAddress, Web3j web3j, Credentials credentials, BigInteger gasPrice, BigInteger gasLimit) {
        return new VotingSystem(contractAddress, web3j, credentials, gasPrice, gasLimit);
    }

    @Deprecated
    public static VotingSystem load(String contractAddress, Web3j web3j, TransactionManager transactionManager, BigInteger gasPrice, BigInteger gasLimit) {
        return new VotingSystem(contractAddress, web3j, transactionManager, gasPrice, gasLimit);
    }

    public static VotingSystem load(String contractAddress, Web3j web3j, Credentials credentials, ContractGasProvider contractGasProvider) {
        return new VotingSystem(contractAddress, web3j, credentials, contractGasProvider);
    }

    public static VotingSystem load(String contractAddress, Web3j web3j, TransactionManager transactionManager, ContractGasProvider contractGasProvider) {
        return new VotingSystem(contractAddress, web3j, transactionManager, contractGasProvider);
    }

    public static RemoteCall<VotingSystem> deploy(Web3j web3j, Credentials credentials, ContractGasProvider contractGasProvider) {
        return deployRemoteCall(VotingSystem.class, web3j, credentials, contractGasProvider, BINARY, "");
    }

    public static RemoteCall<VotingSystem> deploy(Web3j web3j, TransactionManager transactionManager, ContractGasProvider contractGasProvider) {
        return deployRemoteCall(VotingSystem.class, web3j, transactionManager, contractGasProvider, BINARY, "");
    }

    @Deprecated
    public static RemoteCall<VotingSystem> deploy(Web3j web3j, Credentials credentials, BigInteger gasPrice, BigInteger gasLimit) {
        return deployRemoteCall(VotingSystem.class, web3j, credentials, gasPrice, gasLimit, BINARY, "");
    }

    @Deprecated
    public static RemoteCall<VotingSystem> deploy(Web3j web3j, TransactionManager transactionManager, BigInteger gasPrice, BigInteger gasLimit) {
        return deployRemoteCall(VotingSystem.class, web3j, transactionManager, gasPrice, gasLimit, BINARY, "");
    }

    public static class ElectionClosedEventResponse extends BaseEventResponse {
        public BigInteger timestamp;
    }

    public static class VoteCastEventResponse extends BaseEventResponse {
        public byte[] token;

        public BigInteger timestamp;
    }
}
