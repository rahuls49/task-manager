import { Request, Response, NextFunction } from "express";
import * as taskInit from "./task.init";

// ============================================================================
// SYSTEM INITIALIZATION
// ============================================================================

export async function initializeSystem(req: Request, res: Response, next: NextFunction) {
  try {
    await taskInit.initializeTaskSystem();
    
    return res.json({
      success: true,
      message: "Task management system initialized successfully"
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// TASK STATUSES MANAGEMENT
// ============================================================================

export async function getTaskStatuses(req: Request, res: Response, next: NextFunction) {
  try {
    const statuses = await taskInit.getTaskStatuses();
    
    return res.json({
      success: true,
      message: "Task statuses fetched successfully",
      data: statuses
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// TASK PRIORITIES MANAGEMENT
// ============================================================================

export async function getTaskPriorities(req: Request, res: Response, next: NextFunction) {
  try {
    const priorities = await taskInit.getTaskPriorities();
    
    return res.json({
      success: true,
      message: "Task priorities fetched successfully",
      data: priorities
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// ASSIGNEES MANAGEMENT
// ============================================================================

export async function getAssignees(req: Request, res: Response, next: NextFunction) {
  try {
    const assignees = await taskInit.getAssignees();
    
    return res.json({
      success: true,
      message: "Assignees fetched successfully",
      data: assignees
    });
  } catch (error) {
    next(error);
  }
}

export async function createAssignee(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required"
      });
    }
    
    const assigneeId = await taskInit.createAssignee(name, email);
    
    return res.status(201).json({
      success: true,
      message: "Assignee created successfully",
      data: { id: assigneeId, name, email }
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Duplicate entry')) {
      return res.status(400).json({
        success: false,
        message: "Email already exists"
      });
    }
    next(error);
  }
}

// ============================================================================
// GROUPS MANAGEMENT
// ============================================================================

export async function getGroups(req: Request, res: Response, next: NextFunction) {
  try {
    const groups = await taskInit.getGroups();
    
    return res.json({
      success: true,
      message: "Groups fetched successfully",
      data: groups
    });
  } catch (error) {
    next(error);
  }
}

export async function createGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const { groupName, parentId } = req.body;
    
    if (!groupName) {
      return res.status(400).json({
        success: false,
        message: "Group name is required"
      });
    }
    
    const groupId = await taskInit.createGroup(groupName, parentId);
    
    return res.status(201).json({
      success: true,
      message: "Group created successfully",
      data: { groupId, groupName, parentId }
    });
  } catch (error) {
    next(error);
  }
}

export async function getGroupMembers(req: Request, res: Response, next: NextFunction) {
  try {
    const groupId = parseInt(req.params.groupId);
    const members = await taskInit.getGroupMembers(groupId);
    
    return res.json({
      success: true,
      message: "Group members fetched successfully",
      data: members
    });
  } catch (error) {
    next(error);
  }
}

export async function addUserToGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const groupId = parseInt(req.params.groupId);
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }
    
    await taskInit.addUserToGroup(groupId, userId);
    
    return res.json({
      success: true,
      message: "User added to group successfully"
    });
  } catch (error) {
    next(error);
  }
}

export async function removeUserFromGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const groupId = parseInt(req.params.groupId);
    const userId = parseInt(req.params.userId);
    
    await taskInit.removeUserFromGroup(groupId, userId);
    
    return res.json({
      success: true,
      message: "User removed from group successfully"
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================================
// RECURRENCE MANAGEMENT
// ============================================================================

export async function createTaskRecurrence(req: Request, res: Response, next: NextFunction) {
  try {
    const { frequency, interval, endDate, daysOfWeek } = req.body;
    
    if (!frequency || !interval) {
      return res.status(400).json({
        success: false,
        message: "Frequency and interval are required"
      });
    }
    
    const recurrenceId = await taskInit.createTaskRecurrence(
      frequency, 
      interval, 
      endDate, 
      daysOfWeek
    );
    
    return res.status(201).json({
      success: true,
      message: "Task recurrence pattern created successfully",
      data: { id: recurrenceId, frequency, interval, endDate, daysOfWeek }
    });
  } catch (error) {
    next(error);
  }
}