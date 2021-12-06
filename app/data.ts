import type { Prisma } from '@prisma/client';
import { subDays } from 'date-fns';
import invariant from 'tiny-invariant';
import { db } from '~/utils/db.server';

function parseNumericQuery(query: string): Prisma.FloatFilter | null {
	console.log('Parsing query:', query);
	const numericMatch = query.match(
		/(?<quantifier>\>|\<|=|\>=|\<=)?(?<value>\d+(\.?\d+)?)/,
	);
	console.log('Query parsed with result:', numericMatch);

	if (numericMatch?.groups?.value) {
		const { quantifier, value } = numericMatch.groups;
		const parsedValue = parseFloat(value);
		switch (quantifier) {
			case '>':
				return { gt: parsedValue };
			case '<':
				return { lt: parsedValue };
			case '>=':
				return { gte: parsedValue };
			case '<=':
				return { lte: parsedValue };
			default:
				return { equals: parsedValue };
		}
	}
	return null;
}

function getProductFilter(query: string = ''): Prisma.ProductWhereInput {
	if (!query) return {};

	const floatFilter = parseNumericQuery(query);
	if (floatFilter) {
		return { alcohol: floatFilter };
	}

	return {
		OR: [
			{
				name: { contains: query, mode: 'insensitive' },
			},
			{
				placeOfOrigin: { contains: query, mode: 'insensitive' },
			},
			{
				tasteProfile: {
					name: { contains: query, mode: 'insensitive' },
				},
			},
			{
				category: { name: { contains: query, mode: 'insensitive' } },
			},
		],
	};
}

export async function getAllStores() {
	return await db.store.findMany({
		select: {
			atvrId: true,
			name: true,
			hours: {
				select: {
					opensAt: true,
					closesAt: true,
					weekday: true,
				},
			},
		},
		orderBy: {
			atvrId: 'asc',
		},
	});
}
export type GetAllStores = AwaitedReturnType<typeof getAllStores>;

export async function getCategories(atvrId?: string, query?: string) {
	const whereProduct = getProductFilter(query);

	const [totalCount, productCategories, productCountsByCategoryId] =
		await Promise.all([
			db.productInventory.count({
				where: {
					store: { atvrId },
					latest: true,
					quantity: { gt: 0 },
					product: whereProduct,
				},
			}),
			db.productCategory.findMany({
				where: {
					Product: {
						some: {
							...whereProduct,
							inventory: {
								some: {
									store: { atvrId },
									quantity: { gt: 0 },
									latest: true,
								},
							},
						},
					},
				},
				orderBy: {
					Product: {
						_count: 'desc',
					},
				},
				select: {
					id: true,
					name: true,
					_count: {
						select: {
							Product: true,
						},
					},
					tasteProfiles: {
						select: {
							id: true,
							name: true,
							_count: {
								select: {
									Product: true,
								},
							},
						},
					},
				},
			}),
			db.product.groupBy({
				by: ['productCategoryId'],
				orderBy: { productCategoryId: 'asc' },
				where: {
					...whereProduct,
					inventory: {
						some: {
							store: { atvrId },
							quantity: { gt: 0 },
							latest: true,
						},
					},
				},
				_count: {
					_all: true,
				},
			}),
		]);

	const countsByCategoryId = productCountsByCategoryId.reduce<{
		[key: string]: number;
	}>(
		(byId, counts) => ({
			...byId,
			[counts.productCategoryId]: counts._count._all,
		}),
		{},
	);

	const categoriesWithCounts = productCategories
		.filter((cat) => !!countsByCategoryId[cat.id])
		.map((cat) => ({
			...cat,
			counts: countsByCategoryId[cat.id],
		}));

	return { totalCount, categories: categoriesWithCounts };
}

export type GetCategories = AwaitedReturnType<typeof getCategories>;
export type GetCategoriesItem = GetCategories['categories'][number];

export interface SearchStoreInventoryOptions {
	query: string;
	take?: number;
	skip?: number;
}

export async function searchStoreInventory(
	atvrId: string,
	{ query, take = 15, skip = 0 }: SearchStoreInventoryOptions,
) {
	return await db.productInventory.findMany({
		orderBy: { product: { createdAt: 'desc' } },
		take,
		skip,
		where: {
			store: { atvrId },
			latest: true,
			product: getProductFilter(query),
		},
		include: {
			product: {
				select: {
					volume: true,
					description: true,
					atvrId: true,
					name: true,
					alcohol: true,
					image: true,
					createdAt: true,
					tasteProfile: {
						select: {
							name: true,
						},
					},
					manufacturer: {
						select: {
							name: true,
						},
					},
				},
			},
		},
	});
}

export type SearchStoreInventory = AwaitedReturnType<
	typeof searchStoreInventory
>;

export interface GetStoreSummaryOptions {
	productCategoryId?: string;
	tasteProfileId?: string;
	query?: string;
}

export async function getStoreSummary(
	atvrId: string,
	{ productCategoryId, tasteProfileId, query }: GetStoreSummaryOptions,
) {
	const [totalItems, store, categories, lastInventoryEntry] = await Promise.all(
		[
			db.productInventory.count({
				where: {
					store: { atvrId },
					product: {
						productCategoryId,
						tasteProfileId,
						...getProductFilter(query),
					},
					latest: true,
				},
			}),
			db.store.findUnique({
				where: { atvrId },
			}),
			getCategories(atvrId, query),
			db.productInventory.findFirst({
				where: {
					store: { atvrId },
					latest: true,
				},
				orderBy: { createdAt: 'desc' },
				select: {
					createdAt: true,
				},
			}),
		],
	);

	invariant(store !== null, `Store not found with id "${atvrId}"`);

	return {
		store,
		totalItems,
		categories,
		lastSync: lastInventoryEntry?.createdAt ?? null,
	};
}

export type GetStoreSummary = AwaitedReturnType<typeof getStoreSummary>;
export interface GetStoreInventoryOptions {
	take: number;
	skip: number;
	productCategoryId?: string;
	tasteProfileId?: string;
}

export async function getStoreInventory(
	atvrId: string,
	{ take, skip, productCategoryId, tasteProfileId }: GetStoreInventoryOptions,
) {
	const store = await db.store.findUnique({
		where: { atvrId },
		include: {
			inventory: {
				take,
				skip,
				where: {
					latest: true,
					// quantity: { gt: 0 },
					product: { productCategoryId, tasteProfileId },
				},
				orderBy: { product: { createdAt: 'desc' } },
				include: {
					product: {
						select: {
							volume: true,
							description: true,
							atvrId: true,
							name: true,
							alcohol: true,
							image: true,
							createdAt: true,
							tasteProfile: {
								select: {
									name: true,
								},
							},
							manufacturer: {
								select: {
									name: true,
								},
							},
						},
					},
				},
			},
		},
	});

	invariant(store !== null, `Store not found with id "${atvrId}"`);

	return store;
}

export type GetStoreInventory = AwaitedReturnType<typeof getStoreInventory>;
export type GetStoreInventoryItem = GetStoreInventory['inventory'][number];

interface GetNewProductsOptions {
	take?: number;
	skip?: number;
}

export async function getNewProducts({
	take = 40,
	skip = 0,
}: GetNewProductsOptions = {}) {
	const [totalItems, products] = await Promise.all([
		db.product.count({
			where: {
				createdAt: {
					gte: subDays(new Date(), 14),
				},
			},
		}),

		db.product.findMany({
			take,
			skip,
			orderBy: {
				createdAt: 'desc',
			},
			where: {
				createdAt: {
					gte: subDays(new Date(), 60),
				},
			},
			include: {
				tasteProfile: {
					select: {
						id: true,
						atvrId: true,
						name: true,
					},
				},
				manufacturer: {
					select: { name: true },
				},
				inventory: {
					where: {
						quantity: { gt: 0 },
						latest: { equals: true },
					},
					orderBy: {
						store: { atvrId: 'asc' },
					},
					select: {
						store: {
							select: {
								id: true,
								atvrId: true,
								name: true,
							},
						},
						quantity: true,
					},
				},
			},
		}),
	]);

	return { totalItems, products };
}

export type GetNewProducts = AwaitedReturnType<typeof getNewProducts>;
export type GetNewProductsItem = GetNewProducts['products'][number];
export type GetNewProductsArgs = NonNullable<GetNewProductsOptions>;
