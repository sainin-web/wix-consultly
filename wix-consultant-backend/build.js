const esbuild = require('esbuild');

esbuild.build({
    entryPoints: ['public/consultant-login.js'],
    bundle: true,
    outfile: 'public/consultant-login-bundle.js',
    format: 'iife',      
    platform: 'browser',
    target: ['es2020'],
    globalName: 'ConsultantWidget',
}).then(() => {
    console.log("✅ Bundle ready!");
}).catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
});