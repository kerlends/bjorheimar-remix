import { PrismaClient } from '@prisma/client';
import { AtvrTaste2Category, AtvrTasteCategory } from '../atvr/types';
import * as atvr from '../atvr/client';

interface PrismaConfig {
	prisma: PrismaClient;
}

export default async function syncCategories(config: PrismaConfig) {
	const categories = await atvr.getTasteCategories();
	const subcategories = (
		await Promise.all(
			categories.map(async (cat) => ({
				categoryId: cat.id,
				subcategories: await atvr.getTasteSubcategories(cat.id),
			})),
		)
	).reduce<Record<string, AtvrTaste2Category[]>>(
		(byId, subcat) => ({
			...byId,
			[subcat.categoryId]: subcat.subcategories,
		}),
		{},
	);

	const transactions = categories.map((cat) => {
		return config.prisma.productCategory.upsert({
			where: {
				atvrId: cat.id,
			},
			create: {
				atvrId: cat.id,
				name: cat.description,
				description: cat.description,
				tasteProfiles: {
					createMany: {
						data: subcategories[cat.id].map((profile) => ({
							name: profile.Description,
							description: profile.Description,
							atvrId: profile.id,
						})),
					},
				},
			},
			update: {
				tasteProfiles: {
					upsert: subcategories[cat.id].map((profile) => ({
						where: {
							atvrId: profile.id,
						},
						create: {
							atvrId: profile.id,
							name: profile.Description,
							description: profile.Description,
						},
						update: {},
					})),
				},
			},
		});
	});

	await config.prisma.$transaction(transactions);
}
