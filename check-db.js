const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const { PrismaClient } = require(path.join(__dirname, 'backend', 'node_modules', '@prisma', 'client'));

const prisma = new PrismaClient();

async function checkAndInsertStatuses() {
  try {
    console.log('🔍 Checking existing statuses...');

    const existingStatuses = await prisma.taskStatus.findMany();
    console.log(`Found ${existingStatuses.length} statuses`);

    if (existingStatuses.length === 0) {
      console.log('📝 Inserting default statuses...');

      await prisma.taskStatus.createMany({
        data: [
          { Id: 1, StatusName: 'To Do' },
          { Id: 2, StatusName: 'In Progress' },
          { Id: 3, StatusName: 'Completed' },
          { Id: 4, StatusName: 'Blocked' },
          { Id: 5, StatusName: 'Cancelled' },
          { Id: 6, StatusName: 'On Hold' },
          { Id: 7, StatusName: 'Under Review' }
        ]
      });

      console.log('✅ Statuses inserted successfully!');
    }

    const existingPriorities = await prisma.taskPriority.findMany();
    console.log(`Found ${existingPriorities.length} priorities`);

    if (existingPriorities.length === 0) {
      console.log('📝 Inserting default priorities...');

      await prisma.taskPriority.createMany({
        data: [
          { Id: 1, PriorityName: 'Low' },
          { Id: 2, PriorityName: 'Medium' },
          { Id: 3, PriorityName: 'High' },
          { Id: 4, PriorityName: 'Critical' },
          { Id: 5, PriorityName: 'Urgent' }
        ]
      });

      console.log('✅ Priorities inserted successfully!');
    }

    // Check final state
    const finalStatuses = await prisma.taskStatus.findMany();
    const finalPriorities = await prisma.taskPriority.findMany();

    console.log(`\n📊 Final state:`);
    console.log(`Statuses: ${finalStatuses.length}`);
    console.log(`Priorities: ${finalPriorities.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndInsertStatuses();