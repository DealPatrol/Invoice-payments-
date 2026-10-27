-- Invoice Studio business suite: brands/expenses/time (workspace extras) and client portals
ALTER TABLE "StudioWorkspace" ADD COLUMN "extras" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE "StudioPortal" (
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudioPortal_pkey" PRIMARY KEY ("token")
);

CREATE UNIQUE INDEX "StudioPortal_userId_email_key" ON "StudioPortal"("userId", "email");

ALTER TABLE "StudioPortal" ENABLE ROW LEVEL SECURITY;
