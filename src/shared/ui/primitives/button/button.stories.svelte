<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { BrandGoogle } from '$shared/ui/icons/brand-google';
	import { Button } from '$shared/ui/primitives/button';

	const tones = [
		'primary',
		'secondary',
		'accent',
		'contrast',
		'ghost',
		'muted',
		'outline'
	] as const;
	const radii = ['sm', 'md', 'lg', 'full'] as const;
	const sizes = ['default', 'lg'] as const;

	// The application's meta (`atoms/button`); each story stacks its buttons in a column 12 apart, as its decorator.
	const { Story } = defineMeta({
		title: 'Primitives/Button',
		component: Button,
		tags: ['autodocs'],
		args: {
			label: 'Συνέχεια',
			tone: 'primary',
			radius: 'md',
			labelCase: 'normal',
			bordered: true,
			loading: false
		},
		argTypes: {
			tone: { control: 'select', options: tones },
			radius: { control: 'select', options: radii },
			size: { control: 'radio', options: sizes },
			labelCase: { control: 'radio', options: ['uppercase', 'normal'] },
			bordered: { control: 'boolean' },
			disabled: { control: 'boolean' },
			loading: { control: 'boolean' },
			label: { control: 'text' }
		}
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="flex flex-col gap-3"><Button {...args} /></div>
	{/snippet}
</Story>

<Story name="Tones">
	{#snippet template(args)}
		<div class="flex flex-col gap-3">
			{#each tones as tone (tone)}
				<Button {...args} {tone} label={tone} />
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Radii">
	{#snippet template(args)}
		<div class="flex flex-col gap-3">
			{#each radii as radius (radius)}
				<Button {...args} {radius} label={radius} />
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template(args)}
		<div class="flex flex-col gap-3">
			{#each sizes as size (size)}
				<Button {...args} {size} label={size} />
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Loading">
	{#snippet template(args)}
		<div class="flex flex-col gap-3">
			{#each tones as tone (tone)}
				<Button {...args} {tone} label={tone} loading size="lg" />
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true, label: 'Μη διαθέσιμο' }}>
	{#snippet template(args)}
		<div class="flex flex-col gap-3"><Button {...args} /></div>
	{/snippet}
</Story>

<Story name="Borderless" args={{ bordered: false, tone: 'ghost' }}>
	{#snippet template(args)}
		<div class="flex flex-col gap-3"><Button {...args} /></div>
	{/snippet}
</Story>

<Story name="Uppercase Pill" args={{ labelCase: 'uppercase', label: 'Πληρωμή', radius: 'full' }}>
	{#snippet template(args)}
		<div class="flex flex-col gap-3"><Button {...args} /></div>
	{/snippet}
</Story>

<Story name="Uppercase Md" args={{ labelCase: 'uppercase', label: 'Αποθήκευση', radius: 'md' }}>
	{#snippet template(args)}
		<div class="flex flex-col gap-3"><Button {...args} /></div>
	{/snippet}
</Story>

<Story name="With Leading Mark">
	{#snippet template(args)}
		<div class="flex flex-col gap-3">
			<Button {...args} label="Συνέχεια με Google" labelCase="normal" radius="md" size="lg">
				{#snippet leading()}<BrandGoogle class="icon-md" />{/snippet}
			</Button>
		</div>
	{/snippet}
</Story>
