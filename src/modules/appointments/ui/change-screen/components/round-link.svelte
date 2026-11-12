<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon, type IoniconName } from '$shared/ui/icons/ionicon';

	let {
		href,
		label,
		icon,
		wideIcon,
		wideLabel,
		onclick,
		testId
	}: {
		href: string;
		/** Its name (below 744 only, when `wideLabel` names it otherwise from 744). */
		label: string;
		icon: IoniconName;
		/** From 744 another glyph (screen 30: «×» below 744, «←» from it, record §3.4). */
		wideIcon?: IoniconName;
		/** From 744 another name, with that glyph (screen 30: «Κλείσιμο» / «Πίσω», `strings.json`; MINOR-5 of R1). */
		wideLabel?: string;
		onclick?: (event: MouseEvent) => void;
		testId?: string;
	} = $props();
</script>

<!-- Record §3.2 / §3.3: the round 40 (the `chip` fill) inside its 48 target, at the top of a booking screen; a link, so it
     works without JavaScript too. Its name follows its glyph: one hidden line per width. No colour under the pointer
     (U-100, D-W3-27). -->
<!-- The screen's address, already resolved (a module knows no route). -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<a
	{href}
	aria-label={wideLabel ? undefined : label}
	data-slot="booking-round-link"
	data-testid={testId}
	class="group inline-flex size-touch shrink-0 items-center justify-center rounded-full outline-none"
	{onclick}
>
	<span
		aria-hidden="true"
		class="flex size-control-sm items-center justify-center rounded-full bg-foreground/5 text-foreground group-focus-visible:ring-3 group-focus-visible:ring-ring/50"
	>
		<Ionicon name={icon} class={cn('icon-md', wideIcon && 'tablet:hidden')} />
		{#if wideIcon}
			<Ionicon name={wideIcon} class="hidden icon-md tablet:block" />
		{/if}
	</span>
	{#if wideLabel}
		<span data-slot="booking-round-link-name" class="sr-only tablet:hidden">{label}</span>
		<span data-slot="booking-round-link-name" class="hidden tablet:sr-only tablet:inline"
			>{wideLabel}</span
		>
	{/if}
</a>
<!-- eslint-enable svelte/no-navigation-without-resolve -->
