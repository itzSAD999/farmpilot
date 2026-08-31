const fs = require('fs');

// 1x1 transparent PNG base64
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
const buffer = Buffer.from(pngBase64, 'base64');

fs.writeFileSync('public/pwa-192x192.png', buffer);
fs.writeFileSync('public/pwa-512x512.png', buffer);
console.log('Created dummy PWA icons');
