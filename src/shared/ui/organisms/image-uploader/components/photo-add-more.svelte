<!--
  "Add more" tile (shot6) — a dashed square button that reopens the upload
  dialog to stage additional photos.
-->
<script lang="ts">
	import PlusIcon from '~icons/lucide/plus';
	import { m } from '$paraglide/messages.js';
	import { AspectRatio } from '$shared/ui/primitives/aspect-ratio';
	import { getImageUploaderContext } from '../lib/context';

	const ctx = getImageUploaderContext();
</script>

<button
	type="button"
	data-slot="photo-add-more"
	onclick={() => ctx.openDialog()}
	class="w-full outline-none"
	aria-label={m.image_uploader_add_more()}
>
	<AspectRatio
		ratio={1}
		class="flex flex-col items-center justify-center gap-inline rounded-media border border-dashed border-border bg-muted/20 text-muted-foreground transition-colors hover:bg-muted/40"
	>
		<PlusIcon class="icon-xl" />
		<span class="text-body-sm">{m.image_uploader_add_more()}</span>
	</AspectRatio>
</button>
