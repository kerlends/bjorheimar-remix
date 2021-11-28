import cheerio from 'cheerio';

export async function getAtvrProductDescription(atvrProductId: string) {
	const paddedId = atvrProductId.padStart(5, '0');

	const url = `https://www.vinbudin.is/heim/vorur/stoek-vara.aspx/?productid=${paddedId}/`;
	const res = await fetch(url).then((res) => res.text());
	const $ = cheerio.load(res);

	return $('p:first', '#tabs1').text();
}
