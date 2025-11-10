require('dotenv').config();
const { createTask, updateTask } = require('./dist/modules/task/task.service.js');

async function testBasicTaskCreation() {
  try {
    console.log('🧪 Testing basic task creation...');
    const taskId = await createTask({
      title: 'Test Basic Task',
      description: 'Testing basic task creation',
      statusId: 1, // Todo
      priorityId: 2 // Medium
    });
    console.log('✅ Basic task created successfully with ID:', taskId);
  } catch (error) {
    console.error('❌ Basic task creation failed:', error.message);
  }
}

testBasicTaskCreation();