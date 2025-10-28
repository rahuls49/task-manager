const API_BASE = 'http://localhost:3001/api/tasks';

// Test examples for the new recurrence API

// Example 1: Create a task that runs every Sunday weekly
async function createWeeklySundayTask() {
  const taskData = {
    title: "Weekly Planning Session",
    description: "Plan the upcoming week's tasks and priorities",
    dueDate: "2024-12-08", // Next Sunday
    dueTime: "09:00",
    statusId: 1,
    priorityId: 3,
    assigneeIds: [1],
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
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });
    
    const result = await response.json();
    console.log('Weekly Sunday Task:', result);
    return result;
  } catch (error) {
    console.error('Error creating weekly Sunday task:', error);
  }
}

// Example 2: Create a task that runs on 1st and 3rd Monday of every month
async function createFirstThirdMondayTask() {
  const taskData = {
    title: "Monthly Team Review",
    description: "Review team performance and plan improvements",
    dueDate: "2024-12-02", // First Monday of December
    dueTime: "14:00",
    statusId: 1,
    priorityId: 2,
    groupIds: [1],
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
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });
    
    const result = await response.json();
    console.log('First & Third Monday Task:', result);
    return result;
  } catch (error) {
    console.error('Error creating first & third Monday task:', error);
  }
}

// Example 3: Create a task that runs on 2nd, 5th, 10th, and 28th of every month
async function createSpecificDaysTask() {
  const taskData = {
    title: "Monthly Reporting",
    description: "Generate and submit monthly reports",
    dueDate: "2024-12-02",
    dueTime: "17:00",
    statusId: 1,
    priorityId: 3,
    assigneeIds: [2, 3],
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
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });
    
    const result = await response.json();
    console.log('Specific Days Task:', result);
    return result;
  } catch (error) {
    console.error('Error creating specific days task:', error);
  }
}

// Example 4: Create a daily task that runs every 2 days
async function createEveryTwoDaysTask() {
  const taskData = {
    title: "Database Backup",
    description: "Perform automated database backup",
    dueDate: "2024-12-01",
    dueTime: "02:00",
    statusId: 1,
    priorityId: 4,
    assigneeIds: [1],
    isRecurring: true,
    recurrence: {
      recurrenceType: "DAILY",
      dailyRule: {
        recurEveryXDays: 2
      }
    }
  };

  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });
    
    const result = await response.json();
    console.log('Every 2 Days Task:', result);
    return result;
  } catch (error) {
    console.error('Error creating every 2 days task:', error);
  }
}

// Example 5: Create a task for last Friday of specific months (quarterly)
async function createQuarterlyTask() {
  const taskData = {
    title: "Quarterly Business Review",
    description: "Review quarterly performance and plan next quarter",
    dueDate: "2024-12-27", // Last Friday of December
    dueTime: "15:00",
    statusId: 1,
    priorityId: 5,
    groupIds: [1, 2],
    isRecurring: true,
    recurrence: {
      recurrenceType: "MONTHLY",
      monthlyRule: {
        ruleType: "BY_ORDINAL_DAY_OF_WEEK",
        months: [3, 6, 9, 12], // March, June, September, December
        ordinals: [
          {
            ordinal: "LAST",
            dayOfWeek: "FRIDAY"
          }
        ]
      }
    }
  };

  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });
    
    const result = await response.json();
    console.log('Quarterly Task:', result);
    return result;
  } catch (error) {
    console.error('Error creating quarterly task:', error);
  }
}

// Example 6: Update a task's recurrence pattern
async function updateTaskRecurrence(taskId) {
  const updateData = {
    recurrence: {
      recurrenceType: "WEEKLY",
      weeklyRule: {
        recurEveryNWeeks: 2, // Change to bi-weekly
        daysOfWeek: {
          monday: true,
          wednesday: true,
          friday: true
        }
      }
    }
  };

  try {
    const response = await fetch(`${API_BASE}/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    
    const result = await response.json();
    console.log('Updated Task Recurrence:', result);
    return result;
  } catch (error) {
    console.error('Error updating task recurrence:', error);
  }
}

// Example 7: Create a standalone recurrence rule
async function createStandaloneRecurrence() {
  const recurrenceData = {
    recurrenceType: "MONTHLY",
    endDate: "2025-12-31",
    monthlyRule: {
      ruleType: "BY_DAY_OF_MONTH",
      dayNumbers: ["1", "15", "L"] // 1st, 15th, and last day of month
    }
  };

  try {
    const response = await fetch(`${API_BASE}/recurrence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(recurrenceData)
    });
    
    const result = await response.json();
    console.log('Standalone Recurrence Rule:', result);
    return result;
  } catch (error) {
    console.error('Error creating standalone recurrence:', error);
  }
}

// Run all examples
async function runAllExamples() {
  console.log('=== Testing New Recurrence API ===\n');
  
  console.log('1. Creating weekly Sunday task...');
  await createWeeklySundayTask();
  
  console.log('\n2. Creating first & third Monday task...');
  await createFirstThirdMondayTask();
  
  console.log('\n3. Creating specific days task...');
  await createSpecificDaysTask();
  
  console.log('\n4. Creating every 2 days task...');
  await createEveryTwoDaysTask();
  
  console.log('\n5. Creating quarterly task...');
  await createQuarterlyTask();
  
  console.log('\n6. Creating standalone recurrence rule...');
  await createStandaloneRecurrence();
  
  console.log('\n=== All examples completed ===');
}

// Export functions for use
module.exports = {
  createWeeklySundayTask,
  createFirstThirdMondayTask,
  createSpecificDaysTask,
  createEveryTwoDaysTask,
  createQuarterlyTask,
  updateTaskRecurrence,
  createStandaloneRecurrence,
  runAllExamples
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}