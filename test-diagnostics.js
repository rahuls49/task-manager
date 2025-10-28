const http = require('http');

let authToken = null;

function makeRequest(method, path, data = null, useAuth = true) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Content-Type': 'application/json'
    };

    // Add authorization header if we have a token and useAuth is true
    if (useAuth && authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: headers
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testLogin() {
  console.log('Testing authentication...\n');

  const loginData = {
    userId: 'admin',
    password: 'password'
  };

  try {
    console.log('Attempting login...');
    const result = await makeRequest('POST', '/auth/login', loginData, false);
    console.log('Status:', result.status);
    
    if (result.status === 200 && result.data.success) {
      authToken = result.data.token;
      console.log('✅ Login successful! Token obtained.');
      return true;
    } else {
      console.log('❌ Login failed');
      console.log('Response:', JSON.stringify(result.data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return false;
  }
}

async function testSystemRoutes() {
  console.log('Testing system routes (no auth required)...\n');

  try {
    console.log('Getting task statistics...');
    const result = await makeRequest('GET', '/system/tasks/stats', null, false);
    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    
    if (result.status === 200) {
      console.log('✅ System routes working! Database connection confirmed.');
      return true;
    } else {
      console.log('❌ System routes failed');
      return false;
    }
  } catch (error) {
    console.error('❌ System route error:', error.message);
    console.log('\n🔍 Please make sure:');
    console.log('1. The backend server is running on port 5000');
    console.log('2. The database is running and accessible');
    console.log('3. The database schema has been created');
    return false;
  }
}

async function testBasicTaskCreation() {
  console.log('Testing basic task creation (without recurrence)...\n');

  // Test basic task creation first
  const basicTask = {
    title: "Simple Test Task",
    description: "A basic task without recurrence",
    dueDate: "2025-12-15", // Updated to future date
    dueTime: "10:00",
    statusId: 1,
    priorityId: 2
  };

  try {
    console.log('Creating basic task...');
    const result = await makeRequest('POST', '/tasks', basicTask);
    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    
    if (result.status === 201 || result.status === 200) {
      console.log('✅ Basic task creation successful!');
      return result.data.data?.Id;
    } else {
      console.log('❌ Basic task creation failed');
      return null;
    }
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    console.log('\n🔍 Please make sure:');
    console.log('1. The backend server is running on port 5000');
    console.log('2. The database is running and accessible');
    console.log('3. The database schema has been created');
    console.log('4. You are authenticated (login successful)');
    console.log('\nNote: Task routes are at /tasks (not /api/tasks) and require authentication');
    return null;
  }
}

async function testGetTasks() {
  console.log('\nTesting task retrieval...\n');

  try {
    console.log('Getting all tasks...');
    const result = await makeRequest('GET', '/tasks');
    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    
    if (result.status === 200) {
      console.log('✅ Task retrieval successful!');
    } else {
      console.log('❌ Task retrieval failed');
    }
  } catch (error) {
    console.error('❌ Connection error:', error.message);
  }
}

async function testWithRecurrence() {
  console.log('\nTesting task creation with recurrence...\n');

  const taskWithRecurrence = {
    title: "Weekly Recurrence Test",
    description: "Testing the new recurrence system",
    dueDate: "2025-12-08", // Updated to future date
    dueTime: "09:00",
    statusId: 1,
    priorityId: 3,
    isRecurring: true,
    recurrence: {
      recurrenceType: "WEEKLY",
      endDate: "2026-06-30", // Updated to future date
      weeklyRule: {
        recurEveryNWeeks: 1,
        daysOfWeek: {
          sunday: true
        }
      }
    }
  };

  try {
    console.log('Creating task with weekly recurrence...');
    const result = await makeRequest('POST', '/tasks', taskWithRecurrence);
    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    
    if (result.status === 201 || result.status === 200) {
      console.log('✅ Recurrence task creation successful!');
    } else {
      console.log('❌ Recurrence task creation failed');
    }
  } catch (error) {
    console.error('❌ Connection error:', error.message);
  }
}

async function runDiagnostics() {
  console.log('🔧 Task Manager API Diagnostics\n');
  console.log('='.repeat(50));
  
  // First, test system routes (no auth required)
  const systemWorking = await testSystemRoutes();
  
  if (!systemWorking) {
    console.log('\n❌ System routes not working. Check server and database connection.');
    return;
  }

  // Then, try to authenticate
  const loginSuccess = await testLogin();
  
  if (!loginSuccess) {
    console.log('\n❌ Cannot proceed with task operations without authentication');
    console.log('But system routes are working, so server and database are running');
    return;
  }

  const taskId = await testBasicTaskCreation();
  await testGetTasks();
  
  if (taskId) {
    await testWithRecurrence();
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 Diagnostics completed');
}

if (require.main === module) {
  runDiagnostics();
}

module.exports = { runDiagnostics, testBasicTaskCreation, testGetTasks, testWithRecurrence, testLogin, testSystemRoutes };