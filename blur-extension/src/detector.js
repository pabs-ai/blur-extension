// Screen Share Detector - Monitors conferencing apps for active screen sharing

class ScreenShareDetector {
  constructor() {
    this.isSharing = false;
    this.checkInterval = null;
    this.stateChangeTimer = null;
    this.pendingState = null;
    this.init();
  }

  init() {
    console.log('Blur: Screen share detector initialized');
    
    // Detect platform
    this.platform = this.detectPlatform();
    
    // Start monitoring
    this.startMonitoring();
    
    // Listen for messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'CHECK_SCREEN_SHARE') {
        sendResponse({ isSharing: this.isSharing });
      }
      return true;
    });
  }

  detectPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('meet.google.com')) return 'meet';
    if (hostname.includes('zoom.us')) return 'zoom';
    return null;
  }

  startMonitoring() {
    // Hook into getDisplayMedia API
    this.hookGetDisplayMedia();
    
    // Platform-specific monitoring
    if (this.platform === 'meet') {
      this.monitorGoogleMeet();
    } else if (this.platform === 'zoom') {
      this.monitorZoom();
    }
    
    // Fallback: Check for screen share indicators in DOM
    this.checkInterval = setInterval(() => {
      this.checkDOMForIndicators();
    }, 1000);
  }

  hookGetDisplayMedia() {
    // Store original if not already stored
    if (!this.originalGetDisplayMedia) {
      this.originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
      console.log('Blur: Stored original getDisplayMedia');
    }

    const detector = this;

    // Replace with our hooked version
    navigator.mediaDevices.getDisplayMedia = async function(...args) {
      console.log('Blur: getDisplayMedia called - hook working!');

      try {
        const stream = await detector.originalGetDisplayMedia(...args);

        // Screen sharing started
        detector.handleScreenShareStart(stream);

        // Monitor for when it stops
        stream.getVideoTracks().forEach(track => {
          track.onended = () => {
            console.log('Blur: Screen share track ended');
            detector.handleScreenShareStop();
          };
        });

        return stream;
      } catch (error) {
        console.log('Blur: getDisplayMedia cancelled or failed', error);
        throw error;
      }
    };

    console.log('Blur: Hook applied to getDisplayMedia');

    // Re-apply hook a few times during page load, then stop
    if (!this.hookAttempts) this.hookAttempts = 0;
    this.hookAttempts++;

    if (this.hookAttempts < 5) {
      setTimeout(() => this.hookGetDisplayMedia(), 2000);
    } else {
      console.log('Blur: Hook monitoring complete');
    }
  }

  monitorGoogleMeet() {
    // Google Meet specific monitoring
    const observer = new MutationObserver((mutations) => {
      // Look for "You are presenting" indicator
      const presentingIndicator = document.querySelector('[data-is-presenting="true"]');
      const presentButton = document.querySelector('[aria-label*="present"]');
      
      if (presentingIndicator) {
        if (!this.isSharing) {
          this.handleScreenShareStart();
        }
      } else if (presentButton && !presentButton.disabled) {
        if (this.isSharing) {
          this.handleScreenShareStop();
        }
      }
    });

    // Wait for body to be available
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true
        });
      });
    }
  }

  monitorZoom() {
    // Zoom specific monitoring
    const observer = new MutationObserver((mutations) => {
      // Look for "You are screen sharing" indicator
      const sharingIndicator = document.querySelector('.sharing-indicator-container');
      const stopShareButton = document.querySelector('[aria-label*="Stop Share"]');
      
      if (sharingIndicator || stopShareButton) {
        if (!this.isSharing) {
          this.handleScreenShareStart();
        }
      } else {
        if (this.isSharing) {
          this.handleScreenShareStop();
        }
      }
    });

    // Wait for body to be available
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      });
    }
  }

  checkDOMForIndicators() {
    // Generic check for screen sharing indicators
    const indicators = [
      // Google Meet
      '[data-is-presenting="true"]',
      '[aria-label*="presenting"]',
      // Zoom
      '.sharing-indicator',
      '[aria-label*="Stop Share"]',
      '[aria-label*="stop sharing"]'
    ];

    const hasIndicator = indicators.some(selector => {
      return document.querySelector(selector) !== null;
    });

    const newState = hasIndicator;

    // Debounce state changes to prevent flickering
    if (newState !== this.isSharing) {
      if (this.pendingState === newState) {
        // Same pending state, no need to reset timer
        return;
      }

      // Clear existing timer
      if (this.stateChangeTimer) {
        clearTimeout(this.stateChangeTimer);
      }

      this.pendingState = newState;

      // Wait 3 seconds before actually changing state
      this.stateChangeTimer = setTimeout(() => {
        if (newState && !this.isSharing) {
          this.handleScreenShareStart();
        } else if (!newState && this.isSharing) {
          this.handleScreenShareStop();
        }
        this.pendingState = null;
      }, 3000);
    }
  }

  handleScreenShareStart(stream = null) {
    if (this.isSharing) return; // Already sharing
    
    console.log('Blur: Screen sharing started');
    this.isSharing = true;
    
    // Notify background script
    chrome.runtime.sendMessage({
      type: 'SCREEN_SHARE_STARTED',
      platform: this.platform,
      timestamp: Date.now()
    });
  }

  handleScreenShareStop() {
    if (!this.isSharing) return; // Already stopped
    
    console.log('Blur: Screen sharing stopped');
    this.isSharing = false;
    
    // Notify background script
    chrome.runtime.sendMessage({
      type: 'SCREEN_SHARE_STOPPED',
      timestamp: Date.now()
    });
  }
}

// Initialize detector
const detector = new ScreenShareDetector();
