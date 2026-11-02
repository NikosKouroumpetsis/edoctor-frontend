<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import LanguageSwitcher, { type LanguageOption } from '$shared/ui/molecules/language-switcher';
	import ThemeToggle from '$shared/ui/molecules/theme-toggle';
	import type { FrameMessageOptions } from '../types';

	let {
		languageOptions,
		messageOptions
	}: { languageOptions: LanguageOption[]; messageOptions: FrameMessageOptions } = $props();
</script>

<!-- The two preferences of the «Ρυθμίσεις» window (U-16.1, U-17.4): the language (each option the same page in it)
     and the theme, each on its row; nowhere else in the navigation. -->
<div data-slot="preference-controls" class="flex flex-col">
	<div class="flex flex-row items-center justify-between gap-4 border-b border-border py-3">
		<span class="text-body-md font-medium text-foreground"
			>{m.settings_language({}, messageOptions)}</span
		>
		<LanguageSwitcher
			options={languageOptions}
			aria-label={m.settings_language({}, messageOptions)}
		/>
	</div>
	<div class="flex flex-row items-center justify-between gap-4 py-3">
		<span class="text-body-md font-medium text-foreground"
			>{m.settings_theme({}, messageOptions)}</span
		>
		<ThemeToggle
			lightLabel={m.theme_toggle_light({}, messageOptions)}
			darkLabel={m.theme_toggle_dark({}, messageOptions)}
		/>
	</div>
</div>
