// Test script for the configurable scheduler API endpoints

const API_BASE = 'http://localhost:5000';

async function testConfigAPI() {
  try {
    console.log('🧪 Testing Scheduler Configuration API\n');

    // 1. Get current configuration
    console.log('1️⃣ Getting current configuration...');
    const configResponse = await fetch(`${API_BASE}/system/scheduler/config`);
    const configData = await configResponse.json();
    
    if (configData.success) {
      console.log('✅ Current Configuration:');
      console.log(JSON.stringify(configData.data, null, 2));
    } else {
      console.error('❌ Failed to get configuration:', configData.message);
    }

    console.log('\n2️⃣ Testing getDueTasks endpoint...');
    const dueTasksResponse = await fetch(`${API_BASE}/system/tasks/due`);
    const dueTasksData = await dueTasksResponse.json();
    
    if (dueTasksData.success) {
      console.log(`✅ Found ${dueTasksData.data.length} due tasks`);
      if (dueTasksData.data.length > 0) {
        console.log('Sample task:', {
          Id: dueTasksData.data[0].Id,
          Title: dueTasksData.data[0].Title,
          DueDate: dueTasksData.data[0].DueDate,
          DueTime: dueTasksData.data[0].DueTime
        });
      }
    } else {
      console.error('❌ Failed to get due tasks:', dueTasksData.message);
    }

    console.log('\n3️⃣ Testing getOverdueTasks endpoint...');
    const overdueResponse = await fetch(`${API_BASE}/system/tasks/overdue`);
    const overdueData = await overdueResponse.json();
    
    if (overdueData.success) {
      console.log(`✅ Found ${overdueData.data.length} overdue tasks`);
    } else {
      console.error('❌ Failed to get overdue tasks:', overdueData.message);
    }

    console.log('\n4️⃣ Testing configuration update...');
    const updatePayload = {
      dueTimeIntervalValue: 15,
      dueTimeIntervalUnit: 'MINUTE',
      dueTasksWindowValue: 15,
      dueTasksWindowUnit: 'MINUTE',
      maxSchedulingDelayMs: 900000 // 15 minutes in ms
    };

    const updateResponse = await fetch(`${API_BASE}/system/scheduler/config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });

    const updateData = await updateResponse.json();
    
    if (updateData.success) {
      console.log('✅ Configuration updated successfully');
      console.log('Updated values:', updateData.data.updated);
    } else {
      console.error('❌ Failed to update configuration:', updateData.message);
    }

    console.log('\n5️⃣ Verifying updated configuration...');
    const verifyResponse = await fetch(`${API_BASE}/system/scheduler/config`);
    const verifyData = await verifyResponse.json();
    
    if (verifyData.success) {
      console.log('✅ Verified Configuration:');
      console.log(`Due Time Interval: ${verifyData.data.dueTimeInterval.value} ${verifyData.data.dueTimeInterval.unit}`);
      console.log(`Window: ${verifyData.data.schedulerConfig.DUE_TASKS_WINDOW_VALUE} ${verifyData.data.schedulerConfig.DUE_TASKS_WINDOW_UNIT}`);
      console.log(`Max Delay: ${Math.round(verifyData.data.schedulerConfig.MAX_SCHEDULING_DELAY_MS / 60000)} minutes`);
    }

    console.log('\n🎉 All tests completed!');
    console.log('⚠️  Remember to restart your services to apply configuration changes.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure your backend server is running on http://localhost:5000');
  }
}

// Utility function to demonstrate different configuration scenarios
function showConfigExamples() {
  console.log(`
📚 Configuration Examples:

1️⃣ Real-time (2 minutes ahead):
   node config-scheduler.js set 2 MINUTE "*/1 * * * *"

2️⃣ Standard (30 minutes ahead):
   node config-scheduler.js set 30 MINUTE

3️⃣ Planning ahead (1 hour):
   node config-scheduler.js set 1 HOUR

4️⃣ Daily planning (4 hours):
   node config-scheduler.js set 4 HOUR "*/10 * * * *"

5️⃣ Long-term (1 day):
   node config-scheduler.js set 1 DAY "0 */6 * * *"

API Endpoints:
  GET  /system/scheduler/config      - Get current configuration
  PUT  /system/scheduler/config      - Update configuration  
  GET  /system/tasks/due            - Get tasks due within window
  GET  /system/tasks/overdue        - Get overdue/upcoming tasks
`);
}

// Main execution
const [,, command] = process.argv;

switch (command) {
  case 'test':
    testConfigAPI();
    break;
  case 'examples':
    showConfigExamples();
    break;
  default:
    console.log('Usage: node test-config-api.js [test|examples]');
    console.log('  test     - Run API tests');
    console.log('  examples - Show configuration examples');
}