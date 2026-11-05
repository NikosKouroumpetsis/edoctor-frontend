<script lang="ts">
	import { Presence } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import Toast from './toast.svelte';
	import {
		getToasts,
		type ToastEntry,
		type ToastLift,
		type ToastState
	} from './toast-state.svelte';

	let {
		toasts = getToasts()
	}: {
		/** The tree's toast; the context's by default. */
		toasts?: ToastState;
	} = $props();

	const presence = new Presence(() => Boolean(toasts.current), { duration: 'standard' });

	// What leaves stays drawn with its words until its leave ends.
	let last: ToastEntry | null = null;
	const entry = $derived.by(() => {
		if (toasts.current) last = toasts.current;
		return toasts.current ?? last;
	});

	const lifts: Record<ToastLift, string> = {
		'tab-bar': 'bottom-above-tab-bar',
		'page-bar': 'bottom-above-page-bar'
	};
</script>

<!-- The live region is always in the page, so a screen reader hears what appears in it. Below 744 24 from the sides,
     above what the page keeps at the bottom; from 744 480 in the middle, 32 from the bottom (U-12: 0.25 s, always). -->
<div
	role="status"
	aria-live="polite"
	aria-atomic="true"
	data-slot="toaster"
	class={cn(
		'pointer-events-none fixed inset-x-6 z-60 mx-auto tablet:bottom-section tablet:max-w-text',
		lifts[entry?.lift ?? 'tab-bar']
	)}
>
	{#if presence.present && entry}
		<div
			use:presence.track
			data-slot="toaster-card"
			data-state={presence.state}
			inert={presence.closing}
			class="pointer-events-auto transition-[opacity,translate] duration-standard ease-standard data-[state=closed]:pointer-events-none data-[state=closed]:translate-y-2 data-[state=closed]:opacity-0 starting:translate-y-4 starting:opacity-0"
			role="group"
			onpointerenter={() => toasts.pause()}
			onpointerleave={() => toasts.resume()}
			onfocusin={() => toasts.pause()}
			onfocusout={() => toasts.resume()}
		>
			{#key entry.id}
				<Toast
					message={entry.message}
					tone={entry.tone}
					leading={entry.leading}
					action={entry.action}
					onAction={() => toasts.dismiss(entry.id)}
					class="animate-toast-swap"
				/>
			{/key}
		</div>
	{/if}
</div>
