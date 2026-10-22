<!--
  Empty / entry surface (surface A, shot1).

  Title + subtitle above a large dashed placeholder card holding a centered
  illustration and a light pill CTA that opens the upload dialog. Copy defaults
  to the `m.image_uploader_*` catalog but every piece is overridable (decision
  D-3): `title`, `subtitle`, `cta`, and the `illustration` snippet (A6 — the
  default is an Iconify camera; drop in the 3D asset later without an API change).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import CameraIcon from '~icons/lucide/camera';
	import { m } from '$paraglide/messages.js';
	import { getImageUploaderContext } from '../lib/context';

	let {
		title,
		subtitle,
		cta,
		illustration
	}: {
		title?: string;
		subtitle?: string;
		cta?: string;
		illustration?: Snippet;
	} = $props();

	const ctx = getImageUploaderContext();
	const photosNeeded = $derived(ctx.minCount ?? ctx.maxCount ?? 1);
</script>

<section data-slot="uploader-empty" class="space-y-list">
	<div class="space-y-2">
		<h2 class="text-heading-lg font-bold text-foreground">
			{title ?? m.image_uploader_empty_title()}
		</h2>
		<p class="text-body-md text-muted-foreground">
			{subtitle ?? m.image_uploader_empty_subtitle({ count: photosNeeded })}
		</p>
	</div>

	<div
		class="flex min-h-dropzone-min-h flex-col items-center justify-center gap-section rounded-xl border border-dashed border-border bg-muted/30 p-section text-center"
	>
		{#if illustration}
			{@render illustration()}
		{:else}
			<span
				class="grid size-avatar-2xl place-items-center rounded-full bg-muted text-muted-foreground"
			>
				<CameraIcon class="icon-xl" />
			</span>
		{/if}

		<button
			type="button"
			onclick={() => ctx.openDialog()}
			class="inline-flex min-h-touch min-w-touch items-center justify-center rounded-full bg-muted px-6 py-3 text-label-lg font-medium text-foreground transition-colors outline-none hover:bg-muted/80 focus-visible:ring-3 focus-visible:ring-ring/50"
		>
			{cta ?? m.image_uploader_empty_cta()}
		</button>
	</div>
</section>
