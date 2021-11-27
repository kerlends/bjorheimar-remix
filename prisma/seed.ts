import { PrismaClient } from '@prisma/client';
import inventorySeed from '../utils/sync/inventory';
import manufacturerSeed from '../utils/sync/brewers';
import categorySeed from '../utils/sync/categories';
import storeSeed from '../utils/sync/stores';

const prisma = new PrismaClient();

const seed = async () => {
	await storeSeed(prisma);
	await manufacturerSeed({ prisma });
	await categorySeed({ prisma });

	const stores = ['104', '110', '112'];

	for (const storeId of stores) {
		await inventorySeed({ prisma }, storeId);
	}
};

seed();
