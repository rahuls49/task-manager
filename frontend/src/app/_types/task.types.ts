export interface Task {
    Id: number,
    ParentTaskId?: number,
    Title: string,
    Description?: string,
    DueDate: string | null,
    DueTime: string | null,
    StartDate: string | null,
    StartTime: string | null,
    IsRecurring: boolean,
    RecurrenceId?: number,
    StatusId?: number,
    PriorityId?: number,
    TaskTypeId?: number,
    IsEscalated: boolean,
    EscalationLevel: number,
    EscalatedAt?: string,
    EscalatedBy?: number,
    IsDeleted: boolean,
    DeletedAt?: string,
    CreatedAt: string,
    UpdatedAt: string,
    StatusName?: string,
    PriorityName?: string,
    ParentTaskTitle?: string,
    assignees?: Assignee[],
    groups?: Group[],
    subtasks: Task[],
    status: Status,
    priority?: Priority
}

export interface Assignee {
    Id: number,
    Name: string,
    Email: string
}

export interface Priority {
    Id: number,
    PriorityName: string
}

export interface Status {
    Id: number,
    StatusName: string
}

export interface Group {
    GroupId: number,
    GroupName: string
}