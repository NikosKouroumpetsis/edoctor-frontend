<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';
	import { m } from '$paraglide/messages.js';
	import { useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import type { SignInRequest } from '$shared/state/session';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { ExpandableText } from '$shared/ui/molecules/expandable-text';
	import { StatCard } from '$shared/ui/molecules/stat-card';
	import { Button } from '$shared/ui/primitives/button';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { ModalScreenSurface } from '$shared/ui/templates/modal-screen';
	import type { DoctorPricedService } from '$modules/doctor/lib/detail';
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
	const stacked = $derived(section === 'specializations' && current?.fromServices === true);
	const titleId = useId(undefined, 'doctor-services-title');

	// It keeps what it shows through its way out, and which way the last page came in.
	let view = $state<View>(
		untrack(() => (section === 'specializations' ? 'specializations' : 'services'))
	);
	let moved = $state<'forward' | 'back' | null>(null);
	$effect.pre(() => {
		const next = section;
		if (next !== 'services' && next !== 'specializations') return;
		untrack(() => {
			if (next === view) return;
			moved = next === 'specializations' ? 'forward' : 'back';
			view = next;
		});
	});

	let scroller = $state<HTMLElement | null>(null);
	let heading = $state<HTMLElement | null>(null);
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

	// The page that came in by a press starts from its top, and the keyboard goes on from its title.
	$effect(() => {
		void view;
		if (!untrack(() => moved)) return;
		void tick().then(() => {
			scroller?.scrollTo?.({ top: 0 });
			heading?.focus();
		});
	});

	// The component stays through a close (its leave motion): the next opening starts as a new window.
	$effect(() => {
		if (open) return;
		untrack(() => {
			opened.clear();
			stuck = false;
			moved = null;
		});
	});
</script>

{#snippet description(service: DoctorPricedService, readMoreLabel: string, testIdPrefix: string)}
	{#if service.descriptionBody}
		<ExpandableText
			text={service.descriptionBody}
			moreLabel={readMoreLabel}
			chevron
			textClass="text-body-sm text-foreground/88 tablet:text-body-lg"
			buttonClass="mt-1"
			buttonTextClass="tablet:text-body-lg"
			testId={`${testIdPrefix}-description-${service.id}`}
		/>
	{/if}
{/snippet}

{#snippet book(service: DoctorPricedService, label: string, testIdPrefix: string)}
	<Button
		tone="contrast"
		radius="full"
		{label}
		onclick={() => detail.bookService(service.id)}
		data-testid={`${testIdPrefix}-book-${service.id}`}
		class="-ml-control-sm self-stretch tablet:ml-0 tablet:self-start"
	>
		{#snippet leading()}
			<Ionicon name="calendar-outline" class="icon-md shrink-0 text-secondary-foreground" />
		{/snippet}
	</Button>
{/snippet}

{#snippet serviceBody(service: DoctorPricedService)}
	{#if services}
		<div class="flex flex-col gap-4 pb-6 pl-control-sm">
			{#if service.descriptionBody}
				<div>
					<h4 class="text-body-sm font-semibold text-foreground">{services.descriptionLabel}</h4>
					<div class="mt-1">
						{@render description(service, services.readMoreLabel, 'doctor-detail-priced-service')}
					</div>
				</div>
			{/if}
			{@render book(service, services.bookLabel, 'doctor-detail-priced-service')}
		</div>
	{/if}
{/snippet}

<!-- 🔴 U-70, U-72 (screens 14, 15), one window: below 744 the application's sheet with its large title (U-66 Ε3) and the
     grey «×»; from 744 Airbnb's window, 780 / 664, the «×» alone over a bar that whitens as the list scrolls. «Υπηρεσίες»
     (Π4 the groups, Π5 a row opens in place) and, in the SAME window, never one over the other, «Τομείς εξειδίκευσης»
     from its group's title (U-72.3 Ε3), «‹» bringing it back. No search (U-70.1). Every word of a doctor is text
     (U-65.6). -->
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
		{#if stacked}
			<IconButton
				icon="chevron-back"
				appearance="tint"
				surface="soft"
				size="sm"
				iconSize="md"
				aria-label={m.doctor_specializations_back({}, options)}
				data-testid="doctor-detail-modal-back"
				onclick={() => detail.backToServices()}
				class="absolute top-2 left-4 tablet:top-3"
			/>
		{/if}
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
		{#key view}
			<div
				class={cn(
					moved === 'forward' && 'animate-window-forward',
					moved === 'back' && 'animate-window-back'
				)}
			>
				{#if view === 'services' && services}
					<div data-testid="doctor-detail-modal-services">
						<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
						<h2
							bind:this={heading}
							id={titleId}
							tabindex={-1}
							class="text-display-sm font-semibold wrap-anywhere text-foreground outline-none tablet:text-heading-lg"
						>
							{services.title}
						</h2>
						<p class="mt-2 text-body-sm text-muted-foreground">{services.notice}</p>
						{#each services.groups as group (group.id)}
							<section
								data-testid={`doctor-detail-modal-services-${group.id}`}
								class={cn(group.title ? 'pt-6 not-first-of-type:pt-results-row-gap' : 'pt-2')}
							>
								{#if group.id === 'specializations' && group.title}
									<h3 class="text-title-sm font-semibold text-foreground">
										<a
											href={detail.detailsHref('specializations')}
											onclick={(event) => detail.openSpecializations(event)}
											data-testid="doctor-detail-modal-services-to-specializations"
											class="group -my-3 inline-flex min-h-touch min-w-touch items-center gap-1 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 can-hover:hover:underline"
										>
											{group.title}
											<Ionicon
												name="chevron-forward"
												class="icon-md shrink-0 transition-transform duration-standard ease-standard can-hover:group-hover:translate-x-0.5"
											/>
										</a>
									</h3>
								{:else if group.title}
									<h3 class="mb-1 text-title-sm font-semibold text-foreground">{group.title}</h3>
								{/if}
								<div>
									{#each group.services as service (service.id)}
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
								</div>
							</section>
						{/each}
					</div>
				{:else if view === 'specializations' && specializations}
					<div data-testid="doctor-detail-modal-specializations">
						<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
						<h2
							bind:this={heading}
							id={titleId}
							tabindex={-1}
							class="text-display-sm font-semibold wrap-anywhere text-foreground outline-none tablet:text-heading-lg"
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
						<div class="mt-2">
							{#each specializations.domains as domain (domain.id)}
								<article
									data-service-slot={domain.id}
									data-focused={domain.id === focusId || undefined}
									data-testid={`doctor-detail-specializations-domain-${domain.id}`}
									class="scroll-mt-bar-top border-b border-border/60 py-section last:border-b-0 last:pb-2"
								>
									<ServiceRow
										service={domain}
										{onSignIn}
										size="lg"
										titleAs="h3"
										testIdPrefix="doctor-detail-specializations-head"
										class="*:min-h-0 *:py-0"
									/>
									<div class="mt-4 flex flex-col gap-4 pl-control-sm">
										{#if domain.years || domain.visits}
											<ul
												class="flex flex-col gap-2 tablet:flex-row tablet:flex-wrap tablet:gap-x-6"
											>
												{#if domain.years}
													<li
														data-testid={`doctor-detail-specializations-years-${domain.id}`}
														class="flex flex-row items-start gap-2 text-body-md text-foreground"
													>
														<Ionicon
															name="ribbon-outline"
															class="icon-md shrink-0 text-muted-foreground"
														/>
														<span>
															<span class="font-semibold tabular-nums">{domain.years.value}</span>
															{domain.years.label}
														</span>
													</li>
												{/if}
												{#if domain.visits}
													<li
														data-testid={`doctor-detail-specializations-visits-${domain.id}`}
														class="flex flex-row items-start gap-2 text-body-md text-foreground"
													>
														<Ionicon
															name="people-outline"
															class="icon-md shrink-0 text-muted-foreground"
														/>
														<span>
															<span class="font-semibold tabular-nums">{domain.visits.value}</span>
															{domain.visits.label}
														</span>
													</li>
												{/if}
											</ul>
										{/if}
										{@render description(
											domain,
											specializations.readMoreLabel,
											'doctor-detail-specializations'
										)}
										{@render book(
											domain,
											specializations.bookLabel,
											'doctor-detail-specializations'
										)}
									</div>
								</article>
							{/each}
						</div>
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
		{/key}
	</div>
</ModalScreenSurface>
