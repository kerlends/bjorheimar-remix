import type { User } from '@prisma/client';
import jwtDecode from 'jwt-decode';
import { Authenticator } from 'remix-auth';
import { Auth0Strategy } from 'remix-auth-auth0';
import { sessionStorage } from '~/services/session.server';
import { db } from '~/utils/db.server';
import { env } from '~/utils/env';
import jose from 'jose';

// Create an instance of the authenticator, pass a generic with what
// strategies will return and will store in the session
export const authenticator = new Authenticator<User>(sessionStorage);

const auth0Strategy = new Auth0Strategy(
	{
		callbackURL: env('AUTH0_CALLBACK_URL'),
		clientID: env('AUTH0_CLIENT_ID'),
		clientSecret: env('AUTH0_CLIENT_SECRET'),
		domain: env('AUTH0_DOMAIN'),
		scope: 'openid profile email roles',
	},
	async ({ accessToken, refreshToken, extraParams, profile }) => {
		const json = profile._json as any;
		const roles = json['http://bjorheimar/claims/roles'];

		console.log({ json, roles });

		// Get the user data from your DB or API using the tokens and profile
		return await db.user.upsert({
			where: {
				email: profile.emails[0].value,
			},
			create: {
				firstName: profile.name.givenName,
				lastName: profile.name.familyName,
				email: profile.emails[0].value,
				roles: { set: roles },
			},
			update: {
				lastLogin: new Date(),
				roles: { set: roles },
			},
		});
	},
);

authenticator.use(auth0Strategy);

export async function getUserInfo(token: string) {
	const url = `https://${env('AUTH0_DOMAIN')}/userinfo`;
	const data = await fetch(url, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	}).then((e) => e.json());
	return data;
}

export async function verifyMachineToken(jwt: string) {
	const url = `https://${env('AUTH0_DOMAIN')}/.well-known/jwks.json`;
	const { keys } = await fetch(url).then((e) => e.json());
	const jwk = await jose.importJWK(keys[0]);

	try {
		const data = await jose.jwtVerify(jwt, jwk);
		return Boolean(data.protectedHeader);
	} catch {
		return false;
	}
}
