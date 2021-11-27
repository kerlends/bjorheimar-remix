module.exports = {
	mode: 'jit',
	purge: ['app/**/*.{ts,tsx}'],
	darkMode: false, // or 'media' or 'class'
	theme: {
		extend: {},
		fontFamily: {
			sans: ['"Noto Sans"'],
		},
	},
	variants: {},
	plugins: [],
};
