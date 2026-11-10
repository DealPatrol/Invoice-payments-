-- Invoice Laboratory: per-user shop rates and price book.
CREATE TABLE "ShopSettings" (
    "userId" TEXT NOT NULL,
    "rates" JSONB NOT NULL DEFAULT '{}',
    "priceBook" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopSettings_pkey" PRIMARY KEY ("userId")
);
