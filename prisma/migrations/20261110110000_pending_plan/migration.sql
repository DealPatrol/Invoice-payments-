-- CreateTable
CREATE TABLE "PendingPlan" (
    "email" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PendingPlan_pkey" PRIMARY KEY ("email")
);
ALTER TABLE "PendingPlan" ENABLE ROW LEVEL SECURITY;
