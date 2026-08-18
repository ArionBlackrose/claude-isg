ALTER TABLE `training` ADD `pasaport_goster` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `training` SET `pasaport_goster` = 1 WHERE `kategori` = '3. Taraf';