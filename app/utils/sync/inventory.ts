import { PrismaClient } from '@prisma/client';
import getAtvrStoreInventory from '../atvr/atvr-store-inventory';

interface PrismaConfig {
	prisma: PrismaClient;
}

async function archiveOldInventory(config: PrismaConfig, storeId: string) {
	const updated = await config.prisma.productInventory.updateMany({
		where: {
			store: {
				atvrId: storeId,
			},
			latest: true,
		},
		data: {
			latest: false,
		},
	});

	return updated;
}

export default async function updateStoreProductInventory(
	config: PrismaConfig,
	storeId: string,
) {
	const label = 'update store inventory';
	console.time(label);

	const products = await getAtvrStoreInventory(storeId);

	console.log('[atvr] performing inventory sync for store %s', storeId);

	const updated = await archiveOldInventory(config, storeId);
	console.log('[atvr] archived %s inventory entries', updated.count);

	const allProducts = await config.prisma.product.findMany({
		where: {
			atvrId: {
				in: products.map((p) => p.ProductID.toString()),
			},
		},
	});

	const allProductsByAtvrId = allProducts.reduce<
		Record<string, typeof allProducts[number]>
	>(
		(byId, product) => ({
			...byId,
			[product.atvrId]: product,
		}),
		{},
	);

	await config.prisma.store.update({
		where: { atvrId: storeId },
		data: {
			inventory: {
				createMany: {
					data: products.map((product) => ({
						available: product.ProductIsAvailableInStores,
						price: product.ProductPrice,
						quantity: product.ProductStoreSelected?.Quantity ?? 0,
						atvrProductId: product.ProductID.toString(),
						productId: allProductsByAtvrId[product.ProductID.toString()].id,
						latest: true,
					})),
				},
			},
		},
	});
}
