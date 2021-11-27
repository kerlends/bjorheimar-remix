import type { ActionFunction } from 'remix';
import invariant from 'tiny-invariant';
import cheerio from 'cheerio';
import { db } from '~/utils/db.server';

export const action: ActionFunction = async ({ params }) => {
	invariant(!!params.productId);
	const paddedId = params.productId.padStart(5, '0');

	const url = `https://www.vinbudin.is/heim/vorur/stoek-vara.aspx/?productid=${paddedId}/`;
	const res = await fetch(url).then((res) => res.text());
	const $ = cheerio.load(res);

	const text = $('p:first', '#tabs1').text();

	if (text) {
		await db.product.update({
			where: { atvrId: params.productId },
			data: {
				description: text,
			},
		});
	}

	return { text };
};
