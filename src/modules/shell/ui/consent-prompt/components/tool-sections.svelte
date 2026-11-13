<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Switch } from '$shared/ui/primitives/switch';
	import type { ConsentCategory, ConsentToolFacts } from '$modules/shell/api/consent';
	import { consentCategoryOrder } from '$modules/shell/lib/consent';

	let {
		tools,
		draft = $bindable({}),
		locale
	}: {
		/** The web's tools of the registry. */
		tools: ConsentToolFacts[];
		/** The choices being made, by tool id: essentials on, the rest as the visitor sets them. */
		draft?: Record<string, boolean>;
		locale: SupportedLocale;
	} = $props();

	const messageOptions = $derived({ locale });
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

<!-- The categories of the consent (U-16.5), ONE body for the window «Διαχείριση προτιμήσεων» and for the page «Εργαλεία
     τρίτων και cookies» (wave 4.5, screen 62 — never a copy): the application's categories from the registry, essentials
     locked on («Πάντα ενεργό»), every other tool a switch that is off until the visitor turns it on. A tool's words are
     the registry's, drawn as text (U-65.6). -->
{#each sections as section (section.category)}
	<section
		data-testid={`consent-category-${section.category}`}
		class="flex flex-col gap-2 border-t border-border pt-4"
	>
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
						data-testid={`consent-tool-${tool.id}`}
						onCheckedChange={(checked) => (draft = { ...draft, [tool.id]: checked })}
					/>
				{/if}
			</div>
		{/each}
	</section>
{/each}
