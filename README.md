# Blur - Smart Privacy Protection for Screen Sharing

Blur is a browser extension that automatically detects and obscures sensitive information during screen sharing sessions on Zoom, Google Meet, and other platforms. Protect confidential business data, customer information, and personal details from accidental exposure.

## 🎯 Features

### Core Functionality
- **Automatic Screen Share Detection**: Monitors when you're actively sharing your screen
- **Smart Data Recognition**: Identifies and blurs sensitive patterns including:
  - Email addresses
  - Credit card numbers
  - API keys and tokens
  - Revenue figures and financial data
  - Account numbers
  - Personally Identifiable Information (PII)
- **Site-Specific Protection**: Pre-configured for Gmail, Stripe, and Salesforce
- **Customizable Blur Intensity**: Adjust from subtle to complete obscuration
- **Quick Toggle**: Keyboard shortcut (Ctrl/Cmd + Shift + B) to enable/disable

### Privacy & Performance
- **100% Local Processing**: No data ever leaves your browser
- **Minimal Performance Impact**: Efficient DOM scanning with debouncing
- **Real-time Updates**: Handles dynamically loaded content
- **Visual Feedback**: On-screen indicator shows when protection is active

### User Experience
- **Auto-Enable Option**: Automatically activate when screen sharing starts
- **Customizable Data Types**: Choose which types of information to blur
- **Whitelist Capability**: Trust specific meetings or recipients
- **Cross-Browser Support**: Works on Chrome, Edge, and Firefox

## 📦 Installation

### Chrome/Edge (Manifest V3)

1. **Download the Extension**
   ```bash
   git clone https://github.com/yourusername/blur-extension.git
   cd blur-extension
   ```

2. **Load in Chrome/Edge**
   - Open Chrome/Edge and navigate to `chrome://extensions/` (or `edge://extensions/`)
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `blur-extension` folder

3. **Verify Installation**
   - You should see the Blur icon in your toolbar
   - Click it to open the settings panel

### Firefox (Coming Soon)

Firefox support requires Manifest V2. We're working on a Firefox-compatible version.

## 🚀 Quick Start

### First-Time Setup

1. **Click the Blur icon** in your toolbar
2. **Review default settings**:
   - Protection is enabled by default
   - All data types are monitored
   - Blur intensity is set to medium (10px)
3. **Test the extension**:
   - Open Gmail, Stripe, or Salesforce
   - Start a screen share on Google Meet or Zoom
   - Sensitive data should automatically blur

### Daily Usage

1. **Start a screen sharing session** on Zoom or Google Meet
2. **Blur automatically activates** (if auto-enable is on)
3. **You'll see an indicator** in the top-right corner
4. **To temporarily disable**: Press `Ctrl+Shift+B` (or `Cmd+Shift+B` on Mac)
5. **Blur stops automatically** when you stop sharing

## ⚙️ Settings

### Main Toggle
Enable or disable blur protection entirely.

### Blur Intensity
- **Low (5px)**: Subtle blur, text partially readable
- **Medium (10px)**: Balanced protection (default)
- **High (20px)**: Maximum obscuration

### Data Types
Choose which types of sensitive information to blur:
- ✅ Email Addresses
- ✅ Credit Card Numbers
- ✅ API Keys & Tokens
- ✅ Revenue & Financial Data
- ✅ Account Numbers
- ✅ Personal Information (PII)

### Protected Sites
- **Gmail**: Email addresses, message content, attachments
- **Stripe**: Revenue, credit cards, account numbers, API keys
- **Salesforce**: Account data, revenue, customer information

### Options
- **Auto-enable when screen sharing starts**: Automatic activation
- **Show on-screen indicator**: Visual feedback when active

## 🔧 Advanced Configuration

### Adding Custom Sites

1. Click "Add Custom Site" in the popup
2. Enter a URL pattern (e.g., `https://yourapp.com/*`)
3. Reload the extension

### Custom Data Patterns

To add custom regex patterns for your specific needs:

1. Open `src/content.js`
2. Find the `containsSensitiveData()` method
3. Add your pattern to the `patterns` object:
   ```javascript
   patterns.yourPattern = /your-regex-here/;
   ```

### Performance Tuning

If you experience performance issues:

1. Increase debounce time in `content.js`:
   ```javascript
   this.scanTimeout = setTimeout(() => {
     // Change 300ms to higher value
   }, 500);
   ```

2. Reduce scan frequency for large pages
3. Disable unused data types

## 🛡️ Security & Privacy

### Data Handling
- **All processing happens locally** in your browser
- **No external servers** are contacted
- **No telemetry or analytics** are collected
- **No data is stored** outside your browser's local storage

### Permissions Explained
- `activeTab`: Required to detect screen sharing and blur content
- `storage`: Saves your preferences locally
- `tabs`: Monitors tab state for screen share detection
- `host_permissions`: Access to Gmail, Stripe, Salesforce for content modification

### What We Don't Do
- ❌ Send your data anywhere
- ❌ Track your browsing
- ❌ Store passwords or credentials
- ❌ Access pages you haven't configured

## 🐛 Troubleshooting

### Blur Not Activating

**Check:**
1. Is screen sharing actually active?
2. Is the extension enabled? (check toolbar icon)
3. Are you on a supported site? (Gmail, Stripe, Salesforce)
4. Check browser console for errors (F12 → Console)

**Solutions:**
- Refresh the page after starting screen share
- Manually toggle with Ctrl+Shift+B
- Check that the site is in your protected sites list

### Performance Issues

**If the page feels slow:**
1. Reduce blur intensity to Low
2. Disable unused data types
3. Add the site to exclusions if not needed
4. Check for browser extension conflicts

### Blur Not Working on Specific Site

**To debug:**
1. Open DevTools (F12)
2. Check Console for "Blur:" messages
3. Verify site selectors in `content.js`
4. Report issues with site URL and screenshot

### Screen Share Not Detected

**Try:**
1. Refresh the conferencing platform page
2. Restart screen share
3. Check browser permissions for the site
4. Look for "Blur: Screen sharing detected" in console

## 📋 Supported Platforms

### Conferencing Apps
- ✅ Google Meet
- ✅ Zoom (web version)
- ⏳ Microsoft Teams (coming soon)
- ⏳ Slack Huddles (coming soon)

### Business Applications
- ✅ Gmail
- ✅ Stripe Dashboard
- ✅ Salesforce (Classic & Lightning)
- ➕ Add your own custom sites

### Browsers
- ✅ Google Chrome (v88+)
- ✅ Microsoft Edge (v88+)
- ⏳ Firefox (coming soon)
- ⏳ Safari (coming soon)

## 🔑 Keyboard Shortcuts

- **Toggle Blur**: `Ctrl+Shift+B` (Windows/Linux) or `Cmd+Shift+B` (Mac)

## 🏗️ Architecture

```
blur-extension/
├── manifest.json          # Extension configuration
├── src/
│   ├── background.js      # Service worker (state management)
│   ├── detector.js        # Screen share detection
│   ├── content.js         # Content script (blur logic)
│   ├── blur.css          # Blur styles
│   ├── popup.html        # Settings interface
│   ├── popup.css         # Popup styles
│   └── popup.js          # Popup logic
├── assets/               # Icons and images
└── docs/                 # Documentation
```

### Key Components

1. **Background Service Worker** (`background.js`)
   - Manages global state
   - Coordinates between components
   - Handles keyboard shortcuts

2. **Screen Share Detector** (`detector.js`)
   - Monitors conferencing platforms
   - Hooks into getDisplayMedia API
   - Detects when sharing starts/stops

3. **Content Script** (`content.js`)
   - Scans pages for sensitive data
   - Applies blur effects
   - Handles dynamic content

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Reporting Bugs
1. Check existing issues
2. Create a new issue with:
   - Browser and version
   - Steps to reproduce
   - Expected vs actual behavior
   - Console errors (if any)

### Feature Requests
1. Check if already requested
2. Describe the use case
3. Explain the benefit

### Pull Requests
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit PR with description

## 📝 Roadmap

### v1.1 (Next Release)
- [ ] Firefox support (Manifest V2)
- [ ] Microsoft Teams detection
- [ ] Slack Huddles support
- [ ] Custom regex pattern builder UI
- [ ] Export/import settings

### v1.2 (Future)
- [ ] Machine learning-based detection
- [ ] Per-site blur configurations
- [ ] Meeting whitelist by URL
- [ ] Safari support
- [ ] Mobile responsive design

### v2.0 (Vision)
- [ ] Video call participant detection
- [ ] Smart redaction (preserve context)
- [ ] Compliance reports
- [ ] Team/enterprise features

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Built for professionals handling sensitive data
- Inspired by the Reddit discussion on screen sharing privacy
- Thanks to the Boots2Bytes community for feedback

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/blur-extension/issues)
- **Email**: support@blurextension.com
- **Documentation**: [Full Docs](https://docs.blurextension.com)

---

**Made with ❤️ for privacy-conscious professionals**
