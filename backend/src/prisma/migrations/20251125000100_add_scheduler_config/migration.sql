-- CreateTable
CREATE TABLE `SchedulerConfig` (
    `Id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `ConfigKey` VARCHAR(100) NOT NULL,
    `ConfigValue` TEXT NOT NULL,
    `Description` VARCHAR(255) NULL,
    `UpdatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0) ON UPDATE CURRENT_TIMESTAMP(0),
    UNIQUE INDEX `SchedulerConfig_ConfigKey_key`(`ConfigKey`),
    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
