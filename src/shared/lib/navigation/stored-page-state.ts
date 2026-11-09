/**
 * SvelteKit's own key of a history entry's page state (`sveltekit:states`, `@sveltejs/kit` 2.59
 * `runtime/client/constants.js`): the entry keeps it across a reload, while the router starts the reloaded page with an
 * empty `page.state` (`client.js` `_hydrate`).
 */
const STATES_KEY = 'sveltekit:states';

/** A count of steps a page state may carry: a whole number from 0, never a guess. */
function isDepth(value: unknown): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < 100;
}

/**
 * The keys of `App.PageState` whose state counts the pages behind it (`{ depth: number }`): whichever flows declare one
 * — the shared code names none of them (review w3-w4 R1 NIT-1).
 */
export type HistoryDepthFlow = {
	[Key in keyof App.PageState]-?: NonNullable<App.PageState[Key]> extends { depth: number }
		? Key
		: never;
}[keyof App.PageState];

/**
 * Review w3-w3 R1 MINOR-5 (U-112.2, D-W3-31): how many pages of a flow lie behind the current entry of the history —
 * `page.state`'s, else the entry's own stored state after a reload (the browser keeps it) — under `flow`, a key of
 * `App.PageState` that carries a `depth`. `0` when neither says (a link, a new tab), so the caller goes on in place
 * instead of out of the site.
 */
export function readHistoryDepth(
	flow: HistoryDepthFlow,
	pageState: App.PageState,
	historyState: unknown = typeof history === 'undefined' ? undefined : history.state
): number {
	const depthOf = (state: App.PageState | undefined) =>
		(state?.[flow] as { depth?: unknown } | undefined)?.depth;
	const live = depthOf(pageState);
	if (isDepth(live)) return live;
	const stored = (historyState as Record<string, unknown> | null | undefined)?.[STATES_KEY] as
		| App.PageState
		| undefined;
	const kept = depthOf(stored);
	return isDepth(kept) ? kept : 0;
}
