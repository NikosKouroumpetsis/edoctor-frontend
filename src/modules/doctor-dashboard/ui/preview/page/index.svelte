<script lang="ts" generics="Profile">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { m } from '$paraglide/messages.js';
	import { localizeHref } from '$paraglide/runtime';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { Button } from '$shared/ui/primitives/button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { doctorProfilePath } from '$modules/doctor-dashboard/lib/paths';
	import { useDoctorProfilePreview } from '../hooks';
	import type { DoctorProfilePreviewProps } from '../types';

	let { locale, read, page, missing }: DoctorProfilePreviewProps<Profile> = $props();

	const options = $derived({ locale });
	const title = $derived(m.doctor_my_profile_preview_title({}, options));
	const closeHref = $derived(resolve(localizeHref(doctorProfilePath, { locale }) as Pathname));
	const preview = useDoctorProfilePreview<Profile>({
		locale: () => locale,
		read: (answer) => read(answer)
	});
</script>

<svelte:head>
	<title>{title} | {m.brand_name({}, options)}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<!-- 🔴 Wave 5.2 · «Δείτε πώς σας βλέπουν» (D-W52-26; `64-switch/sw.js` `prevPage`, `sw.css` `.w-pvband`): a page of its own
     (U-102: never a window) — ONE band that stays on top (under the dashboard's bar from 744), «Έτσι σας βλέπουν οι
     ασθενείς», whether the search shows the doctor, and «Κλείσιμο» back to «Το προφίλ μου»; under it the public profile
     as it is, handed in by the screen. A personal page: `noindex`, no canonical, no alternate.
     🔴 D-W52-26α: what stands under the band is ONLY to look at, for every doctor — the whole body is `inert` (the
     template's own way for a part that shows and must not answer, `split-view.svelte` `inert={!menuLive}`): no press, no
     focus, no window, no page left, nothing sent; the page still scrolls (the document's own scroll) and «Κλείσιμο» of
     the band, outside the body, is the one control. -->
<main data-testid="doctor-profile-preview" data-view={preview.view} class="min-h-page bg-card">
	<section
		data-testid="doctor-profile-preview-band"
		aria-label={title}
		class="sticky top-0 z-20 border-b border-line bg-background px-gutter-sm py-3.5 tablet:top-bar-top tablet:px-profile-gutter laptop:px-profile-gutter-lg"
	>
		<div class="mx-auto flex w-full max-w-listing flex-row items-center justify-between gap-3">
			<div class="min-w-0">
				<p class="text-body-md font-semibold text-foreground">{title}</p>
				{#if preview.note}
					<p data-testid="doctor-profile-preview-note" class="text-label-lg text-muted-foreground">
						{preview.note}
					</p>
				{/if}
			</div>
			<Button
				label={m.doctor_my_profile_preview_close({}, options)}
				tone="outline"
				radius="full"
				hover={false}
				href={closeHref}
				data-testid="doctor-profile-preview-close"
				class="shrink-0"
			/>
		</div>
	</section>

	{#if preview.view === 'failed'}
		<div class="mx-auto w-full max-w-content px-gutter-sm pt-section">
			<InlineNotice
				variant="danger"
				message={m.doctor_dashboard_load_error({}, options)}
				actionLabel={m.doctor_dashboard_retry({}, options)}
				onAction={() => preview.retry()}
				testId="doctor-profile-preview-error"
				actionTestId="doctor-profile-preview-retry"
			/>
		</div>
	{:else if preview.view === 'missing'}
		<div data-testid="doctor-profile-preview-body" inert>
			{@render missing()}
		</div>
	{:else if preview.read}
		<div data-testid="doctor-profile-preview-body" inert>
			{@render page(preview.read)}
		</div>
	{:else}
		<div
			data-testid="doctor-profile-preview-loading"
			aria-busy="true"
			aria-label={title}
			class="mx-auto grid w-full max-w-listing gap-4 px-gutter-sm pt-section tablet:px-profile-gutter laptop:px-profile-gutter-lg"
		>
			<Skeleton class="h-placeholder-lg w-full rounded-xl" />
			<Skeleton class="h-control-md w-1/3 rounded-md" />
			<Skeleton class="h-control-md w-2/3 rounded-md" />
		</div>
	{/if}
</main>
