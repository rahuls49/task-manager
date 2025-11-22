const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const { PrismaClient } = require(path.join(__dirname, 'backend', 'node_modules', '@prisma', 'client'));

async function checkTask() {
  const prisma = new PrismaClient();

  try {
    const task = await prisma.task.findFirst({ where: { Id: 58 } });
    console.log('Raw DB task:', {
      DueTime: task.DueTime,
      StartTime: task.StartTime,
      DueTimeType: typeof task.DueTime,
      StartTimeType: typeof task.StartTime,
      DueTimeConstructor: task.DueTime?.constructor?.name,
      StartTimeConstructor: task.StartTime?.constructor?.name
    });
  } finally {
    await prisma.$disconnect();
  }
}

checkTask();