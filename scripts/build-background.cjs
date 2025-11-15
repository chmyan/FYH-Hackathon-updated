// scripts/build-background.cjs
const esbuild = require('esbuild');
const path = require('path');

(async () => {
    try {
        await esbuild.build({
            entryPoints: [path.resolve(__dirname, '../src/background.ts')],
            bundle: true,
            platform: 'browser',
            target: ['es2020'],
            outfile: path.resolve(__dirname, '../dist/background.js'),
            sourcemap: false,
            minify: false
        });
        console.log('background.ts built -> dist/background.js');
    } catch (e) {
        console.error('Failed to build background.ts', e);
        process.exit(1);
    }
})();
