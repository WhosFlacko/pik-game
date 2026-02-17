// CoinPick Game Logic — DOPAMINE EDITION 🎰

// Game State
let gameState = {
    mode: 'select',
    timeframe: 15,
    selectedCoin: null,
    coins: [],
    startPrices: {},
    currentPrices: {},
    previousPrices: {},
    timerInterval: null,
    priceInterval: null,
    remainingSeconds: 0,
    stats: { wins: 0, losses: 0, streak: 0, bestStreak: 0 }
};

const COIN_CONFIG = [
    { id: 'solana', symbol: 'SOL', name: 'Solana', emoji: '⚡' },
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', emoji: '₿' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', emoji: 'Ξ' },
    { id: 'bonk', symbol: 'BONK', name: 'Bonk', emoji: '🐶' },
    { id: 'jupiter-exchange-solana', symbol: 'JUP', name: 'Jupiter', emoji: '🪐' },
    { id: 'dogwifcoin', symbol: 'WIF', name: 'dogwifhat', emoji: '🐕' }
];

const API_BASE = 'https://api.coingecko.com/api/v3';
let lastApiCall = 0;
const API_COOLDOWN = 6000;

// ============ DOPAMINE SYSTEMS ============

// Sound effects using Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        switch(type) {
            case 'select':
                osc.frequency.setValueAtTime(800, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
                osc.start(); osc.stop(audioCtx.currentTime + 0.15);
                break;
            case 'tick':
                osc.frequency.setValueAtTime(600, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
                osc.start(); osc.stop(audioCtx.currentTime + 0.05);
                break;
            case 'urgent':
                osc.frequency.setValueAtTime(900, audioCtx.currentTime);
                osc.frequency.setValueAtTime(700, audioCtx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
                osc.start(); osc.stop(audioCtx.currentTime + 0.2);
                break;
            case 'win':
                // Victory fanfare
                [0, 0.1, 0.2, 0.3, 0.4].forEach((t, i) => {
                    const o = audioCtx.createOscillator();
                    const g = audioCtx.createGain();
                    o.connect(g); g.connect(audioCtx.destination);
                    o.frequency.setValueAtTime([523, 659, 784, 1047, 1319][i], audioCtx.currentTime + t);
                    g.gain.setValueAtTime(0.12, audioCtx.currentTime + t);
                    g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + t + 0.2);
                    o.start(audioCtx.currentTime + t);
                    o.stop(audioCtx.currentTime + t + 0.2);
                });
                return;
            case 'lose':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(400, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.4);
                gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
                osc.start(); osc.stop(audioCtx.currentTime + 0.4);
                break;
            case 'countdown':
                osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                osc.start(); osc.stop(audioCtx.currentTime + 0.1);
                break;
            case 'priceUp':
                osc.frequency.setValueAtTime(600, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(900, audioCtx.currentTime + 0.08);
                gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                osc.start(); osc.stop(audioCtx.currentTime + 0.1);
                break;
            case 'priceDown':
                osc.frequency.setValueAtTime(500, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.08);
                gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
                osc.start(); osc.stop(audioCtx.currentTime + 0.08);
                break;
        }
    } catch(e) {}
}

// Haptic feedback
function vibrate(pattern) {
    if (navigator.vibrate) navigator.vibrate(pattern);
}

// Confetti
function launchConfetti() {
    const canvas = document.getElementById('confetti');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const colors = ['#14F195', '#9945FF', '#FFD700', '#FF6600', '#00ff88', '#ff4444', '#ffffff'];
    
    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: -20 - Math.random() * 200,
            w: Math.random() * 10 + 5,
            h: Math.random() * 6 + 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            vx: (Math.random() - 0.5) * 8,
            vy: Math.random() * 4 + 2,
            rotation: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 10,
            opacity: 1
        });
    }
    
    let frame = 0;
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1;
            p.rotation += p.rotSpeed;
            p.opacity -= 0.005;
            
            if (p.opacity <= 0) return;
            
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation * Math.PI / 180);
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
            ctx.restore();
        });
        
        frame++;
        if (frame < 180) requestAnimationFrame(animate);
        else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    animate();
}

// Screen shake
function screenShake() {
    document.getElementById('app').classList.add('screen-shake');
    setTimeout(() => document.getElementById('app').classList.remove('screen-shake'), 400);
}

// Number counter animation
function animateNumber(el, from, to, duration = 1000, suffix = '%') {
    const start = performance.now();
    function update(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        const current = from + (to - from) * eased;
        el.textContent = `${current >= 0 ? '+' : ''}${current.toFixed(4)}${suffix}`;
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// ============ API ============

async function fetchWithRateLimit(url) {
    const now = Date.now();
    const wait = API_COOLDOWN - (now - lastApiCall);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    lastApiCall = Date.now();
    const response = await fetch(url);
    if (response.status === 429) {
        await new Promise(r => setTimeout(r, 10000));
        lastApiCall = Date.now();
        return await fetch(url);
    }
    return response;
}

// ============ DOM ============

const modeSelect = document.getElementById('modeSelect');
const gameActive = document.getElementById('gameActive');
const resultsEl = document.getElementById('results');
const leaderboardEl = document.getElementById('leaderboard');
const coinGrid = document.getElementById('coinGrid');
const timerDisplay = document.getElementById('timer');
const progressFill = document.getElementById('progressFill');
const streakDisplay = document.getElementById('streak');
const winsDisplay = document.getElementById('wins');

// ============ INIT ============

document.addEventListener('DOMContentLoaded', () => {
    // Add confetti canvas
    if (!document.getElementById('confetti')) {
        const c = document.createElement('canvas');
        c.id = 'confetti';
        document.body.appendChild(c);
    }
    
    loadStats();
    setupEventListeners();
    updateStatsDisplay();
});

function setupEventListeners() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            gameState.timeframe = parseInt(e.target.dataset.minutes);
            playSound('select');
            vibrate(10);
        });
    });

    document.getElementById('startGame').addEventListener('click', startGame);
    document.getElementById('cancelGame').addEventListener('click', cancelGame);
    document.getElementById('playAgain').addEventListener('click', () => {
        playSound('select');
        showScreen('select');
    });
    document.getElementById('viewLeaderboard').addEventListener('click', () => {
        playSound('select');
        showLeaderboard();
    });
    document.getElementById('backToGame').addEventListener('click', () => {
        playSound('select');
        showScreen('select');
    });
}

function showScreen(screen) {
    [modeSelect, gameActive, resultsEl, leaderboardEl].forEach(el => el.classList.add('hidden'));
    const map = { select: modeSelect, active: gameActive, results: resultsEl, leaderboard: leaderboardEl };
    if (map[screen]) map[screen].classList.remove('hidden');
    gameState.mode = screen;
}

// ============ GAME FLOW ============

async function startGame() {
    const startBtn = document.getElementById('startGame');
    startBtn.textContent = '⏳ Loading...';
    startBtn.disabled = true;

    const shuffled = [...COIN_CONFIG].sort(() => Math.random() - 0.5);
    gameState.coins = shuffled.slice(0, 4);
    gameState.selectedCoin = null;
    gameState.startPrices = {};
    gameState.currentPrices = {};
    gameState.previousPrices = {};

    const success = await fetchStartPrices();
    
    startBtn.textContent = 'Start Game';
    startBtn.disabled = false;

    if (!success) {
        alert('Could not fetch prices. Try again in a few seconds.');
        return;
    }

    // Resume audio context (mobile requires user interaction)
    if (audioCtx.state === 'suspended') audioCtx.resume();

    playSound('select');
    vibrate(50);
    showScreen('active');
    renderCoins();

    gameState.remainingSeconds = gameState.timeframe * 60;
    startTimer();
    gameState.priceInterval = setInterval(updateLivePrices, 15000);
}

async function fetchStartPrices() {
    const ids = gameState.coins.map(c => c.id).join(',');
    try {
        const response = await fetchWithRateLimit(`${API_BASE}/simple/price?ids=${ids}&vs_currencies=usd`);
        if (!response.ok) return false;
        const data = await response.json();
        
        let allGood = true;
        gameState.coins.forEach(coin => {
            if (data[coin.id] && data[coin.id].usd) {
                gameState.startPrices[coin.id] = data[coin.id].usd;
                gameState.currentPrices[coin.id] = data[coin.id].usd;
                gameState.previousPrices[coin.id] = data[coin.id].usd;
            } else {
                allGood = false;
            }
        });
        return allGood;
    } catch (e) {
        console.error('Fetch error:', e);
        return false;
    }
}

function renderCoins() {
    coinGrid.innerHTML = '';
    gameState.coins.forEach((coin, i) => {
        const price = gameState.startPrices[coin.id];
        const card = document.createElement('div');
        card.className = 'coin-card';
        card.dataset.coinId = coin.id;
        card.style.animation = `fadeInUp 0.3s ${i * 0.1}s both`;
        card.innerHTML = `
            <div class="coin-symbol">${coin.emoji}</div>
            <div class="coin-name">${coin.symbol}</div>
            <div class="coin-price">${formatPrice(price)}</div>
            <div class="coin-change" style="color: var(--text-secondary)">0.0000%</div>
        `;
        card.addEventListener('click', () => selectCoin(coin.id));
        coinGrid.appendChild(card);
    });
}

function formatPrice(price) {
    if (price >= 1000) return '$' + price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    if (price >= 1) return '$' + price.toFixed(2);
    if (price >= 0.01) return '$' + price.toFixed(4);
    if (price >= 0.0001) return '$' + price.toFixed(6);
    return '$' + price.toFixed(8);
}

function selectCoin(coinId) {
    gameState.selectedCoin = gameState.selectedCoin === coinId ? null : coinId;
    
    document.querySelectorAll('.coin-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.coinId === gameState.selectedCoin);
    });
    
    playSound('select');
    vibrate(15);
}

function startTimer() {
    const totalSeconds = gameState.timeframe * 60;
    
    gameState.timerInterval = setInterval(() => {
        gameState.remainingSeconds--;
        
        const minutes = Math.floor(gameState.remainingSeconds / 60);
        const seconds = gameState.remainingSeconds % 60;
        timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        const progress = (gameState.remainingSeconds / totalSeconds) * 100;
        progressFill.style.width = `${progress}%`;
        
        // Urgent mode (last 30 seconds)
        if (gameState.remainingSeconds <= 30 && gameState.remainingSeconds > 10) {
            timerDisplay.className = 'timer urgent';
            if (gameState.remainingSeconds % 5 === 0) playSound('tick');
        }
        
        // Critical mode (last 10 seconds)
        if (gameState.remainingSeconds <= 10) {
            timerDisplay.className = 'timer critical';
            playSound('countdown');
            vibrate(30);
        }
        
        // Final 3 seconds — big countdown
        if (gameState.remainingSeconds <= 3 && gameState.remainingSeconds > 0) {
            screenShake();
            vibrate(100);
        }
        
        if (gameState.remainingSeconds <= 0) {
            endGame();
        }
    }, 1000);
}

async function updateLivePrices() {
    const ids = gameState.coins.map(c => c.id).join(',');
    try {
        const response = await fetchWithRateLimit(`${API_BASE}/simple/price?ids=${ids}&vs_currencies=usd`);
        if (!response.ok) return;
        const data = await response.json();
        
        gameState.coins.forEach(coin => {
            if (!data[coin.id] || !data[coin.id].usd) return;
            
            const currentPrice = data[coin.id].usd;
            const previousPrice = gameState.currentPrices[coin.id];
            gameState.previousPrices[coin.id] = previousPrice;
            gameState.currentPrices[coin.id] = currentPrice;
            
            const startPrice = gameState.startPrices[coin.id];
            const change = ((currentPrice - startPrice) / startPrice) * 100;
            const priceDirection = currentPrice > previousPrice ? 'up' : currentPrice < previousPrice ? 'down' : 'same';
            
            const card = document.querySelector(`.coin-card[data-coin-id="${coin.id}"]`);
            if (!card) return;
            
            card.querySelector('.coin-price').textContent = formatPrice(currentPrice);
            const changeEl = card.querySelector('.coin-change');
            changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(4)}%`;
            changeEl.className = `coin-change ${change >= 0 ? 'positive' : 'negative'}`;
            
            // Flash animation on price change
            if (priceDirection !== 'same') {
                changeEl.classList.add(priceDirection === 'up' ? 'flash-green' : 'flash-red');
                setTimeout(() => changeEl.classList.remove('flash-green', 'flash-red'), 400);
                
                if (priceDirection === 'up') playSound('priceUp');
                else playSound('priceDown');
            }
        });
    } catch (e) {
        console.error('Price update error:', e);
    }
}

async function endGame() {
    clearInterval(gameState.timerInterval);
    clearInterval(gameState.priceInterval);
    
    // Final price fetch
    const ids = gameState.coins.map(c => c.id).join(',');
    try {
        const response = await fetchWithRateLimit(`${API_BASE}/simple/price?ids=${ids}&vs_currencies=usd`);
        if (response.ok) {
            const data = await response.json();
            gameState.coins.forEach(coin => {
                if (data[coin.id] && data[coin.id].usd) {
                    gameState.currentPrices[coin.id] = data[coin.id].usd;
                }
            });
        }
    } catch (e) {}
    
    const changes = gameState.coins.map(coin => {
        const startPrice = gameState.startPrices[coin.id];
        const endPrice = gameState.currentPrices[coin.id];
        const change = ((endPrice - startPrice) / startPrice) * 100;
        return { coin, change, startPrice, endPrice };
    });
    
    const winner = changes.reduce((max, curr) => curr.change > max.change ? curr : max, changes[0]);
    const userWon = gameState.selectedCoin && gameState.selectedCoin === winner.coin.id;
    const noPick = !gameState.selectedCoin;
    
    if (!noPick) {
        if (userWon) {
            gameState.stats.wins++;
            gameState.stats.streak++;
            if (gameState.stats.streak > gameState.stats.bestStreak) {
                gameState.stats.bestStreak = gameState.stats.streak;
            }
        } else {
            gameState.stats.losses++;
            gameState.stats.streak = 0;
        }
        saveStats();
        updateStatsDisplay();
    }
    
    showResults(userWon, noPick, winner, changes);
}

function showResults(won, noPick, winner, changes) {
    const resultIcon = document.getElementById('resultIcon');
    const resultText = document.getElementById('resultText');
    
    if (noPick) {
        resultIcon.textContent = '🤷';
        resultIcon.className = 'result-icon lose';
        resultText.textContent = "You Didn't Pick!";
        resultText.className = 'result-text';
        resultText.style.color = 'var(--text-secondary)';
    } else if (won) {
        // 🎉 WIN CELEBRATION
        resultIcon.textContent = '🎉';
        resultIcon.className = 'result-icon win';
        resultText.textContent = 'YOU WON!';
        resultText.className = 'result-text win';
        
        playSound('win');
        vibrate([100, 50, 100, 50, 200]);
        launchConfetti();
        screenShake();
        
        // Show streak if > 1
        const streakEl = document.querySelector('.result-streak') || createStreakEl();
        if (gameState.stats.streak > 1) {
            streakEl.textContent = `🔥 ${gameState.stats.streak} WIN STREAK!`;
            streakEl.classList.remove('hidden');
        } else {
            streakEl.classList.add('hidden');
        }
    } else {
        // 😢 LOSS
        resultIcon.textContent = '💀';
        resultIcon.className = 'result-icon lose';
        resultText.textContent = 'Not This Time...';
        resultText.className = 'result-text';
        resultText.style.color = 'var(--error)';
        
        playSound('lose');
        vibrate(200);
        screenShake();
    }
    
    const winningCoin = document.getElementById('winningCoin');
    winningCoin.innerHTML = `
        <strong>${winner.coin.emoji} ${winner.coin.symbol}</strong> won with 
        <strong style="color: var(--success)">${winner.change >= 0 ? '+' : ''}${winner.change.toFixed(4)}%</strong>
    `;
    
    const priceChanges = document.getElementById('priceChanges');
    priceChanges.innerHTML = changes
        .sort((a, b) => b.change - a.change)
        .map(({ coin, change, startPrice, endPrice }, i) => `
            <div class="price-change-item" style="animation: fadeInUp 0.3s ${i * 0.1}s both">
                <span>${coin.emoji} ${coin.symbol}</span>
                <span style="color: var(--text-secondary); font-size: 0.75rem;">
                    ${formatPrice(startPrice)} → ${formatPrice(endPrice)}
                </span>
                <span class="${change >= 0 ? 'positive' : 'negative'}" style="font-weight: 700">
                    ${change >= 0 ? '+' : ''}${change.toFixed(4)}%
                </span>
            </div>
        `).join('');
    
    showScreen('results');
}

function createStreakEl() {
    const el = document.createElement('div');
    el.className = 'result-streak';
    document.getElementById('resultText').after(el);
    return el;
}

function cancelGame() {
    clearInterval(gameState.timerInterval);
    clearInterval(gameState.priceInterval);
    showScreen('select');
}

function showLeaderboard() {
    const list = document.getElementById('leaderboardList');
    const total = gameState.stats.wins + gameState.stats.losses;
    const rate = total > 0 ? ((gameState.stats.wins / total) * 100).toFixed(1) : '0.0';
    
    list.innerHTML = `
        <div class="leaderboard-item"><div class="leaderboard-rank">🏆</div><div class="leaderboard-name">Total Wins</div><div class="leaderboard-score">${gameState.stats.wins}</div></div>
        <div class="leaderboard-item"><div class="leaderboard-rank">❌</div><div class="leaderboard-name">Total Losses</div><div class="leaderboard-score">${gameState.stats.losses}</div></div>
        <div class="leaderboard-item"><div class="leaderboard-rank">🔥</div><div class="leaderboard-name">Current Streak</div><div class="leaderboard-score">${gameState.stats.streak}</div></div>
        <div class="leaderboard-item"><div class="leaderboard-rank">⭐</div><div class="leaderboard-name">Best Streak</div><div class="leaderboard-score">${gameState.stats.bestStreak}</div></div>
        <div class="leaderboard-item"><div class="leaderboard-rank">📊</div><div class="leaderboard-name">Win Rate</div><div class="leaderboard-score">${rate}%</div></div>
        <div class="leaderboard-item"><div class="leaderboard-rank">🎮</div><div class="leaderboard-name">Games Played</div><div class="leaderboard-score">${total}</div></div>
    `;
    showScreen('leaderboard');
}

function updateStatsDisplay() {
    streakDisplay.textContent = gameState.stats.streak;
    winsDisplay.textContent = gameState.stats.wins;
    
    const streakEl = document.querySelector('.streak');
    if (gameState.stats.streak >= 3) {
        streakEl.classList.add('on-fire');
    } else {
        streakEl.classList.remove('on-fire');
    }
}

function loadStats() {
    const saved = localStorage.getItem('coinpick_stats');
    if (saved) gameState.stats = JSON.parse(saved);
}

function saveStats() {
    localStorage.setItem('coinpick_stats', JSON.stringify(gameState.stats));
}
