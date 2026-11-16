<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { StatusPill, type StatusPillValue } from '$shared/ui/molecules/status-pill';

	let {
		title,
		subtitle,
		pill,
		href,
		onclick,
		testId,
		class: className
	}: {
		/** The bold line («Δευτέρα 16 Νοεμβρίου · 11:00»), already localized. */
		title: string;
		/** The muted line under it («Επανέλεγχος · 20 λεπτά · Πατησίων 45»). */
		subtitle?: string;
		/** The state's pill at the end, before «›». */
		pill?: StatusPillValue | null;
		/** Where the row leads (already resolved by the caller); `onclick` may open it in place. */
		href: string;
		onclick?: (event: MouseEvent) => void;
		testId?: string;
		class?: string;
	} = $props();
</script>

<!-- One thing with a state, as a row of a list (D-W51-03; `64-switch/sw.css:281-288` `.w-aprow`, screen 73's appointments):
     the title 15/600 over its muted line 13, the state's pill and «›» at the end, a line under the row; in a box narrower
     than 520 (`row-wide`, the phone) the pill goes under the texts. The whole row ONE link. No colour under the pointer (U-100); every word a
     text node (U-65.6). -->
<!-- The caller's address, already resolved (the shared code knows no route). -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<a
	{href}
	{onclick}
	data-slot="status-row"
	data-testid={testId}
	class={cn(
		'group @container block min-h-touch w-full border-b border-line text-start outline-none',
		className
	)}
>
	<span
		class="flex min-h-row w-full flex-row flex-wrap items-center gap-x-3 gap-y-1.5 py-3 row-wide:flex-nowrap"
	>
		<span
			class="flex min-w-0 flex-1 flex-col gap-0.5 rounded-xs group-focus-visible:ring-3 group-focus-visible:ring-ring/50"
		>
			<span class="text-body-md font-semibold text-foreground">{title}</span>
			{#if subtitle}
				<span class="text-label-lg font-normal text-muted-foreground">{subtitle}</span>
			{/if}
		</span>
		<Ionicon
			name="chevron-forward"
			class="order-2 icon-md shrink-0 text-muted-foreground row-wide:order-3"
			aria-hidden="true"
		/>
		{#if pill}
			<StatusPill
				{pill}
				class="order-3 self-center row-wide:order-2"
				testId={testId ? `${testId}-status` : undefined}
			/>
		{/if}
	</span>
</a>
<!-- eslint-enable svelte/no-navigation-without-resolve -->
