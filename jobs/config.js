const e = (k) => process.env[`AUTH0_${k}`];

const clientId = e('CLIENT_ID');
const clientSecret = e('CLIENT_SECRET');
const audience = e('AUDIENCE');
const domain = e('DOMAIN');

module.exports = {
	clientId,
	clientSecret,
	audience,
	domain,
};
