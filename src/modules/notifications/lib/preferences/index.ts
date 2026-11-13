import { m } from '$paraglide/messages.js';
import type {
	NotificationPreferenceCategory,
	NotificationPreferenceCategoryFacts,
	NotificationPreferenceCellFacts,
	NotificationPreferenceChange,
	NotificationPreferenceChannel,
	NotificationPreferenceScope,
	NotificationPreferencesFacts
} from '$modules/notifications/api/preferences';
import { notificationGroups } from '$modules/notifications/config/groups';
import type {
	NotificationGroupId,
	NotificationGroupSeed,
	NotificationSettingsCell,
	NotificationSettingsGroup,
	NotificationSettingsRow
} from '$modules/notifications/types';

type MessageOptions = { locale: 'el' | 'en' };
type Words = (options: MessageOptions) => string;

const groupTitles: Record<NotificationGroupId, Words> = {
	appointments: (options) => m.notifications_settings_group_appointments({}, options),
	messages: (options) => m.notifications_settings_group_messages({}, options),
	account: (options) => m.notifications_settings_group_account({}, options)
};

// The patient's six kinds, in the application's words (U-140); 🔴 U-173 / D-W45-23: `RATINGS` is «Κριτικές». A kind
// with no name here (the doctor's own, one the contract gains later) has no row: no code is ever drawn as a title.
const categoryTitles: Partial<Record<NotificationPreferenceCategory, Words>> = {
	APPOINTMENT_UPDATES: (options) =>
		m.notifications_center_category_appointment_updates({}, options),
	REMINDERS: (options) => m.notifications_center_category_reminders({}, options),
	RATINGS: (options) => m.notifications_center_category_ratings({}, options),
	MESSAGES: (options) => m.notifications_center_category_messages({}, options),
	QUESTIONS: (options) => m.notifications_center_category_questions({}, options),
	ACCOUNT: (options) => m.notifications_center_category_account({}, options)
};

// The one line of a kind's window (record §5.5): only the four kinds that have a switch have one.
const windowLines: Partial<Record<NotificationPreferenceCategory, Words>> = {
	APPOINTMENT_UPDATES: (options) => m.notifications_settings_line_appointment_updates({}, options),
	REMINDERS: (options) => m.notifications_settings_line_reminders({}, options),
	RATINGS: (options) => m.notifications_settings_line_ratings({}, options),
	MESSAGES: (options) => m.notifications_settings_line_messages({}, options)
};

const channelLabels: Record<NotificationPreferenceChannel, Words> = {
	EMAIL: (options) => m.notifications_center_channel_email({}, options),
	PUSH: (options) => m.notifications_center_channel_push({}, options),
	SMS: (options) => m.notifications_center_channel_sms({}, options)
};

// The patient's one partial switch; the doctor's two scopes are the doctor's dashboard's to say.
const scopeNotes: Partial<Record<NotificationPreferenceScope, Words>> = {
	WHEN_DOCTOR_OFFERS: (options) => m.notifications_center_scope_when_doctor_offers({}, options)
};

function buildCell(
	cell: NotificationPreferenceCellFacts,
	options: MessageOptions
): NotificationSettingsCell {
	const note = cell.scope ? (scopeNotes[cell.scope]?.(options) ?? null) : null;
	const base = { channel: cell.channel, label: channelLabels[cell.channel](options), note };
	if (cell.mode === 'ALWAYS') {
		return {
			...base,
			control: 'always',
			on: cell.enabled === true,
			fixed: m.notifications_center_mode_always({}, options)
		};
	}
	if (cell.mode === 'SET_BY_DOCTOR') {
		// 🔴 Record §5.5: what the doctor decides is never counted as on, whatever the answer says of it.
		return {
			...base,
			control: 'doctor',
			on: false,
			fixed: m.notifications_center_mode_set_by_doctor({}, options)
		};
	}
	return { ...base, control: 'switch', on: cell.enabled === true, fixed: null };
}

/**
 * What a kind's row says under its title (the approved prototype's `not.js:36-40`): the channels that are on, in the
 * server's order — «Πάντα: …» when EVERY channel of the kind is the server's to keep on, «Ενεργό: …» otherwise — or
 * «Ανενεργό» with none on.
 */
function buildSummary(cells: readonly NotificationSettingsCell[], options: MessageOptions): string {
	const channels = cells.filter((cell) => cell.on).map((cell) => cell.label);
	if (channels.length === 0) return m.notifications_settings_summary_off({}, options);
	const joined = { channels: channels.join(', ') };
	return cells.every((cell) => cell.control === 'always')
		? m.notifications_settings_summary_always(joined, options)
		: m.notifications_settings_summary_on(joined, options);
}

function buildRow(
	entry: NotificationPreferenceCategoryFacts,
	title: string,
	options: MessageOptions
): NotificationSettingsRow {
	const cells = entry.cells.map((cell) => buildCell(cell, options));
	return {
		category: entry.category,
		title,
		summary: buildSummary(cells, options),
		line: windowLines[entry.category]?.(options) ?? null,
		// «Αλλαγή» only where the account has a switch to flip (record §5.5: a kind of «Πάντα» alone has none).
		canChange: cells.some((cell) => cell.control === 'switch'),
		cells
	};
}

/**
 * 🔴 «Ειδοποιήσεις» as its three groups (D-W45-22): the PATIENT's side alone, also on a doctor's account (U-164.1). A
 * kind the server does not send has no row; one outside the groups' table joins the LAST group; one the page cannot
 * name, or with no channel at all, is left out; a group left with no row is not drawn. `groups` is the fixed table.
 */
export function buildNotificationGroups(
	facts: NotificationPreferencesFacts,
	options: MessageOptions,
	groups: readonly NotificationGroupSeed[] = notificationGroups
): NotificationSettingsGroup[] {
	const rows = facts.sections
		.filter((section) => section.side === 'PATIENT')
		.flatMap((section) => section.categories)
		// One row a kind, the first the answer names (a kind named twice would be two rows of one switch).
		.filter(
			(entry, index, all) => all.findIndex((other) => other.category === entry.category) === index
		)
		.flatMap((entry) => {
			const title = categoryTitles[entry.category]?.(options);
			return title && entry.cells.length > 0 ? [buildRow(entry, title, options)] : [];
		});
	const listed = new Set(groups.flatMap((group) => group.categories));
	const last = groups[groups.length - 1]?.id;
	return groups
		.map((group) => ({
			id: group.id,
			title: groupTitles[group.id](options),
			rows: [
				...group.categories.flatMap((category) => rows.filter((row) => row.category === category)),
				...(group.id === last ? rows.filter((row) => !listed.has(row.category)) : [])
			]
		}))
		.filter((group) => group.rows.length > 0);
}

const cellKey = (category: string, channel: string) => `${category}:${channel}`;

/**
 * 🔴 D-W45-24: the centre with the switches the reader just flipped already in their new place, until the server's
 * answer takes over. Only a `TOGGLE` cell moves: a change that names «Πάντα», one the doctor decides or a cell the
 * account has not changes nothing.
 */
export function applyNotificationChanges(
	facts: NotificationPreferencesFacts,
	changes: readonly NotificationPreferenceChange[]
): NotificationPreferencesFacts {
	if (changes.length === 0) return facts;
	const moved = new Map(
		changes.map((change) => [cellKey(change.category, change.channel), change.enabled])
	);
	return {
		sections: facts.sections.map((section) => ({
			...section,
			categories: section.categories.map((entry) => ({
				...entry,
				cells: entry.cells.map((cell) => {
					const enabled = moved.get(cellKey(entry.category, cell.channel));
					return enabled !== undefined && cell.mode === 'TOGGLE' ? { ...cell, enabled } : cell;
				})
			}))
		}))
	};
}
