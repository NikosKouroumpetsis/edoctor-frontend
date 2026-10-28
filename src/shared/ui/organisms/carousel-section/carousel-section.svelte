<script lang="ts" module>
	import type { IoniconName } from '$shared/ui/icons/ionicon';

	/**
	 * The header's circle (the application's `trailing`): pressable and named with `onclick` + `label`, else the
	 * static arrow, hidden from assistive tech — never an unnamed button (the web's idiom of `accessibilityLabel`).
	 */
	export type CarouselSectionTrailing =
		| { icon?: IoniconName; label?: undefined; onclick?: undefined }
		| { icon?: IoniconName; label: string; onclick: () => void };
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Rail } from '$shared/ui/organisms/rail';

	let {
		title,
		subtitle,
		trailing,
		itemsClass,
		headingAs = 'h2',
		class: className,
		children
	}: {
		title: string;
		subtitle?: string;
		trailing?: CarouselSectionTrailing;
		/** Classes of the row of cards (the application's `itemsClassName`). */
		itemsClass?: string;
		/** The heading's level is the page's; the look is the rail's. */
		headingAs?: string;
		/** The column (the application's `className`). */
		class?: string;
		/** The cards, each a direct child of the row. */
		children: Snippet;
	} = $props();
</script>

<!-- The application's `CarouselSection` (U-09.4): the home rail's header — the bold title (20, 22 from the tablet), the
     muted line, the card circle at its end — over a sideways row of cards 12 apart with no bar. It is the `gap` rail
     with a title, so it draws through `Rail` (R5-1): one row, one header, the same keyboard and scroll. -->
<Rail
	{title}
	{subtitle}
	{trailing}
	{itemsClass}
	{headingAs}
	variant="gap"
	class={className}
	data-component="carousel-section"
>
	{@render children()}
</Rail>
