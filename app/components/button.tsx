import React from 'react';
import clsx from 'clsx';

type Color = 'default' | 'success' | 'info' | 'warning' | 'error' | 'black';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	color?: Color;
}

export function Button({
	className,
	color = 'default',
	...props
}: ButtonProps) {
	return (
		<button
			className={clsx(
				'text-sm inline-block px-4 py-2 rounded-sm shadow-md',
				'hover:shadow-lg hover:opacity-90',
				'disabled:shadow-none disabled:cursor-default disabled:opacity-40',
				{
					'bg-green-800 text-white disabled:bg-green-300 disabled:text-gray-600':
						color === 'success',
					'bg-white text-black disabled:bg-gray-200 disabled:text-gray-700':
						color === 'default',
					'bg-gray-800 text-white': color === 'black',
				},
				className,
			)}
			{...props}
		/>
	);
}
