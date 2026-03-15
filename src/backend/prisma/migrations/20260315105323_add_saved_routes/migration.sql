-- CreateEnum
CREATE TYPE "RouteSurface" AS ENUM ('paved', 'unpaved', 'auto');

-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "saved_route_id" UUID;

-- CreateTable
CREATE TABLE "saved_routes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_by" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "surface" "RouteSurface" NOT NULL DEFAULT 'auto',
    "waypoints" JSONB NOT NULL,
    "total_distance_km" DOUBLE PRECISION NOT NULL,
    "elevation_gain_m" DOUBLE PRECISION NOT NULL,
    "elevation_loss_m" DOUBLE PRECISION NOT NULL,
    "max_elevation_m" DOUBLE PRECISION NOT NULL,
    "min_elevation_m" DOUBLE PRECISION NOT NULL,
    "track_points" JSONB NOT NULL,
    "bounding_box" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "saved_routes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_saved_route_id_fkey" FOREIGN KEY ("saved_route_id") REFERENCES "saved_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_routes" ADD CONSTRAINT "saved_routes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
