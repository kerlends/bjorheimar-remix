import { PrismaClient, ContainerType } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { createFuzzySearch } from '../fuzzy';
import { uploadImage } from '../cloudinary.server';
import getAtvrStoreInventory from '../atvr/atvr-store-inventory';
import { AtvrProduct } from '../atvr/types';
import { getAtvrProductDescription } from '~/utils/atvr-description';

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
	const start = Date.now();
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

	console.log('Image cache created (%s ms)', (Date.now() - start).toFixed(0));

	return imageCache;
}

async function getManufacturersFuzzySet(config: PrismaConfig) {
	const fuzzySet = createFuzzySearch(0.8);

	const allManufacturers = await config.prisma.manufacturer.findMany({
		select: {
			id: true,
			name: true,
		},
	});
	for (const brewer of allManufacturers) {
		if (!fuzzySet.get(brewer.name)) {
			fuzzySet.add(brewer.name);
		}
	}

	return fuzzySet;
}

async function createNewProducts(
	products: AtvrProduct[],
	config: { prisma: PrismaClient },
	fuzzySet: any,
	imageCache: any,
) {
	const incomingCategories = Array.from(
		new Set(products.map((p) => p.ProductTasteGroup)),
	);
	const numExistingMatched = await config.prisma.productCategory.count({
		where: {
			atvrId: {
				in: incomingCategories,
			},
		},
	});

	if (incomingCategories.length - 1 === numExistingMatched) {
		return;
	}

	const knownCategories = await config.prisma.productCategory.findMany();
	const productsWithUnknownCategories = products.filter(
		(p) => !knownCategories.find((c) => c.atvrId === p.ProductTasteGroup),
	);

	if (productsWithUnknownCategories.length > 0) {
		const tasteGroupsByCategory = productsWithUnknownCategories.reduce<
			Record<string, string[]>
		>((byCategory, product) => {
			const key = product.ProductTasteGroup;
			const profiles = byCategory[key] || [];
			return {
				...byCategory,
				[key]: profiles.concat(product.ProductTasteGroup2),
			};
		}, {});
		const categoryTasteGroupsArr = Object.entries(tasteGroupsByCategory).map(
			([category, profiles]) => ({
				category,
				profiles,
			}),
		);

		const numCreatedCategories = await config.prisma.productCategory.createMany(
			{
				data: categoryTasteGroupsArr.map(({ category }) => ({
					atvrId: category,
					name: 'Unknown category',
					description: 'Unknown category',
				})),
			},
		);
		console.log(`[atvr] created ${numCreatedCategories} new categories`);

		const createdCategories = await config.prisma.productCategory.findMany({
			where: {
				atvrId: {
					in: categoryTasteGroupsArr.map(({ category }) => category),
				},
			},
		});

		const numCreatedProfiles = await config.prisma.tasteProfile.createMany({
			data: createdCategories.reduce<Prisma.TasteProfileCreateManyInput[]>(
				(profiles, category) => [
					...profiles,
					...tasteGroupsByCategory[category.atvrId].map((profile) => ({
						atvrId: profile,
						name: 'Unknown taste profile',
						description: 'Unknown taste profile',
						productCategoryId: category.id,
					})),
				],
				[],
			),
		});
		console.log(`[atvr] created ${numCreatedProfiles} new profiles`);
	}

	const categories = await config.prisma.productCategory.findMany({
		include: { tasteProfiles: { select: { id: true, atvrId: true } } },
	});
	type Category = typeof categories[number];
	const categoriesById = categories.reduce<Record<string, Category>>(
		(byAtvrId, category) => ({
			...byAtvrId,
			[category.atvrId]: category,
		}),
		{},
	);

	type CategoryProfile = Category['tasteProfiles'][number];

	const tasteProfilesById = categories.reduce<Record<string, CategoryProfile>>(
		(byId, category) => ({
			...byId,
			...category.tasteProfiles.reduce<
				Record<string, Category['tasteProfiles'][0]>
			>((byId, profile) => ({ ...byId, [profile.atvrId]: profile }), {}),
		}),
		{},
	);

	const manufacturers = await config.prisma.manufacturer.findMany();
	const manufacturersByName = manufacturers.reduce<
		Record<string, typeof manufacturers[number]>
	>(
		(byName, manufacturer) => ({
			...byName,
			[manufacturer.name]: manufacturer,
		}),
		{},
	);

	const productDescriptionsById = await Promise.all(
		products.map(async (p) => {
			const id = p.ProductID.toString();
			return {
				id,
				description: await getAtvrProductDescription(id),
			};
		}),
	).then((arr) =>
		arr.reduce<Record<string, string>>(
			(byId, item) => ({
				...byId,
				[item.id]: item.description,
			}),
			{},
		),
	);

	const result = await config.prisma.product.createMany({
		data: products.map((product) => {
			const atvrProductId = product.ProductID.toString();
			const maker =
				fuzzySet.get(product.ProductProducer) || product.ProductProducer;
			return {
				name: product.ProductName,
				description: productDescriptionsById[atvrProductId],
				manufacturerId: manufacturersByName[maker].id,
				containerType: parseContainerType(product.ProductContainerType),
				volume: product.ProductBottledVolume,
				alcohol: product.ProductAlchoholVolume,
				placeOfOrigin: product.ProductCountryOfOrigin,
				isTempProduct: product.ProductIsTemporaryOnSale,
				atvrId: product.ProductID.toString(),
				productCategoryId: categoriesById[product.ProductTasteGroup].id,
				tasteProfileId: tasteProfilesById[product.ProductTasteGroup2].id,
				image: imageCache[atvrProductId],
			};
		}),
	});

	console.log('[atvr] added %s new products', result.count);
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

	const newProducts = products.filter(
		(p) => !existingProductsByAtvrId[p.ProductID.toString()],
	);

	if (newProducts.length > 0) {
		await createNewProducts(newProducts, config, fuzzySet, imageCache);
	}

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
