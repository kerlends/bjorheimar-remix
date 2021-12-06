import { Outlet } from 'remix';

export default function StoreRoute() {
	return (
		<div className="pt-2 pr-2 md:p-4 relative">
			<Outlet />
		</div>
	);
}
