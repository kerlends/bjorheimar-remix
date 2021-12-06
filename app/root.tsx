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
} from 'remix';
import type { LoaderFunction, LinksFunction } from 'remix';

import { Sidebar } from '~/components/sidebar';
import { Overlay } from '~/components/overlay';
import { Spinner } from '~/components/spinner';

import tailwindStyles from './styles/app.css';
import { GetAllStores, getAllStores } from './data';

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
			href: 'https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,700;1,400&display=swap',
		},
		{ rel: 'stylesheet', href: tailwindStyles },
	];
};

const dayInSeconds = 60 * 60 * 24;
export const loader: LoaderFunction = async () => {
	const stores = await getAllStores();
	return json(stores, {
		headers: {
			'Cache-Control': `public, max-age=${dayInSeconds}, s-maxage=${dayInSeconds}, stale-while-revalidate=2678400`,
		},
	});
};

export const unstable_shouldReload = () => false;

export default function App() {
	return (
		<Document title="Bjorheimar">
			<Layout>
				<Outlet />
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
	const data = useLoaderData<GetAllStores>();
	const transition = useTransition();
	const isLoading = transition.state === 'loading';

	return (
		<div className="flex">
			<Sidebar stores={data} />
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
