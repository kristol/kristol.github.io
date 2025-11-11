// Meme Tap Rush - simple fall-and-tap canvas game
class MemeTapRush {
    constructor(options = {}) {
        this.canvas = document.getElementById(options.canvasId || 'meme-game-canvas');
        if (!this.canvas || !this.canvas.getContext) return;
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.dpr = window.devicePixelRatio || 1;
        this.entities = [];
    this.particles = [];
    this.flash = null; // { start, duration }
        this.score = 0;
        this.high = parseInt(localStorage.getItem('nov22_meme_taprush_highscore') || '0', 10);
        this.timeLeft = options.duration || 30; // seconds
        this.remaining = this.timeLeft;
        this.intervalId = null;
        this.spawnTimer = 0;
        this.spawnInterval = 700; // ms
        this.running = false;
        this.availableEmojis = ['🤡','💀','⏰','🔥','🎉','🧠','🪩','🍕'];

        this.setupCanvas();
        this.attachEvents();
        this.render();
    }

    setupCanvas() {
        // scale for high-DPI
        const ratio = this.dpr;
        this.canvas.style.width = this.width + 'px';
        this.canvas.style.height = this.height + 'px';
        this.canvas.width = Math.floor(this.width * ratio);
        this.canvas.height = Math.floor(this.height * ratio);
        this.ctx.scale(ratio, ratio);
        // simple font settings
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
    }

    attachEvents() {
        // pointer events for both touch and mouse
        // preventDefault to avoid browser gestures stealing subsequent touches
        this.canvas.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            try { if (e.pointerId && this.canvas.setPointerCapture) this.canvas.setPointerCapture(e.pointerId); } catch (err) {}
            this.onPointer(e);
        }, { passive: false });
        this.canvas.addEventListener('pointerup', (e) => {
            try { if (e.pointerId && this.canvas.releasePointerCapture) this.canvas.releasePointerCapture(e.pointerId); } catch (err) {}
        });
        this.canvas.addEventListener('pointercancel', (e) => {
            try { if (e.pointerId && this.canvas.releasePointerCapture) this.canvas.releasePointerCapture(e.pointerId); } catch (err) {}
        });
        // fallback for older touch-only browsers
        this.canvas.addEventListener('touchstart', (ev) => {
            ev.preventDefault();
            const t = ev.touches[0];
            this.onPointer({ clientX: t.clientX, clientY: t.clientY });
        }, { passive: false });
        // fallback: some browsers only reliably fire click or touchend
        this.canvas.addEventListener('click', (e) => { e.preventDefault(); this.onPointer(e); }, { passive: false });
        this.canvas.addEventListener('touchend', (ev) => {
            ev.preventDefault();
            const t = ev.changedTouches[0];
            if (t) this.onPointer({ clientX: t.clientX, clientY: t.clientY });
        }, { passive: false });
        // stop when page hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.running) this.pause();
        });

        // external controls
    document.getElementById('game-start-btn').addEventListener('click', () => this.start());
    document.getElementById('game-stop-btn').addEventListener('click', () => this.stop());
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.score = 0;
        this.remaining = this.timeLeft;
        this.entities = [];
        this.spawnTimer = 0;
        document.getElementById('game-score').textContent = '0';
        document.getElementById('game-timer').textContent = this.formatTime(this.remaining);
    document.getElementById('game-start-btn').disabled = true;
    document.getElementById('game-stop-btn').disabled = false;

        this.intervalId = setInterval(() => {
            this.tick();
        }, 1000);

        // spawn loop via timestamps
        this.lastTime = performance.now();
    }

    pause() {
        this.running = false;
        clearInterval(this.intervalId);
        document.getElementById('game-start-btn').disabled = false;
        document.getElementById('game-stop-btn').disabled = true;
    }

    stop() {
        if (!this.running) return;
        this.running = false;
        clearInterval(this.intervalId);
        this.onGameEnd();
    }

    tick() {
        this.remaining -= 1;
        if (this.remaining < 0) {
            this.stop();
            return;
        }
        document.getElementById('game-timer').textContent = this.formatTime(this.remaining);
    }

    onGameEnd() {
        // show final score, update high
        document.getElementById('game-score').textContent = this.score;
        if (this.score > this.high) {
            this.high = this.score;
            localStorage.setItem('nov22_meme_taprush_highscore', String(this.high));
            document.getElementById('game-high').textContent = this.high;
        }
    document.getElementById('game-start-btn').disabled = false;
    document.getElementById('game-stop-btn').disabled = true;

        // small confetti effect if high score
        if (this.score >= this.high) {
            if (window.launchConfetti) window.launchConfetti();
        }
    }

    spawnEntity() {
        const size = 36 + Math.random() * 28; // pixel size
        const x = 20 + Math.random() * (this.width - 40);
        const y = -30;
        const speed = 40 + Math.random() * 140; // px per second
        const emoji = this.availableEmojis[Math.floor(Math.random() * this.availableEmojis.length)];
        const value = (emoji === '💀') ? -5 : (emoji === '🔥' ? 5 : 1 + Math.floor(Math.random()*3));
        this.entities.push({x,y,size,speed,emoji,value, popped:false, popTime: 0, ring: null});
    }

    onPointer(e) {
        if (!this.running) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left);
        const y = (e.clientY - rect.top);
        // find topmost entity precisely under pointer (no fallback)
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const ent = this.entities[i];
            const dx = x - ent.x;
            const dy = y - ent.y;
            const r = ent.size/2;
            if (!ent.popped && dx*dx + dy*dy <= r*r) {
                ent.popped = true;
                this.score += ent.value;
                if (this.score < 0) this.score = 0;
                document.getElementById('game-score').textContent = this.score;
                // trigger explosion particles and ring
                ent.popTime = performance.now();
                ent.ring = {radius: 0, max: ent.size*1.6, start: ent.popTime};
                // special skull effect: bright red flash + red particles
                if (ent.emoji === '💀') {
                    this.flash = { start: ent.popTime, duration: 420 };
                    // spawn stronger red particles
                    this.spawnParticles(ent.x, ent.y, Math.max(16, Math.floor(ent.size/4)), { skull: true });
                } else {
                    this.spawnParticles(ent.x, ent.y, Math.max(8, Math.floor(ent.size/6)));
                }
                break;
            }
        }
    }

    spawnParticles(x, y, count) {
        // optional last argument can be options object { skull: boolean }
        const opts = arguments[3] || {};
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 40 + Math.random() * 160;
            const life = 400 + Math.random() * 600; // ms
            const size = 4 + Math.random() * 6;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            let hue;
            if (opts.skull) {
                // red/orange hues for skull flash
                hue = Math.random() * 30; // 0-30 (reds)
            } else {
                hue = Math.random() * 360;
            }
            this.particles.push({x, y, vx, vy, life, age: 0, size, hue});
        }
    }

    update(dt) {
        // spawn logic
        this.spawnTimer += dt;
        if (this.spawnTimer > this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnEntity();
            // gradually increase difficulty
            this.spawnInterval = Math.max(280, this.spawnInterval - 8);
        }

        // update entities
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const ent = this.entities[i];
            ent.y += ent.speed * (dt/1000);
            // remove when off-screen or popped long ago
            if (ent.y - ent.size > this.height || (ent.popped && performance.now() - ent.popTime > 900)) {
                this.entities.splice(i,1);
            }
        }

        // update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.age += dt;
            if (p.age >= p.life) {
                this.particles.splice(i,1);
                continue;
            }
            // simple physics
            const t = dt/1000;
            p.x += p.vx * t;
            p.y += p.vy * t + 40 * t * t; // gravity-ish
            // slow down
            p.vx *= 0.995;
            p.vy *= 0.995;
        }
    }

    draw() {
        const ctx = this.ctx;
        const now = performance.now();
        ctx.clearRect(0,0,this.width,this.height);
        // slightly darker background for contrast
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(0,0,this.width,this.height);

        // draw entities
        for (const ent of this.entities) {
            ctx.save();
            ctx.font = `${ent.size}px serif`;
            // add a subtle outline / shadow to improve visibility across browsers
            ctx.lineWidth = Math.max(2, ent.size * 0.08);
            ctx.strokeStyle = 'rgba(0,0,0,0.6)';
            ctx.strokeText(ent.emoji, ent.x, ent.y);
            ctx.fillStyle = '#fff';
            ctx.fillText(ent.emoji, ent.x, ent.y);
            if (ent.popped) {
                const elapsed = performance.now() - ent.popTime;
                ctx.globalAlpha = Math.max(0,1 - (elapsed/600));
                // ring
                if (ent.ring) {
                    const progress = Math.min(1, (elapsed) / 500);
                    const rr = ent.ring.max * progress;
                    ctx.beginPath();
                    ctx.lineWidth = 2 + ent.size * 0.03;
                    ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1-progress)})`;
                    ctx.arc(ent.x, ent.y, rr, 0, Math.PI*2);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }

        // draw particles
        for (const p of this.particles) {
            ctx.save();
            const alpha = 1 - (p.age / p.life);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `hsl(${p.hue} 100% 60%)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();
        }

        // draw skull flash overlay (bright red) if active
        if (this.flash) {
            const elapsed = now - this.flash.start;
            if (elapsed <= this.flash.duration) {
                // flash peak then fade: quick bright alpha
                const t = elapsed / this.flash.duration;
                // make a quick bright peak in first half
                const alpha = Math.max(0, 0.95 * (1 - t));
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(0, 0, this.width, this.height);
                ctx.restore();
            } else {
                this.flash = null;
            }
        }

        // small HUD draw - timer at top-right
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(this.width - 110, 10, 100, 30);
        ctx.fillStyle = '#fff';
        ctx.font = '16px sans-serif';
        ctx.fillText(this.formatTime(this.remaining), this.width - 60, 25);
        ctx.restore();
    }

    render() {
        const now = performance.now();
        const dt = Math.min(60, now - (this.lastRender || now));
        this.lastRender = now;
        if (this.running) {
            this.update(dt);
        }
        this.draw();
        requestAnimationFrame(() => this.render());
    }

    formatTime(sec) {
        const s = Math.max(0, Math.floor(sec));
        const mm = Math.floor(s/60).toString().padStart(2,'0');
        const ss = (s%60).toString().padStart(2,'0');
        return `${mm}:${ss}`;
    }

    
}

// instantiate when DOM ready
window.addEventListener('DOMContentLoaded', () => {
    const DESKTOP_MIN = 901; // match CSS breakpoint
    function initOrDestroy() {
        const isDesktop = window.innerWidth >= DESKTOP_MIN;
        const canvas = document.getElementById('meme-game-canvas');
        if (isDesktop && !window.memeGame && canvas) {
            try {
                window.memeGame = new MemeTapRush({canvasId: 'meme-game-canvas', duration: 30});
                const high = localStorage.getItem('nov22_meme_taprush_highscore') || '0';
                const highEl = document.getElementById('game-high');
                if (highEl) highEl.textContent = high;
            } catch (e) {
                // fail silently
            }
        } else if (!isDesktop && window.memeGame) {
            try {
                // stop and remove game instance
                window.memeGame.stop();
                window.memeGame = null;
            } catch (e) {}
        }
    }

    initOrDestroy();
    window.addEventListener('resize', () => {
        initOrDestroy();
    });
});
