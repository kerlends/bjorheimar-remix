import clsx from 'clsx';
import React from 'react';

interface OverlayProps {
	open: boolean;
}

export function Overlay({
	children,
	open,
}: React.PropsWithChildren<OverlayProps>) {
	return (
		<div
			className={clsx(
				'absolute top-0 left-0 bottom-0 right-0 bg-white transition-opacity flex justify-center items-center z-50 pointer-events-none',
				{
					'opacity-60 pointer-events-auto': open,
					'opacity-0': !open,
				},
			)}
		>
			{children}
		</div>
	);
}
