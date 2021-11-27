import { Link, useParams, useFetcher } from 'remix';
import clsx from 'clsx';
import type { LoaderData as Stores } from '~/root';

interface SidebarProps {
	stores: Stores;
}

export function Sidebar({ stores }: SidebarProps) {
	const params = useParams();
	const fetcher = useFetcher();
	const handleSyncClick = (atvrId: string) => {
		fetcher.submit({ atvrId }, { method: 'post', action: '/api/sync' });
	};

	return (
		<aside className="overflow-y-auto max-h-screen py-4">
			<ul>
				{stores.map((store) => (
					<li key={store.atvrId}>
						<Link
							prefetch="intent"
							to={`/store/${store.atvrId}`}
							className={clsx('block p-4 hover:bg-gray-200', {
								'bg-green-200 hover:bg-green-100':
									params.atvrId === store.atvrId,
							})}
						>
							<p>{store.name}</p>
							<strong className="text-right text-gray-500">
								{store.atvrId}
							</strong>
						</Link>
					</li>
				))}
			</ul>
		</aside>
	);
}
