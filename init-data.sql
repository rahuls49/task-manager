-- Initialize default data for the task manager database

USE task_manager;

-- Insert default task statuses
INSERT IGNORE INTO TaskStatus (Id, StatusName) VALUES
(1, 'To Do'),
(2, 'In Progress'),
(3, 'Completed'),
(4, 'Blocked'),
(5, 'Cancelled'),
(6, 'On Hold'),
(7, 'Under Review');

-- Insert default task priorities
INSERT IGNORE INTO TaskPriority (Id, PriorityName) VALUES
(1, 'Low'),
(2, 'Medium'),
(3, 'High'),
(4, 'Critical'),
(5, 'Urgent');

-- Insert sample assignees for testing
INSERT IGNORE INTO Assignees (Id, Name, Email, Phone) VALUES
(1, 'John Doe', 'john.doe@example.com', '+1-555-0101'),
(2, 'Jane Smith', 'jane.smith@example.com', '+1-555-0102'),
(3, 'Mike Johnson', 'mike.johnson@example.com', '+1-555-0103'),
(4, 'Sarah Williams', 'sarah.williams@example.com', '+1-555-0104'),
(5, 'David Brown', 'david.brown@example.com', '+1-555-0105');

-- Insert sample groups
INSERT IGNORE INTO GroupMaster (GroupId, GroupName, ParentId) VALUES
(1, 'Development Team', NULL),
(2, 'QA Team', NULL),
(3, 'Management', NULL),
(4, 'Frontend Developers', 1),
(5, 'Backend Developers', 1),
(6, 'DevOps', 1);

-- Insert sample group memberships
INSERT IGNORE INTO UserGroupMembers (GroupId, UserId) VALUES
(1, 1), -- John Doe in Development Team
(1, 2), -- Jane Smith in Development Team
(4, 1), -- John Doe in Frontend Developers
(5, 2), -- Jane Smith in Backend Developers
(2, 3), -- Mike Johnson in QA Team
(3, 4), -- Sarah Williams in Management
(6, 5); -- David Brown in DevOps

-- Insert sample escalation rules
INSERT IGNORE INTO EscalationRules (Id, Name, ConditionType, ConditionValue, MaxEscalationLevel, NotificationGroupId, ActionType, ActionValue, IsActive) VALUES
(1, 'Overdue Tasks Rule', 'overdue', '24', 3, 3, 'notify', 'email', TRUE),
(2, 'High Priority Inactive Rule', 'inactive', '12', 2, 3, 'notify', 'slack', TRUE),
(3, 'Critical Task SLA Rule', 'sla_breach', '4', 5, 3, 'reassign', 'escalation_team', TRUE);

-- Show summary of inserted data
SELECT 'Task Statuses' as DataType, COUNT(*) as Count FROM TaskStatus
UNION ALL
SELECT 'Task Priorities', COUNT(*) FROM TaskPriority
UNION ALL
SELECT 'Assignees', COUNT(*) FROM Assignees
UNION ALL
SELECT 'Groups', COUNT(*) FROM GroupMaster
UNION ALL
SELECT 'Group Memberships', COUNT(*) FROM UserGroupMembers
UNION ALL
SELECT 'Escalation Rules', COUNT(*) FROM EscalationRules;