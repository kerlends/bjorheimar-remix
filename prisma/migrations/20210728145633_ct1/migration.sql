-- CreateEnum
CREATE TYPE "ContainerType" AS ENUM ('CAN', 'BOTTLE', 'KEG', 'BOX', 'GIFTBOX', 'OTHER');

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "atvrId" TEXT NOT NULL,
    "inventorySyncEnabled" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessHours" (
    "id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "opensAt" INTEGER NOT NULL,
    "closesAt" INTEGER NOT NULL,
    "storeId" TEXT NOT NULL,
    "atvrStoreId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "containerType" "ContainerType" NOT NULL DEFAULT E'OTHER',
    "volume" INTEGER NOT NULL,
    "alcohol" DOUBLE PRECISION NOT NULL,
    "placeOfOrigin" TEXT NOT NULL,
    "isTempProduct" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "atvrId" TEXT NOT NULL,
    "productCategoryId" TEXT NOT NULL,
    "tasteProfileId" TEXT NOT NULL,
    "manufacturerId" TEXT NOT NULL,
    "image" TEXT,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductInventory" (
    "id" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "quantity" INTEGER NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "latest" BOOLEAN NOT NULL DEFAULT false,
    "productId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "atvrProductId" TEXT,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "atvrId" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TasteProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "productCategoryId" TEXT,
    "atvrId" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manufacturer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Store.slug_unique" ON "Store"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Store.atvrId_unique" ON "Store"("atvrId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessHours.atvrStoreId_weekday_unique" ON "BusinessHours"("atvrStoreId", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "Product.atvrId_unique" ON "Product"("atvrId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory.name_unique" ON "ProductCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory.atvrId_unique" ON "ProductCategory"("atvrId");

-- CreateIndex
CREATE UNIQUE INDEX "TasteProfile.name_unique" ON "TasteProfile"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TasteProfile.atvrId_unique" ON "TasteProfile"("atvrId");

-- CreateIndex
CREATE UNIQUE INDEX "Manufacturer.name_unique" ON "Manufacturer"("name");

-- AddForeignKey
ALTER TABLE "BusinessHours" ADD FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD FOREIGN KEY ("productCategoryId") REFERENCES "ProductCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD FOREIGN KEY ("tasteProfileId") REFERENCES "TasteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductInventory" ADD FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductInventory" ADD FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TasteProfile" ADD FOREIGN KEY ("productCategoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
