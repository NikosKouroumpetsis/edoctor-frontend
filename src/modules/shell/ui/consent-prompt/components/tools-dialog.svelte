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
	import { Switch } from '$shared/ui/primitives/switch';
	import type { ConsentCategory, ConsentToolFacts } from '$modules/shell/api/consent';
	import { consentCategoryOrder } from '$modules/shell/lib/consent';

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

	const titles = $derived<Record<ConsentCategory, string>>({
		essential: m.consent_category_essential_title({}, messageOptions),
		functional: m.consent_category_functional_title({}, messageOptions),
		analytics: m.consent_category_analytics_title({}, messageOptions),
		marketing: m.consent_category_marketing_title({}, messageOptions)
	});
	const descriptions = $derived<Record<ConsentCategory, string>>({
		essential: m.consent_category_essential_body({}, messageOptions),
		functional: m.consent_category_functional_body({}, messageOptions),
		analytics: m.consent_category_analytics_body({}, messageOptions),
		marketing: m.consent_category_marketing_body({}, messageOptions)
	});
	// A category with no tool draws nothing: a section appears by itself the day a tool is registered in it.
	const sections = $derived(
		consentCategoryOrder
			.map((category) => ({ category, tools: tools.filter((tool) => tool.category === category) }))
			.filter((section) => section.tools.length > 0)
	);
</script>

<!-- «Διαχείριση προτιμήσεων» (U-16.5): the application's categories from the registry, essentials locked on, every
     other tool off until the visitor turns it on; «Αποθήκευση» keeps the choice. -->
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
		{#each sections as section (section.category)}
			<section class="flex flex-col gap-2 border-t border-border pt-4">
				<h3 class="text-title-xs font-semibold text-foreground">{titles[section.category]}</h3>
				<p class="text-body-sm text-muted-foreground">{descriptions[section.category]}</p>
				{#each section.tools as tool (tool.id)}
					{@const words = tool.translations[locale]}
					<div class="flex flex-row items-center justify-between gap-4">
						<div class="flex min-w-0 flex-col">
							<span class="text-body-sm font-semibold text-foreground">{words.title}</span>
							<span class="text-body-sm text-muted-foreground">{words.description}</span>
						</div>
						{#if section.category === 'essential'}
							<span class="shrink-0 text-label-lg text-muted-foreground"
								>{m.consent_tools_always_on({}, messageOptions)}</span
							>
						{:else}
							<Switch
								checked={draft[tool.id] === true}
								aria-label={words.title}
								onCheckedChange={(checked) => (draft = { ...draft, [tool.id]: checked })}
							/>
						{/if}
					</div>
				{/each}
			</section>
		{/each}
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
