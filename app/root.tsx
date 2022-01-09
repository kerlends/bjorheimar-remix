import {
	Links,
	LiveReload,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useCatch,
	useLoaderData,
	json,
	useTransition,
	redirect,
	Link,
} from 'remix';
import type { ActionFunction, LoaderFunction, LinksFunction } from 'remix';

import { Sidebar } from '~/components/sidebar';
import { Overlay } from '~/components/overlay';
import { Spinner } from '~/components/spinner';

import tailwindStyles from './styles/app.css';
import { getAllStores } from './data';
import { authenticator } from './services/auth.server';

export const links: LinksFunction = () => {
	return [
		{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
		{
			rel: 'preconnect',
			href: 'https://fonts.gstatic.com',
			crossOrigin: 'anonymous',
		},
		{
			rel: 'stylesheet',
			href: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap',
		},
		{ rel: 'stylesheet', href: tailwindStyles },
	];
};

async function getLoaderData(request: Request) {
	const stores = await getAllStores();
	const user = await authenticator.isAuthenticated(request);
	return { stores, user, isAdmin: user?.roles.includes('admin') ?? false };
}

type Data = AwaitedReturnType<typeof getLoaderData>;

const dayInSeconds = 60 * 60 * 24;
export const loader: LoaderFunction = async ({ request }) => {
	const data = await getLoaderData(request);

	return json(data, {
		headers: {
			'Cache-Control': `public, max-age=${dayInSeconds}, s-maxage=${dayInSeconds}, stale-while-revalidate=2678400`,
		},
	});
};

export const action: ActionFunction = async ({ request }) => {
	const form = await request.formData();
	console.log('form values', Array.from(form.entries()));
	return redirect(request.url);
};

export const unstable_shouldReload = () => false;

export default function App() {
	const { isAdmin } = useLoaderData<Data>();
	return (
		<Document title="Bjorheimar">
			<Layout>
				<Outlet context={{ isAdmin }} />
			</Layout>
		</Document>
	);
}

// https://remix.run/docs/en/v1/api/conventions#errorboundary
export function ErrorBoundary({ error }: { error: Error }) {
	console.error(error);
	return (
		<Document title="Error!">
			<Layout>
				<div>
					<h1>There was an error</h1>
					<p>{error.message}</p>
					<hr />
					{error.stack && (
						<code>
							<pre>{error.stack}</pre>
						</code>
					)}
				</div>
			</Layout>
		</Document>
	);
}

// https://remix.run/docs/en/v1/api/conventions#catchboundary
export function CatchBoundary() {
	let caught = useCatch();

	let message;
	switch (caught.status) {
		case 401:
			message = (
				<p>
					Oops! Looks like you tried to visit a page that you do not have access
					to.
				</p>
			);
			break;
		case 404:
			message = (
				<p>Oops! Looks like you tried to visit a page that does not exist.</p>
			);
			break;

		default:
			throw new Error(caught.data || caught.statusText);
	}

	return (
		<Document title={`${caught.status} ${caught.statusText}`}>
			<Layout>
				<h1>
					{caught.status}: {caught.statusText}
				</h1>
				{message}
			</Layout>
		</Document>
	);
}

function Document({
	children,
	title,
}: {
	children: React.ReactNode;
	title?: string;
}) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				{title ? <title>{title}</title> : null}
				<Meta />
				<Links />
			</head>
			<body>
				{children}
				<ScrollRestoration />
				<Scripts />
				{process.env.NODE_ENV === 'development' && <LiveReload />}
			</body>
		</html>
	);
}

function Layout({ children }: { children: React.ReactNode }) {
	const data = useLoaderData<Data>();
	const transition = useTransition();
	const isLoading = transition.state === 'loading';

	return (
		<div className="flex">
			<Sidebar stores={data.stores} user={data.user} />
			<main className="flex-1 relative ml-20 md:ml-60">
				{isLoading && (
					<Overlay open>
						<Spinner />
					</Overlay>
				)}
				{children}
			</main>
		</div>
	);
}
