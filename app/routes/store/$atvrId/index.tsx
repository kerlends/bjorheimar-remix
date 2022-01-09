import { LoaderFunction, useLoaderData } from 'remix';
import { json } from 'remix';
import invariant from 'tiny-invariant';
import { ProductCard } from '~/components/product-card';
import { getStoreInventory, GetStoreInventory } from '~/data';
import { authenticator } from '~/services/auth.server';

export const loader: LoaderFunction = async ({ params, request }) => {
	invariant(params.atvrId, 'Missing atvr id');
	const searchParams = new URL(request.url).searchParams;

	const page = parseInt(searchParams.get('page') || '0', 10);
	const take = parseInt(searchParams.get('take') || '10', 10);
	const skip = page * take;

	const productCategoryId = searchParams.get('category') ?? undefined;
	const tasteProfileId = searchParams.get('profile') ?? undefined;
	const user = await authenticator.isAuthenticated(request);

	const data = await getStoreInventory(params.atvrId, {
		take,
		skip,
		productCategoryId,
		tasteProfileId,
		showUnavailableProducts: user?.profile?.showUnavailableProducts ?? false,
	});

	return json(data, {
		headers: {
			// 'Cache-Control': `public, max-age=10, s-maxage=1200, stale-while-revalidate=2678400`,
		},
	});
};
export default function AtvrSlugIndex() {
	const data = useLoaderData<GetStoreInventory>();

	return (
		<>
			{data.inventory.map((item) => (
				<ProductCard key={item.id} {...item} />
			))}
		</>
	);
}
