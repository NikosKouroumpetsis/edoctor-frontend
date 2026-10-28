<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ResponsiveGrid, type GridGap } from '$shared/ui/molecules/responsive-grid';

	const gaps: GridGap[] = ['inline', 'rail', 'list', 'grid', 'section'];
	const labels = (count: number) =>
		Array.from({ length: count }, (_, index) => `Κελί ${index + 1}`);

	// The application's meta (`molecules/responsive-grid`): three columns 12 apart, five bordered cells; the web
	// names the list.
	const { Story } = defineMeta({
		title: 'Molecules/ResponsiveGrid',
		component: ResponsiveGrid,
		tags: ['autodocs'],
		args: { columns: 3, gap: 'rail', items: labels(5), 'aria-label': 'Κελιά' },
		argTypes: {
			gap: { control: 'select', options: gaps },
			columns: { control: 'select', options: [1, 2, 3, 4, 5, 6] }
		},
		render: template
	});
</script>

{#snippet cell(label: string)}
	<div
		class="flex min-h-control-xl flex-col justify-center rounded-md border border-border/70 px-3 py-2.5"
	>
		<p class="text-body-md text-foreground">{label}</p>
	</div>
{/snippet}

{#snippet template(args: Record<string, unknown>)}
	<ResponsiveGrid
		{...args}
		items={(args.items as string[]) ?? []}
		keyExtractor={(item) => item}
		renderItem={cell}
	/>
{/snippet}

<!-- The profile's date cards: three columns, the short last row as it falls. -->
<Story name="Three Columns" />

<!-- The profile's hours: four columns. -->
<Story name="Four Columns" args={{ columns: 4, items: labels(9) }} />

<Story name="By Zone" args={{ columns: { phone: 2, tablet: 3, laptop: 4 }, items: labels(8) }} />

<Story name="Wide Gap" args={{ gap: 'grid', items: labels(6) }} />

<Story name="One Item" args={{ items: labels(1) }} />

<!-- One three-cell grid per gap of the scale, captioned with its key. -->
<Story name="Gaps">
	{#snippet template(args)}
		<div class="flex flex-col gap-section">
			{#each gaps as gap (gap)}
				<div class="flex flex-col gap-2">
					<p class="text-label-lg text-muted-foreground">{gap}</p>
					<ResponsiveGrid
						{...args}
						columns={3}
						{gap}
						items={labels(3)}
						keyExtractor={(item) => item}
						renderItem={cell}
						aria-label={gap}
					/>
				</div>
			{/each}
		</div>
	{/snippet}
</Story>
