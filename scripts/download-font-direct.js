const https = require('https');
const fs = require('fs');
const path = require('path');

const outputPath = path.join(process.cwd(), 'public', 'NotoSansArabic-Regular.ttf');

// Direct download from a reliable CDN
const fontUrl = 'https://fonts.gstatic.com/s/notosansarabic/v18/nwpxtLGrGZMv5_Me3xB0a-LbAg6CtXyH6xG0Q.ttf';

console.log('Downloading Noto Sans Arabic font...');
console.log('URL:', fontUrl);
console.log('To:', outputPath);
console.log('');

// Ensure public directory exists
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const file = fs.createWriteStream(outputPath);

https.get(fontUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/octet-stream, */*',
    'Referer': 'https://fonts.googleapis.com/',
  },
}, (response) => {
  if (response.statusCode === 200) {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      const stats = fs.statSync(outputPath);
      if (stats.size > 0) {
        console.log('✓ Font downloaded successfully!');
        console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`  Location: ${outputPath}`);
        
        // Verify TTF header
        const fontBytes = fs.readFileSync(outputPath);
        const header = fontBytes.slice(0, 4);
        const isValidTTF = header[0] === 0x00 && header[1] === 0x01 && header[2] === 0x00 && header[3] === 0x00;
        if (isValidTTF) {
          console.log('  ✓ Valid TTF header confirmed');
        } else {
          console.log('  ⚠ Warning: Header does not match expected TTF format');
          console.log(`    Header: ${Array.from(header).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
        }
      } else {
        fs.unlinkSync(outputPath);
        console.error('✗ Downloaded file is empty');
        process.exit(1);
      }
    });
  } else if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
    // Handle redirect
    file.close();
    fs.unlinkSync(outputPath);
    console.log('Redirect detected, following...');
    downloadFont(response.headers.location);
  } else {
    file.close();
    fs.unlinkSync(outputPath);
    console.error(`✗ HTTP ${response.statusCode}`);
    process.exit(1);
  }
}).on('error', (err) => {
  file.close();
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }
  console.error('✗ Error:', err.message);
  process.exit(1);
});




