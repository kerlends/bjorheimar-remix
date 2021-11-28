import { subDays } from 'date-fns';
import invariant from 'tiny-invariant';
import { db } from '~/utils/db.server';

export async function getCategories(atvrId?: string) {
	const totalCount = await db.productInventory.count({
		where: {
			store: { atvrId },
			latest: true,
			quantity: { gt: 0 },
		},
	});

	const productCategories = await db.productCategory.findMany({
		where: {
			Product: {
				some: {
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
	});

	const productCountsByCategoryId = await db.product.groupBy({
		by: ['productCategoryId'],
		orderBy: { productCategoryId: 'asc' },
		where: {
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
	});

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
	const totalItems = await db.productInventory.count({
		where: {
			store: { atvrId },
			product: {
				productCategoryId,
				tasteProfileId,
			},
			latest: true,
			quantity: { gt: 0 },
		},
	});

	const store = await db.store.findUnique({
		where: { atvrId },
		include: {
			inventory: {
				take,
				skip,
				where: {
					latest: true,
					quantity: { gt: 0 },
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

	return { store, totalItems, categories: await getCategories(atvrId) };
}
export type StoreInventory = AwaitedReturnType<typeof getStoreInventory>;
export type StoreInventoryItem = StoreInventory['store']['inventory'][number];

interface GetNewProductsOptions {
	take?: number;
	skip?: number;
}

export async function getNewProducts({
	take = 40,
	skip = 0,
}: GetNewProductsOptions = {}) {
	const totalItems = await db.product.count({
		where: {
			createdAt: {
				gte: subDays(new Date(), 14),
			},
		},
	});
	const products = await db.product.findMany({
		take,
		skip,
		orderBy: {
			createdAt: 'desc',
		},
		where: {
			createdAt: {
				gte: subDays(new Date(), 14),
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
	});

	return { totalItems, products };
}

export type NewProducts = typeof getNewProducts;
export type NewProductsResponse = AwaitedReturnType<NewProducts>;
export type NewProductsArgs = NonNullable<GetNewProductsOptions>;
