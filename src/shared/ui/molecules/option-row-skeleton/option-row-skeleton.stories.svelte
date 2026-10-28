<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { OptionRowSkeleton } from '$shared/ui/molecules/option-row-skeleton';

	// The application's meta (`molecules/option-row-skeleton`): three rows.
	const { Story } = defineMeta({
		title: 'Molecules/OptionRowSkeleton',
		component: OptionRowSkeleton,
		tags: ['autodocs'],
		args: { count: 3 },
		argTypes: { count: { control: { type: 'number', min: 1, max: 8, step: 1 } } },
		render: template
	});
</script>

<!-- The list that waits says it is busy; the rows are decorative. -->
{#snippet template(args: Record<string, unknown>)}
	<div aria-busy="true"><OptionRowSkeleton {...args} /></div>
{/snippet}

<Story name="Playground" />

<Story name="One Row" args={{ count: 1 }} />
