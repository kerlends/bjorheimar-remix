import clsx from 'clsx';
import {
	LoaderFunction,
	useFetcher,
	useLoaderData,
	useSearchParams,
	useTransition,
	json,
} from 'remix';
import invariant from 'tiny-invariant';
import { CategoryFilter } from '~/components/category-filter';
import { ProductCard } from '~/components/product-card';
import { getStoreInventory, StoreInventory } from '~/data';

export const loader: LoaderFunction = async ({ params, request, ...rest }) => {
	invariant(params.atvrId, 'Missing atvr id');
	const searchParams = new URL(request.url).searchParams;

	const page = parseInt(searchParams.get('page') || '0', 10);
	const take = parseInt(searchParams.get('take') || '25', 10);
	const skip = page * take;

	const productCategoryId = searchParams.get('category') ?? undefined;
	const tasteProfileId = searchParams.get('profile') ?? undefined;

	const data = await getStoreInventory(params.atvrId, {
		take,
		skip,
		productCategoryId,
		tasteProfileId,
	});

	return json(data, {
		headers: {
			'Cache-Control': 'max-age=604800, stale-while-revalidate=86400',
		},
	});
};

interface PaginationButtonProps {
	onClick: () => void;
	disabled: boolean;
	label: string;
	className?: string;
}

function PaginationButton({
	className,
	label,
	...props
}: PaginationButtonProps) {
	return (
		<button
			className={clsx(
				'text-sm inline-block px-4 py-2 first:mr-2 rounded-sm shadow-md hover:shadow-lg hover:opacity-90 disabled:opacity-70 disabled:shadow-none disabled:cursor-default',
				className,
			)}
			{...props}
		>
			{label}
		</button>
	);
}

export default function AtvrSlug() {
	const data = useLoaderData<StoreInventory>();
	const transition = useTransition();
	const fetcher = useFetcher();
	const [searchParams, setSearchParams] = useSearchParams();

	const take = parseInt(searchParams.get('take') || '25', 10);
	const page = parseInt(searchParams.get('page') || '0', 10);
	const totalPages = Math.floor(data.totalItems / take);

	const isLoading = transition.state === 'loading';

	const handleSyncClick = () => {
		fetcher.submit(
			{ atvrId: data.store.atvrId },
			{ method: 'post', action: `/store/${data.store.atvrId}/sync` },
		);
	};

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
		<div>
			<div className="flex justify-end">
				<CategoryFilter {...data.categories} />
			</div>
			<div className="flex justify-between items-center">
				<h2>
					Browsing inventory for {data.store.name}
					<small className="text-xs block">
						(page {page + 1} of {totalPages + 1})
					</small>
				</h2>
				<button
					onClick={handleSyncClick}
					disabled={fetcher.state === 'loading'}
					className="text-sm inline-block px-4 py-2 first:mr-2 rounded-sm shadow-md hover:shadow-lg hover:opacity-90 disabled:opacity-70 disabled:shadow-none disabled:cursor-default ml-auto"
				>
					Sync now
				</button>
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
			<div className="grid grid-cols-3 xl:grid-cols-4 gap-6">
				{data.store.inventory.map((item) => (
					<ProductCard key={item.id} {...item} />
				))}
			</div>
		</div>
	);
}
