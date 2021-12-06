import type { ActionFunction } from 'remix';
import { redirect } from 'remix';
import invariant from 'tiny-invariant';
import { db } from '~/utils/db.server';
import { syncInventory } from '~/utils/sync';

export const action: ActionFunction = async ({ params, request }) => {
	invariant(typeof params.atvrId === 'string', 'Missing parameter: atvrId');
	try {
		await syncInventory({ prisma: db }, params.atvrId);
		return redirect(`/store/${params.atvrId}`);
	} catch (error) {
		throw redirect(`/store/${params.atvrId}`);
	}
};
