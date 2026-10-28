<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { FrameMessageOptions, LocalizedHref } from '../types';

	let { href, messageOptions }: { href: LocalizedHref; messageOptions: FrameMessageOptions } =
		$props();

	const linkClass =
		'inline-flex min-h-touch min-w-touch items-center justify-center rounded-md px-3 text-body-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50';
</script>

<nav
	class="ml-4 hidden items-center gap-touch-gap laptop:flex"
	aria-label={m.primary_navigation({}, messageOptions)}
>
	<a href={href('/doctors')} class={linkClass}>{m.nav_doctors({}, messageOptions)}</a>
	<a href={href('/clinics')} class={linkClass}>{m.nav_clinics({}, messageOptions)}</a>
	<a href={href('/plans')} class={linkClass}>{m.nav_plans({}, messageOptions)}</a>
</nav>
