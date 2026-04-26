-- CreateEnum
CREATE TYPE "AccountRole" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "AccountRole" NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "invites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "created_by_admin_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "used_at" TIMESTAMP(3),
    "used_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invites_code_hash_key" ON "invites"("code_hash");

-- CreateIndex
CREATE INDEX "invites_email_idx" ON "invites"("email");

-- CreateIndex
CREATE INDEX "invites_created_by_admin_id_idx" ON "invites"("created_by_admin_id");

-- CreateIndex
CREATE INDEX "invites_expires_at_idx" ON "invites"("expires_at");

-- CreateIndex
CREATE INDEX "invites_used_by_user_id_idx" ON "invites"("used_by_user_id");

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_used_by_user_id_fkey" FOREIGN KEY ("used_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
