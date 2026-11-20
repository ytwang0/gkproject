package com.example.demo;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class DatabaseController {

    private static final Logger log = LoggerFactory.getLogger(DatabaseController.class);

    private final JdbcTemplate jdbcTemplate;

    public DatabaseController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    private void verifyOnStartup() {
        Map<String, String> status = query();
        log.info("Database connectivity check ok, database={}", status.get("database"));
    }

    @GetMapping("/api/db")
    public ResponseEntity<Map<String, String>> database() {
        try {
            return ResponseEntity.ok(query());
        } catch (DataAccessException | IllegalStateException ex) {
            log.warn("Database connectivity check failed: {}", ex.getMessage());
            Map<String, String> body = new LinkedHashMap<>();
            body.put("status", "error");
            body.put("database", "");
            body.put("select1", "");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(body);
        }
    }

    private Map<String, String> query() {
        return jdbcTemplate.queryForObject("SELECT 1, DATABASE()", (rs, rowNum) -> {
            int one = rs.getInt(1);
            String database = rs.getString(2);
            if (one != 1 || database == null || database.isBlank()) {
                throw new IllegalStateException("Database connectivity check failed");
            }
            Map<String, String> body = new LinkedHashMap<>();
            body.put("status", "ok");
            body.put("database", database);
            body.put("select1", Integer.toString(one));
            return body;
        });
    }
}
