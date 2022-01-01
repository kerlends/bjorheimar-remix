import type { ActionFunction, LoaderFunction } from 'remix';
import { getSession } from '~/sessions/auth';
import { callback } from '~/utils/auth.server';

export const loader: LoaderFunction = async ({ request }) => {
	const session = await getSession(request.headers.get('Cookie'));
	return await callback(request, session);
};
