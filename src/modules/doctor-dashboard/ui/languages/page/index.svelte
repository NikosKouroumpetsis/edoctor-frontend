<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { useId } from '$shared/lib/headless';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { doctorProfileSectionLabel } from '$modules/doctor-dashboard/lib/profile';
	import { useDoctorLanguages } from '../hooks';
	import type { DoctorLanguagesProps } from '../types';

	let { locale, links }: DoctorLanguagesProps = $props();

	const options = $derived({ locale });
	const title = $derived(doctorProfileSectionLabel('languages', locale));
	const titleId = useId(undefined, 'doctor-languages-title');
	const languages = useDoctorLanguages({ locale: () => locale });
	const headClass = 'mt-5 text-title-sm font-semibold text-foreground';
	const rowClass =
		'mt-1.5 flex min-h-row w-full flex-row items-center gap-3.5 py-1 text-start transition-opacity duration-standard ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-70';
	const mainClass = 'text-body-lg wrap-anywhere text-foreground';
	const underClass = 'mt-0.5 text-body-sm text-muted-foreground';
</script>

<!-- 🔴 Wave 5.2 · screen 82 «Γλώσσες και κοινωνικά δίκτυα» (U-211, D-W52-69 / 70; `64-switch/sw.js` `langsBody`, `sw.css`
     «.w-ab…», «.w-sprow»). Below 950 a page of its own with «‹» to «Το προφίλ μου» (U-102: never a window); from 950 the
     right column of 77, no «‹» (U-217). Two parts, each ONE row that opens its own page: «Γλώσσες που μιλάτε» — the
     names in one line over «2 γλώσσες», or «Καμία ακόμη» over the strong «Προσθέστε τις γλώσσες που μιλάτε» — and
     «Κοινωνικά δίκτυα» — each kept link one under the other, «Ιστοσελίδα · example.gr», over «2 από 4», or «Κανένα
     ακόμη» over the four names. 🔴 U-65.6: every word of the server is a text node; a kept link is WRITTEN, never an
     address this page opens. -->
<section
	aria-labelledby={titleId}
	data-testid="doctor-languages"
	data-view={languages.view}
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
			data-testid="doctor-languages-back"
			class="mb-2 split:hidden"
		/>
		<h2
			id={titleId}
			class="flex min-h-touch items-center text-heading-lg font-semibold text-foreground split:min-h-0 split:text-heading-md"
		>
			{title}
		</h2>
		<p data-testid="doctor-languages-lead" class="text-body-md text-muted-foreground">
			{m.doctor_languages_lead({}, options)}
		</p>

		{#if languages.view === 'failed'}
			<div class="mt-3">
				<InlineNotice
					variant="danger"
					message={m.doctor_dashboard_load_error({}, options)}
					actionLabel={m.doctor_dashboard_retry({}, options)}
					onAction={() => languages.retry()}
					testId="doctor-languages-error"
					actionTestId="doctor-languages-retry"
				/>
			</div>
		{:else if languages.view === 'loading'}
			<div
				data-testid="doctor-languages-loading"
				aria-busy="true"
				aria-label={title}
				class="mt-5 grid gap-3"
			>
				<Skeleton class="h-control-xs w-1/3 rounded-md" />
				<Skeleton class="h-row-lg w-full rounded-md" />
				<Skeleton class="h-control-xs w-1/3 rounded-md" />
				<Skeleton class="h-row-lg w-full rounded-md" />
			</div>
		{:else}
			<!-- The two pages, already resolved in the page's language (a module knows no route). -->
			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			<h3 class={headClass}>{m.doctor_languages_spoken_title({}, options)}</h3>
			<a
				href={links.spoken}
				data-testid="doctor-languages-spoken"
				data-missing={languages.summary === null ? '' : undefined}
				class={rowClass}
			>
				<span class="flex min-w-0 flex-1 flex-col">
					{#if languages.summary}
						<span data-testid="doctor-languages-names" class={mainClass}>
							{languages.summary.names}
						</span>
						<span data-testid="doctor-languages-count" class={underClass}>
							{languages.summary.count}
						</span>
					{:else}
						<span data-testid="doctor-languages-none" class={mainClass}>
							{m.doctor_languages_none({}, options)}
						</span>
						<span
							data-testid="doctor-languages-missing"
							class="mt-0.5 text-body-sm font-medium text-accent"
						>
							{m.doctor_my_profile_missing_languages({}, options)}
						</span>
					{/if}
				</span>
				<Ionicon name="chevron-forward" class="icon-md shrink-0 text-muted-foreground" />
			</a>

			<h3 class={headClass}>{m.doctor_links_title({}, options)}</h3>
			<a href={links.networks} data-testid="doctor-languages-networks" class={rowClass}>
				<span class="flex min-w-0 flex-1 flex-col">
					{#each languages.lines as line (line.field)}
						<span data-testid={`doctor-languages-link-${line.field}`} class={mainClass}>
							{line.label} ·
							<span data-slot="doctor-languages-link-value" class="text-muted-foreground"
								>{line.link}</span
							>
						</span>
					{:else}
						<span data-testid="doctor-languages-networks-none" class={mainClass}>
							{m.doctor_links_none({}, options)}
						</span>
					{/each}
					<span data-testid="doctor-languages-networks-count" class={underClass}>
						{languages.linksCountText ?? languages.linkNames}
					</span>
				</span>
				<Ionicon name="chevron-forward" class="icon-md shrink-0 text-muted-foreground" />
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		{/if}
	</div>
</section>
