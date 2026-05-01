-- Multi-value vakgebieden: PostgreSQL text array + migrate comma-separated legacy `trade`.

ALTER TABLE "Worker" ADD COLUMN "trades" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "Worker" AS w
SET "trades" = COALESCE(
  (
    SELECT array_agg(trim(both FROM seg))
    FROM unnest(string_to_array(COALESCE(w."trade", ''), ',')) AS seg
    WHERE trim(both FROM seg) <> ''
  ),
  ARRAY[]::TEXT[]
);

ALTER TABLE "Worker" DROP COLUMN "trade";
