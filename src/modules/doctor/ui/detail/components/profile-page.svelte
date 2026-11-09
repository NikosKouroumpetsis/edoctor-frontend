<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { ResolvedPathname } from '$app/types';
	import { goto } from '$app/navigation';
	import { m } from '$paraglide/messages.js';
	import { msUntilNextPlatformDay } from '$shared/lib/format-day-time';
	import { readServerNow, recordServerNow } from '$shared/lib/server-clock';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import type { SignInRequest } from '$shared/state/session';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { TwoColumnDetail } from '$shared/ui/templates/two-column-detail';
	import type { DoctorProfile } from '$modules/doctor/api/profile';
	import {
		buildDoctorSeo,
		buildDoctorShareContent,
		readDoctorPhotoFocus,
		type DoctorDetailHints,
		type DoctorDetailSection,
		type DoctorSelectedSlot,
		type DoctorSimilarArea,
		type DoctorSimilarSearch
	} from '$modules/doctor/lib/detail';
	import { DoctorDetailState, type DoctorKeptBooking } from '../hooks/use-state.svelte';
	import type {
		DoctorFavorite,
		DoctorKnowLinks,
		DoctorReviewLinks,
		DoctorSimilarAreaQuery
	} from '../types';
	import AvailabilitySection from './availability-section.svelte';
	import BioSection from './bio-section.svelte';
	import BookingBar from './booking-bar.svelte';
	import BookingCard from './booking-card.svelte';
	import DetailWindow from './detail-window.svelte';
	import Identity from './identity.svelte';
	import KnowSection from './know-section.svelte';
	import LocationSection from './location-section.svelte';
	import Professional from './professional.svelte';
	import ReviewsSection from './reviews-section.svelte';
	import SectionBar, { type DoctorSectionLink } from './section-bar.svelte';
	import SeoHead from './seo-head.svelte';
	import ServiceCost from './service-cost.svelte';
	import Specializations from './specializations.svelte';
	import Summary from './summary.svelte';
	import TopBar from './top-bar.svelte';
	import WindowPhotos from './window-photos.svelte';
	import WindowShare from './window-share.svelte';

	let {
		profile,
		serverNow,
		locale,
		routeSection,
		localize,
		similarHref,
		similarAreaQuery,
		bookingHref,
		kept = null,
		canonicalUrl,
		alternateUrls,
		backHref,
		onSignIn,
		onBack,
		reviewLinks,
		knowLinks,
		articles,
		contact,
		favorite
	}: {
		profile: DoctorProfile;
		serverNow: number;
		locale: SupportedLocale;
		routeSection: DoctorDetailSection | null;
		localize: (path: string) => string;
		similarHref: (search: DoctorSimilarSearch, area: DoctorSimilarArea | null) => ResolvedPathname;
		similarAreaQuery: DoctorSimilarAreaQuery;
		bookingHref: (slot: DoctorSelectedSlot, serviceId: string | undefined) => string;
		kept?: DoctorKeptBooking | null;
		canonicalUrl: string;
		alternateUrls: Record<SupportedLocale, string>;
		backHref: ResolvedPathname;
		onSignIn: (request?: SignInRequest) => void;
		onBack: (event: MouseEvent) => void;
		reviewLinks: DoctorReviewLinks;
		knowLinks: DoctorKnowLinks;
		/** U-77.1: the doctor's articles, after the biography (the articles module's, the screen's). */
		articles?: Snippet;
		/** U-84.6: «Επικοινωνήστε με τον γιατρό» (the messages module's, the screen's). */
		contact?: Snippet;
		/** U-85: the profile's hearts, composed by the screen. */
		favorite?: DoctorFavorite;
	} = $props();

	// 🔴 D-118 / S-34.1: «Σήμερα / Αύριο» on the server's clock; the page draws itself again at Greek midnight.
	let now = $state(untrack(() => serverNow));
	$effect(() => {
		recordServerNow(serverNow);
		now = readServerNow();
		let timer: ReturnType<typeof setTimeout>;
		const arm = () => {
			timer = setTimeout(() => {
				now = readServerNow();
				arm();
			}, msUntilNextPlatformDay(readServerNow()));
		};
		arm();
		return () => clearTimeout(timer);
	});

	const detail = new DoctorDetailState({
		profile: () => profile,
		locale: () => locale,
		now: () => now,
		routeSection: () => routeSection,
		kept: () => kept,
		localize: (path) => localize(path),
		similarHref: (search, area) => similarHref(search, area),
		similarAreaQuery: (city) => similarAreaQuery(city)
	});

	const options = $derived({ locale });
	const content = $derived(detail.content);
	const booking = $derived(detail.booking);
	const seo = $derived(buildDoctorSeo({ doctor: profile, locale, canonicalUrl, alternateUrls }));
	// U-34.2 (the application's `buildDoctorShareContent`): the profile's address on the site's origin (MINOR-5 of r1).
	const shareContent = $derived(
		buildDoctorShareContent({ doctor: profile, url: canonicalUrl, locale })
	);
	const services = $derived(
		(profile.services ?? []).map((service) => ({ id: service.id, title: service.title }))
	);
	// Π3: a doctor with nothing for the left column but its identity keeps the location beside the card.
	const mainCount = $derived(
		[
			content.summary,
			content.professional,
			content.specializations,
			detail.availabilitySection,
			content.serviceCost
		].filter(Boolean).length
	);
	const locationUp = $derived(Boolean(detail.location) && mainCount <= 1 && !content.summary);

	/** A plain press of a link opens its window in place (shallow routing); a new tab keeps the link's own address. */
	function inPlace(event: MouseEvent | undefined): boolean {
		if (!event) return true;
		if (event.defaultPrevented || event.button !== 0) return false;
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
		event.preventDefault();
		return true;
	}
	function open(section: DoctorDetailSection, hints: DoctorDetailHints = {}, event?: MouseEvent) {
		if (inPlace(event)) detail.openWindow(section, hints);
	}
	const officeHint = $derived<DoctorDetailHints>(
		detail.activeOfficeId ? { office: detail.activeOfficeId } : {}
	);

	// U-34.2 (app = web): a phone with touch shares through the system; elsewhere the web's window.
	function share() {
		const coarse = window.matchMedia?.('(pointer: coarse)').matches;
		if (coarse && typeof navigator.share === 'function') {
			navigator.share({ title: shareContent.title, url: shareContent.url }).catch(() => undefined);
			return;
		}
		detail.shareOpen = true;
	}
	// 🔴 U-85 (`20-favorites` Π4): one rule for every heart of the page, the cards' too: a guest signs in, then it saves.
	const save = () => (favorite ? favorite.onToggle() : onSignIn({ action: 'fav' }));
	const saved = $derived(favorite?.saved ?? false);
	const pop = $derived(favorite?.pop ?? false);
	// 🔴 Wave 3 (P-W3 §3.2.1 α–δ, U-104.3 Ε1 = Α, record §3.1): «Κράτηση» with a chosen hour opens the booking — screen 30
	// — for a member AND a guest, no sign-in first (its own button asks for it), marked as opened from this site (its «×»
	// may go back, R1 MINOR-1). Without a chosen hour (or one of another office) «Διαθεσιμότητα» picks one first. The
	// address is left as it is (D-W3-31): a «back» finds the hour through the booking's draft (`kept`).
	const openAvailability = () => detail.openWindow('availability', officeHint);
	function book() {
		const slot = detail.selectedSlot;
		if (!slot || slot.officeId !== detail.activeOfficeId) {
			openAvailability();
			return;
		}
		// The booking's address, resolved by the screen (a module knows no other module's route).
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		void goto(bookingHref(slot, detail.serviceId), { state: { siteBack: true } });
	}

	// Π5: the section bar from 744 once the photos have gone, its «Κράτηση» once the card has.
	let identityNode = $state<HTMLElement | null>(null);
	let cardNode = $state<HTMLElement | null>(null);
	let barShown = $state(false);
	let buyShown = $state(false);
	let activeId = $state<string | null>(null);
	$effect(() => {
		const target = identityNode;
		if (!target || typeof IntersectionObserver === 'undefined') return;
		const observer = new IntersectionObserver(([entry]) => {
			barShown = !entry.isIntersecting && entry.boundingClientRect.bottom < 0;
		});
		observer.observe(target);
		return () => observer.disconnect();
	});
	$effect(() => {
		const target = cardNode;
		if (!target || typeof IntersectionObserver === 'undefined') return;
		const observer = new IntersectionObserver(([entry]) => {
			buyShown = !entry.isIntersecting && entry.boundingClientRect.top < 0;
		});
		observer.observe(target);
		return () => observer.disconnect();
	});
	const links = $derived.by(() => {
		const list: DoctorSectionLink[] = [];
		if (content.photos.length > 0)
			list.push({ id: 'photos', label: m.doctor_nav_photos({}, options) });
		if (detail.availabilitySection)
			list.push({ id: 'availability', label: m.doctor_nav_availability({}, options) });
		if (content.serviceCost)
			list.push({ id: 'service-cost', label: m.doctor_nav_services({}, options) });
		if (detail.location) list.push({ id: 'location', label: m.doctor_nav_location({}, options) });
		if (content.reviews) list.push({ id: 'reviews', label: m.doctor_nav_reviews({}, options) });
		return list;
	});
	$effect(() => {
		const ids = links.map((link) => link.id);
		if (typeof IntersectionObserver === 'undefined') return;
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) activeId = entry.target.id.replace(/^doctor-/u, '');
				}
			},
			{ rootMargin: '-80px 0px -60% 0px' }
		);
		for (const id of ids) {
			const node = document.getElementById(`doctor-${id}`);
			if (node) observer.observe(node);
		}
		return () => observer.disconnect();
	});
</script>

<SeoHead {seo} />

<TopBar {locale} {backHref} {onBack} {saved} {pop} onShare={share} onSave={save} />

<div
	data-testid="doctor-detail-profile-page"
	class="px-gutter-sm pb-section tablet:px-profile-gutter laptop:px-profile-gutter-lg"
>
	<div class="mx-auto flex w-full max-w-listing flex-col gap-section">
		<div
			bind:this={identityNode}
			id="doctor-photos"
			class="scroll-mt-bar-top tablet:scroll-mt-section-bar"
		>
			<Identity
				identity={content.identity}
				photos={content.photos}
				{locale}
				photoHref={(index) => detail.detailsHref('photos', { focus: String(index) })}
				allPhotosHref={detail.detailsHref('photos')}
				onOpenPhoto={(index, event) => open('photos', { focus: String(index) }, event)}
				onOpenAllPhotos={(event) => open('photos', {}, event)}
				reviewsHref={detail.detailsHref('reviews')}
				onOpenReviews={(event) => open('reviews', {}, event)}
				{saved}
				{pop}
				onShare={share}
				onSave={save}
			/>
		</div>

		<TwoColumnDetail from="tablet" stickyAside={false} data-testid="doctor-detail-columns">
			<div class="flex flex-col gap-section">
				{#if content.summary}
					<Summary summary={content.summary} {contact} />
				{:else}
					<!-- U-84.6: the button is always there, for a doctor with no summary too. -->
					{@render contact?.()}
				{/if}
				{#if content.professional}
					<Professional
						content={content.professional}
						moreLabel={m.doctor_show_more({}, options)}
						moreHref={detail.aboutHref}
					/>
				{/if}
				{#if content.specializations}
					<Specializations
						content={content.specializations}
						moreHref={detail.detailsHref('specializations')}
						rowHref={(focus) => detail.detailsHref('specializations', { focus })}
						onOpenMore={(event) => open('specializations', {}, event)}
						onOpenRow={(focus, event) => open('specializations', { focus }, event)}
						{onSignIn}
					/>
				{/if}
				{#if detail.availabilitySection}
					<AvailabilitySection
						content={detail.availabilitySection}
						{locale}
						showAllHref={detail.detailsHref('availability', officeHint)}
						onOpen={(date, event) =>
							open('availability', { ...officeHint, ...(date ? { date } : {}) }, event)}
						onSelectOffice={detail.chooseOffice}
					/>
				{/if}
				{#if content.serviceCost}
					<ServiceCost
						content={content.serviceCost}
						moreHref={detail.detailsHref('services')}
						rowHref={(focus) => detail.detailsHref('services', { focus })}
						onOpenMore={(event) => open('services', {}, event)}
						onOpenRow={(focus, event) => open('services', { focus }, event)}
						{onSignIn}
					/>
				{/if}
				{#if locationUp && detail.location}
					<LocationSection
						location={detail.location}
						tabs={detail.officeTabs}
						activeOfficeId={detail.activeOfficeId}
						{locale}
						openHref={detail.detailsHref('location', officeHint)}
						onOpen={(event) => open('location', officeHint, event)}
						onSelectOffice={detail.chooseOffice}
					/>
				{/if}
				{#if content.soonTitle}
					<!-- U-34.3: a doctor with nothing beyond a name and a specialty — the title alone. -->
					<div
						data-testid="doctor-detail-fallback-notice"
						class="flex flex-col items-center gap-3 border-t border-border/60 py-6 text-center"
					>
						<Ionicon name="time-outline" class="icon-lg text-muted-foreground" />
						<h2 class="text-heading-sm font-semibold text-foreground">{content.soonTitle}</h2>
					</div>
				{/if}
			</div>
			{#snippet aside()}
				<div class="tablet:sticky tablet:top-card-sticky-top">
					<BookingCard
						bind:ref={cardNode}
						{booking}
						tabs={detail.officeTabs}
						activeOfficeId={detail.activeOfficeId}
						{services}
						serviceId={detail.serviceId}
						{locale}
						availabilityHref={detail.detailsHref('availability', officeHint)}
						onOpenAvailability={(event) => open('availability', officeHint, event)}
						onChooseService={detail.chooseService}
						onSelectOffice={detail.chooseOffice}
						onBook={book}
						{onSignIn}
						onRetry={detail.retryAvailability}
					/>
				</div>
			{/snippet}
		</TwoColumnDetail>

		{#if !locationUp && detail.location}
			<LocationSection
				location={detail.location}
				tabs={detail.officeTabs}
				activeOfficeId={detail.activeOfficeId}
				{locale}
				openHref={detail.detailsHref('location', officeHint)}
				onOpen={(event) => open('location', officeHint, event)}
				onSelectOffice={detail.chooseOffice}
			/>
		{/if}
		{#if content.reviews}
			<ReviewsSection
				content={content.reviews}
				showAllHref={detail.detailsHref('reviews')}
				onOpen={(focus, event) => open('reviews', focus ? { focus } : {}, event)}
			/>
		{/if}
		{#if content.bio}
			<BioSection content={content.bio} allHref={`${detail.aboutHref}#bio`} />
		{/if}
		{@render articles?.()}
		{#if detail.know}
			<KnowSection
				content={detail.know}
				tabs={detail.officeTabs}
				activeOfficeId={detail.activeOfficeId}
				{locale}
				pageHref={(focus) => detail.detailsHref('know', { focus })}
				onOpenPage={(focus, event) => open('know', { focus }, event)}
				onSelectOffice={detail.chooseOffice}
			/>
		{/if}
	</div>
</div>

<BookingBar
	{booking}
	loadingSummary={m.doctor_booking_summary({}, options)}
	onBook={book}
	onOpenWhen={() =>
		open('availability', {
			...officeHint,
			...(detail.selectedSlot ? { date: detail.selectedSlot.date } : {})
		})}
	onSelectOffice={detail.chooseOffice}
	{onSignIn}
	onRetry={detail.retryAvailability}
/>

<SectionBar
	{links}
	{activeId}
	shown={barShown}
	{buyShown}
	{booking}
	{locale}
	onBook={book}
	{onSignIn}
/>

<DetailWindow
	{detail}
	{reviewLinks}
	{knowLinks}
	{onSignIn}
	{saved}
	{pop}
	onShare={share}
	onSave={save}
/>

<WindowPhotos
	open={detail.window?.section === 'photos'}
	photos={content.photos}
	focus={readDoctorPhotoFocus(detail.window?.hints.focus)}
	{locale}
	{saved}
	{pop}
	photoHref={(index) => detail.detailsHref('photos', { focus: String(index) })}
	onOpenPhoto={(index, event) => open('photos', { focus: String(index) }, event)}
	onPhotoChange={(index) => detail.showPhoto(index)}
	onClose={() => detail.closeWindow()}
	onShare={share}
	onSave={save}
/>

<WindowShare
	bind:open={detail.shareOpen}
	name={content.identity.name}
	subtitle={content.identity.subtitle}
	photoUrl={content.photos[0]?.thumbUrl}
	url={shareContent.url}
	{locale}
/>
