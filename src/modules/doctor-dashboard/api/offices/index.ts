import { queryOptions } from '@tanstack/svelte-query';
import type { ApiResponseData } from '$shared/lib/api-client';
import { httpSessionGet } from '$shared/lib/http';
import { isUuid } from '$shared/lib/ids';
import { personalQueryMeta } from '$shared/query';
import { isFinalDoctorRefusal } from '$modules/doctor-dashboard/api/appointments';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';

type OfficesView = ApiResponseData<'listDoctorProfileOffices', 200>;

/**
 * One of the doctor's offices as screen 67's filter names it (D-W51-29): its id (the list's `officeId`) and its street
 * and number in each language it was written in («Κηφισίας 120»). 🔴 Screen 72 (D-W51-70): also the doctor it is of (the
 * new appointment's `doctorId`, `null` for an answer that names none) and the whole address in each language
 * («Λεωφ. Κηφισίας 120, Αθήνα 115 26», the office's row). Nothing else of the office is kept (U-65.6).
 */
export type DoctorOfficeFacts = {
	id: string;
	doctorId: string | null;
	lines: { language: string; line: string; address: string }[];
};

// Long enough for any street, short enough that a broken answer cannot grow what the menu draws.
const MAX_TEXT = 200;

const record = (value: unknown): Record<string, unknown> | null =>
	typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
const text = (value: unknown) => {
	if (typeof value !== 'string') return null;
	const read = value.trim();
	return read && read.length <= MAX_TEXT ? read : null;
};

/**
 * 🔴 U-65.6: field by field — an office whose id is no server id, or with no street in any language, is no choice of
 * the filter; one named twice is one.
 */
export function mapDoctorOffices(view: OfficesView | null | undefined): DoctorOfficeFacts[] {
	const rows = Array.isArray(view) ? view : [];
	const byId = new Map<string, DoctorOfficeFacts>();
	for (const row of rows) {
		const office = record(record(row)?.office);
		const id = text(office?.id);
		if (!id || !isUuid(id) || byId.has(id)) continue;
		const doctor = text(record(record(row)?.doctorOffice)?.doctorId);
		const postalCode = text(office?.postalCode);
		const translations = Array.isArray(office?.translations) ? office.translations : [];
		const lines = translations.flatMap((entry) => {
			const translation = record(entry);
			const language = text(translation?.language);
			const line = [text(translation?.street), text(translation?.streetNumber)]
				.filter(Boolean)
				.join(' ');
			const place = [text(translation?.city), postalCode].filter(Boolean).join(' ');
			const address = [line, place].filter(Boolean).join(', ');
			return language && line ? [{ language, line, address }] : [];
		});
		if (lines.length > 0) {
			byId.set(id, { id, doctorId: doctor && isUuid(doctor) ? doctor : null, lines });
		}
	}
	return [...byId.values()];
}

/** `GET /doctor/profile/offices` for the session's own doctor, with the cookies. */
export async function listDoctorOffices(signal?: AbortSignal): Promise<DoctorOfficeFacts[]> {
	return mapDoctorOffices(await httpSessionGet<OfficesView>('/doctor/profile/offices', { signal }));
}

/**
 * D-W51-29: the doctor's offices, read once per visit of screen 67 (they change on another screen, rarely) — personal,
 * gone at a sign-out; a refusal is an answer (the filter then does not show).
 */
export function doctorOfficesQuery() {
	return queryOptions({
		queryKey: doctorDashboardQueryKeys.offices(),
		queryFn: ({ signal }) => listDoctorOffices(signal),
		staleTime: 60_000,
		retry: (failures, error) => !isFinalDoctorRefusal(error) && failures < 1,
		meta: personalQueryMeta
	});
}
