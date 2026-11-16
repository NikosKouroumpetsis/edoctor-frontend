import { m } from '$paraglide/messages.js';
import { PLATFORM_TIME_ZONE } from '$shared/config/time-zone';
import { formatCalendarDay } from '$shared/lib/calendar-day';
import { zonedDay } from '$shared/lib/format';
import type { DoctorLicenceNotice } from '$shared/state/doctor-standing';

type Locale = 'el' | 'en';

export type LicenceNoticeContent = { title: string; lines: string[] };

/** The licence's last day on the platform's calendar, in the reader's words («14 Δεκεμβρίου 2026»). */
function dayOf(endsAt: string, locale: Locale): string | null {
	const instant = Date.parse(endsAt);
	if (Number.isNaN(instant)) return null;
	return formatCalendarDay(zonedDay(instant, PLATFORM_TIME_ZONE), locale, {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
}

/**
 * 🔴 U-185.2 (`64-switch/sw.js:211-216`, 88 §64 «Νέα κείμενα»): the notice above «Σήμερα» — «Η άδειά σας λήγει στις …» from
 * 30 days before the end, «Η άδειά σας έληξε στις …» after it, with what it means; the server says which (D-W51-10).
 * In 5.1 without «Λογαριασμός γιατρού» (D-W51-18: screen 94 comes with 5.3). None for no notice or a broken day.
 */
export function buildLicenceNotice(
	notice: DoctorLicenceNotice | null,
	locale: Locale
): LicenceNoticeContent | null {
	if (!notice) return null;
	const date = dayOf(notice.endsAt, locale);
	if (!date) return null;
	const options = { locale };
	return notice.kind === 'EXPIRED'
		? {
				title: m.doctor_licence_expired_title({ date }, options),
				lines: [m.doctor_licence_expired_body({}, options)]
			}
		: {
				title: m.doctor_licence_expiring_title({ date }, options),
				lines: [m.doctor_licence_expiring_body({}, options)]
			};
}
