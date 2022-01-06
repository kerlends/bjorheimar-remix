import { Outlet, useOutletContext } from 'remix';

export default function StoreRoute() {
	const ctx = useOutletContext();
	return (
		<div className="pt-2 pr-2 md:p-4 relative">
			<Outlet context={ctx} />
		</div>
	);
}
