// Popup Script - Controls and settings interface

class PopupController {
  static SETTINGS_VERSION = '1.0';

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
      showIndicator: true
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

    document.getElementById('open-settings').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // Export/Import
    document.getElementById('export-settings').addEventListener('click', () => {
      this.exportSettings();
    });

    document.getElementById('import-settings').addEventListener('click', () => {
      document.getElementById('import-file').click();
    });

    document.getElementById('import-file').addEventListener('change', (e) => {
      this.importSettings(e.target.files[0]);
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

  exportSettings() {
    try {
      const now = new Date();

      // Create export data
      const exportData = {
        version: PopupController.SETTINGS_VERSION,
        exportedAt: now.toISOString(),
        settings: this.state.settings
      };

      // Convert to JSON
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blur-settings-${now.toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update status
      const statusText = document.getElementById('status');
      const originalText = statusText.textContent;
      statusText.textContent = 'Settings exported!';
      setTimeout(() => {
        statusText.textContent = originalText;
      }, 2000);
    } catch (error) {
      console.error('Export failed:', error);
      const statusText = document.getElementById('status');
      const originalText = statusText.textContent;
      statusText.style.color = '#ef4444';
      statusText.textContent = 'Failed to export settings. Please try again.';
      setTimeout(() => {
        statusText.style.color = '';
        statusText.textContent = originalText;
      }, 3000);
    }
  }

  async importSettings(file) {
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      // Validate import data
      if (!importData.version || !importData.settings) {
        throw new Error('Invalid settings file format');
      }

      // Validate settings structure and types
      const settings = importData.settings;

      if (typeof settings.blurEnabled !== 'boolean') {
        throw new Error('blurEnabled must be a boolean');
      }
      if (typeof settings.blurIntensity !== 'number' || settings.blurIntensity < 0) {
        throw new Error('blurIntensity must be a positive number');
      }
      if (typeof settings.autoEnable !== 'boolean') {
        throw new Error('autoEnable must be a boolean');
      }
      if (typeof settings.showIndicator !== 'boolean') {
        throw new Error('showIndicator must be a boolean');
      }

      // Validate dataTypes object and its fields
      if (!settings.dataTypes || typeof settings.dataTypes !== 'object') {
        throw new Error('dataTypes must be an object');
      }

      const requiredDataTypes = ['email', 'creditCard', 'apiKeys', 'revenue', 'accountNumbers', 'pii'];
      for (const type of requiredDataTypes) {
        if (!(type in settings.dataTypes)) {
          throw new Error(`Missing required dataTypes field: ${type}`);
        }
        if (typeof settings.dataTypes[type] !== 'boolean') {
          throw new Error(`dataTypes.${type} must be a boolean`);
        }
      }

      // Update settings
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings: importData.settings
      });

      this.state.settings = importData.settings;

      // Update UI
      this.setupUI();

      // Update status
      const statusText = document.getElementById('status');
      const originalText = statusText.textContent;
      statusText.textContent = 'Settings imported!';
      setTimeout(() => {
        statusText.textContent = originalText;
      }, 2000);
    } catch (error) {
      console.error('Import failed:', error);
      const statusText = document.getElementById('status');
      const originalText = statusText.textContent;
      statusText.style.color = '#ef4444';
      statusText.textContent = `Failed to import settings: ${error.message}`;
      setTimeout(() => {
        statusText.style.color = '';
        statusText.textContent = originalText;
      }, 3000);
    } finally {
      // Clear file input
      document.getElementById('import-file').value = '';
    }
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
