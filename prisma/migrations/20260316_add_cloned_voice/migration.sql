-- CreateTable
CREATE TABLE "cloned_voices" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "retellVoiceId" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cloned_voices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cloned_voices_retellVoiceId_key" ON "cloned_voices"("retellVoiceId");

-- CreateIndex
CREATE INDEX "cloned_voices_orgId_idx" ON "cloned_voices"("orgId");
