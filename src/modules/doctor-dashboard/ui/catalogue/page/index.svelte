<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { ListRow } from '$shared/ui/molecules/list-row';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { StepScreen } from '$shared/ui/templates/step-screen';
	import { useDoctorServiceCatalogue } from '../hooks';
	import type { DoctorServiceCatalogueProps } from '../types';

	let { locale, servicesHref, item, onClose }: DoctorServiceCatalogueProps = $props();

	const options = $derived({ locale });
	const catalogue = useDoctorServiceCatalogue({ locale: () => locale });
	const title = $derived(m.doctor_my_services_new_title({}, options));
</script>

<!-- 🔴 Wave 5.2 · screen 83 «Νέα υπηρεσία» (U-212.1, D-W52-81; `64-switch/sw.js` `usPickPage`): a PAGE, never a window
     (U-102) — below 950 alone with «‹» to screen 83 (pushed over the tabs below 744), from 950 in the middle of the right
     column of 77, no «‹» (U-217). ONLY the catalogue of the specialty, without the services the doctor already offers,
     one under the other (U-112), each «Συνήθως 20′» and a link to the page of the new one; none left ⇒ «Έχετε ήδη όλες τις
     υπηρεσίες της ειδικότητάς σας.». Every name is the server's (U-122), every word a text node (U-65.6). -->
<StepScreen
	{title}
	subtitle={m.doctor_my_services_new_lead({}, options)}
	backHref={servicesHref}
	onBack={() => {}}
	backLabel={m.doctor_my_profile_back({}, options)}
	backIcon="chevron-back"
	placement="menu"
	besideList
	cancelLabel={null}
	saveLabel={m.doctor_my_profile_back({}, options)}
	onSave={onClose}
	onCancel={onClose}
	bar={false}
	testId="doctor-service-catalogue"
	backTestId="doctor-service-catalogue-back"
>
	{#if catalogue.view === 'failed'}
		<InlineNotice
			variant="danger"
			message={m.doctor_dashboard_load_error({}, options)}
			actionLabel={m.doctor_dashboard_retry({}, options)}
			onAction={() => catalogue.retry()}
			testId="doctor-service-catalogue-error"
			actionTestId="doctor-service-catalogue-retry"
		/>
	{:else if catalogue.view === 'loading'}
		<div
			data-testid="doctor-service-catalogue-loading"
			aria-busy="true"
			aria-label={title}
			class="grid gap-3"
		>
			<Skeleton class="h-row-lg w-full rounded-md" />
			<Skeleton class="h-row-lg w-full rounded-md" />
		</div>
	{:else if catalogue.rows.length === 0}
		<p data-testid="doctor-service-catalogue-none" class="text-body-md text-muted-foreground">
			{m.doctor_my_services_none_left({}, options)}
		</p>
	{:else}
		<ul data-testid="doctor-service-catalogue-rows" class="flex flex-col">
			{#each catalogue.rows as row (row.serviceId)}
				<li>
					<ListRow
						title={row.title}
						subtitle={row.usually}
						href={item(row.serviceId)}
						testId={`doctor-service-option-${row.serviceId}`}
					/>
				</li>
			{/each}
		</ul>
	{/if}
</StepScreen>
