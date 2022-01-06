const axios = require('axios').default;
const { clientId, clientSecret, audience, domain } = require('./config');

async function token() {
	const url = `https://${domain}/oauth/token`;
	const data = {
		client_id: clientId,
		client_secret: clientSecret,
		audience,
		grant_type: 'client_credentials',
	};

	const result = await axios.post(url, data);
	return result.data.access_token;
}

module.exports = token;
