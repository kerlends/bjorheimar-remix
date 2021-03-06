const axios = require('axios').default;
const getToken = require('./token');

async function run() {
	const token = await getToken();
	await axios.post(
		'https://bjor.konrade.tech/sync/products',
		{},
		{
			headers: {
				authorization: `Bearer ${token}`,
			},
		},
	);
}

run();
