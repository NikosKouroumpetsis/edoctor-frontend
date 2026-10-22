<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import SearchIcon from '~icons/lucide/search';
	import HeartIcon from '~icons/lucide/heart';
	import CalendarIcon from '~icons/lucide/calendar';
	import MessageIcon from '~icons/lucide/message-circle';
	import UserIcon from '~icons/lucide/user';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { m } from '$paraglide/messages.js';
	import { deLocalizeHref, localizeHref } from '$paraglide/runtime';

	const currentLocale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale: currentLocale });
	const isHome = $derived(deLocalizeHref(page.url.pathname) === '/');

	const homeHref = $derived(resolve(localizeHref('/', { locale: currentLocale }) as Pathname));
</script>

<nav
	class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card laptop:hidden"
	aria-label={m.bottom_navigation({}, messageOptions)}
>
	<ul class="mx-auto flex max-w-content items-stretch justify-around px-2 pt-2 pb-safe-area">
		<li>
			<a
				href={homeHref}
				aria-current={isHome ? 'page' : undefined}
				class={[
					'flex min-h-touch min-w-touch flex-col items-center justify-center gap-1 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
					isHome ? 'text-primary' : 'text-muted-foreground'
				]}
			>
				<SearchIcon class="icon-lg" />
				<span class="text-label-md">{m.tab_search({}, messageOptions)}</span>
			</a>
		</li>
		<li>
			<button
				type="button"
				class="flex min-h-touch min-w-touch flex-col items-center justify-center gap-1 text-muted-foreground outline-none"
			>
				<HeartIcon class="icon-lg" />
				<span class="text-label-md">{m.tab_favorites({}, messageOptions)}</span>
			</button>
		</li>
		<li>
			<button
				type="button"
				class="flex min-h-touch min-w-touch flex-col items-center justify-center gap-1 text-muted-foreground outline-none"
			>
				<CalendarIcon class="icon-lg" />
				<span class="text-label-md">{m.tab_appointments({}, messageOptions)}</span>
			</button>
		</li>
		<li>
			<button
				type="button"
				class="flex min-h-touch min-w-touch flex-col items-center justify-center gap-1 text-muted-foreground outline-none"
			>
				<MessageIcon class="icon-lg" />
				<span class="text-label-md">{m.tab_messages({}, messageOptions)}</span>
			</button>
		</li>
		<li>
			<button
				type="button"
				class="flex min-h-touch min-w-touch flex-col items-center justify-center gap-1 text-muted-foreground outline-none"
			>
				<UserIcon class="icon-lg" />
				<span class="text-label-md">{m.tab_profile({}, messageOptions)}</span>
			</button>
		</li>
	</ul>
</nav>
