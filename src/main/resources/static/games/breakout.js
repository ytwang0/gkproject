(function () {
    "use strict";

    var W = 480;
    var H = 360;
    var COLS = 8;
    var ROWS = 5;
    var BRICK_W = 50;
    var BRICK_H = 16;
    var GAP = 6;
    var TOP = 46;
    var COLORS = ["#8a3120", "#c44b2b", "#e07a45", "#e2a23a", "#d9896a"];

    var canvas = document.getElementById("board");
    var ctx = canvas.getContext("2d");
    var scoreEl = document.getElementById("score");
    var livesEl = document.getElementById("lives");
    var messageEl = document.getElementById("message");
    var overlay = document.getElementById("overlay");
    var overlayTitle = document.getElementById("overlay-title");
    var overlayText = document.getElementById("overlay-text");
    var overlayAction = document.getElementById("overlay-action");

    var paddle = { w: 88, h: 12, x: 0, y: H - 30 };
    var ball = { x: 0, y: 0, r: 6, vx: 0, vy: 0, launched: false };
    var bricks = [];
    var score = 0;
    var lives = 3;
    var state = "intro";
    var held = { left: false, right: false };
    var pointer = null;
    var raf = 0;
    var last = 0;
    var pending = 0;

    canvas.width = W * 2;
    canvas.height = H * 2;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    canvas.style.aspectRatio = W + " / " + H;

    function clamp(n, min, max) {
        return Math.max(min, Math.min(max, n));
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

    function buildBricks() {
        var side = (W - (BRICK_W * COLS + GAP * (COLS - 1))) / 2;
        var r;
        var c;
        bricks = [];
        for (r = 0; r < ROWS; r++) {
            for (c = 0; c < COLS; c++) {
                bricks.push({
                    x: side + c * (BRICK_W + GAP),
                    y: TOP + r * (BRICK_H + GAP),
                    w: BRICK_W,
                    h: BRICK_H,
                    color: COLORS[r],
                    points: (ROWS - r) * 10,
                    alive: true
                });
            }
        }
    }

    function currentSpeed() {
        var cleared = 0;
        var i;
        for (i = 0; i < bricks.length; i++) {
            if (!bricks[i].alive) cleared++;
        }
        return Math.min(6.6, 4.15 + cleared * 0.04);
    }

    function stickBall() {
        ball.x = paddle.x + paddle.w / 2;
        ball.y = paddle.y - ball.r - 1;
        ball.vx = 0;
        ball.vy = 0;
    }

    function updateHud() {
        scoreEl.textContent = String(score);
        livesEl.textContent = String(lives);
    }

    function setMessage(text) {
        messageEl.textContent = text;
    }

    function showOverlay(title, text, label) {
        overlayTitle.textContent = title;
        overlayText.textContent = text;
        overlayAction.textContent = label;
        overlay.hidden = false;
    }

    function reset(toIntro) {
        score = 0;
        lives = 3;
        ball.launched = false;
        paddle.x = (W - paddle.w) / 2;
        buildBricks();
        stickBall();
        updateHud();
        if (toIntro) {
            state = "intro";
            document.getElementById("restart").textContent = "开始游戏";
            setMessage("点击「开始游戏」");
            showOverlay("打砖块", "移动挡板，把球弹回去打掉所有砖块。有三条命。", "开始游戏");
        } else {
            state = "ready";
            document.getElementById("restart").textContent = "重新开始";
            overlay.hidden = true;
            setMessage("空格、轻点棋盘，或按「发球」");
        }
        draw();
    }

    function launch() {
        var spread;
        var speed;
        if (state === "intro") reset(false);
        if (state !== "ready" || ball.launched) return;
        spread = Math.random() * 0.7 - 0.35;
        speed = currentSpeed();
        ball.vx = Math.sin(spread) * speed;
        ball.vy = -Math.cos(spread) * speed;
        ball.launched = true;
        state = "play";
        setMessage("接住小球");
    }

    function loseLife() {
        lives -= 1;
        ball.launched = false;
        updateHud();
        if (lives <= 0) {
            state = "over";
            setMessage("球掉下去了");
            showOverlay("游戏结束", "得分 " + score, "再来一局");
            return;
        }
        state = "ready";
        stickBall();
        setMessage("还剩 " + lives + " 条命，再次发球");
    }

    function win() {
        state = "win";
        ball.launched = false;
        setMessage("砖块已经清空");
        showOverlay("全部打完", "得分 " + score, "再来一局");
    }

    function bounceWalls() {
        if (ball.x - ball.r <= 0) {
            ball.x = ball.r;
            ball.vx = Math.abs(ball.vx);
        } else if (ball.x + ball.r >= W) {
            ball.x = W - ball.r;
            ball.vx = -Math.abs(ball.vx);
        }
        if (ball.y - ball.r <= 0) {
            ball.y = ball.r;
            ball.vy = Math.abs(ball.vy);
        }
    }

    function bouncePaddle() {
        var left = paddle.x;
        var right = paddle.x + paddle.w;
        var top = paddle.y;
        var hit;
        var angle;
        var speed;
        if (ball.y + ball.r < top || ball.y - ball.r > top + paddle.h) return;
        if (ball.x + ball.r < left || ball.x - ball.r > right) return;
        if (ball.vy < 0 && ball.y < top) return;
        hit = (ball.x - (left + paddle.w / 2)) / (paddle.w / 2);
        hit = clamp(hit, -1, 1);
        angle = hit * (Math.PI * 0.42);
        speed = currentSpeed();
        ball.vx = Math.sin(angle) * speed;
        ball.vy = -Math.abs(Math.cos(angle) * speed);
        ball.y = top - ball.r - 0.8;
    }

    function hitBricks() {
        var best = null;
        var bestDist = Infinity;
        var i;
        var brick;
        var closestX;
        var closestY;
        var dx;
        var dy;
        var dist;
        var fromLeft;
        var fromRight;
        var fromTop;
        var fromBottom;
        var penX;
        var penY;
        var flipX = false;
        for (i = 0; i < bricks.length; i++) {
            brick = bricks[i];
            if (!brick.alive) continue;
            closestX = clamp(ball.x, brick.x, brick.x + brick.w);
            closestY = clamp(ball.y, brick.y, brick.y + brick.h);
            dx = ball.x - closestX;
            dy = ball.y - closestY;
            dist = dx * dx + dy * dy;
            if (dist <= ball.r * ball.r && dist < bestDist) {
                best = brick;
                bestDist = dist;
            }
        }
        if (!best) return false;
        best.alive = false;
        score += best.points;
        updateHud();
        fromLeft = ball.x < best.x;
        fromRight = ball.x > best.x + best.w;
        fromTop = ball.y < best.y;
        fromBottom = ball.y > best.y + best.h;
        if ((fromLeft || fromRight) && (fromTop || fromBottom)) {
            penX = fromLeft ? ball.x + ball.r - best.x : best.x + best.w - (ball.x - ball.r);
            penY = fromTop ? ball.y + ball.r - best.y : best.y + best.h - (ball.y - ball.r);
            flipX = penX < penY;
        } else if (fromLeft || fromRight) {
            flipX = true;
        }
        if (flipX) {
            ball.vx *= -1;
            ball.x = ball.x < best.x + best.w / 2 ? best.x - ball.r - 0.3 : best.x + best.w + ball.r + 0.3;
        } else {
            ball.vy *= -1;
            ball.y = ball.y < best.y + best.h / 2 ? best.y - ball.r - 0.3 : best.y + best.h + ball.r + 0.3;
        }
        return bricks.every(function (item) { return !item.alive; });
    }

    function keepAngle() {
        var speed = currentSpeed();
        var vx = ball.vx;
        var vy = ball.vy;
        var mag;
        if (Math.abs(vy) < speed * 0.28) vy = (vy < 0 ? -1 : 1) * speed * 0.28;
        if (Math.abs(vx) < speed * 0.12) vx = (vx < 0 ? -1 : 1) * speed * 0.12;
        mag = Math.hypot(vx, vy) || 1;
        ball.vx = vx / mag * speed;
        ball.vy = vy / mag * speed;
    }

    function step() {
        var cleared;
        if (state === "over" || state === "win") return;
        if (held.left) paddle.x -= 8;
        if (held.right) paddle.x += 8;
        paddle.x = clamp(paddle.x, 0, W - paddle.w);
        if (!ball.launched) {
            stickBall();
            return;
        }
        ball.x += ball.vx;
        ball.y += ball.vy;
        bounceWalls();
        bouncePaddle();
        cleared = hitBricks();
        if (cleared) {
            win();
            return;
        }
        if (ball.y - ball.r > H) {
            loseLife();
            return;
        }
        keepAngle();
    }

    function draw() {
        var i;
        var brick;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "#f4eadf";
        ctx.fillRect(0, 0, W, H);
        for (i = 0; i < bricks.length; i++) {
            brick = bricks[i];
            if (!brick.alive) continue;
            ctx.fillStyle = brick.color;
            roundRect(brick.x, brick.y, brick.w, brick.h, 4);
            ctx.fill();
        }
        ctx.fillStyle = "#c44b2b";
        roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 6);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = "#1f1a16";
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = "rgba(255, 250, 245, 0.75)";
        ctx.arc(ball.x - 2, ball.y - 2, 1.8, 0, Math.PI * 2);
        ctx.fill();
    }

    function frame(ts) {
        raf = requestAnimationFrame(frame);
        if (!last) {
            last = ts;
            draw();
            return;
        }
        pending += Math.min(100, ts - last);
        last = ts;
        while (pending >= 16.6667) {
            step();
            pending -= 16.6667;
        }
        draw();
    }

    function pointX(e) {
        var rect = canvas.getBoundingClientRect();
        return (e.clientX - rect.left) * (W / rect.width);
    }

    function bindHold(button, flag) {
        button.addEventListener("pointerdown", function (e) {
            e.preventDefault();
            button.setPointerCapture(e.pointerId);
            held[flag] = true;
        });
        function release() { held[flag] = false; }
        button.addEventListener("pointerup", release);
        button.addEventListener("pointercancel", release);
    }

    document.getElementById("restart").addEventListener("click", function () { reset(false); });
    overlayAction.addEventListener("click", function () {
        reset(false);
    });
    document.getElementById("serve").addEventListener("click", launch);
    bindHold(document.getElementById("hold-left"), "left");
    bindHold(document.getElementById("hold-right"), "right");

    window.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
            held.left = true;
            e.preventDefault();
        } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
            held.right = true;
            e.preventDefault();
        } else if (e.key === " " || e.key === "Spacebar" || e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
            e.preventDefault();
            if (e.target && e.target.tagName === "BUTTON") return;
            launch();
        }
    });
    window.addEventListener("keyup", function (e) {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") held.left = false;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") held.right = false;
    });
    window.addEventListener("blur", function () {
        held.left = false;
        held.right = false;
    });

    canvas.addEventListener("pointermove", function (e) {
        if (e.pointerType === "mouse" || pointer) {
            paddle.x = clamp(pointX(e) - paddle.w / 2, 0, W - paddle.w);
        }
        if (pointer) {
            var dx = e.clientX - pointer.x;
            var dy = e.clientY - pointer.y;
            if (dx * dx + dy * dy > 36) pointer.moved = true;
        }
    });
    canvas.addEventListener("pointerdown", function (e) {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        canvas.setPointerCapture(e.pointerId);
        pointer = { x: e.clientX, y: e.clientY, moved: false };
        paddle.x = clamp(pointX(e) - paddle.w / 2, 0, W - paddle.w);
    });
    canvas.addEventListener("pointerup", function () {
        if (pointer && !pointer.moved) launch();
        pointer = null;
    });
    canvas.addEventListener("pointercancel", function () { pointer = null; });

    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            cancelAnimationFrame(raf);
            raf = 0;
            held.left = false;
            held.right = false;
        } else if (!raf) {
            last = 0;
            pending = 0;
            raf = requestAnimationFrame(frame);
        }
    });

    reset(true);
    raf = requestAnimationFrame(frame);
})();
