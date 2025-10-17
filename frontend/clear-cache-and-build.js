// Script to clear browser cache and rebuild the application
// This helps resolve caching issues during development and deployment

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 Clearing cache and rebuilding application...');

try {
  // 1. Clear dist directory
  console.log('1. Clearing dist directory...');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
    console.log('   ✅ Dist directory cleared');
  }

  // 2. Clear node_modules cache
  console.log('2. Clearing node_modules cache...');
  try {
    execSync('npm cache clean --force', { stdio: 'inherit' });
    console.log('   ✅ npm cache cleared');
  } catch (error) {
    console.log('   ⚠️ npm cache clear failed (not critical)');
  }

  // 3. Rebuild the application
  console.log('3. Building application...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('   ✅ Build completed');

  // 4. Verify .htaccess was copied
  console.log('4. Verifying .htaccess file...');
  if (fs.existsSync('dist/.htaccess')) {
    console.log('   ✅ .htaccess file found in dist/');
  } else {
    console.log('   ❌ .htaccess file missing from dist/');
    // Copy it manually
    if (fs.existsSync('.htaccess')) {
      fs.copyFileSync('.htaccess', 'dist/.htaccess');
      console.log('   ✅ .htaccess file copied manually');
    }
  }

  // 5. Show build output
  console.log('5. Build output:');
  if (fs.existsSync('dist/assets')) {
    const assets = fs.readdirSync('dist/assets');
    console.log('   📁 Assets found:');
    assets.forEach(asset => {
      console.log(`      - ${asset}`);
    });
  }

  console.log('\n🎉 Build process completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Upload the contents of the dist/ folder to your hosting');
  console.log('2. Clear browser cache (Ctrl+Shift+R)');
  console.log('3. Test the application');

} catch (error) {
  console.error('❌ Build process failed:', error.message);
  process.exit(1);
}
