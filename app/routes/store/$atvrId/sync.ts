import type { ActionFunction } from 'remix';
import { json } from 'remix';
import invariant from 'tiny-invariant';
import { getCategories } from '~/data';
import { db } from '~/utils/db.server';
import { syncInventory } from '~/utils/sync';

export const action: ActionFunction = async ({ params, request }) => {
	invariant(typeof params.atvrId === 'string', 'Missing parameter: atvrId');
	try {
		const store = await syncInventory({ prisma: db }, params.atvrId);
		const [totalItems, categories] = await Promise.all([
			db.productInventory.count({
				where: {
					store: { atvrId: params.atvrId },
					latest: true,
					quantity: { gt: 0 },
				},
			}),
			getCategories(params.atvrId),
		]);
		return json({ store, totalItems, categories });
	} catch (error) {
		return json({ error }, { status: 400, statusText: 'Sync failed' });
	}
};
