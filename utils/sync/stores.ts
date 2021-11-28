import { PrismaClient } from '@prisma/client';
import * as fns from 'date-fns';
import invariant from 'tiny-invariant';
import * as atvr from '../atvr/client';
import { AtvrStore } from '../atvr/types';

function nameToSlug(name: string) {
	return name
		.toLowerCase()
		.replace(/\s/g, '-')
		.replace(/ó/g, 'o')
		.replace(/ö/g, 'o')
		.replace(/é/g, 'e')
		.replace(/ý/g, 'y')
		.replace(/ú/g, 'u')
		.replace(/í/g, 'i')
		.replace(/á/g, 'a')
		.replace(/ð/g, 'd')
		.replace(/æ/g, 'ae');
}

const months = {
	jan: 0,
	feb: 1,
	mar: 2,
	apr: 3,
	maí: 4,
	jún: 5,
	júl: 6,
	ágú: 7,
	sep: 8,
	okt: 9,
	nóv: 10,
	des: 11,
};

type MonthKey = keyof typeof months;

function monthStringToIndex(monthStr: string): number {
	for (const key of Object.keys(months)) {
		const value = months[key as MonthKey];
		if (monthStr.startsWith(key)) {
			return value;
		}
	}

	throw new Error(`Failed to map "${monthStr}" to month index`);
}

function monthStringToDate(monthStr: string): Date {
	const re = monthStr.match(/(?<day>[0-9]+)\.\s(?<month>.*)/);

	invariant(
		typeof re?.groups?.day === 'string',
		`Failed to extract day from "${monthStr}"`,
	);
	invariant(
		typeof re?.groups?.month === 'string',
		`Failed to extract month from "${monthStr}"`,
	);

	const month = monthStringToIndex(re.groups.month);

	return fns.setDate(
		fns.setMonth(new Date(), month),
		parseInt(re.groups.day, 10),
	);
}

function storeToHours(store: AtvrStore): {
	atvrStoreId: string;
	weekday: number;
	opensAt: number;
	closesAt: number;
}[] {
	const keys = [
		'today',
		'day1',
		'day2',
		'day3',
		'day4',
		'day5',
		'day6',
	] as const;

	const hours = keys
		.map((key) => {
			const data = store[key];
			const date = monthStringToDate(data.date);
			let opens: null | string = null;
			let closes: null | string = null;
			if (data.open !== 'Lokað') {
				[opens, closes] = data.open.split(' - ');
				const weekday = fns.getDay(date);
				console.log({ id: store.PostCode, date, opens, closes, weekday, data });
				return {
					atvrStoreId: store.PostCode,
					weekday: fns.getDay(date),
					opensAt: parseInt(opens, 10),
					closesAt: parseInt(closes, 10),
				};
			}
			return null as any;
		})
		.filter((i) => i !== null);

	return hours;
}

export default async function syncStores(prisma: PrismaClient) {
	const atvrStores = await atvr.getStores();

	await Promise.all(
		atvrStores.map(async (store) => {
			try {
				return await prisma.store.upsert({
					where: {
						atvrId: store.PostCode,
					},
					create: {
						name: store.Name,
						slug: nameToSlug(store.Name),
						atvrId: store.PostCode,
						hours: {
							createMany: {
								data: storeToHours(store),
							},
						},
					},
					update: {
						hours: {
							update: storeToHours(store).map((hours) => ({
								where: {
									atvrStoreId_weekday: {
										atvrStoreId: store.PostCode,
										weekday: hours.weekday,
									},
								},
								data: {
									closesAt: hours.closesAt,
									opensAt: hours.opensAt,
								},
							})),
						},
					},
				});
			} catch (error) {
				console.error(error);
			}
		}),
	);

	await prisma.$disconnect();
}
