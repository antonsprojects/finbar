-- Split Worker.name into firstName + lastName (first token = voornaam, rest = achternaam).

ALTER TABLE "Worker" ADD COLUMN "firstName" TEXT;
ALTER TABLE "Worker" ADD COLUMN "lastName" TEXT;

UPDATE "Worker"
SET
  "firstName" = CASE
    WHEN trim("name") = '' THEN 'Onbekend'
    WHEN position(' ' IN trim("name")) = 0 THEN trim("name")
    ELSE trim(substring(trim("name") FROM 1 FOR position(' ' IN trim("name")) - 1))
  END,
  "lastName" = CASE
    WHEN trim("name") = '' THEN ''
    WHEN position(' ' IN trim("name")) = 0 THEN ''
    ELSE trim(substring(trim("name") FROM position(' ' IN trim("name")) + 1))
  END
WHERE "firstName" IS NULL;

ALTER TABLE "Worker" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "Worker" ALTER COLUMN "lastName" SET NOT NULL;
ALTER TABLE "Worker" ALTER COLUMN "lastName" SET DEFAULT '';

ALTER TABLE "Worker" DROP COLUMN "name";
