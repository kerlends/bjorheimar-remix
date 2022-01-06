import { LoaderFunction, redirect } from 'remix';

import { authenticator } from '~/services/auth.server';

export let loader: LoaderFunction = async ({ request }) => {
	return await authenticator.authenticate('auth0', request, {
		successRedirect: '/',
		failureRedirect: '/',
	});
};
