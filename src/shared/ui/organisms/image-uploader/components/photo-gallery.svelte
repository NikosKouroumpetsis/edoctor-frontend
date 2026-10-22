<!--
  Gallery / grid manager (surface D, shot6).

  Header (title + reorder hint + round "+") · full-width cover · 2-col grid of
  filled tiles, empty placeholders (up to the minimum count) and an "add more"
  tile. Reordering (decision A4) is native HTML5 drag-and-drop plus a
  keyboard path, both routed through the pure `reorder` helpers on the
  controller and announced via an aria-live region:
   - each item wrapper is a drop target (drag over/drop),
   - a real drag-handle <button> is the accessible drag source and keyboard
     target (arrow keys move the item; focusable without an a11y violation),
   - the "…" menu's "move forward" promotes an item to the cover slot (index 0).
-->
<script lang="ts">
	import PlusIcon from '~icons/lucide/plus';
	import GripVerticalIcon from '~icons/lucide/grip-vertical';
	import { m } from '$paraglide/messages.js';
	import { Button } from '$shared/ui/primitives/button';
	import { getImageUploaderContext } from '../lib/context';
	import PhotoCover from './photo-cover.svelte';
	import PhotoTile from './photo-tile.svelte';
	import PhotoPlaceholder from './photo-placeholder.svelte';
	import PhotoAddMore from './photo-add-more.svelte';

	const ctx = getImageUploaderContext();

	const cover = $derived(ctx.items[0]);
	const rest = $derived(ctx.items.slice(1));
	const placeholderSlots = $derived(
		Array.from({ length: Math.max(0, (ctx.minCount ?? 0) - ctx.count) }, (_, i) => i)
	);

	let dragFrom = $state<number | null>(null);
	let liveMessage = $state('');

	function reorderLabel(index: number): string {
		return `${m.image_uploader_gallery_subtitle()} — ${index + 1} / ${ctx.count}`;
	}

	function announce(index: number) {
		liveMessage = `${index + 1} / ${ctx.count}`;
	}

	function handleDragStart(index: number, event: DragEvent) {
		dragFrom = index;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('text/plain', String(index));
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
	}

	function handleDrop(index: number, event: DragEvent) {
		event.preventDefault();
		if (dragFrom !== null && dragFrom !== index) {
			ctx.move(dragFrom, index);
			announce(index);
		}
		dragFrom = null;
	}

	function handleDragEnd() {
		dragFrom = null;
	}

	function handleKeydown(index: number, event: KeyboardEvent) {
		const back = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
		const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
		if (!back && !forward) return;
		const target = back ? index - 1 : index + 1;
		if (target < 0 || target >= ctx.count) return;
		event.preventDefault();
		ctx.move(index, target);
		announce(target);
	}
</script>

<section data-slot="photo-gallery" class="space-y-list">
	<div class="flex items-start justify-between gap-inline">
		<div class="space-y-1">
			<h2 class="text-heading-lg font-bold text-foreground">
				{m.image_uploader_gallery_title({ count: ctx.minCount ?? ctx.count })}
			</h2>
			<p class="text-body-sm text-muted-foreground">{m.image_uploader_gallery_subtitle()}</p>
		</div>
		<Button
			variant="secondary"
			size="icon"
			class="rounded-full"
			aria-label={m.image_uploader_add_more()}
			onclick={() => ctx.openDialog()}
		>
			<PlusIcon class="icon-sm" />
		</Button>
	</div>

	{#if cover}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			data-dragging={dragFrom === 0 ? '' : undefined}
			ondragover={handleDragOver}
			ondrop={(event) => handleDrop(0, event)}
			class="relative rounded-xl data-[dragging]:opacity-60"
		>
			<PhotoCover item={cover} />
			<button
				type="button"
				draggable="true"
				aria-label={reorderLabel(0)}
				ondragstart={(event) => handleDragStart(0, event)}
				ondragend={handleDragEnd}
				onkeydown={(event) => handleKeydown(0, event)}
				class="group absolute bottom-1 left-1 grid size-touch cursor-grab place-items-center rounded-full outline-none active:cursor-grabbing"
			>
				<span
					class="grid size-control-xs place-items-center rounded-full bg-card/90 text-foreground shadow-raised transition-colors group-hover:bg-card group-focus-visible:ring-2 group-focus-visible:ring-ring"
				>
					<GripVerticalIcon class="icon-sm" />
				</span>
			</button>
		</div>
	{/if}

	<div class="grid grid-cols-2 gap-list">
		{#each rest as item, i (item.id)}
			{@const index = i + 1}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				data-dragging={dragFrom === index ? '' : undefined}
				ondragover={handleDragOver}
				ondrop={(event) => handleDrop(index, event)}
				class="relative rounded-xl data-[dragging]:opacity-60"
			>
				<PhotoTile {item} />
				<button
					type="button"
					draggable="true"
					aria-label={reorderLabel(index)}
					ondragstart={(event) => handleDragStart(index, event)}
					ondragend={handleDragEnd}
					onkeydown={(event) => handleKeydown(index, event)}
					class="group absolute bottom-0 left-0 grid size-touch cursor-grab place-items-center rounded-full outline-none active:cursor-grabbing"
				>
					<span
						class="grid size-control-xs place-items-center rounded-full bg-card/90 text-foreground shadow-raised transition-colors group-hover:bg-card group-focus-visible:ring-2 group-focus-visible:ring-ring"
					>
						<GripVerticalIcon class="icon-sm" />
					</span>
				</button>
			</div>
		{/each}

		{#each placeholderSlots as slot (slot)}
			<PhotoPlaceholder />
		{/each}

		<PhotoAddMore />
	</div>

	<div aria-live="polite" class="sr-only">{liveMessage}</div>
</section>
