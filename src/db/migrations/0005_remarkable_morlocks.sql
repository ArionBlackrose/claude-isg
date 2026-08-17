PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_project_settings` (
	`id` text PRIMARY KEY DEFAULT 'default' NOT NULL,
	`proje_adi` text,
	`aciklama` text,
	`baslangic_tarihi` text,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "project_settings_singleton" CHECK("__new_project_settings"."id" = 'default')
);
--> statement-breakpoint
INSERT INTO `__new_project_settings`("id", "proje_adi", "aciklama", "baslangic_tarihi", "updated_at") SELECT "id", "proje_adi", "aciklama", "baslangic_tarihi", "updated_at" FROM `project_settings`;--> statement-breakpoint
DROP TABLE `project_settings`;--> statement-breakpoint
ALTER TABLE `__new_project_settings` RENAME TO `project_settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;