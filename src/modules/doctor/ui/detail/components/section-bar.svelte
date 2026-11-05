<script lang="ts" module>
	/** One link of the section bar: the section's id (its `#doctor-<id>` anchor) and its word. */
	export type DoctorSectionLink = { id: string; label: string };
</script>

<script lang="ts">
	import type { SignInRequest } from '$shared/state/session';
	import { m } from '$paraglide/messages.js';
	import { cn } from '$shared/lib/utils';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Button } from '$shared/ui/primitives/button';
	import type { DoctorBookingContent } from '$modules/doctor/lib/detail';
	import Fee from './fee.svelte';

	let {
		links,
		activeId,
		shown,
		buyShown,
		booking,
		locale,
		onBook,
		onSignIn
	}: {
		/** The sections the page has (U-34.3): «Φωτογραφίες · Διαθεσιμότητα · Κόστος · Τοποθεσία · Κριτικές». */
		links: DoctorSectionLink[];
		/** The section in view: it keeps its line (the prototype's addition). */
		activeId: string | null;
		/** The photos have left the screen. */
		shown: boolean;
		/** The booking card has left the screen: the fee, the time and «Κράτηση» come in at the right. */
		buyShown: boolean;
		booking: DoctorBookingContent;
		locale: SupportedLocale;
		onBook: () => void;
		onSignIn: (request?: SignInRequest) => void;
	} = $props();

	const hiddenClasses = 'pointer-events-none -translate-y-2 opacity-0';
	const shownClasses = 'translate-y-0 opacity-100';

	/**
	 * NIT-1 of r1 (Π5, `profile.js:749`): a plain press glides to its section (whatever the motion setting, U-12), its
	 * `scroll-mt` under the bar; a press with a modifier keeps the link's own behaviour.
	 */
	function glide(event: MouseEvent, id: string) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
			return;
		const target = document.getElementById(`doctor-${id}`);
		if (!target) return;
		event.preventDefault();
		target.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
</script>

<!-- 🔴 Π5 (from 744, Airbnb's): the fixed 80 bar over the frame's top bar once the photos have gone — the links of
     the sections the page has (a press glides there), the one in view underlined; once the card has gone, at the
     right its fee, its time and «Κράτηση» (744–949 «Κράτηση» alone). Fades in with 8 of rise, the kit's 250. -->
<div
	data-testid="doctor-detail-section-bar"
	data-shown={shown}
	aria-hidden={!shown}
	inert={!shown}
	class={cn(
		'fixed inset-x-0 top-0 z-50 hidden h-section-bar border-b border-border bg-background transition duration-standard ease-standard tablet:block',
		shown ? shownClasses : hiddenClasses
	)}
>
	<div
		class="relative mx-auto flex h-full w-full max-w-listing flex-row items-center px-profile-gutter laptop:px-profile-gutter-lg desktop:px-0"
	>
		<nav
			aria-label={m.doctor_sections_label({}, { locale })}
			class="flex min-w-0 flex-row gap-4.5 overflow-hidden split:gap-6"
		>
			{#each links as link (link.id)}
				<a
					href={`#doctor-${link.id}`}
					aria-current={link.id === activeId ? 'location' : undefined}
					data-testid={`doctor-detail-section-link-${link.id}`}
					onclick={(event) => glide(event, link.id)}
					class={cn(
						'relative flex h-section-bar min-h-touch min-w-touch shrink-0 items-center text-body-sm font-medium text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset',
						'after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:origin-center after:bg-foreground after:transition-transform after:duration-standard after:ease-standard',
						link.id === activeId
							? 'after:scale-x-100'
							: 'after:scale-x-0 can-hover:hover:after:scale-x-100'
					)}>{link.label}</a
				>
			{/each}
		</nav>
		<div
			data-testid="doctor-detail-section-buy"
			data-shown={buyShown}
			inert={!buyShown}
			class={cn(
				'absolute inset-y-0 right-profile-gutter flex flex-row items-center gap-4 bg-background pl-4 transition duration-standard ease-standard laptop:right-profile-gutter-lg desktop:right-0',
				buyShown ? shownClasses : 'pointer-events-none translate-y-1.5 opacity-0'
			)}
		>
			<div class="hidden flex-col items-end text-right split:flex">
				{#if booking.mode === 'book'}
					{#if booking.fee}
						<Fee fee={booking.fee} placement="bar" {onSignIn} />
					{/if}
					{#if booking.whenLine}
						<span class="text-label-md text-muted-foreground">{booking.whenLine}</span>
					{/if}
				{:else if booking.statement}
					<span class="text-body-md font-semibold text-foreground">{booking.statement}</span>
				{/if}
			</div>
			{#if booking.mode === 'book'}
				<Button
					tone="accent"
					radius="full"
					label={booking.ctaLabel}
					onclick={() => onBook()}
					data-testid="doctor-detail-section-buy-cta"
				/>
			{:else if booking.primary}
				<Button
					tone="accent"
					radius="full"
					label={booking.primary.label}
					href={booking.primary.href}
					data-testid="doctor-detail-section-buy-action"
				/>
			{/if}
		</div>
	</div>
</div>
