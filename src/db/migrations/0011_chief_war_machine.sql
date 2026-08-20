CREATE TABLE `discipline_action` (
	`id` text PRIMARY KEY NOT NULL,
	`personnel_id` text NOT NULL,
	`action` text NOT NULL,
	`not` text,
	`created_by_user_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`personnel_id`) REFERENCES `personnel`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `discipline_action_personnel_id_idx` ON `discipline_action` (`personnel_id`);