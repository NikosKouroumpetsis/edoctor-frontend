<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Section } from '$shared/ui/molecules/section';
	import { IconButton } from '$shared/ui/primitives/icon-button';

	// The application's meta (`molecules/section`): a ruled «Τοποθεσία» over the muted body.
	const { Story } = defineMeta({
		title: 'Molecules/Section',
		component: Section,
		tags: ['autodocs'],
		args: { title: 'Τοποθεσία', variant: 'ruled', showRule: true },
		argTypes: {
			variant: { control: 'select', options: ['plain', 'ruled', 'divided'] },
			showRule: { control: 'boolean' }
		},
		render: template
	});
</script>

{#snippet body()}
	<div class="rounded-md bg-muted p-4">
		<p class="text-body-md text-foreground">Περιεχόμενο ενότητας</p>
	</div>
{/snippet}

{#snippet template(args: Record<string, unknown>)}
	<Section {...args}>{@render body()}</Section>
{/snippet}

<Story name="Ruled" />

<Story name="Ruled Without Rule" args={{ showRule: false }} />

<Story name="Divided" args={{ subtitle: 'Ανά επίσκεψη', title: 'Τιμή', variant: 'divided' }} />

<!-- The first group of a column: no divider above it. -->
<Story name="Divided First" args={{ showRule: false, title: 'Ταξινόμηση', variant: 'divided' }} />

<!-- A group whose control is its own header (an accordion): divider, no title. -->
<Story name="Divided Without Header" args={{ title: undefined, variant: 'divided' }} />

<Story name="Plain" args={{ subtitle: 'Κοντά σας', title: 'Δημοφιλή', variant: 'plain' }} />

<!-- The home rail's header (U-20, as the application's): its static circle right after the title. -->
<Story
	name="Plain With Trailing"
	args={{ subtitle: 'Κοντά σας', title: 'Δημοφιλή', variant: 'plain' }}
>
	{#snippet template(args)}
		<Section {...args}>
			{#snippet trailing()}
				<IconButton
					icon="arrow-forward"
					appearance="tint"
					surface="soft"
					size="xs"
					iconSize="sm"
					aria-label=""
					decorative
				/>
			{/snippet}
			{@render body()}
		</Section>
	{/snippet}
</Story>

<!-- Web only: the pressable circle beside the title and a control at the row's end (the rail's ‹ ›). -->
<Story name="Plain With End" args={{ title: 'Δημοφιλή', variant: 'plain' }}>
	{#snippet template(args)}
		<Section {...args}>
			{#snippet trailing()}
				<IconButton
					icon="arrow-forward"
					appearance="tint"
					surface="soft"
					size="xs"
					iconSize="sm"
					aria-label="Δείτε όλα"
					href="#all"
				/>
			{/snippet}
			{#snippet end()}
				<IconButton
					icon="chevron-forward"
					appearance="outline"
					size="xs"
					iconSize="md"
					aria-label="Επόμενα"
				/>
			{/snippet}
			{@render body()}
		</Section>
	{/snippet}
</Story>
