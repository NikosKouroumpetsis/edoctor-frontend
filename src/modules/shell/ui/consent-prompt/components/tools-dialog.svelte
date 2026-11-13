<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$shared/ui/primitives/dialog';
	import { Button } from '$shared/ui/primitives/button';
	import type { ConsentToolFacts } from '$modules/shell/api/consent';
	import ToolSections from './tool-sections.svelte';

	let {
		open = $bindable(false),
		tools,
		initialChoices,
		locale,
		onSave
	}: {
		open?: boolean;
		/** The web's tools of the registry. */
		tools: ConsentToolFacts[];
		/** The choices the dialog starts from (stored answers, essentials on, the rest off). */
		initialChoices: Record<string, boolean>;
		locale: SupportedLocale;
		onSave: (choices: Record<string, boolean>) => void;
	} = $props();

	const messageOptions = $derived({ locale });
	let draft = $state<Record<string, boolean>>({});
	$effect.pre(() => {
		if (open) draft = { ...initialChoices };
	});
</script>

<!-- «Διαχείριση προτιμήσεων» (U-16.5): the application's categories from the registry, essentials locked on, every
     other tool off until the visitor turns it on (`ToolSections`, the one body the page of screen 62 draws too);
     «Αποθήκευση» keeps the choice. -->
<Dialog bind:open>
	<DialogContent
		size="md"
		closeLabel={m.consent_tools_close({}, messageOptions)}
		data-testid="consent-tools"
		class="max-h-sheet-lg overflow-y-auto"
	>
		<DialogHeader>
			<DialogTitle>{m.consent_tools_title({}, messageOptions)}</DialogTitle>
			<DialogDescription>{m.consent_tools_intro({}, messageOptions)}</DialogDescription>
		</DialogHeader>
		<ToolSections {tools} bind:draft {locale} />
		<DialogFooter>
			<Button
				tone="contrast"
				radius="sm"
				label={m.consent_tools_save({}, messageOptions)}
				onclick={() => onSave(draft)}
			/>
		</DialogFooter>
	</DialogContent>
</Dialog>
