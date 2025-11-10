// Simple API test for authentication endpoints

async function testSignup() {
  try {
    console.log('🧪 Testing Signup API\n');

    // Use timestamp to ensure unique email
    const timestamp = Date.now();
    const signupData = {
      name: "Test User",
      email: `test${timestamp}@example.com`,
      phone: `+12345${timestamp.toString().slice(-5)}`, // Keep phone under 20 chars
      password: "password123"
    };

    const response = await fetch('http://localhost:5000/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(signupData)
    });

    const data = await response.json();

    console.log('📋 Signup Response:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${data.success}`);
    console.log(`   Message: ${data.message}`);

    if (data.success) {
      console.log(`   User ID: ${data.user?.id}`);
      console.log(`   User Email: ${data.user?.email}`);
      console.log(`   User Name: ${data.user?.name}`);
      console.log(`   Token: ${data.token ? 'Present' : 'Missing'}`);
      return { token: data.token, email: signupData.email };
    }

    return null;

  } catch (error) {
    console.error('❌ Signup Test Failed:', error.message);
    return null;
  }
}

async function testLogin(userData) {
  try {
    console.log('\n🧪 Testing Login API\n');

    const loginData = {
      emailOrPhone: userData.email,
      password: "password123"
    };

    const response = await fetch('http://localhost:5000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    });

    const data = await response.json();

    console.log('📋 Login Response:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${data.success}`);
    console.log(`   Message: ${data.message}`);

    if (data.success) {
      console.log(`   User ID: ${data.user?.id}`);
      console.log(`   User Email: ${data.user?.email}`);
      console.log(`   User Name: ${data.user?.name}`);
      console.log(`   Token: ${data.token ? 'Present' : 'Missing'}`);
    }

  } catch (error) {
    console.error('❌ Login Test Failed:', error.message);
  }
}

async function testInvalidLogin() {
  try {
    console.log('\n🧪 Testing Invalid Login API\n');

    const loginData = {
      emailOrPhone: "test@example.com",
      password: "wrongpassword"
    };

    const response = await fetch('http://localhost:5000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    });

    const data = await response.json();

    console.log('📋 Invalid Login Response:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Success: ${data.success}`);
    console.log(`   Message: ${data.message}`);

  } catch (error) {
    console.error('❌ Invalid Login Test Failed:', error.message);
  }
}

async function runAuthTests() {
  console.log('='.repeat(50));
  console.log('   AUTHENTICATION API TESTING');
  console.log('='.repeat(50));

  // Test signup
  const userData = await testSignup();

  // Test login with valid credentials
  if (userData) {
    await testLogin(userData);
  }

  // Test login with invalid credentials
  await testInvalidLogin();

  console.log('\n' + '='.repeat(50));
  console.log('   TESTING COMPLETE');
  console.log('='.repeat(50));
}

console.log('💡 Make sure:');
console.log('   1. Backend server is running on http://localhost:5000');
console.log('   2. Database is connected and accessible');
console.log('   3. JWT_SECRET is set in environment variables');
console.log('');

runAuthTests().catch(console.error);