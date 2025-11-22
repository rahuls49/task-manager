const http = require('http');

const API_BASE = 'http://localhost:3001';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
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

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testCreateTaskWithRecurrence() {
  console.log('Testing task creation with new recurrence system...\n');

  // Test 1: Weekly task (every Sunday)
  console.log('1. Creating weekly Sunday task...');
  const weeklyTask = {
    title: "Weekly Planning Session",
    description: "Plan the upcoming week's tasks and priorities",
    dueDate: "2024-12-08",
    dueTime: "09:00",
    statusId: 1,
    priorityId: 3,
    isRecurring: true,
    recurrence: {
      recurrenceType: "WEEKLY",
      endDate: "2025-12-31",
      weeklyRule: {
        recurEveryNWeeks: 1,
        daysOfWeek: {
          sunday: true
        }
      }
    }
  };

  try {
    const result1 = await makeRequest('POST', '/api/tasks', weeklyTask);
    console.log('Status:', result1.status);
    console.log('Response:', JSON.stringify(result1.data, null, 2));
    console.log('---\n');
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Test 2: Monthly task (first and third Monday)
  console.log('2. Creating first & third Monday monthly task...');
  const monthlyTask = {
    title: "Monthly Team Review",
    description: "Review team performance and plan improvements",
    dueDate: "2024-12-02",
    dueTime: "14:00",
    statusId: 1,
    priorityId: 2,
    isRecurring: true,
    recurrence: {
      recurrenceType: "MONTHLY",
      monthlyRule: {
        ruleType: "BY_ORDINAL_DAY_OF_WEEK",
        ordinals: [
          {
            ordinal: "FIRST",
            dayOfWeek: "MONDAY"
          },
          {
            ordinal: "THIRD",
            dayOfWeek: "MONDAY"
          }
        ]
      }
    }
  };

  try {
    const result2 = await makeRequest('POST', '/api/tasks', monthlyTask);
    console.log('Status:', result2.status);
    console.log('Response:', JSON.stringify(result2.data, null, 2));
    console.log('---\n');
  } catch (error) {
    console.error('Error:', error.message);
  }

  // Test 3: Monthly task (specific days)
  console.log('3. Creating monthly task for specific days...');
  const specificDaysTask = {
    title: "Monthly Reporting",
    description: "Generate and submit monthly reports",
    dueDate: "2024-12-02",
    dueTime: "17:00",
    statusId: 1,
    priorityId: 3,
    isRecurring: true,
    recurrence: {
      recurrenceType: "MONTHLY",
      monthlyRule: {
        ruleType: "BY_DAY_OF_MONTH",
        dayNumbers: ["2", "5", "10", "28"]
      }
    }
  };

  try {
    const result3 = await makeRequest('POST', '/api/tasks', specificDaysTask);
    console.log('Status:', result3.status);
    console.log('Response:', JSON.stringify(result3.data, null, 2));
    console.log('---\n');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function testRecurrenceValidation() {
  console.log('Testing recurrence validation...\n');

  // Test invalid recurrence (no days selected for weekly)
  console.log('4. Testing invalid weekly recurrence (no days selected)...');
  const invalidTask = {
    title: "Invalid Weekly Task",
    description: "This should fail validation",
    dueDate: "2024-12-02",
    dueTime: "10:00",
    statusId: 1,
    priorityId: 1,
    isRecurring: true,
    recurrence: {
      recurrenceType: "WEEKLY",
      weeklyRule: {
        recurEveryNWeeks: 1,
        daysOfWeek: {} // No days selected
      }
    }
  };

  try {
    const result = await makeRequest('POST', '/api/tasks', invalidTask);
    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    console.log('---\n');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function testStandaloneRecurrence() {
  console.log('Testing standalone recurrence creation...\n');

  console.log('5. Creating standalone recurrence rule...');
  const recurrenceRule = {
    recurrenceType: "MONTHLY",
    endDate: "2025-12-31",
    monthlyRule: {
      ruleType: "BY_DAY_OF_MONTH",
      dayNumbers: ["1", "15", "L"]
    }
  };

  try {
    const result = await makeRequest('POST', '/api/tasks/recurrence', recurrenceRule);
    console.log('Status:', result.status);
    console.log('Response:', JSON.stringify(result.data, null, 2));
    console.log('---\n');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

async function runTests() {
  console.log('=== New Recurrence System API Tests ===\n');
  
  await testCreateTaskWithRecurrence();
  await testRecurrenceValidation();
  await testStandaloneRecurrence();
  
  // Optional: test rescheduler-created task instance is not recurring
  if (require.main === module) {
    console.log('\n6. Testing scheduler-created instance (rescheduler) is not recurring...');
    const reschedulerTest = require('./test-rescheduler-execution.js');
    // run test script that directly uses rescheduler lib to create an instance
    // Note: This requires your DB to be configured and dependencies installed.
  }
  
  console.log('=== All tests completed ===');
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests, testCreateTaskWithRecurrence, testRecurrenceValidation, testStandaloneRecurrence };