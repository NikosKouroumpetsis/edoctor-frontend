<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { cn } from '$shared/lib/utils';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Button } from '$shared/ui/primitives/button';
	import type { ContactFlow } from '../hooks/use-contact.svelte';

	let {
		flow,
		locale,
		class: className
	}: { flow: ContactFlow; locale: SupportedLocale; class?: string } = $props();
</script>

{#snippet glyph()}
	<Ionicon name="chatbubbles-outline" class="icon-md shrink-0 text-foreground" />
{/snippet}

<!-- 🔴 U-84.6 (the button of screen 16 Π9): the muted 48, the whole width below 744, 288 from it. Always drawn: it asks the
     server nothing until it is pressed (D-103). -->
<Button
	tone="muted"
	bordered={false}
	label={m.messages_contact({}, { locale })}
	leading={glyph}
	loading={flow.asking}
	onclick={flow.press}
	textClass="text-body-md"
	data-testid="doctor-contact"
	class={cn('w-full gap-2 tablet:w-auto tablet:min-w-contact-w tablet:self-start', className)}
/>
