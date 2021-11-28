import axios from 'axios';
import { createFuzzySearch } from '../fuzzy';
import {
	AtvrStore,
	AtvrTaste2Category,
	AtvrTasteCategory,
	DoSearchInput,
	DoSearchResponse,
} from './types';
import beerTastes from './beer-tastes.json';

const client = axios.create({
	baseURL:
		'https://www.vinbudin.is/addons/origo/module/ajaxwebservices/search.asmx',
	headers: {
		'Content-Type': 'application/json',
	},
	transformResponse: (response) => {
		const json = JSON.parse(response);
		return JSON.parse(json.d);
	},
});

let cachedProducers: string[] = [];

export async function getProducers() {
	if (cachedProducers.length === 0) {
		const { data } = await client.get<string[]>('/GetProducers', {
			params: {
				category: 'beer',
			},
		});

		cachedProducers = data;
	}

	return cachedProducers;
}

export async function getFuzzyBrewerSet() {
	const brewers = await getProducers();
	const fuzzySet = createFuzzySearch();
	for (const brewer of brewers) {
		const match = fuzzySet.get(brewer);
		if (match === null) {
			fuzzySet.add(brewer);
		}
	}
	return fuzzySet;
}

export async function getStores() {
	const { data } = await client.get<AtvrStore[]>('/GetAllShops');
	return data;
}

export async function getDoSearch({
	shop,
	category = 'beer',
	skip = 0,
	count = 100,
	orderBy = 'price',
	sortOrder = 'desc',
}: DoSearchInput = {}) {
	const fuzzyBrewerSet = await getFuzzyBrewerSet();

	const orderByParam = Object.entries(orderBy).map(
		([key, order]) => `${key} ${order}`,
	)[0];
	const { data } = await client.get<DoSearchResponse>('/DoSearch', {
		params: {
			shop,
			category,
			skip,
			count,
			orderBy: orderByParam,
		},
	});

	data.data.forEach((entry) => {
		const matchedBrewer = fuzzyBrewerSet.get(entry.ProductProducer);
		if (matchedBrewer !== null) {
			entry.ProductProducer = matchedBrewer;
		}
	});

	return {
		...data,
		data: data.data.map((entry) => {
			const matchedBrewer = fuzzyBrewerSet.get(entry.ProductProducer);
			return {
				...entry,
				ProductProducer:
					matchedBrewer === null ? entry.ProductProducer : matchedBrewer,
			};
		}),
	};
}

export async function getTasteCategories() {
	return beerTastes as AtvrTasteCategory[];
}

export async function getTasteSubcategories(tasteId: string) {
	const { data } = await client.get('/GetAllTaste2Categories', {
		params: {
			supertaste: tasteId,
		},
	});
	return data as AtvrTaste2Category[];
}

/*
getDoSearch()
  .then(async (data) => {
    await fs.writeFile(
      process.cwd() + "/do-search.json",
      JSON.stringify(data, null, 2)
    );
  })
  .catch((error) => console.error(error));

*/
