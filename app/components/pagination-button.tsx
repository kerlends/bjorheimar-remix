import clsx from 'clsx';

interface PaginationButtonProps {
	onClick: () => void;
	disabled: boolean;
	label: string;
	className?: string;
}

export function PaginationButton({
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
