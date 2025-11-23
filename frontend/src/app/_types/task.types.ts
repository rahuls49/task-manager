export interface Task {
    Id: number,
    ParentTaskId: number | null,
    Title: string,
    Description?: string,
    DueDate: string | null,
    DueTime: string | null,
    StartDate: string | null,
    StartTime: string | null,
    IsRecurring: number,
    RecurrenceId?: number,
    StatusId: number,
    PriorityId: number,
    TaskTypeId?: number,
    IsEscalated: number,
    EscalationLevel: number,
    EscalatedAt?: string,
    EscalatedBy: number,
    IsDeleted: number,
    DeletedAt?: string,
    CreatedAt: string,
    UpdatedAt: string,
    StatusName: string,
    PriorityName: string,
    // RecurrenceFrequency: null,
    // "RecurrenceInterval": null,
    // "RecurrenceEndDate": null,
    ParentTaskTitle?: string,
    assignees?: Assignee[],
    groups?: Group[],
    subtasks: Task[],
    status: Status,
    priority: Priority
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