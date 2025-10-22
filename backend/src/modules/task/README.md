# Task Management System

A comprehensive task management system with advanced features for enterprise use.

## Features

### Core Task Operations
- ✅ Task Created
- ✅ Task Updated (general property change)
- ✅ Task Deleted/Archived (soft delete)
- ✅ Task Assigned (single or multiple assignees added)
- ✅ Task Unassigned (assignee(s) removed)
- ✅ Task Status Changed (e.g., New, In Progress, Completed, Blocked)
- ✅ Task Priority Changed
- ✅ Task Due Date Changed
- ✅ Task Due Time Changed
- ✅ Task Recurrence Modified
- ✅ Task Started
- ✅ Task Completed (marked as done/closed)
- ✅ Task Reopened (after completion/closure)
- ✅ Task Overdue (due date/time passed, not completed)
- ✅ Sub-task Added
- ✅ Sub-task Removed
- ✅ Task Escalated (escalation rule triggered)
- ✅ Task Copied/Duplicated
- ✅ Task Moved (to another project/category)

### Validation Features
- ✅ Required Fields validation
- ✅ Field Type & Format validation
- ✅ Parent-Child Integrity validation
- ✅ Date & Time validation
- ✅ Assignment & Ownership validation
- ✅ Status Progression validation
- ✅ Recurrence validation
- ✅ Dependency/Blocking validation
- ✅ Circular reference prevention

### Escalation Workflow
- ✅ Trigger Detection (overdue, inactivity, SLA breach)
- ✅ Escalation Rule Evaluation
- ✅ Escalation Actions (notify, reassign, status change)
- ✅ Manual Escalation
- ✅ Resolution & Monitoring

### Assignment System
- ✅ Individual user assignments
- ✅ Group assignments
- ✅ Nested group support
- ✅ Multiple assignees per task

## Database Structure

The system uses the following main tables:
- `Tasks` - Main task storage
- `TaskStatus` - Task status definitions
- `TaskPriority` - Priority levels
- `Assignees` - Individual users
- `GroupMaster` - User groups with nesting support
- `UserGroupMembers` - User-group relationships
- `TaskAssignees` - Task-assignee relationships
- `TaskRecurrence` - Recurrence patterns
- `EscalationRules` - Escalation rule definitions
- `EscalationHistory` - Escalation audit trail

## API Endpoints

### Core Task Operations

#### GET /tasks
Retrieve tasks with filtering and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50)
- `status` (number[]): Filter by status IDs
- `priority` (number[]): Filter by priority IDs
- `assigneeId` (number): Filter by assignee ID
- `groupId` (number): Filter by group ID
- `overdue` (boolean): Filter overdue tasks
- `completed` (boolean): Filter completed/incomplete tasks
- `parentTaskId` (number|null): Filter by parent task ID
- `isSubTask` (boolean): Filter subtasks only

**Response:**
```json
{
  "success": true,
  "message": "Tasks fetched successfully",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

#### GET /tasks/:id
Retrieve single task by ID.

#### POST /tasks
Create new task.

**Request Body:**
```json
{
  "title": "Task Title",
  "description": "Task Description",
  "dueDate": "2024-12-31",
  "dueTime": "14:30:00",
  "statusId": 1,
  "priorityId": 2,
  "parentTaskId": null,
  "isRecurring": false,
  "recurrenceId": null,
  "assigneeIds": [1, 2],
  "groupIds": [1]
}
```

#### PUT /tasks/:id
Update existing task.

#### DELETE /tasks/:id
Soft delete task.

### Task Assignment Operations

#### POST /tasks/:id/assign
Assign task to users/groups.

**Request Body:**
```json
{
  "assigneeIds": [1, 2, 3],
  "groupIds": [1, 2]
}
```

#### POST /tasks/:id/unassign
Unassign task from users/groups.

**Request Body:**
```json
{
  "assigneeId": 1,
  "groupId": 2
}
```

### Task Status Operations

#### PATCH /tasks/:id/complete
Mark task as completed.

#### PATCH /tasks/:id/reopen
Reopen completed task.

### Task Escalation Operations

#### POST /tasks/:id/escalate
Manually escalate task.

**Request Body:**
```json
{
  "notes": "Escalation reason"
}
```

#### POST /tasks/system/process-escalations
Process automatic escalations (system endpoint).

### Subtask Operations

#### GET /tasks/:id/subtasks
Get all subtasks of a parent task.

#### POST /tasks/:id/subtasks
Create subtask under a parent task.

### Utility Operations

#### GET /tasks/system/overdue
Get all overdue tasks.

#### GET /tasks/system/stats
Get task statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "completed": 45,
    "inProgress": 30,
    "overdue": 15,
    "escalated": 5,
    "byPriority": {
      "Low": 20,
      "Medium": 80,
      "High": 35,
      "Critical": 15
    },
    "byStatus": {
      "To Do": 60,
      "In Progress": 30,
      "Completed": 45,
      "Blocked": 10,
      "On Hold": 5
    }
  }
}
```

#### POST /tasks/:id/duplicate
Duplicate task.

### Data Operations

#### POST /tasks/import/csv
Import tasks from CSV file.

## Management API Endpoints

### System Management

#### POST /management/initialize
Initialize task management system with default data.

### Reference Data

#### GET /management/statuses
Get all task statuses.

#### GET /management/priorities
Get all task priorities.

### Assignee Management

#### GET /management/assignees
Get all assignees.

#### POST /management/assignees
Create new assignee.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com"
}
```

### Group Management

#### GET /management/groups
Get all groups.

#### POST /management/groups
Create new group.

**Request Body:**
```json
{
  "groupName": "Development Team",
  "parentId": null
}
```

#### GET /management/groups/:groupId/members
Get group members.

#### POST /management/groups/:groupId/members
Add user to group.

**Request Body:**
```json
{
  "userId": 1
}
```

#### DELETE /management/groups/:groupId/members/:userId
Remove user from group.

### Recurrence Management

#### POST /management/recurrence
Create task recurrence pattern.

**Request Body:**
```json
{
  "frequency": "weekly",
  "interval": 1,
  "endDate": "2024-12-31",
  "daysOfWeek": "[\"monday\", \"wednesday\", \"friday\"]"
}
```

## Installation & Setup

1. **Database Setup:**
   ```sql
   -- Run the provided SQL script to create all tables
   ```

2. **Initialize System:**
   ```bash
   POST /management/initialize
   ```

3. **Create Assignees:**
   ```bash
   POST /management/assignees
   {
     "name": "Admin User",
     "email": "admin@example.com"
   }
   ```

4. **Create Groups:**
   ```bash
   POST /management/groups
   {
     "groupName": "Administrators"
   }
   ```

## Task Events

The system logs all task events for audit and notification purposes:

- `task_created`
- `task_updated`
- `task_deleted`
- `task_assigned`
- `task_unassigned`
- `task_status_changed`
- `task_priority_changed`
- `task_due_date_changed`
- `task_due_time_changed`
- `task_recurrence_modified`
- `task_started`
- `task_completed`
- `task_reopened`
- `task_overdue`
- `subtask_added`
- `subtask_removed`
- `task_escalated`
- `task_dependency_updated`
- `task_copied`
- `task_moved`

## Validation Rules

### Task Validation
- Title: Required, 1-255 characters
- Description: Optional, max 1000 characters
- Due Date: Cannot be in the past
- Subtask Due Date: Cannot exceed parent task due date
- Status Transitions: Parent tasks cannot be completed with incomplete subtasks

### Escalation Rules
- Maximum escalation level: 5
- Automatic escalation based on conditions:
  - Overdue tasks (days)
  - Inactive tasks (hours)
  - Priority-based escalation

### Assignment Rules
- Valid assignees must exist
- Groups must exist
- No duplicate assignments

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common error codes:
- `400` - Bad Request (validation errors)
- `404` - Not Found (task/resource not found)
- `500` - Internal Server Error

## Security Considerations

- All task operations are logged
- Soft delete prevents data loss
- User permissions should be implemented at the application level
- Input validation prevents SQL injection and data corruption

## Performance Considerations

- Database indexes on frequently queried fields
- Pagination for large result sets
- Efficient query structure with JOINs
- Connection pooling for database operations