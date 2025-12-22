// Content Script - Detects and blurs sensitive information

class SensitiveDataBlurrer {
  constructor() {
    this.state = {
      isScreenSharing: false,
      isBlurEnabled: true,
      settings: null
    };
    this.blurredElements = new Map();
    this.observer = null;
    this.scanTimeout = null;
    this.isScanning = false;
    this.init();
  }

  async init() {
    console.log('Blur: Content script initialized on', window.location.hostname);
    
    // Wait for minimum DOM readiness
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve);
      });
    }
    
    // Get initial state from background
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      this.state = response;
    } catch (error) {
      console.log('Blur: Could not get initial state:', error);
      // Use defaults
      this.state = {
        isScreenSharing: false,
        isBlurEnabled: true,
        settings: null
      };
    }
    
    // Set up message listener
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });
    
    // Inject indicator
    this.createIndicator();
    
    // Start monitoring if needed
    this.updateBlurState();
  }

  handleMessage(message, sender, sendResponse) {
    if (message.type === 'STATE_UPDATE') {
      this.state = {
        isScreenSharing: message.isScreenSharing,
        isBlurEnabled: message.isBlurEnabled,
        settings: message.settings
      };
      this.updateBlurState();
      sendResponse({ success: true });
    }
  }

  updateBlurState() {
    const shouldBlur = this.state.isScreenSharing && this.state.isBlurEnabled;
    
    if (shouldBlur) {
      this.startBlurring();
    } else {
      this.stopBlurring();
    }
    
    this.updateIndicator(shouldBlur);
  }

  startBlurring() {
    console.log('Blur: Starting blur protection');
    
    // Initial scan - wait for body
    if (document.body) {
      this.scanAndBlur();
      this.setupObserver();
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        this.scanAndBlur();
        this.setupObserver();
      });
    }
  }

  setupObserver() {
    // Set up mutation observer for dynamic content
    if (!this.observer && document.body) {
      this.observer = new MutationObserver((mutations) => {
        this.debouncedScan();
      });
      
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
  }

  stopBlurring() {
    console.log('Blur: Stopping blur protection');
    
    // Stop observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    // Clear timeout
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }
    
    // Remove all blurs
    this.removeAllBlurs();
  }

  debouncedScan() {
    // Debounce scanning to avoid performance issues
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
    }
    
    this.scanTimeout = setTimeout(() => {
      if (!this.isScanning) {
        this.scanAndBlur();
      }
    }, 300);
  }

  scanAndBlur() {
    this.isScanning = true;
    
    try {
      // Get site-specific selectors
      const selectors = this.getSiteSelectors();
      
      // Scan for sensitive data
      this.scanForSensitiveData(selectors);
      
    } catch (error) {
      console.error('Blur: Error during scan:', error);
    } finally {
      this.isScanning = false;
    }
  }

  getSiteSelectors() {
    const hostname = window.location.hostname;
    const settings = this.state.settings;
    
    // Site-specific selectors for common sensitive areas
    const selectorMap = {
      'mail.google.com': {
        email: [
          '.gs .gD', // Email subject
          '.adn.ads', // Email from
          '.go .gD', // Email body
          '[email]', // Email attributes
          '.iw' // Attachments
        ],
        general: [
          '.Tm.aeJ', // Email content
          '.nH .G-atb' // Search results
        ]
      },
      'dashboard.stripe.com': {
        revenue: [
          '[data-test-id*="amount"]',
          '[class*="Amount"]',
          '.cell-revenue',
          '[data-test-id*="balance"]'
        ],
        creditCard: [
          '[data-test-id*="card"]',
          '.card-number',
          '[class*="CardNumber"]'
        ],
        accountNumbers: [
          '[data-test-id*="account"]',
          '.account-number'
        ],
        apiKeys: [
          '[data-test-id*="key"]',
          '.api-key',
          'code'
        ],
        general: [
          '.cell-customer',
          '[data-test-id*="customer"]',
          '.customer-email'
        ]
      },
      'salesforce.com': {
        general: [
          '.forcePageBlockItem',
          '.test-id__field-value',
          '.outputLookupContainer'
        ],
        accountNumbers: [
          '[data-aura-rendered-by*="AccountNumber"]',
          '.accountNumber'
        ],
        revenue: [
          '[data-aura-rendered-by*="Amount"]',
          '[data-aura-rendered-by*="Revenue"]'
        ]
      }
    };
    
    // Find matching selectors
    for (const [domain, selectors] of Object.entries(selectorMap)) {
      if (hostname.includes(domain)) {
        return selectors;
      }
    }
    
    return { general: [] };
  }

  scanForSensitiveData(siteSelectors) {
    const dataTypes = this.state.settings?.dataTypes || {};
    
    // Combine all selectors to scan
    const elementsToScan = new Set();
    
    // Add site-specific elements
    Object.values(siteSelectors).forEach(selectors => {
      selectors.forEach(selector => {
        try {
          document.querySelectorAll(selector).forEach(el => {
            elementsToScan.add(el);
          });
        } catch (error) {
          console.warn('Invalid selector:', selector);
        }
      });
    });
    
    // Also scan all text nodes
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
    
    // Process text nodes
    textNodes.forEach(textNode => {
      const text = textNode.textContent;
      const parent = textNode.parentElement;
      
      if (this.containsSensitiveData(text, dataTypes)) {
        elementsToScan.add(parent);
      }
    });
    
    // Apply blur to identified elements
    elementsToScan.forEach(element => {
      this.applyBlur(element);
    });
  }

  containsSensitiveData(text, dataTypes) {
    if (!text || text.length < 3) return false;

    const patterns = {
      email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
      creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/,
      apiKeys: /\b[A-Za-z0-9]{32,}\b|sk_live_[A-Za-z0-9]+|pk_live_[A-Za-z0-9]+/,
      accountNumbers: /\b(?:acct_|account[_-]?)\w+\b/i,
      revenue: /\$[\d,]+(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP)/,
      pii: /\b\d{3}-\d{2}-\d{4}\b|\b(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (dataTypes[type] === true && pattern.test(text)) {
        return true;
      }
    }

    return false;
  }

  isVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    return style.display !== 'none' 
      && style.visibility !== 'hidden' 
      && style.opacity !== '0';
  }

  applyBlur(element) {
    if (!element || this.blurredElements.has(element)) return;
    
    // Create blur wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'blur-protection-wrapper';
    wrapper.setAttribute('data-blur-id', this.generateId());
    
    // Store original element reference
    this.blurredElements.set(element, wrapper);
    
    // Add blur class to element
    element.classList.add('blur-protected');
    
    // Store blur intensity from settings
    const intensity = this.state.settings?.blurIntensity || 10;
    element.style.filter = `blur(${intensity}px)`;
  }

  removeAllBlurs() {
    this.blurredElements.forEach((wrapper, element) => {
      element.classList.remove('blur-protected');
      element.style.filter = '';
    });
    
    this.blurredElements.clear();
  }

  generateId() {
    return `blur-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  createIndicator() {
    // Wait for body to be ready
    const addIndicator = () => {
      // Check if indicator already exists
      if (document.getElementById('blur-indicator')) {
        return;
      }
      
      const indicator = document.createElement('div');
      indicator.id = 'blur-indicator';
      indicator.className = 'blur-indicator hidden';
      indicator.innerHTML = `
        <div class="blur-indicator-content">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2C4.5 2 1.5 4.5 1 8c.5 3.5 3.5 6 7 6s6.5-2.5 7-6c-.5-3.5-3.5-6-7-6z" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="8" cy="8" r="2.5" fill="currentColor"/>
          </svg>
          <span>Blur Protection Active</span>
        </div>
      `;
      document.body.appendChild(indicator);
    };
    
    if (document.body) {
      addIndicator();
    } else {
      document.addEventListener('DOMContentLoaded', addIndicator);
    }
  }

  updateIndicator(isActive) {
    const indicator = document.getElementById('blur-indicator');
    if (indicator) {
      if (isActive) {
        indicator.classList.remove('hidden');
      } else {
        indicator.classList.add('hidden');
      }
    }
  }
}

// Initialize the blurrer
const blurrer = new SensitiveDataBlurrer();
