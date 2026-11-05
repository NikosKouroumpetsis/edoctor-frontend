<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { BrandAppleLeftAligned } from '$shared/ui/icons/brand-apple';
	import ProviderContinue from './provider-continue.svelte';

	let props: Omit<ComponentProps<typeof ProviderContinue>, 'provider' | 'mark'> = $props();
</script>

<!-- Apple's left-aligned file, at the button's height (U-95). -->
<ProviderContinue provider="apple" {...props}>
	{#snippet mark()}
		<BrandAppleLeftAligned class="h-control-md" data-testid="auth-apple-continue-mark" />
	{/snippet}
</ProviderContinue>
