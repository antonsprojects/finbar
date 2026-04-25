-- Add profile fields; migrate legacy "name" into first_name
ALTER TABLE "User" ADD COLUMN "first_name" TEXT;
ALTER TABLE "User" ADD COLUMN "last_name" TEXT;
ALTER TABLE "User" ADD COLUMN "company_name" TEXT;

UPDATE "User" SET "first_name" = "name" WHERE "name" IS NOT NULL AND btrim("name") <> '';

ALTER TABLE "User" DROP COLUMN "name";
