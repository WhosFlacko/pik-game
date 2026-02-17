// CoinPick Game Logic

// Game State
let gameState = {
    mode: 'select', // select | active | results | leaderboard
    timeframe: 15, // minutes
    selectedCoin: null,
    coins: [],
    startPrices: {},
    endPrices: {},
    timerInterval: null,
    remainingSeconds: 0,
    stats: {
        wins: 0,
        losses: 0,
        streak: 0,
        bestStreak: 0
    }
};

// Coin configurations (top traded Solana ecosystem + majors)
const COIN_CONFIG = [
    { id: 'solana', symbol: 'SOL', name: 'Solana', emoji: '⚡' },
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', emoji: '₿' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', emoji: 'Ξ' },
    { id: 'bonk', symbol: 'BONK', name: 'Bonk', emoji: '🐶' },
    { id: 'jupiter-exchange-solana', symbol: 'JUP', name: 'Jupiter', emoji: '🪐' },
    { id: 'dogwifcoin', symbol: 'WIF', name: 'dogwifhat', emoji: '🐕' }
];

// API Configuration
const API_BASE = 'https://api.coingecko.com/api/v3';

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
    // Mode selection
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            gameState.timeframe = parseInt(e.target.dataset.minutes);
        });
    });

    // Start game
    document.getElementById('startGame').addEventListener('click', startGame);

    // Cancel game
    document.getElementById('cancelGame').addEventListener('click', cancelGame);

    // Play again
    document.getElementById('playAgain').addEventListener('click', () => {
        showScreen('select');
    });

    // Leaderboard
    document.getElementById('viewLeaderboard').addEventListener('click', showLeaderboard);
    document.getElementById('backToGame').addEventListener('click', () => {
        showScreen('select');
    });
}

function showScreen(screen) {
    modeSelect.classList.add('hidden');
    gameActive.classList.add('hidden');
    results.classList.add('hidden');
    leaderboard.classList.add('hidden');

    if (screen === 'select') {
        modeSelect.classList.remove('hidden');
        gameState.mode = 'select';
    } else if (screen === 'active') {
        gameActive.classList.remove('hidden');
        gameState.mode = 'active';
    } else if (screen === 'results') {
        results.classList.remove('hidden');
        gameState.mode = 'results';
    } else if (screen === 'leaderboard') {
        leaderboard.classList.remove('hidden');
        gameState.mode = 'leaderboard';
    }
}

async function startGame() {
    showScreen('active');

    // Select 4 random coins
    gameState.coins = COIN_CONFIG.sort(() => Math.random() - 0.5).slice(0, 4);
    gameState.selectedCoin = null;

    // Fetch starting prices
    await fetchPrices('start');

    // Render coins
    renderCoins();

    // Start timer
    gameState.remainingSeconds = gameState.timeframe * 60;
    startTimer();
}

async function fetchPrices(type) {
    const ids = gameState.coins.map(c => c.id).join(',');
    try {
        const response = await fetch(`${API_BASE}/simple/price?ids=${ids}&vs_currencies=usd`);
        const data = await response.json();
        
        gameState.coins.forEach(coin => {
            const price = data[coin.id]?.usd || 0;
            if (type === 'start') {
                gameState.startPrices[coin.id] = price;
            } else {
                gameState.endPrices[coin.id] = price;
            }
        });
    } catch (error) {
        console.error('Error fetching prices:', error);
        // Fallback: simulate random prices for demo
        gameState.coins.forEach(coin => {
            const basePrice = Math.random() * 100 + 10;
            if (type === 'start') {
                gameState.startPrices[coin.id] = basePrice;
            } else {
                const change = (Math.random() - 0.5) * 10; // -5% to +5%
                gameState.endPrices[coin.id] = basePrice * (1 + change / 100);
            }
        });
    }
}

function renderCoins() {
    coinGrid.innerHTML = '';
    
    gameState.coins.forEach(coin => {
        const price = gameState.startPrices[coin.id];
        const card = document.createElement('div');
        card.className = 'coin-card';
        card.dataset.coinId = coin.id;
        card.innerHTML = `
            <div class="coin-symbol">${coin.emoji}</div>
            <div class="coin-name">${coin.symbol}</div>
            <div class="coin-price">$${price.toFixed(4)}</div>
            <div class="coin-change">--</div>
        `;
        card.addEventListener('click', () => selectCoin(coin.id));
        coinGrid.appendChild(card);
    });
}

function selectCoin(coinId) {
    if (gameState.selectedCoin === coinId) {
        gameState.selectedCoin = null;
    } else {
        gameState.selectedCoin = coinId;
    }
    
    // Update UI
    document.querySelectorAll('.coin-card').forEach(card => {
        if (card.dataset.coinId === gameState.selectedCoin) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
}

function startTimer() {
    const totalSeconds = gameState.timeframe * 60;
    
    gameState.timerInterval = setInterval(async () => {
        gameState.remainingSeconds--;
        
        // Update timer display
        const minutes = Math.floor(gameState.remainingSeconds / 60);
        const seconds = gameState.remainingSeconds % 60;
        timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // Update progress bar
        const progress = (gameState.remainingSeconds / totalSeconds) * 100;
        progressFill.style.width = `${progress}%`;
        
        // Fetch live prices every 10 seconds
        if (gameState.remainingSeconds % 10 === 0) {
            await updateLivePrices();
        }
        
        // End game
        if (gameState.remainingSeconds <= 0) {
            endGame();
        }
    }, 1000);
}

async function updateLivePrices() {
    const ids = gameState.coins.map(c => c.id).join(',');
    try {
        const response = await fetch(`${API_BASE}/simple/price?ids=${ids}&vs_currencies=usd`);
        const data = await response.json();
        
        gameState.coins.forEach(coin => {
            const currentPrice = data[coin.id]?.usd || gameState.startPrices[coin.id];
            const startPrice = gameState.startPrices[coin.id];
            const change = ((currentPrice - startPrice) / startPrice) * 100;
            
            const card = document.querySelector(`.coin-card[data-coin-id="${coin.id}"]`);
            if (card) {
                const changeEl = card.querySelector('.coin-change');
                const priceEl = card.querySelector('.coin-price');
                priceEl.textContent = `$${currentPrice.toFixed(4)}`;
                changeEl.textContent = `${change > 0 ? '+' : ''}${change.toFixed(2)}%`;
                changeEl.className = `coin-change ${change >= 0 ? 'positive' : 'negative'}`;
            }
        });
    } catch (error) {
        console.error('Error updating prices:', error);
    }
}

async function endGame() {
    clearInterval(gameState.timerInterval);
    
    // Fetch final prices
    await fetchPrices('end');
    
    // Calculate changes
    const changes = gameState.coins.map(coin => {
        const startPrice = gameState.startPrices[coin.id];
        const endPrice = gameState.endPrices[coin.id];
        const change = ((endPrice - startPrice) / startPrice) * 100;
        return { coin, change };
    });
    
    // Find winner
    const winner = changes.reduce((max, curr) => curr.change > max.change ? curr : max, changes[0]);
    
    // Check if user won
    const userWon = gameState.selectedCoin === winner.coin.id;
    
    // Update stats
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
    
    // Show results
    showResults(userWon, winner, changes);
}

function showResults(won, winner, changes) {
    // Update result icon and text
    const resultIcon = document.getElementById('resultIcon');
    const resultText = document.getElementById('resultText');
    
    if (won) {
        resultIcon.textContent = '🎉';
        resultText.textContent = 'You Won!';
        resultText.style.color = 'var(--success)';
    } else {
        resultIcon.textContent = '😢';
        resultText.textContent = 'Better Luck Next Time';
        resultText.style.color = 'var(--error)';
    }
    
    // Show winning coin
    const winningCoin = document.getElementById('winningCoin');
    winningCoin.innerHTML = `
        <strong>${winner.coin.emoji} ${winner.coin.symbol}</strong> had the biggest gain at 
        <strong style="color: var(--success)">+${winner.change.toFixed(2)}%</strong>
    `;
    
    // Show all changes
    const priceChanges = document.getElementById('priceChanges');
    priceChanges.innerHTML = changes
        .sort((a, b) => b.change - a.change)
        .map(({ coin, change }) => `
            <div class="price-change-item">
                <span>${coin.emoji} ${coin.symbol}</span>
                <span class="${change >= 0 ? 'positive' : 'negative'}">
                    ${change > 0 ? '+' : ''}${change.toFixed(2)}%
                </span>
            </div>
        `).join('');
    
    // Highlight correct/wrong cards
    document.querySelectorAll('.coin-card').forEach(card => {
        const coinId = card.dataset.coinId;
        if (coinId === winner.coin.id) {
            card.classList.add('correct');
        } else if (coinId === gameState.selectedCoin) {
            card.classList.add('wrong');
        }
    });
    
    showScreen('results');
}

function cancelGame() {
    clearInterval(gameState.timerInterval);
    showScreen('select');
}

function showLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    
    // For now, show personal stats
    // TODO: Implement real leaderboard with backend
    leaderboardList.innerHTML = `
        <div class="leaderboard-item">
            <div class="leaderboard-rank">#1</div>
            <div class="leaderboard-name">You</div>
            <div class="leaderboard-score">${gameState.stats.wins} wins</div>
        </div>
        <div class="leaderboard-item">
            <div class="leaderboard-rank">🔥</div>
            <div class="leaderboard-name">Best Streak</div>
            <div class="leaderboard-score">${gameState.stats.bestStreak}</div>
        </div>
        <div class="leaderboard-item">
            <div class="leaderboard-rank">📊</div>
            <div class="leaderboard-name">Win Rate</div>
            <div class="leaderboard-score">
                ${gameState.stats.wins + gameState.stats.losses > 0 
                    ? ((gameState.stats.wins / (gameState.stats.wins + gameState.stats.losses)) * 100).toFixed(1) 
                    : 0}%
            </div>
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
