-- Invoice Studio cloud persistence
CREATE TABLE "StudioWorkspace" (
    "userId" TEXT NOT NULL,
    "profile" JSONB NOT NULL,
    "clients" JSONB NOT NULL,
    "catalog" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudioWorkspace_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "StudioDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "shareToken" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudioDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudioDocument_shareToken_key" ON "StudioDocument"("shareToken");
CREATE INDEX "StudioDocument_userId_idx" ON "StudioDocument"("userId");

-- Row-level security: the app's server (Prisma, table owner) scopes every query by
-- the signed-in userId. RLS with no policies blocks Supabase's anon/authenticated
-- API roles from reading these tables directly.
ALTER TABLE "StudioWorkspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StudioDocument" ENABLE ROW LEVEL SECURITY;
