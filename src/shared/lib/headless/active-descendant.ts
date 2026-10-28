/**
 * The keyboard of a list whose focus stays in a field (`aria-activedescendant`, the combobox pattern of the
 * `command` primitive): ArrowDown / ArrowUp step through `ids` and wrap; from no active option ArrowDown starts at
 * the first and ArrowUp at the last. Every other key gives `null` (not handled) — Home and End too, which belong
 * to the field's caret (APG, editable combobox; review R1 of dyad 4, MINOR-1) — and so does an empty list.
 */
export function nextActiveId(
	ids: readonly string[],
	current: string | undefined,
	key: string
): string | null {
	if ((key !== 'ArrowDown' && key !== 'ArrowUp') || ids.length === 0) return null;
	const index = current === undefined ? -1 : ids.indexOf(current);
	if (index === -1) return key === 'ArrowDown' ? ids[0] : ids[ids.length - 1];
	const step = key === 'ArrowDown' ? 1 : -1;
	return ids[(index + step + ids.length) % ids.length];
}

/**
 * One keydown of a combobox field: the arrows move the active option (prevented, the new id returned), Enter
 * commits the active one (prevented); any other key is left to the field and the active option is returned as is.
 * Shared by `SearchField` and the typing segments of `SearchBar`.
 */
export function handleListboxKeydown(
	event: KeyboardEvent,
	ids: readonly string[],
	activeId: string | undefined,
	onCommit: (id: string) => void
): string | undefined {
	const next = nextActiveId(ids, activeId, event.key);
	if (next !== null) {
		event.preventDefault();
		return next;
	}
	if (event.key === 'Enter' && activeId && ids.includes(activeId)) {
		event.preventDefault();
		onCommit(activeId);
	}
	return activeId;
}
