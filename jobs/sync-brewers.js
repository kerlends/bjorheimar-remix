const axios = require('axios').default;
const getToken = require('./token');

async function run() {
	const token = await getToken();
	try {
		await axios.post(
			'https://bjor.konrade.tech/sync',
			{},
			{
				headers: {
					authorization: `Bearer ${token}`,
				},
			},
		);
	} catch (error) {
		console.error(error);
	}
}

run();
