import { m } from '$paraglide/messages.js';
import { formatEuro } from '$shared/lib/format';
import { formatVisitLength, isVisitLength } from '$shared/lib/visit-length';
import type {
	DoctorAllowedServiceFacts,
	DoctorServiceDraft,
	DoctorServiceFacts,
	DoctorServicesFailure
} from '$modules/doctor-dashboard/api/services';
import {
	DOCTOR_SERVICE_PRICE_DIGITS,
	DOCTOR_SERVICE_PRICE_MAX,
	DOCTOR_SERVICE_YEARS_DIGITS,
	DOCTOR_SERVICE_YEARS_MAX
} from '$modules/doctor-dashboard/config';

type Locale = 'el' | 'en';

const SEPARATOR = ' · ';

/** 🔴 D-W52-81 (`64-switch/sw.js` `usBody`): a row's line under its title — «30′ · 60 €», «1 ώρα 30′ · 80 €». */
export function doctorServiceLine(
	service: Pick<DoctorServiceFacts, 'durationInMinutes' | 'price'>,
	locale: Locale
): string {
	return [
		formatVisitLength(service.durationInMinutes, locale, 'short'),
		formatEuro(service.price, locale)
	]
		.filter(Boolean)
		.join(SEPARATOR);
}

/** One line of «Νέα υπηρεσία»: the catalogue's service, and «Συνήθως 20′» / «Συνήθως 1 ώρα». */
export type DoctorServiceCatalogueRow = { serviceId: string; title: string; usually: string };

/**
 * 🔴 D-W52-81 (U-212.1): «Νέα υπηρεσία» offers the catalogue of the specialty WITHOUT the services the doctor already
 * offers (`owned`), in the server's order — never a name of its own (U-122).
 */
export function buildDoctorServiceCatalogueRows(
	options: readonly DoctorAllowedServiceFacts[],
	locale: Locale
): DoctorServiceCatalogueRow[] {
	return options
		.filter((option) => !option.owned)
		.map((option) => ({
			serviceId: option.serviceId,
			title: option.title,
			usually: m.doctor_my_services_usually(
				{ duration: formatVisitLength(option.durationInMinutes, locale, 'short') },
				{ locale }
			)
		}));
}

/** What the page of one service holds while it is typed: the fields as text, the length as the row picked. */
export type DoctorServiceValues = {
	price: string;
	durationInMinutes: number | null;
	subtitle: string;
	description: string;
	years: string;
};

/** The fields whose rules the page says before a save (the server checks every one again). */
export type DoctorServiceField = 'price' | 'years';

/**
 * 🔴 U-217.3 · U-214.4 (D-W52-78 / 82): a NEW service opens with NO price (never 0, never the catalogue's `baseAmount`),
 * the catalogue's usual length, EMPTY texts — eDoctor's suggestion only with the button — and no years.
 */
export function newDoctorServiceValues(option: DoctorAllowedServiceFacts): DoctorServiceValues {
	return {
		price: '',
		durationInMinutes: isVisitLength(option.durationInMinutes) ? option.durationInMinutes : null,
		subtitle: '',
		description: '',
		years: ''
	};
}

/** 🔴 U-214.1: a stored service opens with what the DOCTOR wrote — an empty text stays empty. */
export function toDoctorServiceValues(service: DoctorServiceFacts): DoctorServiceValues {
	return {
		price: String(service.price),
		durationInMinutes: service.durationInMinutes,
		subtitle: service.subtitle ?? '',
		description: service.description ?? '',
		years: service.years === null ? '' : String(service.years)
	};
}

/** What a field of digits keeps of a keystroke or a paste: its digits, `digits` at most (a letter leaves nothing). */
export function keepDoctorServiceDigits(value: string, field: DoctorServiceField): string {
	const digits = field === 'price' ? DOCTOR_SERVICE_PRICE_DIGITS : DOCTOR_SERVICE_YEARS_DIGITS;
	return value.replace(/[^0-9]/gu, '').slice(0, digits);
}

/**
 * 🔴 U-212.1 · D-W52-71 (the server's `assertYearsWithinLicense`): the most years a service may say — the WHOLE years
 * since the practice licence, on the server's clock (`now`), its anniversary in UTC as the server reads it; without a
 * licence day the server's own 70.
 */
export function doctorServiceYearsLimit(obtainedDay: string | null, now: number): number {
	const day = obtainedDay ? /^(\d{4})-(\d{2})-(\d{2})$/u.exec(obtainedDay) : null;
	if (!day) return DOCTOR_SERVICE_YEARS_MAX;
	const today = new Date(now);
	const [year, month, date] = [Number(day[1]), Number(day[2]) - 1, Number(day[3])];
	const passed =
		today.getUTCMonth() > month || (today.getUTCMonth() === month && today.getUTCDate() >= date);
	const years = today.getUTCFullYear() - year - (passed ? 0 : 1);
	return Math.min(DOCTOR_SERVICE_YEARS_MAX, Math.max(0, years));
}

/**
 * 🔴 U-212.1 · D-W52-82 (`sw.js` `usErrs`): the rule a field breaks — the price whole euros from 1 to 9999 (an empty
 * one too: U-217.3 asks for it before the save), the years (optional) whole and never past `yearsLimit`. `null`: none.
 */
export function doctorServiceError(
	field: DoctorServiceField,
	values: DoctorServiceValues,
	yearsLimit: number
): DoctorServiceField | null {
	if (field === 'price') {
		const price = values.price.trim();
		return /^\d{1,4}$/u.test(price) &&
			Number(price) >= 1 &&
			Number(price) <= DOCTOR_SERVICE_PRICE_MAX
			? null
			: 'price';
	}
	const years = values.years.trim();
	if (!years) return null;
	return /^\d{1,2}$/u.test(years) && Number(years) <= yearsLimit ? null : 'years';
}

/** 🔴 U-140: the page's own words for a broken rule (`83-services.html` «Λάθη»). */
export function doctorServiceErrorText(
	field: DoctorServiceField,
	locale: Locale,
	yearsLimit: number
): string {
	return field === 'price'
		? m.doctor_my_service_error_price({}, { locale })
		: m.doctor_my_service_error_years({ years: yearsLimit }, { locale });
}

/**
 * 🔴 D-W52-82: what ONE save writes — `null` while a rule is broken. The texts are the doctor's own, trimmed, `null` for
 * an empty one (U-214.4: empty stays empty, for the patients too); a stored length of before the list is left as it is.
 */
export function toDoctorServiceDraft(
	values: DoctorServiceValues,
	yearsLimit: number
): DoctorServiceDraft | null {
	if (
		doctorServiceError('price', values, yearsLimit) ||
		doctorServiceError('years', values, yearsLimit)
	)
		return null;
	const years = values.years.trim();
	return {
		price: Number(values.price.trim()),
		durationInMinutes: isVisitLength(values.durationInMinutes) ? values.durationInMinutes : null,
		subtitle: values.subtitle.trim() || null,
		description: values.description.trim() || null,
		years: years ? Number(years) : null
	};
}

/** eDoctor's texts of one service of the catalogue (U-214), `null` when it has neither. */
export type DoctorServiceSuggestion = { subtitle: string; description: string };

export function doctorServiceSuggestion(
	option: DoctorAllowedServiceFacts | null | undefined
): DoctorServiceSuggestion | null {
	if (!option || (!option.suggestedSubtitle && !option.suggestedDescription)) return null;
	return {
		subtitle: option.suggestedSubtitle ?? '',
		description: option.suggestedDescription ?? ''
	};
}

/**
 * 🔴 U-214.1 / U-214.4 (`sw.js` `usSuggest`): the button «Συμπλήρωση με την πρόταση του eDoctor» shows while there IS a
 * suggestion and the two fields do not hold it already; `replaces` — «Αντικαθιστά ό,τι έχετε γράψει στα δύο πεδία.»
 * under it — while either field holds a text of the doctor's.
 */
export function doctorServiceSuggestionOffer(
	values: Pick<DoctorServiceValues, 'subtitle' | 'description'>,
	suggestion: DoctorServiceSuggestion | null
): { replaces: boolean } | null {
	if (!suggestion) return null;
	const [subtitle, description] = [values.subtitle.trim(), values.description.trim()];
	if (subtitle === suggestion.subtitle && description === suggestion.description) return null;
	return { replaces: Boolean(subtitle || description) };
}

/** 🔴 U-140: why a write did not happen, in the page's words; `last` is the page's own sentence (D-W52-74). */
export function doctorServicesFailureText(
	failure: Exclude<DoctorServicesFailure, 'session'>,
	locale: Locale
): string {
	const options = { locale };
	switch (failure) {
		case 'last':
			return m.doctor_my_service_last({}, options);
		case 'owned':
			return m.doctor_my_service_error_owned({}, options);
		case 'years':
		case 'invalid':
			return m.doctor_my_service_error_invalid({}, options);
		case 'gone':
			return m.doctor_my_service_missing({}, options);
		case 'mismatch':
			return m.doctor_photos_order_failed({}, options);
		case 'rate-limited':
			return m.doctor_reason_rate_limited({}, options);
		case 'forbidden':
		case 'unknown':
			return m.doctor_my_specializations_error_failed({}, options);
	}
}

/** The keys that move the focused service (D-W52-81): one place up, one place down. */
const EARLIER = ['ArrowUp'];
const LATER = ['ArrowDown'];

/**
 * 🔴 D-W52-81 (the photos' way, D-W52-39): where an arrow takes the service at `index` of `count` — one place up or
 * down; `null` for another key, and at either end.
 */
export function doctorServiceArrowTarget(key: string, index: number, count: number): number | null {
	const step = EARLIER.includes(key) ? -1 : LATER.includes(key) ? 1 : 0;
	const target = index + step;
	return step === 0 || target < 0 || target >= count ? null : target;
}

/**
 * 🔴 D-W52-81: the place a dragged service would take — the row whose height holds the pointer; `null` over the
 * dragged one's own row or outside the list (the order then stays as it is).
 */
export function doctorServiceDropTarget(
	y: number,
	rows: readonly { id: string; top: number; bottom: number }[],
	draggedId: string
): string | null {
	return rows.find((row) => row.id !== draggedId && y >= row.top && y <= row.bottom)?.id ?? null;
}

/** The ids with the one at `from` taken to `to`. */
export function moveDoctorService(ids: readonly string[], from: number, to: number): string[] {
	const next = [...ids];
	const [moved] = next.splice(from, 1);
	if (moved !== undefined) next.splice(to, 0, moved);
	return next;
}

/** Whether two orders name the same services in the same places. */
export function sameDoctorServiceOrder(a: readonly string[], b: readonly string[]): boolean {
	return a.length === b.length && a.every((id, index) => id === b[index]);
}
