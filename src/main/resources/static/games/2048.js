(function () {
    "use strict";

    var BEST_KEY = "gkproject-2048-best";
    var grid = document.getElementById("grid");
    var boardEl = document.getElementById("board");
    var scoreEl = document.getElementById("score");
    var bestEl = document.getElementById("best");
    var overlay = document.getElementById("overlay");
    var overlayTitle = document.getElementById("overlay-title");
    var overlayText = document.getElementById("overlay-text");
    var overlayPrimary = document.getElementById("overlay-primary");
    var overlaySecondary = document.getElementById("overlay-secondary");

    var board = [];
    var score = 0;
    var best = loadBest();
    var accept = false;
    var milestone = 2048;
    var primaryMode = "begin";
    var swipe = null;

    bestEl.textContent = String(best);

    function loadBest() {
        try {
            var n = Number(localStorage.getItem(BEST_KEY));
            return n > 0 ? n : 0;
        } catch (e) {
            return 0;
        }
    }

    function saveBest(n) {
        try {
            localStorage.setItem(BEST_KEY, String(n));
        } catch (e) {
            /* private mode */
        }
    }

    function slideLine(line, towardEnd) {
        var src = towardEnd ? line.slice().reverse() : line.slice();
        var compact = [];
        var out = [];
        var mergedAt = [];
        var gained = 0;
        var i;
        var v;
        var finalLine;
        var mergedIndexes;
        for (i = 0; i < src.length; i++) {
            if (src[i] !== 0) compact.push(src[i]);
        }
        for (i = 0; i < compact.length; i++) {
            if (i + 1 < compact.length && compact[i] === compact[i + 1]) {
                v = compact[i] * 2;
                out.push(v);
                mergedAt.push(out.length - 1);
                gained += v;
                i++;
            } else {
                out.push(compact[i]);
            }
        }
        while (out.length < 4) out.push(0);
        if (towardEnd) {
            finalLine = out.slice().reverse();
            mergedIndexes = mergedAt.map(function (index) { return 3 - index; });
        } else {
            finalLine = out;
            mergedIndexes = mergedAt;
        }
        return {
            line: finalLine,
            gained: gained,
            mergedIndexes: mergedIndexes,
            changed: finalLine.some(function (value, index) { return value !== line[index]; })
        };
    }

    function spawn(marks) {
        var empty = [];
        var r;
        var c;
        var spot;
        var value;
        for (r = 0; r < 4; r++) {
            for (c = 0; c < 4; c++) {
                if (board[r][c] === 0) empty.push([r, c]);
            }
        }
        if (!empty.length) return;
        spot = empty[Math.floor(Math.random() * empty.length)];
        value = Math.random() < 0.9 ? 2 : 4;
        board[spot[0]][spot[1]] = value;
        if (marks) marks[spot[0] + "," + spot[1]] = "pop";
    }

    function maxValue() {
        var max = 0;
        var r;
        var c;
        for (r = 0; r < 4; r++) {
            for (c = 0; c < 4; c++) {
                if (board[r][c] > max) max = board[r][c];
            }
        }
        return max;
    }

    function canMove() {
        var r;
        var c;
        var v;
        for (r = 0; r < 4; r++) {
            for (c = 0; c < 4; c++) {
                v = board[r][c];
                if (v === 0) return true;
                if (c + 1 < 4 && board[r][c + 1] === v) return true;
                if (r + 1 < 4 && board[r + 1][c] === v) return true;
            }
        }
        return false;
    }

    function updateScore() {
        scoreEl.textContent = String(score);
        bestEl.textContent = String(best);
    }

    function render(marks) {
        var r;
        var c;
        var value;
        var cell;
        grid.innerHTML = "";
        for (r = 0; r < 4; r++) {
            for (c = 0; c < 4; c++) {
                value = board[r][c];
                cell = document.createElement("div");
                cell.className = "cell";
                if (value) {
                    cell.classList.add(value > 2048 ? "vsuper" : "v" + value);
                    if (String(value).length >= 4) cell.classList.add("digits");
                    cell.textContent = String(value);
                    if (marks && marks[r + "," + c]) cell.classList.add("pop");
                }
                grid.appendChild(cell);
            }
        }
    }

    function showMask(title, text, primaryLabel, secondaryLabel, mode) {
        overlayTitle.textContent = title;
        overlayText.textContent = text;
        overlayPrimary.textContent = primaryLabel;
        primaryMode = mode;
        if (secondaryLabel) {
            overlaySecondary.hidden = false;
            overlaySecondary.textContent = secondaryLabel;
        } else {
            overlaySecondary.hidden = true;
        }
        overlay.hidden = false;
    }

    function deal(showStart) {
        var r;
        board = [];
        for (r = 0; r < 4; r++) board.push([0, 0, 0, 0]);
        score = 0;
        milestone = 2048;
        spawn(null);
        spawn(null);
        updateScore();
        render(null);
        if (showStart) {
            accept = false;
            showMask("2048", "按「开始」，或直接按方向键。", "开始", null, "begin");
        } else {
            accept = true;
            overlay.hidden = true;
        }
    }

    function move(dx, dy) {
        var horizontal = dx !== 0;
        var gained = 0;
        var changed = false;
        var marks = {};
        var i;
        var line;
        var towardEnd;
        var result;
        var maxTile;
        if (!dx && !dy) return;
        if (!accept) {
            if (score === 0 && primaryMode === "begin") {
                accept = true;
                overlay.hidden = true;
            } else {
                return;
            }
        }

        for (i = 0; i < 4; i++) {
            line = horizontal
                ? board[i].slice()
                : [board[0][i], board[1][i], board[2][i], board[3][i]];
            towardEnd = horizontal ? dx > 0 : dy > 0;
            result = slideLine(line, towardEnd);
            if (result.changed) changed = true;
            gained += result.gained;
            if (horizontal) {
                board[i] = result.line;
                result.mergedIndexes.forEach(function (c) { marks[i + "," + c] = "pop"; });
            } else {
                for (var r = 0; r < 4; r++) board[r][i] = result.line[r];
                result.mergedIndexes.forEach(function (r) { marks[r + "," + i] = "pop"; });
            }
        }
        if (!changed) return;

        score += gained;
        if (score > best) {
            best = score;
            saveBest(best);
        }
        spawn(marks);
        updateScore();
        render(marks);

        maxTile = maxValue();
        if (!canMove()) {
            accept = false;
            showMask(
                "无法再移动",
                "得分 " + score + "。" + (maxTile >= 2048 ? "已经达到 " + maxTile + "。" : "没有可合并的数字了。"),
                "再来一局",
                null,
                "restart"
            );
            return;
        }
        if (maxTile >= milestone) {
            milestone = maxTile * 2;
            accept = false;
            showMask("达成 " + maxTile, "得分 " + score + "。还可以继续。", "继续", "再来一局", "begin");
        }
    }

    document.getElementById("restart").addEventListener("click", function () {
        deal(false);
    });
    overlayPrimary.addEventListener("click", function () {
        if (primaryMode === "begin") {
            accept = true;
            overlay.hidden = true;
        } else {
            deal(false);
        }
    });
    overlaySecondary.addEventListener("click", function () {
        deal(false);
    });
    document.getElementById("pad").addEventListener("click", function (e) {
        var target = e.target.nodeType === 1 ? e.target : e.target.parentElement;
        var button = target && target.closest("button");
        if (!button) return;
        move(Number(button.getAttribute("data-x")), Number(button.getAttribute("data-y")));
    });

    window.addEventListener("keydown", function (e) {
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
        move(next[0], next[1]);
    });

    boardEl.addEventListener("pointerdown", function (e) {
        if (e.target.closest("button")) return;
        if (e.pointerType === "mouse" && e.button !== 0) return;
        swipe = { x: e.clientX, y: e.clientY };
    });
    boardEl.addEventListener("pointerup", function (e) {
        var dx;
        var dy;
        if (!swipe) return;
        dx = e.clientX - swipe.x;
        dy = e.clientY - swipe.y;
        swipe = null;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
        if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1, 0);
        else move(0, dy > 0 ? 1 : -1);
    });
    boardEl.addEventListener("pointercancel", function () { swipe = null; });

    deal(true);
})();
