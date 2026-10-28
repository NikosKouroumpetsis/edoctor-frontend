<!--
  Upload dialog · empty-state dropzone (shot2).

  Dashed drop target with the stacked-photos icon, drag-and-drop copy, and a
  dark "Browse" button. Pointer drag-drop stages files through `ondropfiles`;
  the button delegates to the parent's programmatic file picker.
-->
<script lang="ts">
	import ImagesIcon from '~icons/lucide/images';
	import { m } from '$paraglide/messages.js';
	import { cn } from '$shared/lib/utils';
	import { Button } from '$shared/ui/primitives/button';

	let {
		onbrowse,
		ondropfiles
	}: {
		onbrowse: () => void;
		ondropfiles: (files: FileList) => void;
	} = $props();

	let dragOver = $state(false);

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		dragOver = true;
	}

	function handleDragLeave() {
		dragOver = false;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		if (event.dataTransfer?.files?.length) ondropfiles(event.dataTransfer.files);
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	data-slot="upload-dropzone"
	data-drag-over={dragOver ? '' : undefined}
	class={cn(
		'flex flex-col items-center gap-list rounded-xl border border-dashed p-section text-center transition-colors',
		dragOver ? 'border-ring bg-muted/40' : 'border-border bg-muted/20'
	)}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
>
	<ImagesIcon class="icon-lg text-foreground" />
	<div class="space-y-1">
		<p class="text-title-sm font-semibold">{m.image_uploader_dropzone_title()}</p>
		<p class="text-body-sm text-muted-foreground">{m.image_uploader_dropzone_hint()}</p>
	</div>
	<Button tone="contrast" label={m.image_uploader_browse()} onclick={onbrowse} />
</div>
