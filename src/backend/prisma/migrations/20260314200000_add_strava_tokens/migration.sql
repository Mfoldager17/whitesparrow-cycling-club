CREATE TABLE "strava_tokens" (
    "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
    "user_id"        UUID        NOT NULL,
    "athlete_id"     TEXT        NOT NULL,
    "access_token"   TEXT        NOT NULL,
    "refresh_token"  TEXT        NOT NULL,
    "expires_at"     TIMESTAMPTZ NOT NULL,
    "scope"          TEXT        NOT NULL DEFAULT 'read,activity:read',
    "athlete_name"   TEXT,
    "athlete_avatar" TEXT,
    "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"     TIMESTAMPTZ NOT NULL,

    CONSTRAINT "strava_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "strava_tokens_user_id_key"    ON "strava_tokens"("user_id");
CREATE UNIQUE INDEX "strava_tokens_athlete_id_key" ON "strava_tokens"("athlete_id");

ALTER TABLE "strava_tokens"
    ADD CONSTRAINT "strava_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
