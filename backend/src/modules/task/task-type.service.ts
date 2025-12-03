import prisma from "../../lib/connection";

export interface CreateTaskTypeDto {
  typeName: string;
  description?: string;
  transitionType: 'SEQUENTIAL' | 'RANDOM';
  statusIds?: number[]; // Associated status IDs
}

export interface CreateStatusTransitionDto {
  taskTypeId: number;
  fromStatusId: number;
  toStatusId: number;
}

export interface CreateStatusTransitionDto {
  taskTypeId: number;
  fromStatusId: number;
  toStatusId: number;
}

export async function createTaskType(data: CreateTaskTypeDto) {
  const taskType = await prisma.tasktype.create({
    data: {
      TypeName: data.typeName,
      Description: data.description,
      TransitionType: data.transitionType
    }
  });

  // Associate statuses with the task type if provided
  if (data.statusIds && data.statusIds.length > 0) {
    const taskTypeStatuses = data.statusIds.map((statusId, index) => ({
      TaskTypeId: Number(taskType.Id),
      StatusId: statusId,
      OrderIndex: index + 1 // Sequential ordering starting from 1
    }));

    await prisma.tasktypestatuses.createMany({
      data: taskTypeStatuses
    });
  }

  return taskType;
}

export async function createStatusTransition(data: CreateStatusTransitionDto) {
  return await prisma.statustransitionrules.create({
    data: {
      TaskTypeId: data.taskTypeId,
      FromStatusId: data.fromStatusId,
      ToStatusId: data.toStatusId
    }
  });
}

export async function getTaskTypeById(id: number) {
  return await prisma.tasktype.findUnique({
    where: { Id: id },
    include: {
      statustransitionrules: {
        include: {
          taskstatus_statustransitionrules_FromStatusIdTotaskstatus: true,
          taskstatus_statustransitionrules_ToStatusIdTotaskstatus: true
        }
      },
      tasktypestatuses: {
        include: {
          taskstatus: true
        },
        orderBy: {
          OrderIndex: 'asc'
        }
      }
    }
  });
}

export async function getAllTaskTypes() {
  return await prisma.tasktype.findMany({
    include: {
      statustransitionrules: {
        include: {
          taskstatus_statustransitionrules_FromStatusIdTotaskstatus: true,
          taskstatus_statustransitionrules_ToStatusIdTotaskstatus: true
        }
      },
      tasktypestatuses: {
        include: {
          taskstatus: true
        },
        orderBy: {
          OrderIndex: 'asc'
        }
      }
    }
  });
}

export async function getAllowedTransitions(taskTypeId: number, currentStatusId: number) {
  const transitions = await prisma.statustransitionrules.findMany({
    where: {
      TaskTypeId: taskTypeId,
      FromStatusId: currentStatusId
    },
    include: {
      taskstatus_statustransitionrules_ToStatusIdTotaskstatus: true
    }
  });

  return transitions.map(t => ({
    toStatusId: Number(t.ToStatusId),
    toStatusName: t.taskstatus_statustransitionrules_ToStatusIdTotaskstatus.StatusName
  }));
}

export async function getStatusesForTaskType(taskTypeId: number) {
  const taskTypeStatuses = await prisma.tasktypestatuses.findMany({
    where: { TaskTypeId: taskTypeId },
    include: {
      taskstatus: true
    },
    orderBy: {
      OrderIndex: 'asc'
    }
  });

  return taskTypeStatuses.map(tts => ({
    id: Number(tts.taskstatus.Id),
    statusName: tts.taskstatus.StatusName,
    orderIndex: tts.OrderIndex
  }));
}

export async function associateStatusesWithTaskType(taskTypeId: number, statusIds: number[]) {
  // Remove existing associations
  await prisma.tasktypestatuses.deleteMany({
    where: { TaskTypeId: taskTypeId }
  });

  // Add new associations with order
  if (statusIds.length > 0) {
    const taskTypeStatuses = statusIds.map((statusId, index) => ({
      TaskTypeId: taskTypeId,
      StatusId: statusId,
      OrderIndex: index + 1
    }));

    await prisma.tasktypestatuses.createMany({
      data: taskTypeStatuses
    });
  }
}

export async function initializeDefaultTaskTypes() {
  // Get existing statuses
  const statuses = await prisma.taskstatus.findMany();
  const statusMap = new Map(statuses.map(s => [s.StatusName.toLowerCase(), Number(s.Id)]));

  // Define status IDs for sequential workflow
  const sequentialStatusIds = [
    statusMap.get('to do'),
    statusMap.get('in progress'),
    statusMap.get('completed')
  ].filter(id => id !== undefined) as number[];

  // Define status IDs for random workflow
  const randomStatusIds = [
    statusMap.get('to do'),
    statusMap.get('in progress'),
    statusMap.get('completed')
  ].filter(id => id !== undefined) as number[];

  // Create default task types with status associations
  const sequentialType = await createTaskType({
    typeName: 'Standard Workflow',
    description: 'Tasks that follow a sequential workflow (Todo -> In Progress -> Completed)',
    transitionType: 'SEQUENTIAL',
    statusIds: sequentialStatusIds
  });

  const randomType = await createTaskType({
    typeName: 'Flexible Workflow',
    description: 'Tasks that allow flexible status transitions',
    transitionType: 'RANDOM',
    statusIds: randomStatusIds
  });

  // Define sequential transitions (1->2->3->4)
  const sequentialTransitions = [
    { from: 'to do', to: 'in progress' },
    { from: 'in progress', to: 'completed' },
    { from: 'completed', to: 'to do' } // Allow reopening from completed
  ];

  // Define random transitions (flexible)
  const randomTransitions = [
    { from: 'to do', to: 'in progress' },
    { from: 'to do', to: 'completed' },
    { from: 'in progress', to: 'completed' },
    { from: 'in progress', to: 'to do' },
    { from: 'completed', to: 'to do' },
    { from: 'completed', to: 'in progress' }
  ];

  // Create sequential transitions
  for (const transition of sequentialTransitions) {
    const fromId = statusMap.get(transition.from);
    const toId = statusMap.get(transition.to);
    if (fromId && toId) {
      await createStatusTransition({
        taskTypeId: Number(sequentialType.Id),
        fromStatusId: fromId,
        toStatusId: toId
      });
    }
  }

  // Create random transitions
  for (const transition of randomTransitions) {
    const fromId = statusMap.get(transition.from);
    const toId = statusMap.get(transition.to);
    if (fromId && toId) {
      await createStatusTransition({
        taskTypeId: Number(randomType.Id),
        fromStatusId: fromId,
        toStatusId: toId
      });
    }
  }

  console.log('✅ Default task types and status transitions initialized');
}