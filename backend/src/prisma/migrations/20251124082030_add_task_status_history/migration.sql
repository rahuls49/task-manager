-- CreateTable
CREATE TABLE `TaskStatusHistory` (
    `Id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `TaskId` BIGINT UNSIGNED NOT NULL,
    `OldStatusId` BIGINT UNSIGNED NULL,
    `NewStatusId` BIGINT UNSIGNED NOT NULL,
    `Remark` TEXT NULL,
    `ChangedBy` BIGINT UNSIGNED NULL,
    `ChangedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TaskStatusHistory` ADD CONSTRAINT `TaskStatusHistory_TaskId_fkey` FOREIGN KEY (`TaskId`) REFERENCES `Tasks`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskStatusHistory` ADD CONSTRAINT `TaskStatusHistory_OldStatusId_fkey` FOREIGN KEY (`OldStatusId`) REFERENCES `TaskStatus`(`Id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskStatusHistory` ADD CONSTRAINT `TaskStatusHistory_NewStatusId_fkey` FOREIGN KEY (`NewStatusId`) REFERENCES `TaskStatus`(`Id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskStatusHistory` ADD CONSTRAINT `TaskStatusHistory_ChangedBy_fkey` FOREIGN KEY (`ChangedBy`) REFERENCES `Assignees`(`Id`) ON DELETE SET NULL ON UPDATE CASCADE;
