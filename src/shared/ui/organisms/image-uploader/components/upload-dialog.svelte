<!--
  Upload dialog · shell (surface B, shot2→shot4→shot5).

  Reuses the `Dialog` primitive (portal + focus-trap + scroll-lock +
  dismissable) with a custom header (X · title+counter · +), body
  (dropzone ↔ staged grid + error banner) and footer (ghost · secondary).
  Open state is owned by the controller; the hidden file input is opened
  programmatically by the header "+", the dropzone "Browse", and drop.
-->
<script lang="ts">
	import XIcon from '~icons/lucide/x';
	import PlusIcon from '~icons/lucide/plus';
	import { m } from '$paraglide/messages.js';
	import {
		Dialog,
		DialogContent,
		DialogTitle,
		DialogDescription
	} from '$shared/ui/primitives/dialog';
	import { Button } from '$shared/ui/primitives/button';
	import { getImageUploaderContext } from '../lib/context';
	import UploadDropzone from './upload-dropzone.svelte';
	import UploadTile from './upload-tile.svelte';
	import UploadErrors from './upload-errors.svelte';

	const ctx = getImageUploaderContext();

	let fileInput = $state<HTMLInputElement | null>(null);

	function openPicker() {
		fileInput?.click();
	}

	function onInputChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		if (input.files?.length) ctx.pickFiles(input.files);
		input.value = ''; // allow re-picking the same file
	}

	const subtitle = $derived.by(() => {
		if (ctx.isUploading || ctx.uploadedCount > 0) {
			return m.image_uploader_dialog_subtitle_uploading({
				done: ctx.uploadedCount,
				total: ctx.totalStaged
			});
		}
		if (ctx.staged.length > 0) {
			return m.image_uploader_dialog_subtitle_selected({ count: ctx.staged.length });
		}
		return m.image_uploader_dialog_subtitle_empty();
	});
</script>

<Dialog open={ctx.dialogOpen} onOpenChange={(open) => !open && ctx.closeDialog()}>
	<DialogContent showClose={false} size="lg" class="max-w-xl gap-0 p-0">
		<!-- Header: X · (title + counter) · + -->
		<div class="flex items-center justify-between gap-inline p-card pb-inline">
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label={m.image_uploader_cancel()}
				onclick={() => ctx.closeDialog()}
			>
				<XIcon class="icon-sm" />
			</Button>
			<div class="min-w-0 flex-1 text-center">
				<DialogTitle class="text-title-md font-semibold">
					{m.image_uploader_dialog_title()}
				</DialogTitle>
				<DialogDescription class="text-body-sm text-muted-foreground">
					{subtitle}
				</DialogDescription>
			</div>
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label={m.image_uploader_add_more()}
				onclick={openPicker}
			>
				<PlusIcon class="icon-sm" />
			</Button>
		</div>

		<!-- Body -->
		<div class="px-card pb-card">
			{#if ctx.staged.length === 0}
				<UploadDropzone onbrowse={openPicker} ondropfiles={(files) => ctx.pickFiles(files)} />
			{:else}
				<div class="grid grid-cols-2 gap-gutter">
					{#each ctx.staged as staged (staged.id)}
						<UploadTile {staged} />
					{/each}
				</div>
			{/if}
			<UploadErrors />
		</div>

		<!-- Footer: ghost (Done ↔ Cancel) · secondary (Upload) -->
		<div class="flex items-center justify-between border-t border-border p-card">
			<Button
				variant="ghost"
				onclick={() => (ctx.staged.length > 0 ? ctx.cancelAll() : ctx.closeDialog())}
			>
				{ctx.staged.length > 0 ? m.image_uploader_cancel() : m.image_uploader_done()}
			</Button>
			<Button variant="secondary" disabled={!ctx.canUpload} onclick={() => ctx.confirm()}>
				{m.image_uploader_upload()}
			</Button>
		</div>

		<input
			bind:this={fileInput}
			type="file"
			accept={ctx.accept}
			multiple={ctx.multiple}
			class="sr-only"
			tabindex={-1}
			aria-hidden="true"
			onchange={onInputChange}
		/>
	</DialogContent>
</Dialog>
