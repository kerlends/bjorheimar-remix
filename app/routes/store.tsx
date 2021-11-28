import { Outlet, useTransition } from 'remix';
import { Overlay } from '~/components/overlay';
import { Spinner } from '~/components/spinner';

export default function StoreRoute() {
	const transition = useTransition();
	const isLoading = transition.state === 'loading';

	return (
		<div className="overflow-y-auto max-h-screen pt-2 pr-2 md:p-4 relative">
			<Overlay open={isLoading}>
				<Spinner />
			</Overlay>
			<Outlet />
		</div>
	);
}
