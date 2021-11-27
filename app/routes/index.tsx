import type { MetaFunction, LoaderFunction } from 'remix';
import { useLoaderData, json, Link } from 'remix';

export const loader: LoaderFunction = () => {
	// TODO
	return {};
};

export let meta: MetaFunction = () => {
	return {
		title: 'Bjórheimar',
		description: 'I liek beer',
	};
};

export default function Index() {
	const data = useLoaderData();

	return <div>todo</div>;
}
