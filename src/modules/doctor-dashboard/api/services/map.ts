import { isUuid } from '$shared/lib/ids';
import type {
	DoctorAllowedServiceFacts,
	DoctorServiceCreateBody,
	DoctorServiceDraft,
	DoctorServiceFacts,
	DoctorServiceUpdateBody
} from './types';

// The server keeps 200 services a doctor at most in one order (`DOCTOR_SERVICE_ORDER_MAX_ITEMS`); a catalogue of a
// specialty is far shorter. Beyond these a list is a broken answer.
const MAX_SERVICES = 200;
const MAX_CATALOGUE = 500;
const MAX_TITLE = 300;
/** The server's own bounds of a doctor's texts (D-W52-71); a stored text of before them still shows, cut here. */
const MAX_SUBTITLE = 120;
const MAX_DESCRIPTION = 1000;
// A stored price or length of before the limits of D-W52-71 still shows (its page asks for a new one); past these it is
// no price or length at all.
const MAX_PRICE = 99_999_999;
const MAX_MINUTES = 1440;
const MAX_YEARS = 100;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/** A plain text of at most `max`, trimmed; none for anything else or for an empty one. */
function textOf(value: unknown, max: number): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed ? trimmed.slice(0, max) : null;
}

const wholeOf = (value: unknown, max: number): number | null =>
	typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max ? value : null;

/** 🔴 U-207.3 / U-214: the doctor's OWN Greek texts — another language is never shown, an empty one is none. */
function greekTextsOf(translations: unknown): {
	subtitle: string | null;
	description: string | null;
} {
	const entry = Array.isArray(translations)
		? translations.find((item) => isRecord(item) && item.language === 'el')
		: undefined;
	return isRecord(entry)
		? {
				subtitle: textOf(entry.subtitle, MAX_SUBTITLE),
				description: textOf(entry.description, MAX_DESCRIPTION)
			}
		: { subtitle: null, description: null };
}

/**
 * U-65.6: one service read field by field — without a server id, the catalogue's id or a title it is no service
 * (`null`); a price or a length that is no number is none of either.
 */
export function mapDoctorService(view: unknown): DoctorServiceFacts | null {
	if (!isRecord(view)) return null;
	const { id, serviceId, price, customDurationInMinutes: minutes } = view;
	const title = textOf(view.title, MAX_TITLE);
	if (typeof id !== 'string' || !isUuid(id) || typeof serviceId !== 'string' || !isUuid(serviceId))
		return null;
	if (!title) return null;
	if (typeof price !== 'number' || !Number.isFinite(price) || price < 0 || price > MAX_PRICE)
		return null;
	const durationInMinutes = wholeOf(minutes, MAX_MINUTES);
	if (!durationInMinutes) return null;
	return {
		id,
		serviceId,
		title,
		price,
		durationInMinutes,
		...greekTextsOf(view.translations),
		years: wholeOf(view.yearsOfexperience, MAX_YEARS)
	};
}

/**
 * 🔴 U-65.6 · D-W52-73: the doctor's services in the DOCTOR's order. The order is written back whole (`PUT …/order`
 * names every service once), so ONE broken row, an id met twice or a list past its bound makes the whole answer `null`
 * — a failed read: a row that «stayed out» would make every reorder a refusal.
 */
export function mapDoctorServices(view: unknown): DoctorServiceFacts[] | null {
	if (!Array.isArray(view) || view.length > MAX_SERVICES) return null;
	const seen = new Set<string>();
	const services: DoctorServiceFacts[] = [];
	for (const entry of view) {
		const service = mapDoctorService(entry);
		if (!service || seen.has(service.id)) return null;
		seen.add(service.id);
		services.push(service);
	}
	return services;
}

/**
 * U-65.6 · D-W52-79: the catalogue of the doctor's specialty in the server's order. An entry out of the contract (no
 * id, no title, a length that is no whole number, an id met twice) stays out; an answer that is no list is `null`.
 */
export function mapDoctorAllowedServices(view: unknown): DoctorAllowedServiceFacts[] | null {
	if (!Array.isArray(view)) return null;
	const seen = new Set<string>();
	return view.slice(0, MAX_CATALOGUE).flatMap((entry): DoctorAllowedServiceFacts[] => {
		if (!isRecord(entry) || typeof entry.id !== 'string' || !isUuid(entry.id)) return [];
		const title = textOf(entry.title, MAX_TITLE);
		const durationInMinutes = wholeOf(entry.durationInMinutes, MAX_MINUTES);
		if (!title || !durationInMinutes || typeof entry.owned !== 'boolean' || seen.has(entry.id))
			return [];
		seen.add(entry.id);
		return [
			{
				serviceId: entry.id,
				title,
				suggestedSubtitle: textOf(entry.suggestedSubtitle, MAX_SUBTITLE),
				suggestedDescription: textOf(entry.suggestedDescription, MAX_DESCRIPTION),
				durationInMinutes,
				owned: entry.owned
			}
		];
	});
}

/** 🔴 D-W52-78 (U-207.3): the ONE text of a save — Greek, the doctor's own (`null` for an empty field). */
const greekOf = (draft: DoctorServiceDraft) => [
	{ language: 'el' as const, subtitle: draft.subtitle, description: draft.description }
];

/**
 * 🔴 D-W52-72 / 78 (`w52-b7` §9): a NEW service — the session's doctor, the catalogue's service, the price, the length,
 * the years when written and the Greek texts. Never `amount` or `catalogueId` (the server's regular catalogue).
 */
export function toDoctorServiceCreateBody(
	doctorId: string,
	serviceId: string,
	draft: DoctorServiceDraft & { durationInMinutes: number }
): DoctorServiceCreateBody {
	return {
		doctorId,
		serviceId,
		price: draft.price,
		customDurationInMinutes:
			draft.durationInMinutes as DoctorServiceCreateBody['customDurationInMinutes'],
		...(draft.years === null ? {} : { yearsOfexperience: draft.years }),
		translations: greekOf(draft)
	};
}

/**
 * 🔴 D-W52-82 («Αποθήκευση» in ONE call): the price, the length (left out while it is a stored one of before the list),
 * the years (`null` clears them) and the Greek texts. Never `amount`, `catalogueId`, `doctorId` or `serviceId`.
 */
export function toDoctorServiceUpdateBody(draft: DoctorServiceDraft): DoctorServiceUpdateBody {
	return {
		price: draft.price,
		...(draft.durationInMinutes === null
			? {}
			: {
					customDurationInMinutes: draft.durationInMinutes as NonNullable<
						DoctorServiceUpdateBody['customDurationInMinutes']
					>
				}),
		yearsOfexperience: draft.years,
		translations: greekOf(draft)
	};
}
