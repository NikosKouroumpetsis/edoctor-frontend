<script lang="ts">
	import { untrack } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { m } from '$paraglide/messages.js';
	import { breakpoints } from '$shared/design/tokens';
	import { getSessionOptional } from '$shared/state/session';
	import { SplitView } from '$shared/ui/templates/split-view';
	import {
		buildGuestPage,
		buildSettingsSections,
		settingsPageOf
	} from '$modules/profile/lib/settings';
	import { profileViewerOf } from '$modules/profile/lib/viewer';
	import LanguageSection from '$modules/profile/ui/language';
	import Menu from '../components/menu.svelte';
	import Section from '../components/section.svelte';
	import Skeleton from '../components/skeleton.svelte';
	import type { SettingsPageProps } from '../types';

	let {
		locale,
		section,
		page = null,
		links,
		languageHref,
		sectionContent,
		pageContent
	}: SettingsPageProps = $props();

	const options = $derived({ locale });
	// The page's server knows nobody (U-80.1 Ε6): it draws the wait, and the browser fills it in.
	const session = getSessionOptional();
	const viewer = $derived(profileViewerOf(session));
	const waiting = $derived(viewer === 'waiting');
	const sections = $derived(
		waiting ? [] : buildSettingsSections(options, { member: viewer === 'member' })
	);

	// Record §5.2 (`set.js:65-67`): from 950 the shell's own address shows its FIRST section beside the menu — in place,
	// the address stays the shell's (D-W45-01) — never below 950, where the list is the page.
	const wide = new MediaQuery(`(min-width: ${breakpoints.split}px)`, false);
	const named = $derived(sections.find((entry) => entry.id === section) ?? null);
	// 🔴 D-W45-29 (screen 62): «Απόρρητο» is no row of a guest's shell, yet a guest reads it — as ONE page of its own at
	// the same address: below 950 a pushed page, from 950 one column in the middle (`solo`), never beside the menu.
	const guestPage = $derived(
		!waiting && viewer === 'guest' && named === null ? buildGuestPage(section, options) : null
	);
	const solo = $derived(guestPage !== null);
	const shown = $derived(named ?? guestPage ?? (wide.current ? (sections[0] ?? null) : null));
	// Below 950 the right column takes the list's place only for a section this reader has; while the session is not
	// known yet, for the wait of the section the address names.
	const paneOpen = $derived(waiting ? section !== null : named !== null || solo);

	// Screen 62 (D-W45-01): the page of the section the address names — «Εργαλεία τρίτων και cookies», «Διαγραφή
	// λογαριασμού», its code — drawn in the section's place with a «←» of its own. One that needs a session is never a
	// guest's (D-W45-30: the screen sends those addresses to the «Προφίλ»).
	const pageSeed = $derived(shown && shown.id === section ? settingsPageOf(page) : null);
	const openPage = $derived(
		pageSeed && (viewer === 'member' || !pageSeed.member)
			? { seed: pageSeed, ...pageContent?.[pageSeed.id] }
			: null
	);

	// 🔴 Card w45-w3 (screen 60, the first section only a signed-in person reads): a GUEST whose address names such a
	// section is asked to sign in over the shell — once, and only when the page ARRIVED as a guest's, never after a
	// sign-out made on it, nor for a session that merely could not be read. Under the sign-in the shell is the guest's
	// (its list; from 950 its first section); signed in, the section the address names opens. The rating page's way
	// (`appointments/ui/list/hooks/use-pages`): no page of its own, no word of its own.
	let arrived = false;
	$effect(() => {
		if (waiting || arrived) return;
		arrived = true;
		// … nor for «Απόρρητο», a guest's own page (D-W45-29).
		if (session?.status !== 'guest' || section === null || named !== null) return;
		if (buildGuestPage(section, options)) return;
		untrack(() => session.requireSignIn());
	});
</script>

{#snippet menu()}
	<Menu
		{locale}
		{sections}
		selectedId={wide.current ? (shown?.id ?? null) : null}
		{waiting}
		{links}
	/>
{/snippet}

<!-- Wave 4.5 · screen 57 «Ρυθμίσεις λογαριασμού», the shell (record §5.2; U-165, U-167). Below 950 the list of the
     sections OR one section on its own page; from 950 the menu on the left (340, 420 from 1128) and the section in the
     MIDDLE of the right column (at most 640), each column scrolling on its own. 🔴 D-W45-02: only the sections whose
     screen is built; 🔴 D-W45-05: a guest's shell has «Γλώσσα και θέμα» alone. No footer, no capsule (D-W45-07).
     «Γλώσσα και θέμα» is drawn here; every other section, and the pages a section opens (screen 62), are handed in by
     the screen (`sectionContent`, `pageContent`). 🔴 D-W45-29: a guest's «Απόρρητο» is ONE column, no menu beside it. -->
<SplitView list={menu} widths="menu" centred open={paneOpen} {solo} data-testid="settings-split">
	{#if waiting}
		<Skeleton label={m.profile_menu_account_settings({}, options)} />
	{:else if shown}
		{#key `${shown.id}/${openPage?.seed.id ?? ''}`}
			{#if openPage}
				<Section
					{locale}
					id={shown.id}
					page={openPage.seed.id}
					title={openPage.title ?? shown.label}
					titleAs={solo ? 'h1' : 'h2'}
					backHref={openPage.seed.back ? links.page(openPage.seed.back) : links.section(shown.id)}
					backAlways
					own={solo}
				>
					{@render openPage.content?.()}
				</Section>
			{:else}
				<Section
					{locale}
					id={shown.id}
					title={shown.label}
					titleAs={solo ? 'h1' : 'h2'}
					backHref={solo ? links.profile : links.list}
					backAlways={solo}
					own={solo}
				>
					{#if shown.id === 'language'}
						<LanguageSection {locale} member={viewer === 'member'} {languageHref} />
					{:else}
						<!-- A section the screen draws: another module's, or one only the screen can compose. -->
						{@render sectionContent?.[shown.id]?.()}
					{/if}
				</Section>
			{/if}
		{/key}
	{/if}
</SplitView>
