package com.example.demo;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
public class ApiController {

    @GetMapping("/api/health")
    public Map<String, String> health() {
        Map<String, String> body = new LinkedHashMap<>();
        body.put("status", "ok");
        body.put("app", "web-prototype");
        return body;
    }

    @GetMapping("/api/info")
    public Map<String, String> info() {
        Map<String, String> body = new LinkedHashMap<>();
        body.put("app", "web-prototype");
        body.put("framework", "Spring Boot 3.3.5");
        body.put("time", ZonedDateTime.now(ZoneId.of("Asia/Shanghai"))
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        body.put("zone", "Asia/Shanghai");
        String host = System.getenv().getOrDefault("HOST_NAME", System.getenv().getOrDefault("HOSTNAME", "unknown"));
        body.put("host", host);
        return body;
    }
}
