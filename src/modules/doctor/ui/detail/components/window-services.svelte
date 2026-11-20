<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { m } from '$paraglide/messages.js';
	import { useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { ListRow } from '$shared/ui/molecules/list-row';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import type { SignInRequest } from '$shared/state/session';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { ExpandableText } from '$shared/ui/molecules/expandable-text';
	import { StatCard } from '$shared/ui/molecules/stat-card';
	import { Button } from '$shared/ui/primitives/button';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { ModalScreenSurface } from '$shared/ui/templates/modal-screen';
	import type { DoctorServicesPageRow } from '$modules/doctor/lib/detail';
	import type { DoctorDetailState } from '../hooks/use-state.svelte';
	import ServiceRow from './service-row.svelte';

	let {
		detail,
		locale,
		onSignIn
	}: {
		detail: DoctorDetailState;
		locale: SupportedLocale;
		onSignIn: (request?: SignInRequest) => void;
	} = $props();

	type View = 'services' | 'specializations';

	const options = $derived({ locale });
	const current = $derived(detail.window);
	const section = $derived(current?.section);
	const services = $derived(detail.servicesPage);
	const specializations = $derived(detail.specializationsPage);
	const open = $derived(
		(section === 'services' && Boolean(services)) ||
			(section === 'specializations' && Boolean(specializations))
	);
	const focusId = $derived(open ? current?.hints.focus : undefined);
	const titleId = useId(undefined, 'doctor-services-title');

	// It keeps what it shows through its way out.
	let view = $state<View>(
		untrack(() => (section === 'specializations' ? 'specializations' : 'services'))
	);
	$effect.pre(() => {
		const next = section;
		if (next !== 'services' && next !== 'specializations') return;
		untrack(() => {
			if (next !== view) view = next;
		});
	});

	let scroller = $state<HTMLElement | null>(null);
	let stuck = $state(false);
	const opened = new SvelteSet<string>();

	const isOpen = (id: string) => opened.has(id) || services?.soloId === id;
	function toggle(id: string) {
		if (opened.has(id)) opened.delete(id);
		else opened.add(id);
	}

	// A way in that names a row opens it, and goes to it once it is drawn; the rest of the list stays as it was.
	$effect(() => {
		const id = focusId;
		const root = scroller;
		if (!id || !root) return;
		if (section === 'services') untrack(() => opened.add(id));
		void tick().then(() =>
			root
				.querySelector<HTMLElement>(`[data-service-slot="${CSS.escape(id)}"]`)
				?.scrollIntoView({ block: 'center' })
		);
	});

	// The component stays through a close (its leave motion): the next opening starts as a new window.
	$effect(() => {
		if (open) return;
		untrack(() => {
			opened.clear();
			stuck = false;
		});
	});
</script>

<!-- 🔴 D-W52-60 (U-209.3): a service's own years and visits stay WITH the service — drawn in its open row, each only
     with a number above zero (they stood on the fields of expertise while those were services). -->
{#snippet figures(service: DoctorServicesPageRow)}
	{#if service.years || service.visits}
		<ul class="flex flex-col gap-2 tablet:flex-row tablet:flex-wrap tablet:gap-x-6">
			{#if service.years}
				<li
					data-testid={`doctor-detail-priced-service-years-${service.id}`}
					class="flex flex-row items-start gap-2 text-body-md text-foreground"
				>
					<Ionicon name="ribbon-outline" class="icon-md shrink-0 text-muted-foreground" />
					<span>
						<span class="font-semibold tabular-nums">{service.years.value}</span>
						{service.years.label}
					</span>
				</li>
			{/if}
			{#if service.visits}
				<li
					data-testid={`doctor-detail-priced-service-visits-${service.id}`}
					class="flex flex-row items-start gap-2 text-body-md text-foreground"
				>
					<Ionicon name="people-outline" class="icon-md shrink-0 text-muted-foreground" />
					<span>
						<span class="font-semibold tabular-nums">{service.visits.value}</span>
						{service.visits.label}
					</span>
				</li>
			{/if}
		</ul>
	{/if}
{/snippet}

{#snippet serviceBody(service: DoctorServicesPageRow)}
	{#if services}
		<div class="flex flex-col gap-4 pb-6 pl-control-sm">
			{@render figures(service)}
			{#if service.descriptionBody}
				<div>
					<h4 class="text-body-sm font-semibold text-foreground">{services.descriptionLabel}</h4>
					<div class="mt-1">
						<ExpandableText
							text={service.descriptionBody}
							moreLabel={services.readMoreLabel}
							chevron
							textClass="text-body-sm text-foreground/88 tablet:text-body-lg"
							buttonClass="mt-1"
							buttonTextClass="tablet:text-body-lg"
							testId={`doctor-detail-priced-service-description-${service.id}`}
						/>
					</div>
				</div>
			{/if}
			<Button
				tone="contrast"
				radius="full"
				label={services.bookLabel}
				onclick={() => detail.bookService(service.id)}
				data-testid={`doctor-detail-priced-service-book-${service.id}`}
				class="-ml-control-sm self-stretch tablet:ml-0 tablet:self-start"
			>
				{#snippet leading()}
					<Ionicon name="calendar-outline" class="icon-md shrink-0 text-secondary-foreground" />
				{/snippet}
			</Button>
		</div>
	{/if}
{/snippet}

<!-- 🔴 U-70, U-72 (screens 14, 15), one window: below 744 the application's sheet with its large title (U-66 Ε3) and the
     grey «×»; from 744 Airbnb's window, 780 / 664, the «×» alone over a bar that whitens as the list scrolls. «Υπηρεσίες»
     (Π5 a row opens in place; 🔴 D-W52-60: ONE list, each service with its own years and visits, no groups and no way to
     the fields of expertise — it replaces Π4's groups and U-72.3 Ε3) or «Τομείς εξειδίκευσης» (🔴 D-W52-60, U-209.3: the
     card's figures and the specializations the doctor picked from the closed list, by name — never services). No search
     (U-70.1). Every word of a doctor, and every name of the server, is text (U-65.6). -->
<ModalScreenSurface
	{open}
	shape="sheet"
	tone="card"
	onDismiss={() => detail.closeWindow()}
	aria-labelledby={titleId}
	data-testid="doctor-detail-modal"
	data-section={view}
	class="tablet:max-w-window-fluid"
>
	<div
		data-slot="doctor-services-bar"
		class={cn(
			'relative z-10 h-control-lg shrink-0 transition-colors duration-label ease-standard tablet:absolute tablet:inset-x-0 tablet:top-0 tablet:h-bar-top',
			stuck && 'border-b border-border/60 tablet:bg-card'
		)}
	>
		<IconButton
			icon="close"
			appearance="tint"
			surface="soft"
			size="sm"
			iconSize="md"
			aria-label={m.doctor_window_close({}, options)}
			data-testid="doctor-detail-modal-close"
			onclick={() => detail.closeWindow()}
			class="absolute top-2 right-4 tablet:top-3"
		/>
	</div>
	<div
		bind:this={scroller}
		onscroll={(event) => (stuck = event.currentTarget.scrollTop > 0)}
		class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-gutter-sm pt-2 pb-section-lg tablet:pt-bar-top tablet:pb-section"
	>
		{#if view === 'services' && services}
			<div data-testid="doctor-detail-modal-services">
				<h2
					id={titleId}
					class="text-display-sm font-semibold wrap-anywhere text-foreground tablet:text-heading-lg"
				>
					{services.title}
				</h2>
				<p class="mt-2 text-body-sm text-muted-foreground">{services.notice}</p>
				<section data-testid="doctor-detail-modal-services-all" class="pt-2">
					{#each services.services as service (service.id)}
						<div
							data-service-slot={service.id}
							data-focused={service.id === focusId || undefined}
							class="scroll-mt-6 border-b border-border/60 last:border-b-0"
						>
							<ServiceRow
								{service}
								{onSignIn}
								expanded={isOpen(service.id)}
								onToggle={() => toggle(service.id)}
							>
								{#snippet body()}
									{@render serviceBody(service)}
								{/snippet}
							</ServiceRow>
						</div>
					{/each}
				</section>
				{#if services.footnote}
					<p
						data-testid="doctor-detail-services-footnote"
						class="mt-6 border-t border-border/60 pt-5 text-label-lg font-normal text-muted-foreground"
					>
						{services.footnote}
					</p>
				{/if}
			</div>
		{:else if view === 'specializations' && specializations}
			<div data-testid="doctor-detail-modal-specializations">
				<h2
					id={titleId}
					class="text-display-sm font-semibold wrap-anywhere text-foreground tablet:text-heading-lg"
				>
					{specializations.title}
				</h2>
				{#if specializations.stats.length > 0}
					<StatCard
						cells={specializations.stats}
						label={specializations.statsLabel}
						testId="doctor-detail-specializations-stats"
						class="mt-6"
					/>
				{/if}
				<ul data-testid="doctor-detail-specializations-domains" class="mt-2 flex flex-col">
					{#each specializations.domains as domain (domain.id)}
						<li
							data-testid={`doctor-detail-specializations-domain-${domain.id}`}
							class="border-b border-border/60 last:border-b-0"
						>
							<ListRow title={domain.title}>
								{#snippet leading()}
									<Ionicon name="ribbon-outline" class="icon-lg" />
								{/snippet}
							</ListRow>
						</li>
					{/each}
				</ul>
				{#if specializations.footnote}
					<p
						data-testid="doctor-detail-specializations-footnote"
						class="mt-6 border-t border-border/60 pt-5 text-label-lg font-normal text-muted-foreground"
					>
						{specializations.footnote}
					</p>
				{/if}
			</div>
		{/if}
	</div>
</ModalScreenSurface>
