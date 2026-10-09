package com.hal.amms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@SpringBootApplication
@EnableTransactionManagement
public class AmmsServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(AmmsServerApplication.class, args);
    }
}
