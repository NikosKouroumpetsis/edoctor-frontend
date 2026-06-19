/**
 * Typeahead matching for listbox/menu/select primitives. Ported from the legacy
 * `useTypeahead` (including the repeated-key cycling behaviour). The search
 * buffer auto-clears after `timeout` ms of inactivity.
 */
export function wrapArray<T>(array: T[], startIndex: number): T[] {
	return array.map((_, index) => array[(startIndex + index) % array.length]);
}

/** Resolve the next matching value given the accumulated search string. */
export function getNextMatch(
	values: string[],
	search: string,
	currentMatch?: string
): string | undefined {
	const isRepeated = search.length > 1 && Array.from(search).every((c) => c === search[0]);
	const normalized = isRepeated ? search[0] : search;
	const currentIndex = currentMatch ? values.indexOf(currentMatch) : -1;
	let wrapped = wrapArray(values, Math.max(currentIndex, 0));
	const excludeCurrent = normalized.length === 1;
	if (excludeCurrent) wrapped = wrapped.filter((v) => v !== currentMatch);
	const match = wrapped.find((v) => v.toLowerCase().startsWith(normalized.toLowerCase()));
	return match !== currentMatch ? match : undefined;
}

export interface Typeahead {
	/** Feed a printable key; returns the matched item or null. */
	onInput: (key: string, items: HTMLElement[]) => HTMLElement | null;
	reset: () => void;
}

export function createTypeahead(timeout = 1000): Typeahead {
	let search = '';
	let timer: ReturnType<typeof setTimeout> | null = null;

	function schedule() {
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => {
			search = '';
		}, timeout);
	}

	function onInput(key: string, items: HTMLElement[]): HTMLElement | null {
		if (key.length !== 1 || !key.trim()) return null;
		search += key;
		schedule();
		const active = document.activeElement;
		const values = items.map((i) => i.textContent?.trim() ?? '');
		const currentMatch = items.find((i) => i === active)?.textContent?.trim();
		const next = getNextMatch(values, search, currentMatch);
		if (next === undefined) return null;
		const match = items.find((i) => (i.textContent?.trim() ?? '') === next) ?? null;
		match?.focus();
		return match;
	}

	function reset() {
		search = '';
		if (timer) clearTimeout(timer);
	}

	return { onInput, reset };
}
