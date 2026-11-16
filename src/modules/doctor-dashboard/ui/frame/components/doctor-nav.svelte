<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { cn } from '$shared/lib/utils';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import type { DoctorFrameLink } from '../types';

	let {
		links,
		locale,
		hasUnread = false
	}: {
		/** «Σήμερα · Μηνύματα» (D-W51-04: no «Ημερολόγιο» until 5.3, no «Ταμείο» on the web). */
		links: DoctorFrameLink[];
		locale: SupportedLocale;
		/** A conversation with a patient is unread: the dot beside «Μηνύματα» (U-84 Π5; D-W51-77: the doctor's side only). */
		hasUnread?: boolean;
	} = $props();

	const linkClass =
		'relative inline-flex min-h-touch min-w-touch items-center justify-center gap-1.5 rounded-md px-2 text-body-sm font-medium text-foreground/80 outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
	// The current tab: 600 in the text colour, a 2 line under it (`64-switch/sw.css:9-12`, Airbnb's host bar).
	const currentClass =
		'font-semibold text-foreground after:absolute after:inset-x-2 after:bottom-1.5 after:h-0.5 after:rounded-full after:bg-foreground';
</script>

<!-- 🔴 Screen 65 (D-W51-16, `64-switch/sw.js:872-877`): the doctor's tabs in the bar's middle from 744 — the current one
     underlined, a dot on «Μηνύματα» while something is unread. No colour under the pointer (U-100). -->
<nav
	aria-label={m.doctor_dashboard_tabs({}, { locale })}
	data-slot="doctor-nav"
	class="flex flex-1 flex-row items-center justify-center gap-6"
>
	{#each links as link (link.key)}
		<!-- The address, already resolved in the page's language. -->
		<!-- eslint-disable svelte/no-navigation-without-resolve -->
		<a
			href={link.href}
			aria-current={link.current ? 'page' : undefined}
			data-testid={`doctor-nav-${link.key}`}
			class={cn(linkClass, link.current && currentClass)}
		>
			{link.label}
			{#if link.key === 'messages' && hasUnread}
				<span
					role="img"
					aria-label={m.account_menu_new_messages({}, { locale })}
					data-testid="doctor-nav-messages-dot"
					class="size-2 shrink-0 rounded-full bg-accent"
				></span>
			{/if}
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	{/each}
</nav>
