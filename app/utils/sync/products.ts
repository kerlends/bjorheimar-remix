import { PrismaClient, ContainerType } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { createFuzzySearch } from '../fuzzy';
import { uploadImage } from '../cloudinary.server';
import getAtvrStoreInventory from '../atvr/atvr-store-inventory';
import { AtvrProduct } from '../atvr/types';
import { getAtvrProductDescription } from '~/utils/atvr-description';
import atvrAllProducts from '../atvr/atvr-all-products';

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

async function getExistingProducts(config: PrismaConfig) {
	const existingProducts = await config.prisma.product.findMany({
		select: {
			id: true,
			atvrId: true,
			image: true,
		},
	});

	return existingProducts.reduce<
		Record<string, { id: string; atvrId: string; image: string | null }>
	>(
		(byId, product) => ({
			...byId,
			[product.atvrId]: product,
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
	let fallbackCategory = await config.prisma.productCategory.findUnique({
		where: {
			name: 'None',
		},
		include: {
			tasteProfiles: true,
		},
	});
	if (!fallbackCategory) {
		fallbackCategory = await config.prisma.productCategory.create({
			data: {
				name: 'None',
				atvrId: 'NONE',
				description: 'No product category',
				tasteProfiles: {
					connectOrCreate: [
						{
							where: {
								name: 'None',
							},
							create: {
								name: 'None',
								description: 'No taste profile',
								atvrId: 'NONE',
							},
						},
					],
				},
			},
			include: {
				tasteProfiles: true,
			},
		});
	}

	const fallbackTasteProfile = fallbackCategory.tasteProfiles[0];

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
			const manufacturerId = manufacturersByName[maker]?.id;
			const productCategoryId =
				categoriesById[product.ProductTasteGroup]?.id || fallbackCategory?.id;
			const tasteProfileId =
				tasteProfilesById[product.ProductTasteGroup2]?.id ||
				fallbackTasteProfile.id;

			if (!manufacturerId) {
				throw new Error(
					`No brewer with name "${maker}" found (original: "${product.ProductProducer}")`,
				);
			}

			if (!productCategoryId) {
				throw new Error(
					`No product category with name "${product.ProductTasteGroup}" found`,
				);
			}

			if (!tasteProfileId) {
				throw new Error(
					`No taste profile with name "${product.ProductTasteGroup2}" found (under category "${product.ProductTasteGroup}", original: "${product.ProductProducer}")`,
				);
			}

			return {
				name: product.ProductName,
				description: productDescriptionsById[atvrProductId],
				manufacturerId,
				containerType: parseContainerType(product.ProductContainerType),
				volume: product.ProductBottledVolume,
				alcohol: product.ProductAlchoholVolume,
				placeOfOrigin: product.ProductCountryOfOrigin,
				isTempProduct: product.ProductIsTemporaryOnSale,
				atvrId: product.ProductID.toString(),
				productCategoryId,
				tasteProfileId,
				image: imageCache[atvrProductId],
			};
		}),
	});

	console.log('[atvr] added %s new products', result.count);
}

export default async function updateProducts(config: PrismaConfig) {
	const products = await atvrAllProducts();
	const existingProductsByAtvrId = await getExistingProducts(config);
	const imageCache = await buildImageCache(products, existingProductsByAtvrId);
	const fuzzySet = await getManufacturersFuzzySet(config);

	const newProducts = products.filter(
		(p) => !existingProductsByAtvrId[p.ProductID.toString()],
	);

	if (newProducts.length > 0) {
		await createNewProducts(newProducts, config, fuzzySet, imageCache);
		console.log('Added %s new products', newProducts.length);
	} else {
		console.log('No new products found');
	}
}
