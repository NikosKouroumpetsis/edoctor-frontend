/** Default debounce window, tuned for typeahead (the application's `DEFAULT_DEBOUNCE_MS`). */
export const DEFAULT_DEBOUNCE_MS = 500;

/** A debounced copy of a value: `current` follows it after the window of quiet. */
export type DebouncedValue<T> = { readonly current: T };

export type DebouncedValueOptions = {
	/**
	 * While false nothing is written and no timer runs; turning true takes the value at once, as the application's
	 * hook does when the component that holds it is mounted anew (a list that shows again). Always on without it.
	 */
	active?: () => boolean;
};

/**
 * The application's `useDebouncedValue`: a debounced copy of `read()` that updates only after `delayMs` of quiet.
 * The first value is there at once; every change clears the pending timer, and so does the owner's teardown, so a
 * late tick never writes a stale value. Call it while a component (or an `$effect.root`) is being set up.
 */
export function useDebouncedValue<T>(
	read: () => T,
	delayMs: number = DEFAULT_DEBOUNCE_MS,
	options: DebouncedValueOptions = {}
): DebouncedValue<T> {
	let current = $state(read());
	let mounted = false;

	$effect(() => {
		const value = read();
		const active = options.active?.() ?? true;
		if (!active) {
			mounted = false;
			return;
		}
		// The mount (the first run, or a return from inactive): the value at once, no wait.
		if (!mounted) {
			mounted = true;
			current = value;
			return;
		}
		const timer = setTimeout(() => {
			current = value;
		}, delayMs);
		return () => clearTimeout(timer);
	});

	return {
		get current() {
			return current;
		}
	};
}
