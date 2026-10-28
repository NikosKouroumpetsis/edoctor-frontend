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

<LanguageSwitcher options={languageOptions} />
<ThemeToggle
	lightLabel={m.theme_toggle_light({}, messageOptions)}
	darkLabel={m.theme_toggle_dark({}, messageOptions)}
/>
