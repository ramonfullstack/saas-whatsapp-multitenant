-- CreateEnum
CREATE TYPE "AiRunType" AS ENUM ('REPLY_SUGGESTION', 'SUMMARY', 'CLASSIFY', 'URGENCY');

-- CreateEnum
CREATE TYPE "AiRunStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'ERROR');

-- CreateTable
CREATE TABLE "CompanyAiSettings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "tone" TEXT NOT NULL DEFAULT 'professional',
    "customTonePrompt" TEXT,
    "guardrails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "knowledgeBaseEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maxTokensPerRequest" INTEGER NOT NULL DEFAULT 1024,
    "dailyLimitTokens" INTEGER NOT NULL DEFAULT 100000,
    "dailyTokensUsed" INTEGER NOT NULL DEFAULT 0,
    "dailyResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "saveOutputs" BOOLEAN NOT NULL DEFAULT true,
    "redactSensitiveData" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyAiSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRun" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "AiRunType" NOT NULL,
    "status" "AiRunStatus" NOT NULL DEFAULT 'PENDING',
    "inputHash" TEXT,
    "input" TEXT,
    "output" TEXT,
    "tokensInput" INTEGER,
    "tokensOutput" INTEGER,
    "costEstimate" DOUBLE PRECISION,
    "provider" TEXT,
    "model" TEXT,
    "latencyMs" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketSummary" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "messageCount" INTEGER NOT NULL,
    "aiRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyAiSettings_companyId_key" ON "CompanyAiSettings"("companyId");

-- CreateIndex
CREATE INDEX "CompanyAiSettings_companyId_idx" ON "CompanyAiSettings"("companyId");

-- CreateIndex
CREATE INDEX "AiRun_companyId_idx" ON "AiRun"("companyId");

-- CreateIndex
CREATE INDEX "AiRun_companyId_ticketId_idx" ON "AiRun"("companyId", "ticketId");

-- CreateIndex
CREATE INDEX "AiRun_companyId_type_createdAt_idx" ON "AiRun"("companyId", "type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AiRun_inputHash_idx" ON "AiRun"("inputHash");

-- CreateIndex
CREATE INDEX "TicketSummary_companyId_idx" ON "TicketSummary"("companyId");

-- CreateIndex
CREATE INDEX "TicketSummary_ticketId_idx" ON "TicketSummary"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketSummary_companyId_ticketId_key" ON "TicketSummary"("companyId", "ticketId");

-- AddForeignKey
ALTER TABLE "CompanyAiSettings" ADD CONSTRAINT "CompanyAiSettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
