CREATE TABLE `notification_log` (
	`id` text PRIMARY KEY NOT NULL,
	`recipients` text NOT NULL,
	`expired_count` integer DEFAULT 0 NOT NULL,
	`soon_count` integer DEFAULT 0 NOT NULL,
	`sent` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
