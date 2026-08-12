-- ============================================================
-- 点餐系统 - 数据库初始化 SQL
-- 在微信云托管 MySQL 控制台执行（见 DEPLOY.md）
-- ============================================================

-- 1. 创建数据库（如已存在可跳过）
CREATE DATABASE IF NOT EXISTS `order_app` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `order_app`;

-- 2. 创建表结构（幂等）
CREATE TABLE IF NOT EXISTS `Category` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `sort` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `Category_name_key`(`name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Dish` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(191) NOT NULL,
  `difficulty` INTEGER NOT NULL DEFAULT 1,
  `duration` INTEGER NOT NULL DEFAULT 0,
  `description` VARCHAR(191) NOT NULL DEFAULT '',
  `image` VARCHAR(191) NOT NULL DEFAULT '',
  `status` VARCHAR(191) NOT NULL DEFAULT 'ENABLED',
  `sort` INTEGER NOT NULL DEFAULT 0,
  `categoryId` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `PhoneWhitelist` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `phone` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL DEFAULT '',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `PhoneWhitelist_phone_key`(`phone`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Order` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `tableNo` VARCHAR(191) NOT NULL,
  `items` VARCHAR(191) NOT NULL,
  `totalPrice` DOUBLE NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  `note` VARCHAR(191) NOT NULL DEFAULT '',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. 外键约束（重复执行会报错，如已存在可忽略）
ALTER TABLE `Dish` ADD CONSTRAINT `Dish_categoryId_fkey`
  FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. 默认白名单用户
INSERT INTO `PhoneWhitelist` (`phone`, `name`) VALUES ('18977524719', '默认顾客');
