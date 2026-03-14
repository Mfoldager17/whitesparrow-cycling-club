-- CreateTable
CREATE TABLE "route_data" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "activity_id" UUID NOT NULL,
    "gpx_file_key" TEXT NOT NULL,
    "total_distance_km" DOUBLE PRECISION NOT NULL,
    "elevation_gain_m" DOUBLE PRECISION NOT NULL,
    "elevation_loss_m" DOUBLE PRECISION NOT NULL,
    "max_elevation_m" DOUBLE PRECISION NOT NULL,
    "min_elevation_m" DOUBLE PRECISION NOT NULL,
    "track_points" JSONB NOT NULL,
    "bounding_box" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "route_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "route_data_activity_id_key" ON "route_data"("activity_id");

-- AddForeignKey
ALTER TABLE "route_data" ADD CONSTRAINT "route_data_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
