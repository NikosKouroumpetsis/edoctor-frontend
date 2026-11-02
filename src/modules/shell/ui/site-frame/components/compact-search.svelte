<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SearchDock } from '$shared/state/search-dock';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import type { FrameMessageOptions } from '../types';

	let { dock, messageOptions }: { dock: SearchDock; messageOptions: FrameMessageOptions } =
		$props();

	let button = $state<HTMLButtonElement | null>(null);
	// A long choice («Περιφερειακή Ενότητα Πειραιά») is cut by «…», so the pill keeps to the bar's middle.
	const part = 'max-w-compact-search-part truncate px-4';
</script>

<!-- Airbnb's small search pill (U-16.7, 48 high), in the place of the links once the page's search has gone under
     the bar: «Οποιαδήποτε ειδικότητα | Οπουδήποτε | Οποτεδήποτε» and the accent circle; it drops the search. -->
<button
	bind:this={button}
	type="button"
	aria-expanded={dock.dropped}
	data-slot="compact-search"
	data-testid="header-search-pill"
	onclick={() => dock.drop(button)}
	class="flex min-h-touch min-w-touch flex-row items-center rounded-full border border-border bg-card py-1 pr-1 pl-1.5 text-body-sm font-semibold whitespace-nowrap text-foreground shadow-raised outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
>
	<!-- U-23.2 (Airbnb): what the page's search holds, part by part, else the pill's own words. -->
	<span class={part}>{dock.summary.what || m.compact_search_what({}, messageOptions)}</span>
	<span aria-hidden="true" class="h-5.5 w-px bg-border"></span>
	<span class={part}>{dock.summary.where || m.compact_search_where({}, messageOptions)}</span>
	<span aria-hidden="true" class="h-5.5 w-px bg-border"></span>
	<span class={part}>{dock.summary.when || m.compact_search_when({}, messageOptions)}</span>
	<span
		aria-hidden="true"
		class="grid size-control-xs shrink-0 place-items-center rounded-full bg-accent text-secondary-foreground"
	>
		<Ionicon name="search" class="icon-sm" />
	</span>
	<!-- WCAG 2.5.3: the name starts with the words on screen, then says what the press does. -->
	<span class="sr-only">, {m.search_open({}, messageOptions)}</span>
</button>
