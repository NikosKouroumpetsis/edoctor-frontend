<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ButtonStack } from '$shared/ui/molecules/button-stack';

	const noop = () => {};

	const { Story } = defineMeta({
		title: 'Molecules/ButtonStack',
		component: ButtonStack,
		tags: ['autodocs'],
		args: {
			actions: [
				{ id: 'reject', label: 'Απόρριψη', onPress: noop },
				{ id: 'move', label: 'Αλλαγή', onPress: noop },
				{ id: 'confirm', label: 'Επιβεβαίωση', emphasis: true, onPress: noop }
			]
		}
	});
</script>

<Story name="Three answers">
	{#snippet template(args)}
		<div class="w-full max-w-form"><ButtonStack {...args} /></div>
	{/snippet}
</Story>

<Story name="Two answers">
	{#snippet template()}
		<div class="w-full max-w-form">
			<ButtonStack
				actions={[
					{ id: 'no', label: 'Δεν ήρθε', onPress: noop },
					{ id: 'yes', label: 'Ολοκληρώθηκε', emphasis: true, onPress: noop }
				]}
			/>
		</div>
	{/snippet}
</Story>

<Story name="With a link">
	{#snippet template()}
		<div class="w-full max-w-form">
			<ButtonStack
				actions={[
					{ id: 'reject', label: 'Απόρριψη', href: '#' },
					{ id: 'yes', label: 'Επιβεβαίωση', emphasis: true, onPress: noop }
				]}
			/>
		</div>
	{/snippet}
</Story>

<Story name="One, busy">
	{#snippet template()}
		<div class="w-full max-w-form">
			<ButtonStack
				actions={[
					{ id: 'yes', label: 'Επιβεβαίωση', emphasis: true, loading: true, onPress: noop }
				]}
			/>
		</div>
	{/snippet}
</Story>
