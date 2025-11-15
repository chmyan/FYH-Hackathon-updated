// scripts/copy-manifest.cjs
const fs = require('fs');
const path = require('path');

fs.copyFileSync(path.resolve(__dirname, '../manifest.json'), path.resolve(__dirname, '../dist/manifest.json'));
console.log('manifest.json copied to dist/');
