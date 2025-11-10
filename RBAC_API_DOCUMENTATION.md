# Task Manager Backend API Documentation - RBAC System

## Overview

The Task Manager now includes a comprehensive Role-Based Access Control (RBAC) system that allows dynamic role creation and granular permission management. The system supports hierarchical permissions and flexible role assignments.

## RBAC Architecture

### Core Components
- **Roles**: Dynamic roles that can be created, modified, and assigned to users
- **Permissions**: Granular permissions with resource-action pairs (e.g., `task:create`, `user:manage`)
- **Role-Permission Relationships**: Many-to-many relationships between roles and permissions
- **User-Role Relationships**: Many-to-many relationships between users and roles

### Default Roles
The system initializes with three default roles:

1. **Administrator**: Full system access with all permissions
2. **Manager**: Management access to tasks, users, groups, and system statistics
3. **User**: Basic access to personal tasks and data

### Permission Structure
Permissions follow the format: `resource:action`

**Available Resources:**
- `task` - Task management
- `subtask` - Subtask management
- `recurrence` - Recurrence rule management
- `user` - User management
- `group` - Group management
- `role` - Role management
- `permission` - Permission management
- `system` - System operations
- `data` - Data import operations

**Available Actions:**
- `create` - Create new resources
- `read` - View/read resources
- `update` - Modify existing resources
- `delete` - Delete resources
- `assign` - Assign resources to users/groups
- `manage-members` - Manage group memberships
- `initialize` - Initialize system
- `view-stats` - View statistics
- `process-escalations` - Process escalations
- `import` - Import data

## Authentication Updates

JWT tokens now include user roles and permissions in the payload:

```json
{
  "id": "1",
  "email": "user@example.com",
  "roles": ["Administrator", "Manager"],
  "permissions": ["task:create", "task:read", "user:manage"],
  "iat": 1638360000,
  "exp": 1638446400
}
```

## RBAC API Endpoints

All RBAC endpoints require authentication and appropriate permissions.

### Role Management

#### GET /rbac/roles
Get all active roles with their permission counts.

**Permissions Required:** `role:read`

**Response:**
```json
{
  "success": true,
  "message": "Roles fetched successfully",
  "data": [
    {
      "Id": 1,
      "Name": "Administrator",
      "Description": "Full system access",
      "IsActive": true,
      "_count": {
        "UserRoles": 2
      }
    }
  ]
}
```

#### GET /rbac/roles/:id
Get detailed information about a specific role including its permissions.

**Permissions Required:** `role:read`

#### POST /rbac/roles
Create a new role.

**Permissions Required:** `role:create`

**Request Body:**
```json
{
  "name": "Project Manager",
  "description": "Manages project tasks and team members"
}
```

#### PUT /rbac/roles/:id
Update an existing role.

**Permissions Required:** `role:update`

#### DELETE /rbac/roles/:id
Soft delete a role (deactivate it).

**Permissions Required:** `role:delete`

#### PATCH /rbac/roles/:id/activate
Reactivate a deleted role.

**Permissions Required:** `role:update`

### Permission Management

#### GET /rbac/permissions
Get all active permissions.

**Permissions Required:** `permission:read`

**Response:**
```json
{
  "success": true,
  "message": "Permissions fetched successfully",
  "data": [
    {
      "Id": 1,
      "Name": "task:create",
      "Description": "Create new tasks",
      "Resource": "task",
      "Action": "create",
      "IsActive": true
    }
  ]
}
```

#### GET /rbac/permissions/resource/:resource
Get permissions for a specific resource.

**Permissions Required:** `permission:read`

#### POST /rbac/permissions
Create a new permission.

**Permissions Required:** `permission:create`

**Request Body:**
```json
{
  "name": "project:manage",
  "description": "Manage projects",
  "resource": "project",
  "action": "manage"
}
```

#### PUT /rbac/permissions/:id
Update a permission.

**Permissions Required:** `permission:update`

#### DELETE /rbac/permissions/:id
Soft delete a permission.

**Permissions Required:** `permission:delete`

### Role-Permission Relationships

#### GET /rbac/roles/:id/permissions
Get all permissions assigned to a role.

**Permissions Required:** `role:read`

#### POST /rbac/roles/:roleId/permissions/:permissionId
Assign a permission to a role.

**Permissions Required:** `role:update`

#### DELETE /rbac/roles/:roleId/permissions/:permissionId
Remove a permission from a role.

**Permissions Required:** `role:update`

#### PUT /rbac/roles/:id/permissions
Set all permissions for a role (bulk operation).

**Permissions Required:** `role:update`

**Request Body:**
```json
{
  "permissionIds": [1, 2, 3, 4]
}
```

### User-Role Relationships

#### GET /rbac/users/:id/roles
Get all roles assigned to a user.

**Permissions Required:** `role:read`

#### GET /rbac/users/:id/permissions
Get all permissions a user has (through their roles).

**Permissions Required:** `role:read`

#### POST /rbac/users/:userId/roles/:roleId
Assign a role to a user.

**Permissions Required:** `role:assign`

#### DELETE /rbac/users/:userId/roles/:roleId
Remove a role from a user.

**Permissions Required:** `role:assign`

#### PUT /rbac/users/:id/roles
Set all roles for a user (bulk operation).

**Permissions Required:** `role:assign`

**Request Body:**
```json
{
  "roleIds": [1, 2]
}
```

#### GET /rbac/roles/:id/users
Get all users assigned to a specific role.

**Permissions Required:** `role:read`

#### GET /rbac/users/:id/role-details
Get detailed role information for a user.

**Permissions Required:** `role:read`

## Permission Enforcement

### Middleware Functions

The system provides several middleware functions for permission checking:

#### requirePermission(resource, action)
Requires a specific permission.

#### requireAnyPermission(permissions[])
Requires any one of the specified permissions.

#### requireAllPermissions(permissions[])
Requires all of the specified permissions.

### Applied Permissions

All existing endpoints now have appropriate permission checks:

#### Task Endpoints
- `GET /tasks` - `task:read`
- `POST /tasks` - `task:create`
- `PUT /tasks/:id` - `task:update`
- `DELETE /tasks/:id` - `task:delete`
- `POST /tasks/:id/assign` - `task:assign`
- `PATCH /tasks/:id/complete` - `task:update`
- `POST /tasks/:id/escalate` - `task:escalate`

#### Management Endpoints
- `POST /management/initialize` - `system:initialize`
- `GET /management/assignees` - `user:read`
- `POST /management/assignees` - `user:create`
- `GET /management/groups` - `group:read`
- `POST /management/groups` - `group:create`

#### System Endpoints
- `GET /system/tasks/stats` - `system:view-stats`
- `GET /system/scheduler/config` - `system:manage-scheduler`
- `PUT /system/scheduler/config` - `system:manage-scheduler`

## Error Responses

### Permission Denied
```json
{
  "success": false,
  "message": "Insufficient permissions. Required: task:create"
}
```

### Authentication Required
```json
{
  "success": false,
  "message": "Authentication required"
}
```

## Database Schema

### Role Table
```sql
CREATE TABLE Roles (
  Id BIGINT PRIMARY KEY AUTO_INCREMENT,
  Name VARCHAR(100) UNIQUE NOT NULL,
  Description TEXT,
  IsActive BOOLEAN DEFAULT TRUE,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Permission Table
```sql
CREATE TABLE Permissions (
  Id BIGINT PRIMARY KEY AUTO_INCREMENT,
  Name VARCHAR(150) UNIQUE NOT NULL,
  Description TEXT,
  Resource VARCHAR(100) NOT NULL,
  Action VARCHAR(50) NOT NULL,
  IsActive BOOLEAN DEFAULT TRUE,
  CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### RolePermission Table
```sql
CREATE TABLE RolePermissions (
  Id BIGINT PRIMARY KEY AUTO_INCREMENT,
  RoleId BIGINT NOT NULL,
  PermissionId BIGINT NOT NULL,
  GrantedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (RoleId) REFERENCES Roles(Id) ON DELETE CASCADE,
  FOREIGN KEY (PermissionId) REFERENCES Permissions(Id) ON DELETE CASCADE,
  UNIQUE(RoleId, PermissionId)
);
```

### UserRole Table
```sql
CREATE TABLE UserRoles (
  Id BIGINT PRIMARY KEY AUTO_INCREMENT,
  UserId BIGINT NOT NULL,
  RoleId BIGINT NOT NULL,
  AssignedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  AssignedBy BIGINT,
  FOREIGN KEY (UserId) REFERENCES Assignees(Id) ON DELETE CASCADE,
  FOREIGN KEY (RoleId) REFERENCES Roles(Id) ON DELETE CASCADE,
  FOREIGN KEY (AssignedBy) REFERENCES Assignees(Id),
  UNIQUE(UserId, RoleId)
);
```

## Usage Examples

### Creating a Custom Role
```bash
# Create a role
curl -X POST http://localhost:5000/rbac/roles \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Auditor",
    "description": "Can view reports and statistics"
  }'

# Assign permissions to the role
curl -X PUT http://localhost:5000/rbac/roles/4/permissions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "permissionIds": [25, 26, 27]  // system:view-stats, etc.
  }'

# Assign role to user
curl -X POST http://localhost:5000/rbac/users/123/roles/4 \
  -H "Authorization: Bearer <token>"
```

### Checking User Permissions
```bash
# Get user permissions
curl -X GET http://localhost:5000/rbac/users/123/permissions \
  -H "Authorization: Bearer <token>"
```

## Security Considerations

1. **Permission Granularity**: Permissions are resource-action based for fine-grained control
2. **Role Inheritance**: Users inherit all permissions from their assigned roles
3. **Soft Deletes**: Roles and permissions are soft-deleted to maintain data integrity
4. **Audit Trail**: User role assignments track who assigned roles and when
5. **JWT Payload**: User permissions are included in JWT tokens for efficient checking

## Migration Notes

When upgrading existing systems:

1. Run system initialization to create default roles and permissions
2. Assign appropriate roles to existing users
3. Update any custom logic that previously used simple role checks
4. Test all endpoints to ensure proper permission enforcement

The RBAC system is fully backward compatible - existing functionality continues to work while adding the new permission layer.