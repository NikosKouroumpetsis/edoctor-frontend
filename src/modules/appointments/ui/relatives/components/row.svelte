<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import type { RelativeRow } from '$modules/appointments/lib/relatives';

	let {
		row,
		href,
		selected,
		onOpen
	}: {
		row: RelativeRow;
		href: string;
		/** From 950 the relative open beside the list: the dark frame (`55-relatives/appt.css:465` `.r-row.on`). */
		selected: boolean;
		onOpen: (event: MouseEvent) => void;
	} = $props();
</script>

<!-- One relative (record §11.2, `55-relatives/appt.css:422-428`, `:464-466`): the initial in its circle, the name, the
     word of the relationship (U-139.5), «›»; the whole row a link to the relative's form. From 950 no «›» and no line
     above the rows, the open one framed dark. No colour under the pointer (U-100); every word a text node (U-65.6). -->
<li>
	<!-- The screen's address, already resolved (a module knows no route). -->
	<!-- eslint-disable svelte/no-navigation-without-resolve -->
	<a
		{href}
		aria-current={selected ? 'page' : undefined}
		data-testid="relatives-row"
		data-selected={selected || undefined}
		onclick={onOpen}
		class={cn(
			'flex min-h-touch w-full flex-row items-center gap-3.5 border-b border-line py-3.5 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 split:border split:px-3',
			selected
				? 'split:rounded-md split:border-foreground split:bg-background split:ring-1 split:ring-foreground split:ring-inset'
				: 'split:border-transparent split:border-b-line'
		)}
	>
		<span
			aria-hidden="true"
			class="grid size-relative-initial shrink-0 place-items-center rounded-full bg-muted text-title-xs font-semibold text-foreground"
		>
			{row.initial}
		</span>
		<span class="flex min-w-0 flex-1 flex-col">
			<span class="text-body-lg font-semibold text-foreground">{row.name}</span>
			{#if row.word}
				<span class="text-label-lg font-normal text-muted-foreground">{row.word}</span>
			{/if}
		</span>
		<Ionicon name="chevron-forward" class="icon-md shrink-0 text-muted-foreground split:hidden" />
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->
</li>
