# Five Star Rating Kiosk

A modern, offline-capable Progressive Web App (PWA) for collecting product ratings in kiosk mode. Perfect for retail stores, trade shows, or any environment where you need to gather customer feedback on products.

## Overview

Five Star Rating Kiosk is a browser-based rating application designed to run in kiosk mode on tablets or touch-screen devices. It stores all ratings locally using browser storage (localStorage and IndexedDB), making it fully functional without an internet connection. The application includes anti-zoom protection, wake lock support, and a comprehensive admin panel for managing ratings.

## Features

### Core Functionality
- **5-Star Rating System**: Simple and intuitive star-based rating interface
- **Offline-First**: Works completely offline using localStorage and IndexedDB
- **PWA Support**: Can be installed as a standalone app on iOS and Android devices
- **Real-Time Averages**: Automatically calculates and displays average ratings with fractional stars
- **Persistent Storage**: Automatic backups to IndexedDB every 2 minutes with recovery on app restart

### Kiosk Mode Features
- **Full-Screen Support**: Native fullscreen API integration
- **Anti-Zoom Protection**: Prevents pinch-to-zoom on iOS and other touch devices
- **Wake Lock**: Keeps screen awake during use (with fallback for iOS)
- **Auto-Hide Controls**: Top bar automatically hides during inactivity
- **Gesture Blocking**: Prevents accidental navigation gestures
- **Touch-Optimized**: Large touch targets and smooth animations

### Admin Panel
Access hidden admin features by:
- Tapping the bottom-right corner 5 times rapidly, or
- Long-pressing the bottom-right corner for 1 second

Admin features include:
- **Statistics Dashboard**: View rating distribution and averages
- **Wake Lock Control**: Enable/disable screen wake lock
- **Data Export**: Export all ratings as JSON
- **Data Management**: Clear all ratings
- **Diagnostics**: View detailed system information
- **Update Checker**: Manually check for app updates
- **Backup Status**: View IndexedDB backup status and timestamp

### User Interface
- **Dark/Light Theme**: Toggle between dark and light color schemes
- **Keyboard Navigation**: Full keyboard support (1-5 for ratings, arrow keys, Enter)
- **Accessibility**: ARIA labels, screen reader support, and keyboard hints
- **Responsive Design**: Adapts to different screen sizes and orientations
- **Smooth Animations**: Polished transitions and visual feedback

## Technology Stack

- **Pure Vanilla JavaScript**: No frameworks or dependencies
- **HTML5 & CSS3**: Modern web standards
- **Service Worker**: Offline functionality and caching
- **localStorage**: Primary data storage
- **IndexedDB**: Persistent backup storage
- **Wake Lock API**: Keep screen active
- **Fullscreen API**: Immersive kiosk experience
- **Web Manifest**: PWA installation support

## Installation

### Basic Setup (Web Server)

1. Clone or download this repository
2. Serve the files using any web server:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js http-server
   npx http-server -p 8000
   
   # Using PHP
   php -S localhost:8000
   ```
3. Open `http://localhost:8000` in your browser

### GitHub Pages Deployment

This app is configured to work on GitHub Pages:

1. Push the repository to GitHub
2. Enable GitHub Pages in repository settings (use `main` branch)
3. Access at `https://yourusername.github.io/fivestar-rating-kiosk/`

### PWA Installation

#### On iOS (iPad/iPhone):
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. Tap "Add" to install

#### On Android:
1. Open the app in Chrome
2. Tap the menu (⋮)
3. Select "Add to Home Screen" or "Install App"
4. Confirm installation

#### On Desktop (Chrome/Edge):
1. Click the install icon (⊕) in the address bar
2. Click "Install" in the dialog

## Usage

### Getting Started

1. **Enter Product Name**: When you first open the app, enter a product name to begin collecting ratings
2. **Share the Link**: The product name is stored in the URL (e.g., `?m=ProductName`) for easy sharing
3. **Collect Ratings**: Users tap 1-5 stars to submit their rating
4. **View Results**: Average rating and distribution are displayed in real-time

### Quick Start URL

You can create a direct link to a specific product:
```
https://your-domain.com/index.html?m=Product%20Name
```

### Keyboard Shortcuts

- **1-5**: Rate with 1-5 stars
- **Arrow Keys**: Navigate star selection
- **Enter**: Submit selected rating
- **Escape**: Show top bar / close admin panel
- **Ctrl+Shift+C**: Change product name

### Product Management

To change the product being rated:
- Triple-tap the product heading, or
- Long-press the product heading (900ms), or
- Use keyboard shortcut Ctrl+Shift+C

## Browser Compatibility

### Recommended Browsers:
- **iOS Safari** (iOS 13+) - Fully tested and optimized
- **Chrome** (Desktop & Android) - Full support
- **Edge** (Desktop) - Full support
- **Samsung Internet** - Full support

### Features by Browser:
| Feature | iOS Safari | Chrome | Edge | Firefox |
|---------|-----------|--------|------|---------|
| Basic Ratings | ✅ | ✅ | ✅ | ✅ |
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| PWA Install | ✅ | ✅ | ✅ | ⚠️ |
| Wake Lock | Fallback | ✅ | ✅ | ⚠️ |
| Fullscreen | ✅ | ✅ | ✅ | ✅ |

*✅ = Full Support, ⚠️ = Partial Support, ❌ = Not Supported*

## Data Storage

### Storage Hierarchy:
1. **localStorage** (Primary): Real-time rating data with instant access
2. **IndexedDB** (Backup): Automatic backup every 2 minutes
3. **Auto-Recovery**: Automatically restores from IndexedDB if localStorage is cleared

### Data Format:
Each product's ratings are stored as:
```json
{
  "count": 10,
  "total": 42,
  "buckets": [0, 1, 2, 4, 3]
}
```

### Export Format:
Admin export creates a JSON file with:
```json
{
  "exported": 1702123456789,
  "data": {
    "rating:mattress:ProductName": "{...}"
  }
}
```

## Development

### File Structure:
```
fivestar-rating-kiosk/
├── index.html           # Main HTML structure
├── app.js              # Application logic (37KB)
├── styles.css          # Styling and themes
├── sw.js               # Service Worker for offline support
├── manifest.webmanifest # PWA manifest
├── version.json        # Version tracking
├── icon-*.{svg,png}    # App icons
└── logo*.svg           # Brand logos
```

### Service Worker:
- Cache version: Defined in `sw.js` as `VERSION` constant
- Update `VERSION` constant to invalidate cache
- Offline-first strategy for all assets
- Automatic cache cleanup on activation

### Version Updates:
1. Update `version.json` with new version number
2. Update `VERSION` constant in `sw.js`
3. Deploy changes
4. Users can check for updates in admin panel

### Customization:
- **Colors**: Edit CSS custom properties in `styles.css`
- **Branding**: Replace `logo.svg` and `logo-gray.svg`
- **Icons**: Replace icon files (maintain sizes: 192x192, 512x512)
- **Storage Key**: Modify `storageKey()` function in `app.js`

## Security & Privacy

- **No External Connections**: All data stays on device
- **No Analytics**: No tracking or telemetry
- **No Dependencies**: Zero third-party code
- **Local Storage Only**: Data never leaves the browser
- **HTTPS Recommended**: Required for PWA features and Service Worker

## Kiosk Deployment Tips

1. **iOS Setup**:
   - Use Guided Access mode to prevent app exit
   - Enable Auto-Lock > Never in Settings
   - Install as PWA for full-screen experience

2. **Android Setup**:
   - Use Kiosk Mode apps or Android Enterprise
   - Enable Stay Awake in Developer Options
   - Pin the app screen (if supported)

3. **Desktop Setup**:
   - Start in fullscreen mode (F11)
   - Consider browser kiosk extensions
   - Disable keyboard shortcuts in browser settings

4. **Network**:
   - App works fully offline after first load
   - No internet connection required
   - Optional: Disable WiFi to prevent interference

## Known Limitations

- Data is device-specific (not synced across devices)
- No cloud backup or export API
- localStorage has ~5-10MB limit (handles ~50k ratings typically)
- Wake Lock fallback on iOS uses video element workaround

## Troubleshooting

### Ratings Not Saving:
- Check browser storage isn't full
- Try exporting data and clearing storage
- Verify localStorage isn't disabled

### App Not Installing as PWA:
- Must be served over HTTPS (or localhost)
- Service Worker must register successfully
- Check browser console for errors

### Screen Keeps Turning Off:
- Enable Wake Lock in admin panel
- Check device auto-lock settings
- iOS uses video fallback if Wake Lock unavailable

### Update Not Appearing:
- Use "Check Update" in admin panel
- Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
- Clear browser cache if needed

## Contributing

This is a self-contained application with no build process. To contribute:
1. Make changes to source files
2. Test in multiple browsers and devices
3. Update version numbers if needed
4. Submit pull request with description

## License

[Add your license here]

## Credits

Developed for use in retail and kiosk environments. Optimized for iOS Safari with extensive testing on iPad devices.