const axios = require('axios').default;
const getToken = require('./token');

const stores = [104, 110, 112];

async function run() {
	const token = await getToken();

	for (const store of stores) {
		await axios.post(
			`https://bjor.konrade.tech/store/${store}/sync`,
			{},
			{
				headers: {
					authorization: `Bearer ${token}`,
				},
			},
		);
	}
}

run();
