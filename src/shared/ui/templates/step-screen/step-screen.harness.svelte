<script lang="ts">
	import StepScreen, { type StepScreenProps } from './step-screen.svelte';

	let {
		content = 'Το περιεχόμενο',
		withFooter = false,
		...props
	}: Omit<StepScreenProps, 'children' | 'footer'> & {
		content?: string;
		withFooter?: boolean;
	} = $props();
</script>

<!-- Tests only: the step screen with a line of content (and, when asked, a footer after its bar). -->
<StepScreen {...props}>
	<p data-testid="content">{content}</p>
	{#snippet footer()}
		{#if withFooter}<p data-testid="footer">Διαγραφή</p>{/if}
	{/snippet}
</StepScreen>
