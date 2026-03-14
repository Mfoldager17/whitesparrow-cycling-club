-- Create platform enum
CREATE TYPE "OAuthPlatform" AS ENUM ('strava', 'rwgps');

-- Unified OAuth token table (one row per user per platform)
CREATE TABLE "oauth_tokens" (
    "id"              UUID            NOT NULL DEFAULT gen_random_uuid(),
    "user_id"         UUID            NOT NULL,
    "platform"        "OAuthPlatform" NOT NULL,
    "external_user_id" TEXT           NOT NULL,
    "access_token"    TEXT            NOT NULL,
    "refresh_token"   TEXT,
    "expires_at"      TIMESTAMPTZ,
    "scope"           TEXT,
    "user_name"       TEXT,
    "user_avatar"     TEXT,
    "created_at"      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    "updated_at"      TIMESTAMPTZ     NOT NULL,

    CONSTRAINT "oauth_tokens_pkey" PRIMARY KEY ("id")
);

-- One connection per user per platform
CREATE UNIQUE INDEX "oauth_tokens_user_id_platform_key"
    ON "oauth_tokens"("user_id", "platform");

-- Each external account may only be linked once per platform
CREATE UNIQUE INDEX "oauth_tokens_platform_external_user_id_key"
    ON "oauth_tokens"("platform", "external_user_id");

ALTER TABLE "oauth_tokens"
    ADD CONSTRAINT "oauth_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing Strava tokens into the unified table
INSERT INTO "oauth_tokens" (
    "id", "user_id", "platform", "external_user_id",
    "access_token", "refresh_token", "expires_at", "scope",
    "user_name", "user_avatar", "created_at", "updated_at"
)
SELECT
    "id",
    "user_id",
    'strava'::"OAuthPlatform",
    "athlete_id",
    "access_token",
    "refresh_token",
    "expires_at",
    "scope",
    "athlete_name",
    "athlete_avatar",
    "created_at",
    "updated_at"
FROM "strava_tokens";

-- Drop the old platform-specific table
DROP TABLE "strava_tokens";
