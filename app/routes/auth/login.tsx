import type { LoaderFunction } from 'remix';
import { getSession } from '~/sessions/auth';
import { login } from '~/utils/auth.server';

export const loader: LoaderFunction = async ({ request }) => {
	const session = await getSession(request.headers.get('Cookie'));
	return await login(session);
};
