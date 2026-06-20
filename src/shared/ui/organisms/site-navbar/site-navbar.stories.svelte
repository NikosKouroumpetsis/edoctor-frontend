<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, userEvent, screen } from 'storybook/test';
	import { SiteNavbar } from '$shared/ui/organisms/site-navbar';

	const { Story } = defineMeta({
		title: 'Organisms/Site navbar',
		component: SiteNavbar,
		tags: ['autodocs']
	});
</script>

<Story name="Default">
	{#snippet template()}
		<SiteNavbar />
	{/snippet}
</Story>

<Story
	name="Account menu"
	play={async ({ canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Account menu' }));
		await expect(await screen.findByText('Appointments')).toBeVisible();
	}}
>
	{#snippet template()}
		<SiteNavbar />
	{/snippet}
</Story>

<!--
	The hamburger ("Open menu") + mobile sheet are shown below the `lg` breakpoint.
	Switch the canvas to a small viewport to exercise it (no play here — it is
	viewport-dependent rather than interaction-dependent).
-->
<Story name="Mobile sheet">
	{#snippet template()}
		<SiteNavbar />
	{/snippet}
</Story>
