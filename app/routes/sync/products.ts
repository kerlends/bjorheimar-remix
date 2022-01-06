import { ActionFunction, json, redirect } from 'remix';
import { authenticator, verifyMachineToken } from '~/services/auth.server';
import { db } from '~/utils/db.server';
import productsSeed from '~/utils/sync/products';

export const action: ActionFunction = async ({ request }) => {
	const user = await authenticator.isAuthenticated(request);
	if (user?.roles.includes('admin')) {
		await productsSeed({ prisma: db });
	} else if (request.headers.has('authorization')) {
		const token =
			request.headers.get('authorization')?.replace('Bearer ', '') ?? '';

		if (await verifyMachineToken(token)) {
			await productsSeed({ prisma: db });
		}

		return json({ success: true });
	}
	return redirect('/');
};
