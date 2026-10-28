<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Container, type ContainerWidth } from '$shared/ui/molecules/container';

	const widths: ContainerWidth[] = [
		'narrow',
		'text',
		'form',
		'dialog',
		'content',
		'listing',
		'page',
		'wide'
	];

	// The application's meta (`molecules/container`): a `form` column in the zone's gutter on a card surface; the web
	// keeps the full-width canvas (the gutters are the page's) and its `as` tag.
	const { Story } = defineMeta({
		title: 'Molecules/Container',
		component: Container,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' },
		args: { width: 'form', gutter: 'zone', as: 'div' },
		argTypes: {
			width: { control: 'select', options: [...widths, 'full'] },
			gutter: { control: 'select', options: ['zone', 'none'] }
		},
		render: template
	});
</script>

{#snippet content(label: string)}
	<div class="rounded-md bg-muted p-4">
		<p class="text-body-md text-foreground">{label}</p>
	</div>
{/snippet}

{#snippet template(args: Record<string, unknown>)}
	<div class="bg-card">
		<Container {...args}>{@render content('Στήλη περιεχομένου')}</Container>
	</div>
{/snippet}

<Story name="Form" />

<!-- The search results column: a form-wide phone column, `content` from the tablet up. -->
<Story name="Form Then Content" args={{ widthByZone: { tablet: 'content' } }} />

<!-- The profile page: no cap on a phone, `content` from the tablet, no gutter. -->
<Story
	name="Full Then Content"
	args={{ gutter: 'none', width: 'full', widthByZone: { tablet: 'content' } }}
/>

<Story name="Narrow" args={{ width: 'narrow' }} />

<Story name="Listing" args={{ width: 'listing' }} />

<Story name="Without Gutter" args={{ gutter: 'none' }} />

<!-- One column per width of the scale, each labelled with its key: on a phone every one from 360 up is the screen wide. -->
<Story name="Widths">
	{#snippet template(args)}
		<div class="flex flex-col gap-3">
			{#each widths as width (width)}
				<div class="bg-card">
					<Container {...args} {width}>{@render content(width)}</Container>
				</div>
			{/each}
		</div>
	{/snippet}
</Story>

<!-- Web only (U-04.1, no device of the application is that wide): the page column is 1440 and, from 1920 (z1920),
     Airbnb's 1920 in the centre. -->
<Story name="Page In Wide Zone" args={{ width: 'page' }} />
