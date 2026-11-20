<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import type { Pathname } from '$app/types';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { m } from '$paraglide/messages.js';
	import { localizeHref } from '$paraglide/runtime';
	import { breakpoints } from '$shared/design/tokens';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { NoticeCard } from '$shared/ui/molecules/notice-card';
	import { Button } from '$shared/ui/primitives/button';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { SplitView, SplitViewFoldButton } from '$shared/ui/templates/split-view';
	import {
		doctorMenuPath,
		doctorProfileCvItemPath,
		doctorProfileCvPath,
		doctorProfileLanguagesPath,
		doctorProfileNetworksPath,
		doctorProfileNewServiceItemPath,
		doctorProfileNewServicePath,
		doctorProfilePath,
		doctorProfilePhotoCropPath,
		doctorProfilePhotosPath,
		doctorProfilePreviewPath,
		doctorProfileServicePath,
		doctorProfileServicesPath,
		doctorProfileSpecializationsPath,
		doctorProfileSpokenLanguagesPath,
		doctorProfileSpecialtyPath
	} from '$modules/doctor-dashboard/lib/paths';
	import { doctorCredentialTexts } from '$modules/doctor-dashboard/lib/cv';
	import {
		doctorProfileSectionLabel,
		doctorProfileSections,
		emphasizeDoctorOfficeSettings
	} from '$modules/doctor-dashboard/lib/profile';
	import DoctorAbout from '$modules/doctor-dashboard/ui/about';
	import DoctorCredential from '$modules/doctor-dashboard/ui/credential';
	import DoctorPhotoCrop from '$modules/doctor-dashboard/ui/crop';
	import DoctorCv from '$modules/doctor-dashboard/ui/cv';
	import DoctorLanguages from '$modules/doctor-dashboard/ui/languages';
	import DoctorNetworks from '$modules/doctor-dashboard/ui/networks';
	import DoctorPhotos from '$modules/doctor-dashboard/ui/photos';
	import DoctorService from '$modules/doctor-dashboard/ui/service';
	import DoctorServiceCatalogue from '$modules/doctor-dashboard/ui/catalogue';
	import DoctorServices from '$modules/doctor-dashboard/ui/services';
	import DoctorSpecializations from '$modules/doctor-dashboard/ui/specializations';
	import DoctorSpecialty from '$modules/doctor-dashboard/ui/specialty';
	import DoctorSpokenLanguages from '$modules/doctor-dashboard/ui/spoken-languages';
	import Row from '../components/row.svelte';
	import { useDoctorProfile } from '../hooks';
	import type { DoctorProfilePageProps } from '../types';

	let { locale, address = { section: null }, readDescription }: DoctorProfilePageProps = $props();

	const options = $derived({ locale });
	const href = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);
	const title = $derived(m.doctor_my_profile_title({}, options));
	const profile = useDoctorProfile({ locale: () => locale });
	const WAIT_ROWS = [0, 1, 2, 3, 4, 5];

	// 🔴 D-W52-41 (the settings' way, `profile/ui/settings`): from 950 the list's own address shows its FIRST section
	// with a page beside it — in place, the address stays the list's — never below 950, where the list is the page.
	const wide = new MediaQuery(`(min-width: ${breakpoints.split}px)`, false);
	const built = doctorProfileSections.filter((section) => section.path !== null);
	const shown = $derived(address.section ?? (wide.current ? (built[0]?.id ?? null) : null));
	// Below 950 the right column takes the list's place only for the section the address names.
	const paneOpen = $derived(address.section !== null);
	// The row is the current one only where its page stands beside the list.
	const selected = $derived(wide.current ? shown : null);
	const cropId = $derived(address.section === 'photos' ? address.cropId : null);
	// 🔴 D-W52-59: the choice of the specializations, a page of its own under screen 80 (U-102).
	const picking = $derived(address.section === 'specialty' && address.pick);
	// 🔴 D-W52-63: ONE row of the biography, a page of its own under screen 81 (U-102) — `null` for the list of 81.
	const cvItem = $derived(address.section === 'cv' ? address.item : null);
	// 🔴 D-W52-69 / 70: the choice of the languages or the four links, each a page of its own under screen 82 (U-102).
	const languagesPage = $derived(address.section === 'languages' ? address.page : null);
	// 🔴 D-W52-81 / 82: one service, «Νέα υπηρεσία» or a new one, each a page of its own under screen 83 (U-102).
	const servicesPage = $derived(address.section === 'services' ? address.page : null);

	// 🔴 U-216.2 (D-W52-14): the menu folds to its rail and back; the state lives as long as the page does.
	let folded = $state(false);

	const pageTitle = $derived.by(() => {
		if (address.section === null) return title;
		if (cropId !== null) return m.doctor_photos_crop({}, options);
		if (cvItem !== null) return doctorCredentialTexts(cvItem.kind, locale).heading;
		if (languagesPage === 'spoken') return m.doctor_languages_spoken_title({}, options);
		if (languagesPage === 'networks') return m.doctor_links_title({}, options);
		if (servicesPage?.view === 'catalogue') return m.doctor_my_services_new_title({}, options);
		return picking
			? m.doctor_my_specializations_title({}, options)
			: doctorProfileSectionLabel(address.section, locale);
	});
	const photosHref = $derived(href(doctorProfilePhotosPath));
	const specialtyHref = $derived(href(doctorProfileSpecialtyPath));
	const cvHref = $derived(href(doctorProfileCvPath));
	const languagesHref = $derived(href(doctorProfileLanguagesPath));
	const servicesHref = $derived(href(doctorProfileServicesPath));
	// «Ρυθμίσεις ιατρείου» in bold, words alone (D-W52-27: the web has no such page yet).
	const foot = $derived(
		emphasizeDoctorOfficeSettings(m.doctor_my_profile_foot({}, options), locale)
	);
	const dotOf = (id: string) => profile.rows.some((row) => row.id === id && row.missing !== null);
</script>

<svelte:head>
	<title>{pageTitle} | {m.brand_name({}, options)}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<!-- 🔴 Wave 5.2 · screen 77 «Το προφίλ μου» (D-W52-23 … 25, 27; `64-switch/sw.js` `profPage`, `77-profile`): the page the
     first row of the doctor's «Μενού» opens. «‹» to «Μενού» below 950 (none from 950: U-217), the title, the status (green:
     the search shows the doctor · orange: it does not, with the reason), «Δείτε πώς σας βλέπουν», the six sections one
     under the other (U-112) with what each holds and what it lacks, and at the end where the offices, the hours and the
     funds are — plain words on the web, which has no «Ρυθμίσεις ιατρείου» yet (D-W52-27, D-W45-02). -->
{#snippet menu()}
	<div
		data-testid="doctor-profile"
		data-view={profile.view}
		class="px-gutter-sm pt-3 pb-pane-inset-lg tablet:pt-section split:p-0"
	>
		<div class="mx-auto flex w-full max-w-form flex-col split:max-w-none">
			<IconButton
				icon="chevron-back"
				appearance="tint"
				surface="soft"
				size="sm"
				iconSize="md"
				aria-label={m.doctor_my_profile_back({}, options)}
				href={href(doctorMenuPath)}
				data-testid="doctor-profile-back"
				class="mb-2 split:hidden"
			/>
			<div class="flex flex-row items-center gap-3">
				<h1
					class="flex min-h-touch items-center text-heading-md font-semibold text-foreground tablet:text-heading-lg split:text-heading-md"
				>
					{title}
				</h1>
				<SplitViewFoldButton label={m.doctor_my_profile_menu_fold({}, options)} class="ml-auto" />
			</div>

			{#if profile.view === 'failed'}
				<div class="mt-3">
					<InlineNotice
						variant="danger"
						message={m.doctor_dashboard_load_error({}, options)}
						actionLabel={m.doctor_dashboard_retry({}, options)}
						onAction={() => profile.retry()}
						testId="doctor-profile-error"
						actionTestId="doctor-profile-retry"
					/>
				</div>
			{:else if profile.view === 'loading' || !profile.status}
				<div
					data-testid="doctor-profile-loading"
					aria-busy="true"
					aria-label={title}
					class="mt-3 grid gap-3"
				>
					<Skeleton class="h-row-lg w-full rounded-md" />
					<Skeleton class="h-control-md w-full rounded-full" />
					{#each WAIT_ROWS as row (row)}
						<div aria-hidden="true">
							<Skeleton class="h-control-md w-full rounded-md" />
						</div>
					{/each}
				</div>
			{:else}
				<NoticeCard
					tone={profile.status.tone}
					icon={profile.status.icon}
					title={profile.status.title}
					lines={profile.status.lines}
					testId="doctor-profile-status"
					class="mt-1"
				/>
				<Button
					label={m.doctor_my_profile_preview({}, options)}
					tone="outline"
					radius="full"
					hover={false}
					href={href(doctorProfilePreviewPath)}
					data-testid="doctor-profile-preview"
					class="mt-3 w-full"
				>
					{#snippet leading()}
						<Ionicon name="eye-outline" class="icon-md" />
					{/snippet}
				</Button>
				<ul data-testid="doctor-profile-rows" class="mt-3 flex flex-col">
					{#each profile.rows as row (row.id)}
						<Row
							{row}
							href={row.path === null ? null : href(row.path)}
							selected={selected === row.id}
						/>
					{/each}
				</ul>
				<p
					data-testid="doctor-profile-foot"
					class="mt-4 border-t border-line pt-4 text-body-sm text-muted-foreground"
				>
					{#each foot as run, index (index)}{#if run.strong}<strong class="font-semibold"
								>{run.text}</strong
							>{:else}{run.text}{/if}{/each}
				</p>
			{/if}
		</div>
	</div>
{/snippet}

<!-- 🔴 D-W52-41 · U-216.2 (`64-switch/sw.js:864-865`, `sw.css` `.w-rail`): what the menu folds to — the button that opens
     it again and the glyph of every section that HAS a page («Φωτογραφίες», 🔴 D-W52-49 «Όνομα και περιγραφή», 🔴 D-W52-59
     «Ειδικότητα και εξειδικεύσεις», 🔴 D-W52-63 «Βιογραφικό», 🔴 D-W52-69 / 70 «Γλώσσες και κοινωνικά δίκτυα», 🔴 D-W52-81
     «Υπηρεσίες και τιμές»: all six), each a link named by its section, the open one on the grey tile, the dot
     where something is still missing. No colour under the pointer (U-100). -->
{#snippet rail()}
	<SplitViewFoldButton label={m.doctor_my_profile_menu_open({}, options)} />
	<ul data-testid="doctor-profile-rail" class="flex flex-col gap-2">
		{#each built as section (section.id)}
			{@const label = doctorProfileSectionLabel(section.id, locale)}
			<li>
				<!-- The section's page, already resolved in the page's language (a module knows no route). -->
				<!-- eslint-disable svelte/no-navigation-without-resolve -->
				<a
					href={href(section.path ?? doctorProfilePath)}
					aria-label={label}
					title={label}
					aria-current={selected === section.id ? 'page' : undefined}
					data-testid={`doctor-profile-rail-${section.id}`}
					class={[
						'grid size-touch place-items-center rounded-md text-foreground transition-opacity duration-standard ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-70',
						selected === section.id && 'bg-chip'
					]}
				>
					<span class="relative grid size-6 place-items-center">
						<Ionicon name={section.icon} class="icon-lg" />
						{#if dotOf(section.id)}
							<span
								aria-hidden="true"
								data-slot="doctor-profile-rail-dot"
								class="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-accent"
							></span>
						{/if}
					</span>
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</li>
		{/each}
	</ul>
{/snippet}

<!-- 🔴 D-W52-41 (U-139.1 no longer holds the page back: a section HAS a page now): from 950 the list on the left — a
     menu's widths, folding to its rail (D-W52-14) — and the section in the MIDDLE of the right column (U-167); below 950
     the list, or the section the address names as a page of its own with «‹» to the list (U-102: never a window). Since
     screen 83 every row has its screen (D-W52-81). -->
<main data-testid="doctor-profile-page" data-section={shown ?? undefined}>
	<SplitView
		list={menu}
		{rail}
		bind:folded
		widths="menu"
		centred
		open={paneOpen}
		data-testid="doctor-profile-split"
	>
		{#if shown === 'photos'}
			{#if cropId !== null}
				{#key cropId}
					<DoctorPhotoCrop
						{locale}
						imageId={cropId}
						{photosHref}
						onClose={() => void goto(photosHref)}
					/>
				{/key}
			{:else}
				<DoctorPhotos
					{locale}
					links={{
						profile: href(doctorProfilePath),
						crop: (imageId) => href(doctorProfilePhotoCropPath(imageId))
					}}
				/>
			{/if}
		{:else if shown === 'about'}
			<!-- 🔴 D-W52-49 (screen 79): read only, at `/doctor/profile/about` — placed as the photos' page. -->
			<DoctorAbout {locale} links={{ profile: href(doctorProfilePath) }} {readDescription} />
		{:else if shown === 'specialty'}
			<!-- 🔴 D-W52-59 (screen 80): at `/doctor/profile/specialty`, placed as the photos' page; the choice of the
			     specializations a page of its own under it, in the same place (U-102: never a window). -->
			{#if picking}
				<DoctorSpecializations {locale} {specialtyHref} onClose={() => void goto(specialtyHref)} />
			{:else}
				<DoctorSpecialty
					{locale}
					links={{
						profile: href(doctorProfilePath),
						specializations: href(doctorProfileSpecializationsPath)
					}}
				/>
			{/if}
		{:else if shown === 'cv'}
			<!-- 🔴 D-W52-63 (screen 81): at `/doctor/profile/cv`, placed as the photos' page; ONE row a page of its own
			     under it, in the same place (U-102: never a window) — a new one for each row the address names. -->
			{#if cvItem !== null}
				{#key `${cvItem.kind}/${cvItem.id}`}
					<DoctorCredential
						{locale}
						kind={cvItem.kind}
						id={cvItem.id}
						{cvHref}
						onClose={() => void goto(cvHref)}
					/>
				{/key}
			{:else}
				<DoctorCv
					{locale}
					links={{
						profile: href(doctorProfilePath),
						item: (kind, id) => href(doctorProfileCvItemPath(kind, id))
					}}
				/>
			{/if}
		{:else if shown === 'languages'}
			<!-- 🔴 D-W52-69 / 70 (screen 82): at `/doctor/profile/languages`, placed as the photos' page; the choice of the
			     languages and the four links each a page of its own under it, in the same place (U-102: never a window). -->
			{#if languagesPage === 'spoken'}
				<DoctorSpokenLanguages {locale} {languagesHref} onClose={() => void goto(languagesHref)} />
			{:else if languagesPage === 'networks'}
				<DoctorNetworks {locale} {languagesHref} onClose={() => void goto(languagesHref)} />
			{:else}
				<DoctorLanguages
					{locale}
					links={{
						profile: href(doctorProfilePath),
						spoken: href(doctorProfileSpokenLanguagesPath),
						networks: href(doctorProfileNetworksPath)
					}}
				/>
			{/if}
		{:else if shown === 'services'}
			<!-- 🔴 D-W52-81 / 82 (screen 83): at `/doctor/profile/services`, placed as the photos' page; one service,
			     «Νέα υπηρεσία» and a new one each a page of its own under it, in the same place (U-102: never a window) — a
			     new one for each address. -->
			{#if servicesPage?.view === 'catalogue'}
				<DoctorServiceCatalogue
					{locale}
					{servicesHref}
					item={(serviceId) => href(doctorProfileNewServiceItemPath(serviceId))}
					onClose={() => void goto(servicesHref)}
				/>
			{:else if servicesPage !== null}
				{#key servicesPage.view === 'service' ? servicesPage.id : `new/${servicesPage.serviceId}`}
					<DoctorService
						{locale}
						subject={servicesPage}
						{servicesHref}
						onClose={() => void goto(servicesHref)}
					/>
				{/key}
			{:else}
				<DoctorServices
					{locale}
					links={{
						profile: href(doctorProfilePath),
						service: (id) => href(doctorProfileServicePath(id)),
						catalogue: href(doctorProfileNewServicePath)
					}}
				/>
			{/if}
		{/if}
	</SplitView>
</main>
