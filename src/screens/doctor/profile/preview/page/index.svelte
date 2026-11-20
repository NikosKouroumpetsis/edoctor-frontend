<script lang="ts">
	import DoctorArticlesRow from '$modules/articles/ui/doctor-row';
	import DoctorDetail, { DoctorDetailError } from '$modules/doctor/ui/detail';
	import DoctorProfilePreview from '$modules/doctor-dashboard/ui/preview';
	import { useDoctorProfilePreviewScreen } from '../hooks';

	const screen = useDoctorProfilePreviewScreen();
	// 🔴 D-W52-26: nothing a patient could SEND is composed here (see the hook) — a press that would sign in does nothing.
	const nothing = () => {};
</script>

<!-- 🔴 Wave 5.2 · «Δείτε πώς σας βλέπουν» (D-W52-26, U-224): ONE screen — the dashboard's band and read
     (`doctor-dashboard/ui/preview`) over the public profile's page as it is (`doctor/ui/detail`, the profile's own screen
     `screens/doctors/[slug]` composes the same), drawn with the facts of `GET /doctor/me/profile/preview` for the doctor
     of the session. The page is told it is a preview: no head of the public profile, no bar of its own over the band, its
     windows on this page's own address. The server's page is a guest's, so the reader is no «member» here: the answer
     already carries the prices the doctor may see. -->
<DoctorProfilePreview locale={screen.locale} read={screen.read}>
	{#snippet page({ profile, readAt })}
		{@const slug = profile.doctorSlug}
		<DoctorDetail
			load={{ state: 'ready', profile, serverNow: readAt }}
			locale={screen.locale}
			routeSection={null}
			localize={screen.localize}
			similarHref={screen.similarHref}
			similarAreaQuery={screen.similarAreaQuery}
			bookingHref={(slot, serviceId) => screen.bookingHref(slug, slot, serviceId)}
			kept={null}
			canonicalUrl={screen.publicUrl(slug)}
			alternateUrls={screen.publicUrls(slug)}
			backHref={screen.closeHref}
			signedIn={false}
			onSignIn={nothing}
			reviewLinks={screen.reviewLinks}
			knowLinks={screen.knowLinks}
			preview
		>
			{#snippet articles()}
				{#if profile.doctorId && profile.articlesSummary}
					<DoctorArticlesRow
						doctorId={profile.doctorId}
						counts={profile.articlesSummary}
						locale={screen.locale}
						articleHref={screen.articleHref}
						allHref={screen.doctorArticlesHref(slug)}
					/>
				{/if}
			{/snippet}
		</DoctorDetail>
	{/snippet}
	{#snippet missing()}
		<DoctorDetailError
			status={404}
			locale={screen.locale}
			backHref={screen.searchHref}
			href={screen.href}
			onRetry={nothing}
			preview
		/>
	{/snippet}
</DoctorProfilePreview>
