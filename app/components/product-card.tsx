import format from 'date-fns/format';
import parseISO from 'date-fns/parseISO';
import { useFetcher } from 'remix';
import type { StoreInventoryItem } from '~/data';
import { applyTransformations } from '~/utils/cloudinary';
import { Spinner } from './spinner';

const formatPrice = (value: number) => {
	const formatter = new Intl.NumberFormat('is', {
		style: 'currency',
		currency: 'isk',
	});
	const parts = formatter.formatToParts(value);
	return parts
		.map((p) => (p.type === 'group' && p.value === ',' ? '.' : p.value))
		.join('');
};

function TableRow({ label, value }: { label: string; value: string | number }) {
	return (
		<tr>
			<th>{label}</th>
			<td className="text-right">{value}</td>
		</tr>
	);
}

function Table({
	product,
	price,
	updatedAt,
}: Pick<StoreInventoryItem, 'product' | 'price' | 'updatedAt'>) {
	return (
		<table className="text-left w-full mt-auto">
			<tbody>
				<TableRow label="Alcohol" value={`${product.alcohol}%`} />
				<TableRow label="Volume" value={`${product.volume} ml`} />
				<TableRow label="Price" value={`${price} ISK`} />
				<TableRow
					label="Added"
					value={format(parseISO(product.createdAt as any), 'dd.MM.yyyy')}
				/>
				<TableRow
					label="Last updated"
					value={format(parseISO(updatedAt as any), 'dd.MM.yyyy')}
				/>
			</tbody>
		</table>
	);
}

export function ProductCard({
	product,
	quantity,
	price,
	updatedAt,
}: StoreInventoryItem) {
	const fetcher = useFetcher();
	const handleDescriptionClick = () => {
		fetcher.submit(
			{ productId: product.atvrId },
			{ method: 'post', action: `/product/${product.atvrId}/description` },
		);
	};

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
				<Table product={product} price={price} updatedAt={updatedAt} />
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
			<p className="relative text-right mt-auto text-xs pr-2 transform translate-y-2">
				<span className="absolute left-2">
					<strong>{quantity}</strong> units left
				</span>
				by <em>{product.manufacturer.name}</em>
			</p>
		</div>
	);
}
