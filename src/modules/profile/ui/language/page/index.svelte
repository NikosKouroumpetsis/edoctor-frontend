<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { theme } from '$shared/preferences/theme';
	import { EditableRow } from '$shared/ui/molecules/editable-row';
	import OptionList from '../components/option-list.svelte';
	import { usePreferences } from '../hooks/use-preferences.svelte';
	import { buildLanguageOptions, buildThemeOptions, languageName, themeName } from '../lib/options';
	import type { LanguagePageProps } from '../types';

	let props: LanguagePageProps = $props();

	const options = $derived({ locale: props.locale });
	const preferences = usePreferences(() => props);
	const languageTitle = $derived(m.settings_language({}, options));
	const themeTitle = $derived(m.settings_theme({}, options));
	const actionLabel = $derived(m.profile_account_settings_change({}, options));
	const closeLabel = $derived(m.common_close({}, options));
</script>

<!-- Wave 4.5 · screen 61 «Γλώσσα και θέμα» (record §5.6, `61-language/lang.js`): two rows «title · value · Αλλαγή». A
     row opens IN its place — its choices one under the other, «Κλείσιμο» on the right — while the other fades; a choice
     holds at its press and the row closes. 🔴 D-W45-03: the language has two choices, the theme three («Σύστημα» first).
     A guest's language is the device's alone, and the help says so. -->
<div data-testid="settings-language">
	<EditableRow
		title={languageTitle}
		value={languageName(props.locale)}
		help={props.member
			? m.profile_account_settings_language_help({}, options)
			: m.profile_account_settings_language_help_guest({}, options)}
		{actionLabel}
		{closeLabel}
		open={preferences.openRow === 'language'}
		dimmed={preferences.openRow === 'theme' || preferences.changing}
		onOpenChange={(open) => preferences.setOpen('language', open)}
		testId="settings-row-language"
	>
		<OptionList
			label={languageTitle}
			value={props.locale}
			options={buildLanguageOptions()}
			onChoose={(value) => void preferences.chooseLanguage(value)}
			testId="settings-option"
		/>
	</EditableRow>
	<EditableRow
		title={themeTitle}
		value={themeName(theme.preference, options)}
		help={m.profile_account_settings_theme_help({}, options)}
		{actionLabel}
		{closeLabel}
		open={preferences.openRow === 'theme'}
		dimmed={preferences.openRow === 'language' || preferences.changing}
		onOpenChange={(open) => preferences.setOpen('theme', open)}
		testId="settings-row-theme"
	>
		<OptionList
			label={themeTitle}
			value={theme.preference}
			options={buildThemeOptions(options)}
			onChoose={(value) => preferences.chooseTheme(value)}
			testId="settings-option"
		/>
	</EditableRow>
</div>
