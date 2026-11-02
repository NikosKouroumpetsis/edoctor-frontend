<script lang="ts">
	import { RevealingPhoto } from '$shared/ui/molecules/revealing-photo';

	let { url, alt }: { url: string; alt: string } = $props();

	// U-57.4 (the prototype 06, Π7): a photo that does not load hides itself (the page goes on with its words).
	let failed = $state(false);
</script>

{#if !failed}
	<div data-testid="article-cover" class="aspect-video w-full overflow-hidden rounded-lg bg-muted">
		<RevealingPhoto
			{url}
			{alt}
			eager
			onError={() => (failed = true)}
			testId="article-cover-photo"
		/>
	</div>
{/if}
