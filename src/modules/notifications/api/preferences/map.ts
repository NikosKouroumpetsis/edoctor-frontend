import type {
	NotificationPreferenceCategory,
	NotificationPreferenceCategoryFacts,
	NotificationPreferenceCellFacts,
	NotificationPreferenceChannel,
	NotificationPreferenceMode,
	NotificationPreferenceScope,
	NotificationPreferenceSectionFacts,
	NotificationPreferenceSide,
	NotificationPreferencesFacts
} from './types';

// The contract's words, total over their types: a word the contract gains or loses does not compile here.
const SIDES = { PATIENT: true, DOCTOR: true } as const satisfies Record<
	NotificationPreferenceSide,
	true
>;
const CATEGORIES = {
	APPOINTMENT_UPDATES: true,
	REMINDERS: true,
	RATINGS: true,
	QUESTIONS: true,
	MESSAGES: true,
	ACCOUNT: true,
	DOCTOR_NEW_APPOINTMENTS: true,
	DOCTOR_PATIENT_CHANGES: true,
	DOCTOR_RATINGS: true,
	DOCTOR_MESSAGES: true,
	DOCTOR_ACCOUNT: true,
	DOCTOR_OPERATIONS: true
} as const satisfies Record<NotificationPreferenceCategory, true>;
const CHANNELS = { EMAIL: true, SMS: true, PUSH: true } as const satisfies Record<
	NotificationPreferenceChannel,
	true
>;
const MODES = { ALWAYS: true, TOGGLE: true, SET_BY_DOCTOR: true } as const satisfies Record<
	NotificationPreferenceMode,
	true
>;
const SCOPES = {
	NEW_REQUESTS_ONLY: true,
	LATE_CANCELLATIONS_ONLY: true,
	WHEN_DOCTOR_OFFERS: true
} as const satisfies Record<NotificationPreferenceScope, true>;

/** The word when it is one of the contract's, else none (a number, a list, another word, `toString`). */
function wordOf<Word extends string>(table: Record<Word, true>, value: unknown): Word | null {
	return typeof value === 'string' && Object.hasOwn(table, value) ? (value as Word) : null;
}

const listOf = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const recordOf = (value: unknown): Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};

function mapCell(view: unknown): NotificationPreferenceCellFacts | null {
	const entry = recordOf(view);
	const channel = wordOf(CHANNELS, entry.channel);
	const mode = wordOf(MODES, entry.mode);
	if (!channel || !mode) return null;
	return {
		channel,
		mode,
		enabled: typeof entry.enabled === 'boolean' ? entry.enabled : null,
		scope: wordOf(SCOPES, entry.scope)
	};
}

function mapCategory(view: unknown): NotificationPreferenceCategoryFacts | null {
	const entry = recordOf(view);
	const category = wordOf(CATEGORIES, entry.category);
	if (!category) return null;
	return {
		category,
		cells: listOf(entry.cells).flatMap((cell) => {
			const facts = mapCell(cell);
			return facts ? [facts] : [];
		})
	};
}

function mapSection(view: unknown): NotificationPreferenceSectionFacts | null {
	const entry = recordOf(view);
	const side = wordOf(SIDES, entry.side);
	if (!side) return null;
	return {
		side,
		categories: listOf(entry.categories).flatMap((category) => {
			const facts = mapCategory(category);
			return facts ? [facts] : [];
		})
	};
}

/**
 * W-4 / 🔴 U-65.6: the server's answer as facts — a side, a kind, a channel or a mode the contract does not name is
 * left out (its section, its row or its cell), a switch that is no boolean reads as undecided, and an answer that is
 * no centre at all reads as an empty one; never a throw, never a word of the answer drawn as it came.
 */
export function mapNotificationPreferences(view: unknown): NotificationPreferencesFacts {
	return {
		sections: listOf(recordOf(view).sections).flatMap((section) => {
			const facts = mapSection(section);
			return facts ? [facts] : [];
		})
	};
}
