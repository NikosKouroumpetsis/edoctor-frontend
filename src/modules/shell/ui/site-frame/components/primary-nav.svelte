<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { doctorOnboardingPath } from '../lib/frame';
	import type { FrameMessageOptions, LocalizedHref } from '../types';

	let { href, messageOptions }: { href: LocalizedHref; messageOptions: FrameMessageOptions } =
		$props();

	// The look without a display: each link names its own (`inline-flex`, or `hidden laptop:inline-flex`), so a
	// `hidden` is never beaten by a display in the same class list (Tailwind orders `inline-flex` after `hidden`).
	const linkClass =
		'min-h-touch min-w-touch items-center justify-center rounded-md px-2 text-body-sm text-foreground/80 transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50';
</script>

<!-- apple.com's links, spread over the bar's middle: «Γιατροί · Κλινικές · Άρθρα υγείας», and from 1128 «Κέντρο
     βοήθειας · Για γιατρούς» (Airbnb's rule: below, the ☰ menu has them). 🔴 U-215.3, D-W52-12 (`appts.css:203`): on a
     page with a `SplitView` the bar is the page's frame from 950, and there they stand together in its middle, 12 apart. -->
<nav
	aria-label={m.primary_navigation({}, messageOptions)}
	data-slot="primary-nav"
	class="flex flex-1 flex-row items-center justify-around px-6 split:split-page:justify-center split:split-page:gap-3"
>
	<a href={href('/doctors')} class={[linkClass, 'inline-flex']}
		>{m.nav_doctors({}, messageOptions)}</a
	>
	<a href={href('/clinics')} class={[linkClass, 'inline-flex']}
		>{m.nav_clinics({}, messageOptions)}</a
	>
	<a href={href('/articles')} class={[linkClass, 'inline-flex']}
		>{m.nav_articles({}, messageOptions)}</a
	>
	<a href={href('/help')} class={[linkClass, 'hidden laptop:inline-flex']}
		>{m.nav_help({}, messageOptions)}</a
	>
	<!-- 🔴 Wave 5.1 · screen 64 (U-185.1, D-W51-19, `64-switch/sw.js:869-871`; round 2): a licence of the marketplace has no
	     «Για γιατρούς» — its place goes to the other links, and «Λειτουργία γιατρού» stands beside the ☰ (`DoctorModeLink`).
	     `<html data-doctor-mode>` (this device's memory before the first paint, then the server's answer) decides in CSS,
	     so nothing changes under the eye (U-100); for everyone else the wrapper draws no box (`contents`): the bar as it was. -->
	<span data-slot="for-doctors-entry" class="contents doctor-mode:hidden">
		<a href={href(doctorOnboardingPath)} class={[linkClass, 'hidden laptop:inline-flex']}
			>{m.nav_for_doctors({}, messageOptions)}</a
		>
	</span>
</nav>
