async function testTaskCreation() {
  try {
    console.log('🧪 Testing Task Creation with Date/Time Fields\n');

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
    console.log('✅ Login successful, token:', token.substring(0, 20) + '...');

    // Now create a task with date/time fields
    const taskData = {
      title: 'Test Task with Dates',
      description: 'Testing date/time fields',
      priority: 'HIGH',
      taskTypeId: 1,
      dueDate: '2025-12-31',
      dueTime: '17:00:00',
      startDate: '2025-01-01',
      startTime: '09:00:00'
    };

    const createResponse = await fetch('http://localhost:5000/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      throw new Error(`Task creation failed: ${createResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const createData = await createResponse.json();
    console.log('✅ Task created successfully:', createData);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testTaskCreation();