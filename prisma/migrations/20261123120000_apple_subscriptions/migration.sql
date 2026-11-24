-- Additive only: App Store (StoreKit 2) subscriptions for the iOS app.
CREATE TABLE "AppleSubscription" (
    "originalTransactionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "environment" TEXT NOT NULL,
    "lastTransactionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppleSubscription_pkey" PRIMARY KEY ("originalTransactionId")
);

CREATE INDEX "AppleSubscription_userId_idx" ON "AppleSubscription"("userId");

ALTER TABLE "AppleSubscription" ADD CONSTRAINT "AppleSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
