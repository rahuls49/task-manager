import { initializeDefaultTaskTypes } from '../modules/task/task-type.service';
import prisma from '../lib/connection';

async function initializeTaskTypes() {
  try {
    console.log('🚀 Initializing task types and status transitions...');

    // Check if task types already exist
    const existingTypes = await prisma.tasktype.count();
    if (existingTypes > 0) {
      console.log('Task types already exist, skipping creation...');
      return;
    }

    await initializeDefaultTaskTypes();
    console.log('✅ Task types and status transitions initialized successfully!');
  } catch (error) {
    console.error('❌ Failed to initialize task types:', error);
    process.exit(1);
  }
}

// Run the initialization
initializeTaskTypes();