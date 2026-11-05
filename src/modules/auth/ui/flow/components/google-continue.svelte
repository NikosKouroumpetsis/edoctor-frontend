<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { BrandGoogle } from '$shared/ui/icons/brand-google';
	import ProviderContinue from './provider-continue.svelte';

	let props: Omit<ComponentProps<typeof ProviderContinue>, 'provider' | 'mark'> = $props();
</script>

<!-- Google's colour «G», only ever on the white surface (Google's branding rules), in a box of Apple's file's shape at the
     button's height, so the two buttons draw alike. -->
<ProviderContinue provider="google" {...props}>
	{#snippet mark()}
		<span
			data-testid="auth-google-continue-mark"
			aria-hidden="true"
			class="grid aspect-31/44 h-control-md shrink-0 place-items-center"
		>
			<BrandGoogle class="icon-md" />
		</span>
	{/snippet}
</ProviderContinue>
