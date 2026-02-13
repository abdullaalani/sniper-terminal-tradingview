const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [64, 192, 512];
const svgPath = path.join(__dirname, 'public', 'icon.svg');
const outputDir = path.join(__dirname, 'public');

async function generateIcons() {
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `pwa-${size}x${size}.png`);
    
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`Generated ${outputPath}`);
  }
  
  console.log('All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
