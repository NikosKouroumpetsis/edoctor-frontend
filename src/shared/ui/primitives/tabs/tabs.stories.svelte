<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, userEvent } from 'storybook/test';
	import { Tabs, TabsList, TabsTrigger, TabsContent } from '$shared/ui/primitives/tabs';

	const { Story } = defineMeta({
		title: 'Primitives/Tabs',
		component: Tabs,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let value = $state('account');
	let vertical = $state('general');
</script>

<Story name="Default">
	{#snippet template()}
		<Tabs bind:value class="w-80">
			<TabsList>
				<TabsTrigger value="account">Account</TabsTrigger>
				<TabsTrigger value="password">Password</TabsTrigger>
			</TabsList>
			<TabsContent value="account">Account panel</TabsContent>
			<TabsContent value="password">Password panel</TabsContent>
		</Tabs>
	{/snippet}
</Story>

<Story name="Vertical">
	{#snippet template()}
		<Tabs bind:value={vertical} orientation="vertical" class="w-96">
			<TabsList>
				<TabsTrigger value="general">General</TabsTrigger>
				<TabsTrigger value="security">Security</TabsTrigger>
				<TabsTrigger value="billing">Billing</TabsTrigger>
			</TabsList>
			<TabsContent value="general">General settings</TabsContent>
			<TabsContent value="security">Security settings</TabsContent>
			<TabsContent value="billing">Billing settings</TabsContent>
		</Tabs>
	{/snippet}
</Story>

<Story
	name="Keyboard navigation"
	play={async ({ canvas }) => {
		const account = canvas.getByRole('tab', { name: 'Account' });
		account.focus();
		await userEvent.keyboard('{ArrowRight}');
		await expect(canvas.getByRole('tab', { name: 'Password' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
	}}
>
	{#snippet template()}
		<Tabs value="account" class="w-80">
			<TabsList>
				<TabsTrigger value="account">Account</TabsTrigger>
				<TabsTrigger value="password">Password</TabsTrigger>
			</TabsList>
			<TabsContent value="account">Account panel</TabsContent>
			<TabsContent value="password">Password panel</TabsContent>
		</Tabs>
	{/snippet}
</Story>
