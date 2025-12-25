// Screen Share Detector - Monitors conferencing apps for active screen sharing

class ScreenShareDetector {
  constructor() {
    this.isSharing = false;
    this.checkInterval = null;
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
    if (hostname.includes('slack.com')) return 'slack';
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
    } else if (this.platform === 'slack') {
      this.monitorSlack();
    }

    // Fallback: Check for screen share indicators in DOM
    this.checkInterval = setInterval(() => {
      this.checkDOMForIndicators();
    }, 1000);
  }

  hookGetDisplayMedia() {
    // Hook into the getDisplayMedia API to detect screen sharing
    const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
    const detector = this;

    navigator.mediaDevices.getDisplayMedia = async function(...args) {
      console.log('Blur: getDisplayMedia called');
      
      try {
        const stream = await originalGetDisplayMedia.apply(this, args);
        
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

  monitorSlack() {
    // Slack Huddles specific monitoring
    const observer = new MutationObserver((mutations) => {
      // Look for Slack Huddles screen sharing indicators
      // Slack uses huddle UI and screen share controls
      const huddleShareActive = document.querySelector('[data-qa="huddle_screenshare_controls"]');
      const stopSharingButton = document.querySelector('[aria-label*="Stop sharing" i]');
      const huddleShareIndicator = document.querySelector('.p-huddle_screenshare_container');

      if (huddleShareActive || stopSharingButton || huddleShareIndicator) {
        if (!this.isSharing) {
          this.handleScreenShareStart();
        }
      } else {
        if (this.isSharing) {
          this.handleScreenShareStop();
        }
      }
    });

    const startObserver = () => {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });
    };

    // Wait for body to be available
    if (document.body) {
      startObserver();
    } else {
      document.addEventListener('DOMContentLoaded', startObserver);
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
      '[aria-label*="stop sharing"]',
      // Slack Huddles
      '[data-qa="huddle_screenshare_controls"]',
      '.p-huddle_screenshare_container',
      '[aria-label*="Stop sharing"]'
    ];

    const hasIndicator = indicators.some(selector => {
      return document.querySelector(selector) !== null;
    });

    if (hasIndicator && !this.isSharing) {
      this.handleScreenShareStart();
    } else if (!hasIndicator && this.isSharing) {
      this.handleScreenShareStop();
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
