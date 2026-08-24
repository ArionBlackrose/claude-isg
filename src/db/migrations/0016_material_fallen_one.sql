CREATE TABLE `training_topic` (
	`id` text PRIMARY KEY NOT NULL,
	`training_id` text NOT NULL,
	`baslik` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`training_id`) REFERENCES `training`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `training_topic_training_id_idx` ON `training_topic` (`training_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_training` (
	`id` text PRIMARY KEY NOT NULL,
	`ad` text NOT NULL,
	`kategori` text DEFAULT 'Genel' NOT NULL,
	`gecerlilik_ay` integer DEFAULT 0 NOT NULL,
	`egitim_suresi` real DEFAULT 0 NOT NULL,
	`pasaport_goster` integer DEFAULT false NOT NULL,
	`diger_secenegi_var` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_training`("id", "ad", "kategori", "gecerlilik_ay", "egitim_suresi", "pasaport_goster", "diger_secenegi_var", "created_at") SELECT "id", "ad", "kategori", "gecerlilik_ay", "egitim_suresi", "pasaport_goster", 0, "created_at" FROM `training`;--> statement-breakpoint
DROP TABLE `training`;--> statement-breakpoint
ALTER TABLE `__new_training` RENAME TO `training`;--> statement-breakpoint
PRAGMA foreign_keys=ON;