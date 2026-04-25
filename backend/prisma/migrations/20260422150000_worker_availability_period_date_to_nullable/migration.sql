-- Vaste dienst: einddatum mag ontbreken (onbepaald).

ALTER TABLE "WorkerAvailabilityPeriod" ALTER COLUMN "dateTo" DROP NOT NULL;
