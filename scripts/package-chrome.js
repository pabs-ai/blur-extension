#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

console.log('📦 Packaging Chrome Extension...\n');

const distDir = 'dist';
const outputFile = path.join(distDir, 'blur-extension-chrome.zip');

// Create dist directory if it doesn't exist
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Remove old package if exists
if (fs.existsSync(outputFile)) {
  fs.unlinkSync(outputFile);
  console.log('🗑️  Removed old package');
}

// Files to include in package
const filesToInclude = [
  'manifest.json',
  'src/',
  'assets/',
];

// Files to exclude (glob patterns)
const excludePatterns = [
  '**/.git*',
  '**/node_modules/**',
  '**/tests/**',
  '**/dist/**',
  '**/scripts/**',
  '**/*.test.js',
  '**/.DS_Store',
  '**/package.json',
  '**/package-lock.json',
  '**/eslint.config.js',
  '**/.prettierrc.json',
  '**/BUGFIXES*.md',
  '**/PROJECT_SUMMARY.md',
  '**/GETTING_STARTED.md',
];

async function createZip() {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputFile);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    output.on('close', () => {
      const sizeMB = (archive.pointer() / (1024 * 1024)).toFixed(2);
      console.log(`\n✅ Chrome package created successfully!`);
      console.log(`📍 Location: ${outputFile}`);
      console.log(`📏 Size: ${sizeMB} MB`);
      console.log(`📦 Total bytes: ${archive.pointer()}`);
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('⚠️  Warning:', err.message);
      } else {
        reject(err);
      }
    });

    archive.pipe(output);

    console.log('📦 Creating package...');

    // Add files and directories
    filesToInclude.forEach((item) => {
      const itemPath = path.resolve(item);

      if (fs.existsSync(itemPath)) {
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          // Add directory with exclusions
          archive.glob('**/*', {
            cwd: itemPath,
            ignore: excludePatterns,
            dot: false
          }, {
            prefix: item.endsWith('/') ? item.slice(0, -1) : item
          });
          console.log(`  ✓ Added directory: ${item}`);
        } else {
          // Add single file
          archive.file(itemPath, { name: path.basename(item) });
          console.log(`  ✓ Added file: ${item}`);
        }
      } else {
        console.warn(`  ⚠️  Skipping missing: ${item}`);
      }
    });

    archive.finalize();
  });
}

// Run the packaging
createZip().catch((error) => {
  console.error(`\n❌ Packaging failed: ${error.message}`);
  process.exit(1);
});
