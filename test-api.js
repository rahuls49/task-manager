// Simple API test to verify the fix

async function testOverdueAPI() {
  try {
    console.log('🧪 Testing Overdue Tasks API\n');

    const response = await fetch('http://localhost:5000/system/tasks/overdue');
    const data = await response.json();

    console.log('📋 API Response:');
    console.log(`   Success: ${data.success}`);
    console.log(`   Message: ${data.message}`);
    console.log(`   Tasks Found: ${data.data ? data.data.length : 0}`);

    if (data.data && data.data.length > 0) {
      console.log('\n📝 Task Details:');
      data.data.forEach((task, index) => {
        console.log(`   Task ${index + 1}:`);
        console.log(`     ID: ${task.Id}`);
        console.log(`     Title: ${task.Title}`);
        console.log(`     DueDate: ${task.DueDate}`);
        console.log(`     DueTime: ${task.DueTime}`);
        
        // Calculate time difference
        const dueDateTime = `${task.DueDate.split('T')[0]} ${task.DueTime}`;
        const dueTime = new Date(dueDateTime + 'Z');
        const now = new Date();
        const diffMinutes = Math.round((dueTime.getTime() - now.getTime()) / 60000);
        
        console.log(`     Time Status: ${diffMinutes > 0 ? `Due in ${diffMinutes} min` : `Overdue by ${Math.abs(diffMinutes)} min`}`);
      });
    } else {
      console.log('\n⚠️  No tasks found. This could mean:');
      console.log('   1. Backend server not restarted after fix');
      console.log('   2. No tasks in database within time window');
      console.log('   3. Configuration issue');
    }

  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. Backend server is running on http://localhost:5000');
    console.log('   2. Backend server has been restarted after the fix');
  }
}

console.log('='.repeat(50));
console.log('   API TESTING');
console.log('='.repeat(50));

testOverdueAPI();