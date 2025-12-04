import { PrismaClient } from '@task-manager/prisma-client';

const prisma = new PrismaClient();

export async function createRecurrenceInstance(originalTaskId: string): Promise<string> {
  // Fetch the original task with related data
  const originalTask = await prisma.tasks.findUnique({
    where: { Id: BigInt(originalTaskId) },
    include: {
      taskassignees: true,
      apiActionDefinitions: true,
      other_tasks: { // subtasks
        include: {
          taskassignees: true,
          apiActionDefinitions: true,
        },
      },
    },
  });

  if (!originalTask) {
    throw new Error(`Task with ID ${originalTaskId} not found`);
  }

  // Use transaction for atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Create the new task
    const newTask = await tx.tasks.create({
      data: {
        Title: originalTask.Title,
        Description: originalTask.Description,
        PriorityId: originalTask.PriorityId,
        StatusId: 1, // Assuming 'To Do' status ID is 1, adjust if needed
        CreatedAt: new Date(),
        UpdatedAt: new Date(),
      },
    });

    // Clone subtasks
    for (const subtask of originalTask.other_tasks) {
      const newSubtask = await tx.tasks.create({
        data: {
          ParentTaskId: newTask.Id,
          Title: subtask.Title,
          Description: subtask.Description,
          PriorityId: subtask.PriorityId,
          StatusId: 1, // Reset to 'To Do'
          CreatedAt: new Date(),
          UpdatedAt: new Date(),
        },
      });

      // Clone subtask assignees
      for (const assignee of subtask.taskassignees) {
        await tx.taskassignees.create({
          data: {
            TaskId: newSubtask.Id,
            AssigneeId: assignee.AssigneeId,
            GroupId: assignee.GroupId,
            AssignedAt: new Date(),
          },
        });
      }

      // Clone subtask API hooks
      for (const apiDef of subtask.apiActionDefinitions) {
        await tx.apiActionDefinition.create({
          data: {
            name: apiDef.name,
            url: apiDef.url,
            method: apiDef.method,
            headers: apiDef.headers,
            payloadTemplate: apiDef.payloadTemplate,
            triggerEvent: apiDef.triggerEvent,
            taskId: newSubtask.Id,
          },
        });
      }
    }

    // Clone main task assignees
    for (const assignee of originalTask.taskassignees) {
      await tx.taskassignees.create({
        data: {
          TaskId: newTask.Id,
          AssigneeId: assignee.AssigneeId,
          GroupId: assignee.GroupId,
          AssignedAt: new Date(),
        },
      });
    }

    // Clone main task API hooks
    for (const apiDef of originalTask.apiActionDefinitions) {
      await tx.apiActionDefinition.create({
        data: {
          name: apiDef.name,
          url: apiDef.url,
          method: apiDef.method,
          headers: apiDef.headers,
          payloadTemplate: apiDef.payloadTemplate,
          triggerEvent: apiDef.triggerEvent,
          taskId: newTask.Id,
        },
      });
    }

    return newTask.Id.toString();
  });

  return result;
}