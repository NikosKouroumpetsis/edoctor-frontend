<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { StatHighlight } from '$shared/ui/molecules/stat-highlight';

	const { Story } = defineMeta({
		title: 'Molecules/StatHighlight',
		component: StatHighlight,
		tags: ['autodocs'],
		args: { value: '12', title: 'Δημοσιεύσεις', body: 'Άρθρα για την υγεία της καρδιάς' }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-narrow"><StatHighlight {...args} /></div>
	{/snippet}
</Story>

<Story name="Without a body">
	{#snippet template()}
		<StatHighlight value="3" title="Άρθρα" />
	{/snippet}
</Story>

<Story name="A large value">
	{#snippet template()}
		<div class="w-full max-w-narrow">
			<StatHighlight value="1.240" title="Αναγνώσεις" body="Τον τελευταίο μήνα" />
		</div>
	{/snippet}
</Story>

<Story name="In the dark theme" globals={{ theme: 'dark' }}>
	{#snippet template()}
		<div class="w-full max-w-narrow bg-background p-card">
			<StatHighlight value="12" title="Δημοσιεύσεις" body="Άρθρα για την υγεία της καρδιάς" />
		</div>
	{/snippet}
</Story>
