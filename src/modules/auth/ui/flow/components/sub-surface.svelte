<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Presence } from '$shared/lib/headless';

	let {
		open,
		label,
		onClose,
		children
	}: {
		open: boolean;
		label?: string;
		onClose: () => void;
		children: Snippet;
	} = $props();

	const presence = new Presence(() => open, { duration: 'standard' });

	/** The focus goes in with the panel and back to what opened it when it goes. */
	function holdFocus(node: HTMLElement) {
		const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		node.focus({ preventScroll: true });
		return { destroy: () => opener?.focus({ preventScroll: true }) };
	}
</script>

<!-- The small surfaces over a step (the country, «Δοκιμάστε με άλλο τρόπο», the date, the gender): below 744 the
     application's bottom sheet with its handle, from 744 the same content in a panel inside the window. By CSS alone,
     in and out (U-12); they live inside the surface, so its focus trap holds them too. -->
{#if presence.present}
	<div
		use:presence.track
		data-slot="auth-sub-surface"
		data-state={presence.state}
		inert={presence.closing}
		class="absolute inset-0 z-10 transition-opacity duration-standard ease-standard data-[state=closed]:pointer-events-none data-[state=closed]:opacity-0 starting:opacity-0"
	>
		<div
			aria-hidden="true"
			data-slot="auth-sub-surface-backdrop"
			class="absolute inset-0 bg-overlay"
			onclick={onClose}
		></div>
		<div
			class="pointer-events-none absolute inset-0 flex flex-col justify-end pt-section tablet:p-4"
		>
			<div
				use:presence.track
				use:holdFocus
				role="dialog"
				tabindex={-1}
				aria-modal="true"
				aria-label={label}
				data-state={presence.state}
				class="pointer-events-auto flex max-h-full min-h-0 flex-col rounded-t-xl bg-card pt-2 pb-safe-area-3 transition-[translate] duration-standard ease-sheet outline-none data-[state=closed]:translate-y-full tablet:rounded-xl tablet:shadow-floating starting:translate-y-full"
			>
				<span
					aria-hidden="true"
					class="mx-auto mt-0.5 mb-2 h-1 w-drawer-handle shrink-0 rounded-full bg-muted-foreground/45"
				></span>
				<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
					{@render children()}
				</div>
			</div>
		</div>
	</div>
{/if}
