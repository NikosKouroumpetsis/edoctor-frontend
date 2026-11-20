<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { useId } from '$shared/lib/headless';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { ListRow } from '$shared/ui/molecules/list-row';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { doctorProfileSectionLabel } from '$modules/doctor-dashboard/lib/profile';
	import { useDoctorCv } from '../hooks';
	import type { DoctorCvProps } from '../types';

	let { locale, links }: DoctorCvProps = $props();

	const options = $derived({ locale });
	const title = $derived(doctorProfileSectionLabel('cv', locale));
	const titleId = useId(undefined, 'doctor-cv-title');
	const cv = useDoctorCv({ locale: () => locale });
	const headClass = 'mt-5 text-title-sm font-semibold text-foreground';
</script>

<!-- 🔴 Wave 5.2 · screen 81 «Βιογραφικό» (U-210, D-W52-63; `64-switch/sw.js` `cvBody`, `sw.css` «.w-cv…»). Below 950 a
     page of its own with «‹» to «Το προφίλ μου» (U-102: never a window); from 950 the right column of 77, no «‹»
     (U-217). ALWAYS the three groups — «Σπουδές · Εμπειρία · Συνέδρια» — each with its rows one under the other in the
     SERVER's order (what the doctor does today first, then the newest: nothing is dragged), a row its title over «φορέας
     · 2013 – 2015» and a link to its own page; an empty group says «Καμία ακόμη.» / «Κανένα ακόμη.». Under each group
     «Προσθήκη», a link to the page of a new row — at twenty «Έως 20.» in its place. No choice of a language (U-207.3:
     the doctor writes Greek). 🔴 U-65.6: every word of the server is a text node, never HTML. -->
<section
	aria-labelledby={titleId}
	data-testid="doctor-cv"
	data-view={cv.view}
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
			data-testid="doctor-cv-back"
			class="mb-2 split:hidden"
		/>
		<h2
			id={titleId}
			class="flex min-h-touch items-center text-heading-lg font-semibold text-foreground split:min-h-0 split:text-heading-md"
		>
			{title}
		</h2>
		<p data-testid="doctor-cv-lead" class="text-body-md text-muted-foreground">
			{m.doctor_cv_lead({}, options)}
		</p>

		{#if cv.view === 'failed'}
			<div class="mt-3">
				<InlineNotice
					variant="danger"
					message={m.doctor_dashboard_load_error({}, options)}
					actionLabel={m.doctor_dashboard_retry({}, options)}
					onAction={() => cv.retry()}
					testId="doctor-cv-error"
					actionTestId="doctor-cv-retry"
				/>
			</div>
		{:else if cv.view === 'loading'}
			<div
				data-testid="doctor-cv-loading"
				aria-busy="true"
				aria-label={title}
				class="mt-5 grid gap-3"
			>
				<Skeleton class="h-control-xs w-1/3 rounded-md" />
				<Skeleton class="h-row-lg w-full rounded-md" />
				<Skeleton class="h-row-lg w-full rounded-md" />
			</div>
		{:else}
			{#each cv.groups as group (group.kind)}
				{@const slug = group.kind.toLowerCase()}
				{@const headId = `${titleId}-${slug}`}
				<h3 id={headId} class={headClass}>{group.label}</h3>
				{#if group.rows.length > 0}
					<ul aria-labelledby={headId} data-testid={`doctor-cv-rows-${slug}`} class="flex flex-col">
						{#each group.rows as row (row.id)}
							<li>
								<ListRow
									title={row.title}
									subtitle={row.detail ?? undefined}
									href={links.item(group.kind, row.id)}
									testId={`doctor-cv-row-${row.id}`}
								/>
							</li>
						{/each}
					</ul>
				{:else}
					<p
						data-testid={`doctor-cv-none-${slug}`}
						class="mt-1.5 text-body-md text-muted-foreground"
					>
						{group.none}
					</p>
				{/if}
				{#if group.full}
					<p
						data-testid={`doctor-cv-limit-${slug}`}
						class="mt-1 text-body-sm text-muted-foreground"
					>
						{cv.limitText}
					</p>
				{:else}
					<!-- The page of a new row, already resolved in the page's language (a module knows no route). -->
					<!-- eslint-disable svelte/no-navigation-without-resolve -->
					<a
						href={links.item(group.kind, null)}
						aria-describedby={headId}
						data-testid={`doctor-cv-add-${slug}`}
						class="inline-flex min-h-touch min-w-touch flex-row items-center gap-1.5 text-body-md font-semibold text-foreground transition-opacity duration-standard ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-70"
					>
						<Ionicon name="add" class="icon-md" />
						{m.doctor_photos_add({}, options)}
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				{/if}
			{/each}
		{/if}
	</div>
</section>
