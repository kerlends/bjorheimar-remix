import { Outlet } from 'remix';

export default function StoreRoute() {
	return (
		<div className="overflow-y-auto max-h-screen pt-2 pr-2 md:p-4 relative">
			<Outlet />
		</div>
	);
}
