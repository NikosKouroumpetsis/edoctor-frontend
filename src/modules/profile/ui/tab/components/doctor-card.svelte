<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let {
		locale,
		href,
		pending = false
	}: {
		locale: SupportedLocale;
		/** The doctor's sign-up, resolved by the screen in the page's language (a module knows no route). */
		href: ResolvedPathname;
		/**
		 * 🔴 Wave 5.1 · screen 64 (U-183.5): a completed registration without a licence — «Η αίτησή σας ελέγχεται · Δείτε ή
		 * αλλάξτε τα στοιχεία της εγγραφής σας.», to the same page (the application's page of the sign-up).
		 */
		pending?: boolean;
	} = $props();

	const options = $derived({ locale });
</script>

<!-- «Είστε γιατρός;» as a card (record §5.1, U-164 Ε5 Α, D-W45-20; `56-profile/prof.css:24-29` `.p-doc`): the 48 circle on
     the chip with `medkit-outline`, the title 16 / 600, its line 13 muted, «›» — a link to the doctor's sign-up, with
     the rule the menu at the top right has for the same entry (wave 5.1: not for a licence; «Η αίτησή σας ελέγχεται» for
     a completed registration without one, U-183.5). The two words are the menu's own. -->
<a
	{href}
	data-testid="profile-doctor-card"
	data-state={pending ? 'pending' : 'join'}
	class="flex min-h-row-lg w-full flex-row items-center gap-3.5 rounded-xl border border-line bg-card px-4.5 py-4 text-start shadow-overlay transition-opacity duration-standard ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-70"
>
	<span
		aria-hidden="true"
		class="grid size-avatar-lg shrink-0 place-items-center rounded-full bg-chip text-primary-text"
	>
		<Ionicon name="medkit-outline" class="icon-lg" />
	</span>
	<span class="grid min-w-0 flex-1">
		<span class="text-body-lg font-semibold text-foreground">
			{pending
				? m.doctor_application_review_title({}, options)
				: m.account_menu_doctor_title({}, options)}
		</span>
		<span class="text-label-lg font-normal text-muted-foreground">
			{pending
				? m.doctor_application_review_body({}, options)
				: m.account_menu_doctor_body({}, options)}
		</span>
	</span>
	<Ionicon name="chevron-forward" class="icon-md shrink-0 text-muted-foreground" />
</a>
