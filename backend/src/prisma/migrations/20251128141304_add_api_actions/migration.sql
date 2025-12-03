-- CreateTable
CREATE TABLE `ApiDefinitions` (
    `Id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `Name` VARCHAR(255) NOT NULL,
    `Description` TEXT NULL,
    `Endpoint` VARCHAR(1000) NOT NULL,
    `HttpMethod` ENUM('GET', 'POST', 'PUT', 'PATCH', 'DELETE') NOT NULL DEFAULT 'GET',
    `Headers` JSON NULL,
    `Body` JSON NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `UpdatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaskApiActions` (
    `Id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `TaskId` BIGINT UNSIGNED NOT NULL,
    `ApiDefinitionId` BIGINT UNSIGNED NOT NULL,
    `TriggerEvent` VARCHAR(100) NOT NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `UpdatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `TaskApiActions_TaskId_ApiDefinitionId_TriggerEvent_key`(`TaskId`, `ApiDefinitionId`, `TriggerEvent`),
    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApiCalls` (
    `Id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `ApiDefinitionId` BIGINT UNSIGNED NOT NULL,
    `TaskId` BIGINT UNSIGNED NULL,
    `TriggerEvent` VARCHAR(100) NOT NULL,
    `RequestUrl` VARCHAR(1000) NOT NULL,
    `RequestMethod` ENUM('GET', 'POST', 'PUT', 'PATCH', 'DELETE') NOT NULL,
    `RequestHeaders` JSON NULL,
    `RequestBody` JSON NULL,
    `ResponseStatus` INTEGER NULL,
    `ResponseBody` JSON NULL,
    `ErrorMessage` TEXT NULL,
    `ExecutedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `DurationMs` INTEGER NULL,
    `IsSuccess` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`Id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TaskApiActions` ADD CONSTRAINT `TaskApiActions_TaskId_fkey` FOREIGN KEY (`TaskId`) REFERENCES `Tasks`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskApiActions` ADD CONSTRAINT `TaskApiActions_ApiDefinitionId_fkey` FOREIGN KEY (`ApiDefinitionId`) REFERENCES `ApiDefinitions`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApiCalls` ADD CONSTRAINT `ApiCalls_ApiDefinitionId_fkey` FOREIGN KEY (`ApiDefinitionId`) REFERENCES `ApiDefinitions`(`Id`) ON DELETE CASCADE ON UPDATE CASCADE;
