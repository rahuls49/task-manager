async function testUpdateTask() {
  try {
    console.log('🧪 Testing Task Update with Date/Time Fields\n');

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

    // First create a task
    const createResponse = await fetch('http://localhost:5000/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Test Update Task',
        description: 'Testing update functionality',
        priorityId: 2
      })
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      throw new Error(`Task creation failed: ${createResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const createData = await createResponse.json();
    const taskId = createData.data.Id;
    console.log('✅ Task created with ID:', taskId);

    // Now update the task with date/time fields
    const updateResponse = await fetch(`http://localhost:5000/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        startDate: '2025-11-10',
        startTime: '10:30',
        dueDate: '2025-11-15',
        dueTime: '17:00'
      })
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      throw new Error(`Task update failed: ${updateResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const updateData = await updateResponse.json();
    console.log('✅ Task updated successfully');

    // Verify the date/time fields are properly set
    const task = updateData.data;
    if (task.StartDate === '2025-11-10' && task.StartTime === '10:30:00' &&
        task.DueDate === '2025-11-15' && task.DueTime === '17:00:00') {
      console.log('✅ Date/Time fields are correctly saved and returned');
    } else {
      console.log('❌ Date/Time fields mismatch:');
      console.log('Expected: StartDate=2025-11-10, StartTime=10:30:00, DueDate=2025-11-15, DueTime=17:00:00');
      console.log('Actual:', { StartDate: task.StartDate, StartTime: task.StartTime, DueDate: task.DueDate, DueTime: task.DueTime });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testUpdateTask();