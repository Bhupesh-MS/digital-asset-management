/*
  Warnings:

  - You are about to drop the `Asset` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "asset_type" AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "asset_status" AS ENUM ('UPLOADED', 'QUEUED', 'PROCESSING', 'READY', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "storage_provider" AS ENUM ('MINIO');

-- CreateEnum
CREATE TYPE "asset_object_kind" AS ENUM ('ORIGINAL', 'THUMBNAIL', 'PREVIEW', 'TRANSCODED');

-- CreateEnum
CREATE TYPE "processing_job_type" AS ENUM ('GENERATE_THUMBNAIL', 'TRANSCODE_VIDEO', 'EXTRACT_METADATA', 'AUTO_TAG');

-- CreateEnum
CREATE TYPE "processing_job_status" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "share_link_status" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

-- DropTable
DROP TABLE "Asset";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "type" "asset_type" NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "checksum_sha256" TEXT,
    "status" "asset_status" NOT NULL DEFAULT 'QUEUED',
    "storage_provider" "storage_provider" NOT NULL DEFAULT 'MINIO',
    "bucket" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "preview_object_key" TEXT,
    "thumbnail_object_key" TEXT,
    "uploaded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_metadata" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration_seconds" DECIMAL(12,3),
    "frame_rate" DECIMAL(8,3),
    "bitrate" BIGINT,
    "codec" TEXT,
    "color_space" TEXT,
    "page_count" INTEGER,
    "extracted_text" TEXT,
    "raw" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_objects" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "kind" "asset_object_kind" NOT NULL,
    "storage_provider" "storage_provider" NOT NULL DEFAULT 'MINIO',
    "bucket" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration_seconds" DECIMAL(12,3),
    "resolution_label" TEXT NOT NULL DEFAULT '',
    "checksum_sha256" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_tags" (
    "asset_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_tags_pkey" PRIMARY KEY ("asset_id","tag_id")
);

-- CreateTable
CREATE TABLE "asset_categories" (
    "asset_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("asset_id","category_id")
);

-- CreateTable
CREATE TABLE "processing_jobs" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "type" "processing_job_type" NOT NULL,
    "status" "processing_job_status" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB,
    "result" JSONB,
    "error" TEXT,
    "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_links" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "status" "share_link_status" NOT NULL DEFAULT 'ACTIVE',
    "created_by_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "assets_checksum_sha256_key" ON "assets"("checksum_sha256");

-- CreateIndex
CREATE UNIQUE INDEX "assets_object_key_key" ON "assets"("object_key");

-- CreateIndex
CREATE INDEX "assets_status_created_at_idx" ON "assets"("status", "created_at");

-- CreateIndex
CREATE INDEX "assets_type_created_at_idx" ON "assets"("type", "created_at");

-- CreateIndex
CREATE INDEX "assets_uploaded_by_id_created_at_idx" ON "assets"("uploaded_by_id", "created_at");

-- CreateIndex
CREATE INDEX "assets_mime_type_idx" ON "assets"("mime_type");

-- CreateIndex
CREATE INDEX "assets_filename_idx" ON "assets"("filename");

-- CreateIndex
CREATE UNIQUE INDEX "asset_metadata_asset_id_key" ON "asset_metadata"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "asset_objects_object_key_key" ON "asset_objects"("object_key");

-- CreateIndex
CREATE INDEX "asset_objects_asset_id_kind_idx" ON "asset_objects"("asset_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "asset_objects_asset_id_kind_resolution_label_key" ON "asset_objects"("asset_id", "kind", "resolution_label");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "tags_name_idx" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_name_idx" ON "categories"("name");

-- CreateIndex
CREATE INDEX "asset_tags_tag_id_idx" ON "asset_tags"("tag_id");

-- CreateIndex
CREATE INDEX "asset_categories_category_id_idx" ON "asset_categories"("category_id");

-- CreateIndex
CREATE INDEX "processing_jobs_status_priority_queued_at_idx" ON "processing_jobs"("status", "priority", "queued_at");

-- CreateIndex
CREATE INDEX "processing_jobs_asset_id_type_idx" ON "processing_jobs"("asset_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_token_hash_key" ON "share_links"("token_hash");

-- CreateIndex
CREATE INDEX "share_links_asset_id_status_idx" ON "share_links"("asset_id", "status");

-- CreateIndex
CREATE INDEX "share_links_expires_at_idx" ON "share_links"("expires_at");

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_metadata" ADD CONSTRAINT "asset_metadata_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_objects" ADD CONSTRAINT "asset_objects_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_tags" ADD CONSTRAINT "asset_tags_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_tags" ADD CONSTRAINT "asset_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
