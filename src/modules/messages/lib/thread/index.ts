import { messageDay } from '$modules/messages/lib/time';

/** Messages of a side within this much are one group: one time under it, the small corners between them (U-84 Π2). */
const GROUP_WITHIN_MS = 5 * 60_000;

/** One message on the screen: what the server has stored, or what is still leaving this page. */
export type ThreadEntry = {
	/** Stays the same from the moment it is sent to the moment it is stored, so its bubble does not start over. */
	key: string;
	/** The server's id: only a stored message has one, and only that can be reported. */
	id: string | null;
	body: string;
	mine: boolean;
	at: number;
	status: 'sent' | 'pending' | 'failed';
};

export type ThreadRow =
	| { kind: 'day'; key: string; at: number }
	| { kind: 'group'; key: string; mine: boolean; entries: ThreadEntry[] };

/** U-84 Π2: the days and the groups of a conversation, in order. */
export function buildThreadRows(entries: readonly ThreadEntry[]): ThreadRow[] {
	const rows: ThreadRow[] = [];
	let day: string | null = null;
	let group: Extract<ThreadRow, { kind: 'group' }> | null = null;
	for (const entry of entries) {
		const entryDay = messageDay(entry.at);
		if (entryDay !== day) {
			day = entryDay;
			group = null;
			// With its place: a device's clock may put what is leaving before the last stored day, and a key comes once.
			rows.push({ kind: 'day', key: `day-${entryDay}-${rows.length}`, at: entry.at });
		}
		const last = group?.entries.at(-1);
		if (group && group.mine === entry.mine && last && entry.at - last.at < GROUP_WITHIN_MS) {
			group.entries.push(entry);
		} else {
			group = { kind: 'group', key: `group-${entry.key}`, mine: entry.mine, entries: [entry] };
			rows.push(group);
		}
	}
	return rows;
}
