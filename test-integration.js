// test-integration.js - Quick integration test for Juan LMS
const fs = require('fs');
const path = require('path');

console.log('🧪 Juan LMS Integration Test');
console.log('=============================\n');

// Test 1: Check if all package.json files exist and are valid
console.log('1. Checking package.json files...');
const packageFiles = [
  'package.json',
  'frontend/package.json',
  'backend/server/package.json',
  'backend/socket/package.json'
];

let allPackagesValid = true;
packageFiles.forEach(file => {
  try {
    const content = JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log(`   ✅ ${file} - Valid JSON`);
    
    // Check for required fields
    if (!content.name || !content.version) {
      console.log(`   ⚠️  ${file} - Missing name or version`);
      allPackagesValid = false;
    }
  } catch (error) {
    console.log(`   ❌ ${file} - Invalid JSON: ${error.message}`);
    allPackagesValid = false;
  }
});

// Test 2: Check if essential directories exist
console.log('\n2. Checking directory structure...');
const essentialDirs = [
  'frontend/src',
  'backend/server/routes',
  'backend/server/models',
  'backend/server/middleware',
  'uploads'
];

essentialDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`   ✅ ${dir}/ - Exists`);
  } else {
    console.log(`   ❌ ${dir}/ - Missing`);
  }
});

// Test 3: Check if environment file exists
console.log('\n3. Checking environment configuration...');
if (fs.existsSync('backend/server/config.env')) {
  console.log('   ✅ config.env - Exists');
  
  // Check for required environment variables
  const envContent = fs.readFileSync('backend/server/config.env', 'utf8');
  const requiredVars = ['ATLAS_URI', 'JWT_SECRET', 'PORT'];
  requiredVars.forEach(varName => {
    if (envContent.includes(varName)) {
      console.log(`   ✅ ${varName} - Configured`);
    } else {
      console.log(`   ⚠️  ${varName} - Not found`);
    }
  });
} else {
  console.log('   ❌ config.env - Missing');
}

// Test 4: Check if main server file has socket.io integration
console.log('\n4. Checking server integration...');
try {
  const serverContent = fs.readFileSync('backend/server/server.js', 'utf8');
  if (serverContent.includes('socket.io') && serverContent.includes('createServer')) {
    console.log('   ✅ Socket.io - Integrated with Express server');
  } else {
    console.log('   ❌ Socket.io - Not properly integrated');
  }
} catch (error) {
  console.log(`   ❌ server.js - Cannot read: ${error.message}`);
}

// Test 5: Check if frontend has socket.io client
console.log('\n5. Checking frontend dependencies...');
try {
  const frontendPackage = JSON.parse(fs.readFileSync('frontend/package.json', 'utf8'));
  if (frontendPackage.dependencies['socket.io-client']) {
    console.log('   ✅ socket.io-client - Available');
  } else {
    console.log('   ❌ socket.io-client - Missing');
  }
} catch (error) {
  console.log(`   ❌ frontend/package.json - Cannot read: ${error.message}`);
}

console.log('\n=============================');
console.log('Integration Test Complete!');
console.log('\nTo start the system:');
console.log('  Windows: start.bat');
console.log('  Unix/Linux: ./start.sh');
console.log('  Manual: npm run dev');
console.log('\nFor more information, see README.md'); 