document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('calendar-grid');
    const modal = document.getElementById('snoopy-modal');
    const modalText = document.getElementById('modal-text');
    const modalBtn = document.getElementById('modal-action-btn');
    const closeBtn = document.querySelector('.close-btn');
    const gameOverlay = document.getElementById('game-overlay');
    const closeGameBtn = document.getElementById('close-game');
    const gameTitle = document.getElementById('game-title');
    const gameIconEl = document.getElementById('game-icon');
    // Icons: list files under images/ folder (customize names to your assets)
    const GAME_ICONS = [
        'images/icon-snowflake.png',
        'images/icon-tree.png',
        'images/icon-gift.png',
        'images/icon-bell.png',
        'images/icon-santa.png',
        'images/icon-star.png'
    ];
    function setRandomIcon() {
        if (!gameIconEl) return;
        const src = GAME_ICONS[Math.floor(Math.random() * GAME_ICONS.length)] || '';
        if (!src) { gameIconEl.style.display = 'none'; return; }
        gameIconEl.src = src;
        gameIconEl.style.display = 'inline-block';
        // Fallback hide on error if file missing
        gameIconEl.onerror = () => { gameIconEl.style.display = 'none'; };
    }
    const gameContent = document.getElementById('game-content');

    // Configuration
    const TOTAL_DAYS = 24; // regular days; we will add a stealth Day 25 gift tile separately
    // URL param overrides: ?debug=1&date=2025-12-05
    const params = new URLSearchParams(location.search);
    const DEBUG_MODE = params.get('debug') === '1' || params.get('debug') === 'true';
    const FAKE_TODAY = params.get('date') || null;
    // Gift testing URL param: ?gift=1 unlocks gift tile; ?gift=open also opens it
    const GIFT_PARAM = params.get('gift');

    // Christmas Quotes / Jokes
    const lockedQuotes = [
        "Ho ho hold on… it’s not time yet!",
        "Advent rules: one day at a time.",
        "No peeking! Santa’s checking the list.",
        "This door opens on the right December day.",
        "Back to the cocoa for now.",
        "Patience—like a present under the tree.",
        "Nice try, elf-in-training.",
        "The sleigh isn’t ready yet."
    ];

    // Initialize Snow
    createSnow();

    // Initialize Grid
    initGrid();

    // Games registry
    const games = {
        1: simonGame,
        2: hangmanGame,
        3: tictactoeGame,
        4: minesweeperGame,
        5: g2048Game,
        6: tangoGame,
        7: lightsOutGame,
        8: nonogramGame,
        9: memoryMatchGame,
        10: floodFillGame,
        11: flappyBirdGame,
        12: snowQueensGame,
        13: futoshikiGame,
        // more days can be added here
    };

    function initGrid() {
        grid.innerHTML = '';
        const today = getToday();
        const currentMonth = today.getMonth(); // 0-11 (11 is Dec)
        const currentDay = today.getDate();

        // Load progress
        const progress = JSON.parse(localStorage.getItem('snoopy_xmas_progress')) || {};

        for (let i = 1; i <= TOTAL_DAYS; i++) {
            const dayCard = document.createElement('div');
            dayCard.classList.add('day-card');

            const dayNum = document.createElement('span');
            dayNum.classList.add('day-number');
            dayNum.innerText = i;
            dayCard.appendChild(dayNum);

            // Determine State
            let isLocked = true;

            if (DEBUG_MODE) {
                isLocked = false;
            } else {
                // Logic: Unlock if it's December AND date >= i
                // Also handle if year is past 2025, or if month is > Dec (Jan 2026)
                if (today.getFullYear() > 2025) {
                    isLocked = false;
                } else if (today.getFullYear() === 2025) {
                    if (currentMonth === 11) { // December
                        if (currentDay >= i) {
                            isLocked = false;
                        }
                    } else if (currentMonth < 11) {
                        // Before December
                        isLocked = true;
                    }
                }
            }

            if (isLocked) {
                dayCard.classList.add('locked');
                dayCard.addEventListener('click', () => showLockedMessage());
            } else {
                // Check if completed
                if (progress[i]) {
                    dayCard.classList.add('completed');
                }

                dayCard.addEventListener('click', () => openGame(i));
            }

            grid.appendChild(dayCard);
        }

        // Add stealth Day 25 gift tile at the end
        const completedCount = Object.keys(progress).filter(k => progress[k]).length;
        const giftCard = document.createElement('div');
        giftCard.classList.add('day-card');
        giftCard.style.position = 'relative';
        const giftNum = document.createElement('span');
        giftNum.classList.add('day-number');
        giftNum.innerText = '🎁';
        giftCard.appendChild(giftNum);
        // Progress label
        const prog = document.createElement('div');
        prog.style.position = 'absolute';
        prog.style.bottom = '8px';
        prog.style.left = '8px';
        prog.style.right = '8px';
        prog.style.fontWeight = '800';
        prog.style.textAlign = 'center';
        prog.textContent = `${completedCount}/${TOTAL_DAYS}`;
        giftCard.appendChild(prog);

        // Stealth behavior: Locked and visually subtle until all others complete
        const allComplete = completedCount >= TOTAL_DAYS || (GIFT_PARAM === '1' || GIFT_PARAM === 'true' || GIFT_PARAM === 'open');
        if (!allComplete) {
            // hide number and make card muted, no click
            giftCard.classList.add('locked');
            // subtle hint: no number, show only progress text
            giftNum.style.opacity = '0.2';
            giftCard.title = 'A surprise awaits once all challenges are complete';
            giftCard.addEventListener('click', () => showModal('Finish all 24 to reveal your gift!'));
        } else {
            giftCard.classList.remove('locked');
            giftCard.classList.add('completed'); // visually celebratory
            giftCard.title = 'Your special gift';
            giftCard.addEventListener('click', () => openGiftTile());
        }
        grid.appendChild(giftCard);
        // Auto-open gift overlay when requested
        if (allComplete && (GIFT_PARAM === 'open')) {
            // slight delay to ensure DOM ready
            setTimeout(openGiftTile, 50);
        }
    }

    function getToday() {
        if (FAKE_TODAY) {
            return new Date(FAKE_TODAY);
        }
        return new Date();
    }

    function showLockedMessage() {
        const randomQuote = lockedQuotes[Math.floor(Math.random() * lockedQuotes.length)];
        showModal(randomQuote);
    }

    function showModal(message) {
        modalText.innerText = message;
        modal.classList.remove('hidden');
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    function openGame(day) {
        gameOverlay.classList.remove('hidden');
        gameTitle.innerText = `Day ${day} Challenge`;
        setRandomIcon();

        // Clear previous game
        gameContent.innerHTML = '';

        // Load game if available; otherwise, placeholder
        if (games[day]) {
            games[day](gameContent, () => markDayComplete(day));
        } else {
            loadPlaceholderGame(day);
        }
    }

    function closeGame() {
        // Close immediately without confirmation
        gameOverlay.classList.add('hidden');
        gameContent.innerHTML = '';
    }

    function loadPlaceholderGame(day) {
        const container = document.createElement('div');
        container.style.textAlign = 'center';
        const msg = document.createElement('h3');
        msg.innerText = `Welcome to Day ${day}!`;
        const desc = document.createElement('p');
        desc.innerText = "This day's game isn't ready yet. Click the button to simulate winning (dev mode).";
        desc.style.marginBottom = "20px";
        const winBtn = document.createElement('button');
        winBtn.innerText = "Dev: Mark Complete";
        winBtn.classList.add('comic-btn');
        winBtn.onclick = () => markDayComplete(day);
        container.appendChild(msg);
        container.appendChild(desc);
        container.appendChild(winBtn);
        gameContent.appendChild(container);
    }

    // Gift Tile overlay
    function openGiftTile() {
        gameOverlay.classList.remove('hidden');
        gameTitle.innerText = 'Surprise Gift';
        setRandomIcon();
        gameContent.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.style.textAlign = 'center';
        const h = document.createElement('h3');
        h.innerText = 'Merry Christmas Amo! 🎁';
        const p = document.createElement('p');
        p.innerText = 'You conquered all 24 challenges. Here is one of your gifts!';
        const btn = document.createElement('a');
        btn.className = 'comic-btn';
        btn.style.display = 'inline-block';
        btn.style.marginTop = '16px';
        btn.textContent = 'Open Gift';
        // Open the final gift URL directly when clicked
        btn.href = 'https://www.budapestpark.hu/events/mac-demarco-20260623';
        btn.target = '_blank';
        btn.rel = 'noopener noreferrer';
        wrap.appendChild(h);
        wrap.appendChild(p);
        wrap.appendChild(btn);
        gameContent.appendChild(wrap);
    }

    function markDayComplete(day) {
        const progress = JSON.parse(localStorage.getItem('snoopy_xmas_progress')) || {};
        progress[day] = true;
        localStorage.setItem('snoopy_xmas_progress', JSON.stringify(progress));

        gameOverlay.classList.add('hidden');
        initGrid(); // Refresh grid to show checkmark
    }

    // Event Listeners
    modalBtn.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    closeGameBtn.addEventListener('click', closeGame);

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Snow Effect
    function createSnow() {
        const snowContainer = document.getElementById('snow-container');
        const snowflakeCount = 50;

        for (let i = 0; i < snowflakeCount; i++) {
            const snowflake = document.createElement('div');
            snowflake.classList.add('snowflake');
            snowflake.style.left = Math.random() * 100 + 'vw';
            snowflake.style.animationDuration = Math.random() * 3 + 2 + 's'; // 2-5s
            snowflake.style.opacity = Math.random();
            snowflake.style.width = snowflake.style.height = Math.random() * 10 + 5 + 'px';

            snowContainer.appendChild(snowflake);
        }
    }

    // ==========================
    // Games Implementations
    // ==========================

    // 1) Simon Game
    function simonGame(root, onWin) {
        root.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'simon-wrapper';
        wrapper.innerHTML = `
            <h3>Repeat the Christmas pattern</h3>
            <p class="simon-info">Win after 10 rounds</p>
            <div class="simon-grid">
                <div class="simon-pad pad-green" data-pad="0"></div>
                <div class="simon-pad pad-red" data-pad="1"></div>
                <div class="simon-pad pad-yellow" data-pad="2"></div>
                <div class="simon-pad pad-blue" data-pad="3"></div>
            </div>
            <button class="comic-btn" id="simon-start">Start</button>
        `;
        root.appendChild(wrapper);

        const PADS = Array.from(wrapper.querySelectorAll('.simon-pad'));
        const startBtn = wrapper.querySelector('#simon-start');
        const info = wrapper.querySelector('.simon-info');

        const targetRounds = 10;
        let roundsCompleted = 0;
        let seq = [];
        let userIndex = 0;
        let accepting = false;

        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        let audioReady = false;
        async function ensureAudio() {
            try {
                if (ctx.state === 'suspended') {
                    await ctx.resume();
                }
                audioReady = true;
            } catch (e) {
                // ignore
            }
        }
        const freqs = [329.6, 261.6, 220.0, 196.0]; // G E A G-ish tones

        function beep(i, duration = 300) {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'sine';
            o.frequency.value = freqs[i];
            o.connect(g);
            g.connect(ctx.destination);
            const now = ctx.currentTime;
            g.gain.setValueAtTime(0.0001, now);
            g.gain.exponentialRampToValueAtTime(0.3, now + 0.02);
            o.start(now);
            PADS[i].classList.add('active');
            setTimeout(() => {
                PADS[i].classList.remove('active');
                const t = ctx.currentTime;
                g.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
                o.stop(t + 0.06);
            }, Math.max(60, duration - 20));
        }

        function playSequence() {
            accepting = false;
            userIndex = 0;
            let t = 0;
            const pace = Math.max(160, 600 - seq.length * 40); // speeds up
            seq.forEach((val) => {
                setTimeout(() => { if (audioReady) beep(val, pace * 0.8); }, t);
                t += pace;
            });
            setTimeout(() => { accepting = true; }, t + 50);
        }

        function nextRound() {
            seq.push(Math.floor(Math.random() * 4));
            info.textContent = `Rounds: ${roundsCompleted} / ${targetRounds}`;
            playSequence();
        }

        function resetGame(message) {
            showModal(message || "Close, but no candy cane. Try again!");
            seq = [];
            roundsCompleted = 0;
            userIndex = 0;
            accepting = false;
            setTimeout(() => info.textContent = 'Press Start to play again', 0);
        }

        PADS.forEach(pad => pad.addEventListener('click', async () => {
            if (!audioReady) await ensureAudio();
            if (!accepting) return;
            const i = Number(pad.dataset.pad);
            if (audioReady) beep(i, 200);
            if (i === seq[userIndex]) {
                userIndex++;
                if (userIndex === seq.length) {
                    roundsCompleted++;
                    if (roundsCompleted >= targetRounds) {
                        info.textContent = 'Festive perfection! You win!';
                        setTimeout(onWin, 500);
                        accepting = false;
                        return;
                    }
                    setTimeout(nextRound, 600);
                }
            } else {
                resetGame("Oops—wrong light!");
            }
        }));

        startBtn.addEventListener('click', async () => {
            if (!audioReady) await ensureAudio();
            roundsCompleted = 0;
            seq = [];
            userIndex = 0;
            info.textContent = 'Watch closely...';
            nextRound();
        });
    }

    // 2) Maze Game
    function mazeGame(root, onWin) {
        root.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.style.width = '100%';
        wrap.innerHTML = `
            <div class="maze-instructions">Guide your cursor from START to the gift without touching the walls. Leaving the maze resets!</div>
            <div class="maze-container" id="maze">
                <div class="maze-start" style="left:10px; top:125px;">START</div>
                <div class="maze-end" style="right:10px; top:125px;">GIFT</div>

                <!-- Walls -->
                <div class="maze-wall" style="left:0; top:0; width:100%; height:20px;"></div>
                <div class="maze-wall" style="left:0; bottom:0; width:100%; height:20px;"></div>
                <div class="maze-wall" style="left:0; top:0; width:20px; height:100%;"></div>
                <div class="maze-wall" style="right:0; top:0; width:20px; height:100%;"></div>
                <!-- Inner walls -->
                <div class="maze-wall" style="left:100px; top:20px; width:20px; height:200px;"></div>
                <div class="maze-wall" style="left:220px; top:100px; width:20px; height:200px;"></div>
                <div class="maze-wall" style="left:340px; top:20px; width:20px; height:200px;"></div>
                <div class="maze-wall" style="left:460px; top:100px; width:20px; height:200px;"></div>
                <div class="maze-wall" style="left:180px; top:80px; width:240px; height:20px;"></div>
                <div class="maze-wall" style="left:300px; top:200px; width:240px; height:20px;"></div>
            </div>
        `;
        root.appendChild(wrap);

        const maze = wrap.querySelector('#maze');
        const start = wrap.querySelector('.maze-start');
        const end = wrap.querySelector('.maze-end');
        const walls = wrap.querySelectorAll('.maze-wall');

        let inMaze = false;
        let started = false;

        start.addEventListener('mouseenter', () => {
            started = true;
            inMaze = true;
        });

        end.addEventListener('mouseenter', () => {
            if (started && inMaze) {
                showModal('You made it! Present secured.');
                setTimeout(onWin, 300);
                started = false;
            }
        });

        walls.forEach(w => w.addEventListener('mouseenter', () => {
            if (started) {
                started = false;
                showModal('Bump! Back to START.');
            }
        }));

        maze.addEventListener('mouseleave', () => {
            if (started) {
                started = false;
                showModal('No shortcuts through the snow!');
            }
            inMaze = false;
        });
    }

    // 3) Timing Bar Game
    function timingBarGame(root, onWin) {
        root.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = 'timing-wrapper';
        wrap.innerHTML = `
            <h3>Hit space when the bar is in the red zone</h3>
            <div class="timing-track" id="track">
                <div class="timing-target" id="target" style="left: 45%; width: 10%;"></div>
                <div class="timing-bar" id="bar"></div>
            </div>
            <div class="timing-info" id="timing-info">Streak: 0 / 3</div>
            <p>(Needs 3 perfect hits in a row)</p>
        `;
        root.appendChild(wrap);

        const track = wrap.querySelector('#track');
        const target = wrap.querySelector('#target');
        const bar = wrap.querySelector('#bar');
        const info = wrap.querySelector('#timing-info');

        let dir = 1;
        let pos = 0; // 0..1
        let last = performance.now();
        let streak = 0;
        let running = true;

        function update(now) {
            if (!running) return;
            const dt = Math.min(40, now - last);
            last = now;
            // speed changes slightly for unpredictability
            const speed = 0.0006 * (1 + Math.sin(now / 5000) * 0.3); // units per ms
            pos += dir * speed * dt;
            if (pos <= 0) { pos = 0; dir = 1; }
            if (pos >= 1) { pos = 1; dir = -1; }
            const px = Math.round(pos * (track.clientWidth - bar.clientWidth));
            bar.style.left = px + 'px';
            requestAnimationFrame(update);
        }

        function inTarget() {
            const trackRect = track.getBoundingClientRect();
            const barRect = bar.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            return barRect.left >= targetRect.left && (barRect.right) <= targetRect.right;
        }

        function keyHandler(e) {
            if (e.code === 'Space') {
                e.preventDefault();
                if (inTarget()) {
                    streak++;
                    info.textContent = `Streak: ${streak} / 3`;
                    showModal(['Bullseye!', 'Snowflake-precise!', 'Perfect!'][Math.floor(Math.random() * 3)]);
                    if (streak >= 3) {
                        running = false;
                        window.removeEventListener('keydown', keyHandler);
                        setTimeout(onWin, 400);
                    }
                } else {
                    streak = 0;
                    info.textContent = 'Streak: 0 / 3';
                    showModal('Oops—coal for that one. Missed!');
                }
            }
        }

        window.addEventListener('keydown', keyHandler);
        requestAnimationFrame(update);

        // cleanup when leaving overlay
        const cleanup = () => {
            running = false;
            window.removeEventListener('keydown', keyHandler);
        };
        // Observe overlay closing
        const observer = new MutationObserver(() => {
            if (document.getElementById('game-overlay').classList.contains('hidden')) {
                cleanup();
                observer.disconnect();
            }
        });
        observer.observe(document.getElementById('game-overlay'), { attributes: true, attributeFilter: ['class'] });
    }

    // 3) TicTacToe (Day 3)
    function tictactoeGame(root, onWin) {
        root.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = 'ttt-wrapper';
        const DRAW_TARGET = 7;
        wrap.innerHTML = `
            <h3>Tic‑Tac‑Toe vs. a tough bot</h3>
            <div class="ttt-info" id="ttt-info">Win once OR earn ${DRAW_TARGET} draws in a row to complete the day.</div>
            <div class="ttt-board" id="ttt-board"></div>
            <div class="ttt-controls">
                <button class="comic-btn-small" id="ttt-restart">Restart round</button>
            </div>
        `;
        root.appendChild(wrap);

        const boardEl = wrap.querySelector('#ttt-board');
        const infoEl = wrap.querySelector('#ttt-info');
        const restartBtn = wrap.querySelector('#ttt-restart');

        const HUMAN = 'X';
        const BOT = 'O';
        let board = Array(9).fill('');
        let turn = HUMAN; // human starts; harder to beat but still fair
        let gameOver = false;
        let drawsInRow = 0;

        function render() {
            boardEl.innerHTML = '';
            board.forEach((val, idx) => {
                const cell = document.createElement('div');
                cell.className = 'ttt-cell' + (gameOver || val ? ' disabled' : '');
                cell.dataset.idx = idx;
                cell.textContent = val;
                cell.addEventListener('click', () => onCell(idx));
                boardEl.appendChild(cell);
            });
        }

        function lines() {
            return [
                [0, 1, 2], [3, 4, 5], [6, 7, 8],
                [0, 3, 6], [1, 4, 7], [2, 5, 8],
                [0, 4, 8], [2, 4, 6]
            ];
        }

        function winner(b) {
            for (const [a, c, d] of lines()) {
                if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
            }
            return null;
        }

        function isFull(b) { return b.every(x => x); }

        function score(b, depth) {
            const w = winner(b);
            if (w === BOT) return 10 - depth;
            if (w === HUMAN) return depth - 10;
            return 0;
        }

        function minimax(b, depth, isMax, alpha, beta) {
            const w = winner(b);
            if (w || isFull(b)) return { val: score(b, depth), move: -1 };
            if (isMax) {
                let best = { val: -Infinity, move: -1 };
                for (let i = 0; i < 9; i++) if (!b[i]) {
                    b[i] = BOT;
                    const res = minimax(b, depth + 1, false, alpha, beta);
                    b[i] = '';
                    if (res.val > best.val) best = { val: res.val, move: i };
                    alpha = Math.max(alpha, res.val);
                    if (beta <= alpha) break;
                }
                return best;
            } else {
                let best = { val: Infinity, move: -1 };
                for (let i = 0; i < 9; i++) if (!b[i]) {
                    b[i] = HUMAN;
                    const res = minimax(b, depth + 1, true, alpha, beta);
                    b[i] = '';
                    if (res.val < best.val) best = { val: res.val, move: i };
                    beta = Math.min(beta, res.val);
                    if (beta <= alpha) break;
                }
                return best;
            }
        }

        function botMove() {
            if (gameOver) return;
            const { move } = minimax(board.slice(), 0, true, -Infinity, Infinity);
            if (move >= 0) {
                board[move] = BOT;
            }
            finalizeTurn();
        }

        function onCell(i) {
            if (gameOver || board[i] || turn !== HUMAN) return;
            board[i] = HUMAN;
            finalizeTurn(() => setTimeout(botMove, 100));
        }

        function resetRound(nextStarter = HUMAN) {
            board = Array(9).fill('');
            gameOver = false;
            turn = nextStarter;
            render();
            if (turn === BOT) setTimeout(botMove, 120);
        }

        function finalizeTurn(afterHumanCallback) {
            const w = winner(board);
            if (w) {
                gameOver = true;
                render();
                if (w === HUMAN) {
                    infoEl.textContent = 'You beat the bot! Day complete.';
                    showModal('Victory! You outsmarted the bot.');
                    setTimeout(onWin, 400);
                } else {
                    drawsInRow = 0;
                    infoEl.textContent = 'Bot wins. Try again!';
                    showModal('The bot wins this round.');
                    setTimeout(() => resetRound(HUMAN), 400);
                }
                return;
            }
            if (isFull(board)) {
                gameOver = true;
                render();
                drawsInRow += 1;
                if (drawsInRow >= DRAW_TARGET) {
                    infoEl.textContent = `${DRAW_TARGET} draws in a row — day complete!`;
                    showModal('Unbeaten twice! That counts as a win.');
                    setTimeout(onWin, 400);
                } else {
                    const remaining = DRAW_TARGET - drawsInRow;
                    infoEl.textContent = `Draw ${drawsInRow}/${DRAW_TARGET}. ${remaining === 1 ? 'One more to complete!' : remaining + ' to go.'}`;
                    showModal(remaining === 1 ? 'Draw! One more draw to finish.' : 'Draw! Keep going.');
                    setTimeout(() => resetRound(HUMAN), 400);
                }
                return;
            }
            // swap turn
            turn = (turn === HUMAN) ? BOT : HUMAN;
            render();
            if (afterHumanCallback && turn === BOT) afterHumanCallback();
        }

        restartBtn.addEventListener('click', () => {
            drawsInRow = 0;
            resetRound(HUMAN);
        });

        // init
        render();
    }

    // 2) Hangman Game (Day 2)
    function hangmanGame(root, onWin) {
        root.innerHTML = '';
        // Configure the secret phrase here (uppercase recommended). You can change this string.
        const HANGMAN_SECRET = (new URLSearchParams(location.search).get('secret') || 'JAZZ RHYTHMS').toUpperCase();
        const secret = HANGMAN_SECRET;
        const lockKey = 'xmas_hangman_day2_lock_until';
        const allowed = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let guessed = new Set();
        let wrong = new Set();
        const maxLives = 6; // head, body, armL, armR, legL, legR
        let gameOver = false;

        const wrap = document.createElement('div');
        wrap.className = 'hangman-wrapper';
        wrap.innerHTML = `
            <div class="hangman-top">
                <div class="gallows">
                    <div class="base"></div>
                    <div class="pole"></div>
                    <div class="beam"></div>
                    <div class="rope"></div>
                    <div class="head" id="hm-head"></div>
                    <div class="body" id="hm-body"></div>
                    <div class="arm left" id="hm-arm-l"></div>
                    <div class="arm right" id="hm-arm-r"></div>
                    <div class="leg left" id="hm-leg-l"></div>
                    <div class="leg right" id="hm-leg-r"></div>
                </div>
                <div class="hangman-panel">
                    <div class="word" id="hm-word"></div>
                    <div class="misses" id="hm-misses"></div>
                    <div class="hangman-stats">Lives: <span id="hm-lives">${maxLives}</span></div>
                    <div class="cooldown" id="hm-cooldown" style="margin-top:6px; font-weight:bold;"></div>
                </div>
            </div>
            <div class="keyboard-grid" id="hm-keys"></div>
        `;
        root.appendChild(wrap);

        const head = wrap.querySelector('#hm-head');
        const body = wrap.querySelector('#hm-body');
        const armL = wrap.querySelector('#hm-arm-l');
        const armR = wrap.querySelector('#hm-arm-r');
        const legL = wrap.querySelector('#hm-leg-l');
        const legR = wrap.querySelector('#hm-leg-r');
        const wordEl = wrap.querySelector('#hm-word');
        const missesEl = wrap.querySelector('#hm-misses');
        const livesEl = wrap.querySelector('#hm-lives');
        const keysEl = wrap.querySelector('#hm-keys');
        const cooldownEl = wrap.querySelector('#hm-cooldown');

        function maskWord() {
            let out = '';
            for (const ch of secret) {
                if (allowed.includes(ch)) {
                    out += guessed.has(ch) ? ch : '_';
                } else {
                    out += ch; // spaces or punctuation
                }
                out += ' ';
            }
            wordEl.textContent = out.trim();
        }

        function updateGallows() {
            const fails = wrong.size;
            head.style.display = fails >= 1 ? 'block' : 'none';
            body.style.display = fails >= 2 ? 'block' : 'none';
            armL.style.display = fails >= 3 ? 'block' : 'none';
            armR.style.display = fails >= 4 ? 'block' : 'none';
            legL.style.display = fails >= 5 ? 'block' : 'none';
            legR.style.display = fails >= 6 ? 'block' : 'none';
            livesEl.textContent = Math.max(0, maxLives - fails);
            const missList = Array.from(wrong).join(', ');
            missesEl.textContent = missList ? `Misses: ${missList}` : '';
        }

        function buildKeyboard() {
            keysEl.innerHTML = '';
            for (const ch of allowed) {
                const btn = document.createElement('button');
                btn.className = 'key';
                btn.textContent = ch;
                btn.dataset.key = ch;
                btn.addEventListener('click', () => guess(ch));
                keysEl.appendChild(btn);
            }
        }

        function setDisabled(ch) {
            const b = keysEl.querySelector(`[data-key="${ch}"]`);
            if (b) b.classList.add('disabled');
        }

        function guess(ch) {
            if (gameOver) return;
            if (!allowed.includes(ch)) return;
            if (guessed.has(ch) || wrong.has(ch)) return;
            if (secret.includes(ch)) {
                guessed.add(ch);
                setDisabled(ch);
                maskWord();
                checkWin();
            } else {
                wrong.add(ch);
                setDisabled(ch);
                updateGallows();
                checkLose();
            }
        }

        function checkWin() {
            for (const ch of secret) {
                if (allowed.includes(ch) && !guessed.has(ch)) return;
            }
            gameOver = true;
            disableAll();
            showModal('You saved Christmas!');
            setTimeout(onWin, 400);
            cleanup();
        }

        function checkLose() {
            if (wrong.size >= maxLives) {
                gameOver = true;
                // Set a 5-minute cooldown
                const until = Date.now() + 5 * 60 * 1000;
                localStorage.setItem(lockKey, String(until));
                showModal('Out of lives! Try again in 5 minutes.');
                startCooldown(until - Date.now());
                disableAll();
            }
        }

        function disableAll() {
            gameOver = true;
            keysEl.querySelectorAll('.key').forEach(k => k.classList.add('disabled'));
            window.removeEventListener('keydown', keyHandler);
        }

        function keyHandler(e) {
            const k = e.key.toUpperCase();
            if (allowed.includes(k)) {
                e.preventDefault();
                guess(k);
            }
        }

        function resetGame() {
            guessed = new Set();
            wrong = new Set();
            gameOver = false;
            buildKeyboard();
            maskWord();
            updateGallows();
            window.addEventListener('keydown', keyHandler);
        }

        function cleanup() {
            window.removeEventListener('keydown', keyHandler);
        }

        function msToClock(ms) {
            const s = Math.max(0, Math.ceil(ms / 1000));
            const m = Math.floor(s / 60);
            const sec = s % 60;
            return `${String(m).padStart(1, '0')}:${String(sec).padStart(2, '0')}`;
        }

        function startCooldown(initialMs) {
            gameOver = true;
            disableAll();
            const update = () => {
                const remain = (Number(localStorage.getItem(lockKey)) || 0) - Date.now();
                if (remain > 0) {
                    cooldownEl.textContent = `Cooldown: ${msToClock(remain)}`;
                } else {
                    cooldownEl.textContent = '';
                    clearInterval(timer);
                    // Re-enable for a fresh attempt
                    resetGame();
                }
            };
            update();
            const timer = setInterval(update, 1000);
        }

        // init
        buildKeyboard();
        maskWord();
        updateGallows();
        // Check for active cooldown
        const lockUntil = Number(localStorage.getItem(lockKey)) || 0;
        if (lockUntil > Date.now()) {
            startCooldown(lockUntil - Date.now());
        } else {
            window.addEventListener('keydown', keyHandler);
        }

        // cleanup when overlay closes
        const observer = new MutationObserver(() => {
            if (document.getElementById('game-overlay').classList.contains('hidden')) {
                cleanup();
                observer.disconnect();
            }
        });
        observer.observe(document.getElementById('game-overlay'), { attributes: true, attributeFilter: ['class'] });
    }

    // 5) 2048 Game (Day 5)
    function g2048Game(root, onWin) {
        root.innerHTML = '';
        const SIZE = 4;
        let board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
        let score = 0;
        let gameOver = false;

        const wrap = document.createElement('div');
        wrap.className = 'g2048-wrapper';
        wrap.innerHTML = `
            <h3>2048</h3>
            <div class="g2048-container">
              <aside class="g2048-sidebar">
                <div class="g2048-topbar">
                    <span>Score: <span id="g2048-score">0</span></span>
                </div>
                <div class="g2048-controls">
                    <button class="comic-btn-small btn-2048-restart" id="g2048-restart">Restart</button>
                    <button class="comic-btn-small btn-2048-help" id="g2048-help">How to play</button>
                    <small>Use arrow keys or swipe.</small>
                </div>
              </aside>
              <div class="g2048-board" id="g2048-board"></div>
            </div>
        `;
        root.appendChild(wrap);

        const boardEl = wrap.querySelector('#g2048-board');
        const scoreEl = wrap.querySelector('#g2048-score');
        const restartBtn = wrap.querySelector('#g2048-restart');
        const helpBtn = wrap.querySelector('#g2048-help');

        function showHelp2048() {
            showModal(
                `Goal: Merge tiles to reach 2048.

Controls:
- Keyboard: Arrow keys (or WASD)
- Touch: Swipe to move.

Rules:
- Tiles slide to the chosen side.
- Equal tiles that collide merge once per move.
- A new tile (2 or 4) appears after each move.
`);
        }
        helpBtn.addEventListener('click', showHelp2048);

        function updateScore(v) { score = v; scoreEl.textContent = String(score); }

        function emptyCells() {
            const cells = [];
            for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (board[r][c] === 0) cells.push([r, c]);
            return cells;
        }

        function addRandomTile() {
            const cells = emptyCells();
            if (cells.length === 0) return false;
            const [r, c] = cells[Math.floor(Math.random() * cells.length)];
            board[r][c] = Math.random() < 0.9 ? 2 : 4;
            return true;
        }

        function render() {
            boardEl.innerHTML = '';
            for (let r = 0; r < SIZE; r++) {
                for (let c = 0; c < SIZE; c++) {
                    const v = board[r][c];
                    const cell = document.createElement('div');
                    cell.className = 'g2048-cell v-' + (v || 0);
                    cell.textContent = v || '';
                    boardEl.appendChild(cell);
                }
            }
        }

        function slideRowLeft(row) {
            const nonZero = row.filter(v => v !== 0);
            const result = [];
            let i = 0;
            let gained = 0;
            while (i < nonZero.length) {
                if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
                    const merged = nonZero[i] * 2;
                    result.push(merged);
                    gained += merged;
                    i += 2;
                } else {
                    result.push(nonZero[i]);
                    i += 1;
                }
            }
            while (result.length < SIZE) result.push(0);
            return { row: result, gained };
        }

        function move(dir) { // 'left','right','up','down'
            if (gameOver) return false;
            const before = JSON.stringify(board);
            let gainedTotal = 0;
            if (dir === 'left' || dir === 'right') {
                for (let r = 0; r < SIZE; r++) {
                    let row = board[r].slice();
                    if (dir === 'right') row = row.reverse();
                    const { row: newRow, gained } = slideRowLeft(row);
                    board[r] = (dir === 'right') ? newRow.slice().reverse() : newRow;
                    gainedTotal += gained;
                }
            } else if (dir === 'up' || dir === 'down') {
                for (let c = 0; c < SIZE; c++) {
                    let col = [];
                    for (let r = 0; r < SIZE; r++) col.push(board[r][c]);
                    if (dir === 'down') col = col.reverse();
                    const { row: newCol, gained } = slideRowLeft(col);
                    let finalCol = (dir === 'down') ? newCol.slice().reverse() : newCol;
                    for (let r = 0; r < SIZE; r++) board[r][c] = finalCol[r];
                    gainedTotal += gained;
                }
            }
            if (JSON.stringify(board) !== before) {
                updateScore(score + gainedTotal);
                addRandomTile();
                render();
                checkWinLose();
                return true;
            }
            return false;
        }

        function canMove() {
            if (emptyCells().length > 0) return true;
            // any merge possible?
            for (let r = 0; r < SIZE; r++) {
                for (let c = 0; c < SIZE; c++) {
                    const v = board[r][c];
                    if ((r + 1 < SIZE && board[r + 1][c] === v) || (c + 1 < SIZE && board[r][c + 1] === v)) return true;
                }
            }
            return false;
        }

        function checkWinLose() {
            for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (board[r][c] === 2048) {
                gameOver = true;
                showModal('2048 reached! Christmas magic achieved!');
                setTimeout(onWin, 400);
                cleanup();
                return;
            }
            if (!canMove()) {
                gameOver = true;
                showModal('No more moves. Try again!');
            }
        }

        // Input: keyboard
        function keyHandler(e) {
            const k = e.key.toLowerCase();
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k) || ['up', 'down', 'left', 'right'].includes(k)) {
                e.preventDefault();
                const map = { arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right' };
                move(map[k] || k);
            }
        }

        // Input: touch
        let touchStartX = 0, touchStartY = 0, touching = false;
        function onTouchStart(e) {
            if (!e.touches || e.touches.length === 0) return;
            touching = true;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
        function onTouchMove(e) {
            if (touching) e.preventDefault(); // keep scroll from hijacking vertical swipes
        }
        function onTouchEnd(e) {
            if (!touching) return;
            touching = false;
            const t = (e.changedTouches && e.changedTouches[0]) || null;
            if (!t) return;
            const dx = t.clientX - touchStartX;
            const dy = t.clientY - touchStartY;
            const absX = Math.abs(dx), absY = Math.abs(dy);
            if (Math.max(absX, absY) < 24) return; // small swipe threshold
            if (absX > absY) move(dx > 0 ? 'right' : 'left'); else move(dy > 0 ? 'down' : 'up');
        }

        restartBtn.addEventListener('click', () => start());

        function start() {
            board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
            updateScore(0);
            gameOver = false;
            addRandomTile();
            addRandomTile();
            render();
        }

        function cleanup() {
            window.removeEventListener('keydown', keyHandler);
            boardEl.removeEventListener('touchstart', onTouchStart, { passive: true });
            boardEl.removeEventListener('touchmove', onTouchMove);
            boardEl.removeEventListener('touchend', onTouchEnd);
        }

        // init
        start();
        window.addEventListener('keydown', keyHandler);
        boardEl.addEventListener('touchstart', onTouchStart, { passive: true });
        boardEl.addEventListener('touchmove', onTouchMove, { passive: false });
        boardEl.addEventListener('touchend', onTouchEnd);

        // cleanup on overlay close
        const observer = new MutationObserver(() => {
            if (document.getElementById('game-overlay').classList.contains('hidden')) {
                cleanup();
                observer.disconnect();
            }
        });
        observer.observe(document.getElementById('game-overlay'), { attributes: true, attributeFilter: ['class'] });
    }

    // 6) LinkedIn Tango (Day 6)
    function tangoGame(root, onWin) {
        root.innerHTML = '';
        const N = 6; // 6x6 grid
        // Symbols
        const SUN = '☀️';
        const MOON = '🌑';
        // Board states: '', SUN, MOON. Prefilled cells locked.
        let board = Array.from({ length: N }, () => Array(N).fill(''));
        let locked = Array.from({ length: N }, () => Array(N).fill(false));
        // Constraints between cells: {type: 'eq'|'neq', a:[r,c], b:[r,c]}
        const constraints = [];
        // Provide a known valid solution to ensure solvability
        const SOL = [
            [SUN, SUN, MOON, MOON, SUN, MOON],
            [MOON, MOON, SUN, SUN, MOON, SUN],
            [SUN, MOON, SUN, MOON, MOON, SUN],
            [MOON, SUN, MOON, SUN, SUN, MOON],
            [SUN, MOON, MOON, SUN, MOON, SUN],
            [MOON, SUN, SUN, MOON, SUN, MOON],
        ];

        const wrap = document.createElement('div');
        wrap.className = 'tango-wrapper';
        wrap.innerHTML = `
            <h3>Tango</h3>
            <div class="tango-container">
              <aside class="tango-sidebar">
                <div class="tango-stats">Each row/column: ${N / 2} suns and ${N / 2} moons</div>
                <div class="tango-controls">
                    <button class="comic-btn-small" id="tango-help">How to play</button>
                    <button class="comic-btn-small" id="tango-check">Check</button>
                    <button class="comic-btn-small" id="tango-hint">Hint</button>
                    <button class="comic-btn-small" id="tango-clear">Clear row/col</button>
                    <button class="comic-btn-small" id="tango-restart">Restart puzzle</button>
                </div>
              </aside>
              <div class="tango-board" id="tango-board"></div>
            </div>
        `;
        root.appendChild(wrap);

        const boardEl = wrap.querySelector('#tango-board');
        const helpBtn = wrap.querySelector('#tango-help');
        const checkBtn = wrap.querySelector('#tango-check');
        const hintBtn = wrap.querySelector('#tango-hint');
        const clearBtn = wrap.querySelector('#tango-clear');
        const restartBtn = wrap.querySelector('#tango-restart');

        function showHelp() {
            showModal(
                `Fill the grid with suns ${SUN} and moons ${MOON}.

Rules:
- Equal numbers per row and column (${N / 2} each).
- No more than two of the same symbol adjacent horizontally or vertically.
- Cells linked with = must match; with x must differ.

Tip: Use logic — no guessing needed.`
            );
        }

        // Create a fixed starter puzzle (hand-crafted to be solvable without guessing)
        function seedPuzzle() {
            // Prefill some cells from the known solution
            // Slightly harder: fewer prefilled cells, but still consistent with SOL
            const clues = [
                [0, 1], [0, 5],
                [1, 0],
                [2, 2],
                [3, 4],
                [4, 0], [4, 5],
                [5, 3]
            ];
            for (const [r, c] of clues) {
                board[r][c] = SOL[r][c];
                locked[r][c] = true;
            }
            // Add constraints consistent with the solution
            const pairs = [
                // equals (matching SOL), placed to encourage deduction chains
                { a: [0, 2], b: [0, 3], type: 'eq' },
                { a: [2, 4], b: [2, 5], type: 'eq' },
                // different (matching SOL)
                { a: [2, 0], b: [3, 0], type: 'neq' },
                { a: [1, 1], b: [1, 2], type: 'neq' },
                { a: [3, 2], b: [3, 3], type: 'neq' },
                { a: [5, 4], b: [5, 5], type: 'neq' },
            ];
            for (const p of pairs) constraints.push(p);
        }

        function render() {
            boardEl.innerHTML = '';
            // cells
            for (let r = 0; r < N; r++) {
                for (let c = 0; c < N; c++) {
                    const cell = document.createElement('div');
                    cell.className = 'tango-cell';
                    if (locked[r][c]) cell.classList.add('prefilled');
                    cell.dataset.r = String(r);
                    cell.dataset.c = String(c);
                    cell.textContent = board[r][c] || '';
                    if (!locked[r][c]) {
                        cell.addEventListener('click', () => toggle(r, c));
                    }
                    boardEl.appendChild(cell);
                }
            }
            // Draw connectors between adjacent cells: a circle badge at the midpoint
            const bRect = boardEl.getBoundingClientRect();
            constraints.forEach(con => {
                const [ar, ac] = con.a; const [br, bc] = con.b;
                const idxA = ar * N + ac; const idxB = br * N + bc;
                const cellA = boardEl.children[idxA];
                const cellB = boardEl.children[idxB];
                if (!cellA || !cellB) return;
                const rA = cellA.getBoundingClientRect();
                const rB = cellB.getBoundingClientRect();
                const midX = (rA.left + rA.right) / 2 - bRect.left;
                const midY = (rA.top + rA.bottom) / 2 - bRect.top;
                const midX2 = (rB.left + rB.right) / 2 - bRect.left;
                const midY2 = (rB.top + rB.bottom) / 2 - bRect.top;
                const cx = (midX + midX2) / 2;
                const cy = (midY + midY2) / 2;
                const connector = document.createElement('div');
                connector.className = 'tango-connector ' + (con.type === 'eq' ? 'eq' : 'x');
                connector.textContent = con.type === 'eq' ? '=' : 'x';
                connector.style.left = (cx - 9) + 'px';
                connector.style.top = (cy - 9) + 'px';
                boardEl.appendChild(connector);
            });
        }

        function toggle(r, c) {
            const v = board[r][c];
            board[r][c] = v === '' ? SUN : (v === SUN ? MOON : '');
            validate();
            render();
        }

        function rowCounts(r) {
            let s = 0, m = 0; for (let c = 0; c < N; c++) { if (board[r][c] === SUN) s++; else if (board[r][c] === MOON) m++; }
            return { s, m };
        }
        function colCounts(c) {
            let s = 0, m = 0; for (let r = 0; r < N; r++) { if (board[r][c] === SUN) s++; else if (board[r][c] === MOON) m++; }
            return { s, m };
        }

        function validate() {
            // clear invalid flags
            Array.from(boardEl.children).forEach(el => el.classList && el.classList.remove('invalid'));
            let ok = true;
            // 1) No more than two adjacent same symbols
            for (let r = 0; r < N; r++) {
                for (let c = 0; c < N; c++) {
                    const v = board[r][c]; if (!v) continue;
                    // check horizontal runs
                    const h = [c - 2, c - 1, c, c + 1, c + 2];
                    for (let i = 0; i + 2 < h.length; i++) {
                        const a = h[i], b = h[i + 1], d = h[i + 2];
                        if (a >= 0 && d < N && board[r][a] === v && board[r][b] === v && board[r][d] === v) {
                            markInvalid(r, a); markInvalid(r, b); markInvalid(r, d); ok = false;
                        }
                    }
                    // check vertical runs
                    const vIdx = [r - 2, r - 1, r, r + 1, r + 2];
                    for (let i = 0; i + 2 < vIdx.length; i++) {
                        const a = vIdx[i], b = vIdx[i + 1], d = vIdx[i + 2];
                        if (a >= 0 && d < N && board[a][c] === v && board[b][c] === v && board[d][c] === v) {
                            markInvalid(a, c); markInvalid(b, c); markInvalid(d, c); ok = false;
                        }
                    }
                }
            }
            // 2) Equal numbers per row/col (final check only)
            // For validation while solving, ensure counts do not exceed N/2
            for (let r = 0; r < N; r++) { const { s, m } = rowCounts(r); if (s > N / 2 || m > N / 2) { markRowInvalid(r); ok = false; } }
            for (let c = 0; c < N; c++) { const { s, m } = colCounts(c); if (s > N / 2 || m > N / 2) { markColInvalid(c); ok = false; } }
            // 3) constraints
            for (const con of constraints) {
                const [ar, ac] = con.a; const [br, bc] = con.b;
                const va = board[ar][ac]; const vb = board[br][bc];
                if (va && vb) {
                    if (con.type === 'eq' && va !== vb) { markInvalid(ar, ac); markInvalid(br, bc); ok = false; }
                    if (con.type === 'neq' && va === vb) { markInvalid(ar, ac); markInvalid(br, bc); ok = false; }
                }
            }
            return ok;
        }

        function markInvalid(r, c) { const el = getCellEl(r, c); if (el) el.classList.add('invalid'); }
        function markRowInvalid(r) { for (let c = 0; c < N; c++) markInvalid(r, c); }
        function markColInvalid(c) { for (let r = 0; r < N; r++) markInvalid(r, c); }
        function getCellEl(r, c) { const idx = r * N + c; return boardEl.children[idx]; }

        function isComplete() {
            for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!board[r][c]) return false;
            return true;
        }

        function checkWin() {
            const valid = validate();
            if (!valid) { showModal('Some rules are broken. Keep refining.'); return; }
            // final equal counts
            for (let r = 0; r < N; r++) { const { s, m } = rowCounts(r); if (s !== N / 2 || m !== N / 2) { showModal('Rows must have equal suns and moons.'); return; } }
            for (let c = 0; c < N; c++) { const { s, m } = colCounts(c); if (s !== N / 2 || m !== N / 2) { showModal('Columns must have equal suns and moons.'); return; } }
            // constraints satisfied already by validate
            // Optional: accept any valid solution; we also know at least one exists (SOL)
            showModal('Perfect logic! Puzzle solved.');
            setTimeout(onWin, 400);
        }

        function giveHint() {
            // Simple hint: find a place where placing one symbol would violate the 3-in-a-row, so the opposite must be true
            for (let r = 0; r < N; r++) {
                for (let c = 0; c < N; c++) if (!board[r][c] && !locked[r][c]) {
                    // try SUN
                    const prev = board[r][c];
                    board[r][c] = SUN;
                    const sunBad = !validate();
                    board[r][c] = MOON;
                    const moonBad = !validate();
                    board[r][c] = prev;
                    if (sunBad && !moonBad) { board[r][c] = MOON; render(); return showModal('Hint: This cell must be a moon.'); }
                    if (!sunBad && moonBad) { board[r][c] = SUN; render(); return showModal('Hint: This cell must be a sun.'); }
                }
            }
            showModal('No direct deduction found. Try checking constraints or equal counts.');
        }

        function clearRowCol() {
            // Ask user which to clear via prompt (minimal UI)
            const what = prompt('Type rN to clear row N or cN to clear column N (1..6). Example: r3 or c5');
            if (!what) return;
            const m = what.trim().toLowerCase().match(/^([rc])(\d)$/);
            if (!m) { showModal('Invalid input. Use rN or cN.'); return; }
            const idx = Number(m[2]) - 1;
            if (m[1] === 'r') {
                for (let c = 0; c < N; c++) if (!locked[idx][c]) board[idx][c] = '';
            } else {
                for (let r = 0; r < N; r++) if (!locked[r][idx]) board[r][idx] = '';
            }
            render();
        }

        function restart() {
            board = Array.from({ length: N }, () => Array(N).fill(''));
            locked = Array.from({ length: N }, () => Array(N).fill(false));
            constraints.length = 0;
            seedPuzzle();
            render();
            validate();
        }

        // init
        seedPuzzle();
        render();
        validate();

        helpBtn.addEventListener('click', showHelp);
        checkBtn.addEventListener('click', () => { if (!isComplete()) showModal('Fill all cells first.'); else checkWin(); });
        hintBtn.addEventListener('click', giveHint);
        clearBtn.addEventListener('click', clearRowCol);
        restartBtn.addEventListener('click', restart);
    }

    // 7) Lights Out (Day 7)
    function lightsOutGame(root, onWin) {
        root.innerHTML = '';
        const SIZE = 5;
        let board = Array.from({ length: SIZE }, () => Array(SIZE).fill(false)); // false=off, true=on

        const wrap = document.createElement('div');
        wrap.className = 'lo-wrapper';
        wrap.innerHTML = `
            <h3>Lights Out</h3>
            <div class="lo-container">
              <aside class="lo-sidebar">
                <div class="lo-info">Tap a cell to toggle it and its neighbors. Turn all lights OFF.</div>
                <div class="lo-controls">
                    <button class="comic-btn-small" id="lo-help">How to play</button>
                                        <button class="comic-btn-small" id="lo-load">Restart puzzle</button>
                </div>
              </aside>
              <div class="lo-board" id="lo-board"></div>
            </div>
        `;
        root.appendChild(wrap);

        const boardEl = wrap.querySelector('#lo-board');
        const helpBtn = wrap.querySelector('#lo-help');
        const loadBtn = wrap.querySelector('#lo-load');

        function showHelp() {
            showModal(
                `Goal: Turn all lights OFF.

Rules:
- Tap a cell to toggle it and its up/down/left/right neighbors.
- Keep going until the entire board is dark.
`);
        }
        helpBtn.addEventListener('click', showHelp);

        function render() {
            boardEl.innerHTML = '';
            for (let r = 0; r < SIZE; r++) {
                for (let c = 0; c < SIZE; c++) {
                    const cell = document.createElement('div');
                    cell.className = 'lo-cell' + (board[r][c] ? ' on' : '');
                    cell.dataset.r = String(r);
                    cell.dataset.c = String(c);
                    cell.addEventListener('click', () => onCell(r, c));
                    boardEl.appendChild(cell);
                }
            }
        }

        function toggle(r, c) {
            if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return;
            board[r][c] = !board[r][c];
        }

        function onCell(r, c) {
            toggle(r, c);
            toggle(r - 1, c);
            toggle(r + 1, c);
            toggle(r, c - 1);
            toggle(r, c + 1);
            render();
            checkWin();
        }

        // Apply a move without re-render/check (useful for seeding)
        function applyMove(r, c) {
            toggle(r, c);
            toggle(r - 1, c);
            toggle(r + 1, c);
            toggle(r, c - 1);
            toggle(r, c + 1);
        }

        function allOff() { for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (board[r][c]) return false; return true; }

        function checkWin() {
            if (allOff()) {
                showModal('Lights out! Well done.');
                setTimeout(onWin, 400);
            }
        }

        function restart() {
            board = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
            render();
        }

        function loadFixedPuzzle() {
            // Start from all-off, then apply a fixed list of moves to create a known-solvable board
            restart();
            // Coordinates are 0-indexed: [row, col]
            const moves = [[0, 0], [0, 2], [1, 3], [2, 1], [3, 4], [4, 2]];
            moves.forEach(([r, c]) => applyMove(r, c));
            render();
        }

        loadBtn.addEventListener('click', loadFixedPuzzle);

        // init with a fixed puzzle instead of random
        loadFixedPuzzle();
    }

    // 8) Nonogram (Day 8) - 5x5
    function nonogramGame(root, onWin) {
        root.innerHTML = '';
        // pattern solution (1 = filled)
        const SOL = [
            [0, 1, 0, 1, 0],
            [1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1],
            [0, 1, 1, 1, 0],
            [0, 0, 1, 0, 0]
        ];
        const SIZE = 5;
        // Derive clues (arrays of run lengths)
        function cluesForLine(arr) {
            const runs = [];
            let count = 0;
            for (let i = 0; i < arr.length; i++) {
                if (arr[i]) count++; else if (count) { runs.push(count); count = 0; }
            }
            if (count) runs.push(count);
            return runs.length ? runs : [0];
        }
        const rowClues = SOL.map(row => cluesForLine(row));
        const colClues = [];
        for (let c = 0; c < SIZE; c++) {
            const col = SOL.map(r => r[c]);
            colClues.push(cluesForLine(col));
        }

        // Board states: 0=unknown, 1=filled, 2=marked X
        let board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

        const wrap = document.createElement('div');
        wrap.className = 'nonogram-wrapper';
        wrap.innerHTML = `
            <h3>Nonogram</h3>
            <div class="nonogram-container">
              <aside class="nonogram-sidebar">
                <div class="nonogram-info">Fill cells to reveal the secret. Use clues: numbers = blocks of filled squares in that order.</div>
                <div class="nonogram-controls">
                    <button class="comic-btn-small" id="ng-help">How to play</button>
                    <button class="comic-btn-small" id="ng-check">Check</button>
                    <button class="comic-btn-small" id="ng-clear">Clear board</button>
                </div>
              </aside>
              <div class="nonogram-grid-wrap">
                <div class="nonogram-col-clues" id="ng-col-clues"></div>
                <div class="nonogram-row">
                  <div class="nonogram-row-clues" id="ng-row-clues"></div>
                  <div class="nonogram-grid" id="ng-grid"></div>
                </div>
              </div>
            </div>
        `;
        root.appendChild(wrap);

        const gridEl = wrap.querySelector('#ng-grid');
        const rowCluesEl = wrap.querySelector('#ng-row-clues');
        const colCluesEl = wrap.querySelector('#ng-col-clues');
        const helpBtn = wrap.querySelector('#ng-help');
        const checkBtn = wrap.querySelector('#ng-check');
        const clearBtn = wrap.querySelector('#ng-clear');

        function renderClues() {
            rowCluesEl.innerHTML = '';
            rowClues.forEach(rc => {
                const div = document.createElement('div');
                div.className = 'ng-row-clue';
                div.textContent = rc.join(' ');
                rowCluesEl.appendChild(div);
            });
            colCluesEl.innerHTML = '';
            colClues.forEach(cc => {
                const div = document.createElement('div');
                div.className = 'ng-col-clue';
                div.textContent = cc.join('\n');
                colCluesEl.appendChild(div);
            });
        }

        function renderGrid() {
            gridEl.innerHTML = '';
            for (let r = 0; r < SIZE; r++) {
                for (let c = 0; c < SIZE; c++) {
                    const cell = document.createElement('div');
                    let cls = 'nonogram-cell';
                    if (board[r][c] === 1) cls += ' filled';
                    else if (board[r][c] === 2) cls += ' marked';
                    cell.className = cls;
                    cell.dataset.r = String(r); cell.dataset.c = String(c);
                    cell.addEventListener('click', () => toggle(r, c));
                    gridEl.appendChild(cell);
                }
            }
        }

        function toggle(r, c) {
            board[r][c] = (board[r][c] + 1) % 3; // cycle 0->1->2->0
            renderGrid();
        }

        function showHelp() {
            showModal(`Nonogram basics:\nNumbers on rows/columns show lengths of consecutive FILLED cells in order.\nClick to cycle: empty → filled → X mark.\nGoal: Match clues to reveal the secret.`);
        }

        function isSolved() {
            for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
                const should = SOL[r][c];
                if (should === 1 && board[r][c] !== 1) return false;
                if (should === 0 && board[r][c] === 1) return false;
            }
            return true;
        }

        function check() {
            if (isSolved()) { showModal('Heart complete! ❤️'); setTimeout(onWin, 400); return; }
            // Provide minimal feedback: highlight incorrect filled cells
            Array.from(gridEl.children).forEach(cell => cell.classList.remove('wrong'));
            for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (board[r][c] === 1 && SOL[r][c] === 0) {
                const idx = r * SIZE + c; gridEl.children[idx].classList.add('wrong');
            }
            showModal('Not solved yet. Incorrect filled cells highlighted.');
        }

        function clearBoard() {
            board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
            renderGrid();
        }

        // init
        renderClues();
        renderGrid();
        helpBtn.addEventListener('click', showHelp);
        checkBtn.addEventListener('click', check);
        clearBtn.addEventListener('click', clearBoard);
    }

    // 9) Memory Match (Day 9)
    function memoryMatchGame(root, onWin) {
        root.innerHTML = '';
        const ROWS = 4, COLS = 5; // 20 cards, 10 pairs
        const PAIRS = (ROWS * COLS) / 2;
        // 5 emojis + 5 image icons (10 pairs total)
        const EMOJIS = ['🎄', '🍪', '⭐', '⛄', '❄️'];
        const ICONS = [
            'images/icon1.png',
            'images/icon2.png',
            'images/icon3.png',
            'images/icon4.png',
            'images/icon5.png'
        ];
        const ITEMS = [
            ...EMOJIS.map(e => ({ type: 'emoji', value: e })),
            ...ICONS.map(src => ({ type: 'icon', value: src }))
        ];
        const bestKey = 'day9_memory_best_moves';
        let deck = [];
        let first = null; // {idx, symbol}
        let lock = false;
        let moves = 0;
        let matched = 0;
        let best = Number(localStorage.getItem(bestKey)) || null;

        const wrap = document.createElement('div');
        wrap.className = 'mm-wrapper';
        wrap.innerHTML = `
            <h3>Memory Match</h3>
            <div class="mm-container">
              <aside class="mm-sidebar">
                <div class="mm-info">Match all festive pairs. Fewer moves = better! Tap cards to reveal.</div>
                <div class="mm-stats">Moves: <span id="mm-moves">0</span> | Best: <span id="mm-best">${best ?? '—'}</span></div>
                <div class="mm-controls">
                    <button class="comic-btn-small" id="mm-help">How to play</button>
                    <button class="comic-btn-small" id="mm-restart">Restart</button>
                </div>
              </aside>
              <div class="mm-grid" id="mm-grid" style="grid-template-columns: repeat(${COLS}, 100px); grid-template-rows: repeat(${ROWS}, 120px);"></div>
            </div>
        `;
        root.appendChild(wrap);

        const gridEl = wrap.querySelector('#mm-grid');
        const movesEl = wrap.querySelector('#mm-moves');
        const bestEl = wrap.querySelector('#mm-best');
        const restartBtn = wrap.querySelector('#mm-restart');
        const helpBtn = wrap.querySelector('#mm-help');

        function buildDeck() {
            deck = [];
            const doubled = ITEMS.concat(ITEMS);
            for (let i = doubled.length - 1; i >= 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [doubled[i], doubled[j]] = [doubled[j], doubled[i]];
            }
            doubled.forEach(item => deck.push({ item, state: 0 }));
        }

        function render() {
            gridEl.innerHTML = '';
            deck.forEach((card, idx) => {
                const d = document.createElement('div');
                d.className = 'mm-card ' + (card.state === 2 ? 'matched' : card.state === 1 ? 'flipped' : '');
                d.dataset.idx = String(idx);
                const backContent = card.item.type === 'emoji'
                    ? card.item.value
                    : `<img src="${card.item.value}" alt="icon" class="mm-img" onerror="this.style.visibility='hidden'" />`;
                d.innerHTML = `
                                    <div class="mm-inner">
                                        <div class="mm-front"></div>
                                        <div class="mm-back">${backContent}</div>
                                    </div>
                                `;
                d.addEventListener('click', () => onFlip(idx));
                gridEl.appendChild(d);
            });
        }

        function onFlip(idx) {
            if (lock) return;
            const card = deck[idx];
            if (card.state !== 0) return;
            // reveal
            card.state = 1;
            render();
            if (!first) {
                first = { idx, key: card.item.value };
                return;
            }
            // second card
            moves++;
            movesEl.textContent = String(moves);
            if (card.item.value === first.key) {
                // match
                card.state = 2;
                deck[first.idx].state = 2;
                matched++;
                first = null;
                render();
                checkWin();
            } else {
                lock = true;
                setTimeout(() => {
                    card.state = 0;
                    deck[first.idx].state = 0;
                    first = null;
                    lock = false;
                    render();
                }, 850);
            }
        }

        function checkWin() {
            if (matched >= PAIRS) {
                if (!best || moves < best) {
                    best = moves;
                    localStorage.setItem(bestKey, String(best));
                    bestEl.textContent = String(best);
                }
                showModal(`All pairs found in ${moves} moves!`);
                setTimeout(onWin, 500);
            }
        }

        function restart() {
            first = null; lock = false; moves = 0; matched = 0;
            movesEl.textContent = '0';
            buildDeck();
            render();
        }

        function showHelp() {
            showModal(`Goal: Match all pairs.\n\nClick a card to reveal, then find its twin.\nIf they differ they flip back after a short delay.\nFinish with the fewest moves for a better score.`);
        }

        // init
        buildDeck();
        render();
        restartBtn.addEventListener('click', restart);
        helpBtn.addEventListener('click', showHelp);
    }

    // 10) Flood Fill (Day 10)
    function floodFillGame(root, onWin) {
        root.innerHTML = '';
        const SIZE = 10;
        const COLORS = ['#e63946', '#2a9d8f', '#457b9d', '#f4a261', '#8d5bd6']; // red, green, blue, orange, purple
        const MOVES_LIMIT = 14;

        let board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
        let moves = 0;

        const wrap = document.createElement('div');
        wrap.className = 'ff-wrapper';
        wrap.innerHTML = `
            <h3>Flood Fill</h3>
            <div class="ff-container">
              <aside class="ff-sidebar">
                <div class="ff-info">Start at the top-left. Pick colors to flood and spread until the whole board is one color.</div>
                <div class="ff-stats">Moves: <span id="ff-moves">0</span>/<span id="ff-limit">${MOVES_LIMIT}</span></div>
                <div class="ff-palette" id="ff-palette"></div>
                <div class="ff-controls">
                    <button class="comic-btn-small" id="ff-help">How to play</button>
                    <button class="comic-btn-small" id="ff-restart">Restart</button>
                </div>
              </aside>
              <div class="ff-board" id="ff-board" style="grid-template-columns: repeat(${SIZE}, 28px); grid-template-rows: repeat(${SIZE}, 28px);"></div>
            </div>
        `;
        root.appendChild(wrap);

        const boardEl = wrap.querySelector('#ff-board');
        const paletteEl = wrap.querySelector('#ff-palette');
        const movesEl = wrap.querySelector('#ff-moves');
        const helpBtn = wrap.querySelector('#ff-help');
        const restartBtn = wrap.querySelector('#ff-restart');

        function rnd(max) { return Math.floor(Math.random() * max); }

        function buildBoard() {
            for (let r = 0; r < SIZE; r++) {
                for (let c = 0; c < SIZE; c++) {
                    board[r][c] = rnd(COLORS.length);
                }
            }
            // Nudge to avoid trivial all-same
            if (isComplete()) board[SIZE - 1][SIZE - 1] = (board[0][0] + 1) % COLORS.length;
        }

        function renderBoard() {
            boardEl.innerHTML = '';
            for (let r = 0; r < SIZE; r++) {
                for (let c = 0; c < SIZE; c++) {
                    const cell = document.createElement('div');
                    cell.className = 'ff-cell';
                    cell.style.background = COLORS[board[r][c]];
                    boardEl.appendChild(cell);
                }
            }
        }

        function renderPalette() {
            paletteEl.innerHTML = '';
            for (let i = 0; i < COLORS.length; i++) {
                const btn = document.createElement('button');
                btn.className = 'ff-color-btn';
                btn.style.background = COLORS[i];
                btn.title = `Pick color ${i + 1}`;
                btn.addEventListener('click', () => pick(i));
                paletteEl.appendChild(btn);
            }
        }

        function flood(targetColor) {
            const startColor = board[0][0];
            if (targetColor === startColor) return false;
            const q = [[0, 0]];
            const seen = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
            seen[0][0] = true;
            while (q.length) {
                const [r, c] = q.shift();
                board[r][c] = targetColor;
                const nbrs = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
                for (const [nr, nc] of nbrs) {
                    if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !seen[nr][nc] && board[nr][nc] === startColor) {
                        seen[nr][nc] = true;
                        q.push([nr, nc]);
                    }
                }
            }
            // Expand to newly adjacent regions of same color as the new start color
            // Second BFS to catch chained regions (optional but ensures continuous fill)
            const newColor = targetColor;
            const q2 = [[0, 0]];
            const seen2 = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
            seen2[0][0] = true;
            while (q2.length) {
                const [r, c] = q2.shift();
                const nbrs = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
                for (const [nr, nc] of nbrs) {
                    if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !seen2[nr][nc] && board[nr][nc] === newColor) {
                        seen2[nr][nc] = true;
                        q2.push([nr, nc]);
                    }
                }
            }
            return true;
        }

        function isComplete() {
            const v = board[0][0];
            for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (board[r][c] !== v) return false;
            return true;
        }

        function pick(colorIdx) {
            const changed = flood(colorIdx);
            if (!changed) return;
            moves += 1;
            movesEl.textContent = String(moves);
            renderBoard();
            if (isComplete()) {
                showModal('All filled — festive splash!');
                setTimeout(onWin, 400);
                return;
            }
            if (moves >= MOVES_LIMIT) {
                showModal('Out of moves! Try a different color order.');
            }
        }

        function restart() {
            moves = 0;
            movesEl.textContent = '0';
            buildBoard();
            renderBoard();
        }

        function showHelp() {
            showModal(`Goal: Make the entire board one color within ${MOVES_LIMIT} moves.\n\nRules:\n- The flood starts at the top-left cell.\n- Picking a color changes the contiguous region connected to the top-left.\n- Chain picks to grow the region until everything matches.`);
        }

        // init
        buildBoard();
        renderBoard();
        renderPalette();
        helpBtn.addEventListener('click', showHelp);
        restartBtn.addEventListener('click', restart);
    }

    // 11) Flappy Bird Xmas (Day 11)
    function flappyBirdGame(root, onWin) {
        root.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = 'fb-wrapper';
        wrap.innerHTML = `
                        <h3>Flappy Santa</h3>
                        <div class="fb-container">
                            <aside class="fb-sidebar">
                                <div class="fb-score">Score: <span id="fb-score">0</span> / 30</div>
                                <button class="comic-btn-small" id="fb-restart">Restart</button>
                                <button class="comic-btn-small" id="fb-help">Help</button>
                                <div class="fb-hint">Tap / Space to flap. Reach 30.</div>
                            </aside>
                            <canvas id="fb-canvas" width="300" height="420"></canvas>
                        </div>
                `;
        root.appendChild(wrap);

        const canvas = wrap.querySelector('#fb-canvas');
        const ctx = canvas.getContext('2d');
        const scoreEl = wrap.querySelector('#fb-score');
        const restartBtn = wrap.querySelector('#fb-restart');
        const helpBtn = wrap.querySelector('#fb-help');
        // Load bird image
        const birdImg = new Image();
        birdImg.src = 'images/pic2.svg';
        let birdImgReady = false;
        birdImg.onload = () => { birdImgReady = true; };
        birdImg.onerror = () => { birdImgReady = false; };

        // Game constants
        const GRAVITY = 0.34;
        const FLAP_VELOCITY = -6.0;
        const PIPE_INTERVAL = 3000; // ms (spawn cadence)
        const INITIAL_PIPE_SPEED = 2.6; // base horizontal pipe speed
        let currentPipeSpeed = INITIAL_PIPE_SPEED; // dynamic speed
        const GAP_MIN = 110;
        const GAP_MAX = 140;
        const TOP_MARGIN = 30;
        const BIRD_RADIUS = 14;
        const TARGET_SCORE = 30;

        // State
        let birdY = canvas.height / 2;
        let birdV = 0;
        let pipes = []; // each pipe: { x, gapY, gapH, scored }
        let lastPipeTime = 0;
        let running = true;
        let score = 0;
        let frameReq = null;
        let lastTs = performance.now();
        let gameOver = false;

        function randGapY(gapH) {
            // ensure gap fits
            const minY = TOP_MARGIN;
            const maxY = canvas.height - TOP_MARGIN - gapH;
            return Math.floor(minY + Math.random() * (maxY - minY));
        }

        function spawnPipe(ts) {
            const gapH = GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN);
            pipes.push({ x: canvas.width + 40, gapY: randGapY(gapH), gapH, scored: false });
            lastPipeTime = ts;
        }

        function resetGame() {
            birdY = canvas.height / 2;
            birdV = 0;
            pipes = [];
            lastPipeTime = 0;
            running = true;
            score = 0;
            gameOver = false;
            scoreEl.textContent = '0';
            if (frameReq) cancelAnimationFrame(frameReq);
            lastTs = performance.now();
            currentPipeSpeed = INITIAL_PIPE_SPEED; // reset dynamic speed
            frameReq = requestAnimationFrame(loop);
        }

        function flap() {
            if (!running) return;
            birdV = FLAP_VELOCITY;
        }

        function showHelp() {
            showModal(`Goal: Reach score ${TARGET_SCORE}.\n\nControls:\n- Click / tap / space to flap upward.\n- Avoid snowy pipes.\nScore increases after passing a pipe. Good luck, Santa!`);
        }

        function collidePipe(pipe) {
            const birdX = 100; // fixed horizontal position
            // Pipe rectangles: top: (pipe.x,0, pipeWidth, gapY), bottom: (pipe.x, gapY+gapH, pipeWidth, canvas.height - (gapY+gapH))
            const pipeW = 70;
            // Bird bounding box approximation
            const bx1 = birdX - BIRD_RADIUS + 4;
            const bx2 = birdX + BIRD_RADIUS - 4;
            const by1 = birdY - BIRD_RADIUS + 4;
            const by2 = birdY + BIRD_RADIUS - 4;
            // Collision if within pipe x span and outside gap vertical span
            if (bx2 >= pipe.x && bx1 <= pipe.x + pipeW) {
                if (by1 < pipe.gapY || by2 > pipe.gapY + pipe.gapH) return true;
            }
            return false;
        }

        function loop(ts) {
            frameReq = requestAnimationFrame(loop);
            const dt = ts - lastTs;
            lastTs = ts;
            if (!running) return;

            // Spawn pipes
            if (ts - lastPipeTime > PIPE_INTERVAL) spawnPipe(ts);

            // Physics
            birdV += GRAVITY;
            birdY += birdV;

            // Boundaries
            if (birdY < BIRD_RADIUS) { birdY = BIRD_RADIUS; birdV = 0; }
            if (birdY > canvas.height - BIRD_RADIUS) { endGame(false); }

            // Move pipes with dynamic speed
            pipes.forEach(p => p.x -= currentPipeSpeed);
            // Remove offscreen
            pipes = pipes.filter(p => p.x > -120);

            // Check collisions & scoring
            for (const p of pipes) {
                if (collidePipe(p)) { endGame(false); break; }
                const birdX = 100;
                if (!p.scored && p.x + 70 < birdX) {
                    p.scored = true;
                    score += 1;
                    scoreEl.textContent = String(score);
                    // Increase pipe speed modestly every 5 points before final target
                    if (score % 5 === 0 && score < TARGET_SCORE) {
                        currentPipeSpeed += 0.35;
                    }
                    if (score >= TARGET_SCORE) { endGame(true); break; }
                }
            }

            draw();
        }

        function endGame(won) {
            if (gameOver) return;
            gameOver = true;
            running = false;
            if (won) {
                showModal('Sleigh ride success!');
                setTimeout(onWin, 400);
            } else {
                showModal('Crash! Try again.');
            }
        }

        function drawBackground() {
            ctx.fillStyle = '#dff3ff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Snow ground
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
            // Decorative faint snowflakes
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            for (let i = 0; i < 25; i++) {
                const x = (i * 37 + (lastTs * 0.05) % 400) % 400;
                const y = (i * 53) % 560;
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        function drawBird() {
            const birdX = 100;
            ctx.save();
            ctx.translate(birdX, birdY);
            // Draw image if ready; fallback to circle
            if (birdImgReady) {
                const w = BIRD_RADIUS * 2.2;
                const h = BIRD_RADIUS * 2.2;
                ctx.drawImage(birdImg, -w / 2, -h / 2, w, h);
            } else {
                ctx.fillStyle = '#ff3131';
                ctx.beginPath();
                ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        function drawPipes() {
            ctx.fillStyle = '#2d6a4f';
            pipes.forEach(p => {
                const pipeW = 70;
                // top pipe
                ctx.fillRect(p.x, 0, pipeW, p.gapY);
                // bottom pipe
                ctx.fillRect(p.x, p.gapY + p.gapH, pipeW, canvas.height - (p.gapY + p.gapH));
                // snow cap
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(p.x, p.gapY - 6, pipeW, 6);
                ctx.fillRect(p.x, p.gapY + p.gapH, pipeW, 6);
                ctx.fillStyle = '#2d6a4f';
            });
        }

        function draw() {
            drawBackground();
            drawPipes();
            drawBird();
            if (gameOver) {
                ctx.fillStyle = 'rgba(0,0,0,0.35)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#fff';
                ctx.font = '24px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(score >= TARGET_SCORE ? 'You Win!' : 'Game Over', canvas.width / 2, canvas.height / 2 - 8);
                ctx.font = '14px sans-serif';
                ctx.fillText('Press Restart', canvas.width / 2, canvas.height / 2 + 18);
            }
        }

        // Input handlers
        function keyHandler(e) {
            if (e.code === 'Space') { e.preventDefault(); flap(); }
        }
        function clickHandler() { flap(); }

        restartBtn.addEventListener('click', resetGame);
        helpBtn.addEventListener('click', showHelp);
        window.addEventListener('keydown', keyHandler);
        canvas.addEventListener('mousedown', clickHandler);
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); flap(); }, { passive: false });

        // Cleanup when overlay closes
        const observer = new MutationObserver(() => {
            if (document.getElementById('game-overlay').classList.contains('hidden')) {
                running = false;
                if (frameReq) cancelAnimationFrame(frameReq);
                window.removeEventListener('keydown', keyHandler);
                canvas.removeEventListener('mousedown', clickHandler);
                observer.disconnect();
            }
        });
        observer.observe(document.getElementById('game-overlay'), { attributes: true, attributeFilter: ['class'] });

        // Start
        resetGame();
    }

    // 12) Snow Queens (Day 12)
    function snowQueensGame(root, onWin) {
        root.innerHTML = '';
        const N = 9; // 9x9 grid with 9 regions
        const EMPTY = 0, MARK = 1, QUEEN = 2;
        let board = Array.from({ length: N }, () => Array(N).fill(EMPTY));
        const regions = [
            [2, 0, 0, 0, 0, 0, 1, 1, 1],
            [2, 2, 3, 3, 3, 0, 4, 4, 1],
            [2, 3, 3, 3, 3, 5, 4, 4, 1],
            [2, 3, 3, 3, 5, 5, 5, 1, 1],
            [2, 3, 3, 6, 6, 5, 1, 1, 1],
            [3, 3, 7, 6, 6, 1, 1, 1, 1],
            [3, 7, 7, 7, 1, 1, 1, 1, 1],
            [8, 8, 7, 1, 1, 1, 1, 1, 1],
            [8, 8, 1, 1, 1, 1, 1, 1, 1]
        ];
        // Simple palette and controls
        const wrap = document.createElement('div');
        wrap.className = 'sq-wrapper';
        wrap.innerHTML = `
            <h3>Snow Queens</h3>
            <div class="sq-container">
              <aside class="sq-sidebar">
                <div class="sq-info">Place 7 queens: one per row, column, and colored region. No touching (including diagonals).</div>
                <div class="sq-controls">
                    <button class="comic-btn-small" id="sq-check">Check</button>
                    <button class="comic-btn-small" id="sq-reset">Reset</button>
                    <button class="comic-btn-small" id="sq-help">How to play</button>
                </div>
              </aside>
              <div class="sq-board" id="sq-board"></div>
            </div>
        `;
        root.appendChild(wrap);

        const boardEl = wrap.querySelector('#sq-board');
        const checkBtn = wrap.querySelector('#sq-check');
        const resetBtn = wrap.querySelector('#sq-reset');
        const helpBtn = wrap.querySelector('#sq-help');

        function showHelp() {
            showModal(`Goal: Place ${N} queens.\nRules:\n- Exactly one per row, column, and colored region.\n- No two queens adjacent (including diagonals).\nControls: Tap a cell to cycle: Empty → X → Queen.`);
        }

        function render() {
            boardEl.innerHTML = '';
            for (let r = 0; r < N; r++) {
                for (let c = 0; c < N; c++) {
                    const cell = document.createElement('div');
                    cell.className = `sq-cell region-${regions[r][c]}`;
                    cell.dataset.r = String(r);
                    cell.dataset.c = String(c);
                    const v = board[r][c];
                    cell.textContent = v === QUEEN ? '👑' : (v === MARK ? '✕' : '');
                    cell.addEventListener('click', () => onCell(r, c));
                    boardEl.appendChild(cell);
                }
            }
        }

        function inBounds(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }

        function onCell(r, c) {
            const cur = board[r][c];
            const next = (cur + 1) % 3; // EMPTY->MARK->QUEEN->EMPTY
            board[r][c] = next;
            render();
            validate(true);
        }

        function rowQueenCount(r) { let t = 0; for (let c = 0; c < N; c++) if (board[r][c] === QUEEN) t++; return t; }
        function colQueenCount(c) { let t = 0; for (let r = 0; r < N; r++) if (board[r][c] === QUEEN) t++; return t; }
        function regionQueenCount(id) { let t = 0; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (regions[r][c] === id && board[r][c] === QUEEN) t++; return t; }

        function clearInvalidHighlights() {
            Array.from(boardEl.children).forEach(el => el.classList.remove('invalid'));
        }
        function markInvalid(r, c) { const idx = r * N + c; const el = boardEl.children[idx]; if (el) el.classList.add('invalid'); }

        function validate(live = false) {
            clearInvalidHighlights();
            let ok = true;
            // No adjacent queens
            for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (board[r][c] === QUEEN) {
                const dirs = [
                    [-1, -1], [-1, 0], [-1, 1],
                    [0, -1], [0, 1],
                    [1, -1], [1, 0], [1, 1]
                ];
                for (const [dr, dc] of dirs) {
                    const nr = r + dr, nc = c + dc;
                    if (inBounds(nr, nc) && board[nr][nc] === QUEEN) { ok = false; markInvalid(r, c); markInvalid(nr, nc); }
                }
            }
            // Row/Col must have at most one queen live; exactly one upon final check
            for (let r = 0; r < N; r++) { const cnt = rowQueenCount(r); if (cnt > 1) { ok = false; for (let c = 0; c < N; c++) if (board[r][c] === QUEEN) markInvalid(r, c); } }
            for (let c = 0; c < N; c++) { const cnt = colQueenCount(c); if (cnt > 1) { ok = false; for (let r = 0; r < N; r++) if (board[r][c] === QUEEN) markInvalid(r, c); } }
            // Region at most one live; exactly one on final
            for (let id = 0; id < N; id++) { const cnt = regionQueenCount(id); if (cnt > 1) { ok = false; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (regions[r][c] === id && board[r][c] === QUEEN) markInvalid(r, c); } }
            if (!live) {
                // Final exact one per row/col/region
                for (let r = 0; r < N; r++) if (rowQueenCount(r) !== 1) ok = false;
                for (let c = 0; c < N; c++) if (colQueenCount(c) !== 1) ok = false;
                for (let id = 0; id < N; id++) if (regionQueenCount(id) !== 1) ok = false;
            }
            return ok;
        }

        function isComplete() { let q = 0; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (board[r][c] === QUEEN) q++; return q === N; }

        function checkWin() {
            if (!isComplete()) { showModal('Place exactly one queen in each row, column, and region.'); return; }
            if (validate(false)) { showModal('Regal logic! Puzzle solved.'); setTimeout(onWin, 400); }
            else { showModal('Conflicts remain. Check rows, columns, regions, and adjacencies.'); }
        }

        function resetBoard() { board = Array.from({ length: N }, () => Array(N).fill(EMPTY)); render(); clearInvalidHighlights(); }

        // init
        render();
        helpBtn.addEventListener('click', showHelp);
        resetBtn.addEventListener('click', resetBoard);
        checkBtn.addEventListener('click', checkWin);
    }

    // 13) Futoshiki (Day 13)
    function futoshikiGame(root, onWin) {
        root.innerHTML = '';
        const N = 7; // 7x7 Futoshiki
        // Predefined full solution from your screenshot
        const SOL = [
            [7,4,2,6,1,3,5],
            [1,2,5,4,3,6,7],
            [3,1,4,2,7,5,6],
            [6,3,1,5,4,7,2],
            [2,5,7,3,6,4,1],
            [4,7,6,1,5,2,3],
            [5,6,3,7,2,1,4],
        ];
        // Inequalities inferred from the arrows in your layout (right and down only)
        // Format: [r,c,dr,dc,op] where op is '<' meaning (r,c) < (r+dr,c+dc), or '>' meaning (r,c) > (r+dr,c+dc)
        const INEQ = [
            // Right arrows '>'
            [0,0,0,1,'>'], // after c1r1
            [0,1,0,1,'>'], // after c2r1
            [2,2,0,1,'>'], // after c3r3
            [6,1,0,1,'>'], // after c2r7
            // Right arrows '<'
            [0,4,0,1,'<'], // after c5r1
            [0,5,0,1,'<'], // after c6r1
            [1,0,0,1,'<'], // after c1r2
            [1,1,0,1,'<'], // after c2r2
            [1,5,0,1,'<'], // after c6r2
            [4,0,0,1,'<'], // after c1r5
            // Down arrows '˅' (op '<')
            [1,3,1,0,'<'], // under c4r2
            [3,3,1,0,'<'], // under c4r4
            [4,3,1,0,'<'], // under c4r5
            [2,4,1,0,'<'], // under c5r3
            [4,5,1,0,'<'], // under c6r5
            [5,5,1,0,'<'], // under c6r6
            // Up arrows '˄' (op '>') placed under cell (between it and below)
            [3,2,1,0,'>'], // under c3r4
            [5,6,1,0,'>'], // under c7r6
        ];
        // Givens inferred from the base screenshot (visible numbers)
        const GIVENS = [
            [0,3,6],
            // removed c3r2 (was [1,2,5])
            [2,5,5],
            [4,1,5], [4,3,3],
            // removed c2r7 (was [6,1,6])
            // updated: add c3r7 and c6r5
            [6,2,3], // c3r7
            [4,5,4]  // c6r5
        ];

        let board = Array.from({length:N}, ()=>Array(N).fill(0));
        for (const [r,c,v] of GIVENS) board[r][c]=v;

        const wrap = document.createElement('div');
        wrap.className = 'fu-wrapper';
        wrap.innerHTML = `
            <h3>Futoshiki</h3>
            <div class="fu-container">
              <aside class="fu-sidebar">
                <div class="fu-info">Fill ${N}×${N} with digits 1–${N}. No repeats in any row or column. Respect all < and > between neighboring cells.</div>
                <div class="fu-controls">
                    <button class="comic-btn-small" id="fu-check">Check</button>
                    <button class="comic-btn-small" id="fu-reset">Reset</button>
                    <button class="comic-btn-small" id="fu-help">How to play</button>
                </div>
              </aside>
              <div class="fu-board" id="fu-board"></div>
            </div>
        `;
        root.appendChild(wrap);

        const boardEl = wrap.querySelector('#fu-board');
        const checkBtn = wrap.querySelector('#fu-check');
        const resetBtn = wrap.querySelector('#fu-reset');
        const helpBtn = wrap.querySelector('#fu-help');

        function showHelp(){
            showModal(`Goal: Complete the grid with digits 1–${N}.\nRules:\n- No repeats in any row or column.\n- Inequalities between adjacent cells must hold (A < B or A > B).\nControls:\n- Click a cell to cycle 0→1→…→${N}. Given cells are fixed.`);
        }

        function isGiven(r,c){ return GIVENS.some(g=>g[0]===r && g[1]===c); }

        function render(){
            boardEl.innerHTML = '';
            for (let r=0;r<N;r++){
                for (let c=0;c<N;c++){
                    const cell=document.createElement('div');
                    cell.className='fu-cell';
                    if (isGiven(r,c)) cell.classList.add('given');
                    cell.dataset.r=String(r); cell.dataset.c=String(c);
                    cell.textContent = board[r][c] ? String(board[r][c]) : '';
                    cell.addEventListener('click', ()=>{
                        if (isGiven(r,c)) return;
                        board[r][c] = (board[r][c] % N) + 1; // cycle 1..N
                        render();
                        validate(true);
                    });
                    boardEl.appendChild(cell);
                    // Draw right inequality if exists
                    const right = INEQ.find(q=>q[0]===r && q[1]===c && q[2]===0 && q[3]===1);
                    if (right){
                        const arrow=document.createElement('div');
                        arrow.className='fu-ineq hor';
                        arrow.textContent = right[4]==='<' ? '‹' : '›';
                        boardEl.appendChild(arrow);
                    } else {
                        const spacer=document.createElement('div'); spacer.className='fu-spacer hor'; boardEl.appendChild(spacer);
                    }
                }
                // Row break: below inequalities
                for (let c=0;c<N;c++){
                    const down = INEQ.find(q=>q[0]===r && q[1]===c && q[2]===1 && q[3]===0);
                    const el=document.createElement('div');
                    el.className='fu-ineq ver';
                    if (down){ el.textContent = down[4]==='<' ? '˅' : '˄'; }
                    else { el.classList.add('spacer'); el.textContent=''; }
                    boardEl.appendChild(el);
                    // add spacer after each vertical indicator to align grid
                    const spacer=document.createElement('div'); spacer.className='fu-spacer ver'; boardEl.appendChild(spacer);
                }
            }
        }

        function clearInvalid(){ Array.from(boardEl.querySelectorAll('.fu-cell')).forEach(el=>el.classList.remove('invalid')); }
        function markInvalid(r,c){ const idx = r*(N*2) + c*2; const cell = boardEl.children[idx]; if(cell) cell.classList.add('invalid'); }

        function validate(live=false){
            clearInvalid();
            let ok=true;
            // Row/Col no repeats (excluding zeros when live)
            for (let r=0;r<N;r++){
                const seen={};
                for (let c=0;c<N;c++){
                    const v=board[r][c];
                    if (v===0 && live) continue;
                    if (v<1||v>N){ ok=false; markInvalid(r,c); }
                    if (v){ if(seen[v]){ ok=false; markInvalid(r,c); markInvalid(r,seen[v]-1); } else { seen[v]=c+1; } }
                }
            }
            for (let c=0;c<N;c++){
                const seen={};
                for (let r=0;r<N;r++){
                    const v=board[r][c];
                    if (v===0 && live) continue;
                    if (v<1||v>N){ ok=false; markInvalid(r,c); }
                    if (v){ if(seen[v]){ ok=false; markInvalid(r,c); markInvalid(seen[v]-1,c); } else { seen[v]=r+1; } }
                }
            }
            // Inequalities
            for (const [r,c,dr,dc,op] of INEQ){
                const a=board[r][c]; const b=board[r+dr][c+dc];
                if (a && b){
                    if (op==='<' && !(a<b)){ ok=false; markInvalid(r,c); markInvalid(r+dr,c+dc); }
                    if (op==='>' && !(a>b)){ ok=false; markInvalid(r,c); markInvalid(r+dr,c+dc); }
                }
            }
            if (!live){
                // Must match full solution to pass (predefined)
                for (let r=0;r<N;r++) for (let c=0;c<N;c++) if (board[r][c]!==SOL[r][c]) ok=false;
            }
            return ok;
        }

        function isComplete(){ for (let r=0;r<N;r++) for(let c=0;c<N;c++) if(!board[r][c]) return false; return true; }
        function checkWin(){
            if (!isComplete()){ showModal('Fill all cells with digits 1–7.'); return; }
            if (validate(false)){ showModal('Futoshiki solved!'); setTimeout(onWin, 400); }
            else { showModal('Some rules are broken. Check rows, columns, and inequalities.'); }
        }
        function reset(){ board = Array.from({length:N}, ()=>Array(N).fill(0)); for (const [r,c,v] of GIVENS) board[r][c]=v; render(); clearInvalid(); }

        render();
        helpBtn.addEventListener('click', showHelp);
        resetBtn.addEventListener('click', reset);
        checkBtn.addEventListener('click', checkWin);
    }

    // 4) Minesweeper (Day 4)
    function minesweeperGame(root, onWin) {
        root.innerHTML = '';
        const ROWS = 12, COLS = 12, MINES = 25; // somewhat hard
        let firstClick = true;
        let board = []; // {mine, revealed, flagged, count}
        let flagsLeft = MINES;
        let revealedSafe = 0;
        const totalSafe = ROWS * COLS - MINES;
        let timerId = null;
        let startTime = null;
        let gameOver = false;
        let flagMode = false; // mobile support

        const wrap = document.createElement('div');
        wrap.className = 'ms-wrapper';
        wrap.innerHTML = `
            <h3>Minesweeper</h3>
            <div class="ms-container">
                            <aside class="ms-sidebar">
                <div class="ms-topbar">
                    <span>Mines: <span id="ms-flags">${flagsLeft}</span></span>
                    <span>Time: <span id="ms-time">0</span>s</span>
                </div>
                <div class="ms-controls">
                                        <button class="comic-btn-small btn-restart" id="ms-restart">Restart</button>
                                        <button class="comic-btn-small ms-btn-toggle btn-flag" id="ms-flagmode">Flag mode: OFF</button>
                                        <button class="comic-btn-small btn-help" id="ms-help">How to play</button>
                </div>
              </aside>
              <div class="ms-board" id="ms-board" style="grid-template-columns: repeat(${COLS}, 32px); grid-template-rows: repeat(${ROWS}, 32px);"></div>
            </div>
        `;
        root.appendChild(wrap);

        const boardEl = wrap.querySelector('#ms-board');
        const flagsEl = wrap.querySelector('#ms-flags');
        const timeEl = wrap.querySelector('#ms-time');
        const restartBtn = wrap.querySelector('#ms-restart');
        const flagBtn = wrap.querySelector('#ms-flagmode');
        const helpBtn = wrap.querySelector('#ms-help');

        function showHelp() {
            showModal(
                `Goal: Reveal all safe tiles without hitting a mine.

Controls:
- Click: reveal a tile
- Flag on mode to place/remove a flag

Tips:
- Numbers show how many mines are adjacent.
- First click is always safe.
- Win by revealing all non‑mine tiles.`
            );
        }

        helpBtn.addEventListener('click', showHelp);

        function startTimer() {
            if (timerId) return;
            startTime = performance.now();
            timerId = setInterval(() => {
                const secs = Math.floor((performance.now() - startTime) / 1000);
                timeEl.textContent = String(secs);
            }, 500);
        }

        function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }

        function idx(r, c) { return r * COLS + c; }
        function inBounds(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }
        function neighbors(r, c) {
            const res = [];
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const nr = r + dr, nc = c + dc;
                    if (inBounds(nr, nc)) res.push([nr, nc]);
                }
            }
            return res;
        }

        function buildEmptyBoard() {
            board = new Array(ROWS * COLS).fill(null).map(() => ({ mine: false, revealed: false, flagged: false, count: 0 }));
            boardEl.innerHTML = '';
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const cell = document.createElement('div');
                    cell.className = 'ms-cell';
                    cell.dataset.r = r;
                    cell.dataset.c = c;
                    cell.addEventListener('click', onCellClick);
                    cell.addEventListener('contextmenu', onCellRightClick);
                    boardEl.appendChild(cell);
                }
            }
        }

        function placeMines(safeR, safeC) {
            // Avoid placing a mine on the first clicked cell and its neighbors
            const forbidden = new Set([idx(safeR, safeC), ...neighbors(safeR, safeC).map(([rr, cc]) => idx(rr, cc))]);
            let placed = 0;
            while (placed < MINES) {
                const r = Math.floor(Math.random() * ROWS);
                const c = Math.floor(Math.random() * COLS);
                const k = idx(r, c);
                if (forbidden.has(k) || board[k].mine) continue;
                board[k].mine = true;
                placed++;
            }
            // compute counts
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const k = idx(r, c);
                    if (board[k].mine) continue;
                    board[k].count = neighbors(r, c).reduce((acc, [rr, cc]) => acc + (board[idx(rr, cc)].mine ? 1 : 0), 0);
                }
            }
        }

        function reveal(r, c) {
            const k = idx(r, c);
            const cell = board[k];
            if (cell.revealed || cell.flagged) return;
            cell.revealed = true;
            const el = getEl(r, c);
            el.classList.add('revealed');
            if (cell.mine) {
                el.classList.add('mine', 'exploded');
                gameOver = true;
                stopTimer();
                revealAllMines();
                showModal('Boom! Try again.');
                return;
            }
            revealedSafe++;
            if (cell.count > 0) {
                el.textContent = String(cell.count);
                el.classList.add('ms-num-' + cell.count);
            } else {
                // flood fill
                neighbors(r, c).forEach(([rr, cc]) => {
                    if (!board[idx(rr, cc)].revealed) reveal(rr, cc);
                });
            }
            checkWin();
        }

        function toggleFlag(r, c) {
            const k = idx(r, c);
            const cell = board[k];
            if (cell.revealed) return;
            if (!cell.flagged && flagsLeft <= 0) return;
            cell.flagged = !cell.flagged;
            const el = getEl(r, c);
            if (cell.flagged) { el.classList.add('flagged'); el.textContent = '⚑'; flagsLeft--; }
            else { el.classList.remove('flagged'); el.textContent = ''; flagsLeft++; }
            flagsEl.textContent = String(flagsLeft);
        }

        function onCellClick(e) {
            if (gameOver) return;
            const r = Number(this.dataset.r), c = Number(this.dataset.c);
            if (e.shiftKey || flagMode) { toggleFlag(r, c); return; }
            if (firstClick) { placeMines(r, c); firstClick = false; startTimer(); }
            reveal(r, c);
        }

        function onCellRightClick(e) {
            e.preventDefault();
            if (gameOver) return;
            const r = Number(this.dataset.r), c = Number(this.dataset.c);
            toggleFlag(r, c);
        }

        function getEl(r, c) { return boardEl.children[idx(r, c)]; }

        function revealAllMines() {
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const k = idx(r, c);
                    if (board[k].mine) {
                        const el = getEl(r, c);
                        el.classList.add('mine', 'revealed');
                        if (!el.textContent) el.textContent = '💣';
                    }
                }
            }
        }

        function checkWin() {
            if (revealedSafe >= totalSafe) {
                gameOver = true;
                stopTimer();
                showModal('All safe tiles revealed!');
                setTimeout(onWin, 400);
            }
        }

        restartBtn.addEventListener('click', () => {
            stopTimer();
            setup();
        });
        flagBtn.addEventListener('click', () => {
            flagMode = !flagMode;
            flagBtn.textContent = `Flag mode: ${flagMode ? 'ON' : 'OFF'}`;
            flagBtn.classList.toggle('active', flagMode);
            flagBtn.setAttribute('aria-pressed', String(flagMode));
        });

        function setup() {
            stopTimer();
            firstClick = true;
            flagsLeft = MINES;
            revealedSafe = 0;
            gameOver = false;
            flagMode = false;
            flagsEl.textContent = String(flagsLeft);
            timeEl.textContent = '0';
            buildEmptyBoard();
            // reset button visual state
            flagBtn.textContent = 'Flag mode: OFF';
            flagBtn.classList.remove('active');
            flagBtn.removeAttribute('aria-pressed');
        }

        setup();

        // cleanup when leaving overlay
        const observer = new MutationObserver(() => {
            if (document.getElementById('game-overlay').classList.contains('hidden')) {
                stopTimer();
                observer.disconnect();
            }
        });
        observer.observe(document.getElementById('game-overlay'), { attributes: true, attributeFilter: ['class'] });
    }
});