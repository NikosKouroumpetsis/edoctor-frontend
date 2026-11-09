<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import type { BookingCardAction } from '$modules/appointments/lib/booking';

	let {
		action,
		href,
		onOpen
	}: {
		action: BookingCardAction;
		/** The screen's own address (a link: a new tab, and no JavaScript, still open it). */
		href: string;
		/** A plain press: the page opens the screen itself, so leaving it can go back (U-102). */
		onOpen: (event: MouseEvent) => void;
	} = $props();
</script>

<!-- 🔴 U-102: «Αλλαγή» / «Προσθήκη» is a LINK to a new screen, never a modal: 32 high, the 8 corner, 12/500 on the chip's
     fill (record §3.2), dark when it is the way out; its 48 target around it. No colour under the pointer (U-100). -->
<!-- The screen's address, already resolved (a module knows no route). -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<a
	{href}
	aria-label={action.ariaLabel}
	data-slot="booking-change"
	data-step={action.step}
	data-emphasis={action.emphasis || undefined}
	class="group -my-2 inline-flex min-h-touch min-w-touch shrink-0 items-center justify-end outline-none"
	onclick={onOpen}
>
	<span
		aria-hidden="true"
		class={cn(
			'inline-flex h-control-xs items-center rounded-sm px-3 text-label-md font-medium whitespace-nowrap group-focus-visible:ring-3 group-focus-visible:ring-ring/50',
			// 🔴 U-129.1: the prototype's `--chip` (`30-booking/booking.css:12`), not the shared `muted`.
			action.emphasis ? 'bg-foreground text-card' : 'bg-chip text-foreground'
		)}
	>
		{action.label}
	</span>
</a>
<!-- eslint-enable svelte/no-navigation-without-resolve -->
