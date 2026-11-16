<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { AmountField } from '$shared/ui/molecules/amount-field';

	const { Story } = defineMeta({
		title: 'Molecules/AmountField',
		component: AmountField,
		tags: ['autodocs'],
		args: {
			value: '75',
			label: 'Τελική τιμή σε ευρώ',
			symbol: '€',
			maxLength: 12,
			onInput: () => {}
		}
	});
</script>

<script lang="ts">
	let typed = $state('75');
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-form">
			<AmountField {...args} value={typed} onInput={(value) => (typed = value)} />
		</div>
	{/snippet}
</Story>

<Story
	name="With Error"
	args={{ value: '75,505', error: 'Γράψτε ένα ποσό με έως δύο δεκαδικά.' }}
/>
