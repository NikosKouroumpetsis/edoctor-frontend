<script lang="ts">
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let {
		label,
		onPress,
		testId
	}: {
		/** «Συνδεθείτε για κόστος», unchanged: the action is named by its words (S-31.4). */
		label: string;
		/** Opens the sign-in (S-31.4), never the card's profile. */
		onPress: () => void;
		testId?: string;
	} = $props();

	// The lock never ends a line alone: it and the first word are one unbreakable run, the rest wraps as text.
	const firstSpace = $derived(label.indexOf(' '));
	const head = $derived(firstSpace < 0 ? label : label.slice(0, firstSpace));
	const tail = $derived(firstSpace < 0 ? '' : label.slice(firstSpace));

	// A button's keys: Enter at once, Space on its release (and never the page's scroll).
	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			onPress();
		} else if (event.key === ' ') event.preventDefault();
	}
	function onkeyup(event: KeyboardEvent) {
		if (event.key !== ' ') return;
		event.preventDefault();
		onPress();
	}
</script>

<!-- 🔴 U-27.4 (app = web, the owner's choice of 15:22; f1b: no change of layout): the hidden fee is an action — the
     kit's lock, then the words in the text colour, 600 and underlined (Airbnb's pressable words inside a card), INLINE
     in its line: the line's own size and height, wrapping with the line's other words («🔒 Συνδεθείτε για κόστος ·
     ★ 4,9»). A `<button>` is always an atomic inline box (the HTML rendering of buttons), so its words could not flow
     with the line's: the action is a `span` with the button's role, keys and focus. Its target grows without layout,
     4 px on every side (`after:-inset-1`, the application's `hitSlop` 4: at least 24 × 24, WCAG 2.5.8 AA), into the
     lines beside it by 4 at most; the kit's focus ring is drawn around the words (each line of them). It lies over the
     card's link, never inside it (the heart's way); `pointer-events-auto` lets it take the press the card's lines let
     through. -->
<span
	role="button"
	tabindex="0"
	data-slot="doctor-card-fee-action"
	data-testid={testId}
	class="pointer-events-auto relative rounded-xs box-decoration-clone font-semibold text-foreground underline outline-none after:absolute after:-inset-1 focus-visible:ring-3 focus-visible:ring-ring/50"
	onclick={() => onPress()}
	{onkeydown}
	{onkeyup}
	><span class="whitespace-nowrap"
		><Ionicon
			name="lock-closed-outline"
			class="mr-1 inline-block icon-xs align-middle"
		/>{head}</span
	>{tail}</span
>
