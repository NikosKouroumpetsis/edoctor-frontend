<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Spinner } from '$shared/ui/primitives/spinner';

	const tones = ['primary', 'foreground', 'muted', 'accent'] as const;
	const onColorTones = [
		{ surface: 'rounded-md bg-primary p-4', tone: 'primary-foreground' },
		{ surface: 'rounded-md bg-secondary p-4', tone: 'secondary-foreground' }
	] as const;
	const sizes = ['sm', 'md', 'lg'] as const;

	// The application's meta (`atoms/spinner`); the web names it «Φόρτωση», the application's default label.
	const { Story } = defineMeta({
		title: 'Primitives/Spinner',
		component: Spinner,
		tags: ['autodocs'],
		args: { tone: 'primary', size: 'md', label: 'Φόρτωση' },
		argTypes: {
			tone: {
				control: 'select',
				options: [...tones, ...onColorTones.map((entry) => entry.tone)]
			},
			size: { control: 'radio', options: sizes }
		}
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<Spinner {...args} />
	{/snippet}
</Story>

<Story name="Tones">
	{#snippet template(args)}
		<div class="flex flex-row items-center gap-4">
			{#each tones as tone (tone)}
				<Spinner {...args} {tone} />
			{/each}
		</div>
	{/snippet}
</Story>

<!-- The on-color tones are only ever readable INSIDE a filled surface, so they are shown on one. -->
<Story name="On Filled Surfaces">
	{#snippet template(args)}
		<div class="flex flex-row items-center gap-4">
			{#each onColorTones as entry (entry.tone)}
				<div class={entry.surface}><Spinner {...args} tone={entry.tone} /></div>
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template(args)}
		<div class="flex flex-row items-center gap-4">
			{#each sizes as size (size)}
				<Spinner {...args} {size} />
			{/each}
		</div>
	{/snippet}
</Story>
