<script lang="ts">
	import type { Pathname } from '$app/types';
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { createQuery } from '@tanstack/svelte-query';
	import { m } from '$paraglide/messages.js';
	import { localizeHref } from '$paraglide/runtime';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import {
		readConsentSnapshot,
		writeConsentSnapshot,
		type ConsentSnapshot
	} from '$shared/storage/consent-storage';
	import { CookieConsent } from '$shared/ui/organisms/cookie-consent';
	import { getConsentRegistry } from '$modules/shell/api/consent';
	import { fallbackConsentRegistry } from '$modules/shell/config/consent-fallback-registry';
	import {
		buildAcceptAllChoices,
		buildDraftChoices,
		buildEssentialOnlyChoices,
		resolveConsentPrompt,
		selectWebTools
	} from '$modules/shell/lib/consent';
	import { legalPath } from '$modules/shell/lib/legal';
	import ConsentToolsDialog from '../components/tools-dialog.svelte';

	const locale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale });
	const localizedHref = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);

	// The registry (anonymous GET, checked at the boundary).
	const registryQuery = createQuery(() => ({
		queryKey: ['consent', 'registry'],
		queryFn: ({ signal }: { signal: AbortSignal }) => getConsentRegistry(signal),
		enabled: browser,
		staleTime: 10 * 60 * 1000
	}));
	// The application's `consentRegistryQuery`: the bundled registry when the served one cannot be read, has no usable
	// version (`null`) or no tool left after the boundary; nothing until it answers.
	const registry = $derived.by(() => {
		// Both read every time: a query result tells its changes only for the fields that were read.
		const data = registryQuery.data;
		const failed = registryQuery.isError;
		if (failed) return fallbackConsentRegistry;
		if (data === undefined) return null;
		return data && data.tools.length > 0 ? data : fallbackConsentRegistry;
	});
	const tools = $derived(selectWebTools(registry));

	// The decision this browser keeps (first party, no personal data); read once in the browser.
	let snapshot = $state<ConsentSnapshot | null>(null);
	let read = $state(false);
	$effect(() => {
		snapshot = readConsentSnapshot();
		read = true;
	});

	let decided = $state(false);
	let manageOpen = $state(false);
	const resolution = $derived(
		resolveConsentPrompt({ snapshot, tools, registryVersion: registry?.registryVersion })
	);
	const open = $derived(read && !decided && resolution.shouldPrompt);

	// A version that changed only essential tools or words is reconciled silently, as the application does.
	$effect(() => {
		const reconciled = resolution.reconciledSnapshot;
		if (!read || !reconciled) return;
		writeConsentSnapshot(reconciled);
		snapshot = reconciled;
	});

	/**
	 * Keeps the decision in the browser so the card never asks again for this registry version. The backend's
	 * record (`POST /consent/record`) takes only a signed-in session (session cookies), which the web does not have
	 * yet: the application replays the stored decision once a session exists, and so will the web then.
	 */
	function decide(choices: Record<string, boolean>) {
		if (!registry) return;
		const next = { registryVersion: registry.registryVersion, choices };
		writeConsentSnapshot(next);
		snapshot = next;
		decided = true;
		manageOpen = false;
	}

	const description = $derived([
		m.consent_body_lead({}, messageOptions),
		{
			label: m.consent_cookies_policy_link({}, messageOptions),
			href: localizedHref(legalPath('cookies-policy'))
		},
		m.consent_body_middle({}, messageOptions),
		{
			label: m.consent_privacy_policy_link({}, messageOptions),
			href: localizedHref(legalPath('privacy-policy'))
		},
		m.consent_body_tail({}, messageOptions)
	]);
</script>

<!-- Airbnb's floating card (U-16.5): on the phone 24 from the edges, above the tab capsule; from 744 720 wide in the
     middle, 32 from the bottom. No script of a third party runs here: only the decision is kept. -->
<div
	data-slot="consent-prompt"
	data-testid="consent-prompt"
	class="fixed inset-x-6 bottom-above-tab-bar z-40 mx-auto tablet:bottom-section tablet:max-w-consent-card-w"
>
	<CookieConsent
		open={open && !manageOpen}
		title={m.consent_title({}, messageOptions)}
		{description}
		acceptLabel={m.consent_accept_all({}, messageOptions)}
		rejectLabel={m.consent_essential_only({}, messageOptions)}
		manageLabel={m.consent_manage({}, messageOptions)}
		aria-label={m.consent_region({}, messageOptions)}
		onAccept={() => decide(buildAcceptAllChoices(tools))}
		onReject={() => decide(buildEssentialOnlyChoices(tools))}
		onManage={() => (manageOpen = true)}
	/>
</div>

<ConsentToolsDialog
	bind:open={manageOpen}
	{tools}
	initialChoices={buildDraftChoices(tools, snapshot)}
	{locale}
	onSave={decide}
/>
