<script lang="ts">
	import { untrack } from 'svelte';
	import type { Pathname } from '$app/types';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$paraglide/messages.js';
	import { deLocalizeHref, localizeHref } from '$paraglide/runtime';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { getDoctorStandingOptional } from '$shared/state/doctor-standing';
	import { getInboxBadgeOptional } from '$shared/state/inbox-badge';
	import { getNotificationBadgeOptional } from '$shared/state/notification-badge';
	import { getSessionOptional } from '$shared/state/session';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { AppHeader } from '$shared/ui/organisms/app-header';
	import {
		BottomNav,
		bottomNavReserveClasses,
		type BottomNavItem
	} from '$shared/ui/organisms/bottom-nav';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { buildDoctorMenuGroups, type DoctorMenuRowId } from '$modules/doctor-dashboard/lib/menu';
	import {
		doctorFramePaths,
		doctorMenuPath,
		doctorTodayPath,
		doctorPatientsPath,
		isDoctorAppointmentStepPage,
		isDoctorMenuTab,
		isDoctorMessagesPushedPage,
		isDoctorMessagesTab,
		isDoctorPatientStepPage,
		isDoctorTodayTab
	} from '$modules/doctor-dashboard/lib/paths';
	import AccountMenu from '../components/account-menu.svelte';
	import BrandLink from '../components/brand-link.svelte';
	import DoctorNav from '../components/doctor-nav.svelte';
	import type { DoctorFrameLink, DoctorFrameProps } from '../types';

	let { children }: DoctorFrameProps = $props();

	const locale = $derived(getPageLocale(page.url));
	const options = $derived({ locale });
	const href = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);
	const basePath = $derived(deLocalizeHref(page.url.pathname).replace(/\/+$/u, '') || '/');

	const session = getSessionOptional();
	const standing = getDoctorStandingOptional();
	const inbox = getInboxBadgeOptional();
	const notifications = getNotificationBadgeOptional();
	const isMember = $derived(session?.isMember ?? false);
	const hasUnread = $derived(isMember && (inbox?.hasUnread ?? false));
	const hasNewNotifications = $derived(isMember && (notifications?.hasNew ?? false));
	const initial = $derived(session?.member?.firstName?.trim().slice(0, 1).toUpperCase() ?? null);

	/**
	 * 🔴 Screen 65 · D-W51-19 (the gate of `/doctor/*`): the server's page knows nobody, so it draws the wait until the
	 * answers are here; then a doctor with a licence of the marketplace (an expired one too) stays, anyone else goes to
	 * the patient's home (`refused`); a guest signs in first (`requireSignIn`), and one who leaves the sign-in, or signs
	 * out here, goes home too. A read that got no answer says so, with «Δοκιμάστε ξανά».
	 */
	const gate = $derived.by(() => {
		const status = session?.status ?? 'guest';
		if (status === 'guest') return 'guest' as const;
		if (standing?.failed) return 'failed' as const;
		if (!standing?.known || status !== 'member') return 'waiting' as const;
		return standing.canEnterDoctorMode ? ('open' as const) : ('refused' as const);
	});

	let memberHere = false;
	let askedSignIn = false;
	const leave = () => void goto(href(doctorFramePaths.home), { replaceState: true });
	$effect(() => {
		const now = gate;
		const flowOpen = session?.flowOpen ?? false;
		untrack(() => {
			if (now === 'open' || now === 'refused' || now === 'waiting') {
				if (now !== 'waiting') memberHere = memberHere || now === 'open';
				if (now === 'refused') leave();
				return;
			}
			if (now !== 'guest') return;
			if (memberHere || !session) {
				leave();
				return;
			}
			if (!askedSignIn) {
				askedSignIn = true;
				session.requireSignIn();
				return;
			}
			if (!flowOpen) leave();
		});
	});

	// 🔴 D-W51-31: «Σήμερα» stays the current tab on «Ραντεβού» and what is under it (screen 67 opens inside the tab).
	const todayCurrent = $derived(isDoctorTodayTab(basePath));
	// 🔴 D-W51-46 · U-81.2: screen 69 is pushed over the tabs below 744 (its own bar at the bottom, `m-reject.png`).
	// 🔴 D-W51-76 · U-198.2: so are «Στοιχεία ασθενή» and the join of screen 73.
	// 🔴 D-W51-85: so are a conversation, one the doctor starts and «Προηγούμενες συνομιλίες» (the patient's way).
	const pushed = $derived(
		isDoctorAppointmentStepPage(basePath) ||
			isDoctorPatientStepPage(basePath) ||
			isDoctorMessagesPushedPage(basePath)
	);
	// 🔴 D-W51-85: «Μηνύματα» is the current tab on the doctor's messages and under them.
	const messagesCurrent = $derived(isDoctorMessagesTab(basePath));
	// 🔴 D-W51-73: «Μενού» stays the current tab on «Οι ασθενείς μου» and what is under it (it opens inside the tab).
	const menuCurrent = $derived(isDoctorMenuTab(basePath));

	const links = $derived<DoctorFrameLink[]>([
		{
			key: 'today',
			label: m.doctor_dashboard_today({}, options),
			href: href(doctorTodayPath),
			current: todayCurrent
		},
		{
			key: 'messages',
			label: m.tab_messages({}, options),
			href: href(doctorFramePaths.messages),
			current: messagesCurrent
		}
	]);

	// 🔴 U-81.2 (below 744): the doctor's capsule — Σήμερα · Μηνύματα · Μενού, the messages' count as the patient's tab.
	const tabs = $derived<BottomNavItem[]>([
		{
			key: 'today',
			label: m.doctor_dashboard_today({}, options),
			icon: 'bookmark',
			activeIcon: 'bookmark',
			href: href(doctorTodayPath),
			current: todayCurrent
		},
		{
			key: 'messages',
			label: m.tab_messages({}, options),
			icon: 'chatbubble-outline',
			activeIcon: 'chatbubble',
			href: href(doctorFramePaths.messages),
			current: messagesCurrent,
			...(hasUnread && inbox
				? {
						badge: inbox.label,
						badgeLabel: m.bottom_nav_unread({ count: inbox.count }, options)
					}
				: {})
		},
		{
			key: 'menu',
			label: m.doctor_dashboard_menu({}, options),
			icon: 'menu',
			activeIcon: 'menu',
			href: href(doctorMenuPath),
			current: menuCurrent
		}
	]);

	const groups = $derived(buildDoctorMenuGroups(locale));
	const rowPaths: Record<Exclude<DoctorMenuRowId, 'sign-out'>, string> = {
		notifications: doctorFramePaths.notifications,
		patients: doctorPatientsPath,
		'account-settings': doctorFramePaths.accountSettings,
		help: doctorFramePaths.help,
		terms: doctorFramePaths.terms
	};
	const hrefOf = (row: DoctorMenuRowId) =>
		row === 'sign-out' ? href(doctorFramePaths.home) : href(rowPaths[row]);
	const toPatient = () => void standing?.switchTo('PATIENT');

	function patientMode(event: MouseEvent) {
		event.preventDefault();
		toPatient();
	}
</script>

<!-- 🔴 Wave 5.1 · screen 65 (D-W51-16, U-186.2; `64-switch/sw.js:872-877, 904-913`, `65-nav`): the doctor's own frame —
     the patient's draws none here. From 744 the bar: the mark · Σήμερα · Μηνύματα in the middle · «Λειτουργία ασθενή»
     (from 1128) and the ☰ with the initial. Below 744 no bar on top (U-81.2) and the capsule Σήμερα · Μηνύματα · Μενού.
     Never «Προφίλ», «Οι συγγενείς μου», «Ημερολόγιο» (5.3) or «Ταμείο» (the web has none) in 5.1. -->
<div data-testid="doctor-frame" data-gate={gate} class="flex min-h-dvh flex-col bg-card">
	<AppHeader showFrom="tablet">
		{#snippet brand()}
			<BrandLink href={href(doctorTodayPath)} {locale} />
		{/snippet}
		{#snippet nav()}
			<DoctorNav {links} {locale} {hasUnread} />
		{/snippet}
		{#snippet actions()}
			<!-- The patient's home, before the scripts have run; the switch in place (U-185.3: the transition). -->
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
			<a
				href={href(doctorFramePaths.home)}
				onclick={patientMode}
				data-testid="doctor-bar-patient-mode"
				class="hidden min-h-touch min-w-touch items-center rounded-full px-3.5 text-body-sm font-semibold whitespace-nowrap text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 laptop:inline-flex"
			>
				{m.doctor_mode_patient({}, options)}
			</a>
			<AccountMenu
				{groups}
				{locale}
				{initial}
				{hasUnread}
				{hasNewNotifications}
				{hrefOf}
				patientModeHref={href(doctorFramePaths.home)}
				onPatientMode={toPatient}
				onSignOut={() => void session?.signOut()}
			/>
		{/snippet}
	</AppHeader>

	<div class={['flex-1', !pushed && bottomNavReserveClasses.tablet]}>
		{#if gate === 'open'}
			{@render children()}
		{:else if gate === 'failed'}
			<div class="mx-auto w-full max-w-content px-gutter-sm pt-section">
				<InlineNotice
					variant="danger"
					message={m.doctor_dashboard_load_error({}, options)}
					actionLabel={m.doctor_dashboard_retry({}, options)}
					onAction={() => standing?.retry()}
					testId="doctor-frame-load-error"
				/>
			</div>
		{:else}
			<div
				data-testid="doctor-frame-loading"
				aria-busy="true"
				aria-label={m.doctor_dashboard_today({}, options)}
				class="mx-auto grid w-full max-w-content gap-4 px-gutter-sm pt-3 tablet:pt-section"
			>
				<Skeleton class="h-control-md w-1/3 rounded-md" />
				<Skeleton class="h-placeholder-lg w-full rounded-xl" />
			</div>
		{/if}
	</div>

	{#if !pushed}
		<BottomNav aria-label={m.doctor_dashboard_tabs({}, options)} items={tabs} hideFrom="tablet" />
	{/if}
</div>
