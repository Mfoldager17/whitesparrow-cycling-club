CREATE TABLE "ridewithgps_tokens" (
    "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
    "user_id"      UUID        NOT NULL,
    "rwgps_user_id" INTEGER    NOT NULL,
    "access_token" TEXT        NOT NULL,
    "user_name"    TEXT,
    "user_avatar"  TEXT,
    "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"   TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ridewithgps_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ridewithgps_tokens_user_id_key"      ON "ridewithgps_tokens"("user_id");
CREATE UNIQUE INDEX "ridewithgps_tokens_rwgps_user_id_key" ON "ridewithgps_tokens"("rwgps_user_id");

ALTER TABLE "ridewithgps_tokens"
    ADD CONSTRAINT "ridewithgps_tokens_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
