require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database with initial data...');

    // Insert default task statuses
    await prisma.taskStatus.createMany({
      data: [
        { Id: 1, StatusName: 'To Do' },
        { Id: 2, StatusName: 'In Progress' },
        { Id: 3, StatusName: 'Completed' },
        { Id: 4, StatusName: 'Blocked' },
        { Id: 5, StatusName: 'Cancelled' },
        { Id: 6, StatusName: 'On Hold' },
        { Id: 7, StatusName: 'Under Review' }
      ],
      skipDuplicates: true
    });

    // Insert default task priorities
    await prisma.taskPriority.createMany({
      data: [
        { Id: 1, PriorityName: 'Low' },
        { Id: 2, PriorityName: 'Medium' },
        { Id: 3, PriorityName: 'High' },
        { Id: 4, PriorityName: 'Critical' },
        { Id: 5, PriorityName: 'Urgent' }
      ],
      skipDuplicates: true
    });

    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();