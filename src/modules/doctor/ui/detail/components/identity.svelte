<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { m } from '$paraglide/messages.js';
	import { cn } from '$shared/lib/utils';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { HugeiconsLaurelWreathLeft01 } from '$shared/ui/icons/hugeicons-laurel-wreath-left-01';
	import { HugeiconsLaurelWreathRight01 } from '$shared/ui/icons/hugeicons-laurel-wreath-right-01';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { MediaGallery } from '$shared/ui/organisms/media-gallery';
	import type { DoctorDetailIdentity, DoctorPhoto } from '$modules/doctor/lib/detail';
	import SocialLinks from './social-links.svelte';

	let {
		identity,
		photos,
		locale,
		photoHref,
		allPhotosHref,
		onOpenPhoto,
		onOpenAllPhotos,
		reviewsHref,
		onOpenReviews,
		saved,
		pop = false,
		onShare,
		onSave
	}: {
		identity: DoctorDetailIdentity;
		photos: DoctorPhoto[];
		locale: SupportedLocale;
		photoHref: (index: number) => ResolvedPathname;
		allPhotosHref: ResolvedPathname;
		onOpenPhoto: (index: number, event: MouseEvent) => void;
		onOpenAllPhotos: (event: MouseEvent) => void;
		/** «184 κριτικές» opens the reviews' window (the application's `onOpenReviews`): its address and its press. */
		reviewsHref: ResolvedPathname;
		onOpenReviews: (event: MouseEvent) => void;
		saved: boolean;
		/** The heart has just filled: its «pop» plays. */
		pop?: boolean;
		onShare: () => void;
		onSave: () => void;
	} = $props();

	const options = $derived({ locale });
	const images = $derived(photos.map((photo) => photo.url));
	const actClasses =
		'inline-flex min-h-touch min-w-touch items-center gap-2 rounded-sm px-2 text-body-sm font-semibold text-foreground outline-none transition-colors duration-standard ease-standard focus-visible:ring-3 focus-visible:ring-ring/50 can-hover:hover:bg-foreground/5';
</script>

<!-- 🔴 U-41.1 / U-35.3 (app = web, the application's `IdentitySection`): the photos (the kit's `MediaGallery`) and the
     identity — under them on a phone, beside them from 744: the ONE h1 (the name), «Ειδικότητα · Περιοχή», «★ 4,90 ·
     184 κριτικές» (the count opens the reviews) with the «Επιλογή ασθενών» laurels, the doctor's links; from 744 the
     web's «Κοινοποίηση / Αποθήκευση» (the phone's are in its top bar). -->
<header
	data-slot="doctor-identity"
	data-testid="doctor-detail-identity"
	class="flex flex-col gap-5 tablet:flex-row tablet:items-start tablet:gap-6"
>
	<MediaGallery
		{images}
		{photoHref}
		photoLabel={(index, total) =>
			photos[index]?.alt ?? m.doctor_photo_label({ index: index + 1, total }, options)}
		moreHref={allPhotosHref}
		moreLabel={m.doctor_photos_all({}, options)}
		{onOpenPhoto}
		onOpenAll={onOpenAllPhotos}
		testId="doctor-detail-gallery"
	/>
	<div class="flex min-w-0 flex-col gap-2.5 tablet:flex-1 tablet:pt-2">
		<div class="flex flex-col gap-1">
			<h1
				data-testid="doctor-detail-identity-title"
				class="text-heading-md font-semibold wrap-break-word text-foreground tablet:text-heading-lg"
			>
				{identity.name}
			</h1>
			<p
				data-testid="doctor-detail-identity-subtitle"
				class="text-body-md text-muted-foreground tablet:text-body-lg tablet:text-foreground"
			>
				{identity.subtitle}
			</p>
		</div>
		{#if identity.rating}
			<div
				data-testid="doctor-detail-identity-rating"
				class="flex flex-row flex-wrap items-center gap-x-4 text-body-md text-foreground"
			>
				<span class="inline-flex flex-row items-center gap-2">
					<span
						role="img"
						aria-label={identity.rating.accessibleLabel}
						class="inline-flex flex-row items-center gap-1 font-semibold"
					>
						<Ionicon name="star" class="icon-sm text-rating" />{identity.rating.scoreLabel}
					</span>
					<span aria-hidden="true" class="text-muted-foreground">·</span>
					<a
						href={reviewsHref}
						data-testid="doctor-detail-identity-reviews"
						onclick={(event) => onOpenReviews(event)}
						class="inline-flex min-h-touch min-w-touch items-center font-semibold underline outline-none focus-visible:ring-3 focus-visible:ring-ring/50 can-hover:hover:decoration-2"
						>{identity.rating.countLabel}</a
					>
				</span>
				{#if identity.rating.badgeLabel}
					<!-- 🔴 U-45.2: the laurels only for a doctor the backend marks (`isPatientsChoice`). -->
					<span
						data-testid="doctor-detail-identity-badge"
						class="inline-flex flex-row items-center gap-1 font-semibold"
					>
						<HugeiconsLaurelWreathLeft01 class="icon-md text-foreground" />
						{identity.rating.badgeLabel}
						<HugeiconsLaurelWreathRight01 class="icon-md text-foreground" />
					</span>
				{/if}
			</div>
		{/if}
		<SocialLinks links={identity.socialLinks} testIdPrefix="doctor-detail-identity" />
		<div data-slot="doctor-identity-acts" class="-ml-2 hidden flex-row gap-1 pt-2 tablet:flex">
			<button
				type="button"
				data-testid="doctor-detail-share-act"
				onclick={() => onShare()}
				class={actClasses}
			>
				<Ionicon name="share-outline" class="icon-sm" />
				<span class="underline">{m.doctor_share({}, options)}</span>
			</button>
			<button
				type="button"
				aria-pressed={saved}
				data-testid="doctor-detail-save-act"
				onclick={() => onSave()}
				class={actClasses}
			>
				<Ionicon
					name={saved ? 'heart' : 'heart-outline'}
					class={cn(saved ? 'icon-sm text-accent' : 'icon-sm', pop && 'animate-heart-pop')}
				/>
				<span class="underline">{m.doctor_save({}, options)}</span>
			</button>
		</div>
	</div>
</header>
