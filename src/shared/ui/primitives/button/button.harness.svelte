<script lang="ts">
	import { Button, type ButtonProps } from './index';

	let { withLeading = false, ...props }: Partial<ButtonProps> & { withLeading?: boolean } =
		$props();
</script>

{#if withLeading}
	<Button label="Αναζήτηση" {...props}>
		{#snippet leading()}
			<span data-testid="leading">⌕</span>
		{/snippet}
	</Button>
{:else}
	<Button label="Αναζήτηση" {...props} />
{/if}
