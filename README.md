# 🎵 SoundCloud True Shuffle

A Chrome extension that brings **true random shuffle** to SoundCloud. Unlike SoundCloud's native shuffle which only randomizes a subset of tracks, this extension shuffles your entire playlist or likes collection.

## ✨ Features

- **🎲 True Random Shuffle** — Uses Fisher-Yates algorithm for uniform distribution across all tracks
- **📋 Full Queue Loading** — Automatically loads your entire queue before shuffling
- **🎯 Smart Page Detection** — Works on playlists, likes, user likes, and discover pages
- **⚡ Performance Optimized** — Efficient DOM manipulation with minimal memory footprint
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

4. **Pin the extension** 📌
   - Click the puzzle piece icon (🧩) in your Chrome toolbar
   - Click the **pin** icon next to **SoundCloud-Shuffle**
   - The extension icon will now appear permanently in your toolbar

5. **You're ready!** 🎉

## 📖 Usage

1. Navigate to any supported SoundCloud page:
   - Your Likes (`/you/likes`)
   - User Likes (`/[username]/likes`)
   - Playlists (`/[username]/sets/[playlist]`)
   - Discover Playlists (`/discover/sets/[playlist]`)

2. **Click the pinned extension icon** in your toolbar — a popup will appear showing:
   - Current status indicator (Ready / Loading / Playing)
   - The **🔀 Shuffle Play** button

3. Click **🔀 Shuffle Play** and wait for the extension to load all tracks

4. Enjoy truly random playback! 🎶

> **Tip:** If the status shows "Not on SoundCloud", make sure you're on a SoundCloud tab with a playlist or likes page open.

## 🎯 How It Works

1. **Queue Preparation** — Plays tracks in sequence to build the full queue
2. **Auto-Loading** — Scrolls through the queue to lazy-load all tracks
3. **Shuffling** — Applies Fisher-Yates shuffle to the entire queue
4. **Playback** — Activates SoundCloud's native shuffle and starts playback

## 🛠️ Technical Details

### Architecture

- **Manifest V3** — Modern Chrome extension architecture
- **Content Script** — Handles shuffle logic on SoundCloud pages
- **Popup Interface** — Standalone control panel with real-time status
- **AbortController** — Clean cancellation of async operations

### Browser Compatibility

- ✅ Chrome (Manifest V3)
- ✅ Edge (Chromium-based)
- ✅ Brave
- ✅ Opera (Chromium-based)

## ⚙️ Configuration

No configuration needed! The extension works out of the box.

### Customization (Advanced)

You can modify these constants in `content.js`:

```javascript
SCROLL_TICK_MS; // Scroll interval (default: 350ms)
QUEUE_SETTLE_MS; // Time to wait for queue to stabilize (default: 2s)
```

## 🐛 Troubleshooting

### Shuffle button is disabled / "Not on SoundCloud"

- Make sure you're on a SoundCloud tab
- Navigate to a supported page (playlist, likes, discover)
- Try refreshing the SoundCloud page

### Shuffle stops loading

- Click **Cancel** in the popup to abort, then retry
- Check your internet connection
- Try refreshing the page

### Tracks don't shuffle

- Ensure you have more than 2 tracks in the playlist/likes
- Wait for the loading phase to complete
- Check browser console for errors

## 📝 Changelog

### v4.0 (Current)

- 🔄 Shuffle now triggered exclusively from the pinned extension popup
- 🧹 Removed in-page button injection for a cleaner experience
- ⚡ Reduced content script size and overhead

### v3.1

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
