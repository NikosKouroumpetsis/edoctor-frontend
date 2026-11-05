<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';
	import { SIGN_IN_PROVIDER_COLORS } from '$shared/preferences/theme/sign-in-provider-colors';

	const EDGE_MARGIN = '8%';

	let {
		provider,
		label,
		busy = false,
		mark,
		class: className,
		...restProps
	}: Omit<HTMLButtonAttributes, 'children' | 'disabled'> & {
		provider: 'apple' | 'google';
		label: string;
		/** Its sign-in is on its way: dimmed, presses refused. */
		busy?: boolean;
		/** The provider's mark at the button's height, hidden from assistive tech. */
		mark: Snippet;
	} = $props();
</script>

<!-- «Συνέχεια με …» with its title (U-95, U-96, U-100), the application's `AuthProviderContinue`: white in both themes, title
     and mark black, the two centred together, Airbnb's 48 high at 16/500, at least 8% off the ends. The mark's file has 8
     before its ink, which the title's end margin mirrors, so the ink sits in the middle. The outline lies over the file
     instead of around it, so the file's height stays the button's and the corner clips only its rectangle; the white cannot
     darken, so a press marks the outline. -->
<button
	type="button"
	disabled={busy}
	aria-busy={busy || undefined}
	data-slot={`auth-${provider}-continue`}
	style:background-color={SIGN_IN_PROVIDER_COLORS.surface}
	style:padding-inline={EDGE_MARGIN}
	class={cn(
		'group relative flex min-h-control-md w-full min-w-touch flex-row items-center justify-center overflow-hidden rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
		busy && 'opacity-50',
		className
	)}
	{...restProps}
>
	{@render mark()}
	<span
		data-slot={`auth-${provider}-continue-title`}
		class="me-2 min-w-0 shrink text-body-lg font-medium wrap-anywhere"
		style:color={SIGN_IN_PROVIDER_COLORS.mark}>{label}</span
	>
	<span
		aria-hidden="true"
		class={cn(
			'pointer-events-none absolute inset-0 rounded-md border border-border transition-colors duration-standard ease-standard group-active:border-2 group-active:border-primary can-hover:group-active:border-primary',
			!busy && 'can-hover:group-hover:border-foreground'
		)}
	></span>
</button>
