// Pik - Crypto Price Prediction Game
// For Solana degens - max dopamine, real-time race visualization

const CONFIG = {
  UPDATE_INTERVAL: 5000, // 5 seconds between price updates
  COINS: [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', color: '#F7931A' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', color: '#627EEA' },
    { id: 'solana', symbol: 'SOL', name: 'Solana', color: '#14F195' },
    { id: 'cardano', symbol: 'ADA', name: 'Cardano', color: '#0033AD' },
    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', color: '#C2A633' },
    { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', color: '#E6007A' },
    { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', color: '#E84142' },
    { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', color: '#2A5ADA' },
    { id: 'uniswap', symbol: 'UNI', name: 'Uniswap', color: '#FF007A' },
    { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', color: '#345D9D' }
  ],
  BUY_INS: {
    1: 0.05,
    5: 0.10,
    15: 0.25,
    30: 0.50,
    60: 1.00
  },
  PAYOUT_SPLIT: [0.70, 0.20, 0.10], // Top 3 split
  PLATFORM_FEE: 0.05
};

// Game State
let gameState = {
  mode: 'free', // 'free' or 'sol'
  timeframe: null,
  selectedCoin: null,
  startPrices: {},
  currentPrices: {},
  startTime: null,
  endTime: null,
  updateInterval: null,
  isLocked: false,
  wallet: null,
  streak: parseInt(localStorage.getItem('streak') || '0'),
  wins: parseInt(localStorage.getItem('wins') || '0')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('Pik game initialized');
  loadStats();
  setupModeSelection();
  setupTimeframeSelection();
  setupCoinGrid();
  console.log('All setup functions complete');
});

// Load stats from localStorage
function loadStats() {
  document.getElementById('streak-count').textContent = gameState.streak;
  document.getElementById('wins-count').textContent = gameState.wins;
}

// Mode Selection (Free vs SOL)
function setupModeSelection() {
  const freeBtn = document.getElementById('mode-free');
  const solBtn = document.getElementById('mode-sol');
  
  console.log('Mode buttons:', freeBtn, solBtn);

  freeBtn.addEventListener('click', () => {
    console.log('Free mode clicked');
    gameState.mode = 'free';
    freeBtn.classList.add('active');
    solBtn.classList.remove('active');
    showScreen('timeframe-selection-screen');
  });

  solBtn.addEventListener('click', async () => {
    console.log('SOL mode clicked');
    // Check wallet connection
    if (!gameState.wallet) {
      await connectWallet();
      if (!gameState.wallet) return; // User cancelled
    }
    gameState.mode = 'sol';
    solBtn.classList.add('active');
    freeBtn.classList.remove('active');
    showScreen('timeframe-selection-screen');
  });
}

// Wallet connection (Phantom)
async function connectWallet() {
  if (!window.solana || !window.solana.isPhantom) {
    alert('Please install Phantom wallet to play for SOL!');
    return;
  }
  
  try {
    const resp = await window.solana.connect();
    gameState.wallet = resp.publicKey.toString();
    document.getElementById('wallet-status').textContent = `Connected: ${gameState.wallet.slice(0, 4)}...${gameState.wallet.slice(-4)}`;
    return true;
  } catch (err) {
    console.error('Wallet connection failed:', err);
    return false;
  }
}

// Timeframe Selection
function setupTimeframeSelection() {
  document.querySelectorAll('.timeframe-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      gameState.timeframe = parseInt(btn.dataset.minutes);
      
      // Update UI with buy-in amount if SOL mode
      if (gameState.mode === 'sol') {
        const buyIn = CONFIG.BUY_INS[gameState.timeframe];
        document.getElementById('pool-info').textContent = `Buy-in: ${buyIn} SOL`;
      } else {
        document.getElementById('pool-info').textContent = 'Free Play';
      }
      
      showScreen('coin-selection-screen');
      renderCoinGrid();
    });
  });
}

// Coin Grid Rendering
function setupCoinGrid() {
  // Will be called when screen is shown
}

function renderCoinGrid() {
  const grid = document.getElementById('coin-grid');
  grid.innerHTML = ''; // Clear previous
  
  CONFIG.COINS.forEach(coin => {
    const card = document.createElement('div');
    card.className = 'coin-card';
    card.dataset.coinId = coin.id;
    card.innerHTML = `
      <div class="coin-symbol" style="color: ${coin.color}">${coin.symbol}</div>
      <div class="coin-name">${coin.name}</div>
    `;
    
    // First tap locks - no changes allowed
    card.addEventListener('click', () => {
      if (!gameState.isLocked) {
        selectCoin(coin);
      }
    });
    
    grid.appendChild(card);
  });
}

// Coin Selection (First tap locks)
async function selectCoin(coin) {
  if (gameState.isLocked) return;
  
  gameState.selectedCoin = coin;
  gameState.isLocked = true;
  
  // Visual feedback
  document.querySelectorAll('.coin-card').forEach(card => {
    if (card.dataset.coinId === coin.id) {
      card.classList.add('selected');
    } else {
      card.style.opacity = '0.5';
    }
  });
  
  // Fetch starting prices
  await fetchStartingPrices();
  
  // Start game
  startGame();
}

// Fetch prices from CoinGecko
async function fetchStartingPrices() {
  const coinIds = CONFIG.COINS.map(c => c.id).join(',');
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd`);
    const data = await response.json();
    
    CONFIG.COINS.forEach(coin => {
      if (data[coin.id]) {
        gameState.startPrices[coin.id] = data[coin.id].usd;
        gameState.currentPrices[coin.id] = data[coin.id].usd;
      }
    });
  } catch (err) {
    console.error('Failed to fetch prices:', err);
    alert('Failed to fetch prices. Please try again.');
    resetGame();
  }
}

// Start Game
function startGame() {
  gameState.startTime = Date.now();
  gameState.endTime = gameState.startTime + (gameState.timeframe * 60 * 1000);
  
  showScreen('active-game-screen');
  
  // Setup race display
  renderRaceDisplay();
  
  // Start countdown
  startCountdown();
  
  // Start price updates
  gameState.updateInterval = setInterval(updatePrices, CONFIG.UPDATE_INTERVAL);
}

// Countdown Timer
function startCountdown() {
  const timerElement = document.getElementById('countdown-timer');
  
  const updateTimer = () => {
    const remaining = gameState.endTime - Date.now();
    
    if (remaining <= 0) {
      endGame();
      return;
    }
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Pulse effect in final 10 seconds
    if (remaining < 10000) {
      timerElement.classList.add('pulse');
    }
    
    requestAnimationFrame(updateTimer);
  };
  
  updateTimer();
}

// Race Display (Live horizontal bars)
function renderRaceDisplay() {
  const container = document.getElementById('race-display');
  container.innerHTML = '';
  
  CONFIG.COINS.forEach(coin => {
    const row = document.createElement('div');
    row.className = 'race-row';
    row.dataset.coinId = coin.id;
    
    const isSelected = coin.id === gameState.selectedCoin.id;
    if (isSelected) row.classList.add('selected-coin');
    
    row.innerHTML = `
      <div class="race-coin-info">
        <span class="race-rank">-</span>
        <span class="race-symbol" style="color: ${coin.color}">${coin.symbol}</span>
      </div>
      <div class="race-bar-container">
        <div class="race-bar" style="background: ${coin.color}"></div>
      </div>
      <div class="race-change">0.00%</div>
    `;
    
    container.appendChild(row);
  });
}

// Update Prices and Race Display
async function updatePrices() {
  const coinIds = CONFIG.COINS.map(c => c.id).join(',');
  
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd`);
    const data = await response.json();
    
    const changes = [];
    
    CONFIG.COINS.forEach(coin => {
      if (data[coin.id]) {
        gameState.currentPrices[coin.id] = data[coin.id].usd;
        const change = ((gameState.currentPrices[coin.id] - gameState.startPrices[coin.id]) / gameState.startPrices[coin.id]) * 100;
        changes.push({ coin, change });
      }
    });
    
    // Sort by change (descending)
    changes.sort((a, b) => b.change - a.change);
    
    // Update race display
    changes.forEach((item, index) => {
      const row = document.querySelector(`.race-row[data-coin-id="${item.coin.id}"]`);
      if (!row) return;
      
      const rank = index + 1;
      const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
      
      row.querySelector('.race-rank').textContent = rankEmoji;
      row.querySelector('.race-change').textContent = `${item.change >= 0 ? '+' : ''}${item.change.toFixed(2)}%`;
      row.querySelector('.race-change').style.color = item.change >= 0 ? '#14F195' : '#ff4444';
      
      // Animate bar width (scaled to max change)
      const maxChange = Math.max(...changes.map(c => Math.abs(c.change)));
      const barWidth = maxChange > 0 ? (Math.abs(item.change) / maxChange) * 100 : 0;
      row.querySelector('.race-bar').style.width = `${barWidth}%`;
      
      // Reorder rows by rank
      row.style.order = rank;
    });
    
  } catch (err) {
    console.error('Failed to update prices:', err);
  }
}

// End Game
function endGame() {
  clearInterval(gameState.updateInterval);
  
  // Calculate final rankings
  const changes = CONFIG.COINS.map(coin => ({
    coin,
    change: ((gameState.currentPrices[coin.id] - gameState.startPrices[coin.id]) / gameState.startPrices[coin.id]) * 100
  }));
  
  changes.sort((a, b) => b.change - a.change);
  
  const winnerCoin = changes[0].coin;
  const userRank = changes.findIndex(c => c.coin.id === gameState.selectedCoin.id) + 1;
  const didWin = userRank <= 3;
  
  // Update stats
  if (didWin) {
    gameState.wins++;
    gameState.streak++;
  } else {
    gameState.streak = 0;
  }
  
  localStorage.setItem('wins', gameState.wins);
  localStorage.setItem('streak', gameState.streak);
  
  // Show results
  showResults(changes, userRank, didWin);
}

// Show Results Screen
function showResults(rankings, userRank, didWin) {
  showScreen('results-screen');
  
  const resultText = document.getElementById('result-text');
  const rankingsList = document.getElementById('rankings-list');
  
  if (didWin) {
    resultText.innerHTML = `<span style="color: #14F195;">🎉 YOU FINISHED #${userRank}!</span>`;
    
    if (gameState.mode === 'sol') {
      // Calculate payout (placeholder - need pool data)
      const split = CONFIG.PAYOUT_SPLIT[userRank - 1];
      resultText.innerHTML += `<br><span style="font-size: 1.2rem;">You won ${split * 100}% of the pool! 💰</span>`;
    }
  } else {
    resultText.innerHTML = `<span style="color: #ff4444;">You finished #${userRank}</span>`;
  }
  
  // Render top 10
  rankingsList.innerHTML = '';
  rankings.slice(0, 10).forEach((item, idx) => {
    const rank = idx + 1;
    const emoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
    const isUser = item.coin.id === gameState.selectedCoin.id;
    
    const row = document.createElement('div');
    row.className = 'ranking-row' + (isUser ? ' user-pick' : '');
    row.innerHTML = `
      <span>${emoji} ${item.coin.symbol}</span>
      <span style="color: ${item.change >= 0 ? '#14F195' : '#ff4444'}">${item.change >= 0 ? '+' : ''}${item.change.toFixed(2)}%</span>
    `;
    rankingsList.appendChild(row);
  });
  
  // Play Again button
  document.getElementById('play-again-btn').addEventListener('click', () => {
    resetGame();
    showScreen('mode-selection-screen');
  });
}

// Reset Game
function resetGame() {
  gameState.selectedCoin = null;
  gameState.isLocked = false;
  gameState.startPrices = {};
  gameState.currentPrices = {};
  clearInterval(gameState.updateInterval);
  
  // Reset coin grid
  document.querySelectorAll('.coin-card').forEach(card => {
    card.classList.remove('selected');
    card.style.opacity = '1';
  });
}

// Screen Navigation
function showScreen(screenId) {
  console.log('Showing screen:', screenId);
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  const targetScreen = document.getElementById(screenId);
  console.log('Target screen element:', targetScreen);
  if (targetScreen) {
    targetScreen.classList.add('active');
  } else {
    console.error('Screen not found:', screenId);
  }
}
