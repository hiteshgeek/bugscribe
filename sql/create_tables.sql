-- SQL to create bug_reports and attachments tables
-- Use JSON type for `media` if MySQL >= 5.7, otherwise use LONGTEXT

CREATE TABLE `bug_reports` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `page_url` VARCHAR(2083) NOT NULL,
  `message` TEXT,
  `media` JSON DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `attachments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `report_id` INT UNSIGNED NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `saved_path` VARCHAR(512) NOT NULL,
  `saved_thumb_path` VARCHAR(512) DEFAULT NULL,
  `mime` VARCHAR(128) DEFAULT NULL,
  `size` BIGINT DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`report_id`) REFERENCES `bug_reports`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
