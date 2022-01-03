export function env(key: string, fallback?: string): string {
	const value = process.env[key] || fallback;
	if (typeof value === 'undefined') {
		throw new Error(`Missing environment variable: ${key}`);
	}
	return value;
}
