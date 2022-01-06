import { LoaderFunction, useLoaderData } from 'remix';
import * as atvr from '~/utils/atvr/client';

async function loaderData() {
	const data = await atvr.getDoSearch();
	return data;
}

type Data = AwaitedReturnType<typeof loaderData>;

export const loader: LoaderFunction = () => {
	return loaderData();
};

export default function AtvrRoute() {
	const data = useLoaderData<Data>();
	return (
		<pre>
			<code>{JSON.stringify(data, null, 2)}</code>
		</pre>
	);
}
