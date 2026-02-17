// CoinPick Game Logic

// Game State
let gameState = {
    mode: 'select',
    timeframe: 15,
    selectedCoin: null,
    coins: [],
    startPrices: {},
    currentPrices: {},
    timerInterval: null,
    priceInterval: null,
    remainingSeconds: 0,
    stats: {
        wins: 0,
        losses: 0,
        streak: 0,
        bestStreak: 0
    }
};

// Coin configurations
const COIN_CONFIG = [
    { id: 'solana', symbol: 'SOL', name: 'Solana', emoji: '⚡' },
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', emoji: '₿' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', emoji: 'Ξ' },
    { id: 'bonk', symbol: 'BONK', name: 'Bonk', emoji: '🐶' },
    { id: 'jupiter-exchange-solana', symbol: 'JUP', name: 'Jupiter', emoji: '🪐' },
    { id: 'dogwifcoin', symbol: 'WIF', name: 'dogwifhat', emoji: '🐕' }
];

// API - using CoinGecko with retry and rate limit handling
const API_BASE = 'https://api.coingecko.com/api/v3';
let lastApiCall = 0;
const API_COOLDOWN = 6000; // 6 seconds between calls (free tier = ~10/min)

async function fetchWithRateLimit(url) {
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCall;
    if (timeSinceLastCall < API_COOLDOWN) {
        await new Promise(r => setTimeout(r, API_COOLDOWN - timeSinceLastCall));
    }
    lastApiCall = Date.now();
    
    const response = await fetch(url);
    if (response.status === 429) {
        // Rate limited — wait and retry once
        await new Promise(r => setTimeout(r, 10000));
        lastApiCall = Date.now();
        return await fetch(url);
    }
    return response;
}

// DOM Elements
const modeSelect = document.getElementById('modeSelect');
const gameActive = document.getElementById('gameActive');
const results = document.getElementById('results');
const leaderboard = document.getElementById('leaderboard');
const coinGrid = document.getElementById('coinGrid');
const timerDisplay = document.getElementById('timer');
const progressFill = document.getElementById('progressFill');
const streakDisplay = document.getElementById('streak');
const winsDisplay = document.getElementById('wins');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
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
        });
    });

    document.getElementById('startGame').addEventListener('click', startGame);
    document.getElementById('cancelGame').addEventListener('click', cancelGame);
    document.getElementById('playAgain').addEventListener('click', () => showScreen('select'));
    document.getElementById('viewLeaderboard').addEventListener('click', showLeaderboard);
    document.getElementById('backToGame').addEventListener('click', () => showScreen('select'));
}

function showScreen(screen) {
    modeSelect.classList.add('hidden');
    gameActive.classList.add('hidden');
    results.classList.add('hidden');
    leaderboard.classList.add('hidden');

    const el = { select: modeSelect, active: gameActive, results: results, leaderboard: leaderboard }[screen];
    if (el) el.classList.remove('hidden');
    gameState.mode = screen;
}

async function startGame() {
    // Show loading state
    const startBtn = document.getElementById('startGame');
    startBtn.textContent = 'Loading prices...';
    startBtn.disabled = true;

    // Select 4 random coins
    const shuffled = [...COIN_CONFIG].sort(() => Math.random() - 0.5);
    gameState.coins = shuffled.slice(0, 4);
    gameState.selectedCoin = null;
    gameState.startPrices = {};
    gameState.currentPrices = {};

    // Fetch starting prices
    const success = await fetchStartPrices();
    
    startBtn.textContent = 'Start Game';
    startBtn.disabled = false;

    if (!success) {
        alert('Could not fetch prices. Try again in a few seconds.');
        return;
    }

    showScreen('active');
    renderCoins();

    // Start timer
    gameState.remainingSeconds = gameState.timeframe * 60;
    startTimer();

    // Start price updates (every 15 seconds to stay within rate limits)
    gameState.priceInterval = setInterval(updateLivePrices, 15000);
}

async function fetchStartPrices() {
    const ids = gameState.coins.map(c => c.id).join(',');
    try {
        const response = await fetchWithRateLimit(
            `${API_BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
        );
        
        if (!response.ok) {
            console.error('API error:', response.status);
            return false;
        }

        const data = await response.json();
        
        let allGood = true;
        gameState.coins.forEach(coin => {
            if (data[coin.id] && data[coin.id].usd) {
                gameState.startPrices[coin.id] = data[coin.id].usd;
                gameState.currentPrices[coin.id] = data[coin.id].usd;
            } else {
                allGood = false;
            }
        });

        return allGood;
    } catch (error) {
        console.error('Error fetching prices:', error);
        return false;
    }
}

function renderCoins() {
    coinGrid.innerHTML = '';
    
    gameState.coins.forEach(coin => {
        const price = gameState.startPrices[coin.id];
        const card = document.createElement('div');
        card.className = 'coin-card';
        card.dataset.coinId = coin.id;
        
        // Format price based on value
        const priceStr = formatPrice(price);
        
        card.innerHTML = `
            <div class="coin-symbol">${coin.emoji}</div>
            <div class="coin-name">${coin.symbol}</div>
            <div class="coin-price">${priceStr}</div>
            <div class="coin-change" style="color: var(--text-secondary)">0.00%</div>
        `;
        card.addEventListener('click', () => selectCoin(coin.id));
        coinGrid.appendChild(card);
    });
}

function formatPrice(price) {
    if (price >= 1000) return '$' + price.toFixed(2);
    if (price >= 1) return '$' + price.toFixed(2);
    if (price >= 0.01) return '$' + price.toFixed(4);
    if (price >= 0.0001) return '$' + price.toFixed(6);
    return '$' + price.toFixed(8);
}

function selectCoin(coinId) {
    if (gameState.selectedCoin === coinId) {
        gameState.selectedCoin = null;
    } else {
        gameState.selectedCoin = coinId;
    }
    
    document.querySelectorAll('.coin-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.coinId === gameState.selectedCoin);
    });
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
        
        if (gameState.remainingSeconds <= 0) {
            endGame();
        }
    }, 1000);
}

async function updateLivePrices() {
    const ids = gameState.coins.map(c => c.id).join(',');
    try {
        const response = await fetchWithRateLimit(
            `${API_BASE}/simple/price?ids=${ids}&vs_currencies=usd`
        );
        
        if (!response.ok) return;
        
        const data = await response.json();
        
        gameState.coins.forEach(coin => {
            if (data[coin.id] && data[coin.id].usd) {
                const currentPrice = data[coin.id].usd;
                gameState.currentPrices[coin.id] = currentPrice;
                const startPrice = gameState.startPrices[coin.id];
                const change = ((currentPrice - startPrice) / startPrice) * 100;
                
                const card = document.querySelector(`.coin-card[data-coin-id="${coin.id}"]`);
                if (card) {
                    card.querySelector('.coin-price').textContent = formatPrice(currentPrice);
                    const changeEl = card.querySelector('.coin-change');
                    changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(4)}%`;
                    changeEl.className = `coin-change ${change >= 0 ? 'positive' : 'negative'}`;
                }
            }
        });
    } catch (error) {
        console.error('Error updating prices:', error);
    }
}

async function endGame() {
    clearInterval(gameState.timerInterval);
    clearInterval(gameState.priceInterval);
    
    // Fetch final prices
    const ids = gameState.coins.map(c => c.id).join(',');
    try {
        const response = await fetchWithRateLimit(
            `${API_BASE}/simple/price?ids=${ids}&vs_currencies=usd`
        );
        if (response.ok) {
            const data = await response.json();
            gameState.coins.forEach(coin => {
                if (data[coin.id] && data[coin.id].usd) {
                    gameState.currentPrices[coin.id] = data[coin.id].usd;
                }
            });
        }
    } catch (e) {
        console.error('Error fetching final prices:', e);
    }
    
    // Calculate real % changes
    const changes = gameState.coins.map(coin => {
        const startPrice = gameState.startPrices[coin.id];
        const endPrice = gameState.currentPrices[coin.id];
        const change = ((endPrice - startPrice) / startPrice) * 100;
        return { coin, change, startPrice, endPrice };
    });
    
    // Find winner (biggest % gain)
    const winner = changes.reduce((max, curr) => curr.change > max.change ? curr : max, changes[0]);
    
    // Check if user picked correctly
    const userWon = gameState.selectedCoin && gameState.selectedCoin === winner.coin.id;
    const noPick = !gameState.selectedCoin;
    
    // Update stats (only if they made a pick)
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
        resultText.textContent = "You Didn't Pick!";
        resultText.style.color = 'var(--text-secondary)';
    } else if (won) {
        resultIcon.textContent = '🎉';
        resultText.textContent = 'You Won!';
        resultText.style.color = 'var(--success)';
    } else {
        resultIcon.textContent = '😢';
        resultText.textContent = 'Better Luck Next Time';
        resultText.style.color = 'var(--error)';
    }
    
    const winningCoin = document.getElementById('winningCoin');
    winningCoin.innerHTML = `
        <strong>${winner.coin.emoji} ${winner.coin.symbol}</strong> had the biggest gain at 
        <strong style="color: var(--success)">${winner.change >= 0 ? '+' : ''}${winner.change.toFixed(4)}%</strong>
    `;
    
    const priceChanges = document.getElementById('priceChanges');
    priceChanges.innerHTML = changes
        .sort((a, b) => b.change - a.change)
        .map(({ coin, change, startPrice, endPrice }) => `
            <div class="price-change-item">
                <span>${coin.emoji} ${coin.symbol}</span>
                <span style="color: var(--text-secondary); font-size: 0.8rem;">
                    ${formatPrice(startPrice)} → ${formatPrice(endPrice)}
                </span>
                <span class="${change >= 0 ? 'positive' : 'negative'}">
                    ${change >= 0 ? '+' : ''}${change.toFixed(4)}%
                </span>
            </div>
        `).join('');
    
    showScreen('results');
}

function cancelGame() {
    clearInterval(gameState.timerInterval);
    clearInterval(gameState.priceInterval);
    showScreen('select');
}

function showLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    const totalGames = gameState.stats.wins + gameState.stats.losses;
    const winRate = totalGames > 0 ? ((gameState.stats.wins / totalGames) * 100).toFixed(1) : '0.0';
    
    leaderboardList.innerHTML = `
        <div class="leaderboard-item">
            <div class="leaderboard-rank">🏆</div>
            <div class="leaderboard-name">Total Wins</div>
            <div class="leaderboard-score">${gameState.stats.wins}</div>
        </div>
        <div class="leaderboard-item">
            <div class="leaderboard-rank">❌</div>
            <div class="leaderboard-name">Total Losses</div>
            <div class="leaderboard-score">${gameState.stats.losses}</div>
        </div>
        <div class="leaderboard-item">
            <div class="leaderboard-rank">🔥</div>
            <div class="leaderboard-name">Current Streak</div>
            <div class="leaderboard-score">${gameState.stats.streak}</div>
        </div>
        <div class="leaderboard-item">
            <div class="leaderboard-rank">⭐</div>
            <div class="leaderboard-name">Best Streak</div>
            <div class="leaderboard-score">${gameState.stats.bestStreak}</div>
        </div>
        <div class="leaderboard-item">
            <div class="leaderboard-rank">📊</div>
            <div class="leaderboard-name">Win Rate</div>
            <div class="leaderboard-score">${winRate}%</div>
        </div>
        <div class="leaderboard-item">
            <div class="leaderboard-rank">🎮</div>
            <div class="leaderboard-name">Games Played</div>
            <div class="leaderboard-score">${totalGames}</div>
        </div>
    `;
    
    showScreen('leaderboard');
}

// Stats management
function loadStats() {
    const saved = localStorage.getItem('coinpick_stats');
    if (saved) {
        gameState.stats = JSON.parse(saved);
    }
}

function saveStats() {
    localStorage.setItem('coinpick_stats', JSON.stringify(gameState.stats));
}

function updateStatsDisplay() {
    streakDisplay.textContent = gameState.stats.streak;
    winsDisplay.textContent = gameState.stats.wins;
}
