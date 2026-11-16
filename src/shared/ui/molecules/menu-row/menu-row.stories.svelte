<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { MenuRow } from '$shared/ui/molecules/menu-row';

	const { Story } = defineMeta({
		title: 'Molecules/MenuRow',
		component: MenuRow,
		tags: ['autodocs'],
		args: { icon: 'settings-outline', label: 'Ρυθμίσεις λογαριασμού', href: '#settings' }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-form"><MenuRow {...args} /></div>
	{/snippet}
</Story>

<Story name="A menu">
	{#snippet template()}
		<div class="flex w-full max-w-form flex-col">
			<MenuRow icon="notifications-outline" label="Ειδοποιήσεις" href="#notifications" />
			<MenuRow icon="help-circle-outline" label="Κέντρο βοήθειας" href="#help" />
			<MenuRow icon="log-out-outline" label="Αποσύνδεση" chevron={false} onclick={() => {}} />
		</div>
	{/snippet}
</Story>
