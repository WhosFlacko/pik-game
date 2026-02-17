// Pik - Crypto Price Prediction Game
// For Solana degens - max dopamine, real-time race visualization

const CONFIG = {
  UPDATE_INTERVAL: 1000, // 1 second - REAL-TIME updates
  COINS: [
    { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', color: '#F7931A', pepe: '🐸', filter: 'hue-rotate(30deg) saturate(2)' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', color: '#627EEA', pepe: '🐸', filter: 'hue-rotate(200deg) saturate(2)' },
    { id: 'solana', symbol: 'SOL', name: 'Solana', color: '#14F195', pepe: '🐸', filter: 'hue-rotate(150deg) saturate(3)' },
    { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', color: '#C2A633', pepe: '🐸', filter: 'hue-rotate(45deg) saturate(1.5)' }
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
  wins: parseInt(localStorage.getItem('wins') || '0'),
  lastRank: null,
  soundEnabled: true
};

// Sound Effects (using Web Audio API for instant playback)
const sounds = {
  click: () => playTone(800, 50),
  select: () => playTone(600, 100),
  tick: () => playTone(400, 30),
  win: () => playWinSound(),
  loss: () => playTone(200, 200),
  takeLead: () => playTone(1000, 150),
  countdown: () => playTone(300, 100)
};

function playTone(frequency, duration) {
  if (!gameState.soundEnabled) return;
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration / 1000);
  
  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + duration / 1000);
}

function playWinSound() {
  if (!gameState.soundEnabled) return;
  playTone(800, 100);
  setTimeout(() => playTone(1000, 100), 100);
  setTimeout(() => playTone(1200, 150), 200);
}

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
    sounds.click();
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
      <div class="coin-pepe" style="filter: ${coin.filter}">🐸</div>
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
  
  sounds.select();
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
  const horseElement = document.getElementById('racing-horse');
  const totalDuration = gameState.endTime - gameState.startTime;
  let lastSecond = null;
  
  console.log('Horse element found:', horseElement);
  console.log('Total duration (ms):', totalDuration);
  
  const updateTimer = () => {
    const remaining = gameState.endTime - Date.now();
    
    if (remaining <= 0) {
      endGame();
      return;
    }
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Update horse position (5% to 90% of track)
    if (horseElement) {
      const progress = 5 + ((totalDuration - remaining) / totalDuration) * 85;
      horseElement.style.left = `${progress}%`;
      
      // Play countdown sound in final 10 seconds
      if (remaining < 10000) {
        horseElement.classList.add('sprint');
        if (seconds !== lastSecond) {
          sounds.countdown();
          lastSecond = seconds;
          timerElement.classList.add('pulse');
        }
      }
    }
    
    requestAnimationFrame(updateTimer);
  };
  
  updateTimer();
}

// Confetti Animation
function triggerConfetti() {
  const colors = ['#14F195', '#9945FF', '#FFD700', '#FF007A'];
  const confettiCount = 50;
  
  for (let i = 0; i < confettiCount; i++) {
    setTimeout(() => {
      const confetti = document.createElement('div');
      confetti.style.position = 'fixed';
      confetti.style.left = Math.random() * 100 + 'vw';
      confetti.style.top = '-10px';
      confetti.style.width = '10px';
      confetti.style.height = '10px';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.opacity = '0.8';
      confetti.style.borderRadius = '50%';
      confetti.style.pointerEvents = 'none';
      confetti.style.zIndex = '1000';
      confetti.style.animation = `fall ${2 + Math.random()}s linear`;
      
      document.body.appendChild(confetti);
      
      setTimeout(() => confetti.remove(), 3000);
    }, i * 30);
  }
}

// Add CSS animation for confetti
if (!document.getElementById('confetti-style')) {
  const style = document.createElement('style');
  style.id = 'confetti-style';
  style.textContent = `
    @keyframes fall {
      to {
        transform: translateY(100vh) rotate(360deg);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// Race Display (PEPE BATTLE ARENA)
function renderRaceDisplay() {
  const container = document.getElementById('race-display');
  container.innerHTML = '<div class="battle-arena"></div>';
  const arena = container.querySelector('.battle-arena');
  
  CONFIG.COINS.forEach(coin => {
    const pepeContainer = document.createElement('div');
    pepeContainer.className = 'pepe-fighter';
    pepeContainer.dataset.coinId = coin.id;
    
    const isSelected = coin.id === gameState.selectedCoin.id;
    if (isSelected) pepeContainer.classList.add('your-pepe');
    
    pepeContainer.innerHTML = `
      <div class="pepe-character" style="filter: ${coin.filter}">🐸</div>
      <div class="pepe-info">
        <div class="pepe-rank">-</div>
        <div class="pepe-name" style="color: ${coin.color}">${coin.symbol}</div>
        <div class="pepe-change">0.00%</div>
      </div>
    `;
    
    arena.appendChild(pepeContainer);
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
    
    // Check if user's coin moved up in ranking
    const userRank = changes.findIndex(c => c.coin.id === gameState.selectedCoin.id) + 1;
    if (gameState.lastRank && userRank < gameState.lastRank && userRank <= 3) {
      sounds.takeLead();
    }
    gameState.lastRank = userRank;
    
    // Update Pepe Battle Display
    changes.forEach((item, index) => {
      const pepe = document.querySelector(`.pepe-fighter[data-coin-id="${item.coin.id}"]`);
      if (!pepe) return;
      
      const rank = index + 1;
      const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '💀';
      
      // Update info
      pepe.querySelector('.pepe-rank').textContent = rankEmoji;
      pepe.querySelector('.pepe-change').textContent = `${item.change >= 0 ? '+' : ''}${item.change.toFixed(3)}%`;
      pepe.querySelector('.pepe-change').style.color = item.change >= 0 ? '#14F195' : '#ff4444';
      
      // Scale Pepe based on performance (1.0 to 3.0)
      const maxChange = Math.max(...changes.map(c => Math.abs(c.change)), 0.01);
      const scale = 1.0 + (Math.abs(item.change) / maxChange) * 2.0; // 1x to 3x size
      const character = pepe.querySelector('.pepe-character');
      character.style.transform = `scale(${scale})`;
      
      // Winner gets MASSIVE
      if (rank === 1 && item.change > 0) {
        character.classList.add('winning');
        pepe.classList.add('leader');
      } else {
        character.classList.remove('winning');
        pepe.classList.remove('leader');
      }
      
      // Loser shrinks
      if (rank === 4 || item.change < 0) {
        character.classList.add('losing');
      } else {
        character.classList.remove('losing');
      }
      
      // Position in arena based on rank
      pepe.style.order = rank;
    });
    
    sounds.tick();
    
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
    sounds.win();
    triggerConfetti();
    resultText.innerHTML = `<span style="color: #14F195;">🎉 YOU FINISHED #${userRank}!</span>`;
    
    if (gameState.mode === 'sol') {
      // Calculate payout (placeholder - need pool data)
      const split = CONFIG.PAYOUT_SPLIT[userRank - 1];
      resultText.innerHTML += `<br><span style="font-size: 1.2rem;">You won ${split * 100}% of the pool! 💰</span>`;
    }
  } else {
    sounds.loss();
    document.body.classList.add('screen-shake');
    setTimeout(() => document.body.classList.remove('screen-shake'), 500);
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
