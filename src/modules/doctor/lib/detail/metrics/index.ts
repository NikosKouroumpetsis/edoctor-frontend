import { m } from '$paraglide/messages.js';
import { formatDecimal } from '$shared/lib/format';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import type { DoctorConfirmationMode } from '$modules/doctor/api/availability';
import type { DoctorResponseMetricsFacts, DoctorResponseTimeId } from '$modules/doctor/api/profile';
import type { DoctorSummaryRow } from '../types';

/**
 * 🔴 U-36.1 / U-43.1 / U-43.2 (app = web, the application's `lib/detail/metrics`): the summary's response rows and the
 * visits, by the rule of the approved design (§C.1 of `s5-backend-design.md`). The words are the owner's (U-36.5).
 */

const RESPONSE_TIME_WORDS = {
	'within-hour': m.doctor_response_within_hour,
	'within-few-hours': m.doctor_response_within_few_hours,
	'within-day': m.doctor_response_within_day,
	'few-days': m.doctor_response_few_days
} as const satisfies Record<DoctorResponseTimeId, unknown>;

/**
 * The ACTIVE office's confirmation (its slots' policy): `AUTO` ⇒ «Άμεση επιβεβαίωση» alone; `MANUAL` ⇒ «Χρόνος
 * απόκρισης» and «Ρυθμός απόκρισης» from the 6-month metrics, each only when the backend sends it («0%» too, rounded
 * down); unknown (the slots still coming, no services) ⇒ none. `null` when there is no row.
 */
export function buildDoctorResponseRows(
	metrics: DoctorResponseMetricsFacts | undefined,
	confirmationMode: DoctorConfirmationMode | undefined,
	locale: SupportedLocale
): DoctorSummaryRow[] | null {
	const options = { locale };
	if (confirmationMode === 'AUTO') {
		return [
			{
				id: 'response-time',
				title: m.doctor_summary_response_time(
					{ value: m.doctor_response_instant({}, options) },
					options
				),
				description: m.doctor_summary_response_instant_description({}, options)
			}
		];
	}
	if (confirmationMode !== 'MANUAL') return null;
	const rows: DoctorSummaryRow[] = [];
	const id = metrics?.responseTimeId;
	if (id && Object.hasOwn(RESPONSE_TIME_WORDS, id)) {
		rows.push({
			id: 'response-time',
			title: m.doctor_summary_response_time(
				{ value: RESPONSE_TIME_WORDS[id]({}, options) },
				options
			),
			description: responseTimeDescription(metrics?.windowMonths, options)
		});
	}
	const percent = metrics?.responseRatePercent;
	if (typeof percent === 'number' && Number.isFinite(percent) && percent >= 0 && percent <= 100) {
		rows.push({
			id: 'response-rate',
			title: m.doctor_summary_response_rate(
				{ percent: formatDecimal(Math.floor(percent), locale, 0) },
				options
			),
			description: responseRateDescription(metrics?.windowMonths, options)
		});
	}
	return rows.length > 0 ? rows : null;
}

/** U-36.1 / U-72.4: «Ολοκληρωμένες επισκέψεις: 523», no period, whatever the confirmation, or `null` without a visit. */
export function buildDoctorCompletedVisits(
	metrics: DoctorResponseMetricsFacts | undefined,
	locale: SupportedLocale
): string | null {
	const visits = metrics?.completedVisits;
	if (typeof visits !== 'number' || !Number.isFinite(visits) || visits <= 0) return null;
	return m.doctor_expertise_visits({ count: formatDecimal(visits, locale, 0) }, { locale });
}

type MessageOptions = { locale: SupportedLocale };

/** U-72.4: what «Χρόνος απόκρισης» is based on, over the months the SERVER says, never a number of ours. */
function responseTimeDescription(
	windowMonths: number | undefined,
	options: MessageOptions
): string {
	if (windowMonths === undefined) return m.doctor_summary_response_time_description({}, options);
	return windowMonths === 1
		? m.doctor_summary_response_time_description_one({}, options)
		: m.doctor_summary_response_time_description_other({ months: windowMonths }, options);
}

/** U-72.4: what «Ρυθμός απόκρισης» counts, over the months the SERVER says (the application's `responseRateDescription`). */
function responseRateDescription(
	windowMonths: number | undefined,
	options: MessageOptions
): string {
	if (windowMonths === undefined) return m.doctor_summary_response_rate_description({}, options);
	return windowMonths === 1
		? m.doctor_summary_response_rate_description_one({}, options)
		: m.doctor_summary_response_rate_description_other({ months: windowMonths }, options);
}

/** U-36.5: the words of the doctor's response time, or `undefined` for one this page does not know. */
export function doctorResponseWord(
	id: DoctorResponseTimeId | undefined,
	locale: SupportedLocale
): string | undefined {
	return id && Object.hasOwn(RESPONSE_TIME_WORDS, id)
		? RESPONSE_TIME_WORDS[id]({}, { locale })
		: undefined;
}
