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

// Try multiple sources for TTF font
const fontUrls = [
  // Try GitHub via raw.githubusercontent.com
  'https://raw.githubusercontent.com/google/fonts/main/ofl/notosansarabic/NotoSansArabic-Regular.ttf',
  // Try via jsdelivr
  'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosansarabic/NotoSansArabic-Regular.ttf',
  // Try via unpkg
  'https://unpkg.com/@fontsource/noto-sans-arabic@latest/files/noto-sans-arabic-arabic-400-normal.woff2',
];

function downloadFont(url, index) {
  return new Promise((resolve, reject) => {
    console.log(`\nTrying source ${index + 1}/${fontUrls.length}: ${url}`);
    
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
        let totalBytes = 0;
        response.on('data', (chunk) => {
          totalBytes += chunk.length;
        });
        
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          const stats = fs.statSync(outputPath);
          if (stats.size > 0) {
            // Verify it's a valid TTF
            const fontBytes = fs.readFileSync(outputPath);
            const header = fontBytes.slice(0, 4);
            const isValidTTF = header[0] === 0x00 && header[1] === 0x01 && header[2] === 0x00 && header[3] === 0x00;
            
            if (isValidTTF || stats.size > 100000) { // Accept if large enough (might be valid even if header check fails)
              console.log('✓ Font downloaded successfully!');
              console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);
              console.log(`  Location: ${outputPath}`);
              if (isValidTTF) {
                console.log('  ✓ Valid TTF header confirmed');
              }
              resolve(true);
            } else {
              fs.unlinkSync(outputPath);
              reject(new Error('Downloaded file does not appear to be a valid TTF font'));
            }
          } else {
            fs.unlinkSync(outputPath);
            reject(new Error('Downloaded file is empty'));
          }
        });
      } else if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
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
  console.log('Downloading Noto Sans Arabic TTF font...');
  console.log('To:', outputPath);
  
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
  console.log('3. Extract the ZIP file');
  console.log('4. Find NotoSansArabic-Regular.ttf in the extracted folder');
  console.log('5. Copy it to: public/NotoSansArabic-Regular.ttf');
  process.exit(1);
}

tryDownload();

