import type { ApiResponseData } from '$shared/lib/api-client';
import { AFM_LENGTH, AMKA_LENGTH } from '$shared/lib/form';
import { isUuid } from '$shared/lib/ids';
import { readInstant } from '$shared/lib/instant';
import { mapDoctorAppointmentPage } from '$modules/doctor-dashboard/api/appointments';
import type {
	DoctorPatientCardFacts,
	DoctorPatientDetails,
	DoctorPatientFacts,
	DoctorPatientKey,
	DoctorPatientKeyKind,
	DoctorPatientPageFacts,
	DoctorPatientPerson,
	DoctorPatientRowFacts
} from './types';

type DoctorPatientListView = ApiResponseData<'searchDoctorPatients', 200>;
type AppointmentPageView = Parameters<typeof mapDoctorAppointmentPage>[0];

// The server's bounds (`D-W51-54`): a name of 80, an email of 254, a mobile of 20 as typed (the stored one is 12 digits).
const MAX_NAME = 80;
const MAX_EMAIL = 254;
const MAX_PHONE = 20;
// The search's page (`limit` ≤ 50) and the phone-match's whole answer (≤ 50): more rows is no answer of the contract's.
const MAX_ROWS = 50;

const record = (value: unknown): Record<string, unknown> | null =>
	typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
const textUpTo = (max: number) => (value: unknown) => {
	if (typeof value !== 'string') return null;
	const read = value.trim();
	return read && read.length <= max ? read : null;
};
const name = textUpTo(MAX_NAME);
const serverId = (value: unknown) => {
	const id = typeof value === 'string' ? value.trim() : '';
	return id && isUuid(id) ? id : null;
};
const email = (value: unknown) => {
	const read = textUpTo(MAX_EMAIL)(value);
	return read && read.includes('@') ? read : null;
};
const phone = (value: unknown) => {
	const read = textUpTo(MAX_PHONE)(value);
	return read && /^\+?\d+$/u.test(read) ? read.replace(/^\+/u, '') : null;
};
const KEY_KINDS = { account: true, relative: true, record: true } as const satisfies Record<
	DoctorPatientKeyKind,
	true
>;
const keyKindOf = (value: unknown): DoctorPatientKeyKind | null =>
	typeof value === 'string' && Object.hasOwn(KEY_KINDS, value)
		? (value as DoctorPatientKeyKind)
		: null;

/** 🔴 D-W51-53: the person only in one of the contract's two shapes, every id a server id; anything else is none. */
function personOf(value: unknown): DoctorPatientPerson | null {
	const person = record(value);
	if (person?.kind === 'RECORD') {
		const recordId = serverId(person.recordId);
		return recordId ? { kind: 'RECORD', recordId } : null;
	}
	if (person?.kind === 'ACCOUNT') {
		const patientId = serverId(person.patientId);
		if (!patientId) return null;
		if (person.relativeId === null || person.relativeId === undefined) {
			return { kind: 'ACCOUNT', patientId, relativeId: null };
		}
		const relativeId = serverId(person.relativeId);
		return relativeId ? { kind: 'ACCOUNT', patientId, relativeId } : null;
	}
	return null;
}

/**
 * 🔴 Screen 72 (D-W51-55; U-65.6): one patient of the doctor as FACTS, field by field, nothing made up — `null` for a row
 * whose key or person is not the contract's, or whose key and person disagree (a record keyed as an account, a relative
 * without its id). Read alike from a row of the search and from the card of one patient (`?kind=&id=`).
 */
export function mapDoctorPatient(value: unknown): DoctorPatientFacts | null {
	const row = record(value);
	const key = record(row?.key);
	const kind = keyKindOf(key?.kind);
	const id = serverId(key?.id);
	const person = personOf(row?.person);
	if (!row || !kind || !id || !person) return null;
	const agrees =
		kind === 'record'
			? person.kind === 'RECORD'
			: person.kind === 'ACCOUNT' && (kind === 'relative') === (person.relativeId !== null);
	if (!agrees) return null;
	const booker = record(row.bookedBy);
	const visits = record(row.visits);
	const count = typeof visits?.count === 'number' ? visits.count : NaN;
	const bookerName = [name(booker?.firstName), name(booker?.lastName)].filter(Boolean).join(' ');
	return {
		key: { kind, id },
		person,
		firstName: name(row.firstName),
		lastName: name(row.lastName),
		phone: phone(row.phone),
		email: email(row.email),
		hasAccount: row.hasAccount === true && person.kind === 'ACCOUNT',
		bookedBy:
			booker && kind === 'relative'
				? {
						name: bookerName || null,
						relationship: name(booker.relationship) ?? name(row.relationship) ?? ''
					}
				: null,
		visits:
			Number.isInteger(count) && count >= 0
				? { count, lastAt: count > 0 ? readInstant(visits?.lastAt) : null }
				: { count: 0, lastAt: null }
	};
}

/** One page of the search, or the phone-match's answer: the rows the page can name, each person once, 50 at most. */
export function mapDoctorPatients(
	view: DoctorPatientListView | null | undefined
): DoctorPatientFacts[] {
	const items = Array.isArray(record(view)?.items) ? (record(view)?.items as unknown[]) : [];
	const seen = new Set<string>();
	return items.slice(0, MAX_ROWS).flatMap((item) => {
		const patient = mapDoctorPatient(item);
		if (!patient) return [];
		const at = `${patient.key.kind}:${patient.key.id}`;
		if (seen.has(at)) return [];
		seen.add(at);
		return [patient];
	});
}

const count = (value: unknown) =>
	typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;
// 🔴 U-121.3: an ΑΜΚΑ of its 11 digits, an ΑΦΜ of its 9 (the server keeps the digits alone); anything else is none.
const digitsOf = (length: number) => (value: unknown) =>
	typeof value === 'string' && new RegExp(`^\\d{${length}}$`, 'u').test(value.trim())
		? value.trim()
		: null;
const amka = digitsOf(AMKA_LENGTH);
const afm = digitsOf(AFM_LENGTH);
const GENDERS = { FEMALE: true, MALE: true, NON_BINARY: true, OTHER_GENE: true } as const;
const gender = (value: unknown) =>
	typeof value === 'string' && Object.hasOwn(GENDERS, value) ? value : null;
// The contract's relationship words (`PARENT`, `CHILD` …): capitals and `_` only, never a sentence.
const relationship = (value: unknown) =>
	typeof value === 'string' && /^[A-Z_]{1,40}$/u.test(value) ? value : null;

/** 🔴 D-W51-63: a key only as the contract's kind and a server id. */
function keyOf(value: unknown): DoctorPatientKey | null {
	const key = record(value);
	const kind = keyKindOf(key?.kind);
	const id = serverId(key?.id);
	return kind && id ? { kind, id } : null;
}

/**
 * 🔴 Screen 73 (D-W51-64, D-W51-74; U-65.6): one row of «Οι ασθενείς μου» — the search's facts (`mapDoctorPatient`), the
 * nearest open appointment only with an instant (`pending` a request), the times the patient did not come.
 */
export function mapDoctorPatientRow(value: unknown): DoctorPatientRowFacts | null {
	const patient = mapDoctorPatient(value);
	if (!patient) return null;
	const row = record(value);
	const next = record(row?.next);
	const startTime = readInstant(next?.startTime);
	return {
		...patient,
		next: startTime ? { startTime, request: next?.status === 'pending' } : null,
		noShows: count(row?.noShows)
	};
}

/** One page of «Οι ασθενείς μου»: the rows the page can name, each person once, 50 at most, and the next cursor. */
export function mapDoctorPatientPage(view: unknown): DoctorPatientPageFacts {
	const page = record(view);
	const items = Array.isArray(page?.items) ? (page.items as unknown[]) : [];
	const seen = new Set<string>();
	const cursor = typeof page?.nextCursor === 'string' ? page.nextCursor.trim() : '';
	return {
		items: items.slice(0, MAX_ROWS).flatMap((item) => {
			const row = mapDoctorPatientRow(item);
			if (!row) return [];
			const at = `${row.key.kind}:${row.key.id}`;
			if (seen.has(at)) return [];
			seen.add(at);
			return [row];
		}),
		nextCursor: /^[A-Za-z0-9_-]{1,512}$/u.test(cursor) ? cursor : null
	};
}

/** 🔴 U-182.7: a person's own details whole, field by field; a value that is not the contract's is none. */
function detailsOf(value: unknown): DoctorPatientDetails {
	const person = record(value);
	return {
		firstName: name(person?.firstName),
		lastName: name(person?.lastName),
		phone: phone(person?.phone),
		email: email(person?.email),
		amka: amka(person?.amka),
		afm: afm(person?.afm)
	};
}

/**
 * 🔴 Screen 73's card (D-W51-65; U-65.6, U-182.7): one patient of the doctor as FACTS — `null` for an answer with no key
 * of the contract's. The flags only where the contract gives them: `editable` and `addedAt` for a record, the
 * conversation (a server id, it goes in an address) for an account, `mergeCandidate` only an account; the two lists as
 * the doctor side of the list reads them.
 */
export function mapDoctorPatientCard(value: unknown): DoctorPatientCardFacts | null {
	const card = record(value);
	const key = keyOf(card?.key);
	if (!card || !key) return null;
	const isRecord = key.kind === 'record';
	const hasAccount = card.hasAccount === true && !isRecord;
	const visits = record(card.visits);
	const candidate = record(card.mergeCandidate);
	const candidateKey = keyOf(candidate?.key);
	return {
		key,
		hasAccount,
		...detailsOf(card),
		gender: key.kind === 'relative' ? gender(card.gender) : null,
		relationship: key.kind === 'relative' ? relationship(card.relationship) : null,
		bookedBy: key.kind === 'relative' && record(card.bookedBy) ? detailsOf(card.bookedBy) : null,
		visits: {
			count: count(visits?.count),
			firstAt: readInstant(visits?.firstAt),
			lastAt: readInstant(visits?.lastAt)
		},
		noShows: count(card.noShows),
		editable: isRecord && card.editable === true,
		conversationId: hasAccount ? serverId(card.conversationId) : null,
		addedAt: isRecord ? readInstant(card.addedAt) : null,
		mergeCandidate:
			isRecord && candidateKey?.kind === 'account'
				? {
						key: candidateKey,
						firstName: name(candidate?.firstName),
						lastName: name(candidate?.lastName)
					}
				: null,
		upcoming: mapDoctorAppointmentPage(record(card.upcoming) as AppointmentPageView),
		past: mapDoctorAppointmentPage(record(card.past) as AppointmentPageView)
	};
}

/** 🔴 D-W51-66 / 67: the key of the card a change or a join answers (the account's after a join); `null` for none. */
export function mapDoctorPatientKey(value: unknown): DoctorPatientKey | null {
	return keyOf(record(value)?.key);
}
