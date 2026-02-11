-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_overrides" (
    "id" TEXT NOT NULL,
    "feature_flag_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_overrides" (
    "id" TEXT NOT NULL,
    "feature_flag_id" TEXT NOT NULL,
    "group_name" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "region_overrides" (
    "id" TEXT NOT NULL,
    "feature_flag_id" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "region_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE UNIQUE INDEX "user_overrides_feature_flag_id_user_id_key" ON "user_overrides"("feature_flag_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_overrides_feature_flag_id_group_name_key" ON "group_overrides"("feature_flag_id", "group_name");

-- CreateIndex
CREATE UNIQUE INDEX "region_overrides_feature_flag_id_region_key" ON "region_overrides"("feature_flag_id", "region");

-- AddForeignKey
ALTER TABLE "user_overrides" ADD CONSTRAINT "user_overrides_feature_flag_id_fkey" FOREIGN KEY ("feature_flag_id") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_overrides" ADD CONSTRAINT "group_overrides_feature_flag_id_fkey" FOREIGN KEY ("feature_flag_id") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "region_overrides" ADD CONSTRAINT "region_overrides_feature_flag_id_fkey" FOREIGN KEY ("feature_flag_id") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
