<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$shared/ui/primitives/dropdown-menu';
	import type { DoctorProfileImageFacts } from '$modules/doctor-dashboard/api/images';
	import { doctorPhotoAlt, doctorPhotoArrowTarget } from '$modules/doctor-dashboard/lib/photos';
	import type { DoctorPhotoDrag } from '../hooks';

	let {
		image,
		index,
		count,
		locale,
		cropHref,
		hintId,
		drag,
		onMove,
		onDelete,
		onMenu
	}: {
		image: DoctorProfileImageFacts;
		/** Its place in the order shown, from 0: the first is the main one. */
		index: number;
		count: number;
		locale: SupportedLocale;
		/** «Προσαρμογή» of this photo, resolved in the page's language. */
		cropHref: string;
		/** The id of the words that say how the order changes. */
		hintId: string;
		drag: DoctorPhotoDrag;
		/** The photo goes to another place (from 0): an arrow, «Κάντε την κύρια». */
		onMove: (index: number) => void;
		onDelete: () => void;
		/** Below 744 «⋯» asks the page for its sheet (D-W52-37α); from 744 the menu opens here, on the photo. */
		onMenu: () => void;
	} = $props();

	const options = $derived({ locale });
	const main = $derived(index === 0);
	const position = $derived(index + 1);
	const alt = $derived(doctorPhotoAlt(image, position, count, locale));
	// The main one is drawn large, the others at the size the page's own cards draw.
	const url = $derived(main ? (image.largeUrl ?? image.mediumUrl) : image.mediumUrl);
	const lifted = $derived(drag.lifted?.id === image.id ? drag.lifted : null);

	// An address that did not load reads as no picture — for as long as it is this address.
	let broken = $state<string | null>(null);
	const drawn = $derived(url !== null && broken !== url ? url : null);

	const itemClass =
		'min-h-touch rounded-sm px-3 text-body-md hover:bg-background focus:bg-background';
	const menuLabel = $derived(m.doctor_photos_options({ position }, options));

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && drag.lifted) {
			drag.cancel();
			return;
		}
		const target = doctorPhotoArrowTarget(event.key, index, count);
		if (target === null) return;
		event.preventDefault();
		onMove(target);
	}
</script>

<!-- 🔴 U-206 · D-W52-37 / 39 (`64-switch/sw.js` `phTile`, `sw.css` «Screen 78»): one photo of the page — a 4:3 tile, as the
     server cuts it, the first one large with «Κύρια». The picture is the handle of the order: dragged with the pointer
     (a finger holds first), or moved a place with the arrows while it has the focus. «⋯» on it opens «Κάντε την κύρια»
     (never on the first) · «Προσαρμογή» · «Διαγραφή» — 🔴 D-W52-37α (U-81.2): from 744 the small menu on the photo, below
     744 the page's sheet from the bottom, as the application's (two «⋯», each only at its widths). No colour under the
     pointer (U-100); every word a text node. -->
<li
	data-photo-id={image.id}
	data-testid={`doctor-photo-${position}`}
	data-main={main ? '' : undefined}
	data-lifted={lifted ? '' : undefined}
	style:transform={lifted ? `translate(${lifted.x}px, ${lifted.y}px)` : undefined}
	class={[
		'relative aspect-4/3',
		main && 'col-span-2 tablet:row-span-2 tablet:aspect-auto',
		lifted && 'z-10'
	]}
>
	<button
		type="button"
		data-slot="doctor-photo-handle"
		aria-label={alt}
		aria-describedby={hintId}
		onpointerdown={(event) => drag.down(event, image.id)}
		{onkeydown}
		class={[
			'block size-full min-h-touch min-w-touch cursor-grab overflow-hidden rounded-md bg-chip outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50',
			lifted && 'cursor-grabbing shadow-floating'
		]}
	>
		{#if drawn}
			<img
				src={drawn}
				alt=""
				draggable="false"
				loading={main ? 'eager' : 'lazy'}
				onerror={() => (broken = drawn)}
				class="pointer-events-none size-full object-cover"
			/>
		{:else}
			<span
				data-slot="doctor-photo-missing"
				class="grid size-full place-items-center text-muted-foreground"
			>
				<Ionicon name="camera-outline" class="icon-lg" />
			</span>
		{/if}
	</button>
	{#if main}
		<span
			data-slot="doctor-photo-main"
			class="pointer-events-none absolute top-2.5 left-2.5 rounded-full bg-card px-2.5 py-1 text-label-lg font-semibold text-foreground shadow-raised"
		>
			{m.doctor_photos_main({}, options)}
		</span>
	{/if}
	{#snippet dots()}
		<span
			class="grid size-control-xs place-items-center rounded-full bg-card text-foreground shadow-raised group-focus-visible:ring-3 group-focus-visible:ring-ring/50"
		>
			<Ionicon name="ellipsis-horizontal" class="icon-md" />
		</span>
	{/snippet}
	<button
		type="button"
		aria-haspopup="dialog"
		aria-label={menuLabel}
		data-testid={`doctor-photo-menu-phone-${position}`}
		onclick={onMenu}
		class="group absolute top-0 right-0 grid size-touch place-items-center rounded-full outline-none tablet:hidden"
	>
		{@render dots()}
	</button>
	<DropdownMenu>
		<DropdownMenuTrigger
			aria-label={menuLabel}
			data-testid={`doctor-photo-menu-${position}`}
			class="group absolute top-0 right-0 hidden size-touch rounded-full outline-none tablet:inline-flex"
		>
			{@render dots()}
		</DropdownMenuTrigger>
		<DropdownMenuContent
			align="end"
			sideOffset={0}
			data-testid={`doctor-photo-menu-content-${position}`}
		>
			{#if !main}
				<DropdownMenuItem
					onclick={() => onMove(0)}
					data-testid="doctor-photo-make-main"
					class={itemClass}
				>
					{m.doctor_photos_make_main({}, options)}
				</DropdownMenuItem>
			{/if}
			<DropdownMenuItem href={cropHref} data-testid="doctor-photo-crop" class={itemClass}>
				{m.doctor_photos_crop({}, options)}
			</DropdownMenuItem>
			<DropdownMenuItem
				onclick={onDelete}
				data-testid="doctor-photo-delete"
				class={[itemClass, 'text-accent']}
			>
				{m.doctor_photos_delete({}, options)}
			</DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownMenu>
</li>
