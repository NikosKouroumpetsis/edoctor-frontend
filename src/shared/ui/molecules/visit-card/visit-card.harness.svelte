<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { ButtonStack } from '$shared/ui/molecules/button-stack';
	import VisitCard from './visit-card.svelte';

	let {
		withActions = false,
		onConfirm = () => {},
		...props
	}: Omit<ComponentProps<typeof VisitCard>, 'actions'> & {
		withActions?: boolean;
		onConfirm?: () => void;
	} = $props();
</script>

<!-- Tests only: the card, with the answers of a request under it when asked. -->
{#if withActions}
	<VisitCard {...props}>
		{#snippet actions()}
			<ButtonStack
				actions={[{ id: 'yes', label: 'Επιβεβαίωση', emphasis: true, onPress: onConfirm }]}
			/>
		{/snippet}
	</VisitCard>
{:else}
	<VisitCard {...props} />
{/if}
