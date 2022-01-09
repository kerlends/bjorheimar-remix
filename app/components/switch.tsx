import React from 'react';
interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
	label: string;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
	function Switch({ id, label, ...props }, ref) {
		return (
			<label className="flex items-center cursor-pointer" htmlFor={id}>
				<div className="relative">
					<input
						id={id}
						type="checkbox"
						className="sr-only switch-input"
						ref={ref}
						{...props}
					/>
					<div className="line block bg-gray-600 w-14 h-8 rounded-full" />
					<div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition" />
				</div>
				<div className="ml-3 text-gray-700 font-semibold text-lg">{label}</div>
			</label>
		);
	},
);
