<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import { m } from '$paraglide/messages.js';
	import { breakpoints } from '$shared/design/tokens';
	import { useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { BadgeGroup } from '$shared/ui/molecules/badge-group';
	import { ExpandableText } from '$shared/ui/molecules/expandable-text';
	import { SkeletonLines } from '$shared/ui/molecules/skeleton-lines';
	import { StatePanel } from '$shared/ui/molecules/state-panel';
	import { WeeklyHours } from '$shared/ui/molecules/weekly-hours';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { ModalScreenSurface } from '$shared/ui/templates/modal-screen';
	import type { DoctorDetailState } from '../hooks/use-state.svelte';
	import { OfficeTabs } from '$modules/doctor/ui/availability-picker';
	import OfficeInfoRows from './office-info-rows.svelte';
	import OfficeMap from './office-map.svelte';
	import WindowPhotos from './window-photos.svelte';

	const THUMB_PLACEHOLDERS = [0, 1, 2];
	// ONE map at a time: a card in the text below 744, the whole height beside it from 744 (never two MapLibre's).
	const wide = new MediaQuery(`(min-width: ${breakpoints.tablet}px)`, false);

	let {
		open,
		detail,
		locale,
		saved = false,
		pop = false,
		onShare,
		onSave
	}: {
		open: boolean;
		detail: DoctorDetailState;
		locale: SupportedLocale;
		onShare: () => void;
		onSave: () => void;
		saved?: boolean;
		pop?: boolean;
	} = $props();

	const options = $derived({ locale });
	const titleId = useId(undefined, 'doctor-office-title');
	const officePage = $derived(detail.officePage);
	const location = $derived(officePage.location);
	const officeId = $derived(detail.activeOfficeId);
	const description = $derived(location?.description?.trim());
	const hasMap = $derived(Boolean(location?.coordinates && officeId));
	const readState = $derived(detail.officePageState);
	const waiting = $derived(readState === 'waiting');
	const failed = $derived(readState === 'failed' || readState === 'unavailable');
	const label = $derived([location?.streetLine, location?.cityLine].filter(Boolean).join(', '));
	const mapHref = $derived(detail.detailsHref('location', officeId ? { office: officeId } : {}));

	// The office's photos in the profile's viewer, on the place the reader pressed (kept in the page only).
	let photoIndex = $state<number | null>(null);
	$effect(() => {
		void officeId;
		void open;
		photoIndex = null;
	});
</script>

{#snippet closeButton(id: string, surface: 'card' | 'soft')}
	<IconButton
		icon="close"
		appearance="tint"
		{surface}
		size="sm"
		iconSize="md"
		aria-label={m.doctor_window_close({}, options)}
		data-testid={id}
		onclick={() => detail.closeWindow()}
	/>
{/snippet}

{#snippet details()}
	{#if failed}
		<StatePanel
			glyph="alert-circle"
			titleAs="h3"
			title={m.doctor_office_failed_title({}, options)}
			description={m.doctor_reviews_failed_body({}, options)}
			actionLabel={m.doctor_error_retry({}, options)}
			onAction={detail.retryOffice}
			role="alert"
			testId="doctor-detail-modal-office-failed"
			actionTestId="doctor-detail-modal-office-retry"
			class="border-0 px-0"
		/>
	{:else}
		{#if officePage.gettingThere}
			<section data-testid="doctor-detail-modal-office-getting-there" class="flex flex-col gap-2">
				<h3 class="text-body-lg font-semibold text-foreground">
					{m.doctor_office_getting_there({}, options)}
				</h3>
				<ExpandableText
					text={officePage.gettingThere}
					moreLabel={m.doctor_office_read_more({}, options)}
					textClass="text-body-sm leading-relaxed tablet:text-body-lg tablet:leading-normal"
				/>
			</section>
		{/if}
		{#if location}
			<OfficeInfoRows
				rows={[...location.contactRows, ...location.facilityRows]}
				testId="doctor-detail-modal-location-rows"
			/>
		{/if}
		{#if officePage.hours.length > 0}
			<section data-testid="doctor-detail-modal-office-hours" class="flex flex-col gap-2">
				<h3 class="text-body-lg font-semibold text-foreground">
					{m.doctor_office_hours({}, options)}
				</h3>
				<p class="text-body-sm text-muted-foreground">
					{m.doctor_office_hours_note({}, options)}
				</p>
				<WeeklyHours
					rows={officePage.hours}
					closedLabel={m.doctor_office_closed({}, options)}
					todayLabel={m.doctor_office_today({}, options)}
				/>
			</section>
		{:else if waiting}
			<div data-testid="doctor-detail-modal-office-skeleton" aria-hidden="true">
				<SkeletonLines lines={[{ width: 'w-1/3' }, { width: 'w-full' }, { width: 'w-11/12' }]} />
			</div>
		{/if}
		{#if officePage.photos.length > 0}
			<section data-testid="doctor-detail-modal-office-photos" class="flex flex-col gap-3">
				<h3 class="text-body-lg font-semibold text-foreground">
					{m.doctor_office_photos({}, options)}
				</h3>
				<ul class="-mx-gutter-sm scrollbar-none flex flex-row gap-2 overflow-x-auto px-gutter-sm">
					{#each officePage.photos as photo, index (photo.id)}
						<li class="shrink-0">
							<button
								type="button"
								aria-label={photo.alt}
								data-testid={`doctor-detail-modal-office-photo-${index}`}
								onclick={() => (photoIndex = index)}
								class="block size-avatar-2xl overflow-hidden rounded-md bg-muted transition-opacity duration-label ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 tablet:size-placeholder-md laptop:size-avatar-2xl can-hover:hover:opacity-90"
							>
								<img
									src={photo.thumbUrl}
									alt=""
									loading="lazy"
									class="size-full object-cover"
									data-testid={`doctor-detail-modal-office-photo-image-${index}`}
								/>
							</button>
						</li>
					{/each}
				</ul>
			</section>
		{:else if waiting}
			<div class="flex flex-row gap-2" aria-hidden="true">
				{#each THUMB_PLACEHOLDERS as thumb (thumb)}
					<Skeleton class="size-avatar-2xl rounded-md tablet:size-placeholder-md" />
				{/each}
			</div>
		{/if}
		{#if location?.paymentMethods}
			<BadgeGroup
				title={location.paymentMethods.title}
				items={location.paymentMethods.options}
				testId="doctor-detail-modal-office-payment-methods"
				testIdPrefix="doctor-detail-office-payment"
			/>
		{/if}
		{#if description}
			<section class="flex flex-col gap-2">
				<h3 class="text-body-lg font-semibold text-foreground">
					{m.doctor_office_about({}, options)}
				</h3>
				<ExpandableText
					text={description}
					moreLabel={m.doctor_office_read_more({}, options)}
					textClass="text-body-sm leading-relaxed tablet:text-body-lg tablet:leading-normal"
					testId="doctor-detail-modal-location-description"
				/>
			</section>
		{/if}
	{/if}
{/snippet}

<!-- 🔴 U-68.1 (screen 13, Ε1): from 744 a page over the whole screen: the text in its own scrolling column (400, 320 at
     744–1127) and the map the whole height beside it, the «×» on the map, the zoom under it; without a point on the map
     one column of 720 in the middle. Below 744 the application's sheet with its large title (U-66 Ε3) and the map as a
     card. The title is «Τα ιατρεία» / «Το ιατρείο» (Ε3): the profile's section stays «Τοποθεσία». Every part only with
     data (U-34.3). What the doctor or the desk wrote is drawn as text (U-65.6). -->
<ModalScreenSurface
	{open}
	shape="sheet"
	tone="card"
	onDismiss={() => detail.closeWindow()}
	aria-labelledby={titleId}
	data-testid="doctor-detail-modal"
	data-section="location"
	class="tablet:top-0 tablet:m-0 tablet:h-full tablet:max-h-none! tablet:max-w-none tablet:rounded-none!"
>
	<div
		class={cn(
			'relative z-10 h-control-lg shrink-0 tablet:absolute tablet:top-3 tablet:right-4 tablet:h-auto',
			hasMap && 'tablet:hidden'
		)}
	>
		<div class="absolute top-2 right-4 tablet:static">
			{@render closeButton('doctor-detail-modal-close', 'soft')}
		</div>
	</div>
	<div class="flex min-h-0 flex-1 flex-col tablet:flex-row">
		<div
			data-testid="doctor-detail-modal-location"
			aria-busy={waiting || undefined}
			class={cn(
				'min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-gutter-sm pb-section-lg tablet:pt-section tablet:pb-section',
				hasMap
					? 'tablet:box-content tablet:w-document-aside tablet:flex-none tablet:pr-0 laptop:w-office-aside'
					: 'tablet:mx-auto tablet:w-full tablet:max-w-document-wide'
			)}
		>
			<div class="flex flex-col gap-6 tablet:gap-section">
				<h2
					id={titleId}
					class="text-display-sm font-semibold text-foreground tablet:text-heading-xl"
				>
					{officePage.title}
				</h2>
				{#if waiting}
					<span class="sr-only" role="status">{m.doctor_office_loading({}, options)}</span>
				{/if}
				{#if officeId}
					<OfficeTabs
						tabs={detail.officeTabs}
						value={officeId}
						onChange={detail.showOffice}
						label={m.doctor_offices_label({}, options)}
						tabTestIdPrefix="doctor-detail-office-tab"
						testId="doctor-detail-office-tabs"
					/>
				{/if}
				{#if location}
					<div data-testid="doctor-detail-modal-location-address" class="flex flex-col gap-1">
						{#if location.streetLine}
							<p class="text-body-md font-semibold text-foreground tablet:text-body-lg">
								{location.streetLine}
							</p>
						{/if}
						{#if location.cityLine}
							<p class="text-body-md font-semibold text-foreground tablet:text-body-lg">
								{location.cityLine}
							</p>
						{/if}
						{#if officePage.directionsUrl}
							<!-- U-35.3: the map service's own address, in a new tab: no route of the site to resolve. -->
							<!-- eslint-disable svelte/no-navigation-without-resolve -->
							<a
								href={officePage.directionsUrl}
								target="_blank"
								rel="noopener noreferrer"
								aria-label={officePage.directionsLabel}
								data-testid="doctor-detail-modal-office-directions"
								class="-my-1.5 inline-flex min-h-touch w-fit min-w-touch flex-row items-center gap-1 text-body-md font-semibold text-foreground underline outline-none focus-visible:ring-3 focus-visible:ring-ring/50 tablet:text-body-lg tablet:font-medium"
							>
								{m.doctor_office_directions({}, options)}
								<Ionicon name="chevron-forward" class="icon-sm" />
							</a>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						{/if}
					</div>
				{/if}
				{#if !wide.current && hasMap && location?.coordinates && officeId}
					<OfficeMap
						{officeId}
						coordinates={location.coordinates}
						{label}
						{locale}
						testId="doctor-detail-modal-location-map"
						class="h-map-h rounded-xl border border-border/60 tablet:hidden"
					/>
				{/if}
				{@render details()}
			</div>
		</div>
		{#if wide.current && hasMap && location?.coordinates && officeId}
			<div
				class="hidden min-h-0 min-w-0 flex-1 p-6 pl-section tablet:block"
				data-slot="doctor-office-map-pane"
			>
				<div class="relative h-full">
					<OfficeMap
						{officeId}
						coordinates={location.coordinates}
						{label}
						{locale}
						zoomControlsClass="top-control-lg"
						testId="doctor-detail-modal-location-map-wide"
						class="h-full"
					/>
					<div class="absolute top-3 right-3 z-40">
						{@render closeButton('doctor-detail-modal-close-map', 'card')}
					</div>
				</div>
			</div>
		{/if}
	</div>
</ModalScreenSurface>

<WindowPhotos
	open={open && photoIndex !== null}
	photos={officePage.photos}
	focus={photoIndex ?? 0}
	{locale}
	{saved}
	{pop}
	photoHref={() => mapHref}
	onOpenPhoto={(index, event) => {
		event.preventDefault();
		photoIndex = index;
	}}
	onPhotoChange={(index) => (photoIndex = index)}
	onClose={() => (photoIndex = null)}
	{onShare}
	{onSave}
/>
