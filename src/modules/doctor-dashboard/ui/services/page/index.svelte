<script lang="ts">
	import { tick } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import { useId } from '$shared/lib/headless';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { doctorProfileSectionLabel } from '$modules/doctor-dashboard/lib/profile';
	import Row from '../components/row.svelte';
	import { useDoctorServiceDrag, useDoctorServices } from '../hooks';
	import type { DoctorServicesProps } from '../types';

	let { locale, links }: DoctorServicesProps = $props();

	const options = $derived({ locale });
	const title = $derived(doctorProfileSectionLabel('services', locale));
	const titleId = useId(undefined, 'doctor-services-title');
	const hintId = useId(undefined, 'doctor-services-hint');
	const services = useDoctorServices({ locale: () => locale });
	const drag = useDoctorServiceDrag({
		ids: () => services.rows.map((row) => row.id),
		onDrop: (ids, movedId) => services.order(ids, movedId)
	});

	// While a service is dragged the rows stand in the order it would leave; otherwise in the stored one.
	const shown = $derived.by(() => {
		const order = drag.order;
		if (!order) return services.rows;
		return order.flatMap((id) => services.rows.find((row) => row.id === id) ?? []);
	});
	const WAIT_ROWS = [0, 1, 2];

	let list = $state<HTMLUListElement | null>(null);

	/** The service takes its new place and keeps the focus there (a moved node loses it), so the arrows go on. */
	async function moveTo(id: string, index: number) {
		services.move(id, index);
		await tick();
		list
			?.querySelector<HTMLElement>(`[data-service-id="${id}"] [data-slot="doctor-service-handle"]`)
			?.focus();
	}
</script>

<!-- 🔴 Wave 5.2 · screen 83 «Υπηρεσίες και τιμές» (U-212, D-W52-81; `64-switch/sw.js` `usBody`): what patients book.
     Below 950 a page of its own with «‹» to «Το προφίλ μου» (U-102: never a window); from 950 the right column of 77, no
     «‹» (U-217). Every service a row «τίτλος» over «30′ · 60 €» in the DOCTOR's order — dragged, or moved with ↑ / ↓
     (D-W52-39's way), one `PUT …/order` when it is let go — each a link to its own page; «Προσθήκη υπηρεσίας» opens the
     catalogue of the specialty. At the end how a price changes for ONE patient (Ε2 Α: on the appointment, screen 70). No
     colour under the pointer (U-100); every word of the server a text node (U-65.6). -->
<section
	aria-labelledby={titleId}
	data-testid="doctor-services"
	data-view={services.view}
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
			data-testid="doctor-services-back"
			class="mb-2 split:hidden"
		/>
		<h2
			id={titleId}
			class="flex min-h-touch items-center text-heading-lg font-semibold text-foreground split:min-h-0 split:text-heading-md"
		>
			{title}
		</h2>
		<p data-testid="doctor-services-lead" class="text-body-md text-muted-foreground">
			{m.doctor_my_services_lead({}, options)}
		</p>

		{#if services.view === 'failed'}
			<div class="mt-3">
				<InlineNotice
					variant="danger"
					message={m.doctor_dashboard_load_error({}, options)}
					actionLabel={m.doctor_dashboard_retry({}, options)}
					onAction={() => services.reload()}
					testId="doctor-services-error"
					actionTestId="doctor-services-retry"
				/>
			</div>
		{:else if services.view === 'loading'}
			<div
				data-testid="doctor-services-loading"
				aria-busy="true"
				aria-label={title}
				class="mt-4 grid gap-3"
			>
				{#each WAIT_ROWS as row (row)}
					<div aria-hidden="true">
						<Skeleton class="h-row-lg w-full rounded-md" />
					</div>
				{/each}
			</div>
		{:else}
			<ul
				bind:this={list}
				use:drag.guard
				aria-labelledby={titleId}
				data-slot="doctor-services-list"
				data-testid="doctor-services-list"
				class="mt-3 flex flex-col"
			>
				{#each shown as row, index (row.id)}
					<Row
						{row}
						{index}
						count={shown.length}
						href={links.service(row.id)}
						{hintId}
						{drag}
						onMove={(target) => void moveTo(row.id, target)}
					/>
				{/each}
			</ul>
			<!-- «Νέα υπηρεσία», already resolved in the page's language (a module knows no route). -->
			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			{#if !services.complete}
				<a
					href={links.catalogue}
					data-testid="doctor-services-add"
					class="mt-1 inline-flex min-h-touch min-w-touch flex-row items-center gap-1.5 text-body-md font-semibold text-foreground transition-opacity duration-standard ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-70"
				>
					<Ionicon name="add" class="icon-md" />
					{m.doctor_my_services_add({}, options)}
				</a>
			{/if}
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
			{#if services.orderFailure}
				<div class="mt-3">
					<InlineNotice
						variant="danger"
						message={services.orderFailure}
						testId="doctor-services-order-failure"
					/>
				</div>
			{/if}
			<p
				id={hintId}
				data-testid="doctor-services-hint"
				class="mt-3 text-body-sm text-muted-foreground"
			>
				<!-- U-81.2: below 744 the order changes as in the application (a long press); from 744 with a drag. -->
				<span class="tablet:hidden">{m.doctor_my_services_hint_hold({}, options)}</span>
				<span class="hidden tablet:inline">{m.doctor_my_services_hint_drag({}, options)}</span>
				{m.doctor_my_services_hint_first({}, options)}
			</p>
			<p
				data-testid="doctor-services-foot"
				class="mt-4 border-t border-line pt-4 text-body-sm text-muted-foreground"
			>
				{m.doctor_my_services_foot({}, options)}
			</p>
		{/if}
		<p data-testid="doctor-services-live" aria-live="polite" class="sr-only">
			{services.announcement}
		</p>
	</div>
</section>
