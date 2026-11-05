<script lang="ts">
	import { untrack } from 'svelte';
	import type { ResolvedPathname } from '$app/types';
	import { m } from '$paraglide/messages.js';
	import { cn } from '$shared/lib/utils';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { RevealingPhoto } from '$shared/ui/molecules/revealing-photo';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { ModalScreenSurface } from '$shared/ui/templates/modal-screen';
	import type { DoctorPhoto } from '$modules/doctor/lib/detail';

	let {
		open,
		photos,
		focus,
		locale,
		saved,
		pop = false,
		photoHref,
		onOpenPhoto,
		onPhotoChange,
		onClose,
		onShare,
		onSave
	}: {
		open: boolean;
		photos: DoctorPhoto[];
		/**
		 * The application's `focus` (from 0): the one-photo viewer on it («3 / 25»), past the last photo on the last;
		 * none ⇒ the tour of every photo.
		 */
		focus: number | undefined;
		locale: SupportedLocale;
		saved: boolean;
		/** The heart has just filled: its «pop» plays. */
		pop?: boolean;
		/** A photo's own address (`details/photos?focus=2`). */
		photoHref: (index: number) => ResolvedPathname;
		/** The tour's press: the viewer on that photo (in place, its own history entry). */
		onOpenPhoto: (index: number, event: MouseEvent) => void;
		/** The viewer moved to another photo (its address follows, in place). */
		onPhotoChange: (index: number) => void;
		onClose: () => void;
		onShare: () => void;
		onSave: () => void;
	} = $props();

	const options = $derived({ locale });
	const total = $derived(photos.length);
	const viewing = $derived(focus !== undefined && focus >= 0 && total > 0);
	const index = $derived(viewing && focus !== undefined ? Math.min(focus, total - 1) : 0);
	let track = $state<HTMLElement | null>(null);
	let shown = $state(0);
	/** The track the viewer last placed (a new opening draws a new one, at its start). */
	let placedOn: HTMLElement | null = null;
	const current = $derived(Math.min(shown, Math.max(total - 1, 0)));

	// The viewer opens on its photo (the address's), and follows the address when it changes from outside — never
	// when the address only followed the viewer's own glide or swipe (MINOR-7 of r1: it would cut the motion).
	$effect(() => {
		const node = track;
		const target = index;
		if (!node || !viewing) return;
		if (node === placedOn && untrack(() => shown) === target) return;
		placedOn = node;
		shown = target;
		node.scrollTo?.({ left: target * node.clientWidth, behavior: 'instant' });
	});

	/** The photo in view after a swipe (one a page, snapped): the address follows it. */
	function measure() {
		if (!track || track.clientWidth <= 0) return;
		const next = Math.min(Math.max(Math.round(track.scrollLeft / track.clientWidth), 0), total - 1);
		if (next !== shown) {
			shown = next;
			onPhotoChange(next);
		}
	}

	/** «‹» / «›» and the keyboard's ← →: the next photo glides in (`scroll-smooth`), the arrows hide at the ends. */
	function step(delta: number) {
		const next = Math.min(Math.max(current + delta, 0), total - 1);
		if (next === current || !track) return;
		track.scrollTo?.({ left: next * track.clientWidth });
		shown = next;
		onPhotoChange(next);
	}

	function onKeydown(event: KeyboardEvent) {
		if (!viewing) return;
		if (event.key === 'ArrowRight') {
			event.preventDefault();
			step(1);
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			step(-1);
		}
	}

	// The tour (Airbnb's phone page): one wide 3 : 2 photo, then two squares, again and again.
	const tourCellClasses = (position: number) =>
		position % 3 === 0 ? 'col-span-2 aspect-3/2' : 'col-span-1 aspect-square';
	const actClasses =
		'inline-flex min-h-touch min-w-touch items-center gap-2 rounded-sm px-2 text-body-sm font-semibold outline-none transition-colors duration-standard ease-standard focus-visible:ring-3 focus-visible:ring-ring/50 can-hover:hover:bg-foreground/5';
</script>

<!-- 🔴 Π8 / U-14.6 (app = web, the application's `PhotoTour` and `PhotoViewer`): the tour on the whole screen — «‹»,
     «Φωτογραφίες», share and save — and, on a photo, the viewer on the dark ground: «✕ Κλείσιμο», «3 / 25», share and
     the heart, the 48 arrows from 744 (none at the ends), a swipe on the phone, ← → on the keyboard. Every photo lights
     up in 0.8 s the first time this session shows it. -->
<ModalScreenSurface
	{open}
	onDismiss={onClose}
	tone="background"
	aria-label={m.doctor_photos_title({}, options)}
	data-testid={viewing ? 'doctor-detail-photo-viewer' : 'doctor-detail-modal-photos'}
	onkeydown={onKeydown}
	class={cn(
		'tablet:m-0 tablet:h-full tablet:max-h-none tablet:max-w-none tablet:rounded-none tablet:shadow-none',
		viewing && 'bg-secondary text-secondary-foreground'
	)}
>
	{#if viewing}
		<div
			class="flex h-bar-top shrink-0 flex-row items-center justify-between gap-2 px-3 tablet:px-6"
		>
			<button
				type="button"
				data-testid="doctor-detail-photo-viewer-close"
				onclick={() => onClose()}
				class={cn(actClasses, 'can-hover:hover:bg-secondary-foreground/10')}
			>
				<Ionicon name="close" class="icon-md" />
				<span>{m.doctor_photo_close({}, options)}</span>
			</button>
			<p
				aria-live="polite"
				data-testid="doctor-detail-photo-viewer-counter"
				class="text-body-md font-semibold"
			>
				{`${current + 1} / ${total}`}
			</p>
			<div class="flex flex-row items-center gap-1">
				<button
					type="button"
					aria-label={m.doctor_share({}, options)}
					onclick={() => onShare()}
					class={cn(actClasses, 'can-hover:hover:bg-secondary-foreground/10')}
				>
					<Ionicon name="share-outline" class="icon-md" />
				</button>
				<button
					type="button"
					aria-label={m.doctor_favorite({}, options)}
					aria-pressed={saved}
					onclick={() => onSave()}
					class={cn(actClasses, 'can-hover:hover:bg-secondary-foreground/10')}
				>
					<Ionicon
						name={saved ? 'heart' : 'heart-outline'}
						class={cn(saved ? 'icon-md text-accent' : 'icon-md', pop && 'animate-heart-pop')}
					/>
				</button>
			</div>
		</div>
		<div class="relative min-h-0 flex-1">
			<div
				bind:this={track}
				onscroll={measure}
				data-testid="doctor-detail-photo-viewer-track"
				class="scrollbar-none flex size-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
			>
				{#each photos as entry, position (entry.id)}
					<div
						data-testid={`doctor-detail-photo-viewer-slide-${position}`}
						class="relative size-full shrink-0 snap-start snap-always"
					>
						<RevealingPhoto
							url={entry.largeUrl}
							alt={entry.alt}
							fit="contain"
							eager={position === index}
						/>
					</div>
				{/each}
			</div>
			{#if current > 0}
				<div class="absolute inset-y-0 left-6 hidden items-center tablet:flex">
					<IconButton
						icon="chevron-back"
						appearance="tint"
						aria-label={m.doctor_photo_previous({}, options)}
						data-testid="doctor-detail-photo-viewer-previous"
						onclick={() => step(-1)}
					/>
				</div>
			{/if}
			{#if current < total - 1}
				<div class="absolute inset-y-0 right-6 hidden items-center tablet:flex">
					<IconButton
						icon="chevron-forward"
						appearance="tint"
						aria-label={m.doctor_photo_next({}, options)}
						data-testid="doctor-detail-photo-viewer-next"
						onclick={() => step(1)}
					/>
				</div>
			{/if}
		</div>
	{:else}
		<div
			class="flex h-bar-top shrink-0 flex-row items-center justify-between gap-2 border-b border-border/60 px-3 tablet:px-6"
		>
			<IconButton
				icon="chevron-back"
				aria-label={m.doctor_back({}, options)}
				data-testid="doctor-detail-modal-photos-back"
				onclick={() => onClose()}
			/>
			<h2 class="text-title-md font-semibold text-foreground">
				{m.doctor_photos_title({}, options)}
			</h2>
			<div class="flex flex-row items-center gap-1">
				<button
					type="button"
					aria-label={m.doctor_share({}, options)}
					data-testid="doctor-detail-modal-photos-share"
					onclick={() => onShare()}
					class={actClasses}
				>
					<Ionicon name="share-outline" class="icon-sm" />
					<span class="hidden underline tablet:inline">{m.doctor_share({}, options)}</span>
				</button>
				<button
					type="button"
					aria-label={m.doctor_save({}, options)}
					aria-pressed={saved}
					data-testid="doctor-detail-modal-photos-save"
					onclick={() => onSave()}
					class={actClasses}
				>
					<Ionicon
						name={saved ? 'heart' : 'heart-outline'}
						class={cn(saved ? 'icon-sm text-accent' : 'icon-sm', pop && 'animate-heart-pop')}
					/>
					<span class="hidden underline tablet:inline">{m.doctor_save({}, options)}</span>
				</button>
			</div>
		</div>
		<div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-gutter-sm py-6 tablet:px-6">
			<ul class="mx-auto grid w-full max-w-content grid-cols-2 gap-2">
				{#each photos as entry, position (entry.id)}
					<li class={cn('relative overflow-hidden bg-foreground/5', tourCellClasses(position))}>
						<a
							href={photoHref(position)}
							aria-label={entry.alt}
							data-testid={`doctor-detail-photos-cell-${position}`}
							onclick={(event) => onOpenPhoto(position, event)}
							class="absolute inset-0 block min-h-touch min-w-touch outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
						>
							<RevealingPhoto url={entry.url} alt="" eager={position < 3} />
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</ModalScreenSurface>
