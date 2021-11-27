import { PrismaClient } from '@prisma/client';
import * as fns from 'date-fns';
import { is } from 'date-fns/locale';
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

function fixMonthString(monthStr: string) {
	const replacesWith = [
		['júl.', 'júlí'],
		['ágú.', 'ágúst'],
	];

	for (const [original, fixed] of replacesWith) {
		if (monthStr.endsWith(original)) {
			return monthStr.replace(original, fixed);
		}
	}

	return monthStr;
}
function monthStringToDate(monthStr: string): Date {
	const fixedMonthStr = fixMonthString(monthStr);
	if (fixedMonthStr.endsWith('ágúst')) {
		const [day, month] = fixedMonthStr.split(' ');
		return fns.parse(`${day} August`, 'd. MMMM', new Date());
	}

	return fns.parse(fixedMonthStr, 'd. MMMM', new Date(), {
		locale: is,
	});
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
		atvrStores.map((store) => {
			return prisma.store
				.upsert({
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
				})
				.catch((error) => {
					console.group(store);
					console.error(error);
					console.groupEnd();
				});
		}),
	);

	await prisma.$disconnect();
}
