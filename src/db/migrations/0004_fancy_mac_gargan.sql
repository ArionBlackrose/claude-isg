CREATE TABLE `project_settings` (
	`id` text PRIMARY KEY DEFAULT 'default' NOT NULL,
	`proje_adi` text,
	`aciklama` text,
	`baslangic_tarihi` text,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
