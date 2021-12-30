import FussySet from 'fuzzyset';

export function createFuzzySearch(threshold: number = 0.8) {
	const fussySet = FussySet();

	return {
		add: (value: string) => fussySet.add(value),
		get: (value: string) => {
			// @ts-ignore
			const matches = fussySet.get(value, null, threshold);
			if (!matches) return null;

			let topMatch = matches[0];

			for (const match of matches) {
				if (match[0] > topMatch[0]) {
					topMatch = match;
				}
			}

			return topMatch[1];
		},
	};
}
