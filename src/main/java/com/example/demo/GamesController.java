package com.example.demo;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class GamesController {

    @GetMapping({"/games", "/games/"})
    public String hall() {
        return "games/index";
    }

    @GetMapping({"/games/snake", "/games/snake/"})
    public String snake() {
        return "games/snake";
    }

    @GetMapping({"/games/2048", "/games/2048/"})
    public String twenty48() {
        return "games/2048";
    }

    @GetMapping({"/games/breakout", "/games/breakout/"})
    public String breakout() {
        return "games/breakout";
    }
}
