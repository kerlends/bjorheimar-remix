import clsx from 'clsx';
import format from 'date-fns/format';
import parseISO from 'date-fns/parseISO';
import {
	ActionFunction,
	HeadersFunction,
	LoaderFunction,
	Form,
	Outlet,
	useLoaderData,
	useSearchParams,
	useSubmit,
	useTransition,
	json,
	useOutletContext,
} from 'remix';
import invariant from 'tiny-invariant';
import { Button } from '~/components/button';
import { CategoryFilter } from '~/components/category-filter';
import { PaginationButton } from '~/components/pagination-button';
import { getStoreSummary, GetStoreSummary } from '~/data';

function formatTime(date: string) {
	const parsed = parseISO(date);
	return format(parsed, 'HH:mm, dd.MM.yyyy');
}

export const headers: HeadersFunction = ({ loaderHeaders }) => {
	return {
		// 'Cache-Control': loaderHeaders.get('Cache-Control') || 'public, max-age=10',
	};
};

export const loader: LoaderFunction = async ({ params, request }) => {
	invariant(params.atvrId, 'Missing atvr id');
	const searchParams = new URL(request.url).searchParams;

	const productCategoryId = searchParams.get('category') ?? undefined;
	const tasteProfileId = searchParams.get('profile') ?? undefined;
	const query = searchParams.get('query') ?? undefined;

	const data = await getStoreSummary(params.atvrId, {
		productCategoryId,
		tasteProfileId,
		query,
	});

	return json(data, {
		headers: {
			// 'Cache-Control': `public, max-age=10, s-maxage=1200, stale-while-revalidate=2678400`,
		},
	});
};

export default function AtvrSlug() {
	const data = useLoaderData<GetStoreSummary>();
	const transition = useTransition();
	const syncSubmit = useSubmit();
	const [searchParams, setSearchParams] = useSearchParams();

	const { isAdmin } = useOutletContext<{ isAdmin: boolean }>();

	const take = parseInt(searchParams.get('take') || '25', 10);
	const page = parseInt(searchParams.get('page') || '0', 10);
	const totalPages = Math.floor(data.totalItems / take);
	const searchQuery = searchParams.get('query');

	const isLoading = transition.state === 'loading';

	const handleSyncClick = () => {
		syncSubmit(null, {
			method: 'post',
			action: `/store/${data.store.atvrId}/sync`,
		});
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

	const lastUpdateAt = data.lastSync as unknown as string;

	const paginationButtons = (
		<>
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
		</>
	);

	return (
		<div>
			<div className="flex flex-col md:flex-row justify-between items-stretch md:items-start md:mb-4">
				<h2 className="mb-4 md:mb-0">
					{`${data.store.name} (${data.store.atvrId})`}
					<small className="text-xs block">
						(page {page + 1} of {totalPages + 1})
					</small>
				</h2>
				<div
					className={clsx('flex-1 grid grid-cols-2 md:flex justify-between')}
				>
					{isAdmin && (
						<div>
							<Button
								onClick={handleSyncClick}
								color="success"
								className="mr-auto mb-auto md:ml-4 md:first:mr-2"
								disabled={
									transition.state === 'submitting' ||
									transition.state === 'loading'
								}
							>
								Sync now
							</Button>
						</div>
					)}
					<div
						className={clsx('flex justify-end md:ml-auto md:mr-4', {
							'col-span-full': !isAdmin,
						})}
					>
						{paginationButtons}
					</div>
					<div className="col-span-2 mt-3 my-3 md:my-0">
						<Form method="get" action="search" className="flex">
							<input
								name="query"
								className="py-2 px-4 flex-1"
								placeholder="Search"
								defaultValue={searchQuery ?? ''}
							/>
							<Button type="submit">Submit</Button>
						</Form>
					</div>
				</div>
			</div>
			{lastUpdateAt && (
				<p className="text-right static md:relative">
					<small className="absolute top-4 md:-top-2 right-4 md:right-2">
						Last sync at <br className="md:hidden" />
						{formatTime(lastUpdateAt)}
					</small>
				</p>
			)}
			<div className="flex mt-2 md:mt-0">
				<CategoryFilter {...data.categories} />
			</div>
			<div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
				<Outlet />
			</div>
			<div className="flex-1 flex justify-center mt-4 mb-2">
				{paginationButtons}
			</div>
		</div>
	);
}
