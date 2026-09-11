-- Removes proficiency tiers from skills, and registers the new "services"
-- section key.
--
-- Every statement is guarded. `DROP TABLE ... CASCADE` already removes the
-- foreign key that the next statement targets, so an unguarded version aborts
-- part-way through and leaves the database in a state the migration can no
-- longer be re-run against.
ALTER TYPE "public"."section_key" ADD VALUE IF NOT EXISTS 'services' BEFORE 'skills';--> statement-breakpoint
DROP TABLE IF EXISTS "skill_levels" CASCADE;--> statement-breakpoint
ALTER TABLE "skills" DROP CONSTRAINT IF EXISTS "skills_level_id_skill_levels_id_fk";--> statement-breakpoint
ALTER TABLE "skills" DROP COLUMN IF EXISTS "level_id";
