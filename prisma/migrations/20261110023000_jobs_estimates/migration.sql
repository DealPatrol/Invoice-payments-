-- Jobs, estimates, site photos, and change orders for contractor field work.

CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "siteAddress" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'open',
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Estimate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "jobId" TEXT,
    "estimateNumber" TEXT NOT NULL,
    "reviewToken" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "scope" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "assumptions" JSONB NOT NULL DEFAULT '[]',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "validUntil" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "previewDataUrl" TEXT,
    "previewSource" TEXT,
    "convertedInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Estimate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EstimateItem" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'ea',
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "shoppingUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "EstimateItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EstimatePhase" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "durationDays" INTEGER,
    CONSTRAINT "EstimatePhase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SitePhoto" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT,
    "estimateId" TEXT,
    "mimeType" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "role" TEXT NOT NULL DEFAULT 'site',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SitePhoto_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChangeOrder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "jobId" TEXT,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "resolution" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChangeOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChangeOrderItem" (
    "id" TEXT NOT NULL,
    "changeOrderId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'ea',
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "shoppingUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ChangeOrderItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Invoice" ADD COLUMN "jobId" TEXT;

CREATE UNIQUE INDEX "Estimate_reviewToken_key" ON "Estimate"("reviewToken");
CREATE UNIQUE INDEX "Estimate_convertedInvoiceId_key" ON "Estimate"("convertedInvoiceId");
CREATE UNIQUE INDEX "Estimate_userId_estimateNumber_key" ON "Estimate"("userId", "estimateNumber");
CREATE UNIQUE INDEX "ChangeOrder_invoiceId_key" ON "ChangeOrder"("invoiceId");
CREATE UNIQUE INDEX "ChangeOrder_estimateId_number_key" ON "ChangeOrder"("estimateId", "number");

CREATE INDEX "Job_userId_idx" ON "Job"("userId");
CREATE INDEX "Job_clientId_idx" ON "Job"("clientId");
CREATE INDEX "Job_status_idx" ON "Job"("status");
CREATE INDEX "Estimate_userId_idx" ON "Estimate"("userId");
CREATE INDEX "Estimate_clientId_idx" ON "Estimate"("clientId");
CREATE INDEX "Estimate_jobId_idx" ON "Estimate"("jobId");
CREATE INDEX "Estimate_status_idx" ON "Estimate"("status");
CREATE INDEX "EstimateItem_estimateId_idx" ON "EstimateItem"("estimateId");
CREATE INDEX "EstimatePhase_estimateId_idx" ON "EstimatePhase"("estimateId");
CREATE INDEX "SitePhoto_userId_idx" ON "SitePhoto"("userId");
CREATE INDEX "SitePhoto_jobId_idx" ON "SitePhoto"("jobId");
CREATE INDEX "SitePhoto_estimateId_idx" ON "SitePhoto"("estimateId");
CREATE INDEX "ChangeOrder_userId_idx" ON "ChangeOrder"("userId");
CREATE INDEX "ChangeOrder_estimateId_idx" ON "ChangeOrder"("estimateId");
CREATE INDEX "ChangeOrder_status_idx" ON "ChangeOrder"("status");
CREATE INDEX "ChangeOrderItem_changeOrderId_idx" ON "ChangeOrderItem"("changeOrderId");
CREATE INDEX "Invoice_jobId_idx" ON "Invoice"("jobId");

ALTER TABLE "Job" ADD CONSTRAINT "Job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_convertedInvoiceId_fkey" FOREIGN KEY ("convertedInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EstimateItem" ADD CONSTRAINT "EstimateItem_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EstimatePhase" ADD CONSTRAINT "EstimatePhase_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SitePhoto" ADD CONSTRAINT "SitePhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SitePhoto" ADD CONSTRAINT "SitePhoto_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SitePhoto" ADD CONSTRAINT "SitePhoto_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChangeOrderItem" ADD CONSTRAINT "ChangeOrderItem_changeOrderId_fkey" FOREIGN KEY ("changeOrderId") REFERENCES "ChangeOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Job" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Estimate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EstimateItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EstimatePhase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SitePhoto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChangeOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChangeOrderItem" ENABLE ROW LEVEL SECURITY;
