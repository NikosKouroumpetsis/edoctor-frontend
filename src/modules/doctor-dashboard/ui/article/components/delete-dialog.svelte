<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { Button } from '$shared/ui/primitives/button';
	import { ActionDialog } from '$shared/ui/templates/action-dialog';

	let {
		open = $bindable(false),
		locale,
		published,
		deleting,
		failure,
		onConfirm,
		onCancel
	}: {
		open?: boolean;
		locale: SupportedLocale;
		/** A published article leaves the public page too: the window says so. */
		published: boolean;
		deleting: boolean;
		failure: string | null;
		onConfirm: () => void;
		onCancel: () => void;
	} = $props();

	const options = $derived({ locale });

	function cancel() {
		if (deleting) return;
		open = false;
		onCancel();
	}
</script>

<!-- 🔴 D-W52-95 / 103 (`sw.js` `arSheet`): «Διαγραφή άρθρου;» is ALWAYS asked, in the one small window (the shared
     `ActionDialog`, the precedent of 83 / 84) — a published article «φεύγει από τη σελίδα σας και από τα «Άρθρα» του
     eDoctor». Every word a text node (U-65.6). -->
<ActionDialog
	bind:open
	title={m.doctor_my_article_delete_title({}, options)}
	closeLabel={m.booking_close({}, options)}
	onDismiss={cancel}
	testId="doctor-article-delete-dialog"
>
	<p data-testid="doctor-article-delete-body" class="text-body-md text-muted-foreground">
		{published
			? m.doctor_my_article_delete_body_published({}, options)
			: m.doctor_my_article_delete_body({}, options)}
	</p>
	{#if failure}
		<div class="mt-3">
			<InlineNotice variant="danger" message={failure} testId="doctor-article-delete-failure" />
		</div>
	{/if}
	{#snippet footer()}
		<Button
			tone="outline"
			hover={false}
			label={m.doctor_photos_cancel({}, options)}
			class="flex-1"
			textClass="text-body-lg"
			onclick={cancel}
			data-testid="doctor-article-delete-cancel"
		/>
		<Button
			tone="contrast"
			bordered={false}
			hover={false}
			label={m.doctor_photos_delete({}, options)}
			loading={deleting}
			class="flex-1"
			textClass="text-body-lg"
			onclick={onConfirm}
			data-testid="doctor-article-delete-confirm"
		/>
	{/snippet}
</ActionDialog>
