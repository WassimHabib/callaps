-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'client', 'super_admin');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'scheduled', 'running', 'paused', 'completed');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'no_answer');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'paused', 'cancelled');

-- CreateEnum
CREATE TYPE "FreeTrialType" AS ENUM ('none', 'subscription_only', 'minutes_only', 'both');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'sent', 'paid', 'overdue');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'client',
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "company" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemPrompt" TEXT NOT NULL,
    "firstMessage" TEXT,
    "firstMessageMode" TEXT NOT NULL DEFAULT 'dynamic',
    "llmModel" TEXT NOT NULL DEFAULT 'gpt-4.1',
    "voiceId" TEXT NOT NULL DEFAULT 'minimax-Camille',
    "voiceSpeed" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "voiceTemperature" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "language" TEXT NOT NULL DEFAULT 'fr-FR',
    "maxCallDuration" INTEGER NOT NULL DEFAULT 300,
    "silenceTimeout" INTEGER NOT NULL DEFAULT 10,
    "endCallOnSilence" BOOLEAN NOT NULL DEFAULT true,
    "enableRecording" BOOLEAN NOT NULL DEFAULT true,
    "postCallAnalysis" BOOLEAN NOT NULL DEFAULT false,
    "postCallPrompt" TEXT,
    "postCallWebhook" TEXT,
    "safetyMessage" TEXT,
    "maxSafetyRetries" INTEGER NOT NULL DEFAULT 3,
    "functions" JSONB NOT NULL DEFAULT '[]',
    "mcpConfig" JSONB NOT NULL DEFAULT '[]',
    "config" JSONB NOT NULL DEFAULT '{}',
    "notificationEmail" TEXT,
    "notificationPhone" TEXT,
    "notificationChannels" JSONB NOT NULL DEFAULT '[]',
    "retellAgentId" TEXT,
    "retellLlmId" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "callDays" JSONB NOT NULL DEFAULT '[1,2,3,4,5]',
    "callStartTime" TEXT NOT NULL DEFAULT '09:00',
    "callEndTime" TEXT NOT NULL DEFAULT '17:00',
    "timezoneMode" TEXT NOT NULL DEFAULT 'fixed',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "maxRetries" INTEGER NOT NULL DEFAULT 1,
    "retryIntervalH" INTEGER NOT NULL DEFAULT 1,
    "callRateCount" INTEGER NOT NULL DEFAULT 20,
    "callRateMinutes" INTEGER NOT NULL DEFAULT 1,
    "phoneNumberIds" JSONB NOT NULL DEFAULT '[]',
    "workflows" JSONB NOT NULL DEFAULT '[]',
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "agentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "company" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "score" INTEGER,
    "scoreLabel" TEXT,
    "scoreReason" TEXT,
    "nextAction" TEXT,
    "campaignId" TEXT,
    "userId" TEXT,
    "orgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calls" (
    "id" TEXT NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'pending',
    "retellCallId" TEXT,
    "duration" INTEGER,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "transcript" TEXT,
    "summary" TEXT,
    "sentiment" TEXT,
    "outcome" TEXT,
    "recordingUrl" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "campaignId" TEXT,
    "contactId" TEXT,
    "userId" TEXT,
    "orgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_demands" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "details" TEXT,
    "urgency" TEXT NOT NULL DEFAULT 'medium',
    "orgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_demands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_reports" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalCalls" INTEGER NOT NULL,
    "totalDemands" INTEGER NOT NULL,
    "topCategories" JSONB NOT NULL DEFAULT '[]',
    "kpis" JSONB NOT NULL DEFAULT '{}',
    "recommendations" JSONB NOT NULL DEFAULT '[]',
    "profession" TEXT,
    "rawAnalysis" JSONB,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT,
    "city" TEXT,
    "zipCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'France',
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "openingHours" TEXT,
    "tone" TEXT NOT NULL DEFAULT 'professionnel',
    "targetAudience" TEXT,
    "uniqueValue" TEXT,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "statusCode" INTEGER,
    "response" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_numbers" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "nickname" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'twilio',
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phone_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "patientPhone" TEXT NOT NULL,
    "patientEmail" TEXT,
    "practitioner" TEXT NOT NULL,
    "motif" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "source" TEXT NOT NULL DEFAULT 'agent_ia',
    "notes" TEXT,
    "externalId" TEXT,
    "callId" TEXT,
    "userId" TEXT NOT NULL,
    "orgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "monthlyPrice" INTEGER NOT NULL,
    "pricePerMinute" INTEGER NOT NULL,
    "freeTrialType" "FreeTrialType" NOT NULL DEFAULT 'none',
    "freeTrialMonths" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "companyName" TEXT NOT NULL,
    "companyAddress" TEXT,
    "companySiret" TEXT,
    "companyVat" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "subscriptionAmount" INTEGER NOT NULL,
    "minutesUsed" INTEGER NOT NULL,
    "minutesAmount" INTEGER NOT NULL,
    "totalHT" INTEGER NOT NULL,
    "tvaRate" INTEGER NOT NULL DEFAULT 2000,
    "tvaAmount" INTEGER NOT NULL,
    "totalTTC" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'draft',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_clients" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientOrgId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'onboarding',
    "contractStatus" TEXT NOT NULL DEFAULT 'draft',
    "contractUrl" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "paymentMethod" TEXT,
    "notes" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_client_shares" (
    "id" TEXT NOT NULL,
    "adminClientId" TEXT NOT NULL,
    "sharedWithId" TEXT NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'read',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_client_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prospects" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "company" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "stage" TEXT NOT NULL DEFAULT 'prospect',
    "lostReason" TEXT,
    "nextAction" TEXT,
    "nextActionDate" TIMESTAMP(3),
    "estimatedValue" INTEGER,
    "notes" TEXT,
    "convertedToId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prospects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prospect_activities" (
    "id" TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prospect_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "agents_retellAgentId_key" ON "agents"("retellAgentId");

-- CreateIndex
CREATE UNIQUE INDEX "agents_retellLlmId_key" ON "agents"("retellLlmId");

-- CreateIndex
CREATE UNIQUE INDEX "calls_retellCallId_key" ON "calls"("retellCallId");

-- CreateIndex
CREATE INDEX "call_demands_orgId_createdAt_idx" ON "call_demands"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "call_demands_callId_idx" ON "call_demands"("callId");

-- CreateIndex
CREATE INDEX "weekly_reports_orgId_createdAt_idx" ON "weekly_reports"("orgId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_reports_orgId_periodStart_key" ON "weekly_reports"("orgId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "company_profiles_orgId_key" ON "company_profiles"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "phone_numbers_phoneNumber_key" ON "phone_numbers"("phoneNumber");

-- CreateIndex
CREATE INDEX "phone_numbers_orgId_idx" ON "phone_numbers"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_orgId_key" ON "subscriptions"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_orgId_periodMonth_periodYear_key" ON "invoices"("orgId", "periodMonth", "periodYear");

-- CreateIndex
CREATE INDEX "admin_clients_adminId_idx" ON "admin_clients"("adminId");

-- CreateIndex
CREATE INDEX "admin_clients_clientId_idx" ON "admin_clients"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_clients_adminId_clientId_key" ON "admin_clients"("adminId", "clientId");

-- CreateIndex
CREATE INDEX "admin_client_shares_sharedWithId_idx" ON "admin_client_shares"("sharedWithId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_client_shares_adminClientId_sharedWithId_key" ON "admin_client_shares"("adminClientId", "sharedWithId");

-- CreateIndex
CREATE INDEX "prospects_adminId_idx" ON "prospects"("adminId");

-- CreateIndex
CREATE INDEX "prospects_stage_idx" ON "prospects"("stage");

-- CreateIndex
CREATE INDEX "prospect_activities_prospectId_idx" ON "prospect_activities"("prospectId");

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_demands" ADD CONSTRAINT "call_demands_callId_fkey" FOREIGN KEY ("callId") REFERENCES "calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_clients" ADD CONSTRAINT "admin_clients_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_clients" ADD CONSTRAINT "admin_clients_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_client_shares" ADD CONSTRAINT "admin_client_shares_adminClientId_fkey" FOREIGN KEY ("adminClientId") REFERENCES "admin_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_client_shares" ADD CONSTRAINT "admin_client_shares_sharedWithId_fkey" FOREIGN KEY ("sharedWithId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_convertedToId_fkey" FOREIGN KEY ("convertedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prospect_activities" ADD CONSTRAINT "prospect_activities_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prospect_activities" ADD CONSTRAINT "prospect_activities_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
