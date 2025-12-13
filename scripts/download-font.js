const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const outputPath = path.join(process.cwd(), 'public', 'NotoSansArabic-Regular.ttf');

// Ensure public directory exists
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Try multiple font sources
const fontUrls = [
  'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansarabic/NotoSansArabic-Regular.ttf',
  'https://github.com/google/fonts/raw/main/ofl/notosansarabic/NotoSansArabic-Regular.ttf',
  'https://raw.githubusercontent.com/google/fonts/main/ofl/notosansarabic/NotoSansArabic-Regular.ttf',
];

function downloadFont(url, index) {
  return new Promise((resolve, reject) => {
    console.log(`Trying source ${index + 1}/${fontUrls.length}: ${url}`);
    
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(outputPath);
    
    const request = protocol.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/octet-stream, */*',
      },
      timeout: 30000,
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
            resolve(true);
          } else {
            fs.unlinkSync(outputPath);
            reject(new Error('Downloaded file is empty'));
          }
        });
      } else if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
        // Handle redirect
        file.close();
        fs.unlinkSync(outputPath);
        downloadFont(response.headers.location, index).then(resolve).catch(reject);
      } else {
        file.close();
        fs.unlinkSync(outputPath);
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    });
    
    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      reject(err);
    });
    
    request.on('timeout', () => {
      request.destroy();
      file.close();
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      reject(new Error('Request timeout'));
    });
  });
}

async function tryDownload() {
  console.log('Downloading Noto Sans Arabic font...');
  console.log('To:', outputPath);
  console.log('');
  
  for (let i = 0; i < fontUrls.length; i++) {
    try {
      await downloadFont(fontUrls[i], i);
      return; // Success, exit
    } catch (error) {
      console.log(`  ✗ Failed: ${error.message}`);
      if (i < fontUrls.length - 1) {
        console.log('');
      }
    }
  }
  
  // All sources failed
  console.error('\n✗ All download sources failed.');
  console.log('\nPlease download manually:');
  console.log('1. Visit: https://fonts.google.com/noto/specimen/Noto+Sans+Arabic');
  console.log('2. Click "Download family"');
  console.log('3. Extract and copy NotoSansArabic-Regular.ttf to public/');
  process.exit(1);
}

tryDownload();

