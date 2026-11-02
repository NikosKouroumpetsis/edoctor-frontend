<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { LanguageOption } from '$shared/ui/molecules/language-switcher';
	import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$shared/ui/primitives/dialog';
	import type { FrameMessageOptions } from '../types';
	import PreferenceControls from './preference-controls.svelte';

	let {
		open = $bindable(false),
		languageOptions,
		messageOptions
	}: {
		open?: boolean;
		languageOptions: LanguageOption[];
		messageOptions: FrameMessageOptions;
	} = $props();
</script>

<!-- «Ρυθμίσεις» (U-16.1, U-17.4): the kit's dialog with the language and the theme, reached from the menu (from
     744) and from the footer's language (every width), for a guest too. -->
<Dialog bind:open>
	<DialogContent closeLabel={m.settings_close({}, messageOptions)} data-testid="settings-dialog">
		<DialogHeader>
			<DialogTitle>{m.account_menu_settings({}, messageOptions)}</DialogTitle>
		</DialogHeader>
		<PreferenceControls {languageOptions} {messageOptions} />
	</DialogContent>
</Dialog>
