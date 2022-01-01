import {
	createCookieSessionStorage,
	createMemorySessionStorage,
	createCookie,
} from 'remix';

const isProd = process.env.NODE_ENV === 'production';
const cookieLifetime = 60 * 1000 * 60 * 24;

const cookie = createCookie('auth-session', {
	secrets: [process.env.SECRET as string],
	// secure: process.env.NODE_ENV === 'production',
	httpOnly: true,
	expires: new Date(Date.now() + cookieLifetime),
});

export const { getSession, commitSession, destroySession } = isProd
	? createCookieSessionStorage({ cookie })
	: createCookieSessionStorage({ cookie });
