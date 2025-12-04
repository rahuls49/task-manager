/**
 * Database Seeding Script
 *
 * This script populates the database with initial data for the Task Manager application.
 *
 * What it creates:
 * - Task Statuses (9 statuses: To Do, In Progress, Completed, etc.)
 * - Task Priorities (5 levels: Low, Medium, High, Critical, Urgent)
 * - Task Types (5 types with different transition behaviors):
 *   - Sequential types: Development Task, Bug Fix, Meeting
 *   - Random types: Design Review, Research
 * - Task Type Status links (for sequential workflows)
 * - Status Transition Rules (for random workflows)
 * - Assignees (6 sample users with hashed passwords)
 * - Groups (6 groups with hierarchical structure)
 * - User-Group memberships
 *
 * Usage:
 * node seed-db.js
 *
 * Note: Uses skipDuplicates: true to avoid conflicts on re-runs
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database with initial data...');

    // Insert default task statuses
    console.log('📝 Seeding task statuses...');
    await prisma.taskstatus.createMany({
      data: [
        { Id: 1, StatusName: 'To Do' },
        { Id: 2, StatusName: 'In Progress' },
        { Id: 3, StatusName: 'Completed' },
        { Id: 4, StatusName: 'Blocked' },
        { Id: 5, StatusName: 'Cancelled' },
        { Id: 6, StatusName: 'On Hold' },
        { Id: 7, StatusName: 'Under Review' },
        { Id: 8, StatusName: 'Pending Approval' },
        { Id: 9, StatusName: 'Rejected' }
      ],
      skipDuplicates: true
    });

    // Insert default task priorities
    console.log('🎯 Seeding task priorities...');
    await prisma.taskpriority.createMany({
      data: [
        { Id: 1, PriorityName: 'Low' },
        { Id: 2, PriorityName: 'Medium' },
        { Id: 3, PriorityName: 'High' },
        { Id: 4, PriorityName: 'Critical' },
        { Id: 5, PriorityName: 'Urgent' }
      ],
      skipDuplicates: true
    });

    // Insert task types
    console.log('📋 Seeding task types...');
    await prisma.tasktype.createMany({
      data: [
        {
          Id: 1,
          TypeName: 'Development Task',
          Description: 'Software development tasks with sequential workflow',
          TransitionType: 'SEQUENTIAL'
        },
        {
          Id: 2,
          TypeName: 'Bug Fix',
          Description: 'Bug fixing tasks with sequential workflow',
          TransitionType: 'SEQUENTIAL'
        },
        {
          Id: 3,
          TypeName: 'Design Review',
          Description: 'Design review tasks with flexible workflow',
          TransitionType: 'RANDOM'
        },
        {
          Id: 4,
          TypeName: 'Meeting',
          Description: 'Meeting tasks with simple workflow',
          TransitionType: 'SEQUENTIAL'
        },
        {
          Id: 5,
          TypeName: 'Research',
          Description: 'Research tasks with flexible transitions',
          TransitionType: 'RANDOM'
        }
      ],
      skipDuplicates: true
    });

    // Insert task type statuses (for sequential types)
    console.log('🔗 Seeding task type statuses...');

    // Development Task (Sequential): To Do -> In Progress -> Under Review -> Completed
    await prisma.tasktypestatuses.createMany({
      data: [
        { TaskTypeId: 1, StatusId: 1, OrderIndex: 1 }, // To Do
        { TaskTypeId: 1, StatusId: 2, OrderIndex: 2 }, // In Progress
        { TaskTypeId: 1, StatusId: 7, OrderIndex: 3 }, // Under Review
        { TaskTypeId: 1, StatusId: 3, OrderIndex: 4 }, // Completed
      ],
      skipDuplicates: true
    });

    // Bug Fix (Sequential): To Do -> In Progress -> Under Review -> Completed
    await prisma.tasktypestatuses.createMany({
      data: [
        { TaskTypeId: 2, StatusId: 1, OrderIndex: 1 }, // To Do
        { TaskTypeId: 2, StatusId: 2, OrderIndex: 2 }, // In Progress
        { TaskTypeId: 2, StatusId: 7, OrderIndex: 3 }, // Under Review
        { TaskTypeId: 2, StatusId: 3, OrderIndex: 4 }, // Completed
      ],
      skipDuplicates: true
    });

    // Meeting (Sequential): To Do -> In Progress -> Completed
    await prisma.tasktypestatuses.createMany({
      data: [
        { TaskTypeId: 4, StatusId: 1, OrderIndex: 1 }, // To Do
        { TaskTypeId: 4, StatusId: 2, OrderIndex: 2 }, // In Progress
        { TaskTypeId: 4, StatusId: 3, OrderIndex: 3 }, // Completed
      ],
      skipDuplicates: true
    });

    // Insert status transition rules (for random types)
    console.log('🔄 Seeding status transition rules...');

    // Design Review (Random): Flexible transitions
    await prisma.statustransitionrules.createMany({
      data: [
        { TaskTypeId: 3, FromStatusId: 1, ToStatusId: 2 }, // To Do -> In Progress
        { TaskTypeId: 3, FromStatusId: 1, ToStatusId: 8 }, // To Do -> Pending Approval
        { TaskTypeId: 3, FromStatusId: 2, ToStatusId: 7 }, // In Progress -> Under Review
        { TaskTypeId: 3, FromStatusId: 2, ToStatusId: 9 }, // In Progress -> Rejected
        { TaskTypeId: 3, FromStatusId: 7, ToStatusId: 3 }, // Under Review -> Completed
        { TaskTypeId: 3, FromStatusId: 7, ToStatusId: 9 }, // Under Review -> Rejected
        { TaskTypeId: 3, FromStatusId: 8, ToStatusId: 2 }, // Pending Approval -> In Progress
        { TaskTypeId: 3, FromStatusId: 8, ToStatusId: 9 }, // Pending Approval -> Rejected
        { TaskTypeId: 3, FromStatusId: 9, ToStatusId: 1 }, // Rejected -> To Do (restart)
      ],
      skipDuplicates: true
    });

    // Research (Random): Flexible transitions
    await prisma.statustransitionrules.createMany({
      data: [
        { TaskTypeId: 5, FromStatusId: 1, ToStatusId: 2 }, // To Do -> In Progress
        { TaskTypeId: 5, FromStatusId: 1, ToStatusId: 6 }, // To Do -> On Hold
        { TaskTypeId: 5, FromStatusId: 2, ToStatusId: 7 }, // In Progress -> Under Review
        { TaskTypeId: 5, FromStatusId: 2, ToStatusId: 6 }, // In Progress -> On Hold
        { TaskTypeId: 5, FromStatusId: 2, ToStatusId: 3 }, // In Progress -> Completed
        { TaskTypeId: 5, FromStatusId: 6, ToStatusId: 2 }, // On Hold -> In Progress
        { TaskTypeId: 5, FromStatusId: 7, ToStatusId: 3 }, // Under Review -> Completed
        { TaskTypeId: 5, FromStatusId: 7, ToStatusId: 2 }, // Under Review -> In Progress
      ],
      skipDuplicates: true
    });

    // Hash password for users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Insert assignees (users)
    console.log('👥 Seeding assignees...');
    await prisma.assignees.createMany({
      data: [
        {
          Id: 1,
          Name: 'John Doe',
          Email: 'john.doe@company.com',
          Phone: '+1234567890',
          Password: hashedPassword
        },
        {
          Id: 2,
          Name: 'Jane Smith',
          Email: 'jane.smith@company.com',
          Phone: '+1234567891',
          Password: hashedPassword
        },
        {
          Id: 3,
          Name: 'Bob Johnson',
          Email: 'bob.johnson@company.com',
          Phone: '+1234567892',
          Password: hashedPassword
        },
        {
          Id: 4,
          Name: 'Alice Brown',
          Email: 'alice.brown@company.com',
          Phone: '+1234567893',
          Password: hashedPassword
        },
        {
          Id: 5,
          Name: 'Charlie Wilson',
          Email: 'charlie.wilson@company.com',
          Phone: '+1234567894',
          Password: hashedPassword
        },
        {
          Id: 6,
          Name: 'Diana Davis',
          Email: 'diana.davis@company.com',
          Phone: '+1234567895',
          Password: hashedPassword
        }
      ],
      skipDuplicates: true
    });

    // Insert groups
    console.log('👥 Seeding groups...');
    await prisma.groupmaster.createMany({
      data: [
        {
          GroupId: 1,
          GroupName: 'Development Team',
          ParentId: null
        },
        {
          GroupId: 2,
          GroupName: 'QA Team',
          ParentId: null
        },
        {
          GroupId: 3,
          GroupName: 'Design Team',
          ParentId: null
        },
        {
          GroupId: 4,
          GroupName: 'Frontend Developers',
          ParentId: 1
        },
        {
          GroupId: 5,
          GroupName: 'Backend Developers',
          ParentId: 1
        },
        {
          GroupId: 6,
          GroupName: 'DevOps Team',
          ParentId: null
        }
      ],
      skipDuplicates: true
    });

    // Insert user-group memberships
    console.log('🔗 Seeding user-group memberships...');
    await prisma.usergroupmembers.createMany({
      data: [
        // Development Team
        { GroupId: 1, UserId: 1 }, // John Doe
        { GroupId: 1, UserId: 2 }, // Jane Smith
        { GroupId: 1, UserId: 3 }, // Bob Johnson

        // QA Team
        { GroupId: 2, UserId: 4 }, // Alice Brown
        { GroupId: 2, UserId: 5 }, // Charlie Wilson

        // Design Team
        { GroupId: 3, UserId: 6 }, // Diana Davis

        // Frontend Developers (subset of Development Team)
        { GroupId: 4, UserId: 1 }, // John Doe
        { GroupId: 4, UserId: 2 }, // Jane Smith

        // Backend Developers (subset of Development Team)
        { GroupId: 5, UserId: 3 }, // Bob Johnson

        // DevOps Team
        { GroupId: 6, UserId: 3 }, // Bob Johnson
      ],
      skipDuplicates: true
    });

    console.log('✅ Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log('- 9 Task Statuses created');
    console.log('- 5 Task Priorities created');
    console.log('- 5 Task Types created (3 Sequential, 2 Random)');
    console.log('- Task Type Status links created for sequential types');
    console.log('- Status Transition Rules created for random types');
    console.log('- 6 Assignees (users) created');
    console.log('- 6 Groups created (with hierarchy)');
    console.log('- User-Group memberships established');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();