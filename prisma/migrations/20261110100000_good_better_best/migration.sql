-- Good / Better / Best options on estimates.
ALTER TABLE "Estimate" ADD COLUMN "selectedTier" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EstimateItem" ADD COLUMN "tier" TEXT NOT NULL DEFAULT '';
