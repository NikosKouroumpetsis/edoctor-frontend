<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { FloatingLabel } from '$shared/ui/primitives/floating-label';

	const sizes = ['default', 'lg', 'xl'] as const;

	// The application's meta (`atoms/floating-label`). The label sits on the control's OUTER edge, so the box is a
	// sibling (as `TextField` composes it); «Inside Border» puts the label in the bordered box (`PhoneFieldInline`'s).
	const { Story } = defineMeta({
		title: 'Primitives/FloatingLabel',
		component: FloatingLabel,
		tags: ['autodocs'],
		args: {
			label: 'Email',
			floated: false,
			focused: false,
			error: false,
			insideBorder: false,
			size: 'default'
		},
		argTypes: {
			label: { control: 'text' },
			floated: { control: 'boolean' },
			focused: { control: 'boolean' },
			error: { control: 'boolean' },
			insideBorder: { control: 'boolean' },
			size: { control: 'radio', options: sizes }
		}
	});
</script>

<Story name="Resting">
	{#snippet template(args)}
		<div class="relative h-control-lg w-full">
			<div class="absolute inset-0 rounded-md border border-input bg-card"></div>
			<FloatingLabel {...args} />
		</div>
	{/snippet}
</Story>

<Story name="Floated" args={{ floated: true, focused: true }}>
	{#snippet template(args)}
		<div class="relative h-control-lg w-full">
			<div class="absolute inset-0 rounded-md border border-input bg-card"></div>
			<FloatingLabel {...args} />
		</div>
	{/snippet}
</Story>

<Story name="Floated Filled" args={{ floated: true, focused: false }}>
	{#snippet template(args)}
		<div class="relative h-control-lg w-full">
			<div class="absolute inset-0 rounded-md border border-input bg-card"></div>
			<FloatingLabel {...args} />
		</div>
	{/snippet}
</Story>

<Story name="Error" args={{ floated: true, error: true }}>
	{#snippet template(args)}
		<div class="relative h-control-lg w-full">
			<div class="absolute inset-0 rounded-md border border-input bg-card"></div>
			<FloatingLabel {...args} />
		</div>
	{/snippet}
</Story>

<Story name="Inside Border" args={{ floated: true, insideBorder: true }}>
	{#snippet template(args)}
		<div class="relative h-control-lg w-full rounded-md border border-input bg-card">
			<FloatingLabel {...args} />
		</div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template(args)}
		<div class="flex flex-col gap-4">
			{#each sizes as size (size)}
				<div class="relative h-control-lg w-full">
					<div class="absolute inset-0 rounded-md border border-input bg-card"></div>
					<FloatingLabel {...args} {size} floated label={size} />
				</div>
			{/each}
		</div>
	{/snippet}
</Story>
