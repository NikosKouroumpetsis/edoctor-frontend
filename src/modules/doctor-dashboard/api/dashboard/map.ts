import type { DoctorDashboardView } from '$shared/lib/api-client';
import type { DoctorDashboardFacts, DoctorDashboardLicence } from './types';

const REGISTRATIONS = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'LOCKED'] as const;
const STANDINGS = ['NONE', 'ACTIVE', 'EXPIRED'] as const;
const NOTICES = ['EXPIRING', 'EXPIRED'] as const;
// Long enough for any real name or specialty, short enough that a broken answer cannot grow what a page draws.
const MAX_TEXT = 120;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);
const oneOf = <T extends string>(list: readonly T[], value: unknown): T | null =>
	list.find((entry) => entry === value) ?? null;
const text = (value: unknown): string | null =>
	typeof value === 'string' && value.trim() && value.trim().length <= MAX_TEXT
		? value.trim()
		: null;
/** An instant the browser can read (`2026-12-14T…`), else nothing. */
const instant = (value: unknown): string | null =>
	typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null;

function licenceOf(value: unknown): DoctorDashboardLicence {
	const part = isRecord(value) ? value : {};
	return { status: oneOf(STANDINGS, part.status) ?? 'NONE', endsAt: instant(part.endsAt) };
}

/**
 * U-65.6: the answer read field by field — an unknown state, a broken licence or an oversized name is no fact; an answer
 * that is no dashboard is `null` (a failed read). `licensed` is the server's, never recomputed (U-185.1), yet a
 * registration that is not complete is never licensed whatever a broken answer says. 🔴 D-W52-47: `nameLocked` is only
 * the server's own `true` (it is no `licensed`: a revoked licence leaves the name locked); the server refuses the write
 * of a locked name by itself, so a broken answer opens nothing.
 */
export function mapDoctorDashboard(
	view: DoctorDashboardView | null | undefined
): DoctorDashboardFacts | null {
	if (!isRecord(view)) return null;
	const registration = oneOf(REGISTRATIONS, view.registration);
	if (!registration) return null;
	const licences: Record<string, unknown> = isRecord(view.licences) ? view.licences : {};
	const notice = isRecord(view.notice) ? view.notice : null;
	const noticeKind = notice ? oneOf(NOTICES, notice.kind) : null;
	const noticeEnd = notice ? instant(notice.endsAt) : null;
	const card = isRecord(view.card) ? view.card : null;
	return {
		registration,
		marketplace: licenceOf(licences.marketplace),
		payments: licenceOf(licences.payments),
		licensed: view.licensed === true && registration === 'COMPLETED',
		nameLocked: view.nameLocked === true,
		notice: noticeKind && noticeEnd ? { kind: noticeKind, endsAt: noticeEnd } : null,
		lastMode: view.lastMode === 'DOCTOR' ? 'DOCTOR' : 'PATIENT',
		card: card
			? {
					firstName: text(card.firstName),
					lastName: text(card.lastName),
					specialtyName: text(card.specialtyName)
				}
			: null
	};
}
