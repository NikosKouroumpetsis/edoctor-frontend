/**
 * A press the page may take over: the main button, no modifier, not already handled — a new tab or window (⌘, Ctrl,
 * Shift, the middle button) keeps the link's own way. The booking's and the patient's appointment screens (review w4-w4
 * R1 NIT-1: a rule of the click, no word of a feature's).
 */
export function isPlainClick(event: MouseEvent): boolean {
	return (
		!event.defaultPrevented &&
		event.button === 0 &&
		!event.metaKey &&
		!event.ctrlKey &&
		!event.shiftKey &&
		!event.altKey
	);
}
