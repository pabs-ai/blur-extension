#!/bin/bash

# Note: This script requires ImageMagick or rsvg-convert
# For now, we'll create simple PNG files using base64 encoded data

# Create a simple Python script to generate PNG icons
cat > generate_icons.py << 'PYEOF'
from PIL import Image, ImageDraw
import os

def create_icon(size, filename, color, is_active=False):
    # Create image with transparency
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw rounded rectangle background
    draw.rounded_rectangle([(0, 0), (size, size)], radius=size//5, fill=color)
    
    # Draw eye shape
    eye_scale = size / 128
    eye_y = size // 2
    
    # Eye outline
    draw.ellipse([
        (size * 0.2, eye_y - size * 0.15),
        (size * 0.8, eye_y + size * 0.15)
    ], outline='white', width=max(2, int(6 * eye_scale)))
    
    # Pupil
    draw.ellipse([
        (size * 0.43, eye_y - size * 0.09),
        (size * 0.57, eye_y + size * 0.09)
    ], fill='white')
    
    # Active indicator (green dot)
    if is_active and size >= 48:
        draw.ellipse([
            (size * 0.75, size * 0.12),
            (size * 0.88, size * 0.25)
        ], fill='#34d399')
    
    img.save(filename, 'PNG')
    print(f"Created {filename}")

# Create all required sizes
create_icon(16, 'icon-16.png', '#10b981')
create_icon(32, 'icon-32.png', '#10b981')
create_icon(48, 'icon-48.png', '#10b981')
create_icon(128, 'icon-128.png', '#10b981')
create_icon(128, 'icon-active-128.png', '#059669', is_active=True)

print("All icons created successfully!")
PYEOF

# Try to run with Python
if command -v python3 &> /dev/null; then
    python3 -c "from PIL import Image" 2>/dev/null
    if [ $? -eq 0 ]; then
        python3 generate_icons.py
    else
        echo "PIL not installed. Installing..."
        pip3 install Pillow --break-system-packages 2>/dev/null || pip3 install Pillow --user
        python3 generate_icons.py
    fi
else
    echo "Python 3 not found. Please install Python 3 and PIL (Pillow) to generate icons."
fi
