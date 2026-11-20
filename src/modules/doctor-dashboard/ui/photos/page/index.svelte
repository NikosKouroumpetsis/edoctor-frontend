<script lang="ts">
	import { tick } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import { useId } from '$shared/lib/headless';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { Button } from '$shared/ui/primitives/button';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { DOCTOR_PHOTO_ACCEPT } from '$modules/doctor-dashboard/lib/photos';
	import { emphasizeDoctorOfficeSettings } from '$modules/doctor-dashboard/lib/profile';
	import DeleteDialog from '../components/delete-dialog.svelte';
	import MenuSheet from '../components/menu-sheet.svelte';
	import Tile from '../components/tile.svelte';
	import UploadTile from '../components/upload-tile.svelte';
	import { useDoctorPhotoDrag, useDoctorPhotos } from '../hooks';
	import type { DoctorPhotosProps } from '../types';

	let { locale, links }: DoctorPhotosProps = $props();

	const options = $derived({ locale });
	const title = $derived(m.doctor_my_profile_section_photos({}, options));
	const titleId = useId(undefined, 'doctor-photos-title');
	const hintId = useId(undefined, 'doctor-photos-hint');
	const photos = useDoctorPhotos({ locale: () => locale });
	const drag = useDoctorPhotoDrag({
		ids: () => photos.images.map((image) => image.id),
		onDrop: (ids, movedId) => photos.order(ids, movedId)
	});

	// While a photo is dragged the tiles stand in the order it would leave; otherwise in the stored one.
	const shown = $derived.by(() => {
		const order = drag.order;
		if (!order) return photos.images;
		return order.flatMap((id) => photos.images.find((image) => image.id === id) ?? []);
	});
	const empty = $derived(photos.images.length === 0 && photos.uploads.length === 0);
	const WAIT_TILES = [0, 1, 2];
	// «Ρυθμίσεις ιατρείου» in bold, words alone (D-W52-42: the web has no such page yet).
	const foot = $derived(emphasizeDoctorOfficeSettings(m.doctor_photos_foot({}, options), locale));

	let input = $state<HTMLInputElement | null>(null);
	let grid = $state<HTMLUListElement | null>(null);
	let askedId = $state<string | null>(null);
	let asking = $state(false);
	const askedIndex = $derived(photos.images.findIndex((image) => image.id === askedId));
	// 🔴 D-W52-37α: below 744 «⋯» of a photo opens ONE sheet of the page, for the photo it was pressed on.
	let sheetId = $state<string | null>(null);
	let sheetOpen = $state(false);
	const sheetIndex = $derived(photos.images.findIndex((image) => image.id === sheetId));
	// The photo went away under its open sheet (deleted elsewhere, the list read again): the sheet goes with it.
	$effect(() => {
		if (sheetOpen && sheetIndex < 0) sheetOpen = false;
	});

	function onPicked() {
		if (!input) return;
		const picked = [...(input.files ?? [])];
		// The same file may be picked again after a failure: the choice is given back at once.
		input.value = '';
		if (picked.length > 0) void photos.add(picked);
	}

	/** The photo takes its new place and keeps the focus there (a moved node loses it), so the arrows go on. */
	async function moveTo(id: string, index: number) {
		photos.move(id, index);
		await tick();
		grid
			?.querySelector<HTMLElement>(`[data-photo-id="${id}"] [data-slot="doctor-photo-handle"]`)
			?.focus();
	}

	function ask(id: string) {
		askedId = id;
		asking = true;
	}

	function openSheet(id: string) {
		sheetId = id;
		sheetOpen = true;
	}
</script>

<!-- 🔴 Wave 5.2 · screen 78 «Φωτογραφίες» (U-206, D-W52-37 … 42; `64-switch/sw.js` `photosBody`, `sw.css` «Screen 78»): the
     photos a patient sees first. Below 950 a page of its own — «‹» to «Το προφίλ μου», never a window (U-102); from 950
     the right column of 77, no «‹» (U-217). The first photo is the main one, large; the others three in a row (two
     below 744), each a 4:3 tile as the server cuts it. A photo is dragged or moved with the arrows to change the order,
     «⋯» on it makes it the main one, cuts it or deletes it (always asked) — the small menu on the photo from 744, a
     sheet from the bottom below it (D-W52-37α). New files are checked on the device and sent
     one at a time. At the end where the office's photos go — plain words, the web has no «Ρυθμίσεις ιατρείου» yet
     (D-W52-42). No colour under the pointer (U-100); every word of a person or of the server a text node (U-65.6). -->
<section
	aria-labelledby={titleId}
	data-testid="doctor-photos"
	data-view={photos.view}
	class="px-gutter-sm pt-3 pb-pane-inset-lg tablet:pt-section split:p-0"
>
	<div class="mx-auto w-full max-w-form split:max-w-none">
		<IconButton
			icon="chevron-back"
			appearance="tint"
			surface="soft"
			size="sm"
			iconSize="md"
			aria-label={m.doctor_my_profile_back({}, options)}
			href={links.profile}
			data-testid="doctor-photos-back"
			class="mb-2 split:hidden"
		/>
		<h2
			id={titleId}
			class="flex min-h-touch items-center text-heading-lg font-semibold text-foreground split:min-h-0 split:text-heading-md"
		>
			{title}
		</h2>

		{#if photos.view === 'failed'}
			<div class="mt-3">
				<InlineNotice
					variant="danger"
					message={m.doctor_dashboard_load_error({}, options)}
					actionLabel={m.doctor_dashboard_retry({}, options)}
					onAction={() => photos.reload()}
					testId="doctor-photos-error"
					actionTestId="doctor-photos-retry"
				/>
			</div>
		{:else if photos.view === 'loading'}
			<div
				data-testid="doctor-photos-loading"
				aria-busy="true"
				aria-label={title}
				class="mt-4 grid grid-cols-2 gap-2.5 tablet:grid-cols-3"
			>
				<Skeleton
					class="col-span-2 aspect-4/3 w-full rounded-md tablet:row-span-2 tablet:aspect-auto"
				/>
				{#each WAIT_TILES as tile (tile)}
					<div aria-hidden="true">
						<Skeleton class="aspect-4/3 w-full rounded-md" />
					</div>
				{/each}
			</div>
		{:else}
			{#if empty}
				<div
					data-testid="doctor-photos-empty"
					class="mt-4 flex flex-col items-center gap-2 rounded-lg border border-dashed border-line-2 px-5 py-section text-center"
				>
					<Ionicon name="camera-outline" class="icon-xl text-muted-foreground" />
					<p class="text-title-xs font-semibold text-foreground">
						{m.doctor_photos_empty_title({}, options)}
					</p>
					<p class="mb-2 max-w-text text-body-sm text-muted-foreground">
						{m.doctor_photos_empty_body({}, options)}
					</p>
					<Button
						tone="contrast"
						radius="full"
						bordered={false}
						hover={false}
						label={m.doctor_photos_add_many({}, options)}
						onclick={() => input?.click()}
						data-testid="doctor-photos-add"
					/>
				</div>
			{:else}
				<p data-testid="doctor-photos-lead" class="text-body-md text-muted-foreground">
					{m.doctor_photos_lead({}, options)}
				</p>
				<ul
					bind:this={grid}
					use:drag.guard
					data-slot="doctor-photos-grid"
					data-testid="doctor-photos-grid"
					class="mt-4 grid grid-cols-2 gap-2.5 tablet:grid-cols-3"
				>
					{#each shown as image, index (image.id)}
						<Tile
							{image}
							{index}
							count={shown.length}
							{locale}
							cropHref={links.crop(image.id)}
							{hintId}
							{drag}
							onMove={(target) => void moveTo(image.id, target)}
							onDelete={() => ask(image.id)}
							onMenu={() => openSheet(image.id)}
						/>
					{/each}
					{#each photos.uploads as upload (upload.id)}
						<UploadTile
							{upload}
							{locale}
							onRetry={() => photos.retry(upload.id)}
							onDrop={() => photos.drop(upload.id)}
						/>
					{/each}
					{#if photos.room > 0}
						<li class="aspect-4/3">
							<button
								type="button"
								onclick={() => input?.click()}
								data-testid="doctor-photos-add"
								class="flex size-full min-h-touch min-w-touch flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-line-2 text-body-sm font-semibold text-foreground transition-opacity duration-standard ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-70"
							>
								<Ionicon name="add" class="icon-lg" />
								<span>{m.doctor_photos_add({}, options)}</span>
							</button>
						</li>
					{/if}
				</ul>
			{/if}

			{#if photos.rejected.length > 0 || photos.full || photos.orderFailure}
				<div data-testid="doctor-photos-notices" class="mt-3 flex flex-col gap-1.5">
					{#each photos.rejected as entry (entry.id)}
						<!-- The file's name is the person's own text: a text node beside the page's words (U-65.6). -->
						<p
							role="alert"
							data-testid="doctor-photos-rejected"
							class="px-1 text-label-md text-danger-text"
						>
							<span class="font-semibold wrap-anywhere">{entry.name}</span>
							<span>{entry.text}</span>
						</p>
					{/each}
					{#if photos.full}
						<InlineNotice
							variant="danger"
							message={m.doctor_photos_error_limit({}, options)}
							testId="doctor-photos-full"
						/>
					{/if}
					{#if photos.orderFailure}
						<InlineNotice
							variant="danger"
							message={photos.orderFailure}
							testId="doctor-photos-order-failure"
						/>
					{/if}
				</div>
			{/if}

			<p
				id={hintId}
				data-testid="doctor-photos-hint"
				class="mt-3 text-body-sm text-muted-foreground"
			>
				{#if !empty}
					<!-- U-81.2: below 744 the order changes as in the application (a long press); from 744 with a drag. -->
					<span class="tablet:hidden">{m.doctor_photos_hint_hold({}, options)}</span>
					<span class="hidden tablet:inline">{m.doctor_photos_hint_drag({}, options)}</span>
				{/if}
				{m.doctor_photos_hint_limits({}, options)}
			</p>
			{#if !empty}
				<p
					data-testid="doctor-photos-foot"
					class="mt-4 border-t border-line pt-4 text-body-sm text-muted-foreground"
				>
					{#each foot as run, index (index)}{#if run.strong}<strong class="font-semibold"
								>{run.text}</strong
							>{:else}{run.text}{/if}{/each}
				</p>
			{/if}
		{/if}

		<input
			bind:this={input}
			type="file"
			multiple
			accept={DOCTOR_PHOTO_ACCEPT}
			tabindex={-1}
			aria-hidden="true"
			onchange={onPicked}
			data-testid="doctor-photos-input"
			class="hidden"
		/>
		<p data-testid="doctor-photos-live" aria-live="polite" class="sr-only">
			{photos.announcement}
		</p>
	</div>
</section>

<MenuSheet
	bind:open={sheetOpen}
	{locale}
	position={sheetIndex + 1}
	main={sheetIndex === 0}
	cropHref={sheetId !== null && sheetIndex >= 0 ? links.crop(sheetId) : null}
	onMain={() => sheetId !== null && sheetIndex > 0 && void moveTo(sheetId, 0)}
	onDelete={() => sheetId !== null && sheetIndex >= 0 && ask(sheetId)}
/>

<DeleteDialog
	bind:open={asking}
	{locale}
	imageId={askedId}
	promotesNext={askedIndex === 0 && photos.images.length > 1}
	onDeleted={(id) => photos.removed(id)}
/>
