const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend', '.env') });
const { PrismaClient } = require(path.join(__dirname, 'backend', 'node_modules', '@prisma', 'client'));
const bcrypt = require(path.join(__dirname, 'backend', 'node_modules', 'bcrypt'));

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('👤 Creating test user...');

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create test user
    const user = await prisma.assignee.create({
      data: {
        Id: 1,
        Name: 'Test User',
        Email: 'test@example.com',
        Phone: '+1234567890',
        Password: hashedPassword
      }
    });

    console.log('✅ Test user created successfully!');
    console.log('Email: test@example.com');
    console.log('Password: password123');
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();