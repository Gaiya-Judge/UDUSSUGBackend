package com.udusug.voting.blockchain;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.http.HttpService;

@Slf4j
@Configuration
public class Web3jConfig {

    @Value("${blockchain.rpc.url}")
    private String rpcUrl;

    @Value("${blockchain.private.key}")
    private String privateKey;

    @Bean
    public Web3j web3j() {
        log.info("Initializing Web3j HTTP service connecting to RPC endpoint: {}", rpcUrl);
        return Web3j.build(new HttpService(rpcUrl));
    }

    @Bean
    public Credentials credentials() {
        log.info("Loading Ethereum deployment wallet credentials into Spring context");
        return Credentials.create(privateKey);
    }
}
