import * as atvr from './client';

export default async function atvrStoreInventory(storeId: string) {
	const label = 'fetch:atvr-inventory';
	console.time(label);
	const { data, total } = await atvr.getDoSearch({
		shop: parseInt(storeId, 10),
		count: 500,
	});

	const products = data.concat();

	let index = data.length;
	while (index < total) {
		const { data } = await atvr.getDoSearch({
			shop: parseInt(storeId, 10),
			count: 500,
			skip: index,
		});

		products.push(...data);

		index += 500;
	}

	console.timeEnd(label);

	return products;
}
