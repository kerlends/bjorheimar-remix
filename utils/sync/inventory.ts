import { PrismaClient, ContainerType } from '@prisma/client';
import { createFuzzySearch } from '../fuzzy';
import { uploadImage } from '../cloudinary';
import * as atvr from '../atvr/client';
import getAtvrStoreInventory from '../atvr/atvr-store-inventory';
import { AtvrProduct } from '../atvr/types';

interface PrismaConfig {
	prisma: PrismaClient;
}

function getImageUrl(atvrProductId: string) {
	return `https://www.vinbudin.is/Portaldata/1/Resources/vorumyndir/original/${atvrProductId.padStart(
		5,
		'0',
	)}_r.jpg`;
}

function parseContainerType(atvrContainerType: string) {
	switch (atvrContainerType) {
		case 'DS.': {
			return ContainerType.CAN;
		}
		case 'FL.': {
			return ContainerType.BOTTLE;
		}
		case 'ASKJA': {
			return ContainerType.BOX;
		}
		case 'GJAFAASKJA': {
			return ContainerType.GIFTBOX;
		}
		default: {
			console.log('Unrecognized container type: %s', atvrContainerType);
			return ContainerType.OTHER;
		}
	}
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

async function getExistingProducts(config: PrismaConfig, storeId: string) {
	const existingProducts = await config.prisma.product.findMany({
		select: {
			id: true,
			atvrId: true,
			image: true,
			inventory: {
				where: {
					store: {
						atvrId: {
							equals: storeId,
						},
					},
				},
				orderBy: {
					createdAt: 'desc',
				},
				take: 1,
				select: {
					quantity: true,
					latest: true,
				},
			},
		},
	});

	return existingProducts.reduce<
		Record<string, { atvrId: string; quantity: number; image: string | null }>
	>(
		(byId, { inventory, ...product }) => ({
			...byId,
			[product.atvrId]: {
				...product,
				quantity: inventory[0]?.quantity ?? 0,
			},
		}),
		{},
	);
}

type ExistingProductsMap = Awaited<ReturnType<typeof getExistingProducts>>;

async function buildImageCache(
	products: AtvrProduct[],
	existingProducts: ExistingProductsMap,
) {
	const imageCache: Record<string, string | null> = {};

	await Promise.all(
		products.map(async (product) => {
			const productId = product.ProductID.toString();
			const imageUrl = getImageUrl(productId);
			let res = existingProducts[productId]?.image;
			if (!res) {
				try {
					res = (await uploadImage(imageUrl, productId)).url;
				} catch (err) {
					console.error(err);
				}
			}
			imageCache[product.ProductID.toString()] = res ?? null;
		}),
	);

	return imageCache;
}

type ImageCache = Awaited<ReturnType<typeof buildImageCache>>;

async function getManufacturersFuzzySet(config: PrismaConfig) {
	const fuzzySet = createFuzzySearch(0.8);

	const allManufacturers = await config.prisma.manufacturer.findMany();
	for (const brewer of allManufacturers) {
		if (!fuzzySet.get(brewer.name)) {
			fuzzySet.add(brewer.name);
		}
	}

	return fuzzySet;
}

export default async function updateStoreProductInventory(
	config: PrismaConfig,
	storeId: string,
) {
	const label = 'update store inventory';
	console.time(label);

	const products = await getAtvrStoreInventory(storeId);

	const existingProductsByAtvrId = await getExistingProducts(config, storeId);

	console.log('[atvr] performing inventory sync for store %s', storeId);

	const updated = await archiveOldInventory(config, storeId);
	console.log('[atvr] archived %s inventory entries', updated.count);

	const imageCache = await buildImageCache(products, existingProductsByAtvrId);
	const fuzzySet = await getManufacturersFuzzySet(config);

	const upsertTransactions = products.map((product) => {
		if (!product.ProductStoreSelected) {
			throw new Error(
				`Failed to update product inventory: Product.ProductStoreSelected missing for product \`${product.ProductID}\` with selected store id ${storeId}`,
			);
		}
		return config.prisma.product.upsert({
			where: {
				atvrId: product.ProductID.toString(),
			},
			create: {
				name: product.ProductName,
				manufacturer: {
					connect: {
						name:
							fuzzySet.get(product.ProductProducer) || product.ProductProducer,
					},
				},
				containerType: parseContainerType(product.ProductContainerType),
				volume: product.ProductBottledVolume,
				alcohol: product.ProductAlchoholVolume,
				placeOfOrigin: product.ProductCountryOfOrigin,
				isTempProduct: product.ProductIsTemporaryOnSale,
				atvrId: product.ProductID.toString(),
				category: {
					connectOrCreate: {
						where: { atvrId: product.ProductTasteGroup },
						create: {
							atvrId: product.ProductTasteGroup,
							name: 'Unknown category',
							description: 'Unknown category',
						},
					},
				},
				tasteProfile: {
					connectOrCreate: {
						where: { atvrId: product.ProductTasteGroup2 },
						create: {
							atvrId: product.ProductTasteGroup2,
							name: 'Unknown taste profile',
							description: 'Unknown taste profile',
						},
					},
				},
				inventory: {
					create: {
						store: {
							connect: {
								atvrId: storeId,
							},
						},
						available: product.ProductIsAvailableInStores,
						price: product.ProductPrice,
						quantity: product.ProductStoreSelected.Quantity ?? 0,
						atvrProductId: product.ProductID.toString(),
						latest: true,
					},
				},
				image: imageCache[product.ProductID.toString()],
			},
			update: {
				inventory: {
					create: {
						store: {
							connect: {
								atvrId: storeId,
							},
						},
						quantity: product.ProductStoreSelected.Quantity ?? 0,
						available: product.ProductIsAvailableInStores,
						price: product.ProductPrice,
						latest: true,
						atvrProductId: product.ProductID.toString(),
					},
				},
				image: imageCache[product.ProductID.toString()],
			},
		});
	});

	await Promise.all(upsertTransactions);
	console.timeEnd(label);
}
