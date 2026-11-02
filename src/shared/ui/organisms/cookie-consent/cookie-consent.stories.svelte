<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, userEvent, waitFor } from 'storybook/test';
	import { CookieConsent } from '$shared/ui/organisms/cookie-consent';

	const at = (value: string) => ({ viewport: { value, isRotated: false } });

	const copy = {
		title: 'Βοηθήστε μας να βελτιώσουμε την εμπειρία σας',
		description: [
			'Χρησιμοποιούμε εργαλεία για να λειτουργεί ο ιστότοπος. Εάν τα αποδεχτείτε, συμφωνείτε με την ',
			{ label: 'πολιτική για τα cookies', href: '#cookies' },
			' και την ',
			{ label: 'πολιτική απορρήτου', href: '#privacy' },
			'.'
		],
		acceptLabel: 'Αποδοχή όλων',
		rejectLabel: 'Μόνο απαραίτητα',
		manageLabel: 'Διαχείριση προτιμήσεων',
		'aria-label': 'Συναίνεση cookies'
	};

	const { Story } = defineMeta({
		title: 'Organisms/CookieConsent',
		component: CookieConsent,
		tags: ['autodocs']
	});
</script>

<!-- Airbnb's card: the words with their links, the two dark buttons and the link-styled third way, stacked. -->
<Story name="Default">
	{#snippet template()}
		<div class="max-w-content"><CookieConsent {...copy} onManage={() => {}} /></div>
	{/snippet}
</Story>

<!-- From 744 the three ways form one row. -->
<Story name="On the tablet" globals={at('z744')}>
	{#snippet template()}
		<div class="max-w-consent-card-w"><CookieConsent {...copy} onManage={() => {}} /></div>
	{/snippet}
</Story>

<!-- Plain words and two ways only (no categories to manage). -->
<Story name="Two ways">
	{#snippet template()}
		<div class="max-w-content">
			<CookieConsent
				title="Σεβόμαστε το απόρρητό σας"
				description="Χρησιμοποιούμε cookies για να βελτιώνουμε την εμπειρία σας."
				acceptLabel="Αποδοχή όλων"
				rejectLabel="Μόνο απαραίτητα"
				aria-label="Συναίνεση cookies"
			/>
		</div>
	{/snippet}
</Story>

<Story
	name="Accept Dismisses"
	play={async ({ canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Αποδοχή όλων' }));
		await waitFor(() =>
			expect(canvas.queryByRole('region', { name: 'Συναίνεση cookies' })).not.toBeInTheDocument()
		);
	}}
>
	{#snippet template()}
		<div class="max-w-content"><CookieConsent {...copy} onManage={() => {}} /></div>
	{/snippet}
</Story>
