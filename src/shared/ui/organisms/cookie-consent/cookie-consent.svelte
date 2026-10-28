<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Button } from '$shared/ui/primitives/button';

	let {
		open = $bindable(true),
		title,
		description,
		acceptLabel,
		rejectLabel,
		'aria-label': ariaLabel,
		onAccept,
		onReject,
		class: className
	}: {
		open?: boolean;
		/** Every word comes from the caller, already localized; the caller also stores the choice. */
		title: string;
		description: string;
		acceptLabel: string;
		rejectLabel: string;
		/** The region's name. */
		'aria-label': string;
		onAccept?: () => void;
		onReject?: () => void;
		class?: string;
	} = $props();

	function accept() {
		open = false;
		onAccept?.();
	}
	function reject() {
		open = false;
		onReject?.();
	}
</script>

{#if open}
	<div
		role="region"
		aria-label={ariaLabel}
		data-slot="cookie-consent"
		class={cn(
			'flex flex-col gap-4 rounded-xl border border-border bg-card p-card shadow-overlay tablet:flex-row tablet:items-center',
			className
		)}
	>
		<div class="flex flex-1 items-start gap-3">
			<Ionicon name="shield-checkmark-outline" class="mt-0.5 icon-lg text-primary" />
			<div>
				<p class="text-title-sm font-semibold">{title}</p>
				<p class="mt-1 text-body-sm text-muted-foreground">{description}</p>
			</div>
		</div>
		<!-- Stacked full-width on the phone, so two long labels never push past the card (U-06.2); a row from 744. -->
		<div
			data-slot="cookie-consent-actions"
			class="flex shrink-0 flex-col gap-touch-gap tablet:flex-row"
		>
			<Button tone="outline" label={rejectLabel} onclick={reject} />
			<Button label={acceptLabel} onclick={accept} />
		</div>
	</div>
{/if}
