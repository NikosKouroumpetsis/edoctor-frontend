<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Picture } from '$shared/ui/icons/picture';
	import { DOCTOR_ARTICLE_IMAGE_TYPES } from '$modules/doctor-dashboard/config';

	let {
		locale,
		url,
		error,
		onPick,
		onRemove
	}: {
		locale: SupportedLocale;
		/** The cover drawn now (a new file's preview or the server's), `null` for none. */
		url: string | null;
		error: string | null;
		onPick: (file: File) => void;
		onRemove: () => void;
	} = $props();

	const options = $derived({ locale });
	let input: HTMLInputElement | undefined = $state();
	// A cover that does not load leaves its place (`sw.css:635` `.w-arcover`), never a broken image.
	let failedUrl = $state<string | null>(null);

	function picked(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		const file = target.files?.[0];
		target.value = '';
		if (file) onPick(file);
	}
</script>

<!-- 🔴 D-W52-103 (U-221.1, the upload of screen 78): the cover, optional — «Προσθήκη εικόνας», or the picture with «Άλλη
     εικόνα · Αφαίρεση»; JPG, PNG or WebP up to 10 MB, at least 800 × 600, checked before a byte leaves. No colour under
     the pointer (U-100). -->
<h2 class="mt-6 mb-2 text-body-md font-semibold text-muted-foreground">
	{m.doctor_my_article_cover({}, options)}
</h2>
{#if url}
	<div data-testid="doctor-article-cover">
		{#if failedUrl === url}
			<span
				aria-hidden="true"
				data-testid="doctor-article-cover-missing"
				class="flex aspect-video max-h-cover-max w-full items-center justify-center rounded-lg bg-muted text-line-2"
			>
				<Picture />
			</span>
		{:else}
			<img
				src={url}
				alt=""
				onerror={() => (failedUrl = url)}
				class="aspect-video max-h-cover-max w-full rounded-lg bg-muted object-cover"
			/>
		{/if}
		<div class="mt-2 flex flex-row gap-4">
			<button
				type="button"
				data-testid="doctor-article-cover-other"
				onclick={() => input?.click()}
				class="inline-flex min-h-touch min-w-touch items-center text-body-sm font-semibold text-foreground underline outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
			>
				{m.doctor_my_article_cover_other({}, options)}
			</button>
			<button
				type="button"
				data-testid="doctor-article-cover-remove"
				onclick={onRemove}
				class="inline-flex min-h-touch min-w-touch items-center text-body-sm font-semibold text-foreground underline outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
			>
				{m.doctor_photos_remove({}, options)}
			</button>
		</div>
	</div>
{:else}
	<button
		type="button"
		data-testid="doctor-article-cover-add"
		onclick={() => input?.click()}
		class="flex min-h-control-xl w-full flex-row items-center justify-center gap-2 rounded-lg border border-dashed border-line-2 bg-card text-body-md font-medium text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
	>
		<Ionicon name="camera-outline" class="icon-md" />
		<span>{m.doctor_my_article_cover_add({}, options)}</span>
	</button>
{/if}
{#if error}
	<p
		role="alert"
		data-testid="doctor-article-cover-error"
		class="mt-2 text-label-lg font-medium text-danger-text"
	>
		{error}
	</p>
{/if}
<p class="mt-2 text-label-lg text-muted-foreground">
	{m.doctor_my_article_cover_hint({}, options)}
</p>
<input
	bind:this={input}
	type="file"
	accept={DOCTOR_ARTICLE_IMAGE_TYPES.join(',')}
	class="hidden"
	tabindex="-1"
	aria-hidden="true"
	data-testid="doctor-article-cover-file"
	onchange={picked}
/>
