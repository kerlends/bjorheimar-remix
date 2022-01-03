import { LoaderFunction, redirect } from 'remix';

import { db } from '~/utils/db.server';

import manufacturerSeed from '~/utils/sync/brewers';
import categorySeed from '~/utils/sync/categories';
import productsSeed from '~/utils/sync/products';

export const loader: LoaderFunction = async () => {
	await manufacturerSeed({ prisma: db });
	await categorySeed({ prisma: db });
	await productsSeed({ prisma: db });
	return redirect('/', { status: 201, statusText: 'Sync successful' });
};

export default function SyncIndexRoute() {
	return <p>You shouldn't see this</p>;
}
