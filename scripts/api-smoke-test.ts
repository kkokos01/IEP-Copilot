#!/usr/bin/env node

// Simple API smoke test for IEP Copilot
// Tests basic endpoints without creating data

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(path: string, method: string = 'GET', body?: any, headers?: Record<string, string>) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    });

    return { status: response.status, ok: response.ok };
  } catch (error) {
    log(`   Error: ${error}`, 'red');
    return { status: 0, ok: false, error };
  }
}

async function runSmokeTest() {
  log('🚀 Starting IEP Copilot API Smoke Test', 'blue');
  log('================================', 'blue');
  log(`Testing: ${API_BASE_URL}`, 'blue');
  log('');

  let testsPassed = 0;
  let testsTotal = 0;

  // Test 1: Health check (home page)
  testsTotal++;
  log('📄 Test 1: Home page accessibility...', 'blue');
  const homeResult = await testEndpoint('/');
  if (homeResult.ok) {
    log('✅ Home page accessible', 'green');
    testsPassed++;
  } else {
    log(`❌ Home page failed (${homeResult.status})`, 'red');
  }

  // Test 2: Upload API with wrong Content-Type
  testsTotal++;
  log('\n📄 Test 2: Upload API rejects FormData...', 'blue');
  const formDataResult = await testEndpoint('/api/documents/upload', 'POST', 
    new FormData().toString(),
    { 'Content-Type': 'multipart/form-data' }
  );
  if (formDataResult.status === 415) {
    log('✅ Correctly rejects FormData (415)', 'green');
    testsPassed++;
  } else {
    log(`❌ Should return 415, got ${formDataResult.status}`, 'red');
  }

  // Test 3: Upload API with JSON but no auth
  testsTotal++;
  log('\n📄 Test 3: Upload API requires auth...', 'blue');
  const noAuthResult = await testEndpoint('/api/documents/upload', 'POST', {
    documentId: 'test',
    storagePath: 'test/test.pdf',
    caseId: 'test',
    type: 'iep',
    fileName: 'test.pdf',
    fileSize: 1000,
    mimeType: 'application/pdf'
  });
  if (noAuthResult.status === 401) {
    log('✅ Correctly requires authentication (401)', 'green');
    testsPassed++;
  } else {
    log(`❌ Should return 401, got ${noAuthResult.status}`, 'red');
  }

  // Test 4: Status check endpoint
  testsTotal++;
  log('\n📄 Test 4: Status check endpoint...', 'blue');
  const statusResult = await testEndpoint('/api/documents/upload?id=test-doc');
  if (statusResult.status === 401 || statusResult.status === 400 || statusResult.status === 404) {
    log('✅ Status endpoint responds (expected error for non-existent doc)', 'green');
    testsPassed++;
  } else {
    log(`❌ Unexpected status: ${statusResult.status}`, 'red');
  }

  // Test 5: Inngest endpoint
  testsTotal++;
  log('\n📄 Test 5: Inngest webhook endpoint...', 'blue');
  const inngestResult = await testEndpoint('/api/inngest');
  if (inngestResult.status === 200 || inngestResult.status === 405 || inngestResult.status === 400) {
    log('✅ Inngest endpoint responds', 'green');
    testsPassed++;
  } else {
    log(`❌ Unexpected status: ${inngestResult.status}`, 'red');
  }

  // Results
  log('\n' + '='.repeat(50), 'blue');
  log(`Results: ${testsPassed}/${testsTotal} tests passed`, 
    testsPassed === testsTotal ? 'green' : 'yellow');
  
  if (testsPassed === testsTotal) {
    log('\n🎉 All API tests passed!', 'green');
    log('✅ App is deployed and responding correctly', 'green');
    log('✅ Upload API rejects FormData correctly', 'green');
    log('✅ Authentication is working', 'green');
    return true;
  } else {
    log('\n⚠️  Some tests failed', 'yellow');
    log('Check Vercel function logs for details', 'yellow');
    return false;
  }
}

// Run the test
runSmokeTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
