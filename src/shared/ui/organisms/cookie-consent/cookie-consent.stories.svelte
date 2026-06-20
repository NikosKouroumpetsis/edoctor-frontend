<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, userEvent } from 'storybook/test';
	import { CookieConsent } from '$shared/ui/organisms/cookie-consent';

	const { Story } = defineMeta({
		title: 'Organisms/Cookie consent',
		component: CookieConsent,
		tags: ['autodocs']
	});
</script>

<Story name="Default">
	{#snippet template()}
		<div class="max-w-2xl"><CookieConsent /></div>
	{/snippet}
</Story>

<Story
	name="Accept dismisses"
	play={async ({ canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Accept all' }));
		await expect(canvas.queryByRole('region', { name: 'Cookie consent' })).not.toBeInTheDocument();
	}}
>
	{#snippet template()}
		<div class="max-w-2xl"><CookieConsent /></div>
	{/snippet}
</Story>
