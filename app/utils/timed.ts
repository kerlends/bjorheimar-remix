function logTime(label: string, startTime: number) {
	const duration = Date.now() - startTime;
	console.info('[timed:%s] execution took %s ms', label, duration.toFixed(0));
}

export default function createTimed(label: string) {
	return async <P extends Promise<any>>(promise: P) => {
		const start = Date.now();
		try {
			const result = await promise;
			logTime(label, start);
			return result;
		} catch (err) {
			logTime(label, start);
			throw err;
		}
	};
}
