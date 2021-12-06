import { LoaderFunction } from 'remix';
import { json, useLoaderData, useSearchParams } from 'remix';
import invariant from 'tiny-invariant';
import { ProductCard } from '~/components/product-card';
import { searchStoreInventory, SearchStoreInventory } from '~/data';

export const loader: LoaderFunction = async ({ params, request }) => {
	const atvrId = params.atvrId;

	const searchParams = new URL(request.url).searchParams;

	const query = searchParams.get('query');
	const page = parseInt(searchParams.get('page') || '0', 10);
	const take = parseInt(searchParams.get('take') || '10', 10);
	const skip = page * take;

	invariant(atvrId, 'Missing atvr id');
	invariant(query, 'Invalid query');

	const data = await searchStoreInventory(atvrId, { query, take, skip });

	return json(data, {
		headers: {
			// 'Cache-Control': `public, max-age=10, s-maxage=1200, stale-while-revalidate=2678400`,
		},
	});
};
export default function AtvrSearch() {
	const data = useLoaderData<SearchStoreInventory>();

	return (
		<>
			{data.map((item) => (
				<ProductCard key={item.id} {...item} />
			))}
		</>
	);
}

export function ErrorBoundary() {
	return <p>Error boundary</p>;
}

export function CatchBoundary() {
	return <p>Catch boundary</p>;
}
