import { isUuid } from '$shared/lib/ids';
import { clampTextLength } from '$shared/lib/text';
import {
	APPOINTMENT_LINE_NAME_MAX,
	APPOINTMENT_LINE_RELATION_MAX
} from '$modules/messages/config/limits';
import type { ConversationAppointmentLine } from '$modules/messages/types';

const LINE_KINDS: readonly ConversationAppointmentLine['kind'][] = [
	'upcoming',
	'request',
	'lastVisit'
];

const recordOf = (value: unknown): Record<string, unknown> | null =>
	typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;

/** A name the server sent, trimmed and cut (U-65.6), `null` for none or for anything that is not text. */
function textOf(value: unknown, max: number): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = clampTextLength(value.trim(), max).trim();
	return trimmed || null;
}

/**
 * 🔴 D-W51-79 · U-65.6: the appointment a conversation of the doctor's side is about, read against the contract's closed
 * words — an unknown `kind`, a time that is no instant ⇒ none (never a wrong line); the relative's names and the word of
 * the relationship as plain text, trimmed and cut.
 */
export function mapAppointmentLine(view: unknown): ConversationAppointmentLine | null {
	const entry = recordOf(view);
	if (!entry) return null;
	const kind = LINE_KINDS.find((candidate) => candidate === entry.kind);
	const startTime = typeof entry.startTime === 'string' ? entry.startTime : '';
	if (!kind || Number.isNaN(Date.parse(startTime))) return null;
	const relative = recordOf(entry.forRelative);
	return {
		kind,
		startTime,
		forRelative: relative
			? {
					firstName: textOf(relative.firstName, APPOINTMENT_LINE_NAME_MAX),
					lastName: textOf(relative.lastName, APPOINTMENT_LINE_NAME_MAX),
					relation: textOf(relative.relation, APPOINTMENT_LINE_RELATION_MAX)
				}
			: null
	};
}

/** 🔴 D-W51-79 · U-65.6: the patient's account of a conversation — it goes into an address, so only a server id. */
export function mapPatientId(value: unknown): string | null {
	return typeof value === 'string' && isUuid(value) ? value : null;
}
