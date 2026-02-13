<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Sniper Terminal - S-Tier Crypto Trading Terminal

This is a Progressive Web App (PWA) enabled crypto trading terminal with TradingView charts integration.

View your app in AI Studio: https://ai.studio/apps/drive/12w2WOaN-Rl52fEsRaAgPM6nBHCkcmQ2j

## Features

- 📱 **Progressive Web App** - Install on any device from Chrome
- 📊 TradingView charts integration
- 💹 Real-time crypto trading
- 🎯 Sniper-style trading interface
- 📴 Offline support with service worker caching
- 🚀 Fast performance with optimized caching strategies

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key (if using AI features)
3. Run the app:
   `npm run dev`

## PWA Installation

### Desktop (Chrome/Edge)
1. Navigate to the app URL in Chrome or Edge
2. Click the install button (⊕) in the address bar
3. Click "Install" in the popup
4. The app will be installed as a standalone application

### Mobile (Chrome/Safari)
1. Open the app in your mobile browser
2. **Chrome:** Tap the menu (⋮) → "Add to Home screen"
3. **Safari:** Tap the share button → "Add to Home Screen"
4. The app icon will appear on your home screen

## Build for Production

Build the app with PWA support:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

The build includes:
- Service worker for offline functionality
- Manifest file for app installation
- Optimized caching for CDN resources
- PWA icons in multiple sizes
