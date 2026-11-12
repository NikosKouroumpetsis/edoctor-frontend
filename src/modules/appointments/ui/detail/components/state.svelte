<script lang="ts">
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { Skeleton } from '$shared/ui/primitives/skeleton';

	let {
		kind,
		title,
		body,
		action,
		label
	}: {
		kind: 'loading' | 'failed' | 'missing' | 'guest';
		title: string;
		body: string;
		/** The one way on: «Δοκιμάστε ξανά», «Τα ραντεβού μου», «Σύνδεση». */
		action: { label: string; href?: string; onPress?: () => void } | null;
		/** The busy region's name while it loads. */
		label: string;
	} = $props();
</script>

{#snippet calendarGlyph()}
	<StateGlyph name="calendar-outline" />
{/snippet}
{#snippet errorGlyph()}
	<StateGlyph name="cloud-offline-outline" />
{/snippet}

<!-- Record §7.2 · the appointment's own states (`appt.js:181-186`): its wait (the head, the card), its failure with
     «Δοκιμάστε ξανά», «Δεν βρήκαμε αυτό το ραντεβού» (a 404 and a 403 alike: another account's appointment is never told
     apart) with the way to the list, and the guest's «Σύνδεση» over the page. -->
{#if kind === 'loading'}
	<div data-testid="appointment-loading" aria-busy="true" aria-label={label} class="grid gap-3">
		<Skeleton class="h-6 w-1/4 rounded-full" />
		<Skeleton class="h-control-xs w-2/3 rounded-sm" />
		<Skeleton class="h-4.5 w-2/5 rounded-xs" />
		<Skeleton class="mt-2 h-pane-skeleton w-full rounded-md" />
		<Skeleton class="h-placeholder-lg w-full rounded-md" />
	</div>
{:else if action?.href}
	<EmptyState
		titleAs="h2"
		{title}
		description={body}
		actionLabel={action.label}
		actionHref={action.href}
		actionTone="contrast"
		icon={calendarGlyph}
		class="pt-section-lg"
		testId={`appointment-${kind}`}
	/>
{:else if action?.onPress}
	<EmptyState
		titleAs="h2"
		{title}
		description={body}
		actionLabel={action.label}
		onActionPress={action.onPress}
		actionTone="contrast"
		icon={kind === 'failed' ? errorGlyph : calendarGlyph}
		class="pt-section-lg"
		testId={`appointment-${kind}`}
	/>
{:else}
	<EmptyState
		titleAs="h2"
		{title}
		description={body}
		icon={kind === 'failed' ? errorGlyph : calendarGlyph}
		class="pt-section-lg"
		testId={`appointment-${kind}`}
	/>
{/if}
