<script lang="ts">
	import type { SignInRequest } from '$shared/state/session';
	import { m } from '$paraglide/messages.js';
	import { ActionBar } from '$shared/ui/molecules/action-bar';
	import { FullscreenModalTemplate } from '$shared/ui/templates/fullscreen-modal';
	import { InfoDialog, type InfoDialogBlock } from '$shared/ui/templates/info-dialog';
	import {
		isDoctorKnowPageId,
		type DoctorKnowLinkId,
		type DoctorKnowPage,
		type DoctorSelectedSlot
	} from '$modules/doctor/lib/detail';
	import type { DoctorDetailState } from '../hooks/use-state.svelte';
	import type { DoctorKnowLinks, DoctorReviewLinks } from '../types';
	import WindowAvailability from '$modules/doctor/ui/availability-picker';
	import { doctorKnowRowGlyphs } from './icons';
	import WindowOffice from './window-office.svelte';
	import WindowReviews from './window-reviews.svelte';
	import WindowServices from './window-services.svelte';

	let {
		detail,
		reviewLinks,
		knowLinks,
		onSignIn,
		onShare,
		onSave,
		saved = false,
		pop = false
	}: {
		detail: DoctorDetailState;
		reviewLinks: DoctorReviewLinks;
		knowLinks: DoctorKnowLinks;
		onSignIn: (request?: SignInRequest) => void;
		onShare: () => void;
		onSave: () => void;
		saved?: boolean;
		pop?: boolean;
	} = $props();

	const locale = $derived(detail.locale);
	const options = $derived({ locale });
	const current = $derived(detail.window);
	const section = $derived(current?.section);
	// This window is the availability's; U-66, U-68, U-70, U-72, U-75: the others have shapes of their own.
	const open = $derived(section === 'availability');
	const title = $derived(open ? m.doctor_section_availability({}, options) : '');

	// The window's chosen time, kept until «Επιβεβαίωση» (a new opening starts from the page's own).
	let staged = $state<DoctorSelectedSlot | null>(null);
	$effect(() => {
		if (section === 'availability') staged = detail.selectedSlot;
	});
	const availability = $derived(
		section === 'availability' ? detail.availabilityModal(detail.activeOfficeId) : null
	);

	// 🔴 U-75 Π3: a block's page, by its name in the address; it keeps its words through its way out.
	const knowFocus = $derived(section === 'know' ? current?.hints.focus : undefined);
	const knowPageNow = $derived(
		isDoctorKnowPageId(knowFocus) ? detail.know?.pages[knowFocus] : undefined
	);
	let knowPage = $state<DoctorKnowPage | undefined>(undefined);
	$effect.pre(() => {
		if (knowPageNow) knowPage = knowPageNow;
	});
	const shownKnow = $derived(knowPageNow ?? knowPage);
	const knowBlocks = $derived<InfoDialogBlock[]>(
		(shownKnow?.groups ?? []).map((group) => ({
			heading: group.heading,
			intro: group.intro,
			rows: group.rows.map((row) => ({
				key: row.key,
				icon: doctorKnowRowGlyphs[row.id],
				label: row.label,
				sub: row.sub,
				link: row.phone
					? { label: row.phone.label, href: `tel:${row.phone.dialNumber}` }
					: undefined
			}))
		}))
	);
	const knowHrefs = $derived<Record<DoctorKnowLinkId, string>>({
		'help-cancellation': knowLinks.cancellationHref,
		'help-booking': knowLinks.bookingHref,
		offices: detail.detailsHref(
			'location',
			detail.activeOfficeId ? { office: detail.activeOfficeId } : {}
		)
	});

	function confirm() {
		if (!staged) return;
		detail.confirmSlot(staged);
		detail.closeWindow();
	}
</script>

<!-- 🔴 Π7 / U-24.3 (app = web): `details/availability` — on the phone the sheet over the whole screen (12 under the top,
     the 24 corner), from 744 the centred window of the filters (568).
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
	contentWidth="form"
	data-testid="doctor-detail-modal"
	data-section={section}
>
	{#if section === 'availability'}
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

<WindowReviews
	open={section === 'reviews'}
	doctor={detail.profile}
	{locale}
	now={detail.now}
	focusId={section === 'reviews' ? current?.hints.focus : undefined}
	linkedMention={section === 'reviews' ? current?.hints.mention : undefined}
	links={reviewLinks}
	onClose={() => detail.closeWindow()}
/>

<WindowOffice
	open={section === 'location' && Boolean(detail.location)}
	{detail}
	{locale}
	{saved}
	{pop}
	{onShare}
	{onSave}
/>

<WindowServices {detail} {locale} {onSignIn} />

<!-- 🔴 U-75 Π3: the small window of screen 12 from 744, its sheet below; «×», Escape, the backdrop and «back» close it. -->
<InfoDialog
	bind:open={
		() => Boolean(knowPageNow),
		(next) => {
			if (!next) detail.closeWindow();
		}
	}
	title={shownKnow?.title ?? ''}
	intro={shownKnow?.intro ?? []}
	blocks={knowBlocks}
	links={shownKnow
		? [
				{
					label: shownKnow.link.label,
					href: knowHrefs[shownKnow.link.id],
					testId: `doctor-know-link-${shownKnow.link.id}`
				}
			]
		: []}
	closeLabel={m.doctor_window_close({}, options)}
	testId="doctor-know-page"
/>
