import clsx from 'clsx';
import format from 'date-fns/format';
import parseISO from 'date-fns/parseISO';
import { useEffect } from 'react';
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

function formatTime(date: string) {
	const parsed = parseISO(date);
	return format(parsed, 'HH:mm, dd.MM.yyyy');
}

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
			'Cache-Control': `public, max-age=10, stale-while-revalidate=315400000`,
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
	const syncFetcher = useFetcher<StoreInventory>();
	const [searchParams, setSearchParams] = useSearchParams();

	// const data = syncFetcher.data ? syncFetcher.data : loaderData;

	const take = parseInt(searchParams.get('take') || '25', 10);
	const page = parseInt(searchParams.get('page') || '0', 10);
	const totalPages = Math.floor(data.totalItems / take);

	const isLoading = transition.state === 'loading';

	useEffect(() => {
		if (syncFetcher.state === 'idle' && syncFetcher.type === 'done') {
			setSearchParams({});
		}
	}, [syncFetcher, data.store.atvrId]);

	const handleSyncClick = () => {
		syncFetcher.submit(
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

	const lastUpdateAt = (data?.store?.inventory[0]?.createdAt ||
		'') as unknown as string;

	return (
		<div>
			<div className="flex flex-col md:flex-row justify-between items-stretch md:items-start">
				<h2>
					{`${data.store.name} (${data.store.atvrId})`}
					<small className="text-xs block">
						(page {page + 1} of {totalPages + 1})
					</small>
				</h2>
				<div className="flex-1 flex justify-between">
					<div>
						<button
							onClick={handleSyncClick}
							disabled={
								syncFetcher.state === 'loading' ||
								syncFetcher.state === 'submitting'
							}
							className="bg-green-800 text-white text-sm inline-block px-4 py-2 md:first:mr-2 rounded-sm shadow-md hover:shadow-lg hover:opacity-90 disabled:bg-green-300 disabled:text-gray-600 disabled:shadow-none disabled:cursor-default mr-auto mb-auto md:ml-4"
						>
							Sync now
						</button>
						{lastUpdateAt && (
							<small>Last sync at {formatTime(lastUpdateAt)}</small>
						)}
					</div>
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
			<div className="flex mt-2 md:mt-0">
				<CategoryFilter {...data.categories} />
			</div>
			<div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
				{data.store.inventory.map((item) => (
					<ProductCard key={item.id} {...item} />
				))}
			</div>
		</div>
	);
}
