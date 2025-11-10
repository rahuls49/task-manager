-- CreateTable
CREATE TABLE `TaskStatus` (
    `Id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `StatusName` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `TaskStatus_StatusName_key`(`StatusName`),
    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaskType` (
    `Id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `TypeName` VARCHAR(100) NOT NULL,
    `Description` TEXT NULL,
    `TransitionType` ENUM('SEQUENTIAL', 'RANDOM') NOT NULL DEFAULT 'SEQUENTIAL',

    UNIQUE INDEX `TaskType_TypeName_key`(`TypeName`),
    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaskTypeStatuses` (
    `Id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `TaskTypeId` BIGINT UNSIGNED NOT NULL,
    `StatusId` BIGINT UNSIGNED NOT NULL,
    `OrderIndex` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `TaskTypeStatuses_TaskTypeId_StatusId_key`(`TaskTypeId`, `StatusId`),
    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StatusTransitionRules` (
    `Id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `TaskTypeId` BIGINT UNSIGNED NOT NULL,
    `FromStatusId` BIGINT UNSIGNED NOT NULL,
    `ToStatusId` BIGINT UNSIGNED NOT NULL,

    UNIQUE INDEX `StatusTransitionRules_TaskTypeId_FromStatusId_ToStatusId_key`(`TaskTypeId`, `FromStatusId`, `ToStatusId`),
    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaskPriority` (
    `Id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `PriorityName` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `TaskPriority_PriorityName_key`(`PriorityName`),
    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Assignees` (
    `Id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `Name` VARCHAR(255) NOT NULL,
    `Email` VARCHAR(255) NOT NULL,
    `Phone` VARCHAR(20) NOT NULL,
    `Password` VARCHAR(255) NULL,

    UNIQUE INDEX `Assignees_Email_key`(`Email`),
    UNIQUE INDEX `Assignees_Phone_key`(`Phone`),
    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GroupMaster` (
    `GroupId` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `GroupName` VARCHAR(255) NOT NULL,
    `ParentId` BIGINT UNSIGNED NULL,

    PRIMARY KEY (`GroupId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserGroupMembers` (
    `GroupId` BIGINT UNSIGNED NOT NULL,
    `UserId` BIGINT UNSIGNED NOT NULL,

    PRIMARY KEY (`GroupId`, `UserId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EscalationRules` (
    `Id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `Name` VARCHAR(255) NOT NULL,
    `ConditionType` VARCHAR(100) NOT NULL,
    `ConditionValue` VARCHAR(255) NOT NULL,
    `MaxEscalationLevel` INTEGER NOT NULL,
    `NotificationGroupId` BIGINT UNSIGNED NULL,
    `ActionType` VARCHAR(100) NOT NULL,
    `ActionValue` VARCHAR(255) NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `UpdatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecurrenceRules` (
    `Id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `RecurrenceType` ENUM('DAILY', 'WEEKLY', 'MONTHLY') NOT NULL,
    `EndDate` DATE NULL,
    `DailyRuleId` BIGINT UNSIGNED NULL,
    `WeeklyRuleId` BIGINT UNSIGNED NULL,
    `MonthlyRuleId` BIGINT UNSIGNED NULL,

    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Repeat_DailyRules` (
    `Id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `RecurEveryXDays` INTEGER NOT NULL DEFAULT 1,
    `IntraDayFrequencyType` ENUM('MINUTES', 'HOURS') NULL,
    `IntraDayInterval` INTEGER NULL,

    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Repeat_WeeklyRules` (
    `Id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `RecurEveryNWeeks` INTEGER NOT NULL DEFAULT 1,
    `OnSunday` BOOLEAN NOT NULL DEFAULT false,
    `OnMonday` BOOLEAN NOT NULL DEFAULT false,
    `OnTuesday` BOOLEAN NOT NULL DEFAULT false,
    `OnWednesday` BOOLEAN NOT NULL DEFAULT false,
    `OnThursday` BOOLEAN NOT NULL DEFAULT false,
    `OnFriday` BOOLEAN NOT NULL DEFAULT false,
    `OnSaturday` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Repeat_MonthlyRules` (
    `Id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `RuleType` ENUM('BY_DAY_OF_MONTH', 'BY_ORDINAL_DAY_OF_WEEK') NOT NULL,

    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Repeat_MonthlyRule_Months` (
    `MonthlyRuleId` BIGINT UNSIGNED NOT NULL,
    `MonthNumber` INTEGER NOT NULL,

    PRIMARY KEY (`MonthlyRuleId`, `MonthNumber`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Repeat_MonthlyRule_Days` (
    `MonthlyRuleId` BIGINT UNSIGNED NOT NULL,
    `DayNumber` VARCHAR(3) NOT NULL,

    PRIMARY KEY (`MonthlyRuleId`, `DayNumber`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Repeat_MonthlyRule_Ordinals` (
    `MonthlyRuleId` BIGINT UNSIGNED NOT NULL,
    `Ordinal` ENUM('FIRST', 'SECOND', 'THIRD', 'FOURTH', 'LAST') NOT NULL,
    `DayOfWeek` ENUM('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY') NOT NULL,

    PRIMARY KEY (`MonthlyRuleId`, `Ordinal`, `DayOfWeek`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Tasks` (
    `Id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `ParentTaskId` BIGINT UNSIGNED NULL,
    `Title` VARCHAR(255) NOT NULL,
    `Description` TEXT NULL,
    `DueDate` DATE NULL,
    `DueTime` TIME(0) NULL,
    `IsRecurring` BOOLEAN NOT NULL DEFAULT false,
    `RecurrenceId` BIGINT UNSIGNED NULL,
    `TaskTypeId` BIGINT UNSIGNED NULL,
    `StatusId` BIGINT UNSIGNED NULL,
    `PriorityId` BIGINT UNSIGNED NULL,
    `StartDate` DATE NULL,
    `StartTime` TIME(0) NULL,
    `IsEscalated` BOOLEAN NOT NULL DEFAULT false,
    `EscalationLevel` INTEGER NOT NULL DEFAULT 0,
    `EscalatedAt` TIMESTAMP(0) NULL,
    `EscalatedBy` BIGINT UNSIGNED NULL,
    `IsDeleted` BOOLEAN NOT NULL DEFAULT false,
    `DeletedAt` TIMESTAMP(0) NULL,
    `CreatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `UpdatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaskAssignees` (
    `Id` INTEGER NOT NULL AUTO_INCREMENT,
    `TaskId` BIGINT UNSIGNED NOT NULL,
    `AssigneeId` BIGINT UNSIGNED NULL,
    `GroupId` BIGINT UNSIGNED NULL,
    `AssignedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `TaskAssignees_TaskId_AssigneeId_GroupId_key`(`TaskId`, `AssigneeId`, `GroupId`),
    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EscalationHistory` (
    `Id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `TaskId` BIGINT UNSIGNED NOT NULL,
    `PreviousLevel` INTEGER NULL,
    `NewLevel` INTEGER NOT NULL,
    `TriggeredBy` BIGINT UNSIGNED NULL,
    `ActionTaken` VARCHAR(255) NOT NULL,
    `ActionTarget` VARCHAR(255) NULL,
    `Notes` TEXT NULL,
    `TriggeredAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Roles` (
    `Id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `Name` VARCHAR(100) NOT NULL,
    `Description` TEXT NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `UpdatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `Roles_Name_key`(`Name`),
    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Permissions` (
    `Id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `Name` VARCHAR(150) NOT NULL,
    `Description` TEXT NULL,
    `Resource` VARCHAR(100) NOT NULL,
    `Action` VARCHAR(50) NOT NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `UpdatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `Permissions_Name_key`(`Name`),
    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RolePermissions` (
    `Id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `RoleId` BIGINT UNSIGNED NOT NULL,
    `PermissionId` BIGINT UNSIGNED NOT NULL,
    `GrantedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `RolePermissions_RoleId_PermissionId_key`(`RoleId`, `PermissionId`),
    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserRoles` (
    `Id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `UserId` BIGINT UNSIGNED NOT NULL,
    `RoleId` BIGINT UNSIGNED NOT NULL,
    `AssignedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `AssignedBy` BIGINT UNSIGNED NULL,

    UNIQUE INDEX `UserRoles_UserId_RoleId_key`(`UserId`, `RoleId`),
    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TaskTypeStatuses` ADD CONSTRAINT `TaskTypeStatuses_TaskTypeId_fkey` FOREIGN KEY (`TaskTypeId`) REFERENCES `TaskType`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskTypeStatuses` ADD CONSTRAINT `TaskTypeStatuses_StatusId_fkey` FOREIGN KEY (`StatusId`) REFERENCES `TaskStatus`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StatusTransitionRules` ADD CONSTRAINT `StatusTransitionRules_TaskTypeId_fkey` FOREIGN KEY (`TaskTypeId`) REFERENCES `TaskType`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StatusTransitionRules` ADD CONSTRAINT `StatusTransitionRules_FromStatusId_fkey` FOREIGN KEY (`FromStatusId`) REFERENCES `TaskStatus`(`Id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StatusTransitionRules` ADD CONSTRAINT `StatusTransitionRules_ToStatusId_fkey` FOREIGN KEY (`ToStatusId`) REFERENCES `TaskStatus`(`Id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GroupMaster` ADD CONSTRAINT `GroupMaster_ParentId_fkey` FOREIGN KEY (`ParentId`) REFERENCES `GroupMaster`(`GroupId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserGroupMembers` ADD CONSTRAINT `UserGroupMembers_GroupId_fkey` FOREIGN KEY (`GroupId`) REFERENCES `GroupMaster`(`GroupId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserGroupMembers` ADD CONSTRAINT `UserGroupMembers_UserId_fkey` FOREIGN KEY (`UserId`) REFERENCES `Assignees`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EscalationRules` ADD CONSTRAINT `EscalationRules_NotificationGroupId_fkey` FOREIGN KEY (`NotificationGroupId`) REFERENCES `GroupMaster`(`GroupId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecurrenceRules` ADD CONSTRAINT `RecurrenceRules_DailyRuleId_fkey` FOREIGN KEY (`DailyRuleId`) REFERENCES `Repeat_DailyRules`(`Id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecurrenceRules` ADD CONSTRAINT `RecurrenceRules_WeeklyRuleId_fkey` FOREIGN KEY (`WeeklyRuleId`) REFERENCES `Repeat_WeeklyRules`(`Id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecurrenceRules` ADD CONSTRAINT `RecurrenceRules_MonthlyRuleId_fkey` FOREIGN KEY (`MonthlyRuleId`) REFERENCES `Repeat_MonthlyRules`(`Id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Repeat_MonthlyRule_Months` ADD CONSTRAINT `Repeat_MonthlyRule_Months_MonthlyRuleId_fkey` FOREIGN KEY (`MonthlyRuleId`) REFERENCES `Repeat_MonthlyRules`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Repeat_MonthlyRule_Days` ADD CONSTRAINT `Repeat_MonthlyRule_Days_MonthlyRuleId_fkey` FOREIGN KEY (`MonthlyRuleId`) REFERENCES `Repeat_MonthlyRules`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Repeat_MonthlyRule_Ordinals` ADD CONSTRAINT `Repeat_MonthlyRule_Ordinals_MonthlyRuleId_fkey` FOREIGN KEY (`MonthlyRuleId`) REFERENCES `Repeat_MonthlyRules`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tasks` ADD CONSTRAINT `Tasks_ParentTaskId_fkey` FOREIGN KEY (`ParentTaskId`) REFERENCES `Tasks`(`Id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tasks` ADD CONSTRAINT `Tasks_RecurrenceId_fkey` FOREIGN KEY (`RecurrenceId`) REFERENCES `RecurrenceRules`(`Id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tasks` ADD CONSTRAINT `Tasks_TaskTypeId_fkey` FOREIGN KEY (`TaskTypeId`) REFERENCES `TaskType`(`Id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tasks` ADD CONSTRAINT `Tasks_StatusId_fkey` FOREIGN KEY (`StatusId`) REFERENCES `TaskStatus`(`Id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tasks` ADD CONSTRAINT `Tasks_PriorityId_fkey` FOREIGN KEY (`PriorityId`) REFERENCES `TaskPriority`(`Id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Tasks` ADD CONSTRAINT `Tasks_EscalatedBy_fkey` FOREIGN KEY (`EscalatedBy`) REFERENCES `Assignees`(`Id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAssignees` ADD CONSTRAINT `TaskAssignees_TaskId_fkey` FOREIGN KEY (`TaskId`) REFERENCES `Tasks`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAssignees` ADD CONSTRAINT `TaskAssignees_AssigneeId_fkey` FOREIGN KEY (`AssigneeId`) REFERENCES `Assignees`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAssignees` ADD CONSTRAINT `TaskAssignees_GroupId_fkey` FOREIGN KEY (`GroupId`) REFERENCES `GroupMaster`(`GroupId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EscalationHistory` ADD CONSTRAINT `EscalationHistory_TaskId_fkey` FOREIGN KEY (`TaskId`) REFERENCES `Tasks`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EscalationHistory` ADD CONSTRAINT `EscalationHistory_TriggeredBy_fkey` FOREIGN KEY (`TriggeredBy`) REFERENCES `Assignees`(`Id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermissions` ADD CONSTRAINT `RolePermissions_RoleId_fkey` FOREIGN KEY (`RoleId`) REFERENCES `Roles`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermissions` ADD CONSTRAINT `RolePermissions_PermissionId_fkey` FOREIGN KEY (`PermissionId`) REFERENCES `Permissions`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRoles` ADD CONSTRAINT `UserRoles_UserId_fkey` FOREIGN KEY (`UserId`) REFERENCES `Assignees`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRoles` ADD CONSTRAINT `UserRoles_RoleId_fkey` FOREIGN KEY (`RoleId`) REFERENCES `Roles`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRoles` ADD CONSTRAINT `UserRoles_AssignedBy_fkey` FOREIGN KEY (`AssignedBy`) REFERENCES `Assignees`(`Id`) ON DELETE SET NULL ON UPDATE CASCADE;
