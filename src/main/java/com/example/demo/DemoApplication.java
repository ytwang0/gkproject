package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DemoApplication {
    public static void main(String[] args) {
        // An unset DB_PASSWORD is left as the literal "${DB_PASSWORD}" and would
        // be sent to MySQL. Reject it before the pool starts.
        String password = System.getenv("DB_PASSWORD");
        if (password == null || password.isBlank()) {
            throw new IllegalStateException(
                    "DB_PASSWORD is required. Supply it as an environment variable and do not commit it.");
        }
        SpringApplication.run(DemoApplication.class, args);
    }
}
