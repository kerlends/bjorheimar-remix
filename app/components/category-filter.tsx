import React from 'react';
import { useSearchParams } from 'remix';
import type { GetCategories } from '~/data';

export function CategoryFilter({ categories, totalCount }: GetCategories) {
	const [searchParams, setSearchParams] = useSearchParams();
	const handleCategoryChange = (
		event: React.ChangeEvent<HTMLSelectElement>,
	) => {
		setSearchParams(
			event.target.value
				? {
						category: event.target.value,
				  }
				: {},
		);
	};
	const handleProfileChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
		setSearchParams({
			profile: event.target.value,
		});
	};
	return (
		<div>
			<select
				onChange={handleCategoryChange}
				value={searchParams.get('category') || ''}
			>
				<option value="">{`All categories (${totalCount} products)`}</option>
				{categories.map((cat) => (
					<option key={cat.id} value={cat.id}>
						{`${cat.name} (${cat.counts} products)`}
					</option>
				))}
			</select>
		</div>
	);
}
