<script lang="ts" module>
	/** A link inside the sentence (a policy page), already resolved by the caller. */
	export type CookieConsentLink = { label: string; href: string };

	/** The words: plain text, or text with inline links in their place (`['… με την ', link, ' και …']`). */
	export type CookieConsentDescription = string | (string | CookieConsentLink)[];

	export type CookieConsentProps = {
		open?: boolean;
		/** Every word comes from the caller, already localized; the caller also stores the choice. */
		title: string;
		description: CookieConsentDescription;
		acceptLabel: string;
		rejectLabel: string;
		/** The third way, a link-styled button (the categories); none without both. */
		manageLabel?: string;
		onManage?: () => void;
		/** The region's name. */
		'aria-label': string;
		onAccept?: () => void;
		onReject?: () => void;
		class?: string;
	};
</script>

<script lang="ts">
	import { Presence } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { Button } from '$shared/ui/primitives/button';
	import { TextButton } from '$shared/ui/primitives/text-button';

	let {
		open = $bindable(true),
		title,
		description,
		acceptLabel,
		rejectLabel,
		manageLabel,
		onManage,
		'aria-label': ariaLabel,
		onAccept,
		onReject,
		class: className
	}: CookieConsentProps = $props();

	// In the DOM until its CSS leave ends (U-12.2): it rises in and fades, and fades out when a choice is made — in
	// Airbnb's 0.4 s (`consent`, the wave record §4.5) on the standard curve.
	const presence = new Presence(() => open, { duration: 'consent' });
	const parts = $derived(typeof description === 'string' ? [description] : description);

	function accept() {
		open = false;
		onAccept?.();
	}
	function reject() {
		open = false;
		onReject?.();
	}
</script>

<!-- Airbnb's floating consent card (U-16.5): a title, the words with their policy links, then «accept all» and
     «essentials only» side by side in the same dark look (refusing is as easy as accepting) and the link-styled
     third way; stacked on the phone (U-06.2), one row of three from 744. The caller places it. -->
{#if presence.present}
	<div
		role="region"
		aria-label={ariaLabel}
		data-slot="cookie-consent"
		data-state={presence.state}
		inert={presence.closing}
		use:presence.track
		class={cn(
			'flex flex-col gap-4 rounded-lg bg-card p-5.5 text-card-foreground shadow-soft tablet:p-6',
			'transition-[opacity,translate] duration-consent ease-standard data-[state=closed]:pointer-events-none data-[state=closed]:translate-y-3 data-[state=closed]:opacity-0 starting:translate-y-3 starting:opacity-0',
			className
		)}
	>
		<div class="flex flex-col gap-2">
			<p class="text-title-sm font-semibold tablet:text-title-lg">{title}</p>
			<p class="text-body-sm leading-normal text-foreground/90">
				{#each parts as part, index (index)}{#if typeof part === 'string'}{part}{:else}<a
							href={part.href}
							data-slot="cookie-consent-link"
							class="font-semibold text-foreground underline outline-none focus-visible:ring-3 focus-visible:ring-ring/50 can-hover:hover:decoration-2"
							>{part.label}</a
						>{/if}{/each}
			</p>
		</div>
		<div
			data-slot="cookie-consent-actions"
			class="grid grid-cols-1 gap-2.5 tablet:grid-cols-3 tablet:items-center"
		>
			<Button
				tone="contrast"
				radius="sm"
				label={acceptLabel}
				textClass="text-body-md"
				onclick={accept}
			/>
			<Button
				tone="contrast"
				radius="sm"
				label={rejectLabel}
				textClass="text-body-md"
				onclick={reject}
			/>
			{#if manageLabel && onManage}
				<TextButton label={manageLabel} underline textClass="text-body-sm" onclick={onManage} />
			{/if}
		</div>
	</div>
{/if}
