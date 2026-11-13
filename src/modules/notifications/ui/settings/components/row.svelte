<script lang="ts">
	import { TextButton } from '$shared/ui/primitives/text-button';
	import type { NotificationSettingsRow } from '$modules/notifications/types';

	let {
		row,
		changeLabel,
		onChange
	}: {
		row: NotificationSettingsRow;
		/** «Αλλαγή», in the page's language. */
		changeLabel: string;
		onChange: () => void;
	} = $props();

	const titleId = $derived(`notification-row-title-${row.category}`);
</script>

<!-- One kind of «Ειδοποιήσεις» (record §5.5, `60-notifications/not.css:3-6` `.n-row`, Airbnb's `w30`): its title 15 / 600,
     under it what is on («Ενεργό: Email, Ειδοποιήσεις εφαρμογής», «Πάντα: Email», «Ανενεργό») 14 muted, and under that
     the link «Αλλαγή» 14 / 600 underlined, in its 48 box — only where the account has a switch to flip. No colour under
     the pointer (U-100). Every word a text node. -->
<li
	data-testid={`notification-row-${row.category}`}
	data-change={row.canChange || undefined}
	class="border-b border-line py-4"
>
	<h4 id={titleId} class="text-body-md font-semibold text-foreground">{row.title}</h4>
	<p data-slot="notification-row-summary" class="mt-0.5 text-body-sm text-muted-foreground">
		{row.summary}
	</p>
	{#if row.canChange}
		<TextButton
			label={changeLabel}
			underline
			tone="foreground"
			textClass="text-body-sm underline-offset-3"
			aria-describedby={titleId}
			aria-haspopup="dialog"
			data-testid={`notification-change-${row.category}`}
			class="-mt-2 -mb-3.5"
			onclick={onChange}
		/>
	{/if}
</li>
