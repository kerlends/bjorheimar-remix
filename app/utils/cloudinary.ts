export function applyTransformations(
	cloudinaryUrl: string,
	transformations: string[],
) {
	const url = new URL(cloudinaryUrl);
	const pathSegments = url.pathname.split('/');
	const transformedPath = pathSegments
		.map((segment) => {
			if (segment === 'upload') {
				return `upload/${transformations.join(',')}`;
			}
			return segment;
		})
		.join('/');
	url.pathname = transformedPath;
	return url.href;
}
