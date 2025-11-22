require('dotenv').config();
const { createTask, updateTask, getTaskById } = require('./dist/modules/task/task.service.js');

async function run() {
  try {
    console.log('🧪 Testing update task status...');
    const taskId = await createTask({
      title: 'Test Update Task Status',
      description: 'Create then update status',
      statusId: 1, // Todo
      priorityId: 2 // Medium
    });
    console.log('Created task with ID', taskId);
    await updateTask(taskId, { statusId: 2 });
    const updated = await getTaskById(taskId);
    console.log('Updated task status:', updated.status);
    if (updated.status && updated.status.Id === 2) {
      console.log('✅ Status updated correctly');
    } else {
      console.error('❌ Status did not update as expected');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

run();
