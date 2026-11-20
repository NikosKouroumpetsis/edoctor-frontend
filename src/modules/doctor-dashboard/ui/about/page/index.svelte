<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { useId } from '$shared/lib/headless';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { doctorProfileSectionLabel } from '$modules/doctor-dashboard/lib/profile';
	import { useDoctorAbout } from '../hooks';
	import type { DoctorAboutProps } from '../types';

	let { locale, links, readDescription }: DoctorAboutProps = $props();

	const options = $derived({ locale });
	const title = $derived(doctorProfileSectionLabel('about', locale));
	const titleId = useId(undefined, 'doctor-about-title');
	const about = useDoctorAbout({ locale: () => locale, read: () => readDescription });
	// 🔴 D-W52-01 (U-207.3): the doctor's page is written in Greek — on the English page its words say so to a reader.
	const wordsLang = $derived(locale === 'el' ? undefined : 'el');
	const headClass = 'mt-5 text-title-sm font-semibold text-foreground';
	const noteClass = 'mt-2 flex flex-row items-start gap-1.5 text-body-sm text-muted-foreground';
</script>

<!-- 🔴 Wave 5.2 · screen 79 «Όνομα και περιγραφή» (U-207, D-W52-49; `64-switch/sw.js` `aboutBody`, `sw.css` «.w-ab…»): READ
     ONLY — no field, no button but «‹». Below 950 a page of its own with «‹» to «Το προφίλ μου» (U-102: never a
     window); from 950 the right column of 77, no «‹» (U-217). The name as the patients read it, and under it — once the
     server says the first licence locked it (D-W52-47) — the lock and why; the description in the paragraphs of the
     public page (its own reader, handed in by the screen), written by the eDoctor team alone (U-207.2), or the dashed
     box «Δεν έχει γραφτεί ακόμη.». 🔴 U-65.6: every word of the server is a text node, never HTML. -->
<section
	aria-labelledby={titleId}
	data-testid="doctor-about"
	data-view={about.view}
	class="px-gutter-sm pt-3 pb-pane-inset-lg tablet:pt-section split:p-0"
>
	<div class="mx-auto w-full max-w-form split:max-w-none">
		<IconButton
			icon="chevron-back"
			appearance="tint"
			surface="soft"
			size="sm"
			iconSize="md"
			aria-label={m.doctor_my_profile_back({}, options)}
			href={links.profile}
			data-testid="doctor-about-back"
			class="mb-2 split:hidden"
		/>
		<h2
			id={titleId}
			class="flex min-h-touch items-center text-heading-lg font-semibold text-foreground split:min-h-0 split:text-heading-md"
		>
			{title}
		</h2>
		<p data-testid="doctor-about-lead" class="text-body-md text-muted-foreground">
			{m.doctor_my_about_lead({}, options)}
		</p>

		{#if about.view === 'failed'}
			<div class="mt-3">
				<InlineNotice
					variant="danger"
					message={m.doctor_dashboard_load_error({}, options)}
					actionLabel={m.doctor_dashboard_retry({}, options)}
					onAction={() => about.retry()}
					testId="doctor-about-error"
					actionTestId="doctor-about-retry"
				/>
			</div>
		{:else if about.view === 'loading'}
			<div
				data-testid="doctor-about-loading"
				aria-busy="true"
				aria-label={title}
				class="mt-5 grid gap-3"
			>
				<Skeleton class="h-control-xs w-1/3 rounded-md" />
				<Skeleton class="h-control-md w-full rounded-md" />
				<Skeleton class="h-row-lg w-full rounded-md" />
			</div>
		{:else}
			<h3 class={headClass}>{m.doctor_my_about_name({}, options)}</h3>
			{#if about.fullName}
				<p
					data-testid="doctor-about-name"
					lang={wordsLang}
					class="mt-1.5 text-title-xs font-normal wrap-anywhere text-foreground"
				>
					{about.fullName}
				</p>
			{/if}
			{#if about.nameLocked}
				<p data-testid="doctor-about-name-locked" class={noteClass}>
					<Ionicon name="lock-closed-outline" class="mt-0.5 icon-sm shrink-0" />
					<span>{m.doctor_my_about_name_locked({}, options)}</span>
				</p>
			{/if}

			<h3 class={headClass}>{m.doctor_my_about_description({}, options)}</h3>
			{#if about.paragraphs.length > 0}
				<div
					data-testid="doctor-about-description"
					lang={wordsLang}
					class="mt-1.5 flex flex-col gap-3 text-body-lg wrap-anywhere text-foreground"
				>
					{#each about.paragraphs as paragraph, index (index)}
						<p>{paragraph}</p>
					{/each}
				</div>
			{:else}
				<p
					data-testid="doctor-about-description-none"
					class="mt-1.5 rounded-md border border-dashed border-line-2 p-4 text-body-md text-muted-foreground"
				>
					{m.doctor_my_about_description_none({}, options)}
				</p>
			{/if}
			<p data-testid="doctor-about-description-by" class={noteClass}>
				{m.doctor_my_about_description_by({}, options)}
			</p>
		{/if}
	</div>
</section>
