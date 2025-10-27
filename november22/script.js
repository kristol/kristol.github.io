// Party Invitation JavaScript with Formspree Integration
class PartyInvitation {
    constructor() {
        this.partyDate = new Date('2025-11-22T20:00:00');
        this.playlist = JSON.parse(localStorage.getItem('partyPlaylist')) || [];
        this.rsvpStatus = localStorage.getItem('rsvpStatus') || null;

        // Formspree configuration
        this.formspreeConfig = {
            rsvpEndpoint: 'https://formspree.io/f/mrboebda',
            playlistEndpoint: 'https://formspree.io/f/xblpdlbz',
        };
        
        // Mystery Hunt configuration
        this.mysteryHunt = {
            collectedEmojis: JSON.parse(localStorage.getItem('mysteryEmojis')) || [],
            memeSequence: [2, 0, 4, 1, 5, 3], // Sequence: 3rd, 1st, 5th, 2nd, 6th, 4th meme quote (0-indexed)
            currentStep: 0,
            isActive: false,
            // Heist stages tracking
            heistProgress: JSON.parse(localStorage.getItem('heistProgress')) || {
                stage1_rsvp: false,
                stage2_final: false,
                currentStage: 1
            }
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startCountdown();
        this.loadPlaylist();
        this.loadRSVPStatus();
        this.animateCards();
        this.checkFormspreeSetup();
        this.initMysteryHunt();
    }

    setupEventListeners() {
        // RSVP buttons
        document.getElementById('yes-btn').addEventListener('click', () => this.handleRSVP('yes'));
        document.getElementById('maybe-btn').addEventListener('click', () => this.handleRSVP('maybe'));
        document.getElementById('no-btn').addEventListener('click', () => this.handleRSVP('no'));

        // Playlist functionality
        document.getElementById('add-song-btn').addEventListener('click', () => this.addSong());
        document.getElementById('song-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addSong();
        });
        document.getElementById('submitter-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addSong();
        });

        // Card animations on hover
        document.querySelectorAll('.detail-card').forEach(card => {
            card.addEventListener('mouseenter', () => this.cardHoverEffect(card));
        });

        // Random Wikipedia button
        document.getElementById('random-wiki-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.openRandomWikipedia();
        });

        // Mystery Hunt sidebar toggle - with mobile touch support
        const sidebarToggle = document.getElementById('sidebar-toggle');
        sidebarToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent event bubbling
            this.toggleMysteryHunt();
        });
        
        // Add touch support for better mobile experience
        sidebarToggle.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent event bubbling
            this.toggleMysteryHunt();
        });
    }

    handleRSVP(status) {
        const nameInput = document.getElementById('user-name');
        const userName = nameInput.value.trim();
        
        if (!userName) {
            this.showStatus('rsvp-status', 'Add meg a neved először! 😅', 'warning');
            nameInput.focus();
            return;
        }

        this.rsvpStatus = status;
        localStorage.setItem('rsvpStatus', status);
        localStorage.setItem('userName', userName);
        
        const messages = {
            yes: "🔥 SZIUUUU!!! Meg fogjuk dönteni a házat! 🏠💥 Készülj fel a LEGENDÁS ESTÉRE! 👑✨",
            maybe: "🤔 Hmm... Na de azért próbálj meg jönni! Ez lesz az ÉV BULIJA! 🎲🍾 Ne maradj le! 💫",
            no: "😭 MIIII?! Nem jössz?! De hát ez lesz a LEGJOBB BULI EVER! 💀🤡 Gondold át még egyszer! 🌈"
        };

        const messageElement = document.getElementById('rsvp-message');
        messageElement.textContent = messages[status];
        messageElement.classList.add('show');

        // 🎯 HEIST STAGE 1: RSVP "YES" triggers the first clue
        if (status === 'yes' && !this.mysteryHunt.heistProgress.stage1_rsvp) {
            this.triggerHeistStage1();
        }
        
        // Save to Formspree
        this.saveRSVPToFormspree(userName, status, messages[status]);
    }

    async saveRSVPToFormspree(userName, status, responseMessage) {
        try {
            
            // Formspree Integration
            const formData = {
                name: userName,
                rsvp_status: status,
                response_message: responseMessage,
                type: 'rsvp',
                timestamp: new Date().toISOString(),
                user_agent: navigator.userAgent,
                page_url: window.location.href
            };
            
            const result = await this.sendToFormspree(this.formspreeConfig.rsvpEndpoint, formData);
            
        } catch (error) {
            // Fallback: Show what would be sent
        }

        // Confetti for yes response
        if (status === 'yes') {
            this.launchConfetti();
        }

        // Update button styles
        document.querySelectorAll('.rsvp-btn').forEach(btn => btn.classList.remove('selected'));
        document.getElementById(`${status}-btn`).classList.add('selected');
    }

    startCountdown() {
        const updateCountdown = () => {
            const now = new Date().getTime();
            const timeLeft = this.partyDate.getTime() - now;

            if (timeLeft > 0) {
                const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
                const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

                // Add null checks for DOM elements
                const daysElement = document.getElementById('days');
                const hoursElement = document.getElementById('hours');
                const minutesElement = document.getElementById('minutes');
                const secondsElement = document.getElementById('seconds');
                
                if (daysElement) daysElement.textContent = days.toString().padStart(2, '0');
                if (hoursElement) hoursElement.textContent = hours.toString().padStart(2, '0');
                if (minutesElement) minutesElement.textContent = minutes.toString().padStart(2, '0');
                if (secondsElement) secondsElement.textContent = seconds.toString().padStart(2, '0');
                
                // 🎯 HEIST FINAL STAGE: Check if countdown shows 00 seconds and Stage 1 is complete
                if (seconds === 0 && this.mysteryHunt.heistProgress.stage1_rsvp && !this.mysteryHunt.heistProgress.stage2_final) {
                    this.setupCountdownClickListener();
                }
            } else {
                document.getElementById('countdown').innerHTML = '<h2>🎉 A BULI ELKEZDŐDÖTT! 🎉</h2>';
                
                // 🎯 Party started - setup click listener for heist if Stage 1 complete
                if (this.mysteryHunt.heistProgress.stage1_rsvp && !this.mysteryHunt.heistProgress.stage2_final) {
                    this.setupCountdownClickListener();
                }
            }
        };

        updateCountdown();
        setInterval(updateCountdown, 1000);
    }

    addSong() {
        const songInput = document.getElementById('song-input');
        const nameInput = document.getElementById('submitter-name');
        const songName = songInput.value.trim();
        const submitterName = nameInput.value.trim();

        if (!submitterName) {
            this.showStatus('submission-status', 'Add meg a neved is! 😅', 'warning');
            nameInput.focus();
            return;
        }

        if (!songName) {
            this.showStatus('submission-status', 'Add meg a dal címét! 🎵', 'warning');
            songInput.focus();
            return;
        }

        const fullSongEntry = `${songName} (${submitterName})`;
        
        if (!this.playlist.some(song => song.includes(songName))) {
            this.playlist.push(fullSongEntry);
            this.savePlaylist();
            this.renderPlaylist();
            
            songInput.value = '';
            nameInput.value = '';
            
            // Save to Formspree
            this.saveSongToFormspree(submitterName, songName);
            
            // Animation for new song
            setTimeout(() => {
                const newSong = document.querySelector('.playlist li:last-child');
                if (newSong) newSong.style.animation = 'slideInUp 0.5s ease-out';
            }, 10);
        } else {
            this.showStatus('submission-status', 'Ez a dal már fel van véve! 🎶', 'warning');
        }
    }

    async saveSongToFormspree(submitterName, songName) {
        try {
            // Formspree Integration
            await this.sendToFormspree(this.formspreeConfig.playlistEndpoint, {
                song_name: songName,
                submitter_name: submitterName,
                type: 'playlist_suggestion',
                timestamp: new Date().toISOString(),
                user_agent: navigator.userAgent,
                page_url: window.location.href
            });
            
            this.showStatus('submission-status', `✅ ${songName} hozzáadva! Köszi ${submitterName}! 🎵`, 'success');
            
        } catch (error) {
            this.showStatus('submission-status', `⚠️ ${songName} lokálisan elmentve! (Formspree hiba)`, 'warning');
        }
    }

    removeSong(index) {
        this.playlist.splice(index, 1);
        this.savePlaylist();
        this.renderPlaylist();
    }

    savePlaylist() {
        localStorage.setItem('partyPlaylist', JSON.stringify(this.playlist));
    }

    loadPlaylist() {
        this.renderPlaylist();
    }

    renderPlaylist() {
        const playlistElement = document.getElementById('playlist');
        playlistElement.innerHTML = '';

        this.playlist.forEach((song, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="song-info">
                    <span>🎵 ${song}</span>
                </div>
                <button class="remove-btn" onclick="partyApp.removeSong(${index})">✖</button>
            `;
            playlistElement.appendChild(li);
        });
    }

    loadRSVPStatus() {
        if (this.rsvpStatus) {
            this.handleRSVP(this.rsvpStatus);
        }
    }

    animateCards() {
        const cards = document.querySelectorAll('.detail-card');
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.style.animation = 'slideInUp 0.8s ease-out';
            }, index * 200);
        });
    }

    cardHoverEffect(card) {
        // Add extra glow effect on hover
        card.style.boxShadow = '0 20px 40px rgba(255, 255, 255, 0.3)';
        setTimeout(() => {
            card.style.boxShadow = '';
        }, 300);
    }

    launchConfetti() {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#6c5ce7'];
        const confettiContainer = document.getElementById('confetti-container');
        
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            
            confettiContainer.appendChild(confetti);
            
            // Remove confetti after animation
            setTimeout(() => {
                if (confetti.parentNode) {
                    confetti.parentNode.removeChild(confetti);
                }
            }, 5000);
        }
    }

    // Utility method to show status messages
    showStatus(elementId, message, type) {
        const statusElement = document.getElementById(elementId);
        statusElement.textContent = message;
        statusElement.className = `${elementId} ${type} show`;
        
        setTimeout(() => {
            statusElement.classList.remove('show');
        }, 4000);
    }

    // Formspree integration
    async sendToFormspree(endpoint, data) {
        // Check if endpoint is configured
        if (endpoint.includes('YOUR_') || endpoint === 'https://formspree.io/f/YOUR_RSVP_FORM_ID' || endpoint === 'https://formspree.io/f/YOUR_PLAYLIST_FORM_ID') {
            throw new Error('Formspree endpoint not configured yet');
        }

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Formspree error: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            return result;
            
        } catch (fetchError) {
            throw fetchError;
        }
    }

    // Check if Formspree is properly configured
    checkFormspreeSetup() {
        const isRsvpConfigured = !this.formspreeConfig.rsvpEndpoint.includes('YOUR_');
        const isPlaylistConfigured = !this.formspreeConfig.playlistEndpoint.includes('YOUR_');
        
        if (!isRsvpConfigured || !isPlaylistConfigured) {
            // Add setup reminder to page
            const setupReminder = document.createElement('div');
            setupReminder.innerHTML = `
                <div style="background: rgba(255, 193, 7, 0.9); color: #000; padding: 10px; text-align: center; border-radius: 10px; margin: 10px; font-weight: bold;">
                    ⚠️ Formspree setup needed for live data saving!
                    <br><small>Responses are currently saved locally only</small>
                </div>
            `;
            document.querySelector('.content').prepend(setupReminder);
        }
    }

    // Random Wikipedia function for entertainment
    openRandomWikipedia() {
        const interestingTopics = [
            'Quantum_mechanics',
            'Octopus',
            'Black_hole',
            'Fibonacci_number',
            'Mandela_effect',
            'Fermi_paradox',
            'Cryptocurrency',
            'Artificial_intelligence',
            'Speed_of_light',
            'Multiverse',
            'Dopamine',
            'Synesthesia',
            'Butterfly_effect',
            'Game_theory',
            'Cognitive_bias',
            'Parallel_universe',
            'String_theory',
            'Placebo_effect',
            'Quantum_entanglement',
            'Simulation_hypothesis',
            'Dunning–Kruger_effect',
            'Baader–Meinhof_phenomenon',
            'Uncanny_valley',
            'Perpetual_motion',
            'Time_dilation',
            'Schrödinger%27s_cat',
            'Murphy%27s_law',
            'Parkinson%27s_law',
            'Godwin%27s_law',
            'Streisand_effect',
            'Observer_effect',
            'Hawking_radiation',
            'Dark_matter',
            'Antimatter',
            'Holographic_principle',
            'Artificial_general_intelligence',
            'Technological_singularity',
            'Bootstrap_paradox',
            'Grandfather_paradox',
            'Ship_of_Theseus'
        ];

        const randomTopic = interestingTopics[Math.floor(Math.random() * interestingTopics.length)];
        const wikiUrl = `https://en.wikipedia.org/wiki/${randomTopic}`;
        
        // Show a fun message before opening
        const originalBtn = document.getElementById('random-wiki-btn');
        const originalText = originalBtn.textContent;
        originalBtn.textContent = '🚀 Launching brain expansion...';
        
        setTimeout(() => {
            originalBtn.textContent = originalText;
        }, 2000);
        
        // Open in new tab
        window.open(wikiUrl, '_blank');
    }

    // ==================== HEIST TREASURE HUNT METHODS ====================
    
    triggerHeistStage1() {
        // Mark stage 1 complete
        this.mysteryHunt.heistProgress.stage1_rsvp = true;
        this.mysteryHunt.heistProgress.currentStage = 2;
        localStorage.setItem('heistProgress', JSON.stringify(this.mysteryHunt.heistProgress));
        
        // Show big full-page overlay with Hungarian clue
        setTimeout(() => {
            this.showHeistStage1Overlay();
        }, 2000);
        
        // Create floating emoji near countdown (after overlay closes)
        setTimeout(() => {
            this.createFloatingClueEmoji();
        }, 8000);
    }
    
    showHeistStage1Overlay() {
        // Create full-screen overlay similar to emoji collection
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(0, 0, 0, 0.9)';
        overlay.style.zIndex = '10000';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.animation = 'fadeIn 0.5s ease';
        
        // Create content container
        const content = document.createElement('div');
        content.style.textAlign = 'center';
        content.style.color = 'white';
        content.style.maxWidth = '500px';
        content.style.padding = '2rem';
        content.style.borderRadius = '20px';
        content.style.background = 'rgba(255, 255, 255, 0.1)';
        content.style.backdropFilter = 'blur(10px)';
        content.style.border = '2px solid rgba(255, 255, 255, 0.2)';
        content.style.animation = 'fadeInUp 0.5s ease';
        content.style.fontFamily = 'Orbitron, Arial, sans-serif';
        
        // Create big emoji
        const bigEmoji = document.createElement('div');
        bigEmoji.textContent = '🕵️';
        bigEmoji.style.fontSize = '8rem';
        bigEmoji.style.marginBottom = '20px';
        bigEmoji.style.animation = 'bigEmojiCollect 2s ease infinite';
        bigEmoji.style.textShadow = '0 0 30px rgba(255, 255, 255, 0.8)';
        
        // Create title
        const title = document.createElement('h2');
        title.textContent = 'TITKOS KÜLDETÉS AKTIVÁLVA!';
        title.style.color = '#ff6b6b';
        title.style.margin = '1rem 0';
        title.style.fontSize = '2rem';
        title.style.animation = 'fadeInUp 1s ease 0.5s both';
        
        // Create Hungarian clue message
        const clueMessage = document.createElement('div');
        clueMessage.innerHTML = `
            <p style="margin: 1rem 0; font-size: 1.2rem; line-height: 1.5;">
                🎯 <strong>ELSŐ SZAKASZ TELJESÍTVE!</strong> 🎯
            </p>
            <div style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 15px; margin: 20px 0;">
                <p style="font-style: italic; font-size: 1.1rem; color: #4ecdc4;">
                    "Az idő őrzője rejti a következő nyomot...<br>
                    Amikor a számláló eléri a végét, kattints rá! ⏰"
                </p>
            </div>
            <small style="opacity: 0.8; font-size: 0.9rem;">
                Keress egy lebegő jelet az időszámláló közelében! 🔍
            </small>
        `;
        clueMessage.style.animation = 'fadeInUp 1s ease 1s both';
        
        // Create continue button
        const continueBtn = document.createElement('button');
        continueBtn.textContent = '🎯 KÜLDETÉS FOLYTATÁSA';
        continueBtn.style.padding = '15px 30px';
        continueBtn.style.fontSize = '1.2rem';
        continueBtn.style.background = 'linear-gradient(45deg, #ff6b6b, #4ecdc4)';
        continueBtn.style.border = 'none';
        continueBtn.style.borderRadius = '25px';
        continueBtn.style.color = '#fff';
        continueBtn.style.fontWeight = 'bold';
        continueBtn.style.cursor = 'pointer';
        continueBtn.style.animation = 'fadeInUp 1s ease 1.5s both, pulse 2s infinite 3s';
        continueBtn.style.fontFamily = 'Orbitron, Arial, sans-serif';
        continueBtn.style.marginTop = '20px';
        
        // Assemble the overlay
        content.appendChild(bigEmoji);
        content.appendChild(title);
        content.appendChild(clueMessage);
        content.appendChild(continueBtn);
        overlay.appendChild(content);
        document.body.appendChild(overlay);
        
        // Handle continue button click
        continueBtn.addEventListener('click', () => {
            overlay.remove();
        });
        
        // Auto-close after 12 seconds
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.remove();
            }
        }, 12000);
    }
    
    createFloatingClueEmoji() {
        const countdownSection = document.querySelector('.countdown-section');
        if (countdownSection) {
            const floatingEmoji = document.createElement('div');
            floatingEmoji.innerHTML = '🔍';
            floatingEmoji.style.cssText = `
                position: absolute;
                top: -10px;
                right: 20px;
                font-size: 2em;
                animation: floatPulse 2s ease-in-out infinite;
                cursor: help;
                z-index: 100;
                text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
            `;
            floatingEmoji.title = 'Az idő őrzője... 🕐';
            
            countdownSection.style.position = 'relative';
            countdownSection.appendChild(floatingEmoji);
        }
    }
    
    setupCountdownClickListener() {
        const countdownElement = document.getElementById('countdown');
        if (countdownElement && !countdownElement.classList.contains('heist-clickable')) {
            // Mark as clickable to avoid duplicate listeners
            countdownElement.classList.add('heist-clickable');
            
            // Add visual hint
            countdownElement.style.cursor = 'pointer';
            countdownElement.style.transition = 'all 0.3s ease';
            countdownElement.title = 'Az idő őrzője rejti a titkot... 🕐';
            
            // Add hover effect
            countdownElement.addEventListener('mouseenter', () => {
                countdownElement.style.transform = 'scale(1.05)';
                countdownElement.style.textShadow = '0 0 20px rgba(255, 255, 255, 0.8)';
            });
            
            countdownElement.addEventListener('mouseleave', () => {
                countdownElement.style.transform = 'scale(1)';
                countdownElement.style.textShadow = 'none';
            });
            
            // Main click handler for Stage 2 - Must click when seconds = 00
            countdownElement.addEventListener('click', () => {
                if (this.mysteryHunt.heistProgress.stage1_rsvp && !this.mysteryHunt.heistProgress.stage2_final) {
                    // Validate that seconds are actually 00 when clicked
                    const secondsElement = document.getElementById('seconds');
                    const currentSeconds = secondsElement ? parseInt(secondsElement.textContent) : -1;
                    
                    if (currentSeconds === 0) {
                        this.triggerFinalEmojiCollection();
                    }
                }
            });
        }
    }
    
    triggerFinalEmojiCollection() {
        // Mark heist complete
        this.mysteryHunt.heistProgress.stage2_final = true;
        localStorage.setItem('heistProgress', JSON.stringify(this.mysteryHunt.heistProgress));
        
        // Remove floating clue emoji
        const floatingEmoji = document.querySelector('.countdown-section div[title*="idő őrzője"]');
        if (floatingEmoji) floatingEmoji.remove();
        
        // Show big emoji collection for third emoji
        this.showBigEmojiCollection('⏰', 'IDŐMESTER TITKA FELOLDVA! ⚡');
        
        // Remove countdown click functionality
        const countdownElement = document.getElementById('countdown');
        if (countdownElement) {
            countdownElement.style.cursor = 'default';
            countdownElement.classList.remove('heist-clickable');
            countdownElement.title = '';
        }
    }

    // ==================== MYSTERY HUNT METHODS ====================
    
    initMysteryHunt() {
        this.updateSidebarDisplay();
        this.setupMemeSequenceGame();
        this.setupCringeMeterHunt();
        
        // Initialize heist progress if needed
        this.initHeistProgress();
        
        // Check if all emojis are collected
        if (this.mysteryHunt.collectedEmojis.length === 3) {
            this.revealSecretMessage();
        }
    }
    
    initHeistProgress() {
        // If Stage 1 is complete, show the floating clue emoji
        if (this.mysteryHunt.heistProgress.stage1_rsvp && !this.mysteryHunt.heistProgress.stage2_final) {
            this.createFloatingClueEmoji();
        }
        
        // If Stage 1 complete and countdown is ready, setup click listener
        if (this.mysteryHunt.heistProgress.stage1_rsvp && !this.mysteryHunt.heistProgress.stage2_final) {
            // Check if countdown shows 00 seconds
            setTimeout(() => {
                const seconds = parseInt(document.getElementById('seconds')?.textContent || '1');
                if (seconds === 0) {
                    this.setupCountdownClickListener();
                }
            }, 1000);
        }
    }

    toggleMysteryHunt() {
        const sidebar = document.getElementById('mystery-sidebar');
        const isOpening = !sidebar.classList.contains('open');
        
        sidebar.classList.toggle('open');
        
        // Add backdrop for easier closing on all devices
        if (isOpening) {
            this.addBackdrop();
        } else {
            this.removeBackdrop();
        }
    }
    
    addBackdrop() {
        // Remove existing backdrop if any
        this.removeBackdrop();
        
        const backdrop = document.createElement('div');
        backdrop.id = 'sidebar-backdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.3);
            z-index: 999;
            backdrop-filter: blur(2px);
            cursor: pointer;
        `;
        
        // Close sidebar when backdrop is clicked/touched
        backdrop.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleMysteryHunt();
        });
        
        backdrop.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.toggleMysteryHunt();
        });
        
        document.body.appendChild(backdrop);
        
        // Also make the sidebar itself clickable to close
        const sidebar = document.getElementById('mystery-sidebar');
        const toggleButton = document.getElementById('sidebar-toggle');
        
        const sidebarCloseHandler = (e) => {
            // Don't close if clicking on the toggle button
            if (e.target === toggleButton || toggleButton.contains(e.target)) {
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            this.toggleMysteryHunt();
        };
        
        // Add click and touch handlers to the sidebar
        sidebar.addEventListener('click', sidebarCloseHandler);
        sidebar.addEventListener('touchstart', sidebarCloseHandler);
        
        // Store handlers for cleanup
        sidebar._closeHandler = sidebarCloseHandler;
    }
    
    removeBackdrop() {
        const backdrop = document.getElementById('sidebar-backdrop');
        if (backdrop) {
            backdrop.remove();
        }
        
        // Remove sidebar close handlers
        const sidebar = document.getElementById('mystery-sidebar');
        if (sidebar && sidebar._closeHandler) {
            sidebar.removeEventListener('click', sidebar._closeHandler);
            sidebar.removeEventListener('touchstart', sidebar._closeHandler);
            delete sidebar._closeHandler;
        }
    }

    updateSidebarDisplay() {
        // Update collected emojis in sidebar - map each emoji to its correct slot
        const emojiSlots = ['🤡', '💀', '⏰'];
        
        this.mysteryHunt.collectedEmojis.forEach((emoji) => {
            const slotIndex = emojiSlots.indexOf(emoji);
            if (slotIndex !== -1) {
                const slot = document.getElementById(`emoji-slot-${slotIndex + 1}`);
                if (slot) {
                    slot.querySelector('.emoji-shadow').style.display = 'none';
                    slot.querySelector('.collected-emoji').style.display = 'block';
                }
            }
        });
    }

    collectEmoji(emojiType) {
        if (!this.mysteryHunt.collectedEmojis.includes(emojiType)) {
            this.mysteryHunt.collectedEmojis.push(emojiType);
            localStorage.setItem('mysteryEmojis', JSON.stringify(this.mysteryHunt.collectedEmojis));
            
            this.updateSidebarDisplay();
            
            // Check if all collected
            if (this.mysteryHunt.collectedEmojis.length === 3) {
                setTimeout(() => this.revealSecretMessage(), 500);
            }
        }
    }

    setupMemeSequenceGame() {
        const memeQuotes = document.querySelectorAll('.meme-quote');
        
        memeQuotes.forEach((quote, index) => {
            quote.addEventListener('click', () => this.handleMemeSequenceClick(index));
        });
    }

    handleMemeSequenceClick(clickedIndex) {
        const expectedIndex = this.mysteryHunt.memeSequence[this.mysteryHunt.currentStep];
        const memeQuotes = document.querySelectorAll('.meme-quote');
        
        if (clickedIndex === expectedIndex) {
            // Correct click
            memeQuotes[clickedIndex].style.background = 'rgba(108, 255, 108, 0.3)';
            memeQuotes[clickedIndex].style.border = '2px solid #6cff6c';
            
            this.mysteryHunt.currentStep++;
            
            if (this.mysteryHunt.currentStep >= this.mysteryHunt.memeSequence.length) {
                // Sequence completed! Skip if already collected
                if (!this.mysteryHunt.collectedEmojis.includes('💀')) {
                    setTimeout(() => {
                        this.showBigEmojiCollection('💀', 'MEME SEQUENCE MASTERED! ☠️');
                        this.resetMemeSequence();
                    }, 500);
                } else {
                    this.resetMemeSequence();
                }
            }
        } else {
            // Wrong click - flash red and reset
            memeQuotes[clickedIndex].style.background = 'rgba(255, 108, 108, 0.5)';
            memeQuotes[clickedIndex].style.border = '2px solid #ff6c6c';
            
            setTimeout(() => {
                this.resetMemeSequence();
            }, 300);
        }
    }

    resetMemeSequence() {
        const memeQuotes = document.querySelectorAll('.meme-quote');
        memeQuotes.forEach(quote => {
            quote.style.background = '';
            quote.style.border = '';
        });
        this.mysteryHunt.currentStep = 0;
    }

    setupCringeMeterHunt() {
        const cringeMeter = document.querySelector('.cringe-meter');
        
        if (cringeMeter) {
            // Store reference to avoid scope issues
            const self = this;
            
            // Clear any existing handlers completely
            cringeMeter.replaceWith(cringeMeter.cloneNode(true));
            const freshCringeMeter = document.querySelector('.cringe-meter');
            
            // Add a single clean event listener
            freshCringeMeter.onclick = function() {
                
                // Skip if already collected
                if (self.mysteryHunt.collectedEmojis.includes('🤡')) {
                    return;
                }
                
                // Generate random cringe level
                const cringeLevel = Math.floor(Math.random() * 100) + 1;
                
                // Update display
                const displayText = `🤡 CRINGE SZINT: ${cringeLevel}% 🤡`;
                freshCringeMeter.innerHTML = `<span>${displayText}</span>`;
                
                // Check for 69%
                if (cringeLevel === 69) {
                    self.showBigEmojiCollection('🤡', 'CRINGE LEVEL 69% ACHIEVED! 🎊');
                }
            };
        }
    }

    showBigEmojiCollection(emojiType, message) {
        // Create full-screen overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(0, 0, 0, 0.8)';
        overlay.style.zIndex = '10000';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.animation = 'fadeIn 0.5s ease';
        
        // Create big emoji
        const bigEmoji = document.createElement('div');
        bigEmoji.textContent = emojiType;
        bigEmoji.style.fontSize = '10em';
        bigEmoji.style.marginBottom = '20px';
        bigEmoji.style.animation = 'bigEmojiCollect 2s ease';
        bigEmoji.style.textShadow = '0 0 30px rgba(255, 255, 255, 0.8)';
        
        // Create message
        const messageDiv = document.createElement('div');
        messageDiv.textContent = message;
        messageDiv.style.color = '#fff';
        messageDiv.style.fontSize = '2em';
        messageDiv.style.fontWeight = 'bold';
        messageDiv.style.textAlign = 'center';
        messageDiv.style.marginBottom = '30px';
        messageDiv.style.fontFamily = 'Orbitron, Arial, sans-serif';
        messageDiv.style.animation = 'fadeInUp 1s ease 0.5s both';
        
        // Create collect button
        const collectBtn = document.createElement('button');
        collectBtn.textContent = '🎯 COLLECT EMOJI!';
        collectBtn.style.padding = '15px 30px';
        collectBtn.style.fontSize = '1.5em';
        collectBtn.style.background = 'linear-gradient(45deg, #ff6b6b, #f9ca24)';
        collectBtn.style.border = 'none';
        collectBtn.style.borderRadius = '25px';
        collectBtn.style.color = '#fff';
        collectBtn.style.fontWeight = 'bold';
        collectBtn.style.cursor = 'pointer';
        collectBtn.style.animation = 'fadeInUp 1s ease 1s both, pulse 2s infinite 2s';
        collectBtn.style.fontFamily = 'Orbitron, Arial, sans-serif';
        
        overlay.appendChild(bigEmoji);
        overlay.appendChild(messageDiv);
        overlay.appendChild(collectBtn);
        document.body.appendChild(overlay);
        
        // Handle collection
        collectBtn.addEventListener('click', () => {
            this.collectEmoji(emojiType);
            this.animateSidebarCollection(emojiType);
            overlay.remove();
        });
        
        // Auto-close after 10 seconds
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.remove();
            }
        }, 10000);
    }

    animateSidebarCollection(emojiType) {
        // Find the corresponding slot and animate it
        const emojiSlots = ['🤡', '💀', '⏰'];
        const slotIndex = emojiSlots.indexOf(emojiType);
        
        if (slotIndex !== -1) {
            const slot = document.getElementById(`emoji-slot-${slotIndex + 1}`);
            if (slot) {
                // Hide shadow, show emoji with animation
                slot.querySelector('.emoji-shadow').style.display = 'none';
                const collectedEmoji = slot.querySelector('.collected-emoji');
                collectedEmoji.style.display = 'block';
                
                // Add special collection animation
                slot.style.animation = 'slotCollectAnimation 1s ease';
                
                // Open sidebar to show collection
                setTimeout(() => {
                    document.getElementById('mystery-sidebar').classList.add('open');
                }, 500);
            }
        }
    }

    showHiddenEmoji(emojiType, nearElement) {
        // Create floating emoji
        const hiddenEmoji = document.createElement('div');
        hiddenEmoji.textContent = emojiType;
        hiddenEmoji.style.position = 'fixed';
        hiddenEmoji.style.fontSize = '3em';
        hiddenEmoji.style.cursor = 'pointer';
        hiddenEmoji.style.zIndex = '9999';
        hiddenEmoji.style.animation = 'mysteryAppear 1s ease';
        hiddenEmoji.style.textShadow = '0 0 20px rgba(255, 255, 255, 0.8)';
        
        // Position near the trigger element
        const rect = nearElement.getBoundingClientRect();
        hiddenEmoji.style.left = rect.left + 'px';
        hiddenEmoji.style.top = (rect.top - 60) + 'px';
        
        document.body.appendChild(hiddenEmoji);
        
        // Make it collectible
        hiddenEmoji.addEventListener('click', () => {
            this.collectEmoji(emojiType);
            hiddenEmoji.remove();
        });
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (hiddenEmoji.parentNode) {
                hiddenEmoji.remove();
            }
        }, 10000);
    }

    revealSecretMessage() {
        const secretSlot = document.getElementById('secret-slot');
        secretSlot.querySelector('.secret-shadow').style.display = 'none';
        secretSlot.querySelector('.secret-message').style.display = 'block';
        
        // Open sidebar to show the message
        document.getElementById('mystery-sidebar').classList.add('open');
        
        // Check if victory splash has been shown before
        const hasSeenVictorySplash = localStorage.getItem('hasSeenVictorySplash');
        
        // Show big victory splash screen only if not seen before
        if (!hasSeenVictorySplash) {
            setTimeout(() => {
                this.showVictorySplash();
            }, 1000);
        }
    }

    showVictorySplash() {
        // MAXIMUM DOPAMINE GAMBLING JACKPOT EXPERIENCE
        const splashOverlay = document.createElement('div');
        splashOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: 
                radial-gradient(circle at 20% 50%, #ff0080 0%, transparent 50%),
                radial-gradient(circle at 80% 50%, #00ff80 0%, transparent 50%),
                radial-gradient(circle at 40% 20%, #ffd700 0%, transparent 50%),
                radial-gradient(circle at 60% 80%, #ff4000 0%, transparent 50%),
                linear-gradient(45deg, #000000, #1a0033, #000000);
            background-size: 400% 400%;
            animation: jackpotBackground 1s ease infinite;
            z-index: 20000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            overflow-y: auto;
            padding: 20px;
            box-sizing: border-box;
            font-family: 'Orbitron', Arial, sans-serif;
        `;

        // Create animated light beams background
        const lightBeams = document.createElement('div');
        lightBeams.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: 
                linear-gradient(45deg, transparent 40%, rgba(255, 215, 0, 0.1) 50%, transparent 60%),
                linear-gradient(-45deg, transparent 40%, rgba(0, 255, 255, 0.1) 50%, transparent 60%),
                linear-gradient(90deg, transparent 40%, rgba(255, 0, 255, 0.1) 50%, transparent 60%);
            background-size: 200% 200%;
            animation: lightSweep 1.5s ease infinite;
        `;

        // Create center spotlight effect
        const spotlight = document.createElement('div');
        spotlight.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 600px;
            height: 600px;
            transform: translate(-50%, -50%);
            background: radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%);
            animation: spotlightPulse 2s ease infinite;
        `;

        // Create main container with case opening animation
        const mainContainer = document.createElement('div');
        mainContainer.style.cssText = `
            position: relative;
            z-index: 20001;
            text-align: center;
            animation: caseOpenReveal 3s ease-out;
            max-width: 95vw;
            max-height: 90vh;
            overflow-y: auto;
            padding: 10px;
            box-sizing: border-box;
        `;

        // Create "LEGENDARY DROP" text with glow
        const legendaryText = document.createElement('div');
        legendaryText.textContent = '🏆 LEGENDARY DROP! 🏆';
        legendaryText.style.cssText = `
            font-size: 2rem;
            color: #ffd700;
            text-shadow: 
                0 0 10px #ffd700,
                0 0 20px #ffd700,
                0 0 30px #ffd700,
                0 0 40px #ffd700;
            margin-bottom: 2rem;
            animation: legendaryGlow 1s ease infinite alternate;
            font-weight: bold;
            letter-spacing: 2px;
        `;

        // Create emoji showcase container
        const emojiShowcase = document.createElement('div');
        emojiShowcase.style.cssText = `
            display: flex;
            justify-content: center;
            gap: 2rem;
            margin: 2rem 0;
            perspective: 1000px;
        `;

        // Create individual emoji cards with 3D flip animation
        const emojis = ['🤡', '💀', '⏰'];
        const emojiNames = ['CLOWN MASTER', 'SKULL KING', 'TIME LORD'];
        
        emojis.forEach((emoji, index) => {
            const emojiCard = document.createElement('div');
            emojiCard.style.cssText = `
                width: 120px;
                height: 160px;
                background: linear-gradient(45deg, #1a1a2e, #16213e, #0f3460);
                border: 3px solid #ffd700;
                border-radius: 15px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                position: relative;
                transform-style: preserve-3d;
                animation: cardFlip 2s ease ${index * 0.5}s, cardGlow 1.5s ease infinite ${index * 0.3}s;
                box-shadow: 
                    0 0 20px rgba(255, 215, 0, 0.5),
                    inset 0 0 20px rgba(255, 255, 255, 0.1);
            `;

            const emojiIcon = document.createElement('div');
            emojiIcon.textContent = emoji;
            emojiIcon.style.cssText = `
                font-size: 3rem;
                margin-bottom: 0.5rem;
                filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.8));
                animation: emojiFloat 2s ease infinite ${index * 0.2}s;
            `;

            const emojiName = document.createElement('div');
            emojiName.textContent = emojiNames[index];
            emojiName.style.cssText = `
                font-size: 0.7rem;
                color: #ffd700;
                font-weight: bold;
                text-align: center;
                letter-spacing: 1px;
                text-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
            `;

            emojiCard.appendChild(emojiIcon);
            emojiCard.appendChild(emojiName);
            emojiShowcase.appendChild(emojiCard);
        });

        // Create "MISSION COMPLETE" banner
        const missionBanner = document.createElement('div');
        missionBanner.innerHTML = `
            <div style="font-size: 3rem; color: #ff6b6b; text-shadow: 0 0 20px #ff6b6b; margin: 1rem 0; animation: bannerShake 0.1s ease infinite;">
                ⚡ KÜLDETÉS TELJESÍTVE! ⚡
            </div>
            <div style="font-size: 1.5rem; color: #4ecdc4; text-shadow: 0 0 15px #4ecdc4; animation: bannerGlow 1.5s ease infinite alternate;">
                TITKOS ÜGYNÖK STÁTUSZ AKTIVÁLVA
            </div>
        `;

        // Create prize notification with slot machine effect
        const prizeNotification = document.createElement('div');
        prizeNotification.style.cssText = `
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #ffd700);
            background-size: 300% 300%;
            animation: prizeShimmer 2s ease infinite;
            padding: 2rem;
            border-radius: 25px;
            margin: 2rem 0;
            border: 4px solid #ffd700;
            box-shadow: 
                0 0 30px rgba(255, 215, 0, 0.8),
                inset 0 0 30px rgba(255, 255, 255, 0.2);
            position: relative;
            overflow: hidden;
        `;

        prizeNotification.innerHTML = `
            <div style="font-size: 1.8rem; color: white; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); margin-bottom: 1rem;">
                📸 SCREENSHOT KÉSZÍTÉS! 📸
            </div>
            <div style="font-size: 1.2rem; color: white; text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">
                Mutasd meg ezt a bulin és kapsz egy<br>
                <span style="font-size: 1.5rem; color: #ffd700; text-shadow: 0 0 10px #ffd700;">KIS AJÁNDÉKOT!</span> 🎁✨
            </div>
        `;

        // Create spinning particles around the screen
        const particleContainer = document.createElement('div');
        particleContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
        `;

        // Create claim button with epic styling
        const claimButton = document.createElement('button');
        claimButton.textContent = '✕';
        claimButton.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            padding: 0;
            font-size: 2rem;
            background: rgba(255, 0, 0, 0.8);
            border: 2px solid #fff;
            border-radius: 50%;
            color: white;
            font-weight: bold;
            cursor: pointer;
            font-family: Arial, sans-serif;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
            box-shadow: 
                0 0 20px rgba(255, 0, 0, 0.8),
                0 5px 15px rgba(0,0,0,0.3);
            animation: closeButtonPulse 2s ease infinite;
            transition: all 0.3s ease;
            z-index: 20003;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
        `;

        // Create countdown timer display
        const countdownTimer = document.createElement('div');
        countdownTimer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            border: 2px solid #ffd700;
            border-radius: 10px;
            padding: 10px 15px;
            color: #ffd700;
            font-family: 'Orbitron', Arial, sans-serif;
            font-size: 1rem;
            font-weight: bold;
            text-shadow: 0 0 10px #ffd700;
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
            z-index: 20003;
            animation: timerPulse 1s ease infinite;
        `;
        
        let timeLeft = 10;
        countdownTimer.textContent = `Auto-close: ${timeLeft}s`;
        
        const timerInterval = setInterval(() => {
            timeLeft--;
            countdownTimer.textContent = `Auto-close: ${timeLeft}s`;
            
            if (timeLeft <= 3) {
                countdownTimer.style.color = '#ff0000';
                countdownTimer.style.borderColor = '#ff0000';
                countdownTimer.style.textShadow = '0 0 10px #ff0000';
                countdownTimer.style.animation = 'urgentFlash 0.5s ease infinite';
            }
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
            }
        }, 1000);
        
        // Mobile responsive adjustments
        const isMobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // Make content scrollable on mobile
            mainContainer.style.maxHeight = '90vh';
            mainContainer.style.overflowY = 'auto';
            
            // Adjust close button for mobile
            claimButton.style.width = '45px';
            claimButton.style.height = '45px';
            claimButton.style.fontSize = '1.8rem';
            claimButton.style.top = '15px';
            claimButton.style.right = '15px';
            
            // Adjust countdown timer for mobile
            countdownTimer.style.top = '15px';
            countdownTimer.style.left = '15px';
            countdownTimer.style.fontSize = '0.9rem';
            countdownTimer.style.padding = '8px 12px';
            
            // Add swipe-to-close functionality for mobile
            let startY = 0;
            let startX = 0;
            
            splashOverlay.addEventListener('touchstart', (e) => {
                startY = e.touches[0].clientY;
                startX = e.touches[0].clientX;
            }, { passive: true });
            
            splashOverlay.addEventListener('touchmove', (e) => {
                if (e.touches[0].clientY - startY > 100 && Math.abs(e.touches[0].clientX - startX) < 50) {
                    // Swipe down detected
                    splashOverlay.style.transform = `translateY(${e.touches[0].clientY - startY}px)`;
                    splashOverlay.style.opacity = Math.max(0.5, 1 - (e.touches[0].clientY - startY) / 300);
                }
            }, { passive: true });
            
            splashOverlay.addEventListener('touchend', (e) => {
                const deltaY = e.changedTouches[0].clientY - startY;
                if (deltaY > 150) {
                    // Close splash if swiped down enough
                    localStorage.setItem('hasSeenVictorySplash', 'true');
                    splashOverlay.style.animation = 'jackpotFadeOut 1s ease';
                    setTimeout(() => splashOverlay.remove(), 1000);
                } else {
                    // Reset position
                    splashOverlay.style.transform = 'translateY(0)';
                    splashOverlay.style.opacity = '1';
                }
            }, { passive: true });
        }

        // Assemble the splash screen
        splashOverlay.appendChild(lightBeams);
        splashOverlay.appendChild(spotlight);
        splashOverlay.appendChild(particleContainer);
        splashOverlay.appendChild(countdownTimer);
        
        mainContainer.appendChild(legendaryText);
        mainContainer.appendChild(emojiShowcase);
        mainContainer.appendChild(missionBanner);
        mainContainer.appendChild(prizeNotification);
        mainContainer.appendChild(claimButton);
        
        splashOverlay.appendChild(mainContainer);
        document.body.appendChild(splashOverlay);

        // Create epic particle explosion
        this.createEpicParticleExplosion(particleContainer);

        // Add sound effect simulation with visual feedback
        this.simulateSoundEffects(splashOverlay);

        // Handle close button click
        const closeFunction = () => {
            // Clear the countdown timer
            clearInterval(timerInterval);
            
            // Save that user has seen the splash
            localStorage.setItem('hasSeenVictorySplash', 'true');
            
            claimButton.style.animation = 'closeButtonPulse 0.3s ease';
            claimButton.style.transform = 'scale(0.8)';
            
            setTimeout(() => {
                splashOverlay.style.animation = 'jackpotFadeOut 1s ease';
                setTimeout(() => {
                    if (splashOverlay.parentNode) {
                        splashOverlay.remove();
                    }
                }, 1000);
            }, 300);
        };
        
        claimButton.addEventListener('click', closeFunction);

        // Auto-close after 10 seconds
        setTimeout(() => {
            if (splashOverlay.parentNode) {
                closeFunction();
            }
        }, 10000);
    }

    createEpicParticleExplosion(container) {
        const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#f9ca24', '#6c5ce7', '#ff9ff3', '#54a0ff'];
        const shapes = ['⭐', '💎', '�', '⚡', '✨', '�', '🌟'];
        
        // Create 300 particles for maximum effect
        for (let i = 0; i < 300; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                
                if (Math.random() > 0.7) {
                    particle.textContent = shapes[Math.floor(Math.random() * shapes.length)];
                    particle.style.fontSize = (Math.random() * 1.5 + 0.5) + 'rem';
                } else {
                    particle.style.width = particle.style.height = (Math.random() * 8 + 3) + 'px';
                    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
                    particle.style.borderRadius = '50%';
                }
                
                particle.style.cssText += `
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    pointer-events: none;
                    animation: particleExplosion ${Math.random() * 2 + 3}s ease-out forwards;
                    transform-origin: center;
                    box-shadow: 0 0 10px currentColor;
                `;
                
                // Random explosion direction
                const angle = (Math.random() * 360) * (Math.PI / 180);
                const velocity = Math.random() * 300 + 100;
                particle.style.setProperty('--angle', angle + 'rad');
                particle.style.setProperty('--velocity', velocity + 'px');
                
                container.appendChild(particle);
                
                setTimeout(() => {
                    if (particle.parentNode) {
                        particle.remove();
                    }
                }, 5000);
            }, i * 20);
        }
    }

    simulateSoundEffects(container) {
        // Visual representation of sound effects
        const soundWaves = ['💥', '🔊', '🎵', '⚡'];
        
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                const wave = document.createElement('div');
                wave.textContent = soundWaves[Math.floor(Math.random() * soundWaves.length)];
                wave.style.cssText = `
                    position: absolute;
                    left: ${Math.random() * 100}%;
                    top: ${Math.random() * 100}%;
                    font-size: 2rem;
                    pointer-events: none;
                    animation: soundWave 1s ease-out forwards;
                    color: #ffd700;
                    text-shadow: 0 0 20px #ffd700;
                `;
                
                container.appendChild(wave);
                
                setTimeout(() => {
                    if (wave.parentNode) {
                        wave.remove();
                    }
                }, 1000);
            }, i * 300);
        }
    }
}

// Fun background effects
class BackgroundEffects {
    constructor() {
        this.init();
    }

    init() {
        this.createFloatingEmojis();
        setInterval(() => this.createFloatingEmojis(), 10000);
    }

    createFloatingEmojis() {
        const emojis = ['🎉', '🎊', '✨', '🎵', '💫', '🌟'];
        
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const emoji = document.createElement('div');
                emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                emoji.style.position = 'fixed';
                emoji.style.left = Math.random() * 100 + '%';
                emoji.style.top = '100%';
                emoji.style.fontSize = '2em';
                emoji.style.zIndex = '999';
                emoji.style.pointerEvents = 'none';
                emoji.style.animation = 'floatUp 8s linear forwards';
                
                document.body.appendChild(emoji);
                
                setTimeout(() => {
                    if (emoji.parentNode) {
                        emoji.parentNode.removeChild(emoji);
                    }
                }, 8000);
            }, i * 2000);
        }
    }
}

// Add CSS for floating emojis
const style = document.createElement('style');
style.textContent = `
    @keyframes floatUp {
        from {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
        }
        to {
            transform: translateY(-100vh) rotate(360deg);
            opacity: 0;
        }
    }
    
    .rsvp-btn.selected {
        transform: scale(1.1);
        box-shadow: 0 0 20px rgba(255, 255, 255, 0.6);
        animation: selectedPulse 1s ease-in-out infinite;
    }
    
    @keyframes selectedPulse {
        0%, 100% { transform: scale(1.1); }
        50% { transform: scale(1.15); }
    }
    
    @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    
    @keyframes victoryPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
    
    @keyframes titleBounce {
        0% { transform: translateY(0); }
        100% { transform: translateY(-10px); }
    }
    
    @keyframes subtitleGlow {
        0% { text-shadow: 0 0 20px rgba(255, 215, 0, 0.8); }
        100% { text-shadow: 0 0 40px rgba(255, 215, 0, 1), 0 0 60px rgba(255, 215, 0, 0.6); }
    }
    
    @keyframes messageFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
    }
    
    @keyframes buttonPulse {
        0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(255, 255, 255, 0.3); }
        50% { transform: scale(1.1); box-shadow: 0 0 30px rgba(255, 255, 255, 0.6); }
    }
    
    @keyframes confettiFall {
        0% { 
            transform: translateY(-100px) rotate(0deg); 
            opacity: 1; 
        }
        100% { 
            transform: translateY(100vh) rotate(720deg); 
            opacity: 0; 
        }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.8); }
    }
    
    @keyframes lightSweep {
        0% { background-position: -200% -200%; }
        100% { background-position: 200% 200%; }
    }
    
    @keyframes spotlightPulse {
        0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
        50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.6; }
    }
    
    @keyframes caseOpenReveal {
        0% { transform: scale(0.3) rotateY(180deg); opacity: 0; }
        50% { transform: scale(1.1) rotateY(90deg); opacity: 0.5; }
        100% { transform: scale(1) rotateY(0deg); opacity: 1; }
    }
    
    @keyframes legendaryGlow {
        0% { 
            text-shadow: 0 0 10px #ffd700, 0 0 20px #ffd700, 0 0 30px #ffd700;
            transform: scale(1);
        }
        100% { 
            text-shadow: 0 0 20px #ffd700, 0 0 40px #ffd700, 0 0 60px #ffd700, 0 0 80px #ffd700;
            transform: scale(1.05);
        }
    }
    
    @keyframes cardFlip {
        0% { transform: rotateY(180deg) scale(0.5); opacity: 0; }
        50% { transform: rotateY(90deg) scale(0.8); opacity: 0.5; }
        100% { transform: rotateY(0deg) scale(1); opacity: 1; }
    }
    
    @keyframes cardGlow {
        0%, 100% { 
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.1);
            border-color: #ffd700;
        }
        50% { 
            box-shadow: 0 0 40px rgba(255, 215, 0, 0.9), inset 0 0 40px rgba(255, 255, 255, 0.3);
            border-color: #ffff00;
        }
    }
    
    @keyframes emojiFloat {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        50% { transform: translateY(-10px) rotate(5deg); }
    }
    
    @keyframes bannerShake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-2px); }
        75% { transform: translateX(2px); }
    }
    
    @keyframes bannerGlow {
        0% { text-shadow: 0 0 15px #4ecdc4; }
        100% { text-shadow: 0 0 25px #4ecdc4, 0 0 35px #4ecdc4; }
    }
    
    @keyframes prizeShimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }
    
    @keyframes epicButtonPulse {
        0%, 100% { 
            transform: scale(1); 
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.8), 0 10px 20px rgba(0,0,0,0.3);
        }
        50% { 
            transform: scale(1.1); 
            box-shadow: 0 0 50px rgba(255, 215, 0, 1), 0 15px 30px rgba(0,0,0,0.4);
        }
    }
    
    @keyframes buttonShimmer {
        0% { background-position: -300% 0; }
        100% { background-position: 300% 0; }
    }
    
    @keyframes buttonExplode {
        0% { transform: scale(1); }
        50% { transform: scale(1.3); }
        100% { transform: scale(0.8); }
    }
    
    @keyframes particleExplosion {
        0% { 
            transform: translate(-50%, -50%) rotate(0deg) scale(1);
            opacity: 1;
        }
        100% { 
            transform: translate(-50%, -50%) 
                      translateX(calc(cos(var(--angle)) * var(--velocity))) 
                      translateY(calc(sin(var(--angle)) * var(--velocity))) 
                      rotate(720deg) scale(0);
            opacity: 0;
        }
    }
    
    @keyframes soundWave {
        0% { transform: scale(1); opacity: 1; }
        100% { transform: scale(3); opacity: 0; }
    }
    
    @keyframes epicFadeOut {
        0% { opacity: 1; transform: scale(1) rotate(0deg); }
        100% { opacity: 0; transform: scale(0.5) rotate(180deg); }
    }
    
    @keyframes warningFlash {
        0%, 100% { background: radial-gradient(circle at center, #001122, #000000); }
        50% { background: radial-gradient(circle at center, #ff0000, #330000); }
    }
    
    @keyframes jackpotBackground {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    
    @keyframes strobeBorder {
        0%, 100% { border-color: #ffd700; box-shadow: inset 0 0 50px #ffd700, 0 0 100px #ffd700; }
        50% { border-color: #ff0080; box-shadow: inset 0 0 50px #ff0080, 0 0 100px #ff0080; }
    }
    
    @keyframes jackpotReveal {
        0% { transform: scale(0.1) rotateZ(180deg); opacity: 0; }
        50% { transform: scale(1.2) rotateZ(90deg); opacity: 0.8; }
        100% { transform: scale(1) rotateZ(0deg); opacity: 1; }
    }
    
    @keyframes megaJackpotPulse {
        0%, 100% { transform: scale(1) rotateZ(0deg); }
        50% { transform: scale(1.1) rotateZ(2deg); }
    }
    
    @keyframes counterFlicker {
        0%, 90%, 100% { opacity: 1; }
        95% { opacity: 0.7; }
    }
    
    @keyframes finalAmountGlow {
        0%, 100% { text-shadow: 0 0 20px #00ff00, 0 0 40px #00ff00; }
        50% { text-shadow: 0 0 40px #00ff00, 0 0 80px #00ff00, 0 0 120px #00ff00; }
    }
    
    @keyframes winnerBounce {
        0% { transform: translateY(0); }
        100% { transform: translateY(-10px); }
    }
    
    @keyframes slotGlow {
        0%, 100% { box-shadow: 0 0 50px #ffd700, inset 0 0 30px rgba(255, 255, 255, 0.3); }
        50% { box-shadow: 0 0 100px #ff0080, inset 0 0 60px rgba(255, 255, 255, 0.6); }
    }
    
    @keyframes slotSpin {
        0% { transform: rotateY(0deg) scale(0.5); opacity: 0; }
        50% { transform: rotateY(1800deg) scale(0.8); opacity: 0.5; }
        100% { transform: rotateY(3600deg) scale(1); opacity: 1; }
    }
    
    @keyframes emojiWin {
        0%, 100% { transform: scale(1) rotateZ(0deg); }
        50% { transform: scale(1.2) rotateZ(5deg); }
    }
    
    @keyframes winFlash {
        0%, 100% { opacity: 1; color: #ff0080; }
        50% { opacity: 0.3; color: #ffd700; }
    }
    
    @keyframes prizeBoxShimmer {
        0% { background-position: -400% 0; transform: scale(1); }
        50% { background-position: 0% 0; transform: scale(1.05); }
        100% { background-position: 400% 0; transform: scale(1); }
    }
    
    @keyframes prizeTextShake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-3px); }
        75% { transform: translateX(3px); }
    }
    
    @keyframes prizeGlow {
        0% { text-shadow: 2px 2px 4px rgba(0,0,0,0.8); }
        100% { text-shadow: 2px 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(255, 255, 255, 0.8); }
    }
    
    @keyframes specialPrizeGlow {
        0%, 100% { color: #ffd700; text-shadow: 0 0 10px #ffd700; }
        50% { color: #ff0080; text-shadow: 0 0 20px #ff0080, 0 0 40px #ff0080; }
    }
    
    @keyframes hellYeahPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); }
    }
    
    @keyframes buttonRainbow {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }
    
    @keyframes moneyFall {
        0% { transform: translateY(-50px) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
    }
    
    @keyframes jackpotFadeOut {
        0% { opacity: 1; transform: scale(1) rotate(0deg); }
        100% { opacity: 0; transform: scale(1.5) rotate(360deg); }
    }
    
    @keyframes fomoWarning {
        0%, 100% { border-color: #ffd700; }
        50% { border-color: #ff0000; }
    }
    
    @keyframes closeButtonPulse {
        0%, 100% { 
            transform: scale(1); 
            box-shadow: 0 0 20px rgba(255, 0, 0, 0.8), 0 5px 15px rgba(0,0,0,0.3);
        }
        50% { 
            transform: scale(1.1); 
            box-shadow: 0 0 30px rgba(255, 0, 0, 1), 0 8px 20px rgba(0,0,0,0.4);
        }
    }
    
    @keyframes timerPulse {
        0%, 100% { 
            transform: scale(1); 
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
        }
        50% { 
            transform: scale(1.05); 
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
        }
    }
    
    @keyframes urgentFlash {
        0%, 100% { 
            opacity: 1; 
            box-shadow: 0 0 20px rgba(255, 0, 0, 0.5);
        }
        50% { 
            opacity: 0.7; 
            box-shadow: 0 0 40px rgba(255, 0, 0, 1);
        }
    }
    
    /* Mobile Responsive Styles for Splash Screen */
    @media (max-width: 768px) {
        /* Make splash content scrollable and smaller on mobile */
        .jackpot-content {
            max-height: 90vh;
            overflow-y: auto;
            padding: 10px;
        }
        
        /* Reduce font sizes for mobile */
        .mega-jackpot {
            font-size: 3rem !important;
        }
        
        .money-counter {
            font-size: 2rem !important;
        }
        
        .winner-text {
            font-size: 1.8rem !important;
        }
        
        .slot-machine {
            flex-direction: column !important;
            gap: 1rem !important;
        }
        
        .slot-reel {
            width: 120px !important;
            height: 150px !important;
        }
        
        .win-flash {
            font-size: 2.5rem !important;
        }
        
        .prize-box {
            padding: 1rem !important;
            margin: 1rem 0 !important;
        }
        
        .hell-yeah-button {
            position: fixed !important;
            top: 15px !important;
            right: 15px !important;
            width: 45px !important;
            height: 45px !important;
            padding: 0 !important;
            font-size: 1.8rem !important;
            border-radius: 50% !important;
        }
    }
    
    @media (max-width: 480px) {
        .mega-jackpot {
            font-size: 2.5rem !important;
        }
        
        .money-counter {
            font-size: 1.5rem !important;
        }
        
        .winner-text {
            font-size: 1.5rem !important;
        }
        
        .win-flash {
            font-size: 2rem !important;
        }
        
        .hell-yeah-button {
            position: fixed !important;
            top: 10px !important;
            right: 10px !important;
            width: 40px !important;
            height: 40px !important;
            padding: 0 !important;
            font-size: 1.5rem !important;
        }
    }
`;
document.head.appendChild(style);

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.partyApp = new PartyInvitation();
    new BackgroundEffects();
});

// Add interactive functionality for games and memes
document.addEventListener('DOMContentLoaded', () => {
    // Add click handlers for game cards
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', () => {
            card.style.transform = 'scale(1.1) rotate(5deg)';
            setTimeout(() => {
                card.style.transform = '';
            }, 300);
        });
    });

    // Add click handlers for meme quotes
    document.querySelectorAll('.meme-quote').forEach(quote => {
        quote.addEventListener('click', () => {
            quote.classList.add('flash');
            const originalText = quote.textContent;
            quote.textContent = '💥 CRINGE OVERLOAD! 💥';
            
            setTimeout(() => {
                quote.textContent = originalText;
                quote.classList.remove('flash');
            }, 1000);
        });
    });

    // Add some party music suggestions as examples
    setTimeout(() => {
        const defaultSongs = [
            '🔥 Wellhello - MIZU 🔥',
            '💥 Dzsúdló - Menj 💥',
            '🌈 Azahriah - Rampapapam 🌈',
            '👑 Manuel - Nem bírom tovább 👑'
        ];
        
        if (window.partyApp && window.partyApp.playlist.length === 0) {
            defaultSongs.forEach(song => {
                window.partyApp.playlist.push(song);
            });
            window.partyApp.savePlaylist();
            window.partyApp.renderPlaylist();
        }
    }, 1000);
});