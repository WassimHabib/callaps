-- Migration: remove clerkId, add custom auth fields to users table

-- Step 1: make clerkId nullable so existing rows don't violate NOT NULL
ALTER TABLE "users" ALTER COLUMN "clerk_id" DROP NOT NULL;

-- Step 2: drop the unique index on clerkId
DROP INDEX IF EXISTS "users_clerk_id_key";

-- Step 3: drop the clerkId column
ALTER TABLE "users" DROP COLUMN IF EXISTS "clerk_id";

-- Step 4: add custom auth fields
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "inviteToken" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "inviteExpiresAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetToken" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "resetExpiresAt" TIMESTAMP(3);

-- Step 5: add unique constraints for tokens
CREATE UNIQUE INDEX IF NOT EXISTS "users_inviteToken_key" ON "users"("inviteToken");
CREATE UNIQUE INDEX IF NOT EXISTS "users_resetToken_key" ON "users"("resetToken");
