(function () {
    "use strict";

    var COLS = 20;
    var ROWS = 20;
    var CELL = 20;
    var W = COLS * CELL;
    var H = ROWS * CELL;

    var canvas = document.getElementById("board");
    var ctx = canvas.getContext("2d");
    var scoreEl = document.getElementById("score");
    var primary = document.getElementById("primary");
    var overlay = document.getElementById("overlay");
    var overlayTitle = document.getElementById("overlay-title");
    var overlayText = document.getElementById("overlay-text");
    var overlayAction = document.getElementById("overlay-action");

    var snake = [];
    var dir = { x: 1, y: 0 };
    var queue = [];
    var food = null;
    var score = 0;
    var tickMs = 150;
    var timer = null;
    var running = false;
    var over = false;
    var won = false;
    var swipe = null;

    canvas.width = W * 2;
    canvas.height = H * 2;
    ctx.setTransform(2, 0, 0, 2, 0, 0);

    function occupied(x, y) {
        for (var i = 0; i < snake.length; i++) {
            if (snake[i].x === x && snake[i].y === y) return true;
        }
        return false;
    }

    function placeFood() {
        var open = [];
        var y;
        var x;
        for (y = 0; y < ROWS; y++) {
            for (x = 0; x < COLS; x++) {
                if (!occupied(x, y)) open.push({ x: x, y: y });
            }
        }
        if (!open.length) {
            food = null;
            return false;
        }
        food = open[Math.floor(Math.random() * open.length)];
        return true;
    }

    function roundRect(x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function drawEyes(head) {
        var cx = head.x * CELL + CELL / 2;
        var cy = head.y * CELL + CELL / 2;
        var ox = dir.x * 3;
        var oy = dir.y * 3;
        var px = -dir.y * 3.2;
        var py = dir.x * 3.2;
        ctx.fillStyle = "#fffaf5";
        ctx.beginPath();
        ctx.arc(cx + ox + px, cy + oy + py, 2, 0, Math.PI * 2);
        ctx.arc(cx + ox - px, cy + oy - py, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    function draw() {
        var i;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "#f4eadf";
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = "rgba(196, 75, 43, 0.10)";
        ctx.lineWidth = 1;
        for (i = 1; i < COLS; i++) {
            ctx.beginPath();
            ctx.moveTo(i * CELL + 0.5, 0);
            ctx.lineTo(i * CELL + 0.5, H);
            ctx.stroke();
        }
        for (i = 1; i < ROWS; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * CELL + 0.5);
            ctx.lineTo(W, i * CELL + 0.5);
            ctx.stroke();
        }
        if (food) {
            var cx = food.x * CELL + CELL / 2;
            var cy = food.y * CELL + CELL / 2;
            ctx.fillStyle = "#2f7d4a";
            ctx.beginPath();
            ctx.arc(cx, cy, CELL * 0.30, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#e7f6ec";
            ctx.beginPath();
            ctx.arc(cx - 2, cy - 2, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        for (i = 0; i < snake.length; i++) {
            var seg = snake[i];
            var pad = i === 0 ? 1.5 : 2.5;
            ctx.fillStyle = i === 0 ? "#9a341f" : "#c44b2b";
            roundRect(seg.x * CELL + pad, seg.y * CELL + pad, CELL - pad * 2, CELL - pad * 2, 5);
            ctx.fill();
        }
        if (snake.length) drawEyes(snake[0]);
    }

    function showOverlay(title, text, label) {
        overlayTitle.textContent = title;
        overlayText.textContent = text;
        overlayAction.textContent = label;
        overlay.hidden = false;
    }

    function refreshButton() {
        var label = "开始";
        if (running) label = "重新开始";
        else if (over || won) label = "再来一局";
        primary.textContent = label;
        if (overlay.hidden) overlayAction.textContent = label;
    }

    function schedule() {
        clearInterval(timer);
        timer = setInterval(step, tickMs);
    }

    function start() {
        if (running || over || won) return;
        running = true;
        overlay.hidden = true;
        refreshButton();
        schedule();
    }

    function finish(didWin) {
        running = false;
        over = !didWin;
        won = !!didWin;
        clearInterval(timer);
        timer = null;
        draw();
        showOverlay(didWin ? "棋盘填满了" : "游戏结束", "得分 " + score, "再来一局");
        refreshButton();
    }

    function newGame(autoStart) {
        clearInterval(timer);
        timer = null;
        snake = [{ x: 6, y: 10 }, { x: 5, y: 10 }, { x: 4, y: 10 }];
        dir = { x: 1, y: 0 };
        queue = [];
        score = 0;
        tickMs = 150;
        running = false;
        over = false;
        won = false;
        scoreEl.textContent = "0";
        placeFood();
        draw();
        if (autoStart) {
            overlay.hidden = true;
            start();
        } else {
            showOverlay("贪吃蛇", "按「开始」，或直接按方向键。", "开始");
            refreshButton();
        }
    }

    function setDir(x, y) {
        if (over || won) return;
        var last = queue.length ? queue[queue.length - 1] : dir;
        if (last.x === x && last.y === y) return;
        if (last.x === -x && last.y === -y) return;
        if (queue.length >= 2) return;
        queue.push({ x: x, y: y });
        if (!running) start();
    }

    function step() {
        var head;
        var willEat;
        var limit;
        var i;
        if (!running) return;
        if (queue.length) dir = queue.shift();
        head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS) {
            finish(false);
            return;
        }
        willEat = food && food.x === head.x && food.y === head.y;
        limit = willEat ? snake.length : snake.length - 1;
        for (i = 0; i < limit; i++) {
            if (snake[i].x === head.x && snake[i].y === head.y) {
                finish(false);
                return;
            }
        }
        snake.unshift(head);
        if (willEat) {
            score += 10;
            scoreEl.textContent = String(score);
            if (!placeFood()) {
                finish(true);
                return;
            }
            if (tickMs > 72) {
                tickMs -= 6;
                schedule();
            }
        } else {
            snake.pop();
        }
        draw();
    }

    function primaryAction() {
        if (running || over || won) newGame(true);
        else start();
    }

    function onKey(e) {
        var map = {
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            w: [0, -1],
            a: [-1, 0],
            s: [0, 1],
            d: [1, 0],
            W: [0, -1],
            A: [-1, 0],
            S: [0, 1],
            D: [1, 0]
        };
        var next = map[e.key];
        if (!next) return;
        e.preventDefault();
        setDir(next[0], next[1]);
    }

    primary.addEventListener("click", primaryAction);
    overlayAction.addEventListener("click", primaryAction);
    document.getElementById("pad").addEventListener("click", function (e) {
        var target = e.target.nodeType === 1 ? e.target : e.target.parentElement;
        var button = target && target.closest("button");
        if (!button) return;
        setDir(Number(button.getAttribute("data-x")), Number(button.getAttribute("data-y")));
    });
    window.addEventListener("keydown", onKey);

    canvas.addEventListener("pointerdown", function (e) {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        swipe = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener("pointerup", function (e) {
        var dx;
        var dy;
        if (!swipe) return;
        dx = e.clientX - swipe.x;
        dy = e.clientY - swipe.y;
        swipe = null;
        if (Math.abs(dx) < 18 && Math.abs(dy) < 18) {
            if (!running && !over && !won) start();
            return;
        }
        if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0);
        else setDir(0, dy > 0 ? 1 : -1);
    });
    canvas.addEventListener("pointercancel", function () { swipe = null; });

    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            clearInterval(timer);
            timer = null;
        } else if (running) {
            schedule();
        }
    });

    newGame(false);
})();
