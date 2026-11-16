<script lang="ts">
	import { cn } from '$shared/lib/utils';

	let {
		label,
		ariaLabel,
		emphasis = false,
		step,
		href,
		onOpen
	}: {
		/** The caller's word for a change or an addition, already localized. */
		label: string;
		/** What it changes, said whole, already localized. */
		ariaLabel: string;
		/** Dark when it is the way out (a fact still missing). */
		emphasis?: boolean;
		/** The screen it opens, named on the link for the tests and the styles. */
		step?: string;
		/** The screen's own address (a link: a new tab, and no JavaScript, still open it). */
		href: string;
		/** A plain press: the page opens the screen itself, so leaving it can go back (U-102). */
		onOpen?: (event: MouseEvent) => void;
	} = $props();
</script>

<!-- 🔴 U-102: a change is a LINK to a new screen, never a modal: 32 high, the 8 corner, 12/500 on the chip's fill (record
     §3.2), dark when it is the way out; its 48 target around it. No colour under the pointer (U-100). One link for every
     card that changes a fact (P-W4 Σ-27; shared since wave 5.1, D-W51-37). -->
<!-- The caller's address, already resolved (shared UI knows no route). -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<a
	{href}
	aria-label={ariaLabel}
	data-slot="change-link"
	data-step={step}
	data-emphasis={emphasis || undefined}
	class="group -my-2 inline-flex min-h-touch min-w-touch shrink-0 items-center justify-end outline-none"
	onclick={onOpen}
>
	<span
		aria-hidden="true"
		class={cn(
			'inline-flex h-control-xs items-center rounded-sm px-3 text-label-md font-medium whitespace-nowrap group-focus-visible:ring-3 group-focus-visible:ring-ring/50',
			// 🔴 U-129.1: the prototype's `--chip` (`30-booking/booking.css:12`), not the shared `muted`.
			emphasis ? 'bg-foreground text-card' : 'bg-chip text-foreground'
		)}
	>
		{label}
	</span>
</a>
<!-- eslint-enable svelte/no-navigation-without-resolve -->
