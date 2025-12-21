# Extension Icons

This directory should contain the extension icons in various sizes.

## Required Icon Sizes

- `icon-16.png` - 16x16 pixels (toolbar icon, small)
- `icon-32.png` - 32x32 pixels (toolbar icon, retina)
- `icon-48.png` - 48x48 pixels (extensions page)
- `icon-128.png` - 128x128 pixels (Chrome Web Store, notifications)
- `icon-active-128.png` - 128x128 pixels (active state icon)

## Design Guidelines

### Main Icon (icon-128.png)
- **Concept**: Eye with blur effect or shield with eye
- **Colors**: 
  - Primary: #10b981 (green)
  - Secondary: #059669 (darker green)
  - Accent: White or light gray
- **Style**: Modern, minimal, professional
- **Format**: PNG with transparency

### Active State Icon (icon-active-128.png)
- Same design as main icon
- Add green badge or glow effect
- Indicates blur protection is active

## Quick Icon Creation

### Using Online Tools

1. **Figma/Canva**:
   - Create 128x128 canvas
   - Design eye icon with blur effect
   - Export as PNG

2. **Icon Generators**:
   - Use https://www.favicon-generator.org/
   - Upload your 128x128 design
   - Download all sizes

### Using Command Line (ImageMagick)

If you have a 128x128 source icon:

```bash
# Install ImageMagick first
# brew install imagemagick  (macOS)
# apt-get install imagemagick  (Ubuntu)

# Generate all sizes from source
convert icon-128.png -resize 16x16 icon-16.png
convert icon-128.png -resize 32x32 icon-32.png
convert icon-128.png -resize 48x48 icon-48.png
```

## Placeholder Icons

For development, you can use simple colored squares:

```bash
# Create placeholder icons (requires ImageMagick)
convert -size 16x16 xc:#10b981 icon-16.png
convert -size 32x32 xc:#10b981 icon-32.png
convert -size 48x48 xc:#10b981 icon-48.png
convert -size 128x128 xc:#10b981 icon-128.png
convert -size 128x128 xc:#059669 icon-active-128.png
```

## Design Assets

### SVG Source (Recommended)

Create an SVG version for easy scaling:

```svg
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <!-- Eye icon -->
  <path d="M64 32C40 32 20 48 8 64c12 16 32 32 56 32s44-16 56-32c-12-16-32-32-56-32z" 
        fill="none" stroke="#10b981" stroke-width="8"/>
  <circle cx="64" cy="64" r="20" fill="#10b981"/>
  
  <!-- Blur effect (optional) -->
  <filter id="blur">
    <feGaussianBlur in="SourceGraphic" stdDeviation="2"/>
  </filter>
</svg>
```

## Site-Specific Icons (Optional)

For better user experience, you can add favicons for protected sites:

- `gmail-icon.png` - Gmail logo (16x16)
- `stripe-icon.png` - Stripe logo (16x16)
- `salesforce-icon.png` - Salesforce logo (16x16)

## Current Status

⚠️ **Action Required**: Icon files need to be created before the extension can be loaded.

You can either:
1. Create professional icons using the guidelines above
2. Use placeholder icons for development
3. Commission a designer for production-ready icons

## Testing Icons

After creating icons, verify they appear correctly:

1. Load extension in Chrome
2. Check toolbar icon
3. Check extensions page (chrome://extensions)
4. Click icon to verify popup shows correct icon
5. Test active state during screen sharing
