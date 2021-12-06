import { Link, useParams } from 'remix';
import clsx from 'clsx';
import type { GetAllStores } from '~/data';

interface SidebarProps {
	stores: GetAllStores;
}

export function Sidebar({ stores }: SidebarProps) {
	const params = useParams();

	return (
		<aside className="overflow-y-auto max-h-screen py-4 pr-2 md:pr-0 fixed w-20 md:w-60">
			<ul>
				<li>
					<Link
						prefetch="intent"
						to="/"
						className={clsx('block p-3 md:p-4 md:pr-12 hover:bg-gray-200', {
							'bg-green-200 hover:bg-green-100': !params.atvrId,
						})}
					>
						<p className="hidden md:block">Newest products</p>
						<strong className="text-right text-gray-500">Home</strong>
					</Link>
				</li>

				{stores.map((store) => (
					<li key={store.atvrId}>
						<Link
							prefetch="intent"
							to={`/store/${store.atvrId}`}
							className={clsx('block p-3 md:p-4 md:pr-12 hover:bg-gray-200', {
								'bg-green-200 hover:bg-green-100':
									params.atvrId === store.atvrId,
							})}
						>
							<p className="hidden md:block">{store.name}</p>
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
