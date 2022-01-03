import { PrismaClient } from '@prisma/client';
import { createFuzzySearch } from '../fuzzy';
import * as atvr from '../atvr/client';

interface PrismaConfig {
	prisma: PrismaClient;
}

export default async function syncManufacturers(config: PrismaConfig) {
	const fuzzySet = createFuzzySearch(0.8);

	const allManufacturers = await config.prisma.manufacturer.findMany();
	for (const brewer of allManufacturers) {
		if (!fuzzySet.get(brewer.name)) {
			fuzzySet.add(brewer.name);
		}
	}

	let manufacturers = (await atvr.getProducers())
		.filter((brewer) => {
			const exists = fuzzySet.get(brewer);
			if (!exists) {
				console.log('Found new brewer: %s', brewer);
			}
			return !exists;
		})
		.map((brewer) => fuzzySet.get(brewer) || brewer) as string[];

	if (manufacturers.length > 0) {
		console.log('Adding %s new brewers', manufacturers.length);
		await config.prisma.manufacturer.createMany({
			data: manufacturers.map((brewer) => ({
				name: brewer,
			})),
		});
	} else {
		console.log('No new brewers found');
	}
}
