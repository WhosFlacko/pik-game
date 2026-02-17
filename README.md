# CoinPick - Crypto Prediction Game

Fast-paced crypto prediction game built for Solana Seeker and mobile browsers.

## 🎮 Game Mechanics

- **Pick a timeframe:** 1, 5, 15, or 30 minutes
- **Choose a coin:** Select which crypto you think will have the biggest % gain
- **Watch live prices:** Real-time price updates during the round
- **See results:** Find out if you picked the winner
- **Track your streak:** Build win streaks and compete on the leaderboard

## 🚀 Tech Stack

- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **API:** CoinGecko (free, real-time crypto prices)
- **Storage:** LocalStorage (stats & leaderboard)
- **PWA:** Installable on mobile devices

## 📱 Features

- ✅ Mobile-first responsive design
- ✅ Solana-themed UI (green/purple gradient)
- ✅ Real-time price updates every 10 seconds
- ✅ Streak tracking & personal stats
- ✅ Smooth animations & transitions
- ✅ Works offline (after first load)
- ✅ No sign-up required

## 🏗️ Current Status

**Phase 1 (Complete):**
- ✅ Core game mechanics
- ✅ Real-time price integration
- ✅ Timer & countdown
- ✅ Results & stats tracking
- ✅ Responsive UI

**Phase 2 (Next):**
- ⏳ Solana wallet integration (Phantom/Solflare)
- ⏳ Smart contract for prize pools
- ⏳ Global leaderboard (backend)
- ⏳ Social features (share results)
- ⏳ Sound effects & haptics

**Phase 3 (Future):**
- ⏳ SOL betting & payouts
- ⏳ Tournament mode
- ⏳ Private lobbies
- ⏳ Sponsored coins
- ⏳ NFT rewards

## 🛠️ Development

### Local Setup

```bash
cd public
python3 -m http.server 8000
# or
npx serve
```

Open http://localhost:8000

### Deployment

**Option 1: GitHub Pages**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

Enable GitHub Pages in repo settings → select `main` branch.

**Option 2: Netlify/Vercel**
- Drag & drop the `public` folder
- Instant deployment

**Option 3: Solana dApp Store**
- Convert to Android APK using PWA tools
- Submit to Solana dApp Publisher Portal

## 💡 Monetization Ideas

1. **Prize Pools:** Users bet SOL, winners split the pot (5-10% platform fee)
2. **Season Pass:** $10 NFT for unlimited plays for 30 days
3. **Sponsored Coins:** Projects pay to be featured
4. **Premium Modes:** Longer timeframes, more coins, private lobbies
5. **Ads:** (Optional, but users hate ads)

## 🎯 Roadmap

- [ ] Add Solana wallet connection
- [ ] Deploy smart contract for betting
- [ ] Backend API for global leaderboard
- [ ] Sound effects & animations
- [ ] Convert to Android app for Seeker
- [ ] Submit to Solana dApp Store
- [ ] Marketing & launch

## 📊 Metrics to Track

- Daily active users (DAU)
- Games played per user
- Average session length
- Win rate distribution
- Conversion rate (free → paid)
- Retention (D1, D7, D30)

## 🔒 Legal Considerations

This is currently a **free-to-play prediction game** with no real-money gambling. To add SOL betting:

- Consult a lawyer (gambling laws vary by jurisdiction)
- Consider launching in crypto-friendly regions first
- Implement KYC/AML if required
- Use "skill-based" framing (prediction, analysis)
- Age verification (18+)

## 📝 License

MIT License - feel free to fork and build on this!

---

Built with 🔥 for the Solana ecosystem.
