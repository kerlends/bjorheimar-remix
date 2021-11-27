import type { ActionFunction } from 'remix';
import { json } from 'remix';
import invariant from 'tiny-invariant';

export const action: ActionFunction = async ({ params }) => {
	invariant(typeof params.atvrId === 'string', 'Missing parameter: atvrId');

	const url = new URL(
		'https://us-central1-bjorheimar.cloudfunctions.net/syncStore',
	);
	url.searchParams.set('storeId', params.atvrId);

	const result = await fetch(url.href, { method: 'POST' });

	return json(result);
};
