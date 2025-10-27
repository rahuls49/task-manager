import pool from "../../lib/connection";
import { DEFAULT_TASK_STATUSES, DEFAULT_TASK_PRIORITIES } from "./task.constants";
import { RowDataPacket, ResultSetHeader } from 'mysql2';

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
      const [existing] = await pool.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM TaskStatus WHERE StatusName = ?',
        [status.StatusName]
      );
      
      if (existing[0].count === 0) {
        await pool.execute<ResultSetHeader>(
          'INSERT INTO TaskStatus (StatusName) VALUES (?)',
          [status.StatusName]
        );
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
      const [existing] = await pool.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM TaskPriority WHERE PriorityName = ?',
        [priority.PriorityName]
      );
      
      if (existing[0].count === 0) {
        await pool.execute<ResultSetHeader>(
          'INSERT INTO TaskPriority (PriorityName) VALUES (?)',
          [priority.PriorityName]
        );
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
      const [existing] = await pool.execute<RowDataPacket[]>(
        'SELECT COUNT(*) as count FROM EscalationRules WHERE Name = ?',
        [rule.Name]
      );
      
      if (existing[0].count === 0) {
        await pool.execute<ResultSetHeader>(
          `INSERT INTO EscalationRules 
           (Name, ConditionType, ConditionValue, MaxEscalationLevel, ActionType, ActionValue, IsActive) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [rule.Name, rule.ConditionType, rule.ConditionValue, rule.MaxEscalationLevel, 
           rule.ActionType, rule.ActionValue, rule.IsActive]
        );
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
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM TaskStatus ORDER BY Id');
  return rows;
}

/**
 * Create a new task status
 */
export async function createTaskStatus(statusName: string): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO TaskStatus (StatusName) VALUES (?)',
    [statusName]
  );
  return result.insertId;
}

/**
 * Get all task priorities
 */
export async function getTaskPriorities(): Promise<any[]> {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM TaskPriority ORDER BY Id');
  return rows;
}

/**
 * Create a new task priority
 */
export async function createTaskPriority(priorityName: string): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO TaskPriority (PriorityName) VALUES (?)',
    [priorityName]
  );
  return result.insertId;
}

/**
 * Get all assignees
 */
export async function getAssignees(): Promise<any[]> {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM Assignees ORDER BY Name');
  return rows;
}

/**
 * Get all groups
 */
export async function getGroups(): Promise<any[]> {
  const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM GroupMaster ORDER BY GroupName');
  return rows;
}

/**
 * Create a new assignee
 */
export async function createAssignee(name: string, email: string, phone: string): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO Assignees (Name, Email, Phone) VALUES (?, ?, ?)',
    [name, email, phone]
  );
  return result.insertId;
}

/**
 * Create a new group
 */
export async function createGroup(groupName: string, parentId?: number): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO GroupMaster (GroupName, ParentId) VALUES (?, ?)',
    [groupName, parentId || null]
  );
  return result.insertId;
}

/**
 * Add user to group
 */
export async function addUserToGroup(groupId: number, userId: number): Promise<void> {
  await pool.execute<ResultSetHeader>(
    'INSERT INTO UserGroupMembers (GroupId, UserId) VALUES (?, ?) ON DUPLICATE KEY UPDATE GroupId = GroupId',
    [groupId, userId]
  );
}

/**
 * Remove user from group
 */
export async function removeUserFromGroup(groupId: number, userId: number): Promise<void> {
  await pool.execute<ResultSetHeader>(
    'DELETE FROM UserGroupMembers WHERE GroupId = ? AND UserId = ?',
    [groupId, userId]
  );
}

/**
 * Get group members
 */
export async function getGroupMembers(groupId: number): Promise<any[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT a.* FROM Assignees a 
     INNER JOIN UserGroupMembers ugm ON a.Id = ugm.UserId 
     WHERE ugm.GroupId = ? 
     ORDER BY a.Name`,
    [groupId]
  );
  return rows;
}

/**
 * Create task recurrence pattern
 */
export async function createTaskRecurrence(
  frequency: string, 
  interval: number, 
  endDate?: string, 
  daysOfWeek?: string
): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO TaskRecurrence (Frequency, RecurrenceInterval, EndDate, DaysOfWeek) VALUES (?, ?, ?, ?)',
    [frequency, interval, endDate || null, daysOfWeek || null]
  );
  return result.insertId;
}