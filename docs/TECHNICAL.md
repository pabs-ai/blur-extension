# Technical Implementation Guide

## Overview

This document provides detailed technical information about the Blur extension's architecture, implementation details, and development guidelines.

## Architecture

### Component Interaction Flow

```
┌─────────────────┐
│  Conferencing   │
│  Platform       │
│  (Meet/Zoom)    │
└────────┬────────┘
         │ getDisplayMedia()
         ▼
    ┌────────────┐
    │ detector.js│ ◄─── Monitors screen sharing
    └─────┬──────┘
          │ Message: SCREEN_SHARE_STARTED
          ▼
    ┌──────────────┐
    │background.js │ ◄─── Central state management
    └──────┬───────┘
           │ Message: STATE_UPDATE
           ▼
    ┌─────────────┐
    │ content.js  │ ◄─── Applies blur effects
    └─────────────┘
           │
           ▼
    ┌─────────────┐
    │   DOM       │ ◄─── Blurred elements
    └─────────────┘
```

## Screen Share Detection

### Primary Method: getDisplayMedia Hook

The most reliable detection method is hooking into the native `getDisplayMedia` API:

```javascript
const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;

navigator.mediaDevices.getDisplayMedia = async function(...args) {
  const stream = await originalGetDisplayMedia.apply(this, args);
  
  // Screen sharing started
  detector.handleScreenShareStart(stream);
  
  // Monitor for when it stops
  stream.getVideoTracks().forEach(track => {
    track.onended = () => {
      detector.handleScreenShareStop();
    };
  });
  
  return stream;
};
```

**Pros:**
- Works across all platforms
- Immediate detection
- No polling required

**Cons:**
- Doesn't work if called before page load
- May not catch all implementations

### Secondary Method: Platform-Specific Indicators

Each platform has UI indicators that can be monitored:

#### Google Meet
```javascript
const presentingIndicator = document.querySelector('[data-is-presenting="true"]');
const presentButton = document.querySelector('[aria-label*="present"]');
```

#### Zoom
```javascript
const sharingIndicator = document.querySelector('.sharing-indicator-container');
const stopShareButton = document.querySelector('[aria-label*="Stop Share"]');
```

**Implementation:**
```javascript
monitorGoogleMeet() {
  const observer = new MutationObserver((mutations) => {
    const presentingIndicator = document.querySelector('[data-is-presenting="true"]');
    if (presentingIndicator && !this.isSharing) {
      this.handleScreenShareStart();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
  });
}
```

### Fallback Method: Generic Indicators

For unknown platforms:

```javascript
checkDOMForIndicators() {
  const indicators = [
    '[data-is-presenting="true"]',
    '[aria-label*="presenting"]',
    '.sharing-indicator',
    '[aria-label*="Stop Share"]'
  ];
  
  const hasIndicator = indicators.some(selector => {
    return document.querySelector(selector) !== null;
  });
  
  // Update state based on indicators
}
```

## Sensitive Data Detection

### Pattern-Based Detection

The extension uses regex patterns to identify sensitive information:

```javascript
const patterns = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/,
  apiKey: /\b[A-Za-z0-9]{32,}\b|sk_live_[A-Za-z0-9]+/,
  revenue: /\$[\d,]+(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP)/,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/
};
```

### Site-Specific Selectors

For known sites, we use specific DOM selectors for better accuracy:

```javascript
const selectorMap = {
  'mail.google.com': {
    email: ['.gs .gD', '.adn.ads', '[email]'],
    general: ['.Tm.aeJ', '.nH .G-atb']
  },
  'dashboard.stripe.com': {
    revenue: ['[data-test-id*="amount"]', '.cell-revenue'],
    creditCard: ['[data-test-id*="card"]', '.card-number'],
    apiKeys: ['[data-test-id*="key"]', 'code']
  }
};
```

### DOM Scanning Strategy

**TreeWalker for Text Nodes:**
```javascript
const walker = document.createTreeWalker(
  document.body,
  NodeFilter.SHOW_TEXT,
  null,
  false
);

const textNodes = [];
let node;
while (node = walker.nextNode()) {
  if (node.parentElement && this.isVisible(node.parentElement)) {
    textNodes.push(node);
  }
}
```

**Processing Pipeline:**
1. Get site-specific selectors
2. Query DOM for matching elements
3. Walk text nodes for pattern matching
4. Combine results into set of elements to blur
5. Apply blur effects

## Blur Implementation

### CSS-Based Blur

The primary blur method uses CSS filters:

```css
.blur-protected {
  filter: blur(10px);
  user-select: none;
  transition: filter 0.3s ease;
}
```

**Adjustable Intensity:**
```javascript
element.style.filter = `blur(${settings.blurIntensity}px)`;
```

### Alternative: Pixelation

For some content types, pixelation works better:

```css
.blur-protected.pixelate {
  image-rendering: pixelated;
  filter: blur(8px) contrast(1.2);
}
```

### Overlay Method (Future)

For canvas elements or complex layouts:

```javascript
const overlay = document.createElement('div');
overlay.style.position = 'absolute';
overlay.style.inset = '0';
overlay.style.backdropFilter = 'blur(15px)';
overlay.style.pointerEvents = 'none';
element.parentElement.appendChild(overlay);
```

## Performance Optimization

### Debouncing DOM Scans

Prevent excessive scanning during rapid DOM changes:

```javascript
debouncedScan() {
  if (this.scanTimeout) {
    clearTimeout(this.scanTimeout);
  }
  
  this.scanTimeout = setTimeout(() => {
    if (!this.isScanning) {
      this.scanAndBlur();
    }
  }, 300); // 300ms debounce
}
```

### Element Caching

Track blurred elements to avoid redundant processing:

```javascript
this.blurredElements = new Map();

applyBlur(element) {
  if (this.blurredElements.has(element)) return;
  
  // Apply blur
  element.classList.add('blur-protected');
  
  // Cache
  this.blurredElements.set(element, {
    originalFilter: element.style.filter,
    timestamp: Date.now()
  });
}
```

### Efficient Visibility Check

Quick check before processing elements:

```javascript
isVisible(element) {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' 
    && style.visibility !== 'hidden' 
    && style.opacity !== '0';
}
```

### Scan Throttling

Prevent scanning during user interaction:

```javascript
this.isScanning = true;

try {
  // Perform scan
  this.scanForSensitiveData(selectors);
} finally {
  this.isScanning = false;
}
```

## State Management

### Background Script State

The background service worker maintains global state:

```javascript
{
  isScreenSharing: false,
  isBlurEnabled: true,
  activeTabId: null,
  settings: {
    blurEnabled: true,
    blurIntensity: 10,
    enabledSites: ['gmail', 'stripe', 'salesforce'],
    dataTypes: { email: true, creditCard: true, ... },
    autoEnable: true,
    showIndicator: true
  }
}
```

### State Synchronization

State updates flow through the background script:

```javascript
async notifyContentScripts() {
  const tabs = await chrome.tabs.query({
    url: ['https://mail.google.com/*', /* ... */]
  });
  
  for (const tab of tabs) {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'STATE_UPDATE',
      isScreenSharing: this.isScreenSharing,
      isBlurEnabled: this.isBlurEnabled,
      settings: this.settings
    });
  }
}
```

### Storage Persistence

Settings are saved to Chrome sync storage:

```javascript
await chrome.storage.sync.set({ 
  settings: this.settings 
});

const stored = await chrome.storage.sync.get('settings');
if (stored.settings) {
  this.settings = { ...this.settings, ...stored.settings };
}
```

## Message Passing

### Message Types

```javascript
// From detector to background
{
  type: 'SCREEN_SHARE_STARTED',
  platform: 'meet',
  timestamp: Date.now()
}

// From background to content
{
  type: 'STATE_UPDATE',
  isScreenSharing: true,
  isBlurEnabled: true,
  settings: { /* ... */ }
}

// From popup to background
{
  type: 'UPDATE_SETTINGS',
  settings: { /* new settings */ }
}
```

### Safe Message Handling

Always include error handling:

```javascript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    this.handleMessage(message, sender, sendResponse);
  } catch (error) {
    console.error('Message handling error:', error);
    sendResponse({ error: error.message });
  }
  return true; // Keep channel open for async
});
```

## Edge Cases

### Handle Multiple Monitors

Only blur when the specific window/tab is being shared:

```javascript
// Future enhancement
async checkIfThisTabIsShared() {
  // Check if current tab ID matches shared display
  // May require additional APIs
}
```

### Canvas and IFrame Content

Special handling for embedded content:

```javascript
// For canvas elements
const canvas = element.querySelector('canvas');
if (canvas) {
  canvas.style.filter = `blur(${intensity}px)`;
}

// For iframes (cross-origin limitations apply)
const iframe = element.querySelector('iframe');
if (iframe) {
  iframe.style.filter = `blur(${intensity}px)`;
}
```

### Dynamic Content (React/Vue/Angular)

MutationObserver handles framework-rendered content:

```javascript
this.observer = new MutationObserver((mutations) => {
  // Debounced scan catches new elements
  this.debouncedScan();
});

this.observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true
});
```

### Race Conditions

Prevent state inconsistencies:

```javascript
if (this.isSharing) return; // Already sharing
this.isSharing = true;

// Critical section
await this.handleScreenShareStart();
```

## Testing

### Manual Testing Checklist

- [ ] Screen share detection on Google Meet
- [ ] Screen share detection on Zoom
- [ ] Blur activates on Gmail
- [ ] Blur activates on Stripe
- [ ] Blur activates on Salesforce
- [ ] Keyboard shortcut toggles blur
- [ ] Settings persist across sessions
- [ ] Indicator shows/hides correctly
- [ ] Performance acceptable on large pages
- [ ] No console errors

### Automated Testing (Future)

```javascript
// Example test structure
describe('SensitiveDataBlurrer', () => {
  it('should detect email addresses', () => {
    const text = 'Contact me at john@example.com';
    expect(blurrer.containsSensitiveData(text)).toBe(true);
  });
  
  it('should blur credit card numbers', () => {
    const element = createElementWithText('4532-1234-5678-9010');
    blurrer.scanAndBlur();
    expect(element.classList.contains('blur-protected')).toBe(true);
  });
});
```

## Browser Compatibility

### Chrome/Edge (Manifest V3)
- ✅ Service worker background script
- ✅ chrome.* APIs
- ✅ ES2020+ features

### Firefox (Manifest V2 - Future)
- ⏳ Traditional background page
- ⏳ browser.* APIs (with polyfill)
- ⏳ Different content script injection

## Security Considerations

### Content Security Policy

Extension must work with strict CSP:

```javascript
// No inline scripts
// No eval()
// External resources from approved CDNs only
```

### XSS Prevention

Sanitize any user input:

```javascript
addCustomSite(url) {
  // Validate URL pattern
  if (!this.isValidUrlPattern(url)) {
    throw new Error('Invalid URL pattern');
  }
  // Proceed
}
```

### Data Privacy

```javascript
// Never log sensitive data
console.log('Found sensitive element'); // ✅
console.log('Email:', emailText); // ❌
```

## Development Workflow

### Local Development

1. Make changes to source files
2. Reload extension in browser
3. Test on target sites
4. Check console for errors
5. Iterate

### Debugging

```javascript
// Add debug logging
if (DEBUG) {
  console.log('Blur: Scanning', elements.length, 'elements');
}
```

### Performance Profiling

Use Chrome DevTools:
1. Open Performance tab
2. Start recording
3. Trigger blur scan
4. Analyze results

## Future Enhancements

### Machine Learning Detection

```javascript
// Potential integration
import { detectSensitiveContent } from './ml-model.js';

async scanWithML(text) {
  const predictions = await detectSensitiveContent(text);
  return predictions.filter(p => p.confidence > 0.8);
}
```

### Smart Redaction

Instead of full blur, preserve context:

```javascript
// "john.doe@company.com" → "j***@c***.com"
function smartRedact(text, type) {
  if (type === 'email') {
    return text.replace(/(.)[^@]*(@)(.)[^.]*/, '$1***$2$3***');
  }
}
```

## Contributing

When adding new features:

1. Update relevant documentation
2. Add comments for complex logic
3. Test across all supported browsers
4. Update README with new capabilities
5. Consider performance impact

## Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [MDN Web APIs](https://developer.mozilla.org/en-US/docs/Web/API)
- [Content Security Policy](https://developer.chrome.com/docs/extensions/mv3/intro/mv3-overview/#content-security-policy)
