<!--
  Upload dialog · staged thumbnail (shot4/shot5).

  Renders one staged file with its lifecycle affordances:
   - valid/invalid  → dark circular remove (trash) button
   - uploading      → dimmed overlay + spinner + white cancel (X)
   - done           → dimmed overlay + checkmark ring + white cancel (X)
   - invalid/error  → destructive ring + reason (title + sr-only for a11y)
-->
<script lang="ts">
	import TrashIcon from '~icons/lucide/trash-2';
	import XIcon from '~icons/lucide/x';
	import CheckIcon from '~icons/lucide/check';
	import LoaderCircleIcon from '~icons/lucide/loader-circle';
	import { m } from '$paraglide/messages.js';
	import { AspectRatio } from '$shared/ui/primitives/aspect-ratio';
	import { getImageUploaderContext } from '../lib/context';
	import { issueMessage } from '../lib/validators';
	import type { StagedFile } from '../lib/types';

	let { staged }: { staged: StagedFile } = $props();

	const ctx = getImageUploaderContext();
	const busy = $derived(staged.status === 'uploading' || staged.status === 'done');
	const failed = $derived(staged.status === 'invalid' || staged.status === 'error');
	const reason = $derived(failed && staged.issues[0] ? issueMessage(staged.issues[0]) : '');
</script>

<div
	data-slot="upload-tile"
	data-status={staged.status}
	class="relative"
	title={reason || undefined}
>
	<AspectRatio ratio={1} class="overflow-hidden rounded-media bg-muted">
		{#if staged.previewUrl}
			<img src={staged.previewUrl} alt="" class="absolute inset-0 h-full w-full object-cover" />
		{/if}

		{#if busy}
			<div
				class="absolute inset-0 grid place-items-center bg-black/40"
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={staged.progress}
			>
				{#if staged.status === 'done'}
					<span
						class="grid size-8 place-items-center rounded-full bg-secondary text-secondary-foreground"
					>
						<CheckIcon class="icon-sm" />
					</span>
				{:else}
					<LoaderCircleIcon class="icon-xl animate-spin text-white" />
				{/if}
			</div>
		{/if}

		{#if failed}
			<div class="pointer-events-none absolute inset-0 rounded-media ring-2 ring-destructive"></div>
		{/if}
	</AspectRatio>

	{#if busy}
		<button
			type="button"
			aria-label={m.image_uploader_cancel()}
			onclick={() => ctx.cancelStaged(staged.id)}
			class="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-black/50 text-white transition-colors outline-none hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-ring"
		>
			<XIcon class="icon-sm" />
		</button>
	{:else}
		<button
			type="button"
			aria-label={m.image_uploader_remove()}
			onclick={() => ctx.removeStaged(staged.id)}
			class="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-secondary text-secondary-foreground transition-colors outline-none hover:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-ring"
		>
			<TrashIcon class="icon-sm" />
		</button>
	{/if}

	{#if reason}
		<span class="sr-only" role="alert">{reason}</span>
	{/if}
</div>
