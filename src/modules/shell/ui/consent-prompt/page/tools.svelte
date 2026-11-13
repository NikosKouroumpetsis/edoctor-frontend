<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { getToastsOptional } from '$shared/ui/molecules/toast';
	import { Button } from '$shared/ui/primitives/button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import { TextButton } from '$shared/ui/primitives/text-button';
	import { buildAcceptAllChoices, buildDraftChoices } from '$modules/shell/lib/consent';
	import ToolSections from '../components/tool-sections.svelte';
	import { useConsentTools } from '../hooks/use-consent-tools.svelte';

	let {
		locale,
		onSaved
	}: {
		locale: SupportedLocale;
		/** The choice was kept: the screen goes back to «Απόρρητο». */
		onSaved: () => void;
	} = $props();

	const messageOptions = $derived({ locale });
	const consent = useConsentTools();
	const toasts = getToastsOptional();
	// Nothing to choose from until the browser's storage and the catalogue are both known.
	const ready = $derived(consent.read && consent.registry !== null);

	// The choices start from what is on file — essentials on, the rest OFF unless allowed before — once, when known.
	let draft = $state<Record<string, boolean>>({});
	let started = false;
	$effect(() => {
		if (!ready || started) return;
		started = true;
		draft = buildDraftChoices(consent.tools, consent.snapshot);
	});

	function save() {
		if (!ready || !consent.save(draft)) return;
		toasts?.show({ message: m.consent_tools_saved({}, messageOptions) });
		onSaved();
	}
</script>

<!-- Wave 4.5 · screen 62 «Εργαλεία τρίτων και cookies» (record §5.7, `62-privacy/priv.js` `tools()`): the window
     «Διαχείριση προτιμήσεων» as a page — the SAME words, the same catalogue (`ToolSections`) and the same stored decision
     (`useConsentTools`) — then «Αποθήκευση» and «Ενεργοποίηση όλων» (every switch on; nothing is kept before
     «Αποθήκευση»). Saved: «Οι επιλογές σας αποθηκεύτηκαν.» and back to «Απόρρητο». No script of a third party runs here. -->
<div data-testid="consent-tools-page" class="flex flex-col gap-4">
	<p class="text-body-md text-muted-foreground">{m.consent_tools_intro({}, messageOptions)}</p>
	{#if ready}
		<ToolSections tools={consent.tools} bind:draft {locale} />
		<div
			class="mt-3 flex flex-col gap-2 border-t border-border pt-5 tablet:flex-row tablet:items-center tablet:gap-5"
		>
			<Button
				tone="contrast"
				bordered={false}
				label={m.consent_tools_save({}, messageOptions)}
				textClass="text-body-lg"
				class="w-full px-6 tablet:w-auto"
				data-testid="tools-save"
				onclick={save}
			/>
			<TextButton
				label={m.consent_tools_enable_all({}, messageOptions)}
				tone="foreground"
				underline
				textClass="text-body-md"
				class="justify-center"
				data-testid="tools-all"
				onclick={() => (draft = buildAcceptAllChoices(consent.tools))}
			/>
		</div>
	{:else}
		<div
			data-testid="consent-tools-loading"
			aria-busy="true"
			aria-label={m.consent_tools_title({}, messageOptions)}
			class="grid gap-4"
		>
			<div aria-hidden="true" class="grid gap-4">
				<Skeleton class="h-row-lg w-full rounded-md" />
				<Skeleton class="h-row-lg w-full rounded-md" />
				<Skeleton class="h-row-lg w-full rounded-md" />
			</div>
		</div>
	{/if}
</div>
