import type {
	NotificationChannel,
	NotificationPreferenceCategory as WireCategory,
	NotificationPreferencesView
} from '$shared/lib/api-client';

type WireSection = NotificationPreferencesView['sections'][number];
type WireCell = WireSection['categories'][number]['cells'][number];

/** A kind of notification, a channel it travels on, and whose side of the account it is: the contract's own words. */
export type NotificationPreferenceCategory = WireCategory;
export type NotificationPreferenceChannel = NotificationChannel;
export type NotificationPreferenceSide = WireSection['side'];

/** Who decides a cell (D-132): the server keeps it on, the account's switch, or the doctor of the visit. */
export type NotificationPreferenceMode = WireCell['mode'];

/** A switch that covers part of its kind (`WHEN_DOCTOR_OFFERS`: SMS reminders, only where the doctor offers them). */
export type NotificationPreferenceScope = NonNullable<WireCell['scope']>;

/** One channel of a kind; `enabled` is `null` where the account decides nothing (`SET_BY_DOCTOR`). */
export type NotificationPreferenceCellFacts = {
	channel: NotificationPreferenceChannel;
	mode: NotificationPreferenceMode;
	enabled: boolean | null;
	scope: NotificationPreferenceScope | null;
};

export type NotificationPreferenceCategoryFacts = {
	category: NotificationPreferenceCategory;
	cells: NotificationPreferenceCellFacts[];
};

export type NotificationPreferenceSectionFacts = {
	side: NotificationPreferenceSide;
	categories: NotificationPreferenceCategoryFacts[];
};

/**
 * The centre of the account as the pages read it (`GET /notification/preferences/me`): its sides, their kinds and
 * each kind's channels, in the server's order — only what the contract names, nothing a broken answer adds.
 */
export type NotificationPreferencesFacts = { sections: NotificationPreferenceSectionFacts[] };

/** 🔴 D-W45-24: ONE switch in its new place — the whole body of a write. */
export type NotificationPreferenceChange = {
	category: NotificationPreferenceCategory;
	channel: NotificationPreferenceChannel;
	enabled: boolean;
};

/** Why a write was refused: the session ended (`401`), or anything else. */
export type NotificationPreferenceFailure = 'session' | 'unknown';
