# PWA Testing Guide

## How to Test PWA Installation

### Testing on Desktop (Chrome/Edge)

1. **Build and serve the app:**
   ```bash
   npm run build
   npm run preview
   ```

2. **Open in Chrome/Edge:**
   - Navigate to `http://localhost:4173/`
   - Look for the install icon (⊕) in the address bar
   - Click the install button
   - The app will install as a standalone application

3. **Verify Installation:**
   - Open Developer Tools (F12)
   - Go to the "Application" tab
   - Check "Manifest" - should show app name, icons, theme colors
   - Check "Service Workers" - should show an active service worker
   - Check "Cache Storage" - should see cached resources

4. **Test Offline Mode:**
   - Disconnect from the internet
   - Reload the page
   - The app should still load (with cached resources)

### Testing on Mobile (Chrome/Safari)

#### Android Chrome:
1. Open the app URL in Chrome
2. Tap the menu (⋮)
3. Select "Add to Home screen"
4. Name the app and tap "Add"
5. The app icon will appear on your home screen

#### iOS Safari:
1. Open the app URL in Safari
2. Tap the share button (⬆️)
3. Select "Add to Home Screen"
4. Name the app and tap "Add"
5. The app icon will appear on your home screen

## Features to Test

### 1. App Installation
- [ ] Install prompt appears in supported browsers
- [ ] App can be installed on desktop
- [ ] App can be added to home screen on mobile
- [ ] App icon appears correctly

### 2. Standalone Mode
- [ ] App opens in standalone window (no browser UI)
- [ ] Theme color matches app design (#58a6ff)
- [ ] App name displays correctly

### 3. Offline Functionality
- [ ] Service worker registers successfully
- [ ] App loads while offline
- [ ] Cached resources are served
- [ ] Fonts and styles load from cache

### 4. Performance
- [ ] Fast initial load
- [ ] Resources cached after first visit
- [ ] Network-first strategy works for external APIs
- [ ] Stale-while-revalidate updates fonts

## Troubleshooting

### Install button doesn't appear
- Ensure you're using HTTPS or localhost
- Check that manifest.json is accessible
- Verify all required manifest fields are present
- Check browser console for errors

### Service worker not registering
- Clear browser cache and reload
- Check for service worker errors in DevTools
- Ensure the app is served over HTTPS or localhost

### Offline mode not working
- Service worker needs to be active first
- Visit the app once while online
- Check Cache Storage in DevTools

## Production Deployment

When deploying to production:

1. Ensure HTTPS is enabled (required for PWA)
2. Set proper caching headers
3. Update `start_url` in manifest if needed
4. Test on multiple devices and browsers
5. Verify all icons display correctly
6. Test offline functionality in production
