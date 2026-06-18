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
	class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card lg:hidden"
	aria-label={m.bottom_navigation({}, messageOptions)}
>
	<ul
		class="mx-auto flex max-w-tablet items-stretch justify-around px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
	>
		<li>
			<a
				href={homeHref}
				aria-current={isHome ? 'page' : undefined}
				class={[
					'flex flex-col items-center gap-1 rounded-md px-3 py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
					isHome ? 'text-primary' : 'text-muted-foreground'
				]}
			>
				<SearchIcon class="icon-xl" />
				<span class="text-label-sm font-medium">{m.tab_search({}, messageOptions)}</span>
			</a>
		</li>
		<li>
			<button
				type="button"
				class="flex flex-col items-center gap-1 px-3 py-1 text-muted-foreground outline-none"
			>
				<HeartIcon class="icon-xl" />
				<span class="text-label-sm font-medium">{m.tab_favorites({}, messageOptions)}</span>
			</button>
		</li>
		<li>
			<button
				type="button"
				class="flex flex-col items-center gap-1 px-3 py-1 text-muted-foreground outline-none"
			>
				<CalendarIcon class="icon-xl" />
				<span class="text-label-sm font-medium">{m.tab_appointments({}, messageOptions)}</span>
			</button>
		</li>
		<li>
			<button
				type="button"
				class="flex flex-col items-center gap-1 px-3 py-1 text-muted-foreground outline-none"
			>
				<MessageIcon class="icon-xl" />
				<span class="text-label-sm font-medium">{m.tab_messages({}, messageOptions)}</span>
			</button>
		</li>
		<li>
			<button
				type="button"
				class="flex flex-col items-center gap-1 px-3 py-1 text-muted-foreground outline-none"
			>
				<UserIcon class="icon-xl" />
				<span class="text-label-sm font-medium">{m.tab_profile({}, messageOptions)}</span>
			</button>
		</li>
	</ul>
</nav>
