<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$paraglide/messages.js';
	import { localizeHref } from '$paraglide/runtime';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { getSiteDialogsOptional } from '$shared/state/site-dialogs';
	import { CookieConsent } from '$shared/ui/organisms/cookie-consent';
	import {
		buildAcceptAllChoices,
		buildDraftChoices,
		buildEssentialOnlyChoices,
		resolveConsentPrompt
	} from '$modules/shell/lib/consent';
	import { legalPath } from '$modules/shell/lib/legal';
	import ConsentToolsDialog from '../components/tools-dialog.svelte';
	import { useConsentRecord } from '../hooks/use-consent-record.svelte';
	import { useConsentTools } from '../hooks/use-consent-tools.svelte';

	const locale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale });
	const localizedHref = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);

	// The registry and the decision this browser keeps — the ONE catalogue and the ONE decision the page «Εργαλεία τρίτων
	// και cookies» reads too (wave 4.5, screen 62): a choice saved there closes this card, and the other way round.
	const consent = useConsentTools();
	const tools = $derived(consent.tools);
	const snapshot = $derived(consent.snapshot);
	const read = $derived(consent.read);

	let decided = $state(false);
	let manageOpen = $state(false);
	// A page may ask for this window (`SiteDialogs.openConsent`).
	const dialogs = getSiteDialogsOptional();
	$effect(() => {
		if (!dialogs?.consentRequested) return;
		dialogs.consentRequested = false;
		manageOpen = true;
	});
	const resolution = $derived(
		resolveConsentPrompt({ snapshot, tools, registryVersion: consent.registry?.registryVersion })
	);
	const open = $derived(read && !decided && resolution.shouldPrompt);

	// A version that changed only essential tools or words is reconciled silently, as the application does.
	$effect(() => {
		const reconciled = resolution.reconciledSnapshot;
		if (!read || !reconciled) return;
		consent.keep(reconciled);
	});

	// 🔴 R-4: a member's decision also reaches the server's record (`POST /consent/record`); a guest's stays here until a
	// session exists, as in the application.
	useConsentRecord(() => snapshot);

	/** Keeps the decision in the browser so the card never asks again for this registry version. */
	function decide(choices: Record<string, boolean>) {
		if (!consent.save(choices)) return;
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
