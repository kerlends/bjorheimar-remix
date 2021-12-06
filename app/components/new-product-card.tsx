import format from 'date-fns/format';
import parseISO from 'date-fns/parseISO';
import { useState } from 'react';
import { useFetcher } from 'remix';
import type { GetNewProductsItem } from '~/data';
import { applyTransformations } from '~/utils/cloudinary';
import { Spinner } from './spinner';

function TableRow({ label, value }: { label: string; value: string | number }) {
	return (
		<tr className="px-2 py-3">
			<th>{label}</th>
			<td className="text-right">{value}</td>
		</tr>
	);
}

function Table({ createdAt, ...product }: GetNewProductsItem) {
	return (
		<table className="text-left w-full mt-auto">
			<tbody>
				<TableRow label="Alcohol" value={`${product.alcohol}%`} />
				<TableRow label="Volume" value={`${product.volume} ml`} />
				<TableRow
					label="Added"
					value={format(parseISO(createdAt as any), 'dd.MM.yyyy')}
				/>
			</tbody>
		</table>
	);
}

export function NewProductCard(product: GetNewProductsItem) {
	const [collapsed, setCollapsed] = useState(true);

	const fetcher = useFetcher();
	const handleDescriptionClick = () => {
		fetcher.submit(
			{ productId: product.atvrId },
			{ method: 'post', action: `/product/${product.atvrId}/description` },
		);
	};

	const { inventory } = product;

	return (
		<div className="py-4 shadow-md flex flex-col">
			<small className="text-center">{product.tasteProfile.name}</small>
			<h4 className="text-center mb-2 h-14">{product.name}</h4>
			{product.image ? (
				<img
					className="h-72 w-auto mx-auto py-2"
					src={applyTransformations(product.image, ['w_300'])}
					alt={`Image of ${product.name}`}
				/>
			) : (
				<div className="h-52 w-auto mx-auto">Missing image</div>
			)}
			<div className="px-4 pt-4 mb-4 mt-auto">
				<Table {...product} />
			</div>
			{product.description ? (
				<p className="px-4 pb-2 text-sm">{product.description}</p>
			) : fetcher.state === 'loading' || fetcher.state === 'submitting' ? (
				<div className="inline-block text-center">
					<Spinner />
				</div>
			) : (
				<button
					onClick={handleDescriptionClick}
					type="button"
					className="py-4 px-8 bg-yellow-700 text-white disabled:opacity-50"
				>
					Get description
				</button>
			)}
			{inventory.length > 0 ? (
				<div className="relative">
					<div className="flex justify-end">
						<button
							onClick={() => setCollapsed((prev) => !prev)}
							type="button"
							className="italic bg-blue-50 py-2 px-4"
						>
							{collapsed ? 'View availability' : 'Hide availability'}
						</button>
					</div>
					{!collapsed && (
						<div className="absolute -top-2 left-0 right-0 bg-white z-40 px-4 py-2 transform -translate-y-full shadow-sm">
							<table className="w-full text-left p-2">
								<tbody>
									{inventory.map(({ store, quantity }) => (
										<TableRow
											key={store.id}
											label={`${store.atvrId} (${store.name})`}
											value={`${quantity} left`}
										/>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			) : (
				<p className="px-4 font-bold">Unavailable</p>
			)}
			<p className="relative text-right mt-auto text-xs pr-2 transform translate-y-2">
				by <em>{product.manufacturer.name}</em>
			</p>
		</div>
	);
}
