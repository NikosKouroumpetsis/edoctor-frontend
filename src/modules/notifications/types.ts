import type { IoniconName } from '$shared/ui/icons/ionicon';
import type { NotificationInboxFilter } from '$modules/notifications/api/inbox';
import type {
	NotificationPreferenceCategory,
	NotificationPreferenceChannel
} from '$modules/notifications/api/preferences';

/** The three groups of «Ειδοποιήσεις» (wave 4.5, screen 60; D-W45-22), in the page's order. */
export type NotificationGroupId = 'appointments' | 'messages' | 'account';

export type NotificationGroupSeed = {
	id: NotificationGroupId;
	/** The kinds it lists, in the page's order. */
	categories: readonly NotificationPreferenceCategory[];
};

/** What stands beside a channel's name in the window: the account's switch, or who decides instead of it. */
export type NotificationSettingsControl = 'switch' | 'always' | 'doctor';

/** One channel of a kind as the window draws it, in the page's language. */
export type NotificationSettingsCell = {
	channel: NotificationPreferenceChannel;
	/** «Email», «Ειδοποιήσεις εφαρμογής», «SMS». */
	label: string;
	/** A line under the name («Όταν το προσφέρει ο γιατρός»), `null` for none. */
	note: string | null;
	control: NotificationSettingsControl;
	/** It is sent: a switch's place, always `true` for «Πάντα», never for one the doctor decides. */
	on: boolean;
	/** «Πάντα» or «Ορίζει ο γιατρός» in the switch's place; `null` for a switch. */
	fixed: string | null;
};

/** One kind as its row and its window: the title, what is on, the window's line, and whether «Αλλαγή» has a switch. */
export type NotificationSettingsRow = {
	category: NotificationPreferenceCategory;
	title: string;
	summary: string;
	line: string | null;
	canChange: boolean;
	cells: NotificationSettingsCell[];
};

export type NotificationSettingsGroup = {
	id: NotificationGroupId;
	title: string;
	rows: NotificationSettingsRow[];
};

/**
 * Who reads the list of notifications (wave 4.5, screen 63), as the session tells it: a member, a guest, the wait
 * until the browser has asked the session, or a session whose read got no answer (an outage).
 */
export type NotificationsViewer = 'waiting' | 'guest' | 'member' | 'failed';

/**
 * What the list's page shows: a guest's words, its wait, a failure, an account with no notification at all (`none`),
 * a choice with nothing in it (`empty`: «Νέες» or «Προηγούμενες»), or the lines. The first four draw no choices.
 */
export type NotificationInboxView = 'guest' | 'loading' | 'failed' | 'none' | 'empty' | 'rows';

/** One of the three choices as the page draws it: its name with the count («Νέες (2)») and its bare name («Νέες»). */
export type NotificationFilterChoice = {
	id: NotificationInboxFilter;
	label: string;
	title: string;
	selected: boolean;
};

/**
 * 🔴 D-W45-45 / D-W45-59: what a press opens, in the page's own words — the appointment's screen (51) or the visit's
 * review (54). A line about a question, or about a kind the page does not know, opens nothing (no such screen yet).
 */
export type NotificationTarget = { kind: 'appointment' | 'rating'; id: string };

/** One line as its row draws it: the server's words (cut to a line's most), when it came, and whether it is new. */
export type NotificationRow = {
	id: string;
	glyph: IoniconName;
	title: string;
	/** The second line; `null` when the server sent none (the row then has no empty line). */
	body: string | null;
	/** «τώρα», «πριν από 2 ώρες», «Χθες», «8 Νοεμβρίου»; empty when the server's instant is none. */
	when: string;
	/** The instant itself (ISO), for the `<time>`; `null` with an empty `when`. */
	at: string | null;
	fresh: boolean;
	target: NotificationTarget | null;
};
