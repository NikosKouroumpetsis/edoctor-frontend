<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { cn } from '$shared/lib/utils';
	import { ActionBar } from '$shared/ui/molecules/action-bar';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { FullscreenModalTemplate } from '$shared/ui/templates/fullscreen-modal';
	import type { DoctorSelectedSlot } from '$modules/doctor/lib/detail';
	import type { DoctorDetailState } from '../hooks/use-state.svelte';
	import PricedService from './priced-service.svelte';
	import WindowAvailability from './window-availability.svelte';
	import WindowDescription from './window-description.svelte';
	import WindowLocation from './window-location.svelte';
	import WindowReviews from './window-reviews.svelte';

	let { detail, onSignIn }: { detail: DoctorDetailState; onSignIn: () => void } = $props();

	const locale = $derived(detail.locale);
	const options = $derived({ locale });
	const current = $derived(detail.window);
	const section = $derived(current?.section);
	const open = $derived(Boolean(current) && section !== 'photos');
	const wide = $derived(section === 'reviews' || section === 'location');
	const content = $derived(detail.content);

	const title = $derived.by(() => {
		switch (section) {
			case 'description':
				return content.professional?.title ?? m.doctor_section_professional({}, options);
			case 'services':
				return m.doctor_section_service_cost({}, options);
			case 'location':
				return m.doctor_section_location({}, options);
			case 'reviews':
				return m.doctor_section_reviews({}, options);
			case 'availability':
				return m.doctor_section_availability({}, options);
			default:
				return '';
		}
	});

	// The window's chosen time, kept until «Επιβεβαίωση» (a new opening starts from the page's own).
	let staged = $state<DoctorSelectedSlot | null>(null);
	$effect(() => {
		if (section === 'availability') staged = detail.selectedSlot;
	});
	const availability = $derived(
		section === 'availability' ? detail.availabilityModal(detail.activeOfficeId) : null
	);

	function confirm() {
		if (!staged) return;
		detail.confirmSlot(staged);
		detail.closeWindow();
	}
</script>

<!-- 🔴 Π7 / U-24.3 (app = web): `details/*` — on the phone the sheet over the whole screen (12 under the top, the 24
     corner), from 744 the centred window of the filters (568; the reviews and the location 1032, the whole height).
     Focus goes to the window (U-09.7), Escape, «×», the backdrop and the browser's «back» close it; the page under it
     keeps still (the kit's scroll lock). -->
<FullscreenModalTemplate
	{open}
	{title}
	closeLabel={m.doctor_window_close({}, options)}
	closeTestId="doctor-detail-modal-close"
	onClose={() => detail.closeWindow()}
	shape="sheet"
	contentGap="loose"
	contentWidth={wide ? 'listing' : 'form'}
	data-testid="doctor-detail-modal"
	data-section={section}
	class={cn(wide && 'tablet:h-full tablet:max-w-window-wide')}
>
	{#if section === 'description'}
		{#if content.professional}
			<WindowDescription content={content.professional} />
		{/if}
	{:else if section === 'services'}
		{@const services = detail.servicesModal}
		{#if services}
			<div data-testid="doctor-detail-modal-services" class="flex flex-col gap-4">
				<InlineNotice message={services.notice} variant="tint" />
				{#each services.services as service (service.id)}
					<PricedService
						{service}
						costLabel={services.costLabel}
						includesLabel={services.includesLabel}
						descriptionLabel={services.descriptionLabel}
						{onSignIn}
					/>
				{/each}
			</div>
		{/if}
	{:else if section === 'location'}
		{#if detail.location}
			<WindowLocation location={detail.location} officeId={detail.activeOfficeId} {locale} />
		{/if}
	{:else if section === 'reviews'}
		<WindowReviews
			content={detail.reviewsModal}
			readState={detail.reviewsState}
			focusId={current?.hints.focus}
			{locale}
			onRetry={detail.retryReviews}
		/>
	{:else if section === 'availability'}
		<WindowAvailability
			content={availability}
			readState={detail.availabilityState}
			booking={detail.booking}
			initialDate={current?.hints.date}
			bind:staged
			{locale}
			onSelectOffice={detail.chooseOffice}
			onRetry={detail.retryAvailability}
		/>
	{/if}
	{#snippet footer()}
		{#if section === 'availability' && availability}
			<ActionBar
				preset="filters"
				singleLine
				primaryShape="pill"
				primaryTone="contrast"
				primaryLabel={availability.confirmText}
				primaryDisabled={!staged}
				onPrimaryClick={confirm}
				primaryTestId="doctor-detail-modal-availability-confirm"
				secondaryLabel={availability.cancelText}
				onSecondaryClick={() => detail.closeWindow()}
				secondaryTestId="doctor-detail-modal-availability-cancel"
			/>
		{/if}
	{/snippet}
</FullscreenModalTemplate>
