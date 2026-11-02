<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { MediaPlaceholder } from '$shared/ui/primitives/media-placeholder';
	import { FullscreenModalTemplate } from '$shared/ui/templates/fullscreen-modal';

	let {
		open = $bindable(false),
		name,
		subtitle,
		photoUrl,
		url,
		locale
	}: {
		open?: boolean;
		name: string;
		subtitle: string;
		photoUrl: string | undefined;
		/** The profile's own address, whole (what the link copies). */
		url: string;
		locale: SupportedLocale;
	} = $props();

	const options = $derived({ locale });
	let copied = $state(false);

	async function copy() {
		try {
			await navigator.clipboard.writeText(url);
			copied = true;
		} catch {
			copied = false;
		}
	}
</script>

<!-- 🔴 U-34.2 / Π9 (the web's own; a phone with touch takes the system's share instead): «Κοινοποίηση» — the photo,
     the name, «Ειδικότητα · Περιοχή» and «Αντιγραφή συνδέσμου», which turns into «✓ Ο σύνδεσμος αντιγράφηκε». -->
<FullscreenModalTemplate
	bind:open
	title={m.doctor_share_title({}, options)}
	closeLabel={m.doctor_window_close({}, options)}
	closeTestId="doctor-detail-share-close"
	onClose={() => (copied = false)}
	shape="sheet"
	contentGap="loose"
	data-testid="doctor-detail-share-window"
	class="max-tablet:top-auto max-tablet:h-fit"
>
	<div class="flex flex-row items-center gap-4">
		<span class="relative size-control-xl shrink-0 overflow-hidden rounded-md bg-foreground/5">
			{#if photoUrl}
				<img src={photoUrl} alt="" class="size-full object-cover" />
			{:else}
				<MediaPlaceholder class="h-full" />
			{/if}
		</span>
		<div class="flex min-w-0 flex-col gap-0.5">
			<p class="truncate text-body-lg font-semibold text-foreground">{name}</p>
			<p class="truncate text-body-sm text-muted-foreground">{subtitle}</p>
		</div>
	</div>
	<button
		type="button"
		data-testid="doctor-detail-share-copy"
		onclick={() => void copy()}
		class="flex min-h-control-lg w-full flex-row items-center gap-3 rounded-md border border-border px-4 text-body-md font-semibold text-foreground transition-colors duration-standard ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 can-hover:hover:bg-foreground/5"
	>
		<Ionicon name={copied ? 'checkmark-circle' : 'share-social-outline'} class="icon-md" />
		<span role="status"
			>{copied ? m.doctor_share_copied({}, options) : m.doctor_share_copy({}, options)}</span
		>
	</button>
</FullscreenModalTemplate>
