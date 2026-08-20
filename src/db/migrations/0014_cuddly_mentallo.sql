CREATE TABLE `user_permission` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`permission_key` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_permission_user_id_idx` ON `user_permission` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_permission_user_id_key_idx` ON `user_permission` (`user_id`,`permission_key`);