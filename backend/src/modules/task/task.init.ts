import prisma from "../../lib/connection";
import { DEFAULT_TASK_STATUSES, DEFAULT_TASK_PRIORITIES } from "./task.constants";
// import { RowDataPacket, ResultSetHeader } from 'mysql2';

/**
 * Initialize task management system with default data
 * This should be run once when setting up the application
 */
export async function initializeTaskSystem(): Promise<void> {
  try {
    console.log('Initializing task management system...');

    await initializeTaskStatuses();
    await initializeTaskPriorities();
    await initializeEscalationRules();

    console.log('Task management system initialized successfully');
  } catch (error) {
    console.error('Error initializing task management system:', error);
    throw error;
  }
}

/**
 * Initialize default task statuses
 */
async function initializeTaskStatuses(): Promise<void> {
  console.log('Setting up default task statuses...');
  
  for (const status of DEFAULT_TASK_STATUSES) {
    try {
      // Check if status already exists
      const existing = await prisma.taskStatus.count({
        where: { StatusName: status.StatusName }
      });
      
      if (existing === 0) {
        await prisma.taskStatus.create({
          data: { StatusName: status.StatusName }
        });
        console.log(`Added status: ${status.StatusName}`);
      }
    } catch (error) {
      console.error(`Error adding status ${status.StatusName}:`, error);
    }
  }
}

/**
 * Initialize default task priorities
 */
async function initializeTaskPriorities(): Promise<void> {
  console.log('Setting up default task priorities...');
  
  for (const priority of DEFAULT_TASK_PRIORITIES) {
    try {
      // Check if priority already exists
      const existing = await prisma.taskPriority.count({
        where: { PriorityName: priority.PriorityName }
      });
      
      if (existing === 0) {
        await prisma.taskPriority.create({
          data: { PriorityName: priority.PriorityName }
        });
        console.log(`Added priority: ${priority.PriorityName}`);
      }
    } catch (error) {
      console.error(`Error adding priority ${priority.PriorityName}:`, error);
    }
  }
}

/**
 * Initialize default escalation rules
 */
async function initializeEscalationRules(): Promise<void> {
  console.log('Setting up default escalation rules...');
  
  const defaultRules = [
    {
      Name: 'Overdue Tasks - 1 Day',
      ConditionType: 'overdue',
      ConditionValue: '1',
      MaxEscalationLevel: 1,
      ActionType: 'notify',
      ActionValue: 'Send notification to manager',
      IsActive: true
    },
    {
      Name: 'Overdue Tasks - 3 Days',
      ConditionType: 'overdue',
      ConditionValue: '3',
      MaxEscalationLevel: 2,
      ActionType: 'notify',
      ActionValue: 'Send notification to senior management',
      IsActive: true
    },
    {
      Name: 'Inactive Tasks - 24 Hours',
      ConditionType: 'inactive',
      ConditionValue: '24',
      MaxEscalationLevel: 1,
      ActionType: 'notify',
      ActionValue: 'Send reminder notification',
      IsActive: true
    }
  ];
  
  for (const rule of defaultRules) {
    try {
      // Check if rule already exists
      const existing = await prisma.escalationRule.count({
        where: { Name: rule.Name }
      });
      
      if (existing === 0) {
        await prisma.escalationRule.create({
          data: {
            Name: rule.Name,
            ConditionType: rule.ConditionType,
            ConditionValue: rule.ConditionValue,
            MaxEscalationLevel: rule.MaxEscalationLevel,
            ActionType: rule.ActionType,
            ActionValue: rule.ActionValue,
            IsActive: rule.IsActive
          }
        });
        console.log(`Added escalation rule: ${rule.Name}`);
      }
    } catch (error) {
      console.error(`Error adding escalation rule ${rule.Name}:`, error);
    }
  }
}

/**
 * Get all task statuses
 */
export async function getTaskStatuses(): Promise<any[]> {
  const statuses = await prisma.taskStatus.findMany({
    orderBy: { Id: 'asc' }
  });
  return statuses.map(status => ({
    Id: Number(status.Id),
    StatusName: status.StatusName
  }));
}

/**
 * Get available statuses for a specific task type
 */
export async function getAvailableStatusesForTaskType(taskTypeId?: number): Promise<any[]> {
  if (!taskTypeId) {
    // Return all global statuses if no task type specified
    const statuses = await prisma.taskStatus.findMany({
      orderBy: { Id: 'asc' }
    });
    return statuses.map(status => ({
      Id: Number(status.Id),
      StatusName: status.StatusName
    }));
  }

  try {
    const taskTypeStatuses = await prisma.taskTypeStatus.findMany({
      where: { TaskTypeId: taskTypeId },
      include: {
        Status: true
      },
      orderBy: {
        OrderIndex: 'asc'
      }
    });

    return taskTypeStatuses.map(tts => ({
      Id: Number(tts.Status.Id),
      StatusName: tts.Status.StatusName
    }));
  } catch (error) {
    console.error('Error getting task type statuses:', error);
    // Fallback to all statuses
    const statuses = await prisma.taskStatus.findMany({
      orderBy: { Id: 'asc' }
    });
    return statuses.map(status => ({
      Id: Number(status.Id),
      StatusName: status.StatusName
    }));
  }
}

/**
 * Create a new task status
 */
export async function createTaskStatus(statusName: string): Promise<number> {
  const status = await prisma.taskStatus.create({
    data: { StatusName: statusName }
  });
  return Number(status.Id);
}

/**
 * Get all task priorities
 */
export async function getTaskPriorities(): Promise<any[]> {
  const priorities = await prisma.taskPriority.findMany({
    orderBy: { Id: 'asc' }
  });
  return priorities.map(priority => ({
    Id: Number(priority.Id),
    PriorityName: priority.PriorityName
  }));
}

/**
 * Create a new task priority
 */
export async function createTaskPriority(priorityName: string): Promise<number> {
  const priority = await prisma.taskPriority.create({
    data: { PriorityName: priorityName }
  });
  return Number(priority.Id);
}

/**
 * Get all assignees or search by name/email
 */
export async function getAssignees(search?: string): Promise<any[]> {
  const whereClause = search ? {
    OR: [
      { Name: { contains: search } },
      { Email: { contains: search } }
    ]
  } : {};

  const assignees = await prisma.assignee.findMany({
    where: whereClause,
    orderBy: { Name: 'asc' }
  });
  return assignees.map(assignee => ({
    Id: Number(assignee.Id),
    Name: assignee.Name,
    Email: assignee.Email,
    Phone: assignee.Phone
  }));
}

/**
 * Get all groups
 */
export async function getGroups(): Promise<any[]> {
  const groups = await prisma.groupMaster.findMany({
    orderBy: { GroupName: 'asc' }
  });
  return groups.map(group => ({
    Id: Number(group.GroupId),
    GroupName: group.GroupName,
    ParentId: group.ParentId ? Number(group.ParentId) : null
  }));
}

/**
 * Create a new assignee
 */
export async function createAssignee(name: string, email: string, phone: string): Promise<number> {
  const assignee = await prisma.assignee.create({
    data: { Name: name, Email: email, Phone: phone }
  });
  return Number(assignee.Id);
}

/**
 * Create a new group
 */
export async function createGroup(groupName: string, parentId?: number): Promise<number> {
  const group = await prisma.groupMaster.create({
    data: { 
      GroupName: groupName, 
      ParentId: parentId ? BigInt(parentId) : null 
    }
  });
  return Number(group.GroupId);
}

/**
 * Add user to group
 */
export async function addUserToGroup(groupId: number, userId: number): Promise<void> {
  await prisma.userGroupMember.upsert({
    where: {
      GroupId_UserId: {
        GroupId: BigInt(groupId),
        UserId: BigInt(userId)
      }
    },
    update: {},
    create: {
      GroupId: BigInt(groupId),
      UserId: BigInt(userId)
    }
  });
}

/**
 * Remove user from group
 */
export async function removeUserFromGroup(groupId: number, userId: number): Promise<void> {
  await prisma.userGroupMember.delete({
    where: {
      GroupId_UserId: {
        GroupId: BigInt(groupId),
        UserId: BigInt(userId)
      }
    }
  });
}

/**
 * Get group members
 */
export async function getGroupMembers(groupId: number): Promise<any[]> {
  const members = await prisma.userGroupMember.findMany({
    where: { GroupId: BigInt(groupId) },
    include: { User: true },
    orderBy: { User: { Name: 'asc' } }
  });
  return members.map(member => ({
    Id: Number(member.User.Id),
    Name: member.User.Name,
    Email: member.User.Email,
    Phone: member.User.Phone
  }));
}

/**
 * Assign admin role to a user (used during system initialization)
 */
export async function assignAdminRoleToUser(userId: number): Promise<void> {
  try {
    const adminRole = await prisma.role.findFirst({
      where: { Name: 'Administrator' }
    });

    if (adminRole) {
      await prisma.userRole.upsert({
        where: {
          UserId_RoleId: {
            UserId: BigInt(userId),
            RoleId: BigInt(adminRole.Id)
          }
        },
        update: {},
        create: {
          UserId: BigInt(userId),
          RoleId: BigInt(adminRole.Id)
        }
      });
      console.log(`✅ Admin role assigned to user ${userId}`);
    } else {
      console.error('❌ Admin role not found');
    }
  } catch (error) {
    console.error('Error assigning admin role:', error);
    throw error;
  }
}

