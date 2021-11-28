import format from 'date-fns/format';
import parseISO from 'date-fns/parseISO';
import {
	HeadersFunction,
	LoaderFunction,
	MetaFunction,
	useLoaderData,
	useSearchParams,
	useTransition,
	json,
} from 'remix';
import invariant from 'tiny-invariant';
import { PaginationButton } from '~/components/pagination-button';
import { NewProductCard } from '~/components/new-product-card';
import { getNewProducts, NewProductsResponse } from '~/data';

function formatTime(date: string) {
	const parsed = parseISO(date);
	return format(parsed, 'HH:mm, dd.MM.yyyy');
}

export const headers: HeadersFunction = ({ loaderHeaders }) => {
	return {
		'Cache-Control': loaderHeaders.get('Cache-Control') || 'public, max-age=10',
	};
};

export let meta: MetaFunction = () => {
	return {
		title: 'Bjórheimar',
		description: 'I liek beer',
	};
};

export const loader: LoaderFunction = async ({ params, request, ...rest }) => {
	const searchParams = new URL(request.url).searchParams;

	const page = parseInt(searchParams.get('page') || '0', 10);
	const take = parseInt(searchParams.get('take') || '25', 10);
	const skip = page * take;

	const data = await getNewProducts({
		take,
		skip,
	});

	return json(data, {
		headers: {
			'Cache-Control': `public, max-age=10, s-maxage=1200, stale-while-revalidate=315400000`,
		},
	});
};

export default function AtvrSlug() {
	const data = useLoaderData<NewProductsResponse>();
	const transition = useTransition();
	const [searchParams, setSearchParams] = useSearchParams();

	const take = parseInt(searchParams.get('take') || '25', 10);
	const page = parseInt(searchParams.get('page') || '0', 10);
	const totalPages = Math.floor(data.totalItems / take);

	const isLoading = transition.state === 'loading';

	const handleNextClick = () => {
		setSearchParams({
			...Array.from(searchParams.keys()).reduce(
				(params, key) => ({
					...params,
					[key]: searchParams.get(key),
				}),
				{},
			),
			page: (page + 1).toString(),
		});
	};

	const handlePrevClick = () => {
		setSearchParams({
			...Array.from(searchParams.keys()).reduce(
				(params, key) => ({
					...params,
					[key]: searchParams.get(key),
				}),
				{},
			),
			page: Math.max(0, page - 1).toString(),
		});
	};

	return (
		<div className="overflow-y-auto max-h-screen pt-2 pr-2 md:p-4 relative">
			<div className="flex flex-col md:flex-row justify-between items-stretch md:items-start">
				<h2>
					{`Newest beers`}
					<small className="text-xs block">
						(page {page + 1} of {totalPages + 1})
					</small>
				</h2>
				<div className="flex-1 flex justify-between">
					<div>
						<PaginationButton
							onClick={handlePrevClick}
							disabled={page === 0 || isLoading}
							label="Prev"
						/>
						<PaginationButton
							onClick={handleNextClick}
							className="bg-gray-800 text-white"
							disabled={page === totalPages || isLoading}
							label="Next"
						/>
					</div>
				</div>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
				{data.products.map((product) => (
					<NewProductCard key={product.id} {...product} />
				))}
			</div>
		</div>
	);
}

export function ErrorBoundary(props: any) {
	return <p>Uh oh.. something went seriously wrong</p>;
}
