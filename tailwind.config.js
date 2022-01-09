module.exports = {
	mode: process.env.NODE_ENV !== 'production' ? 'jit' : undefined,
	purge: ['app/**/*.{ts,tsx}'],
	darkMode: false, // or 'media' or 'class'
	theme: {
		extend: {},
		fontFamily: {
			sans: ['"Open Sans"'],
		},
	},
	variants: {},
	plugins: [],
};
