// Popup Script - Controls and settings interface

class PopupController {
  constructor() {
    this.state = null;
    this.init();
  }

  async init() {
    // Get current state
    await this.loadState();
    
    // Set up UI
    this.setupUI();
    
    // Set up listeners
    this.setupListeners();
    
    // Update display
    this.updateDisplay();
  }

  async loadState() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      this.state = response;
    } catch (error) {
      console.error('Failed to load state:', error);
      this.state = {
        isScreenSharing: false,
        isBlurEnabled: true,
        settings: this.getDefaultSettings()
      };
    }
  }

  getDefaultSettings() {
    return {
      blurEnabled: true,
      blurIntensity: 10,
      dataTypes: {
        email: true,
        creditCard: true,
        apiKeys: true,
        revenue: true,
        accountNumbers: true,
        pii: true
      },
      autoEnable: true,
      showIndicator: true,
      customPatterns: []
    };
  }

  setupUI() {
    const settings = this.state.settings;

    // Main toggle
    document.getElementById('toggle-blur').checked = settings.blurEnabled;

    // Blur intensity
    document.getElementById('blur-intensity').value = settings.blurIntensity;
    document.getElementById('intensity-value').textContent = `${settings.blurIntensity}px`;

    // Data types
    document.getElementById('blur-email').checked = settings.dataTypes.email;
    document.getElementById('blur-credit-card').checked = settings.dataTypes.creditCard;
    document.getElementById('blur-api-keys').checked = settings.dataTypes.apiKeys;
    document.getElementById('blur-revenue').checked = settings.dataTypes.revenue;
    document.getElementById('blur-account-numbers').checked = settings.dataTypes.accountNumbers;
    document.getElementById('blur-pii').checked = settings.dataTypes.pii;

    // Options
    document.getElementById('auto-enable').checked = settings.autoEnable;
    document.getElementById('show-indicator').checked = settings.showIndicator;

    // Custom patterns
    this.renderCustomPatterns();
  }

  setupListeners() {
    // Main toggle
    document.getElementById('toggle-blur').addEventListener('change', (e) => {
      this.toggleBlur(e.target.checked);
    });
    
    // Blur intensity slider
    const intensitySlider = document.getElementById('blur-intensity');
    intensitySlider.addEventListener('input', (e) => {
      const value = e.target.value;
      document.getElementById('intensity-value').textContent = `${value}px`;
      this.updateSetting('blurIntensity', parseInt(value));
    });
    
    // Data type checkboxes
    const dataTypeCheckboxes = {
      'blur-email': 'email',
      'blur-credit-card': 'creditCard',
      'blur-api-keys': 'apiKeys',
      'blur-revenue': 'revenue',
      'blur-account-numbers': 'accountNumbers',
      'blur-pii': 'pii'
    };
    
    Object.entries(dataTypeCheckboxes).forEach(([id, key]) => {
      document.getElementById(id).addEventListener('change', (e) => {
        this.updateDataType(key, e.target.checked);
      });
    });
    
    // Options
    document.getElementById('auto-enable').addEventListener('change', (e) => {
      this.updateSetting('autoEnable', e.target.checked);
    });
    
    document.getElementById('show-indicator').addEventListener('change', (e) => {
      this.updateSetting('showIndicator', e.target.checked);
    });
    
    // Buttons
    document.getElementById('add-site').addEventListener('click', () => {
      this.addCustomSite();
    });

    document.getElementById('add-pattern').addEventListener('click', () => {
      this.addCustomPattern();
    });

    document.getElementById('open-settings').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  updateDisplay() {
    // Update status
    const statusText = document.getElementById('status');
    const sharingStatus = document.getElementById('sharing-status').querySelector('.status-badge');
    
    if (this.state.isScreenSharing) {
      statusText.textContent = 'Protection Active';
      sharingStatus.textContent = 'Screen sharing detected';
      sharingStatus.classList.add('active');
    } else {
      statusText.textContent = 'Ready';
      sharingStatus.textContent = 'Not sharing screen';
      sharingStatus.classList.remove('active');
    }
  }

  async toggleBlur(enabled) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TOGGLE_BLUR'
      });
      
      if (response.success) {
        this.state.isBlurEnabled = response.isBlurEnabled;
        this.updateDisplay();
      }
    } catch (error) {
      console.error('Failed to toggle blur:', error);
    }
  }

  async updateSetting(key, value) {
    const newSettings = {
      ...this.state.settings,
      [key]: value
    };
    
    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings: newSettings
      });
      
      this.state.settings = newSettings;
    } catch (error) {
      console.error('Failed to update setting:', error);
    }
  }

  async updateDataType(key, value) {
    const newSettings = {
      ...this.state.settings,
      dataTypes: {
        ...this.state.settings.dataTypes,
        [key]: value
      }
    };
    
    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings: newSettings
      });
      
      this.state.settings = newSettings;
    } catch (error) {
      console.error('Failed to update data type:', error);
    }
  }

  addCustomSite() {
    const url = prompt('Enter the URL pattern for the custom site:\nExample: https://example.com/*');
    
    if (url) {
      // Validate URL pattern
      if (this.isValidUrlPattern(url)) {
        alert('Custom site added! You\'ll need to reload the extension for this to take effect.');
        // TODO: Implement dynamic site addition
      } else {
        alert('Invalid URL pattern. Please use format: https://example.com/*');
      }
    }
  }

  isValidUrlPattern(url) {
    try {
      new URL(url.replace('*', 'test'));
      return true;
    } catch {
      return false;
    }
  }

  renderCustomPatterns() {
    const container = document.getElementById('custom-patterns-list');
    const patterns = this.state.settings.customPatterns || [];

    if (patterns.length === 0) {
      container.innerHTML = '<p class="description" style="margin: 0;">No custom patterns yet</p>';
      return;
    }

    container.innerHTML = patterns.map((pattern, index) => `
      <div class="pattern-item">
        <div class="pattern-info">
          <div class="pattern-name">${this.escapeHtml(pattern.name)}</div>
          <div class="pattern-regex">${this.escapeHtml(pattern.regex)}</div>
        </div>
        <div class="pattern-actions">
          <button class="pattern-btn test-pattern" data-index="${index}">Test</button>
          <button class="pattern-btn delete" data-index="${index}">Delete</button>
        </div>
      </div>
    `).join('');

    // Add event listeners using event delegation
    container.addEventListener('click', (e) => {
      const button = e.target.closest('.pattern-btn');
      if (!button) {
        return;
      }

      const index = parseInt(button.dataset.index, 10);
      if (isNaN(index)) {
        return;
      }

      if (button.classList.contains('test-pattern')) {
        this.testPattern(patterns[index]);
      } else if (button.classList.contains('delete')) {
        this.deletePattern(index);
      }
    });
  }

  addCustomPattern() {
    const name = prompt('Enter a name for this pattern:\nExample: Social Security Number');
    if (!name || !name.trim()) {
      return;
    }

    const regex = prompt('Enter the regex pattern (without slashes):\nExample: \\b\\d{3}-\\d{2}-\\d{4}\\b');
    if (!regex || !regex.trim()) {
      return;
    }

    // Test if regex is valid
    try {
      new RegExp(regex);
    } catch (error) {
      alert(`Invalid regex pattern: ${error.message}`);
      return;
    }

    // Add pattern
    const customPatterns = this.state.settings.customPatterns || [];
    customPatterns.push({
      name: name.trim(),
      regex: regex.trim(),
      enabled: true
    });

    this.updateSetting('customPatterns', customPatterns);
    this.renderCustomPatterns();
  }

  testPattern(pattern) {
    const testText = prompt(
      `Test your pattern: ${pattern.name}\n\nEnter text to test against:\n/${pattern.regex}/g`
    );

    if (!testText) {
      return;
    }

    try {
      const regex = new RegExp(pattern.regex, 'g');
      const matches = testText.match(regex);

      if (matches && matches.length > 0) {
        alert(
          `✅ Pattern matched!\n\nFound ${matches.length} match(es):\n\n${matches.slice(0, 5).join('\n')}${matches.length > 5 ? '\n...' : ''}`
        );
      } else {
        alert('❌ No matches found.\n\nThe pattern did not match the test text.');
      }
    } catch (error) {
      alert(`Error testing pattern: ${error.message}`);
    }
  }

  async deletePattern(index) {
    if (!confirm('Delete this custom pattern?')) {
      return;
    }

    const customPatterns = (this.state.settings.customPatterns || []).filter((_, i) => i !== index);

    await this.updateSetting('customPatterns', customPatterns);
    this.renderCustomPatterns();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize popup when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
  });
} else {
  new PopupController();
}
