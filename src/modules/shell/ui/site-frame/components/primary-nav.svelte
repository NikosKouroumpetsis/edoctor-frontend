<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { FrameMessageOptions, LocalizedHref } from '../types';

	let { href, messageOptions }: { href: LocalizedHref; messageOptions: FrameMessageOptions } =
		$props();

	// The look without a display: each link names its own (`inline-flex`, or `hidden laptop:inline-flex`), so a
	// `hidden` is never beaten by a display in the same class list (Tailwind orders `inline-flex` after `hidden`).
	const linkClass =
		'min-h-touch min-w-touch items-center justify-center rounded-md px-2 text-body-sm text-foreground/80 transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50';
</script>

<!-- apple.com's links, spread over the bar's middle: «Γιατροί · Κλινικές · Άρθρα υγείας», and from 1128 «Κέντρο
     βοήθειας · Για γιατρούς» (Airbnb's rule: below, the ☰ menu has them). -->
<nav
	aria-label={m.primary_navigation({}, messageOptions)}
	data-slot="primary-nav"
	class="flex flex-1 flex-row items-center justify-around px-6"
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
	<a href={href('/plans')} class={[linkClass, 'hidden laptop:inline-flex']}
		>{m.nav_for_doctors({}, messageOptions)}</a
	>
</nav>
