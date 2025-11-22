async function testTimezoneConversion() {
  try {
    console.log('🧪 Testing timezone conversion...\n');

    // First login to get token
    const loginResponse = await fetch('http://localhost:5000/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        emailOrPhone: 'rahul@example.com',
        password: 'password'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login successful');

    // Test data: IST time that should be converted to UTC for storage
    const testTask = {
      title: 'Timezone Test Task',
      description: 'Testing IST to UTC conversion',
      dueDate: '2025-11-21', // Today
      dueTime: '15:30:00',   // 3:30 PM IST
      startDate: '2025-11-21',
      startTime: '14:00:00', // 2:00 PM IST
      statusId: 1,
      priorityId: 1
    };

    console.log('📤 Creating task with IST times:', {
      dueTime: testTask.dueTime,
      startTime: testTask.startTime
    });

    // Create task
    const createResponse = await fetch('http://localhost:5000/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testTask)
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      throw new Error(`Task creation failed: ${createResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const createData = await createResponse.json();
    console.log('📄 Create response:', JSON.stringify(createData, null, 2));
    const taskId = createData.data?.Id;

    console.log('✅ Task created with ID:', taskId);

    // Get task back
    const getResponse = await fetch(`http://localhost:5000/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('📡 GET response status:', getResponse.status);
    console.log('📡 GET response headers:', Object.fromEntries(getResponse.headers.entries()));

    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      console.log('❌ GET response error:', errorText);
      throw new Error(`Task retrieval failed: ${getResponse.status} - ${errorText}`);
    }

    const task = await getResponse.json();
    console.log('📄 GET response data:', JSON.stringify(task, null, 2));

    console.log('📥 Retrieved task times (should be IST):', {
      dueTime: task.data.DueTime,
      startTime: task.data.StartTime
    });

    // Expected: 15:30:00 and 14:00:00 (same as input since we're in IST timezone)
    // In UTC, 15:30 IST would be 10:00 UTC, but we should get back 15:30 IST

    if (task.data.DueTime === '15:30:00' && task.data.StartTime === '14:00:00') {
      console.log('✅ Timezone conversion working correctly!');
    } else {
      console.log('❌ Timezone conversion failed. Expected 15:30:00/14:00:00, got', task.data.DueTime, task.data.StartTime);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testTimezoneConversion();