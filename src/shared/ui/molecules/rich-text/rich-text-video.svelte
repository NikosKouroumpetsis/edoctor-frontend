<script lang="ts">
	import PlayIcon from '~icons/lucide/play';
	import { m } from '$paraglide/messages.js';

	let {
		name,
		embedUrl
	}: {
		/** The provider's own name (`YouTube`, `Vimeo`). */
		name: string;
		/** The frame's ONE address, built from a fixed template by the reader of the text. */
		embedUrl: string;
	} = $props();

	let playing = $state(false);
</script>

<!-- 🔴 D-W52-104 (U-222.4): a video loads ONLY when the reader presses it — until then no frame, no cookie, no call to
     anyone; then ONE frame from the fixed template (YouTube without cookies), sandboxed, without our page's origin. -->
<!-- `64-switch/sw.css:669` `.w-arplay`: the place stays the dark surface in both themes (`--dark` = `secondary`). -->
<figure data-slot="rich-text-video" class="my-6">
	<div
		data-slot="rich-text-video-place"
		class="aspect-video w-full overflow-hidden rounded-lg bg-secondary text-secondary-foreground"
	>
		{#if playing}
			<iframe
				src={embedUrl}
				title={name}
				data-testid="rich-text-video-frame"
				sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
				allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
				allowfullscreen
				referrerpolicy="strict-origin-when-cross-origin"
				loading="lazy"
				class="size-full border-0"
			></iframe>
		{:else}
			<button
				type="button"
				data-testid="rich-text-video-play"
				aria-label={m.rich_text_video_play({ name })}
				onclick={() => (playing = true)}
				class="flex size-full min-h-touch items-center justify-center outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
			>
				<span
					class="flex size-touch items-center justify-center rounded-full bg-secondary-foreground text-secondary"
				>
					<PlayIcon class="icon-md" aria-hidden="true" />
				</span>
			</button>
		{/if}
	</div>
	<figcaption class="mt-2 text-label-lg text-muted-foreground">
		{m.rich_text_video_note({ name })}
	</figcaption>
</figure>
