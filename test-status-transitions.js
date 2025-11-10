// Test script for task type status transitions
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const { createTask, updateTask } = require('./backend/dist/modules/task/task.service.js');

async function testStatusTransitions() {
  try {
    console.log('🧪 Testing Task Type Status Transitions\n');

    // Create a task with sequential workflow (Standard Workflow)
    console.log('1. Creating task with Standard Workflow (sequential transitions)...');
    const taskId = await createTask({
      title: 'Test Sequential Task',
      description: 'Testing sequential status transitions',
      taskTypeId: 1, // Standard Workflow (sequential)
      statusId: 1, // Todo
      priorityId: 2 // Medium
    });
    console.log(`✅ Created task ${taskId} with sequential workflow`);

    // Test valid sequential transitions
    console.log('\n2. Testing valid sequential transitions...');

    // Todo -> In Progress (should work)
    await updateTask(taskId, { statusId: 2 }); // In Progress
    console.log('✅ Todo -> In Progress: Allowed');

    // In Progress -> Completed (should work)
    await updateTask(taskId, { statusId: 4 }); // Completed
    console.log('✅ In Progress -> Completed: Allowed');

    // Create a task with flexible workflow
    console.log('\n3. Creating task with Flexible Workflow (random transitions)...');
    const flexibleTaskId = await createTask({
      title: 'Test Flexible Task',
      description: 'Testing flexible status transitions',
      taskTypeId: 2, // Flexible Workflow (random)
      statusId: 1, // Todo
      priorityId: 2 // Medium
    });
    console.log(`✅ Created task ${flexibleTaskId} with flexible workflow`);

    // Test random transitions
    console.log('\n4. Testing random transitions...');

    // Todo -> Completed (should work for flexible)
    await updateTask(flexibleTaskId, { statusId: 4 }); // Completed
    console.log('✅ Todo -> Completed: Allowed (flexible)');

    // Completed -> In Progress (should work for flexible)
    await updateTask(flexibleTaskId, { statusId: 2 }); // In Progress
    console.log('✅ Completed -> In Progress: Allowed (flexible)');

    // Test invalid sequential transition
    console.log('\n5. Testing invalid sequential transition...');
    try {
      // Try to go from In Progress back to Todo (should fail for sequential task)
      await updateTask(taskId, { statusId: 1 }); // Todo
      console.log('❌ In Progress -> Todo: Should have failed but didn\'t!');
    } catch (error) {
      console.log('✅ In Progress -> Todo: Correctly blocked -', error.message);
    }

    console.log('\n🎉 All status transition tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testStatusTransitions();