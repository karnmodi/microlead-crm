CREATE TABLE "team_ai_settings" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "business_focus" TEXT,
    "crm_purpose" TEXT,
    "target_audience" TEXT,
    "tone_guidelines" TEXT,
    "email_signature" TEXT,
    "default_closing" TEXT,
    "language_style" TEXT,
    "response_verbosity" INTEGER NOT NULL DEFAULT 2,
    "reasoning_depth" INTEGER NOT NULL DEFAULT 2,
    "action_horizon_days" INTEGER NOT NULL DEFAULT 7,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "team_ai_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "team_ai_settings_team_id_key" ON "team_ai_settings"("team_id");

ALTER TABLE "team_ai_settings"
ADD CONSTRAINT "team_ai_settings_team_id_fkey"
FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
