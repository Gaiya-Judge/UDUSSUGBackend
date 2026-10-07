package com.udusug.voting.blockchain.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import com.udusug.voting.blockchain.service.VotingContractService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RequestMapping;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;

@Slf4j
@RestController
@Tag(name = "Blockchain Test")
@RequestMapping("/api/test")
@RequiredArgsConstructor
public class TestController {

    private final VotingContractService votingContractService;

    @GetMapping("/turnout")
    public ResponseEntity<Map<String, Object>> testTurnout() {
        log.info("Received GET /api/test/turnout request - triggering Web3j getTurnout() verification");

        long turnout = votingContractService.getTurnout();

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Successfully queried deployed VotingSystem contract on Sepolia",
                "contractAddress", "0x893Aa406EBF5c71Bf1eF62c7cA0A2Fb85E98Ba44",
                "totalVotesCast", turnout
        ));
    }
}
