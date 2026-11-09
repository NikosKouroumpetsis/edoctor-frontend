<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import type { DoctorAvailabilityElsewhere } from '$modules/doctor/lib/detail';

	let {
		content,
		onSelectOffice,
		placement,
		testId
	}: {
		content: DoctorAvailabilityElsewhere;
		onSelectOffice: (officeId: string) => void;
		/** `section`: the tinted panel (the section, the card, the window); `bar`: the booking bar's quiet last line. */
		placement: 'bar' | 'section';
		testId: string;
	} = $props();

	const isBar = $derived(placement === 'bar');
</script>

<!-- 🔴 U-37 case 3 (app = web, the application's `DoctorAvailabilityElsewhereButton`): «Διαθέσιμο στο ιατρείο **Nikis
     12** από **Αύριο · 10:00**» — the active office has no hour and this one has; a press makes it the page's active
     office (U-39.2). Assistive tech reads the sentence whole. -->
<button
	type="button"
	aria-label={content.label}
	data-testid={testId}
	onclick={() => onSelectOffice(content.officeId)}
	class={cn(
		'flex min-h-touch min-w-touch flex-row items-center text-start text-foreground transition-colors duration-standard ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
		isBar
			? 'gap-1.5 self-start rounded-sm text-body-sm'
			: 'w-full gap-2.5 rounded-md bg-primary/10 px-4 py-3.5 text-body-md can-hover:hover:bg-primary/15'
	)}
>
	<Ionicon
		name="calendar-outline"
		class={cn('shrink-0 text-primary-text', isBar ? 'icon-sm' : 'icon-md')}
	/>
	<span class="min-w-0 shrink"
		>{#each content.segments as segment, index (index)}{#if segment.emphasis}<span
					class="font-semibold text-primary-text">{segment.text}</span
				>{:else}{segment.text}{/if}{/each}</span
	>
</button>
