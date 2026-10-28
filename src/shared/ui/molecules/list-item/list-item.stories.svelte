<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { ListItem } from '$shared/ui/molecules/list-item';
	import { Avatar, AvatarFallback } from '$shared/ui/primitives/avatar';
	import { Badge } from '$shared/ui/primitives/badge';

	const noop = () => {};

	// The application's meta (`molecules/list-item`): a doctor's row that acts.
	const { Story } = defineMeta({
		title: 'Molecules/ListItem',
		component: ListItem,
		tags: ['autodocs'],
		args: { title: 'Δρ. Μαρία Παπαδοπούλου', subtitle: 'Καρδιολόγος · Αθήνα', onclick: noop },
		argTypes: {
			title: { control: 'text' },
			subtitle: { control: 'text' },
			disabled: { control: 'boolean' }
		}
	});
</script>

{#snippet avatar(initials: string)}
	<Avatar><AvatarFallback>{initials}</AvatarFallback></Avatar>
{/snippet}

{#snippet chevron()}
	<Ionicon name="chevron-forward" class="icon-md text-muted-foreground" />
{/snippet}

<Story name="Playground" />

<Story name="With Leading Avatar">
	{#snippet template(args)}
		<ListItem {...args} trailing={chevron}>
			{#snippet leading()}{@render avatar('ΜΠ')}{/snippet}
		</ListItem>
	{/snippet}
</Story>

<Story name="With Trailing Badge">
	{#snippet template(args)}
		<ListItem {...args}>
			{#snippet leading()}{@render avatar('ΝΚ')}{/snippet}
			{#snippet trailing()}<Badge label="Νέο" tone="success" size="sm" />{/snippet}
		</ListItem>
	{/snippet}
</Story>

<Story name="Static" args={{ onclick: undefined, subtitle: 'Μη διαδραστικό στοιχείο' }} />

<Story name="Disabled" args={{ disabled: true }} />

<Story name="List">
	{#snippet template(args)}
		<div class="flex flex-col gap-1">
			<ListItem {...args} title="Προφίλ" subtitle="Διαχείριση λογαριασμού">
				{#snippet leading()}{@render avatar('ΑΒ')}{/snippet}
			</ListItem>
			<ListItem {...args} title="Ραντεβού" subtitle="Δείτε τα επερχόμενα">
				{#snippet leading()}{@render avatar('ΡΑ')}{/snippet}
			</ListItem>
			<ListItem {...args} title="Ρυθμίσεις" subtitle="Γλώσσα και θέμα">
				{#snippet leading()}{@render avatar('ΡΥ')}{/snippet}
			</ListItem>
		</div>
	{/snippet}
</Story>
