# 🎵 SoundCloud True Shuffle

A Chrome extension that brings **true random shuffle** to SoundCloud. Unlike SoundCloud's native shuffle which only randomizes a subset of tracks, this extension shuffles your entire playlist or likes collection.

## ✨ Features

- **🎲 True Random Shuffle** — Uses Fisher-Yates algorithm for uniform distribution across all tracks
- **📋 Full Queue Loading** — Automatically loads your entire queue before shuffling
- **🎯 Smart Page Detection** — Works on playlists, likes, user likes, and discover pages
- **⚡ Performance Optimized** — Efficient DOM manipulation with minimal memory footprint
- **🎨 Native Integration** — Seamlessly integrates with SoundCloud's UI
- **🔄 Real-time Status** — Visual feedback during loading and playback
- **⏸️ Cancellable Loading** — Stop the loading process at any time

## 🚀 Installation

### From Source

1. **Clone or download** this repository

   ```bash
   git clone https://github.com/phudyka/Soundcloud-Shuffle.git
   ```

2. **Open Chrome Extensions**
   - Navigate to `chrome://extensions/`
   - Enable **Developer mode** (top-right toggle)

3. **Load the extension**
   - Click **Load unpacked**
   - Select the `Soundcloud-Shuffle` folder

4. **You're ready!** 🎉
   - Navigate to SoundCloud and look for the **🔀 Shuffle Play** button

## 📖 Usage

### In-Page Button

1. Navigate to any supported SoundCloud page:
   - Your Likes (`/you/likes`)
   - User Likes (`/[username]/likes`)
   - Playlists (`/[username]/sets/[playlist]`)
   - Discover Playlists (`/discover/sets/[playlist]`)

2. Click the **🔀 Shuffle Play** button that appears on the page (Next to the Playlist settings)

3. Wait for the extension to load all tracks (progress shown in button)

4. Enjoy truly random playback! 🎶

### Extension Popup

Click the extension icon in your toolbar to:

- View current status (Ready, Loading, Playing)
- Trigger shuffle from the popup
- See which page type is active

## 🎯 How It Works

1. **Queue Preparation** — Plays tracks in sequence to build the full queue
2. **Auto-Loading** — Scrolls through the queue to lazy-load all tracks
3. **Shuffling** — Applies Fisher-Yates shuffle to the entire queue
4. **Playback** — Activates SoundCloud's native shuffle and starts playback

## 🛠️ Technical Details

### Architecture

- **Manifest V3** — Modern Chrome extension architecture
- **Content Script** — Injects shuffle functionality into SoundCloud pages
- **Popup Interface** — Standalone control panel with real-time status
- **Mutation Observer** — Detects SPA navigation and DOM changes
- **AbortController** — Clean cancellation of async operations

### Browser Compatibility

- ✅ Chrome (Manifest V3)
- ✅ Edge (Chromium-based)
- ✅ Brave
- ✅ Opera (Chromium-based)

## 🎨 Screenshots

The extension adds a native-looking button to SoundCloud pages:

**Likes Page**

- Button appears in the collection header

**Playlist Page**

- Button integrates with sound actions

**Popup Interface**

- Real-time status indicator
- One-click shuffle activation

## ⚙️ Configuration

No configuration needed! The extension works out of the box.

### Customization (Advanced)

You can modify these constants in `content.js`:

```javascript
SCROLL_TICK_MS; // Scroll interval (default: 350ms)
OBSERVER_TIMEOUT_MS; // Max time to wait for button insertion (default: 30s)
QUEUE_SETTLE_MS; // Time to wait for queue to stabilize (default: 2s)
```

## 🐛 Troubleshooting

### Button doesn't appear

- Refresh the SoundCloud page
- Ensure you're on a supported page type
- Check that the extension is enabled in `chrome://extensions/`

### Shuffle stops loading

- Click the button again to cancel and retry
- Check your internet connection
- Try refreshing the page

### Tracks don't shuffle

- Ensure you have more than 2 tracks in the playlist/likes
- Wait for the loading phase to complete
- Check browser console for errors

## 📝 Changelog

### v3.1 (Current)

- ✨ Optimized queue loading algorithm
- 🐛 Fixed SPA navigation detection
- ⚡ Improved performance with DocumentFragment
- 🎨 Enhanced button states and feedback
- 🔧 Added AbortController for clean cancellation

### v3.0

- 🎉 Complete rewrite for Manifest V3
- 🎨 New popup interface
- 🔄 Real-time status updates
- 🎯 Smart page detection

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

1. Clone the repository
2. Make your changes
3. Test thoroughly on SoundCloud
4. Submit a PR with a clear description

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- SoundCloud for the amazing music platform
- Fisher-Yates for the shuffle algorithm
- The Chrome Extensions team for Manifest V3

## 💬 Support

If you encounter any issues or have suggestions:

- 🐛 [Open an issue](https://github.com/phudyka/Soundcloud-Shuffle/issues)
- ⭐ Star the repo if you find it useful!

---

**Made with ❤️ for SoundCloud lovers who want true randomness**
