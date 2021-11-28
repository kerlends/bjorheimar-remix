import {
	Link,
	Links,
	LiveReload,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useCatch,
	useLoaderData,
} from 'remix';
import type { LoaderFunction, LinksFunction } from 'remix';
import tailwindStyles from './styles/app.css';
import { db } from '~/utils/db.server';

import { Sidebar } from '~/components/sidebar';

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

async function getAllStores() {
	return await db.store.findMany({
		select: {
			atvrId: true,
			name: true,
			hours: {
				select: {
					opensAt: true,
					closesAt: true,
					weekday: true,
				},
			},
		},
		orderBy: {
			atvrId: 'asc',
		},
	});
}

export type LoaderData = AwaitedReturnType<typeof getAllStores>;

export const loader: LoaderFunction = () => {
	return getAllStores();
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
					<p>
						Hey, developer, you should replace this with what you want your
						users to see.
					</p>
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
	const data = useLoaderData<LoaderData>();
	return (
		<div className="flex">
			<Sidebar stores={data} />
			<main className="flex-1">{children}</main>
		</div>
	);
}
