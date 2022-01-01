import { redirect, Session } from 'remix';
import uuid from 'uuid';
import { commitSession, getSession } from '~/sessions/auth';

export async function getAuthSession(request: Request) {
	return await getSession(request.headers.get('Cookie'));
}

export function getAuthConfig() {
	return {
		clientId: process.env.AUTH0_CLIENT_ID as string,
		clientSecret: process.env.AUTH0_CLIENT_SECRET as string,
		callbackUrl: process.env.AUTH0_CALLBACK_URL as string,
		domain: process.env.AUTH0_DOMAIN as string,
	};
}

const sessionKeys = {
	idToken: 'auth0:id-token',
	token: 'auth0:access-token',
	state: 'auth0:state',
};

export async function getToken(request: Request) {
	const session = await getAuthSession(request);
	return {
		token: session.get(sessionKeys.token),
		idToken: session.get(sessionKeys.idToken),
	};
}

export function redirectUrl(state: string) {
	const auth0 = getAuthConfig();
	const url = new URL(`https://${auth0.domain}`);

	url.pathname = '/authorize';
	url.searchParams.set('response_type', 'code');
	url.searchParams.set('client_id', auth0.clientId);
	url.searchParams.set('redirect_uri', auth0.callbackUrl);
	url.searchParams.set('scope', 'openid profile email');
	url.searchParams.set('state', state);

	return url.href;
}

export async function authenticate(session: Session) {
	const config = getAuthConfig();
	console.log('[authenticate] session.data', session.data);
	const token = session.get(sessionKeys.token);
	if (token) {
		const user = await fetch(`https://${config.domain}/userinfo`, {
			headers: { Authorization: `Bearer ${token}` },
		});
		return { user, token };
	}

	return { user: null, token: null };
}

export async function login(session: Session) {
	session.unset(sessionKeys.token);
	session.unset(sessionKeys.idToken);

	const state = encodeURIComponent(uuid.v4());
	session.set(sessionKeys.state, state);

	return redirect(redirectUrl(state), {
		headers: {
			'Set-Cookie': await commitSession(session),
		},
	});
}

export async function callback(request: Request, session: Session) {
	const auth0 = getAuthConfig();
	const url = new URL(request.url);

	const state = url.searchParams.get('state');
	const sessionState = session.get(sessionKeys.state);

	console.log('[callback]', sessionKeys.state, sessionState);

	if (state === sessionState) {
		session.unset(sessionKeys.state);
	} else {
		return login(session);
	}

	const code = url.searchParams.get('code');

	const response = await fetch(
		new URL('/oauth/token', `https://${auth0.domain}`).href,
		{
			method: 'POST',
			headers: new Headers([['Content-Type', 'application/json']]),
			body: JSON.stringify({
				client_cecret: auth0.clientSecret,
				grant_type: 'authorization_code',
				redirect_uri: auth0.callbackUrl,
				client_id: auth0.clientId,
				code,
			}),
		},
	);

	type TokenResponse = { id_token: string; access_token: string; error: never };

	const body = (await response.json()) as TokenResponse | { error: string };

	const isSuccess = (body: any): body is TokenResponse => {
		return 'id_token' in body;
	};

	if (isSuccess(body)) {
		session.set(sessionKeys.idToken, body.id_token);
		console.log('session.data[before-commit]', session.data);
		//session.set(sessionKeys.token, body.access_token);
		const headers = {
			'Set-Cookie': await commitSession(session),
		};

		console.log('session.data[after-commit]', session.data);

		return redirect('/', {
			headers,
		});
	}

	return redirect('/', {
		status: 400,
		headers: {
			'Set-Cookie': await commitSession(session),
		},
	});
}

export async function authorize(session: Session) {
	try {
		const { user, token } = await authenticate(session);
		if (!user || !token) throw new Error('Unauthorized');
		return { user, token };
	} catch {
		session.unset(sessionKeys.idToken);

		const state = encodeURIComponent(uuid.v4());
		session.set(sessionKeys.state, state);

		return redirect(redirectUrl(state), {
			headers: {
				'Set-Cookie': await commitSession(session),
			},
		});
	}
}
