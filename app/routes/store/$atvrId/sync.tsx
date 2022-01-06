import { ActionFunction, useCatch } from 'remix';
import { redirect } from 'remix';
import invariant from 'tiny-invariant';
import { authenticator, verifyMachineToken } from '~/services/auth.server';
import { db } from '~/utils/db.server';
import { syncInventory } from '~/utils/sync';

export const action: ActionFunction = async ({ params, request }) => {
	invariant(typeof params.atvrId === 'string', 'Missing parameter: atvrId');
	const user = await authenticator.isAuthenticated(request);
	if (user?.roles.includes('admin')) {
		await syncInventory({ prisma: db }, params.atvrId);
	} else if (request.headers.has('authorization')) {
		const token =
			request.headers.get('authorization')?.replace('Bearer ', '') ?? '';

		if (await verifyMachineToken(token)) {
			await syncInventory({ prisma: db }, params.atvrId);
		}
	}
	return redirect(`/store/${params.atvrId}`);
};

export function ErrorBoundary({ error }: { error: Error }) {
	console.error(error);
	return (
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
	);
}

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
		<div>
			<h1>
				{caught.status}: {caught.statusText}
			</h1>
			{message}
		</div>
	);
}
