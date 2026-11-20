<script lang="ts">
	import PanelIcon from '~icons/lucide/panel-left';
	import { cn } from '$shared/lib/utils';
	import { findSplitViewFold } from './split-view.svelte';

	let {
		label,
		class: className
	}: {
		/** The button's name where it stands, already localized by the caller: to fold in the menu, to open in the rail. */
		label: string;
		/** Places the button (`ml-auto` beside a title); never sizes it. */
		class?: string;
	} = $props();

	const fold = findSplitViewFold();
</script>

<!-- U-216.2 (D-W52-14, `64-switch/sw.js:864`, `sw.css:435`): the button that folds a `SplitView`'s menu to its rail and
     opens it again — one in the menu, one in the rail, each a real button of 48 that says whether the menu is open.
     Nothing below the zone, with `solo`, or outside a `SplitView` whose menu folds; no colour under the pointer
     (U-100). The template moves the focus to the one that shows. -->
{#if fold?.foldable}
	<button
		type="button"
		data-slot="split-view-fold"
		aria-label={label}
		aria-expanded={!fold.folded}
		class={cn(
			'size-touch shrink-0 items-center justify-center rounded-md text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
			fold.shown,
			className
		)}
		onclick={fold.toggle}
	>
		<PanelIcon class="icon-md" aria-hidden="true" />
	</button>
{/if}
