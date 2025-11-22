const { PrismaClient } = require('@prisma/client');

async function checkTask() {
  const prisma = new PrismaClient();

  try {
    const task = await prisma.task.findFirst({ where: { Id: 80 } });
    console.log('Raw DB task:');
    console.log('DueTime:', task.DueTime, 'Type:', typeof task.DueTime, 'ISOString:', task.DueTime?.toISOString?.());
    console.log('StartTime:', task.StartTime, 'Type:', typeof task.StartTime, 'ISOString:', task.StartTime?.toISOString?.());
    console.log('DueTime instanceof Date:', task.DueTime instanceof Date);
    console.log('StartTime instanceof Date:', task.StartTime instanceof Date);
  } finally {
    await prisma.$disconnect();
  }
}

checkTask().catch(console.error);