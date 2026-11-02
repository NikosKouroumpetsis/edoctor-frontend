<script lang="ts" module>
	import type { Snippet } from 'svelte';

	export type PageBarProps = {
		/** Where «‹» leads and its words. */
		backHref: string;
		backLabel: string;
		/** A plain press of «‹» (the caller may go back in the history instead). */
		onBack?: (event: MouseEvent) => void;
		/** The page's name in the middle (17/600); decorative: the page's h1 says it. */
		title?: string;
		/**
		 * The page's h1: the title shows in the bar once it has passed under it (U-57.5 Ε3); without one the title
		 * always shows (the application's text pages, U-58.3).
		 */
		watch?: HTMLElement | null;
		/** The trailing buttons (share). */
		actions?: Snippet;
		/** `app` the application's bar (12 + 48 + 16, no line); `web` the 64 bar whose line comes with the scroll. */
		look?: 'app' | 'web';
		/**
		 * The page's ground under the bar: `card` (white) or `background` (the application's grey list screen, U-58.1),
		 * where «‹» takes the card's white circle as the application's `surface="card"`.
		 */
		ground?: 'card' | 'background';
		testId?: string;
		class?: string;
	};
</script>

<script lang="ts">
	import { onMount } from 'svelte';
	import { cn } from '$shared/lib/utils';
	import { IconButton } from '$shared/ui/primitives/icon-button';

	let {
		backHref,
		backLabel,
		onBack,
		title,
		watch,
		actions,
		look = 'web',
		ground = 'card',
		testId,
		class: className
	}: PageBarProps = $props();

	let bar = $state<HTMLElement | null>(null);
	let scrolled = $state(false);
	let passed = $state(false);
	const titled = $derived(watch === undefined ? true : passed);

	onMount(() => {
		let frame = 0;
		const measure = () => {
			frame = 0;
			scrolled = window.scrollY > 0;
			const bottom = bar?.getBoundingClientRect().bottom ?? 0;
			passed = Boolean(watch) && (watch?.getBoundingClientRect().bottom ?? 0) < bottom;
		};
		const schedule = () => {
			if (!frame) frame = requestAnimationFrame(measure);
		};
		measure();
		window.addEventListener('scroll', schedule, { passive: true });
		return () => {
			window.removeEventListener('scroll', schedule);
			if (frame) cancelAnimationFrame(frame);
		};
	});
</script>

<!-- 🔴 U-57.5 Ε3 / U-58.3 (the prototypes 06–10 below 744): the phone's bar of a page — «‹» in its tinted 40 circle
     (48 target), the page's name in the middle (balanced by the trailing buttons' room) and the trailing buttons. Below
     744 only; from 744 the frame's top bar takes over. The title fades in on 0.2 s once the h1 has gone under it. -->
<div
	bind:this={bar}
	data-slot="page-bar"
	data-testid={testId}
	class={cn(
		'sticky top-0 z-30 flex flex-row items-center gap-3 border-b px-4 transition-colors duration-label ease-standard tablet:hidden',
		ground === 'background' ? 'bg-background' : 'bg-card',
		look === 'app' ? 'border-transparent pt-3 pb-4' : 'h-bar-top',
		look === 'web' && (scrolled ? 'border-border/60' : 'border-transparent'),
		className
	)}
>
	<IconButton
		icon="chevron-back"
		href={backHref}
		aria-label={backLabel}
		size="sm"
		appearance="tint"
		surface={ground === 'background' ? 'card' : 'subtle'}
		iconSize="md"
		onclick={onBack}
		data-testid="page-bar-back"
	/>
	<p
		aria-hidden="true"
		data-slot="page-bar-title"
		data-shown={titled ? 'true' : undefined}
		class={cn(
			'min-w-0 flex-1 truncate text-center text-title-xs text-foreground transition-opacity duration-label ease-standard',
			titled && title ? 'opacity-100' : 'opacity-0'
		)}
	>
		{title ?? ''}
	</p>
	<div class="flex min-w-touch flex-row items-center justify-end">
		{@render actions?.()}
	</div>
</div>
