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
      const existing = await prisma.taskstatus.count({
        where: { StatusName: status.StatusName }
      });
      
      if (existing === 0) {
        await prisma.taskstatus.create({
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
      const existing = await prisma.taskpriority.count({
        where: { PriorityName: priority.PriorityName }
      });
      
      if (existing === 0) {
        await prisma.taskpriority.create({
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
      const existing = await prisma.escalationrules.count({
        where: { Name: rule.Name }
      });
      
      if (existing === 0) {
      await prisma.escalationrules.create({
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
  const statuses = await prisma.taskstatus.findMany({
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
    const statuses = await prisma.taskstatus.findMany({
      orderBy: { Id: 'asc' }
    });
    return statuses.map(status => ({
      Id: Number(status.Id),
      StatusName: status.StatusName
    }));
  }

  // First check if this is a sequential task type (has TaskTypeStatus records)
  const taskTypeStatuses = await prisma.tasktypestatuses.findMany({
    where: { TaskTypeId: taskTypeId },
    include: {
      taskstatus: true
    },
    orderBy: {
      OrderIndex: 'asc'
    }
  });

  if (taskTypeStatuses.length > 0) {
    // Sequential task type - return statuses in order
    return taskTypeStatuses.map(tts => ({
      Id: Number(tts.taskstatus.Id),
      StatusName: tts.taskstatus.StatusName
    }));
  }

  // Check if this is a random task type (has StatusTransitionRule records)
  const transitionRules = await prisma.statustransitionrules.findMany({
    where: { TaskTypeId: taskTypeId },
    include: {
      taskstatus_statustransitionrules_FromStatusIdTotaskstatus: true,
      taskstatus_statustransitionrules_ToStatusIdTotaskstatus: true
    }
  });

  if (transitionRules.length > 0) {
    // Random task type - collect all unique statuses from transition rules
    const statusMap = new Map();

    transitionRules.forEach(rule => {
      statusMap.set(rule.taskstatus_statustransitionrules_FromStatusIdTotaskstatus.Id, rule.taskstatus_statustransitionrules_FromStatusIdTotaskstatus);
      statusMap.set(rule.taskstatus_statustransitionrules_ToStatusIdTotaskstatus.Id, rule.taskstatus_statustransitionrules_ToStatusIdTotaskstatus);
    });

    return Array.from(statusMap.values())
      .sort((a, b) => Number(a.Id) - Number(b.Id))
      .map(status => ({
        Id: Number(status.Id),
        StatusName: status.StatusName
      }));
  }

  // Fallback: return all statuses if no specific configuration found
  const statuses = await prisma.taskstatus.findMany({
    orderBy: { Id: 'asc' }
  });
  return statuses.map(status => ({
    Id: Number(status.Id),
    StatusName: status.StatusName
  }));
}

/**
 * Create a new task status
 */
export async function createTaskStatus(statusName: string): Promise<number> {
  const status = await prisma.taskstatus.create({
    data: { StatusName: statusName }
  });
  return Number(status.Id);
}

/**
 * Get all task priorities
 */
export async function getTaskPriorities(): Promise<any[]> {
  const priorities = await prisma.taskpriority.findMany({
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
  const priority = await prisma.taskpriority.create({
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

  const assignees = await prisma.assignees.findMany({
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
  const groups = await prisma.groupmaster.findMany({
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
  const assignee = await prisma.assignees.create({
    data: { Name: name, Email: email, Phone: phone }
  });
  return Number(assignee.Id);
}

/**
 * Create a new group
 */
export async function createGroup(groupName: string, parentId?: number): Promise<number> {
  const group = await prisma.groupmaster.create({
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
  await prisma.usergroupmembers.upsert({
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
  await prisma.usergroupmembers.delete({
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
  const members = await prisma.usergroupmembers.findMany({
    where: { GroupId: BigInt(groupId) },
    include: { assignees: true },
    orderBy: { assignees: { Name: 'asc' } }
  });
  return members.map(member => ({
    Id: Number(member.assignees.Id),
    Name: member.assignees.Name,
    Email: member.assignees.Email,
    Phone: member.assignees.Phone
  }));
}

/**
 * Assign admin role to a user (used during system initialization)
 */
export async function assignAdminRoleToUser(userId: number): Promise<void> {
  try {
    const adminRole = await prisma.roles.findFirst({
      where: { Name: 'Administrator' }
    });

    if (adminRole) {
      await prisma.userroles.upsert({
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

