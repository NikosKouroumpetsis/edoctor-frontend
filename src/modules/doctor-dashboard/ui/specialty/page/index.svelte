<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { useId } from '$shared/lib/headless';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { DOCTOR_SPECIALIZATION_LIMIT } from '$modules/doctor-dashboard/config';
	import { doctorProfileSectionLabel } from '$modules/doctor-dashboard/lib/profile';
	import { useDoctorSpecialty } from '../hooks';
	import type { DoctorSpecialtyProps } from '../types';

	let { locale, links }: DoctorSpecialtyProps = $props();

	const options = $derived({ locale });
	const title = $derived(doctorProfileSectionLabel('specialty', locale));
	const titleId = useId(undefined, 'doctor-specialty-title');
	const specialty = useDoctorSpecialty({ locale: () => locale });
	const headClass = 'mt-5 text-title-sm font-semibold text-foreground';
	const factClass = 'mt-1.5 text-title-xs font-normal wrap-anywhere text-foreground';
	const noteClass = 'mt-2 flex flex-row items-start gap-1.5 text-body-sm text-muted-foreground';
</script>

<!-- 🔴 Wave 5.2 · screen 80 «Ειδικότητα και εξειδικεύσεις» (U-209, U-225, D-W52-59; `64-switch/sw.js` `specBody`, `sw.css`
     «.w-ab…», «.w-sprow»). Below 950 a page of its own with «‹» to «Το προφίλ μου» (U-102: never a window); from 950 the
     right column of 77, no «‹» (U-217). The specialty and the practice licence are READ ONLY — under them, once the
     server says the first licence locked them (D-W52-51), the lock and why; a licence without a number says who fills it
     in. «Εξειδικεύσεις» is ONE row that opens the page of the choice: the doctor's picks one under the other — a title
     the team still checks says «Ελέγχεται», one it refused «Δεν εγκρίθηκε» (U-225) — and «N από 3», or «Καμία ακόμη ·
     Διαλέξτε έως 3». A specialty without a list has no such row at all. 🔴 U-65.6: every word of the server is a text
     node, never HTML. -->
<section
	aria-labelledby={titleId}
	data-testid="doctor-specialty"
	data-view={specialty.view}
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
			data-testid="doctor-specialty-back"
			class="mb-2 split:hidden"
		/>
		<h2
			id={titleId}
			class="flex min-h-touch items-center text-heading-lg font-semibold text-foreground split:min-h-0 split:text-heading-md"
		>
			{title}
		</h2>
		<p data-testid="doctor-specialty-lead" class="text-body-md text-muted-foreground">
			{m.doctor_my_specialty_lead({}, options)}
		</p>

		{#if specialty.view === 'failed'}
			<div class="mt-3">
				<InlineNotice
					variant="danger"
					message={m.doctor_dashboard_load_error({}, options)}
					actionLabel={m.doctor_dashboard_retry({}, options)}
					onAction={() => specialty.retry()}
					testId="doctor-specialty-error"
					actionTestId="doctor-specialty-retry"
				/>
			</div>
		{:else if specialty.view === 'loading'}
			<div
				data-testid="doctor-specialty-loading"
				aria-busy="true"
				aria-label={title}
				class="mt-5 grid gap-3"
			>
				<Skeleton class="h-control-xs w-1/3 rounded-md" />
				<Skeleton class="h-control-md w-full rounded-md" />
				<Skeleton class="h-row-lg w-full rounded-md" />
			</div>
		{:else}
			<h3 class={headClass}>{m.doctor_my_specialty_specialty({}, options)}</h3>
			{#if specialty.specialty}
				<p data-testid="doctor-specialty-name" class={factClass}>{specialty.specialty}</p>
			{/if}

			<h3 class={headClass}>{m.doctor_my_specialty_licence({}, options)}</h3>
			{#if specialty.licenceLine}
				<p data-testid="doctor-specialty-licence" class={factClass}>{specialty.licenceLine}</p>
			{/if}
			{#if specialty.licenceNumberMissing}
				<p data-testid="doctor-specialty-licence-missing" class={noteClass}>
					{m.doctor_my_specialty_licence_number_missing({}, options)}
				</p>
			{/if}
			{#if specialty.locked}
				<p data-testid="doctor-specialty-locked" class={noteClass}>
					<Ionicon name="lock-closed-outline" class="mt-0.5 icon-sm shrink-0" />
					<span>{m.doctor_my_specialty_locked({}, options)}</span>
				</p>
			{/if}

			{#if specialty.hasCatalogue}
				<h3 class={headClass}>{m.doctor_my_specializations_title({}, options)}</h3>
				<!-- The page of the choice, already resolved in the page's language (a module knows no route). -->
				<!-- eslint-disable svelte/no-navigation-without-resolve -->
				<a
					href={links.specializations}
					data-testid="doctor-specialty-specializations"
					data-missing={specialty.lines.length === 0 ? '' : undefined}
					class="mt-1.5 flex min-h-row w-full flex-row items-center gap-3.5 py-1 text-start transition-opacity duration-standard ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-70"
				>
					<span class="flex min-w-0 flex-1 flex-col">
						{#each specialty.lines as line (line.code)}
							<span
								data-testid={`doctor-specialty-pick-${line.code}`}
								class="flex flex-row flex-wrap items-baseline gap-x-2 text-body-lg wrap-anywhere text-foreground"
							>
								<span>{line.name}</span>
								{#if line.note}
									<span
										data-slot="doctor-specialty-pick-note"
										class={[
											'text-body-sm',
											line.rejected ? 'font-medium text-accent' : 'text-muted-foreground'
										]}>{line.note}</span
									>
								{/if}
							</span>
						{:else}
							<span data-testid="doctor-specialty-none" class="text-body-lg text-foreground">
								{m.doctor_my_specializations_none({}, options)}
							</span>
						{/each}
						{#if specialty.countText}
							<span
								data-testid="doctor-specialty-count"
								class="mt-0.5 text-body-sm text-muted-foreground"
							>
								{specialty.countText}
							</span>
						{:else}
							<span
								data-testid="doctor-specialty-up-to"
								class="mt-0.5 text-body-sm font-medium text-accent"
							>
								{m.doctor_my_specializations_up_to({ limit: DOCTOR_SPECIALIZATION_LIMIT }, options)}
							</span>
						{/if}
					</span>
					<Ionicon name="chevron-forward" class="icon-md shrink-0 text-muted-foreground" />
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			{/if}
		{/if}
	</div>
</section>
