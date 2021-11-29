import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

let db: PrismaClient;

declare global {
	var __db: PrismaClient | undefined;
}

// this is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new connection to the DB with every change either.
if (process.env.NODE_ENV === 'production') {
	const enableQueryLogging = ['true', '1'].includes(
		process.env.ENABLE_QUERY_LOGGING || '',
	);
	const options: Prisma.PrismaClientOptions = enableQueryLogging
		? {
				log: ['query'],
		  }
		: {};
	db = new PrismaClient(options);
	db.$connect();
} else {
	if (!global.__db) {
		global.__db = new PrismaClient();
		global.__db.$connect();
	}
	db = global.__db;
}

export { db };
