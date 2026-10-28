<script lang="ts">
	import { EmptyState, type EmptyStateVariant } from '$shared/ui/molecules/empty-state';

	let {
		title,
		description,
		actionLabel,
		onActionPress,
		variant = 'plain',
		titleAs,
		testId
	}: {
		title: string;
		description: string;
		/** The one action that can change it (a retry): the caller's words and press, always. */
		actionLabel: string;
		onActionPress: () => void;
		variant?: EmptyStateVariant;
		/** The title's tag (`h1` on a page of its own); the look stays. */
		titleAs?: string;
		/** The CALLER's id: two surfaces of one feature are two places to a test. */
		testId?: string;
	} = $props();
</script>

<!-- The application's error state: what happened and the ONE action that can change it, never a silent skeleton.
     `plain` pads the empty state in its own column; `framed` is the empty state's card, alone. -->
{#if variant === 'framed'}
	<EmptyState
		{title}
		{description}
		{actionLabel}
		{onActionPress}
		{titleAs}
		{testId}
		variant="framed"
	/>
{:else}
	<div data-slot="error-state" class="flex flex-col items-center py-6">
		<EmptyState {title} {description} {actionLabel} {onActionPress} {titleAs} {testId} />
	</div>
{/if}
