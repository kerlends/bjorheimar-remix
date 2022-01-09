import { Form, json, redirect, useLoaderData } from 'remix';
import type { ActionFunction, LoaderFunction } from 'remix';
import { Switch } from '~/components/switch';
import { Button } from '~/components/button';
import { authenticator } from '~/services/auth.server';
import { db } from '~/utils/db.server';
import { Profile } from '@prisma/client';
import { commitSession, getSession } from '~/services/session.server';

interface UserPreferences {
	showUnavailableProducts?: boolean;
}

export const loader: LoaderFunction = async ({ request }) => {
	const user = await authenticator.isAuthenticated(request);
	if (!user) {
		return redirect('/');
	}
	return json(user.profile);
};

export const action: ActionFunction = async ({ request }) => {
	const user = await authenticator.isAuthenticated(request, {
		failureRedirect: '/',
	});

	const form = await request.formData();
	const showUnavailableProducts = form.get('showUnavailableProducts') === 'on';

	const updatedUser = await db.user.update({
		include: { profile: true },
		where: { id: user.id },
		data: {
			profile: {
				upsert: {
					create: { showUnavailableProducts },
					update: { showUnavailableProducts },
				},
			},
		},
	});

	const session = await getSession(request.headers.get('cookie'));
	session.set(authenticator.sessionKey, updatedUser);

	return json(updatedUser, {
		headers: {
			'Set-Cookie': await commitSession(session),
		},
	});
};

export default function ProfileRoute() {
	const data = useLoaderData<Profile>();
	return (
		<div className="p-4">
			<h1 className="mb-8">Profile settings</h1>
			<div>
				<div className="p-4 shadow-md max-w-lg">
					<h2 className="mb-4">Preferences</h2>
					<Form method="post">
						<div className="mb-7">
							<Switch
								name="showUnavailableProducts"
								id="showUnavailableProducts"
								label="Show unavailable products"
								defaultChecked={data.showUnavailableProducts ?? false}
							/>
						</div>
						<div className="mt-4 flex justify-end">
							<Button color="success" type="submit">
								Update
							</Button>
						</div>
					</Form>
				</div>
			</div>
		</div>
	);
}
