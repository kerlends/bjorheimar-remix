import { ActionFunction, LoaderFunction, redirect } from 'remix';

import { authenticator } from '~/services/auth.server';

export let loader: LoaderFunction = () => {
	return redirect('/');
};

export let action: ActionFunction = ({ request }) => {
	return authenticator.authenticate('auth0', request);
};
