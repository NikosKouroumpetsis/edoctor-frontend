<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, userEvent } from 'storybook/test';
	import { CookieConsent } from '$shared/ui/organisms/cookie-consent';

	const copy = {
		title: 'Σεβόμαστε το απόρρητό σας',
		description:
			'Χρησιμοποιούμε cookies για να βελτιώνουμε την εμπειρία σας. Μπορείτε να τα αποδεχτείτε όλα ή μόνο τα απαραίτητα.',
		acceptLabel: 'Αποδοχή όλων',
		rejectLabel: 'Μόνο τα απαραίτητα',
		'aria-label': 'Συναίνεση cookies'
	};

	const { Story } = defineMeta({
		title: 'Organisms/CookieConsent',
		component: CookieConsent,
		tags: ['autodocs']
	});
</script>

<Story name="Default">
	{#snippet template()}
		<div class="max-w-content"><CookieConsent {...copy} /></div>
	{/snippet}
</Story>

<Story
	name="Accept Dismisses"
	play={async ({ canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Αποδοχή όλων' }));
		await expect(
			canvas.queryByRole('region', { name: 'Συναίνεση cookies' })
		).not.toBeInTheDocument();
	}}
>
	{#snippet template()}
		<div class="max-w-content"><CookieConsent {...copy} /></div>
	{/snippet}
</Story>
