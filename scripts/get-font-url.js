const https = require('https');

// Get font URL from Google Fonts API
const apiUrl = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400&display=swap';

https.get(apiUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  },
}, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('CSS Response:');
    console.log(data);
    console.log('\n---\n');
    
    // Try multiple patterns
    const patterns = [
      /url\(['"]?([^'")]+\.ttf[^'")]*)['"]?\)/,
      /src:\s*url\(['"]?([^'")]+\.ttf[^'")]*)['"]?\)/,
      /url\(([^)]+\.ttf[^)]*)\)/,
    ];
    
    for (const pattern of patterns) {
      const match = data.match(pattern);
      if (match && match[1]) {
        const url = match[1].replace(/['"]/g, '').trim();
        console.log('Found font URL:', url);
        return;
      }
    }
    
    console.log('Could not extract font URL');
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});




