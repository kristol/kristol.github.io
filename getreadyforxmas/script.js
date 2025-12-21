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
        14: starBattleGame,
        15: skyscrapersGame,
        16: tentsAndTreesGame,
        17: networkGame,
        18: neighborsGame,
        19: aquariumGame,
        20: slitherlinkGame,
        21: binairoGame,
        22: liquidSortGame,
        23: sokobanGame,
        24: sudokuGame,
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
        // Hide the OK button; user will close via the top-right X
        if (modalBtn) { modalBtn.style.display = 'none'; }
        modal.classList.remove('hidden');
    }

    function closeModal() {
        modal.classList.add('hidden');
        // Reset any temporary button offsets used by gift messages
        const btn = document.getElementById('modal-action-btn');
        if (btn) { btn.style.transform=''; btn.style.marginTop=''; }
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
        // Container
        const wrap = document.createElement('div');
        wrap.style.textAlign = 'center';
        wrap.style.position = 'relative';

        // Headline
        const h = document.createElement('h3');
        h.innerText = 'Merry Christmas Amo! 🎁';
        const p = document.createElement('p');
        p.innerText = 'You conquered all 24 challenges. One tiny, final step… You have to tap me 542 times (why 542? Because I thats the amount of days we have been together!) to unlock your special gift. Ready? Go!';

        // Confetti canvas
        const canvas = document.createElement('canvas');
        canvas.width = 800; canvas.height = 400;
        canvas.style.width = '100%';
        canvas.style.maxWidth = '900px';
        canvas.style.height = '200px';
        canvas.style.display = 'block';
        canvas.style.margin = '12px auto';
        const ctx = canvas.getContext('2d');

        // Spawn confetti pieces
        const colors = ['#ff6b6b','#ffd43b','#4dabf7','#51cf66','#845ef7','#ffa94d'];
        const pieces = [];
        for (let i=0;i<180;i++){
            pieces.push({
                x: Math.random()*canvas.width,
                y: -Math.random()*canvas.height*0.5,
                r: 2 + Math.random()*4,
                c: colors[Math.floor(Math.random()*colors.length)],
                vy: 1 + Math.random()*2.5,
                vx: (Math.random()-0.5)*1.2,
                rot: Math.random()*Math.PI,
                vr: (Math.random()-0.5)*0.08
            });
        }
        function confettiStep(){
            ctx.clearRect(0,0,canvas.width,canvas.height);
            for (const p of pieces){
                p.y += p.vy; p.x += p.vx; p.rot += p.vr;
                if (p.y>canvas.height+10){ p.y=-10; p.x=Math.random()*canvas.width; }
                ctx.save();
                ctx.translate(p.x,p.y); ctx.rotate(p.rot);
                ctx.fillStyle=p.c;
                ctx.fillRect(-p.r, -p.r, p.r*2, p.r*2);
                ctx.restore();
            }
            requestAnimationFrame(confettiStep);
        }
        // Start confetti
        setTimeout(confettiStep, 50);

        // Extra snowflakes
        const snowLayer = document.createElement('div');
        snowLayer.style.pointerEvents = 'none';
        snowLayer.style.position = 'absolute';
        snowLayer.style.left = 0;
        snowLayer.style.right = 0;
        snowLayer.style.top = 0;
        snowLayer.style.bottom = 0;
        for (let i=0;i<40;i++){
            const s = document.createElement('div');
            s.style.position='absolute';
            s.style.left = Math.random()*100+'%';
            s.style.top = (-10 - Math.random()*40)+'px';
            s.style.width = s.style.height = (4 + Math.random()*6)+'px';
            s.style.borderRadius='50%';
            s.style.background='#fff';
            s.style.opacity = 0.9;
            const dur = 3 + Math.random()*4;
            s.style.animation = `gift-snow ${dur}s linear ${Math.random()}s infinite`;
            snowLayer.appendChild(s);
        }

        // 542-tap gate
        const tapWrap = document.createElement('div');
        tapWrap.style.marginTop = '12px';
        const info = document.createElement('p');
        info.style.margin = '6px 0 10px';
        info.textContent = 'Tap the button 542 times to unlock your gift!';
        const tapBtn = document.createElement('button');
        tapBtn.className = 'comic-btn';
        tapBtn.style.display = 'inline-block';
        tapBtn.style.marginTop = '8px';
        tapBtn.textContent = 'Tap me ❤';
        // Prevent double-tap zoom on iPad/iOS
        tapBtn.style.touchAction = 'manipulation';

        const counter = document.createElement('div');
        counter.style.fontWeight='800';
        counter.style.marginTop='8px';
        // Persisted progress
        const TAP_KEY='xmas_gift_taps';
        const UNLOCK_KEY='xmas_gift_unlocked';
        const CHALLENGE_KEY='xmas_gift_challenge_solved';
        let taps=Number(localStorage.getItem(TAP_KEY))||0; let msgIndex=0;
        let challengeShown=false; let challengeSolved=(localStorage.getItem(CHALLENGE_KEY)==='1');
        counter.textContent = `${taps} / 542`;

        const messages = [
            'This is the last challenge!',
            'You can do it!',
            'Easiest challenge of the month!',
            'You are so close!',
            'Only a handful more!',
            'VAI VAI VAIIIIIII ALISEA!', 
            'Keep going, fartypants!',
        ];
        // moved above to use persisted values
        function updateMessage(){
            const left = 542 - taps;
            if (taps % 50 === 0 && taps>0){
                const m = messages[msgIndex % messages.length];
                showModal(`${m}\nIt\'s only ${left} clicks left!`);
                // Nudge the OK button so it won't sit over the tappable area
                try {
                    const btn = document.getElementById('modal-action-btn');
                    if (btn) {
                        const xShift = (Math.random() * 40 - 20); // -20..20px horizontally
                        const yShift = 16 + Math.random() * 20;   // 16..36px downwards
                        btn.style.marginTop = Math.round(yShift) + 'px';
                        btn.style.transform = `translate(${Math.round(xShift)}px, 0)`;
                    }
                } catch(_){}
                msgIndex++;
            }
        }
        let lastTouchTime=0;
        tapBtn.addEventListener('touchend', (e)=>{
            const now=Date.now();
            if (now-lastTouchTime<350){ e.preventDefault(); }
            lastTouchTime=now;
        }, {passive:false});
        // Final prank: hard math challenge before the last tap
        const challenge = document.createElement('div');
        challenge.style.display='none';
        challenge.style.marginTop='12px';
        challenge.style.padding='12px';
        challenge.style.border='2px solid #c3d7e8';
        challenge.style.borderRadius='8px';
        challenge.style.background='#f7fbff';
        const chTitle=document.createElement('h4'); chTitle.textContent='Final Mini-Challenge';
        const chDesc=document.createElement('p'); chDesc.textContent='Solve this to unlock the very last click:';
        const expr=document.createElement('p'); expr.style.fontWeight='800'; expr.textContent='25 × 12 + (180 ÷ 6) − 5^2 + Σ(i, i=1..10)';
        const input=document.createElement('input'); input.type='tel'; input.placeholder='Enter the final value'; input.style.padding='8px'; input.style.border='1px solid #b0bec5'; input.style.borderRadius='6px'; input.style.fontWeight='800'; input.style.textAlign='center'; input.style.width='160px';
        const submit=document.createElement('button'); submit.className='comic-btn-small'; submit.textContent='Check Answer'; submit.style.marginLeft='8px';
        const feedback=document.createElement('div'); feedback.style.marginTop='8px'; feedback.style.fontWeight='700';
        const correctValue = (25*12) + (180/6) - Math.pow(5,2) + (10*(10+1)/2); // 360
        submit.addEventListener('click', ()=>{
            const val = parseInt((input.value||'').trim(),10);
            if (val===correctValue){
                feedback.textContent='Correct! You may finish the last tap.'; feedback.style.color='#2e7d32';
                challengeSolved=true; localStorage.setItem(CHALLENGE_KEY,'1');
                challenge.style.display='none'; tapBtn.disabled=false; tapBtn.focus();
            } else {
                feedback.textContent='Not quite — try again ❤'; feedback.style.color='#c62828';
            }
        });
        challenge.appendChild(chTitle); challenge.appendChild(chDesc); challenge.appendChild(expr); challenge.appendChild(input); challenge.appendChild(submit); challenge.appendChild(feedback);

        tapBtn.addEventListener('click', ()=>{
            // If we reached the pre-final state and challenge not solved, show it instead of counting
            if (!challengeShown && !challengeSolved && taps>=541){
                challengeShown=true; tapBtn.disabled=true; challenge.style.display='block';
                return;
            }
            taps++;
            counter.textContent = `${taps} / 542`;
            localStorage.setItem(TAP_KEY,String(taps));
            updateMessage();
            if (taps>=542){
                // Reveal gift link
                tapBtn.disabled=true; tapBtn.textContent='Unlocked!';
                localStorage.setItem(UNLOCK_KEY,'1');
                const gift = document.createElement('a');
                gift.className='comic-btn';
                gift.style.display='inline-block';
                gift.style.marginTop='12px';
                gift.textContent='Open Gift';
                gift.href='https://www.budapestpark.hu/events/mac-demarco-20260623';
                gift.target='_blank'; gift.rel='noopener noreferrer';
                tapWrap.appendChild(gift);
            }
        });

        tapWrap.appendChild(info);
        tapWrap.appendChild(tapBtn);
        tapWrap.appendChild(counter);
        tapWrap.appendChild(challenge);

        // If previously unlocked, restore gift link immediately
        if (localStorage.getItem(UNLOCK_KEY)==='1'){
            tapBtn.disabled=true; tapBtn.textContent='Unlocked!';
            const gift = document.createElement('a');
            gift.className='comic-btn';
            gift.style.display='inline-block';
            gift.style.marginTop='12px';
            gift.textContent='Open Gift';
            gift.href='https://www.budapestpark.hu/events/mac-demarco-20260623';
            gift.target='_blank'; gift.rel='noopener noreferrer';
            tapWrap.appendChild(gift);
        }

        wrap.appendChild(h);
        wrap.appendChild(p);
        wrap.appendChild(canvas);
        wrap.appendChild(snowLayer);
        wrap.appendChild(tapWrap);
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
                { a: [2, 4], b: [2, 5], type: 'neq' },
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
            [2,5,5],
            [4,1,5], [4,3,3],
            [6,2,3],
            [4,5,4],
            // Additional givens to ease the start, consistent with SOL
            [0,0,7], // row 1 col 1
            [1,3,4], // row 2 col 4
            [2,0,3], // row 3 col 1
            [3,6,2], // row 4 col 7
            [5,0,4], // row 6 col 1
            [6,5,1]  // row 7 col 6
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
            showModal(`Goal: Complete the grid with digits 1–${N}.\nRules:\n- No repeats in any row or column.\n- Inequalities between adjacent cells must hold (A < B or A > B).\nControls:\n- Tap a cell to cycle 1→…→${N}→empty. Given cells are fixed.`);
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
                        const v = board[r][c];
                        if (v === 0) board[r][c] = 1; // start at 1
                        else if (v >= N) board[r][c] = 0; // after N go to empty
                        else board[r][c] = v + 1; // increment
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
        function markInvalid(r,c){
            // Each rendered row contributes 4*N elements:
            // - For cells + right spacers: 2*N elements (cell, spacer)
            // - For below inequalities + spacers: 2*N elements
            // Cells are at even indices within the first 2*N slice of the row block.
            const rowBlockStart = r * (4 * N);
            const idx = rowBlockStart + (c * 2);
            const cell = boardEl.children[idx];
            if (cell) cell.classList.add('invalid');
        }

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
                    const isVertical = (dr===1 && dc===0);
                    if (!isVertical){
                        // Horizontal: '<' means left < right, '>' means left > right
                        if (op==='<' && !(a<b)){ ok=false; markInvalid(r,c); markInvalid(r+dr,c+dc); }
                        if (op==='>' && !(a>b)){ ok=false; markInvalid(r,c); markInvalid(r+dr,c+dc); }
                    } else {
                        // Vertical per user specification:
                        // '˅' stored as '<' means top > bottom
                        // '˄' stored as '>' means top < bottom
                        if (op==='<' && !(a>b)){ ok=false; markInvalid(r,c); markInvalid(r+dr,c+dc); }
                        if (op==='>' && !(a<b)){ ok=false; markInvalid(r,c); markInvalid(r+dr,c+dc); }
                    }
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

    // 14) Star Battle (Day 14)
    function starBattleGame(root, onWin) {
        root.innerHTML = '';
        const N = 10; // 10x10
        const STARS_PER = 2; // per row/col/region
        const EMPTY = 0, DOT = 1, STAR = 2;
        const DEBUG_COORDS = true; // show r,c in title for quick verification
        let board = Array.from({length:N}, ()=>Array(N).fill(EMPTY));
        // Regions and SOL provided (groupA..groupJ mapped to 0..9)
        const regions = [
            [6,6,6,6,9,9,9,9,1,1],
            [6,6,6,6,6,9,9,9,1,7],
            [2,6,6,6,6,9,9,9,1,7],
            [2,6,6,9,9,9,7,1,1,7],
            [2,2,6,4,9,9,7,7,7,7],
            [8,8,8,4,9,3,7,7,7,7],
            [8,4,4,4,5,3,3,5,7,7],
            [8,8,8,5,5,3,5,5,0,7],
            [8,8,8,5,5,5,5,5,0,7],
            [8,8,8,5,5,5,5,5,0,7]
        ];
        const SOL = [
            [7,8],[0,9],     // A, B
            [2,0],[3,0],     // C, C
            [5,4],[5,5],[6,5],[8,6],[9,6], // D, D, F, F, F
            [1,2],[4,2],[0,0],[2,2], // G, G, G, G
            [5,7],[7,6],[8,7],[9,9], // H, H, H, H
            [0,4],[1,4],[0,7],[1,7],[3,7], // J, J, J, J, J
            [5,0],[6,0],[7,0],[8,0],[9,0], // I, I, I, I, I
        ];

        const wrap = document.createElement('div');
        wrap.className = 'sb-wrapper';
                wrap.innerHTML = `
            <h3>Star Battle</h3>
            <div class="sb-container">
              <aside class="sb-sidebar">
                <div class="sb-info">Place ${STARS_PER} stars in every row, column, and colored region. Stars cannot touch, even diagonally.</div>
                <div class="sb-controls">
                    <button class="comic-btn-small" id="sb-check">Check</button>
                    <button class="comic-btn-small" id="sb-reset">Reset</button>
                                        <button class="comic-btn-small" id="sb-hint">Hint</button>
                    <button class="comic-btn-small" id="sb-help">How to play</button>
                </div>
              </aside>
              <div class="sb-board" id="sb-board"></div>
            </div>
        `;
        root.appendChild(wrap);

        const boardEl = wrap.querySelector('#sb-board');
        const checkBtn = wrap.querySelector('#sb-check');
        const resetBtn = wrap.querySelector('#sb-reset');
        const helpBtn = wrap.querySelector('#sb-help');
        const hintBtn = wrap.querySelector('#sb-hint');

        function showHelp(){
            showModal(`Goal: Place ${STARS_PER} stars in each row, column, and region.\nRules:\n- Stars cannot be adjacent, including diagonals.\nControls:\n- Tap to cycle: Empty → Dot → Star.`);
        }

        function render(){
            boardEl.innerHTML = '';
            for (let r=0;r<N;r++){
                for (let c=0;c<N;c++){
                    const cell=document.createElement('div');
                    cell.className = `sb-cell region-${regions[r][c]}`;
                    const v=board[r][c];
                    cell.textContent = v===STAR ? '★' : (v===DOT ? '•' : '');
                    if (DEBUG_COORDS) cell.title = `r${r+1} c${c+1}`;
                    cell.addEventListener('click', ()=>{
                        board[r][c] = (board[r][c]+1)%3; // EMPTY->DOT->STAR->EMPTY
                        render();
                        validate(true);
                    });
                    boardEl.appendChild(cell);
                }
            }
        }

        function clearInvalid(){ Array.from(boardEl.children).forEach(el=>el.classList.remove('invalid')); }
        function markInvalid(r,c){ const idx=r*N+c; const el=boardEl.children[idx]; if(el) el.classList.add('invalid'); }
        function inBounds(r,c){ return r>=0 && r<N && c>=0 && c<N; }

        function validate(live=false){
            clearInvalid();
            let ok=true;
            // adjacency rule
            for (let r=0;r<N;r++) for(let c=0;c<N;c++) if (board[r][c]===STAR){
                const dirs=[-1,0,1];
                for (let dr of dirs) for (let dc of dirs){ if (dr===0&&dc===0) continue; const nr=r+dr, nc=c+dc; if(inBounds(nr,nc)&&board[nr][nc]===STAR){ ok=false; markInvalid(r,c); markInvalid(nr,nc);} }
            }
            // per row/col counts (at most live, exactly on final)
            const rowCount = new Array(N).fill(0), colCount=new Array(N).fill(0), regCount={};
            for (let r=0;r<N;r++) for(let c=0;c<N;c++) if (board[r][c]===STAR){ rowCount[r]++; colCount[c]++; const id=regions[r][c]; regCount[id]=(regCount[id]||0)+1; }
            for (let r=0;r<N;r++) if (rowCount[r]>STARS_PER){ ok=false; for(let c=0;c<N;c++) if(board[r][c]===STAR) markInvalid(r,c);} 
            for (let c=0;c<N;c++) if (colCount[c]>STARS_PER){ ok=false; for(let r=0;r<N;r++) if(board[r][c]===STAR) markInvalid(r,c);} 
            for (let id=0; id<N; id++){ const cnt=regCount[id]||0; if (cnt>STARS_PER){ ok=false; for(let r=0;r<N;r++) for(let c=0;c<N;c++) if(regions[r][c]===id && board[r][c]===STAR) markInvalid(r,c);} }
            if (!live){
                // final: require counts and adjacency only; do not enforce specific SOL positions
                for (let r=0;r<N;r++) if (rowCount[r]!==STARS_PER) ok=false;
                for (let c=0;c<N;c++) if (colCount[c]!==STARS_PER) ok=false;
                for (let id=0; id<N; id++) if ((regCount[id]||0)!==STARS_PER) ok=false;
            }
            return ok;
        }

        function isComplete(){ let s=0; for(let r=0;r<N;r++) for(let c=0;c<N;c++) if(board[r][c]===STAR) s++; return s===N*STARS_PER; }
        function checkWin(){
            if (!isComplete()){ showModal(`Place all ${N*STARS_PER} stars respecting the rules.`); return; }
            if (validate(false)){ showModal('Sparkling! Puzzle solved.'); setTimeout(onWin, 400); }
            else { showModal('Conflicts remain. Check adjacency and per-row/col/region counts.'); }
        }
        function reset(){ board = Array.from({length:N}, ()=>Array(N).fill(EMPTY)); render(); clearInvalid(); }

        // Hint system: applies simple deductions
        function canBeStar(r,c){
            if (board[r][c]!==EMPTY) return false;
            // adjacency
            for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++){
                if (dr===0&&dc===0) continue; const nr=r+dr, nc=c+dc; if(inBounds(nr,nc) && board[nr][nc]===STAR) return false;
            }
            // row/col/region capacity
            const id=regions[r][c];
            let rowStars=0, colStars=0, regStars=0;
            for (let k=0;k<N;k++){ if(board[r][k]===STAR) rowStars++; if(board[k][c]===STAR) colStars++; }
            for (let rr=0; rr<N; rr++) for (let cc=0; cc<N; cc++) if(regions[rr][cc]===id && board[rr][cc]===STAR) regStars++;
            if (rowStars>=STARS_PER || colStars>=STARS_PER || regStars>=STARS_PER) return false;
            return true;
        }

        function clearPulses(){ Array.from(boardEl.children).forEach(el=>el.classList.remove('pulse')); }
        function pulseCell(r,c){ clearPulses(); const idx=r*N+c; const el=boardEl.children[idx]; if(el){ el.classList.add('pulse'); setTimeout(()=>el.classList.remove('pulse'), 1600); } }

        function applyHint(){
            // 1) Suggest a forgotten dot: a cell that cannot be a star
            for (let r=0;r<N;r++){
                for (let c=0;c<N;c++){
                    if (board[r][c]===EMPTY && !canBeStar(r,c)) { pulseCell(r,c); return; }
                }
            }
            // 2) If a row/col/region has remaining stars equal to number of candidate cells, pulse those candidates
            // Rows
            for (let r=0;r<N;r++){
                let rowStars=0, candidates=[]; for(let c=0;c<N;c++){ if(board[r][c]===STAR) rowStars++; if(canBeStar(r,c)) candidates.push([r,c]); }
                const remaining=STARS_PER-rowStars; if (remaining>0 && candidates.length===remaining){ candidates.forEach(([rr,cc])=>pulseCell(rr,cc)); return; }
            }
            // Columns
            for (let c=0;c<N;c++){
                let colStars=0, candidates=[]; for(let r=0;r<N;r++){ if(board[r][c]===STAR) colStars++; if(canBeStar(r,c)) candidates.push([r,c]); }
                const remaining=STARS_PER-colStars; if (remaining>0 && candidates.length===remaining){ candidates.forEach(([rr,cc])=>pulseCell(rr,cc)); return; }
            }
            // Regions
            const byRegion = new Map();
            for (let r=0;r<N;r++) for(let c=0;c<N;c++){
                const id=regions[r][c]; if(!byRegion.has(id)) byRegion.set(id,{stars:0,cands:[]}); const entry=byRegion.get(id);
                if (board[r][c]===STAR) entry.stars++; else if (canBeStar(r,c)) entry.cands.push([r,c]);
            }
            for (const [id,{stars,cands}] of byRegion){ const remaining=STARS_PER-stars; if (remaining>0 && cands.length===remaining){ cands.forEach(([rr,cc])=>pulseCell(rr,cc)); return; } }
            showModal('No simple hint found. Try adjacency and per-row/col/region counts.');
        }

        render();
        helpBtn.addEventListener('click', showHelp);
        resetBtn.addEventListener('click', reset);
        checkBtn.addEventListener('click', checkWin);
        hintBtn.addEventListener('click', applyHint);
    }

    // 15) Skyscrapers (Day 15)
    function skyscrapersGame(root, onWin) {
        root.innerHTML = '';
        const N = 6;
        // Solution grid taken from the provided image
        const SOL = [
            [1,4,6,3,5,2],
            [2,3,5,4,1,6],
            [6,5,1,2,4,3],
            [3,6,4,1,2,5],
            [5,1,2,6,3,4],
            [4,2,3,5,6,1]
        ];
        // Edge clues corresponding to that solution (top, bottom, left, right)
        const TOP    = [3,3,1,3,2,2];
        const BOTTOM = [3,2,4,2,1,4];
        const LEFT   = [3,4,1,2,2,3];
        const RIGHT  = [3,1,4,2,2,2];

        const GIVENS = [
            [1,4,1], // r2 c5 = 1
            [2,5,3], // r3 c6 = 3
            [3,3,1], // r4 c4 = 1
            [5,3,5], // r6 c4 = 5
        ];

        let board = Array.from({length:N}, ()=>Array(N).fill(0));
        for (const [r,c,v] of GIVENS) board[r][c]=v;
        let cellEls = Array.from({length:N}, ()=>Array(N).fill(null));

        const wrap = document.createElement('div');
        wrap.className = 'sk-wrapper';
        wrap.innerHTML = `
            <h3>Skyscrapers</h3>
            <div class="sk-container">
              <aside class="sk-sidebar">
                <div class="sk-info">Fill the grid with numbers 1–${N}. Each row and column must contain all numbers without repeats. Edge clues show how many buildings are visible from that side (taller buildings hide shorter ones behind them).</div>
                <div class="sk-controls">
                    <button class="comic-btn-small" id="sk-check">Check</button>
                    <button class="comic-btn-small" id="sk-reset">Reset</button>
                    <button class="comic-btn-small" id="sk-help">How to play</button>
                </div>
              </aside>
              <div class="sk-board" id="sk-board" style="grid-template-columns: repeat(${N+2}, 34px); grid-template-rows: repeat(${N+2}, 34px);"></div>
            </div>
        `;
        root.appendChild(wrap);

        const boardEl = wrap.querySelector('#sk-board');
        const checkBtn = wrap.querySelector('#sk-check');
        const resetBtn = wrap.querySelector('#sk-reset');
        const helpBtn = wrap.querySelector('#sk-help');

        function showHelp(){
            showModal(`Rules:\n- Place 1–${N} in each cell.\n- No repeats in any row or column.\n- Clues on the edges tell how many buildings are visible looking inwards. A taller building hides any shorter ones behind it.\n- Blue givens are fixed.\nControls:\n- Tap a non-given cell to cycle 1→…→${N}→empty.`);
        }

        function clearInvalid(){
            for (let r=0;r<N;r++) for (let c=0;c<N;c++) if (cellEls[r][c]) cellEls[r][c].classList.remove('invalid');
        }
        function markInvalid(r,c){ if (cellEls[r][c]) cellEls[r][c].classList.add('invalid'); }

        function visibleCount(arr){
            let max=0, seen=0; for (const v of arr){ if (v>max){ max=v; seen++; } } return seen;
        }

        function isGiven(r,c){ return GIVENS.some(g=>g[0]===r && g[1]===c); }

        function render(){
            boardEl.innerHTML = '';
            cellEls = Array.from({length:N}, ()=>Array(N).fill(null));

            // top row: [blank] top clues [blank]
            boardEl.appendChild(clueEl(''));
            for (let c=0;c<N;c++) boardEl.appendChild(clueEl(TOP[c]||''));
            boardEl.appendChild(clueEl(''));

            // middle rows with left/right clues and cells
            for (let r=0;r<N;r++){
                boardEl.appendChild(clueEl(LEFT[r]||''));
                for (let c=0;c<N;c++){
                    const cell = document.createElement('div');
                    cell.className = 'sk-cell';
                    const v = board[r][c];
                    cell.textContent = v ? String(v) : '';
                    if (isGiven(r,c)){
                        cell.classList.add('given');
                    } else {
                        cell.addEventListener('click', ()=>{
                            const v = board[r][c];
                            if (v === 0) board[r][c] = 1; // start at 1
                            else if (v >= N) board[r][c] = 0; // after N go to empty
                            else board[r][c] = v + 1;
                            render();
                            validate(true);
                        });
                    }
                    boardEl.appendChild(cell);
                    cellEls[r][c] = cell;
                }
                boardEl.appendChild(clueEl(RIGHT[r]||''));
            }

            // bottom row
            boardEl.appendChild(clueEl(''));
            for (let c=0;c<N;c++) boardEl.appendChild(clueEl(BOTTOM[c]||''));
            boardEl.appendChild(clueEl(''));
        }

        function clueEl(text){ const el=document.createElement('div'); el.className='sk-clue'; el.textContent=String(text||''); return el; }

        function validate(live=false){
            clearInvalid();
            let ok = true;

            // Row/col uniqueness checks
            for (let r=0;r<N;r++){
                const seen = new Map();
                for (let c=0;c<N;c++){
                    const v=board[r][c]; if (!v) continue;
                    if (v<1 || v>N){ ok=false; if(live) markInvalid(r,c); continue; }
                    if (seen.has(v)){ ok=false; if(live){ markInvalid(r,c); markInvalid(r, seen.get(v)); } }
                    else seen.set(v,c);
                }
            }
            for (let c=0;c<N;c++){
                const seen = new Map();
                for (let r=0;r<N;r++){
                    const v=board[r][c]; if (!v) continue;
                    if (v<1 || v>N){ ok=false; if(live) markInvalid(r,c); continue; }
                    if (seen.has(v)){ ok=false; if(live){ markInvalid(r,c); markInvalid(seen.get(v), c); } }
                    else seen.set(v,r);
                }
            }

            if (!live){
                // all cells must be filled
                for (let r=0;r<N;r++) for (let c=0;c<N;c++) if (!board[r][c]) ok=false;

                // verify row clues
                for (let r=0;r<N;r++){
                    const row = board[r];
                    if (LEFT[r]){ if (visibleCount(row)!==LEFT[r]){ ok=false; for(let c=0;c<N;c++) markInvalid(r,c); } }
                    if (RIGHT[r]){ const rev=[...row].reverse(); if (visibleCount(rev)!==RIGHT[r]){ ok=false; for(let c=0;c<N;c++) markInvalid(r,c); } }
                }
                // verify column clues
                for (let c=0;c<N;c++){
                    const col = board.map(r=>r[c]);
                    if (TOP[c]){ if (visibleCount(col)!==TOP[c]){ ok=false; for(let r=0;r<N;r++) markInvalid(r,c); } }
                    if (BOTTOM[c]){ const rev=[...col].reverse(); if (visibleCount(rev)!==BOTTOM[c]){ ok=false; for(let r=0;r<N;r++) markInvalid(r,c); } }
                }
                // verify uniqueness fully (no zeros already enforced)
                for (let r=0;r<N;r++){
                    const set=new Set(board[r]); if (set.size!==N) ok=false;
                }
                for (let c=0;c<N;c++){
                    const set=new Set(board.map(r=>r[c])); if (set.size!==N) ok=false;
                }
            }
            return ok;
        }

        function isComplete(){ for (let r=0;r<N;r++) for(let c=0;c<N;c++) if(!board[r][c]) return false; return true; }
        function checkWin(){
            if (!isComplete()){ showModal(`Fill all cells with digits 1–${N}.`); return; }
            if (validate(false)){ showModal('City skyline looks perfect!'); setTimeout(onWin, 400); }
            else { showModal('Some rules are broken. Check row/col uniqueness and edge clues.'); }
        }
        function reset(){ board = Array.from({length:N}, ()=>Array(N).fill(0)); for (const [r,c,v] of GIVENS) board[r][c]=v; render(); clearInvalid(); }

        render();
        helpBtn.addEventListener('click', showHelp);
        resetBtn.addEventListener('click', reset);
        checkBtn.addEventListener('click', checkWin);
    }

    // 16) Tents & Trees (Day 16)
    function tentsAndTreesGame(root, onWin) {
        root.innerHTML = '';
        const N = 8; // 8x8
        const EMPTY = 0, GRASS = 1, TENT = 2, TREE = 3;
        // Puzzle data (will be generated to guarantee solvability)
        let TREES = [];
        let ROW_TARGET = new Array(N).fill(0);
        let COL_TARGET = new Array(N).fill(0);

        let board = Array.from({length:N}, ()=>Array(N).fill(EMPTY));

        const wrap = document.createElement('div');
        wrap.className = 'tt-wrapper';
        wrap.innerHTML = `
            <h3>Tents & Trees</h3>
            <div class="tt-container">
                            <aside class="tt-sidebar">
                <div class="tt-info">Place tents so that each tent is next to at least one tree. Tents cannot touch each other (even diagonally). Match the tent counts for each row and column. Use grass to mark empty cells.</div>
                <div class="tt-controls">
                    <button class="comic-btn-small" id="tt-check">Check</button>
                    <button class="comic-btn-small" id="tt-reset">Reset</button>
                    <button class="comic-btn-small" id="tt-help">How to play</button>
                </div>
              </aside>
              <div class="tt-board" id="tt-board" style="grid-template-columns: 34px repeat(${N}, 34px); grid-template-rows: repeat(${N}, 34px) 34px;"></div>
            </div>
        `;
        root.appendChild(wrap);

        const boardEl = wrap.querySelector('#tt-board');
        const checkBtn = wrap.querySelector('#tt-check');
        const resetBtn = wrap.querySelector('#tt-reset');
        const helpBtn = wrap.querySelector('#tt-help');

        function showHelp(){
            showModal(`Rules:\n- Each tent must be next to at least one tree.\n- Tents cannot touch other tents, even diagonally.\n- The number of tents in each row and column must match the clues.\nControls:\n- Click a cell to cycle: Empty → Grass → Tent. Trees are fixed.`);
        }

        function inBounds(r,c){ return r>=0 && r<N && c>=0 && c<N; }
        function clearInvalid(){ Array.from(boardEl.querySelectorAll('.tt-cell')).forEach(el=>el.classList.remove('invalid')); }
        function markInvalidIdx(idx){ const el=boardEl.children[idx]; if(el) el.classList.add('invalid'); }
        // Convert (r,c) cell coordinates to boardEl child index, accounting for top row clues and left row clues
        // Layout: [corner] [N top clues], then for each row: [left clue] [N cells], finally bottom clue row
        function idx(r,c){ const topOffset = 1 + N; const rowStride = 1 + N; return topOffset + r*rowStride + 1 + c; }

        function render(){
            boardEl.innerHTML = '';
            // First cell blank (top-left corner of clues)
            const corner=document.createElement('div'); corner.className='tt-clue-col'; corner.textContent=''; boardEl.appendChild(corner);
            // Column clues top
            for (let c=0;c<N;c++){ const el=document.createElement('div'); el.className='tt-clue-col'; el.textContent=String(COL_TARGET[c]); boardEl.appendChild(el); }
            // Rows
            for (let r=0;r<N;r++){
                // Left row clue
                const rc=document.createElement('div'); rc.className='tt-clue-row'; rc.textContent=String(ROW_TARGET[r]); boardEl.appendChild(rc);
                // Cells
                for (let c=0;c<N;c++){
                    const cell=document.createElement('div');
                    cell.className='tt-cell';
                    const v=board[r][c];
                    if (v===TREE){ cell.classList.add('tree'); cell.textContent='🌳'; }
                    else if (v===TENT){ cell.classList.add('tent'); cell.textContent='⛺'; }
                    else if (v===GRASS){ cell.classList.add('grass'); cell.textContent=''; }
                    cell.addEventListener('click', ()=>{
                        if (board[r][c]===TREE) return;
                        const next = board[r][c]===EMPTY ? GRASS : (board[r][c]===GRASS ? TENT : EMPTY);
                        board[r][c]=next;
                        render();
                        validate(true);
                    });
                    boardEl.appendChild(cell);
                }
            }
            // Bottom row: spacer to align grid (optional blank)
            const spacer=document.createElement('div'); spacer.className='tt-clue-col'; spacer.textContent=''; boardEl.appendChild(spacer);
            for (let c=0;c<N;c++){ const el=document.createElement('div'); el.className='tt-clue-col muted'; el.textContent=''; boardEl.appendChild(el); }
        }

        // Generate a solvable puzzle by first picking a non-touching tent layout, then placing one adjacent tree per tent, then deriving row/col targets.
        function generatePuzzle(){
            board = Array.from({length:N}, ()=>Array(N).fill(EMPTY));
            TREES = [];
            ROW_TARGET.fill(0); COL_TARGET.fill(0);
            const tents=[];
            function tentKey(r,c){ return r+","+c; }
            const tentSet=new Set();
            function canPlaceTent(r,c){
                if (!inBounds(r,c)) return false;
                if (tentSet.has(tentKey(r,c))) return false;
                // non-touching
                for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++){
                    if (dr===0&&dc===0) continue; const nr=r+dr, nc=c+dc; if(!inBounds(nr,nc)) continue; if (tentSet.has(tentKey(nr,nc))) return false;
                }
                return true;
            }
            // Place a fixed pattern of tents for stability
            const planned = [
                [0,3],[1,0],[1,5],[2,2],[2,7],[3,6],[4,4],[5,1],[5,5],[6,7],[7,2]
            ];
            for (const [r,c] of planned){ if (canPlaceTent(r,c)) { tentSet.add(tentKey(r,c)); tents.push([r,c]); } }
            // Place one tree adjacent (orthogonal) to each tent, avoiding overlap
            const treeSet=new Set();
            const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
            for (const [tr,tc] of tents){
                let placed=false;
                for (const [dr,dc] of dirs){ const r=tr+dr, c=tc+dc; const k=r+","+c; if(inBounds(r,c) && !treeSet.has(k) && !tentSet.has(k)){ treeSet.add(k); TREES.push([r,c]); placed=true; break; } }
                if (!placed){
                    // fallback: pick first in-bounds even if adjacent to other trees
                    for (const [dr,dc] of dirs){ const r=tr+dr, c=tc+dc; const k=r+","+c; if(inBounds(r,c) && !tentSet.has(k)){ treeSet.add(k); TREES.push([r,c]); placed=true; break; } }
                }
            }
            // Derive quotas
            for (const [r,c] of tents){ ROW_TARGET[r]++; COL_TARGET[c]++; }
            // Render trees on board
            for (const [r,c] of TREES){ board[r][c]=TREE; }
        }


        function tentsTouching(){
            let bad=false;
            for (let r=0;r<N;r++) for (let c=0;c<N;c++) if (board[r][c]===TENT){
                for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++){
                    if (dr===0&&dc===0) continue; const nr=r+dr, nc=c+dc;
                    if (inBounds(nr,nc) && board[nr][nc]===TENT){ bad=true; markInvalidIdx(idx(r,c)); markInvalidIdx(idx(nr,nc)); }
                }
            }
            return bad;
        }

        function tentHasTree(r,c){
            const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
            for (const [dr,dc] of dirs){ const nr=r+dr, nc=c+dc; if(inBounds(nr,nc) && board[nr][nc]===TREE) return true; }
            return false;
        }

        function validate(live=false){
            clearInvalid();
            let ok=true;
            // tents cannot touch (even diagonally)
            if (tentsTouching()) ok=false;
            // each tent must be next to a tree
            for (let r=0;r<N;r++) for (let c=0;c<N;c++) if(board[r][c]===TENT){ if(!tentHasTree(r,c)){ ok=false; markInvalidIdx(idx(r,c)); } }
            // row/col counts must not exceed targets in live, equal on final
            const rowCount=new Array(N).fill(0), colCount=new Array(N).fill(0);
            for (let r=0;r<N;r++) for (let c=0;c<N;c++) if(board[r][c]===TENT){ rowCount[r]++; colCount[c]++; }
            for (let r=0;r<N;r++){ if (rowCount[r] > ROW_TARGET[r]){ ok=false; for(let c=0;c<N;c++) if(board[r][c]===TENT) markInvalidIdx(idx(r,c)); } }
            for (let c=0;c<N;c++){ if (colCount[c] > COL_TARGET[c]){ ok=false; for(let r=0;r<N;r++) if(board[r][c]===TENT) markInvalidIdx(idx(r,c)); } }
            if (!live){
                for (let r=0;r<N;r++) if (rowCount[r] !== ROW_TARGET[r]) ok=false;
                for (let c=0;c<N;c++) if (colCount[c] !== COL_TARGET[c]) ok=false;
            }
            return ok;
        }

        function isComplete(){
            // Complete when row and col counts match targets (numbers placed can be mixture of grass/tent)
            const rowCount=new Array(N).fill(0), colCount=new Array(N).fill(0);
            for (let r=0;r<N;r++) for (let c=0;c<N;c++) if(board[r][c]===TENT){ rowCount[r]++; colCount[c]++; }
            for (let r=0;r<N;r++) if (rowCount[r] !== ROW_TARGET[r]) return false;
            for (let c=0;c<N;c++) if (colCount[c] !== COL_TARGET[c]) return false;
            return true;
        }

        function checkWin(){
            if (!isComplete()){ showModal('Match the tent counts per row and column.'); return; }
            if (validate(false)){ showModal('Camp set up perfectly!'); setTimeout(onWin, 400); }
            else { showModal('Conflicts remain. Tents must touch a tree and cannot touch each other.'); }
        }
        function reset(){ generatePuzzle(); render(); clearInvalid(); }

        // Lightweight backtracking solver (no UI changes). Call solve() from DevTools to compute tent coordinates.
        function solve(){
            // Build candidate cells per tree
            const treeCands = TREES.map(([tr,tc])=>{
                const cands=[]; const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
                for (const [dr,dc] of dirs){ const r=tr+dr, c=tc+dc; if(inBounds(r,c) && board[r][c]!==TREE) cands.push([r,c]); }
                return {tree:[tr,tc], cands};
            });
            const tentSet = new Set(); // key "r,c" for placed tents
            const rowCount=new Array(N).fill(0), colCount=new Array(N).fill(0);

            function key(r,c){ return r+","+c; }
            function canPlace(r,c){
                if (board[r][c]===TREE) return false;
                if (tentSet.has(key(r,c))) return false;
                // non-touching tents
                for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++){
                    const nr=r+dr, nc=c+dc; if(dr===0&&dc===0) continue; if(!inBounds(nr,nc)) continue; if(tentSet.has(key(nr,nc))) return false;
                }
                // quotas
                if (rowCount[r] + 1 > ROW_TARGET[r]) return false; if (colCount[c] + 1 > COL_TARGET[c]) return false;
                // adjacency to a tree
                const dirs=[[1,0],[-1,0],[0,1],[0,-1]]; let ok=false; for(const [dr,dc] of dirs){ const nr=r+dr, nc=c+dc; if(inBounds(nr,nc) && board[nr][nc]===TREE){ ok=true; break; } }
                return ok;
            }
            function place(r,c){ tentSet.add(key(r,c)); rowCount[r]++; colCount[c]++; }
            function remove(r,c){ tentSet.delete(key(r,c)); rowCount[r]--; colCount[c]--; }

            // Order trees by fewest candidates to reduce branching
            treeCands.sort((a,b)=>a.cands.length-b.cands.length);

            function backtrack(i){
                if (i===treeCands.length){
                    // Check quotas satisfied
                    for (let r=0;r<N;r++) if(rowCount[r]!==ROW_TARGET[r]) return false;
                    for (let c=0;c<N;c++) if(colCount[c]!==COL_TARGET[c]) return false;
                    return true;
                }
                const {cands} = treeCands[i];
                // Try each candidate; also allow that a tree may share a tent already adjacent
                // Prefer candidates that help tight quotas
                const ordered = cands.slice().sort((a,b)=>{
                    const ta = (ROW_TARGET[a[0]]-rowCount[a[0]]) + (COL_TARGET[a[1]]-colCount[a[1]]);
                    const tb = (ROW_TARGET[b[0]]-rowCount[b[0]]) + (COL_TARGET[b[1]]-colCount[b[1]]);
                    return ta - tb;
                });
                for (const [r,c] of ordered){
                    if (!canPlace(r,c)) continue;
                    place(r,c);
                    if (backtrack(i+1)) return true;
                    remove(r,c);
                }
                // If no candidate placed, fail
                return false;
            }

            const ok = backtrack(0);
            if (!ok){ console.warn('No solution found for current puzzle.'); return []; }
            const res=[]; tentSet.forEach(k=>{ const [r,c]=k.split(',').map(Number); res.push([r,c]); });
            res.sort((a,b)=> a[0]-b[0] || a[1]-b[1]);
            console.log('Tents solution (row, col 0-based):', res);
            return res;
        }

        generatePuzzle();
        render();
        helpBtn.addEventListener('click', showHelp);
        resetBtn.addEventListener('click', reset);
        checkBtn.addEventListener('click', checkWin);
    }

    // 17) Network (Day 17)
    function networkGame(root, onWin) {
        root.innerHTML = '';
        const N = 9; // size 9x9
        // Each tile type is a set of open directions: U,R,D,L using bitmask 1,2,4,8
        const U=1,R=2,D=4,L=8;
        // Hardcoded board from BrainBashers (image codes net1..net9, neta..nete)
        const PUZ_CODES = [
            ['net6','net1','net6','net1','net1','net5','neta','net7','net1'],
            ['net7','nete','net3','net3','net2','net4','net7','net7','net8'],
            ['net1','net9','netb','net7','net4','nete','net9','net9','net1'],
            ['net4','net3','netd','netb','netd','net3','net6','nete','net6'],
            ['netc','netc','neta','neta','net3','net5','nete','net1','neta'],
            ['net6','net5','net6','net3','net7','net9','net3','nete','net5'],
            ['net6','net1','net4','net7','netb','nete','net8','neta','neta'],
            ['net2','neta','neta','net6','neta','net4','net8','net7','neta'],
            ['net2','net5','net5','net5','net7','net8','net8','net9','net4'],
        ];
        // Map codes to connector masks. Adjust if needed to match the site’s legend.
        const CODE_MAP = {
            // Mapping provided by user:
            // net1 - right
            net1: R,
            // net2 - up
            net2: U,
            // net3 - UR (corner)
            net3: U|R,
            // net4 - left
            net4: L,
            // net5 - horizontal (L|R)
            net5: L|R,
            // net6 - UL (corner)
            net6: U|L,
            // net7 - ULR (tee missing down)
            net7: U|L|R,
            // net8 - down
            net8: D,
            // net9 - DR (corner)
            net9: D|R,
            // neta - vertical (U|D)
            neta: U|D,
            // netb - URD (tee missing left)
            netb: U|R|D,
            // netc - LD (corner)
            netc: L|D,
            // netd - LDR (tee missing up)
            netd: L|D|R,
            // nete - LUD (tee missing right)
            nete: L|U|D,
        };
        const PUZ = PUZ_CODES.map(row => row.map(code => CODE_MAP[code]||0));

        // Rotation state per tile (0..3); fixed terminals can be marked in FIX
        let rot = Array.from({length:N}, ()=>Array(N).fill(0));
        const FIX = Array.from({length:N}, ()=>Array(N).fill(false));

        const wrap = document.createElement('div');
        wrap.className = 'nw-wrapper';
        wrap.innerHTML = `
            <h3>Network</h3>
            <div class="nw-container">
              <aside class="nw-sidebar">
                <div class="nw-info">Rotate tiles to connect all wires into one continuous network. No open ends at the grid edges. All adjacent connectors must match.</div>
                <div class="nw-controls">
                    <button class="comic-btn-small" id="nw-check">Check</button>
                    <button class="comic-btn-small" id="nw-reset">Reset</button>
                    <button class="comic-btn-small" id="nw-help">How to play</button>
                </div>
              </aside>
              <div class="nw-board" id="nw-board" style="grid-template-columns: repeat(${N}, 36px); grid-template-rows: repeat(${N}, 36px);"></div>
            </div>
        `;
        root.appendChild(wrap);

        const boardEl = wrap.querySelector('#nw-board');
        const checkBtn = wrap.querySelector('#nw-check');
        const resetBtn = wrap.querySelector('#nw-reset');
        const helpBtn = wrap.querySelector('#nw-help');
        

        function showHelp(){
            showModal(`Goal: Make a single continuous network.\nRules:\n- Rotate tiles; connectors must match between neighbors.\n- No open connectors at the outer border.\nControls:\n- Click to rotate 90°. Fixed tiles can’t rotate.`);
        }

        function has(dirMask, dir){ return (dirMask & dir) !== 0; }
        function rotateMask(m, times){ times%=4; while(times--) m = ((m<<1)&15) | ((m>>3)&1); return m; }

        function tileMask(r,c){ return rotateMask(PUZ[r][c], rot[r][c]); }
        function clearInvalid(){ Array.from(boardEl.children).forEach(el=>el.classList.remove('invalid')); }
        function markInvalid(r,c){ const idx=r*N+c; const el=boardEl.children[idx]; if(el) el.classList.add('invalid'); }

        function render(){
            boardEl.innerHTML = '';
            for (let r=0;r<N;r++){
                for (let c=0;c<N;c++){
                    const cell=document.createElement('div');
                    cell.className='nw-cell'+(FIX[r][c]?' fixed':'');
                    const m = tileMask(r,c);
                    const center=document.createElement('div'); center.className='center'; cell.appendChild(center);
                    if (has(m,U)){ const seg=document.createElement('div'); seg.className='seg up'; cell.appendChild(seg); }
                    if (has(m,R)){ const seg=document.createElement('div'); seg.className='seg right'; cell.appendChild(seg); }
                    if (has(m,D)){ const seg=document.createElement('div'); seg.className='seg down'; cell.appendChild(seg); }
                    if (has(m,L)){ const seg=document.createElement('div'); seg.className='seg left'; cell.appendChild(seg); }
                    
                    if (!FIX[r][c]){
                        cell.addEventListener('click', ()=>{ rot[r][c]=(rot[r][c]+1)%4; render(); });
                    }
                    boardEl.appendChild(cell);
                }
            }
        }

        function validate(live=false){
            clearInvalid();
            let ok=true;
            // Check all adjacencies match
            for (let r=0;r<N;r++){
                for (let c=0;c<N;c++){
                    const m=tileMask(r,c);
                    // Up neighbor
                    if (r>0){ const mu=tileMask(r-1,c); if (has(m,U)!==has(mu,D)){ ok=false; markInvalid(r,c); markInvalid(r-1,c); } }
                    else if (has(m,U)){ ok=false; markInvalid(r,c); }
                    // Down
                    if (r<N-1){ const md=tileMask(r+1,c); if (has(m,D)!==has(md,U)){ ok=false; markInvalid(r,c); markInvalid(r+1,c); } }
                    else if (has(m,D)){ ok=false; markInvalid(r,c); }
                    // Left
                    if (c>0){ const ml=tileMask(r,c-1); if (has(m,L)!==has(ml,R)){ ok=false; markInvalid(r,c); markInvalid(r,c-1); } }
                    else if (has(m,L)){ ok=false; markInvalid(r,c); }
                    // Right
                    if (c<N-1){ const mr=tileMask(r,c+1); if (has(m,R)!==has(mr,L)){ ok=false; markInvalid(r,c); markInvalid(r,c+1); } }
                    else if (has(m,R)){ ok=false; markInvalid(r,c); }
                }
            }
            // Optional: single connected component (ignore empty tiles)
            function isConnector(m){ return m!==0; }
            const visited=new Set();
            function k(r,c){ return r+","+c; }
            function dfs(r,c){ const mk=tileMask(r,c); visited.add(k(r,c)); const dirs=[[U,-1,0,D],[D,1,0,U],[L,0,-1,R],[R,0,1,L]]; for(const [d,dr,dc,opp] of dirs){ const nr=r+dr,nc=c+dc; if(nr<0||nr>=N||nc<0||nc>=N) continue; const m2=tileMask(nr,nc); if(has(mk,d)&&has(m2,opp)&&!visited.has(k(nr,nc))) dfs(nr,nc); }
            }
            // Find first non-empty
            let sr=-1, sc=-1; for(let r=0;r<N;r++){ for(let c=0;c<N;c++){ if(isConnector(tileMask(r,c))){ sr=r; sc=c; break; } } if(sr!==-1) break; }
            if (sr!==-1){ dfs(sr,sc); for(let r=0;r<N;r++) for(let c=0;c<N;c++){ if(isConnector(tileMask(r,c)) && !visited.has(k(r,c))){ ok=false; markInvalid(r,c); } } }

            return ok;
        }

        function isComplete(){ return validate(false); }
        function checkWin(){ if (isComplete()){ showModal('Network complete!'); setTimeout(onWin, 400); } else { showModal('Connections mismatch or open ends.'); } }
        function reset(){ rot = Array.from({length:N}, ()=>Array(N).fill(0)); render(); clearInvalid(); }

        // Quick solvability check via backtracking respecting local adjacencies and borders; ensures a single connected component at the end.
        function isSolvable(){
            const rotWork = Array.from({length:N}, ()=>Array(N).fill(0));
            function maskAt(r,c){ return rotateMask(PUZ[r][c], rotWork[r][c]); }
            function bordersOk(r,c,m){
                if (r===0 && has(m,U)) return false;
                if (r===N-1 && has(m,D)) return false;
                if (c===0 && has(m,L)) return false;
                if (c===N-1 && has(m,R)) return false;
                return true;
            }
            function localOk(r,c){
                const m=maskAt(r,c);
                if (!bordersOk(r,c,m)) return false;
                if (r>0){ const mu=maskAt(r-1,c); if (has(m,U)!==has(mu,D)) return false; }
                if (c>0){ const ml=maskAt(r,c-1); if (has(m,L)!==has(ml,R)) return false; }
                return true;
            }
            function backtrack(idx){
                if (idx===N*N){
                    // single component check
                    const visited=new Set();
                    function k(r,c){ return r+","+c; }
                    function isConnector(m){ return m!==0; }
                    function dfs(r,c){ const mk=maskAt(r,c); visited.add(k(r,c)); const dirsArr=[[U,-1,0,D],[D,1,0,U],[L,0,-1,R],[R,0,1,L]]; for(const [d,dr,dc,opp] of dirsArr){ const nr=r+dr,nc=c+dc; if(nr<0||nr>=N||nc<0||nc>=N) continue; const m2=maskAt(nr,nc); if(has(mk,d)&&has(m2,opp)&&!visited.has(k(nr,nc))) dfs(nr,nc); }
                    }
                    let sr=-1, sc=-1; for(let r=0;r<N;r++){ for(let c=0;c<N;c++){ if(isConnector(maskAt(r,c))){ sr=r; sc=c; break; } } if(sr!==-1) break; }
                    if (sr!==-1){ dfs(sr,sc); for(let r=0;r<N;r++) for(let c=0;c<N;c++){ if(isConnector(maskAt(r,c)) && !visited.has(k(r,c))) return false; } }
                    return true;
                }
                const r = Math.floor(idx/N), c = idx%N;
                // try rotations 0..3
                for (let t=0;t<4;t++){
                    rotWork[r][c]=t;
                    if (localOk(r,c)){
                        if (backtrack(idx+1)) return true;
                    }
                }
                rotWork[r][c]=0;
                return false;
            }
            try { return backtrack(0); } catch(e){ return false; }
        }

        // On reset, quickly warn if the current puzzle spec appears unsolvable
        function warnIfUnsolvable(){ setTimeout(()=>{ if (!isSolvable()) console.warn('Network puzzle may be unsolvable with current specification.'); }, 0); }

        render();
        helpBtn.addEventListener('click', showHelp);
        resetBtn.addEventListener('click', reset);
        checkBtn.addEventListener('click', checkWin);
        warnIfUnsolvable();
    }

    // 18) Neighbours (Day 18)
    function neighborsGame(root, onWin) {
        root.innerHTML = '';
        const N = 6; // 6x6 Latin grid
        // Use a known Latin square solution and derive symbols from it to guarantee solvability.
        const SOL = [
            [1,4,6,3,5,2],
            [2,3,5,4,1,6],
            [6,5,1,2,4,3],
            [3,6,4,1,2,5],
            [5,1,2,6,3,4],
            [4,2,3,5,6,1],
        ];
        // Derive symbols: true where neighbors differ by 1, false otherwise
        const horizontalSymbols = Array.from({length:N}, ()=>Array(N-1).fill(false));
        const verticalSymbols = Array.from({length:N-1}, ()=>Array(N).fill(false));
        for (let r=0;r<N;r++){
            for (let c=0;c<N-1;c++){
                horizontalSymbols[r][c] = Math.abs(SOL[r][c]-SOL[r][c+1])===1;
            }
        }
        for (let r=0;r<N-1;r++){
            for (let c=0;c<N;c++){
                verticalSymbols[r][c] = Math.abs(SOL[r][c]-SOL[r+1][c])===1;
            }
        }

        // Optional givens as [r,c,value]
        const GIVENS = [
            [0,0,SOL[0][0]],
            [0,3,SOL[0][3]],
            [1,5,SOL[1][5]],
            [2,2,SOL[2][2]],
            [3,0,SOL[3][0]],
            [3,4,SOL[3][4]],
            [4,1,SOL[4][1]],
            [5,5,SOL[5][5]],
        ];

        let board = Array.from({length:N}, ()=>Array(N).fill(0));
        for (const [r,c,v] of GIVENS) board[r][c]=v;
        let cellEls = Array.from({length:N}, ()=>Array(N).fill(null));

        const wrap = document.createElement('div');
        wrap.className = 'nb-wrapper';
        wrap.innerHTML = `
            <h3>Neighbours</h3>
            <div class="nb-container">
              <aside class="nb-sidebar">
                <div class="nb-info">Complete the grid so each row and column contains 1–${N} exactly once. If there is a symbol between two squares, their numbers must be neighbours (differ by 1). If there is NOT a symbol, their numbers must NOT be neighbours.</div>
                <div class="nb-controls">
                    <button class="comic-btn-small" id="nb-check">Check</button>
                    <button class="comic-btn-small" id="nb-reset">Reset</button>
                    <button class="comic-btn-small" id="nb-help">How to play</button>
                </div>
              </aside>
              <div class="nb-board" id="nb-board" style="grid-template-columns: repeat(${N}, 34px); grid-template-rows: repeat(${N}, 34px);"></div>
            </div>
        `;
        root.appendChild(wrap);

        const boardEl = wrap.querySelector('#nb-board');
        const checkBtn = wrap.querySelector('#nb-check');
        const resetBtn = wrap.querySelector('#nb-reset');
        const helpBtn = wrap.querySelector('#nb-help');

        function showHelp(){
            showModal(`Rules:\n- Fill 1–${N} once per row and column.\n- A symbol between two squares means their numbers differ by 1.\n- No symbol means their numbers do NOT differ by 1.\nControls:\n- Click a non-given cell to cycle its value.`);
        }
        function isGiven(r,c){ return GIVENS.some(g=>g[0]===r && g[1]===c); }
        function clearInvalid(){ Array.from(boardEl.children).forEach(el=>el.classList.remove('invalid')); }
        function markInvalid(r,c){ const idx=r*N+c; const el=boardEl.children[idx]; if(el) el.classList.add('invalid'); }

        function render(){
            boardEl.innerHTML = '';
            cellEls = Array.from({length:N}, ()=>Array(N).fill(null));
            for (let r=0;r<N;r++){
                for (let c=0;c<N;c++){
                    const cell=document.createElement('div');
                    cell.className='nb-cell'+(isGiven(r,c)?' given':'');
                    cell.textContent = board[r][c]||'';
                    // draw symbol markers on right and bottom edges
                    cell.style.position='relative';
                    if (c<N-1 && horizontalSymbols[r][c]){
                        const sym=document.createElement('div');
                        sym.style.position='absolute'; sym.style.top='50%'; sym.style.right='-4px'; sym.style.width='8px'; sym.style.height='2px'; sym.style.background='#9cf'; sym.style.transform='translateY(-50%)';
                        cell.appendChild(sym);
                    }
                    if (r<N-1 && verticalSymbols[r][c]){
                        const sym=document.createElement('div');
                        sym.style.position='absolute'; sym.style.left='50%'; sym.style.bottom='-4px'; sym.style.width='2px'; sym.style.height='8px'; sym.style.background='#9cf'; sym.style.transform='translateX(-50%)';
                        cell.appendChild(sym);
                    }
                    if (!isGiven(r,c)){
                        cell.addEventListener('click', ()=>{
                            const v = board[r][c]||0;
                            board[r][c] = v===N ? 0 : v+1; // cycle 0→1→…→N→0
                            render();
                        });
                    }
                    boardEl.appendChild(cell);
                    cellEls[r][c]=cell;
                }
            }
        }

        function validate(live=false){
            clearInvalid();
            let ok=true;
            // Latin constraints
            for (let r=0;r<N;r++){
                const seen=new Set();
                for (let c=0;c<N;c++){
                    const v=board[r][c];
                    if (v===0){ ok=false; markInvalid(r,c); }
                    else if (seen.has(v)){ ok=false; markInvalid(r,c); }
                    else seen.add(v);
                }
            }
            for (let c=0;c<N;c++){
                const seen=new Set();
                for (let r=0;r<N;r++){
                    const v=board[r][c];
                    if (v===0){ ok=false; markInvalid(r,c); }
                    else if (seen.has(v)){ ok=false; markInvalid(r,c); }
                    else seen.add(v);
                }
            }
            // Neighbour rules
            function isNeighbor(a,b){ return a!==0 && b!==0 && Math.abs(a-b)===1; }
            for (let r=0;r<N;r++){
                for (let c=0;c<N-1;c++){
                    const a=board[r][c], b=board[r][c+1];
                    const sym = horizontalSymbols[r][c];
                    if (sym){ if (a!==0 && b!==0 && !isNeighbor(a,b)){ ok=false; markInvalid(r,c); markInvalid(r,c+1); } }
                    else { if (a!==0 && b!==0 && isNeighbor(a,b)){ ok=false; markInvalid(r,c); markInvalid(r,c+1); } }
                }
            }
            for (let r=0;r<N-1;r++){
                for (let c=0;c<N;c++){
                    const a=board[r][c], b=board[r+1][c];
                    const sym = verticalSymbols[r][c];
                    if (sym){ if (a!==0 && b!==0 && !isNeighbor(a,b)){ ok=false; markInvalid(r,c); markInvalid(r+1,c); } }
                    else { if (a!==0 && b!==0 && isNeighbor(a,b)){ ok=false; markInvalid(r,c); markInvalid(r+1,c); } }
                }
            }
            return ok;
        }

        function isComplete(){ return validate(false); }
        function checkWin(){ if (isComplete()){ showModal('All neighbours and Latin rules satisfied!'); setTimeout(onWin, 400); } else { showModal('Conflicts with Latin or neighbour rules.'); } }
        function reset(){ board = Array.from({length:N}, ()=>Array(N).fill(0)); for (const [r,c,v] of GIVENS) board[r][c]=v; render(); clearInvalid(); }

        // Internal solver helpers (kept for dev use)
        function neighborsOk(r,c,val){
            // check horizontal neighbors
            if (c>0){ const left=board[r][c-1]; const sym=horizontalSymbols[r][c-1]; if (left){ const diff=Math.abs(left-val)===1; if (sym && !diff) return false; if (!sym && diff) return false; } }
            if (c<N-1){ const right=board[r][c+1]; const sym=horizontalSymbols[r][c]; if (right){ const diff=Math.abs(right-val)===1; if (sym && !diff) return false; if (!sym && diff) return false; } }
            // vertical
            if (r>0){ const up=board[r-1][c]; const sym=verticalSymbols[r-1][c]; if (up){ const diff=Math.abs(up-val)===1; if (sym && !diff) return false; if (!sym && diff) return false; } }
            if (r<N-1){ const down=board[r+1][c]; const sym=verticalSymbols[r][c]; if (down){ const diff=Math.abs(down-val)===1; if (sym && !diff) return false; if (!sym && diff) return false; } }
            return true;
        }
        function solve(){
            const rowUsed = Array.from({length:N}, ()=>Array(N+1).fill(false));
            const colUsed = Array.from({length:N}, ()=>Array(N+1).fill(false));
            for (let r=0;r<N;r++) for (let c=0;c<N;c++){ const v=board[r][c]; if (v){ rowUsed[r][v]=true; colUsed[c][v]=true; } }
            const cells=[];
            for (let r=0;r<N;r++) for (let c=0;c<N;c++) if (!board[r][c]) cells.push([r,c]);
            function backtrack(i){
                if (i===cells.length) return true;
                const [r,c]=cells[i];
                for (let v=1; v<=N; v++){
                    if (rowUsed[r][v]||colUsed[c][v]) continue;
                    if (!neighborsOk(r,c,v)) continue;
                    board[r][c]=v; rowUsed[r][v]=true; colUsed[c][v]=true;
                    if (backtrack(i+1)) return true;
                    board[r][c]=0; rowUsed[r][v]=false; colUsed[c][v]=false;
                }
                return false;
            }
            const ok = backtrack(0);
            if (!ok) showModal('No solution found for this symbol layout.');
            render();
            return ok;
        }

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

    // 19) Aquarium (Day 19)
    function aquariumGame(root, onWin) {
        root.innerHTML = '';
        const N = 6; // 6x6
        const EMPTY = 0, WATER = 1, AIR = 2; // user states; AIR is just marked empty
        // Hardcoded intermediate puzzle: regions (aquariums) labeled 0..K-1
        // Each cell has a region id; water in a region must be bottom-anchored per column within that region.
        // Regions from PNG (IDs per provided matrix)
        const REG = [
            [0,0,1,1,1,1],
            [2,0,0,1,1,1],
            [2,2,3,3,4,4],
            [5,6,6,7,8,4],
            [5,5,7,7,8,4
                
            ],
            [5,8,8,8,8,8],
        ];
        // Row and column clues: number of water cells required
        // Clues from PNG
        const ROW = [2,5,4,5,5,1];
        const COL = [5,5,4,4,1,3];

        let board = Array.from({length:N}, ()=>Array(N).fill(EMPTY));
        let cellEls = Array.from({length:N}, ()=>Array(N).fill(null));

        const wrap = document.createElement('div');
        wrap.className = 'aq-wrapper';
        wrap.innerHTML = `
            <h3>Aquarium</h3>
            <div class="aq-container">
              <aside class="aq-sidebar">
                <div class="aq-info">Fill water so each row and column matches its clue. Within each aquarium region, water settles to the bottom: no water cell may have empty below in the same region.</div>
                <div class="aq-controls">
                    <button class="comic-btn-small" id="aq-check">Check</button>
                    <button class="comic-btn-small" id="aq-reset">Reset</button>
                    <button class="comic-btn-small" id="aq-help">How to play</button>
                </div>
              </aside>
              <div class="aq-board" id="aq-board" style="grid-template-columns: 34px repeat(${N}, 34px); grid-template-rows: repeat(${N}, 34px) 34px;"></div>
            </div>
        `;
        root.appendChild(wrap);

        const boardEl = wrap.querySelector('#aq-board');
        const checkBtn = wrap.querySelector('#aq-check');
        const resetBtn = wrap.querySelector('#aq-reset');
        const helpBtn = wrap.querySelector('#aq-help');

        function showHelp(){
            showModal(`Rules:\n- Click a cell to cycle: Empty → Water → Air (helper).\n- Match row and column water counts.\n- In each aquarium, water must be bottom-anchored: if a cell has water, all cells below it in the same region must also be water.`);
        }
        function clearInvalid(){ Array.from(boardEl.children).forEach(el=>el.classList.remove('invalid')); }
        function markInvalidIdx(idx){ const el=boardEl.children[idx]; if(el) el.classList.add('invalid'); }
        function idxCell(r,c){ const topOffset = 1; const rowStride = 1 + N; return topOffset + r*rowStride + 1 + c; }
        function colorForRegion(id){ const palette=['#e3f2fd','#fce4ec','#e8f5e9','#fff3e0','#ede7f6','#f3e5f5','#e0f7fa','#f1f8e9','#e8eaf6','#f9fbe7','#e0f2f1','#fffde7','#ede7f6','#f3e5f5','#e0f7fa','#f1f8e9']; return palette[id%palette.length]; }

        function render(){
            boardEl.innerHTML = '';
            // top clues
            const corner=document.createElement('div'); corner.className='aq-clue'; corner.textContent=''; boardEl.appendChild(corner);
            for (let c=0;c<N;c++){ const el=document.createElement('div'); el.className='aq-clue'; el.textContent=String(COL[c]); boardEl.appendChild(el); }
            // rows
            for (let r=0;r<N;r++){
                const left=document.createElement('div'); left.className='aq-clue'; left.textContent=String(ROW[r]); boardEl.appendChild(left);
                for (let c=0;c<N;c++){
                    const cell=document.createElement('div');
                    cell.className='aq-cell';
                    const state=board[r][c];
                    // Apply water visual first; otherwise show region tint
                    if (state===WATER){
                        cell.classList.add('water');
                        cell.style.background = '';
                    } else {
                        if (state===AIR) cell.classList.add('air');
                        cell.style.background = colorForRegion(REG[r][c]);
                    }
                    // draw aquarium borders: thick borders where adjacent region differs
                    const id = REG[r][c];
                    const topDiff = r===0 || REG[r-1][c]!==id;
                    const bottomDiff = r===N-1 || REG[r+1][c]!==id;
                    const leftDiff = c===0 || REG[r][c-1]!==id;
                    const rightDiff = c===N-1 || REG[r][c+1]!==id;
                    cell.style.borderTop = `${topDiff? '3px' : '1px'} solid #2a4365`;
                    cell.style.borderBottom = `${bottomDiff? '3px' : '1px'} solid #2a4365`;
                    cell.style.borderLeft = `${leftDiff? '3px' : '1px'} solid #2a4365`;
                    cell.style.borderRight = `${rightDiff? '3px' : '1px'} solid #2a4365`;
                    cell.addEventListener('click', ()=>{
                        const v = board[r][c];
                        // First click should fill with water
                        board[r][c] = v===EMPTY ? WATER : (v===WATER ? AIR : EMPTY);
                        render();
                    });
                    boardEl.appendChild(cell);
                    cellEls[r][c]=cell;
                }
            }
            // bottom spacer
            const spacer=document.createElement('div'); spacer.className='aq-clue'; spacer.textContent=''; boardEl.appendChild(spacer);
            for (let c=0;c<N;c++){ const el=document.createElement('div'); el.className='aq-clue'; el.textContent=''; boardEl.appendChild(el); }
        }

        function validate(live=false){
            clearInvalid();
            let ok=true;
            // row counts
            for (let r=0;r<N;r++){
                let cnt=0; for (let c=0;c<N;c++) if (board[r][c]===WATER) cnt++;
                if (!live && cnt!==ROW[r]){ ok=false; for (let c=0;c<N;c++) if (board[r][c]===WATER) markInvalidIdx(idxCell(r,c)); }
                if (live && cnt>ROW[r]){ ok=false; for (let c=0;c<N;c++) if (board[r][c]===WATER) markInvalidIdx(idxCell(r,c)); }
            }
            // col counts
            for (let c=0;c<N;c++){
                let cnt=0; for (let r=0;r<N;r++) if (board[r][c]===WATER) cnt++;
                if (!live && cnt!==COL[c]){ ok=false; for (let r=0;r<N;r++) if (board[r][c]===WATER) markInvalidIdx(idxCell(r,c)); }
                if (live && cnt>COL[c]){ ok=false; for (let r=0;r<N;r++) if (board[r][c]===WATER) markInvalidIdx(idxCell(r,c)); }
            }
            // aquarium gravity: for each region, in each column, water cells form a bottom segment (no empty below water)
            const regionCols = new Map();
            for (let r=0;r<N;r++) for (let c=0;c<N;c++){
                const id=REG[r][c]; const key=id+":"+c; if (!regionCols.has(key)) regionCols.set(key, []); regionCols.get(key).push(r);
            }
            regionCols.forEach(rows=>{
                rows.sort((a,b)=>a-b);
                // find lowest row in this column for the region
                const bottom = rows[rows.length-1];
                // scan from top to bottom: once we see WATER, no EMPTY allowed below
                let seenWater=false;
                for (const r of rows){
                    const state = board[r][rows.key?0:0]; // placeholder to avoid key; we'll index by column outside map
                }
            });
            // Implement gravity check directly without map
            for (let c=0;c<N;c++){
                // group by region per column
                const groups = new Map();
                for (let r=0;r<N;r++){
                    const id=REG[r][c]; if (!groups.has(id)) groups.set(id, []); groups.get(id).push(r);
                }
                groups.forEach(rows=>{
                    rows.sort((a,b)=>a-b); // top to bottom
                    let seenWater=false;
                    for (let i=0; i<rows.length; i++){
                        const r=rows[i];
                        const st=board[r][c];
                        if (st===WATER){ seenWater=true; }
                        else {
                            // if we have water above and this is empty, then there is empty below water → violation
                            if (seenWater){ ok=false; markInvalidIdx(idxCell(r,c)); }
                        }
                    }
                });
            }

            return ok;
        }

        function isComplete(){ return validate(false); }
        function checkWin(){ if (isComplete()){ showModal('All aquariums filled correctly!'); setTimeout(onWin, 400); } else { showModal('Row/column counts or gravity rule violated.'); } }
        function reset(){ board = Array.from({length:N}, ()=>Array(N).fill(EMPTY)); render(); clearInvalid(); }

        render();
        helpBtn.addEventListener('click', showHelp);
        resetBtn.addEventListener('click', reset);
        checkBtn.addEventListener('click', checkWin);
    }

    // 20) Slitherlink (Day 20)
    function slitherlinkGame(root, onWin) {
        root.innerHTML = '';
        const R=5, C=5; // 5x5 cells
        // Intermediate puzzle clues (null denotes no clue)
        const CLUE = [
            [null,1,2,2,null],
            [null,null,2,null,null],
            [null,2,null,3,null],
            [null,null,null,2,1],
            [null,3,null,3,3],
        ];
        // Edge state grid: horizontal edges (R+1 x C), vertical edges (R x C+1). 0=off,1=on
        let H = Array.from({length:R+1}, ()=>Array(C).fill(0));
        let V = Array.from({length:R}, ()=>Array(C+1).fill(0));

        const wrap = document.createElement('div');
        wrap.className = 'sl-wrapper';
                wrap.innerHTML = `
            <h3>Slitherlink</h3>
            <div class="sl-container">
              <aside class="sl-sidebar">
                <div class="sl-info">Draw a single loop. Each numbered cell indicates how many of its four edges belong to the loop. The loop must not branch or cross itself.</div>
                <div class="sl-controls">
                    <button class="comic-btn-small" id="sl-check">Check</button>
                    <button class="comic-btn-small" id="sl-reset">Reset</button>
                    <button class="comic-btn-small" id="sl-help">How to play</button>
                </div>
              </aside>
              <div class="sl-board" id="sl-board" style="grid-template-columns: repeat(${C*2+1}, 24px); grid-template-rows: repeat(${R*2+1}, 24px);"></div>
            </div>
        `;
        root.appendChild(wrap);

        const boardEl = wrap.querySelector('#sl-board');
        const checkBtn = wrap.querySelector('#sl-check');
        const resetBtn = wrap.querySelector('#sl-reset');
        const helpBtn = wrap.querySelector('#sl-help');

        function showHelp(){
            showModal('Toggle edges to form a single loop. Numbers tell how many of the cell\'s edges are part of the loop. No branches, no crossings.');
        }
        function clearInvalid(){ Array.from(boardEl.children).forEach(el=>el.classList.remove('invalid')); }
        function markInvalidCell(r,c){ const idx = gridIndexCell(r,c); const el=boardEl.children[idx]; if(el) el.classList.add('invalid'); }
        // Build board as interleaved points and edges: (2r,2c)=dot; (2r,2c+1)=h edge; (2r+1,2c)=v edge; (2r+1,2c+1)=cell
        function gridIndexCell(r,c){ return (2*r+1)*(C*2+1) + (2*c+1); }
        function render(){
            boardEl.innerHTML = '';
            for (let rr=0; rr<R*2+1; rr++){
                for (let cc=0; cc<C*2+1; cc++){
                    const el=document.createElement('div');
                    if (rr%2===0 && cc%2===0){ // dot
                        el.className='sl-dot';
                    } else if (rr%2===0 && cc%2===1){ // horizontal edge between cells
                        const r = rr/2, c = (cc-1)/2;
                        el.className = 'sl-edge h'+(H[r][c]?' on':'');
                        el.addEventListener('click', ()=>{ H[r][c] = H[r][c]?0:1; render(); });
                    } else if (rr%2===1 && cc%2===0){ // vertical edge
                        const r = (rr-1)/2, c = cc/2;
                        el.className = 'sl-edge v'+(V[r][c]?' on':'');
                        el.addEventListener('click', ()=>{ V[r][c] = V[r][c]?0:1; render(); });
                    } else { // cell
                        const r = (rr-1)/2, c = (cc-1)/2;
                        el.className='sl-cell';
                        const clue = CLUE[r][c];
                        el.textContent = clue==null? '' : String(clue);
                    }
                    boardEl.appendChild(el);
                }
            }
        }

        function validate(){
            clearInvalid();
            let ok=true;
            // Check clues
            for (let r=0;r<R;r++){
                for (let c=0;c<C;c++){
                    const clue=CLUE[r][c]; if (clue==null) continue;
                    const cnt = (H[r][c]?1:0) + (H[r+1][c]?1:0) + (V[r][c]?1:0) + (V[r][c+1]?1:0);
                    if (cnt!==clue){ ok=false; markInvalidCell(r,c); }
                }
            }
            // Graph checks: degree 0 or 2 at each dot; single loop (one component, no branches)
            const deg = Array.from({length:R+1}, ()=>Array(C+1).fill(0));
            for (let r=0;r<=R;r++) for (let c=0;c<=C;c++){
                let d=0;
                // Adjacent edges to dot (r,c): left/right from H, up/down from V
                if (c>0 && H[r][c-1]) d++;      // left horizontal
                if (c<C && H[r][c]) d++;        // right horizontal
                if (r>0 && V[r-1][c]) d++;      // up vertical
                if (r<R && V[r][c]) d++;        // down vertical
                deg[r][c]=d;
                if (d!==0 && d!==2) ok=false;
            }
            // Find any dot with degree>0 and DFS
            function hasH(rr, cc){ return rr>=0 && rr<=R && cc>=0 && cc<C && H[rr][cc]===1; }
            function hasV(rr, cc){ return rr>=0 && rr<R && cc>=0 && cc<=C && V[rr][cc]===1; }
            function neighborsDot(r,c){
                const res=[];
                // left/right via H
                if (c>0 && hasH(r, c-1)) res.push([r, c-1]);
                if (c<C && hasH(r, c))   res.push([r, c+1]);
                // up/down via V
                if (r>0 && hasV(r-1, c)) res.push([r-1, c]);
                if (r<R && hasV(r, c))   res.push([r+1, c]);
                return res;
            }
            const visited=new Set();
            let sr=-1, sc=-1;
            for (let r=0;r<=R;r++){
                for (let c=0;c<=C;c++){
                    if (deg[r][c]>0){ sr=r; sc=c; break; }
                }
                if (sr!==-1) break;
            }
            if (sr!==-1){
                const stack=[[sr,sc]];
                visited.add(sr+","+sc);
                while(stack.length){
                    const [r,c]=stack.pop();
                    for (const [nr,nc] of neighborsDot(r,c)){
                        const k=nr+","+nc; if(!visited.has(k)){ visited.add(k); stack.push([nr,nc]); }
                    }
                }
                // All dots with degree>0 must be visited
                for (let r=0;r<=R;r++) for (let c=0;c<=C;c++){
                    if (deg[r][c]>0 && !visited.has(r+","+c)) ok=false;
                }
            }
            return ok;
        }

        function isComplete(){ return validate(); }
        function checkWin(){ if (isComplete()){ showModal('Loop complete!'); setTimeout(onWin, 400); } else { showModal('Edges conflict: check clues or loop continuity.'); } }
        function reset(){ H = Array.from({length:R+1}, ()=>Array(C).fill(0)); V = Array.from({length:R}, ()=>Array(C+1).fill(0)); render(); clearInvalid(); }


        render();
        helpBtn.addEventListener('click', showHelp);
        resetBtn.addEventListener('click', reset);
        checkBtn.addEventListener('click', checkWin);
    }

    // 21) Binairo (Day 21) - 14x14
    function binairoGame(root, onWin){
        root.innerHTML='';
        const N=10;
        // 0=empty, 1=black, 2=red
        let G = Array.from({length:N}, ()=>Array(N).fill(0));
        // Clues from provided 10x10 pattern (1=black,2=red,0=empty). Internal: 1=black, 2=red.
        // More clues added for easier solving
        const CLUES = [
            // row 0: 1000020110
            [0,0,1],[0,5,2],[0,7,1],[0,8,1],
            // row 1: 0220000010
            [1,1,2],[1,2,2],[1,8,1],
            // row 2: 0010102000
            [2,2,1],[2,4,1],[2,6,2],
            // row 3: 1002020100
            [3,0,1],[3,3,2],[3,5,2],[3,7,1],
            // row 4: 1000000000
            [4,0,1],
            // row 5: 0000000100
            [5,7,1],
            // row 6: 0001000000
            [6,3,1],
            // row 7: 0000000000
            // row 8: 0200002000
            [8,1,2],[8,6,2],
            // row 9: 0002020000
            [9,3,2],[9,5,2],
        ];
        for (const [r,c,v] of CLUES){ G[r][c]=v; }

        const wrap=document.createElement('div');
        wrap.className='bn-wrapper';
        wrap.innerHTML=`
            <h3>Binairo 10×10</h3>
            <div class="bn-container">
                            <aside class="bn-sidebar">
                <div class="bn-info">Fill the grid with black and red circles. No three consecutive identical tokens in any row or column. Each row and column contains equal numbers of black and red. All rows and columns must be unique.</div>
                                <div class="bn-controls">
                                    <button class="comic-btn-small" id="bn-check">Check</button>
                                    <button class="comic-btn-small" id="bn-reset">Reset</button>
                                    <button class="comic-btn-small" id="bn-help">How to play</button>
                                </div>
              </aside>
              <div class="bn-board" id="bn-board" style="grid-template-columns: repeat(${N}, 32px); grid-template-rows: repeat(${N}, 32px);"></div>
            </div>
        `;
        root.appendChild(wrap);

        const boardEl=wrap.querySelector('#bn-board');
        const checkBtn=wrap.querySelector('#bn-check');
        const resetBtn=wrap.querySelector('#bn-reset');
        const helpBtn=wrap.querySelector('#bn-help');

        function showHelp(){
            showModal('Click cells to toggle between empty → Black → Red. You cannot change the pre-filled clues. Check enforces: equal Blacks/Reds in each row/col, no three consecutive identical, and unique rows/cols.');
        }

        function render(){
            boardEl.innerHTML='';
            for (let r=0;r<N;r++){
                for (let c=0;c<N;c++){
                    const el=document.createElement('div');
                    const v=G[r][c];
                    el.className='bn-cell'+(CLUES.some(x=>x[0]===r&&x[1]===c)?' fixed':'');
                    if (v!==0){
                        const token=document.createElement('span');
                        token.className='bn-token '+(v===1?'black':'red');
                        el.appendChild(token);
                    }
                    if (!CLUES.some(x=>x[0]===r&&x[1]===c)){
                        el.addEventListener('click',()=>{
                            G[r][c] = (G[r][c]+1)%3; // 0->1->2->0
                            render();
                        });
                    }
                    boardEl.appendChild(el);
                }
            }
        }

        function markRowInvalid(r){
            for (let c=0;c<N;c++){
                const idx=r*N+c; const el=boardEl.children[idx]; if(el) el.classList.add('invalid');
            }
        }
        function markColInvalid(c){
            for (let r=0;r<N;r++){
                const idx=r*N+c; const el=boardEl.children[idx]; if(el) el.classList.add('invalid');
            }
        }
        function clearInvalid(){ Array.from(boardEl.children).forEach(el=>el.classList.remove('invalid')); }

        function noThreeConsecutive(arr){
            for (let i=0;i<=arr.length-3;i++){
                const a=arr[i], b=arr[i+1], d=arr[i+2];
                if (a!==0 && a===b && b===d) return false;
            }
            return true;
        }

        function equalCounts(arr){
            // Only enforce when row fully filled (no zeros meaning empty); otherwise allow partial
            if (arr.some(v=>v===0)) return true;
            let z=0, o=0;
            for (const v of arr){ if (v===1) z++; else if (v===2) o++; }
            return z===o;
        }

        function uniqueRows(){
            const seen=new Set();
            for (let r=0;r<N;r++){
                if (G[r].some(v=>v===0)) continue; // only check fully filled rows
                const key=G[r].join(',');
                if (seen.has(key)) return false;
                seen.add(key);
            }
            return true;
        }
        function uniqueCols(){
            const seen=new Set();
            for (let c=0;c<N;c++){
                let col=[]; let full=true;
                for (let r=0;r<N;r++){ const v=G[r][c]; if(v===0) full=false; col.push(v); }
                if (!full) continue;
                const key=col.join(',');
                if (seen.has(key)) return false;
                seen.add(key);
            }
            return true;
        }

        function validate(){
            clearInvalid();
            let ok=true;
            // rows
            for (let r=0;r<N;r++){
                const row=[...G[r]];
                if (!noThreeConsecutive(row)){ ok=false; markRowInvalid(r); }
                if (!equalCounts(row)){ ok=false; markRowInvalid(r); }
            }
            // cols
            for (let c=0;c<N;c++){
                const col=[]; for (let r=0;r<N;r++) col.push(G[r][c]);
                if (!noThreeConsecutive(col)){ ok=false; markColInvalid(c); }
                if (!equalCounts(col)){ ok=false; markColInvalid(c); }
            }
            if (!uniqueRows()) ok=false;
            if (!uniqueCols()) ok=false;
            return ok;
        }

        function isComplete(){
            // all filled and valid
            for (let r=0;r<N;r++) for (let c=0;c<N;c++) if (G[r][c]===0) return false;
            return validate();
        }

        function check(){ if (validate()){ if (isComplete()){ showModal('Binairo complete!'); setTimeout(onWin, 400); } else { showModal('Looks good so far. Keep going!'); } } else { showModal('Some rows/cols violate rules.'); } }
        function reset(){ G = Array.from({length:N}, ()=>Array(N).fill(0)); for (const [r,c,v] of CLUES){ G[r][c]=v; } render(); clearInvalid(); }


        render();
        helpBtn.addEventListener('click', showHelp);
        resetBtn.addEventListener('click', reset);
        checkBtn.addEventListener('click', check);
    }

    // 24) Sudoku (Day 24) - Hard 9x9
    function sudokuGame(root, onWin){
        root.innerHTML='';
        const N=9;
        // Hard puzzle (0 = empty). Source: curated hard, single-solution.
        const PUZ = [
            // Based on provided image
            [0,0,9, 0,2,0, 0,0,1],
            [0,0,1, 0,4,0, 9,0,0],
            [0,5,6, 0,0,0, 0,0,0],

            [4,0,0, 0,1,0, 0,6,0],
            [9,0,0, 7,0,0, 3,0,0],
            [0,0,0, 4,5,0, 0,0,7],

            [0,0,0, 9,0,0, 6,8,0],
            [0,0,0, 2,0,0, 0,0,4],
            [7,0,0, 8,0,0, 0,0,0],
        ];
        let G = PUZ.map(row=>row.slice());

        const wrap=document.createElement('div');
        wrap.className='sdk-wrapper';
        wrap.innerHTML=`
            <h3>Sudoku</h3>
            <div class="sdk-container">
              <aside class="sdk-sidebar">
                <div class="sdk-info">Fill digits 1–9 so each row, column, and 3×3 box contains each number exactly once. Fixed clues cannot be changed.</div>
                <div class="sdk-controls">
                  <button class="comic-btn-small" id="sdk-check">Check</button>
                  <button class="comic-btn-small" id="sdk-reset">Reset</button>
                  <button class="comic-btn-small" id="sdk-help">How to play</button>
                </div>
                <div class="sdk-pad" id="sdk-pad">
                  <button data-n="1">1</button>
                  <button data-n="2">2</button>
                  <button data-n="3">3</button>
                  <button data-n="4">4</button>
                  <button data-n="5">5</button>
                  <button data-n="6">6</button>
                  <button data-n="7">7</button>
                  <button data-n="8">8</button>
                  <button data-n="9">9</button>
                  <button data-n="0" class="erase">Erase</button>
                </div>
              </aside>
              <div class="sdk-board" id="sdk-board" style="grid-template-columns: repeat(${N}, 36px); grid-template-rows: repeat(${N}, 36px);"></div>
            </div>
        `;
        root.appendChild(wrap);

        const boardEl=wrap.querySelector('#sdk-board');
        const checkBtn=wrap.querySelector('#sdk-check');
        const resetBtn=wrap.querySelector('#sdk-reset');
        const helpBtn=wrap.querySelector('#sdk-help');
        const padEl=wrap.querySelector('#sdk-pad');

        let sel=[-1,-1];
        let hiVal=0; // current highlighted digit (0 = none)

        function isFixed(r,c){ return PUZ[r][c]!==0; }
        function showHelp(){
            showModal('Click a cell, then use the number pad or keyboard 1–9 to set a digit. Use Erase to clear. Rows, columns, and 3×3 boxes must contain digits 1–9 without repeats.');
        }
        function clearInvalid(){ Array.from(boardEl.children).forEach(el=>el.classList.remove('invalid','selected')); }
        function clearSame(){ Array.from(boardEl.children).forEach(el=>el.classList.remove('same')); }
        function applyHighlight(){
            clearSame();
            if (hiVal>0){
                for (let r=0;r<N;r++){
                    for (let c=0;c<N;c++){
                        if (G[r][c]===hiVal){ const idx=r*N+c; boardEl.children[idx]?.classList.add('same'); }
                    }
                }
            }
        }
        function highlightSame(val){ hiVal = val||0; applyHighlight(); }
        function render(){
            boardEl.innerHTML='';
            for (let r=0;r<N;r++){
                for (let c=0;c<N;c++){
                    const el=document.createElement('div');
                    el.className='sdk-cell';
                    if (isFixed(r,c)) el.classList.add('fixed');
                    if (sel[0]===r && sel[1]===c) el.classList.add('selected');
                    el.textContent = G[r][c]===0? '' : String(G[r][c]);
                    el.addEventListener('click',()=>{ sel=[r,c]; renderHighlight(); highlightSame(G[r][c]); });
                    // Box thick borders
                    if (c%3===0) el.style.borderLeftWidth='2px';
                    if (r%3===0) el.style.borderTopWidth='2px';
                    if ((c+1)%3===0) el.style.borderRightWidth='2px';
                    if ((r+1)%3===0) el.style.borderBottomWidth='2px';
                    boardEl.appendChild(el);
                }
            }
            applyHighlight();
        }
        function renderHighlight(){
            Array.from(boardEl.children).forEach((el,idx)=>{
                const r=Math.floor(idx/N), c=idx%N;
                el.classList.toggle('selected', sel[0]===r && sel[1]===c);
            });
        }

        function markRowInvalid(r){ for (let c=0;c<N;c++){ const idx=r*N+c; boardEl.children[idx]?.classList.add('invalid'); } }
        function markColInvalid(c){ for (let r=0;r<N;r++){ const idx=r*N+c; boardEl.children[idx]?.classList.add('invalid'); } }
        function markBoxInvalid(br,bc){
            for (let r=br*3;r<br*3+3;r++) for (let c=bc*3;c<bc*3+3;c++){ const idx=r*N+c; boardEl.children[idx]?.classList.add('invalid'); }
        }
        function validGroup(vals){
            const seen=new Set();
            for (const v of vals){ if (v===0) continue; if (seen.has(v)) return false; seen.add(v); }
            return true;
        }
        function validate(){
            clearInvalid();
            let ok=true;
            // rows
            for (let r=0;r<N;r++){ if (!validGroup(G[r])){ ok=false; markRowInvalid(r); } }
            // cols
            for (let c=0;c<N;c++){ const col=[]; for (let r=0;r<N;r++) col.push(G[r][c]); if (!validGroup(col)){ ok=false; markColInvalid(c); } }
            // boxes
            for (let br=0;br<3;br++) for (let bc=0;bc<3;bc++){
                const box=[]; for (let r=br*3;r<br*3+3;r++) for (let c=bc*3;c<bc*3+3;c++) box.push(G[r][c]);
                if (!validGroup(box)){ ok=false; markBoxInvalid(br,bc); }
            }
            return ok;
        }
        function isComplete(){
            for (let r=0;r<N;r++) for (let c=0;c<N;c++) if (G[r][c]===0) return false;
            return validate();
        }
        function setCellVal(n){
            const [r,c]=sel; if (r<0||c<0) return; if (isFixed(r,c)) return; G[r][c]=n; render(); highlightSame(n); }

        function reset(){ G = PUZ.map(row=>row.slice()); sel=[-1,-1]; render(); clearInvalid(); }
        function check(){ if (validate()){ if (isComplete()){ showModal('Sudoku complete!'); setTimeout(onWin, 400); } else { showModal('Valid so far. Keep solving!'); } } else { showModal('Conflicts found in row/col/box.'); } }

        // Events
        padEl.addEventListener('click', (e)=>{
            const btn=e.target.closest('button'); if(!btn) return; const n=parseInt(btn.dataset.n,10);
            if(!Number.isInteger(n)) return;
            if (sel[0]===-1 || sel[1]===-1){
                if (n>0) highlightSame(n); else highlightSame(0);
            } else {
                setCellVal(n);
            }
        });
        window.addEventListener('keydown',(e)=>{
            if (!boardEl.contains(document.activeElement)){
                const k=e.key;
                if (k>='1'&&k<='9') { const n=parseInt(k,10); setCellVal(n); }
                else if (k==='0' || k==='Backspace' || k==='Delete') { setCellVal(0); highlightSame(0); }
            }
        });

        render();
        helpBtn.addEventListener('click', showHelp);
        resetBtn.addEventListener('click', reset);
        checkBtn.addEventListener('click', check);
    }

    // 22) Liquid Sort (Day 22) - Intermediate
    function liquidSortGame(root, onWin){
        root.innerHTML='';
        const BOTTLES = 10; // total bottles
        const CAPACITY = 4; // layers per bottle
        // Colors palette
        // Highly distinct colors for clear differentiation
        const COLORS = ['#d32f2f', '#1976d2', '#388e3c', '#fbc02d', '#7b1fa2', '#f57c00', '#455a64', '#c2185b']; // red, blue, green, yellow, purple, orange, slate, magenta
        // Predefined intermediate layout: 8 filled bottles, 2 empty
        // Color indices map to COLORS above (0..7)
        // Solvable preset (tested): arrangement allows solution with logical pours
        // Top -> bottom order per bottle
        const PRESET = [
            [0,1,2,3],
            [4,5,6,7],
            [0,4,1,5],
            [2,6,3,7],
            [0,2,4,6],
            [1,3,5,7],
            [0,5,2,7],
            [1,4,3,6],
            [],
            [],
        ];
        let state = PRESET.map(b=>b.slice());

        const wrap=document.createElement('div');
        wrap.className='ls-wrapper';
        wrap.innerHTML=`
            <h3>Liquid Sort</h3>
            <div class="ls-container">
              <aside class="ls-sidebar">
                <div class="ls-info">Sort bottles so each bottle contains a single color from top to bottom. You can pour a contiguous block of the same color from the top of one bottle into another if there is space and the top colors match or the target is empty.</div>
                <div class="ls-controls">
                  <button class="comic-btn-small" id="ls-check">Check</button>
                  <button class="comic-btn-small" id="ls-reset">Reset</button>
                  <button class="comic-btn-small" id="ls-help">How to play</button>
                </div>
              </aside>
              <div class="ls-board" id="ls-board"></div>
            </div>
        `;
        root.appendChild(wrap);

        const boardEl=wrap.querySelector('#ls-board');
        const checkBtn=wrap.querySelector('#ls-check');
        const resetBtn=wrap.querySelector('#ls-reset');
        const helpBtn=wrap.querySelector('#ls-help');

        let selected=-1;

        function showHelp(){
            showModal('Tap a source bottle, then a target bottle to pour. You can only pour a top block of same-colored layers. The target must have space and either be empty or have the same top color.');
        }

        function render(){
            boardEl.innerHTML='';
            for (let b=0;b<BOTTLES;b++){
                const bottle=document.createElement('div');
                bottle.className='ls-bottle'+(selected===b?' selected':'');
                // Render only existing layers and align to bottom to show empty headspace
                const len = state[b].length;
                for (let k=0;k<len;k++){
                    const layer=document.createElement('div');
                    const topIndex = len-1-k; // top, then next down
                    const colorIdx = state[b][topIndex];
                    layer.className='ls-layer';
                    layer.style.background = COLORS[colorIdx];
                    bottle.appendChild(layer);
                }
                bottle.addEventListener('click', ()=> handleBottleClick(b));
                boardEl.appendChild(bottle);
            }
        }

        function topBlock(b){
            const s=state[b]; if (s.length===0) return {color:null,count:0};
            const color=s[s.length-1];
            let count=1; for (let i=s.length-2;i>=0 && s[i]===color;i--) count++;
            return {color,count};
        }
        function canPour(from,to){
            if (from===to) return false;
            if (state[from].length===0) return false;
            if (state[to].length>=CAPACITY) return false;
            const {color} = topBlock(from);
            if (color===null) return false;
            if (state[to].length===0) return true; // empty target accepts one layer
            const topTo = state[to][state[to].length-1];
            return topTo===color; // only allow if matching top color
        }
        function pour(from,to){
            // Move exactly one layer per action
            if (!canPour(from,to)) return;
            const one = state[from].pop();
            state[to].push(one);
        }
        function handleBottleClick(b){
            if (selected===-1){ selected=b; render(); return; }
            if (selected===b){ selected=-1; render(); return; }
            if (canPour(selected,b)){ pour(selected,b); selected=-1; render(); }
            else { selected=b; render(); }
        }

        function isComplete(){
            for (let b=0;b<BOTTLES;b++){
                if (state[b].length===0) continue;
                if (state[b].length!==CAPACITY) return false;
                const first=state[b][0];
                for (let i=1;i<CAPACITY;i++) if (state[b][i]!==first) return false;
            }
            return true;
        }
        function check(){ if (isComplete()){ showModal('All bottles sorted!'); setTimeout(onWin, 400); } else { showModal('Not yet sorted. Keep pouring!'); } }
        function reset(){ state = PRESET.map(b=>b.slice()); selected=-1; render(); }

        render();
        helpBtn.addEventListener('click', showHelp);
        resetBtn.addEventListener('click', reset);
        checkBtn.addEventListener('click', check);
    }

    // 23) Sokoban Mini (Day 23)
    function sokobanGame(root, onWin){
        root.innerHTML='';
        // Legend: '.' floor, '#' wall, 'B' box, 'T' target, 'P' player
        // Extra-hard puzzle: more boxes/targets, choke points, many ways to deadlock
        const MAP = [
            '##############',
            '#..#..T..#..#',
            '#.B#..##..B.#',
            '#..##..B..#.#',
            '#..T..##..T.#',
            '##.##..##..##',
            '#..B..##..B.#',
            '#..##..B..#.#',
            '#..T..##..T.#',
            '##.##..##..##',
            '#..B..##..B.#',
            '#.######..#.#',
            '#..P....B..T#',
            '##############',
        ];
        const R = MAP.length, C = MAP[0].length;
        // Parse
        let player=[0,0];
        const walls=new Set();
        const targets=new Set();
        let boxes=[];
        function key(r,c){ return r+','+c; }
        for (let r=0;r<R;r++){
            for (let c=0;c<C;c++){
                const ch=MAP[r][c];
                if (ch==='#') walls.add(key(r,c));
                else if (ch==='T') targets.add(key(r,c));
                else if (ch==='B') boxes.push([r,c]);
                else if (ch==='P') player=[r,c];
            }
        }
        function boxesSet(){ const s=new Set(); for (const [r,c] of boxes) s.add(key(r,c)); return s; }
        let boxSet = boxesSet();

        const wrap=document.createElement('div');
        wrap.className='skb-wrapper';
        wrap.innerHTML=`
            <h3>Sokoban Mini</h3>
            <div class="skb-container">
              <aside class="skb-sidebar">
                <div class="skb-info">Push all boxes onto target tiles. You can only push one box at a time, and only into empty floor. Use arrow keys or WASD.</div>
                                <div class="skb-controls">
                                    <button class="comic-btn-small" id="skb-check">Check</button>
                                    <button class="comic-btn-small" id="skb-reset">Reset</button>
                                    <button class="comic-btn-small" id="skb-help">How to play</button>
                                </div>
                                <div class="skb-dpad" id="skb-dpad">
                                    <button aria-label="Up" data-dir="up">↑</button>
                                    <div class="skb-middle">
                                        <button aria-label="Left" data-dir="left">←</button>
                                        <button aria-label="Right" data-dir="right">→</button>
                                    </div>
                                    <button aria-label="Down" data-dir="down">↓</button>
                                </div>
              </aside>
              <div class="skb-board" id="skb-board" style="grid-template-columns: repeat(${C}, 28px); grid-template-rows: repeat(${R}, 28px);"></div>
            </div>
        `;
        root.appendChild(wrap);

        const boardEl=wrap.querySelector('#skb-board');
        const checkBtn=wrap.querySelector('#skb-check');
        const resetBtn=wrap.querySelector('#skb-reset');
        const helpBtn=wrap.querySelector('#skb-help');
        const dpad=wrap.querySelector('#skb-dpad');

        function showHelp(){
            showModal('Use arrow keys or WASD to move. When adjacent to a box, moving into it will push it if the space beyond is empty. Get all boxes onto targets to win.');
        }
        let facing = 'right';
        function render(){
            boardEl.innerHTML='';
            for (let r=0;r<R;r++){
                for (let c=0;c<C;c++){
                    const el=document.createElement('div');
                    el.className='skb-cell';
                    const k=key(r,c);
                    if (walls.has(k)) el.classList.add('wall');
                    else el.classList.add('floor');
                    if (targets.has(k)) el.classList.add('target');
                    if (boxSet.has(k)) el.classList.add('box');
                    if (player[0]===r && player[1]===c){
                        el.classList.add('player');
                        const icon=document.createElement('span');
                        icon.className='player-icon'+(facing==='left'?' left':'');
                        el.appendChild(icon);
                    }
                    boardEl.appendChild(el);
                }
            }
        }
        function isWin(){
            // Win when all target tiles are covered by a box.
            // This matches the user's goal-focused expectation even if extra boxes remain.
            const occupied = boxesSet();
            for (const t of targets){ if (!occupied.has(t)) return false; }
            return true;
        }
        function check(){ if (isWin()){ showModal('All boxes on targets!'); setTimeout(onWin, 400); } else { showModal('Keep pushing—some boxes aren\'t on targets yet.'); } }
        function reset(){ boxes=[]; walls.clear(); targets.clear(); boxSet=new Set();
            for (let r=0;r<R;r++) for (let c=0;c<C;c++){
                const ch=MAP[r][c];
                if (ch==='#') walls.add(key(r,c)); else if (ch==='T') targets.add(key(r,c)); else if (ch==='B') boxes.push([r,c]); else if (ch==='P') player=[r,c];
            }
            boxSet=boxesSet(); render(); }

        function tryMove(dr,dc){
            const nr=player[0]+dr, nc=player[1]+dc;
            const nk=key(nr,nc);
            if (walls.has(nk)) return; // blocked
            if (boxSet.has(nk)){
                // attempt to push
                const br=nr+dr, bc=nc+dc, bk=key(br,bc);
                if (walls.has(bk) || boxSet.has(bk)) return; // cannot push into wall or box
                // move box
                for (let i=0;i<boxes.length;i++){
                    if (boxes[i][0]===nr && boxes[i][1]===nc){ boxes[i]=[br,bc]; break; }
                }
                boxSet=boxesSet();
                player=[nr,nc];
            } else {
                // step into floor/target
                player=[nr,nc];
            }
            if (dc<0) facing='left'; else if (dc>0) facing='right';
            render();
            if (isWin()) { showModal('Solved!'); setTimeout(onWin, 400); }
        }

        window.addEventListener('keydown', (e)=>{
            const k=e.key.toLowerCase();
            if (k==='arrowup' || k==='w') tryMove(-1,0);
            else if (k==='arrowdown' || k==='s') tryMove(1,0);
            else if (k==='arrowleft' || k==='a') tryMove(0,-1);
            else if (k==='arrowright' || k==='d') tryMove(0,1);
        });

        dpad.addEventListener('click', (e)=>{
            const btn = e.target.closest('button'); if (!btn) return;
            const dir = btn.dataset.dir;
            if (dir==='up') tryMove(-1,0);
            else if (dir==='down') tryMove(1,0);
            else if (dir==='left') tryMove(0,-1);
            else if (dir==='right') tryMove(0,1);
        });

        render();
        helpBtn.addEventListener('click', showHelp);
        resetBtn.addEventListener('click', reset);
        checkBtn.addEventListener('click', check);
    }
});