// Background Service Worker - Manages extension state and screen share detection

class BlurExtension {
  constructor() {
    this.isScreenSharing = false;
    this.isBlurEnabled = true;
    this.activeTabId = null;
    this.settings = this.getDefaultSettings();
    this.init();
  }

  getDefaultSettings() {
    return {
      blurEnabled: true,
      blurIntensity: 10,
      enabledSites: ['gmail', 'stripe', 'salesforce'],
      customSites: [],
      sensitivityLevel: 'medium', // low, medium, high
      dataTypes: {
        email: true,
        creditCard: true,
        apiKeys: true,
        revenue: true,
        accountNumbers: true,
        pii: true,
        customPatterns: []
      },
      whitelistedMeetings: [],
      showIndicator: true,
      autoEnable: true
    };
  }

  async init() {
    // Load saved settings
    const stored = await chrome.storage.sync.get('settings');
    if (stored.settings) {
      this.settings = { ...this.settings, ...stored.settings };
    }

    // Set up listeners
    this.setupListeners();
    
    // Initialize icon state
    this.updateIcon(false);
  }

  setupListeners() {
    // Listen for messages from content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep channel open for async response
    });

    // Listen for keyboard shortcuts
    chrome.commands.onCommand.addListener((command) => {
      if (command === 'toggle-blur') {
        this.toggleBlur();
      }
    });

    // Listen for tab updates to detect screen sharing
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.checkScreenSharing(tabId, tab);
    });

    // Listen for tab activation
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.activeTabId = activeInfo.tabId;
    });
  }

  async handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'SCREEN_SHARE_STARTED':
        await this.handleScreenShareStarted(sender.tab.id);
        sendResponse({ success: true });
        break;

      case 'SCREEN_SHARE_STOPPED':
        await this.handleScreenShareStopped();
        sendResponse({ success: true });
        break;

      case 'GET_STATE':
        sendResponse({
          isScreenSharing: this.isScreenSharing,
          isBlurEnabled: this.isBlurEnabled,
          settings: this.settings
        });
        break;

      case 'UPDATE_SETTINGS':
        await this.updateSettings(message.settings);
        sendResponse({ success: true });
        break;

      case 'TOGGLE_BLUR':
        await this.toggleBlur();
        sendResponse({ 
          success: true, 
          isBlurEnabled: this.isBlurEnabled 
        });
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  async handleScreenShareStarted(tabId) {
    console.log('Screen sharing detected on tab:', tabId);
    this.isScreenSharing = true;
    this.activeTabId = tabId;
    
    if (this.settings.autoEnable) {
      this.isBlurEnabled = true;
    }

    this.updateIcon(true);
    await this.notifyContentScripts();
    
    // Show notification (with error handling)
    if (this.settings.showIndicator) {
      try {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'assets/icon-128.png',
          title: 'Blur Protection Active',
          message: 'Sensitive information will be automatically blurred',
          priority: 1
        });
      } catch (error) {
        console.log('Could not show notification:', error);
      }
    }
  }

  async handleScreenShareStopped() {
    console.log('Screen sharing stopped');
    this.isScreenSharing = false;
    this.updateIcon(false);
    await this.notifyContentScripts();
  }

  async toggleBlur() {
    this.isBlurEnabled = !this.isBlurEnabled;
    await this.notifyContentScripts();
    this.updateIcon(this.isScreenSharing);
    
    // Send notification (with error handling)
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icon-128.png',
        title: this.isBlurEnabled ? 'Blur Enabled' : 'Blur Disabled',
        message: this.isBlurEnabled 
          ? 'Sensitive information will be blurred' 
          : 'Blur protection is temporarily disabled',
        priority: 1
      });
    } catch (error) {
      console.log('Could not show notification:', error);
    }
  }

  async notifyContentScripts() {
    // Get all tabs (we'll try to message all of them, content scripts will respond if present)
    const tabs = await chrome.tabs.query({});

    // Send state update to all tabs
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'STATE_UPDATE',
          isScreenSharing: this.isScreenSharing,
          isBlurEnabled: this.isBlurEnabled,
          settings: this.settings
        });
      } catch (error) {
        // Ignore errors - tab might not have content script
      }
    }
  }

  async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    await chrome.storage.sync.set({ settings: this.settings });
    await this.notifyContentScripts();
  }

  updateIcon(isActive) {
    // Set badge to indicate status (skip icon changes to avoid fetch errors)
    const badgeText = isActive && this.isBlurEnabled ? 'ON' : '';
    const badgeColor = isActive && this.isBlurEnabled ? '#10b981' : '#6b7280';
    
    try {
      chrome.action.setBadgeText({ text: badgeText });
      chrome.action.setBadgeBackgroundColor({ color: badgeColor });
    } catch (error) {
      console.log('Could not update badge:', error);
    }
  }

  async checkScreenSharing(tabId, tab) {
    // This is a backup check - primary detection happens in detector.js
    if (tab.url && (tab.url.includes('meet.google.com') || tab.url.includes('zoom.us'))) {
      // Query the detector content script
      try {
        const response = await chrome.tabs.sendMessage(tabId, {
          type: 'CHECK_SCREEN_SHARE'
        });
        if (response && response.isSharing) {
          await this.handleScreenShareStarted(tabId);
        }
      } catch (error) {
        // Content script might not be ready yet
      }
    }
  }
}

// Initialize the extension
const blurExtension = new BlurExtension();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BlurExtension;
}
