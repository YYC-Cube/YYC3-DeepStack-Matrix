-- AlterTable
ALTER TABLE "artist" ADD COLUMN     "bust_cm" INTEGER,
ADD COLUMN     "height_cm" INTEGER,
ADD COLUMN     "hip_cm" INTEGER,
ADD COLUMN     "show_photos" JSONB,
ADD COLUMN     "show_wechat" VARCHAR(64),
ADD COLUMN     "waist_cm" INTEGER,
ADD COLUMN     "weight_kg" INTEGER;
