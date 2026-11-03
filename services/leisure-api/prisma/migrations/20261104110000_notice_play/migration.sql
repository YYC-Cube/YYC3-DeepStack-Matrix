-- AlterTable
ALTER TABLE "notice" ADD COLUMN     "play_end" TIMESTAMP(3),
ADD COLUMN     "play_speed" INTEGER NOT NULL DEFAULT 22,
ADD COLUMN     "play_start" TIMESTAMP(3),
ADD COLUMN     "play_times" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "remind" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "visible_titles" VARCHAR(255);

