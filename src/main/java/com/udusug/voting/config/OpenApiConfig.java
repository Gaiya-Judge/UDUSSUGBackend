package com.udusug.voting.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI votingSystemOpenAPI() {
        return new OpenAPI().info(new Info()
                .title("UDUS SUG Blockchain Voting System API")
                .description("API for voter authentication, election administration, voting, results, and blockchain checks.")
                .version("1.0.0"));
    }
}
