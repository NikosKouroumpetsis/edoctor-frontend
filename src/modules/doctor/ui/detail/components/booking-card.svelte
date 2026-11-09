<script lang="ts">
	import type { SignInRequest } from '$shared/state/session';
	import type { ResolvedPathname } from '$app/types';
	import { m } from '$paraglide/messages.js';
	import { cn } from '$shared/lib/utils';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { SkeletonLines } from '$shared/ui/molecules/skeleton-lines';
	import { Button } from '$shared/ui/primitives/button';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuRadioGroup,
		DropdownMenuRadioItem,
		DropdownMenuTrigger
	} from '$shared/ui/primitives/dropdown-menu';
	import type {
		DoctorAvailabilityOfficeTab,
		DoctorBookingAction,
		DoctorBookingContent
	} from '$modules/doctor/lib/detail';
	import {
		AvailabilityElsewhere as Elsewhere,
		doctorBookingActionGlyphs,
		OfficeTabs
	} from '$modules/doctor/ui/availability-picker';
	import Fee from './fee.svelte';

	let {
		booking,
		tabs,
		activeOfficeId,
		services,
		serviceId,
		locale,
		availabilityHref,
		onOpenAvailability,
		onChooseService,
		onSelectOffice,
		onBook,
		onSignIn,
		onRetry,
		ref = $bindable(null)
	}: {
		booking: DoctorBookingContent;
		tabs: DoctorAvailabilityOfficeTab[];
		activeOfficeId: string | undefined;
		/** The services the «ΥΠΗΡΕΣΙΑ» menu offers (more than one makes it a menu). */
		services: { id: string; title: string }[];
		serviceId: string | undefined;
		locale: SupportedLocale;
		/** The window «Διαθεσιμότητα» («ΗΜΕΡΟΜΗΝΙΑ & ΩΡΑ»). */
		availabilityHref: ResolvedPathname;
		onOpenAvailability: (event?: MouseEvent) => void;
		onChooseService: (serviceId: string) => void;
		onSelectOffice: (officeId: string) => void;
		/** «Κράτηση» (a guest: the sign-in, S-31.4; a member without a time: the window). */
		onBook: () => void;
		onSignIn: (request?: SignInRequest) => void;
		onRetry: () => void;
		/** The card's box: the section bar shows the fee and «Κράτηση» once it leaves the screen. */
		ref?: HTMLElement | null;
	} = $props();

	const options = $derived({ locale });
	const fieldClasses =
		'relative flex min-h-control-lg w-full flex-row items-center gap-2 border border-foreground/30 px-3 py-2.5 text-start outline-none transition-colors duration-standard ease-standard focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset';
	// The field under the pointer (or the open menu) outlines itself in full, as the phone field's halves do.
	const pressableClasses =
		'can-hover:hover:z-10 can-hover:hover:border-foreground can-hover:hover:bg-foreground/5 data-[state=open]:z-10 data-[state=open]:border-foreground';
	const serviceTitle = $derived(
		services.find((service) => service.id === serviceId)?.title ?? booking.serviceTitle
	);
	const hasWhen = $derived(Boolean(booking.chosenLabel || booking.nextLabel));
</script>

{#snippet action(entry: DoctorBookingAction, primary: boolean)}
	<Button
		tone={primary ? 'accent' : 'outline'}
		radius="full"
		size="lg"
		label={entry.label}
		href={entry.href}
		data-testid={`doctor-booking-card-action-${entry.kind}`}
		class="w-full whitespace-normal"
	>
		{#snippet leading()}
			<Ionicon
				name={doctorBookingActionGlyphs[entry.kind]}
				class={cn('icon-md shrink-0', primary && 'text-secondary-foreground')}
			/>
		{/snippet}
	</Button>
{/snippet}

<!-- 🔴 U-40.3 / U-37 / U-38.1 (from 744, Airbnb's card, the content of the application's booking bar): the fee (none
     without services), the office pills (the same active office as the page), «ΥΠΗΡΕΣΙΑ» and «ΗΜΕΡΟΜΗΝΙΑ & ΩΡΑ» — the
     application's day-and-time window, then «Δευ 2 Νοε · 09:30» — and «Κράτηση»; with nothing to book, the statement
     and two buttons (U-42.2), the phone under them. A guest is never sent to sign in when there is nothing to book. -->
<aside
	bind:this={ref}
	aria-label={m.doctor_booking_label({}, options)}
	data-testid="doctor-booking-card"
	data-mode={booking.mode}
	class="hidden flex-col rounded-lg border border-border bg-card p-6 shadow-raised tablet:flex"
>
	{#if booking.fee}
		<Fee fee={booking.fee} placement="card" {onSignIn} testId="doctor-booking-card-fee" />
	{/if}
	{#if tabs.length > 0 && activeOfficeId}
		<OfficeTabs
			{tabs}
			value={activeOfficeId}
			onChange={onSelectOffice}
			label={m.doctor_offices_label({}, options)}
			tabTestIdPrefix="doctor-booking-card-tab"
			testId="doctor-booking-card-tabs"
			class={booking.fee ? 'mt-4' : undefined}
		/>
	{/if}
	{#if booking.waiting}
		<div data-testid="doctor-booking-card-waiting" class="mt-4 flex flex-col gap-4">
			<SkeletonLines
				lines={[{ width: 'w-full', height: 'h-control-sm', shape: 'block' }, { width: 'w-2/3' }]}
				class="gap-3"
			/>
		</div>
	{:else if booking.failed}
		<div class="mt-4">
			<InlineNotice
				variant="danger"
				message={booking.failed.message}
				actionLabel={booking.failed.retryLabel}
				onAction={onRetry}
				testId="doctor-booking-card-failed"
			/>
		</div>
	{:else if booking.mode === 'book'}
		<!-- U-51 (the phone field's stacked halves): «ΥΠΗΡΕΣΙΑ» on top and «ΗΜΕΡΟΜΗΝΙΑ & ΩΡΑ» below are two joined
		     controls with a darker line between them, so it reads that both are pressed. -->
		<div data-testid="doctor-booking-card-fields" class="mt-4 flex flex-col rounded-md">
			{#if services.length > 1}
				<DropdownMenu>
					<DropdownMenuTrigger
						data-testid="doctor-booking-card-service"
						class={cn(fieldClasses, hasWhen ? 'rounded-t-md' : 'rounded-md', pressableClasses)}
					>
						<span class="flex min-w-0 flex-1 flex-col">
							<span class="text-label-md font-bold tracking-wide text-foreground"
								>{booking.serviceLabel}</span
							>
							<span class="truncate text-body-sm text-foreground">{serviceTitle}</span>
						</span>
						<Ionicon name="chevron-down" class="icon-sm shrink-0" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						<DropdownMenuRadioGroup value={serviceId} onValueChange={onChooseService}>
							{#each services as service (service.id)}
								<DropdownMenuRadioItem
									value={service.id}
									data-testid={`doctor-booking-card-service-${service.id}`}
									>{service.title}</DropdownMenuRadioItem
								>
							{/each}
						</DropdownMenuRadioGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			{:else}
				<div
					data-testid="doctor-booking-card-service"
					class={cn(fieldClasses, hasWhen ? 'rounded-t-md' : 'rounded-md')}
				>
					<span class="flex min-w-0 flex-1 flex-col">
						<span class="text-label-md font-bold tracking-wide text-foreground"
							>{booking.serviceLabel}</span
						>
						<span class="truncate text-body-sm text-foreground">{serviceTitle}</span>
					</span>
				</div>
			{/if}
			<!-- NIT-2 of r1 (the prototype's `dateField()`): an office without a day draws no empty field (case 3). -->
			{#if hasWhen}
				<a
					href={availabilityHref}
					data-testid="doctor-booking-card-when"
					onclick={(event) => onOpenAvailability(event)}
					class={cn(fieldClasses, '-mt-px rounded-b-md border-t-foreground/65', pressableClasses)}
				>
					<span class="flex min-w-0 flex-1 flex-col">
						<span class="text-label-md font-bold tracking-wide text-foreground"
							>{booking.dateLabel}</span
						>
						{#if booking.chosenLabel}
							<span
								data-testid="doctor-booking-card-chosen"
								class="text-body-md font-semibold text-primary-text">{booking.chosenLabel}</span
							>
						{:else if booking.nextLabel}
							<span class="text-body-sm text-muted-foreground">{booking.nextLabel}</span>
						{/if}
					</span>
					<Ionicon name="chevron-down" class="icon-sm shrink-0" />
				</a>
			{/if}
		</div>
		{#if booking.elsewhere}
			<div class="mt-4">
				<Elsewhere
					content={booking.elsewhere}
					{onSelectOffice}
					placement="section"
					testId="doctor-booking-card-elsewhere"
				/>
			</div>
		{/if}
		<Button
			tone="accent"
			radius="full"
			size="lg"
			label={booking.ctaLabel}
			onclick={() => onBook()}
			data-testid="doctor-booking-card-cta"
			class="mt-4 w-full"
		/>
	{:else}
		{#if booking.statement}
			<p
				data-testid="doctor-booking-card-statement"
				class="mt-4 flex flex-row items-start gap-2.5 text-body-lg font-semibold text-foreground"
			>
				<Ionicon name="calendar-outline" class="mt-0.5 icon-md shrink-0 text-muted-foreground" />
				<span>{booking.statement}</span>
			</p>
		{/if}
		<div class="mt-4 flex flex-col gap-2.5">
			{#if booking.primary}{@render action(booking.primary, true)}{/if}
			{#if booking.secondary}{@render action(booking.secondary, false)}{/if}
		</div>
		{#if booking.phoneLabel}
			<p
				data-testid="doctor-booking-card-phone"
				class="mt-2 text-center text-label-lg text-muted-foreground"
			>
				{booking.phoneLabel}
			</p>
		{/if}
	{/if}
</aside>
