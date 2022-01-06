import { LoaderFunction, redirect } from 'remix';
import { authenticator, verifyMachineToken } from '~/services/auth.server';

import { db } from '~/utils/db.server';

import manufacturerSeed from '~/utils/sync/brewers';
import categorySeed from '~/utils/sync/categories';

export const action: LoaderFunction = async ({ request }) => {
	const user = await authenticator.isAuthenticated(request);
	if (user?.roles.includes('admin')) {
		await manufacturerSeed({ prisma: db });
		await categorySeed({ prisma: db });
	} else if (request.headers.has('authorization')) {
		const token =
			request.headers.get('authorization')?.replace('Bearer ', '') ?? '';

		if (await verifyMachineToken(token)) {
			await manufacturerSeed({ prisma: db });
			await categorySeed({ prisma: db });
		}
	}
	return redirect('/');
};
