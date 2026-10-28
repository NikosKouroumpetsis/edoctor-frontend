<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ResultsCount } from '$shared/ui/molecules/results-count';

	const { Story } = defineMeta({
		title: 'Molecules/ResultsCount',
		component: ResultsCount,
		tags: ['autodocs'],
		args: { title: '128 αποτελέσματα', supporting: 'Με τα κριτήρια που επιλέξατε.' }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-form"><ResultsCount {...args} /></div>
	{/snippet}
</Story>

<Story name="Title only">
	{#snippet template()}
		<div class="w-full max-w-form"><ResultsCount title="Κανένα αποτέλεσμα" /></div>
	{/snippet}
</Story>

<Story name="Lower bound">
	{#snippet template()}
		<div class="w-full max-w-form">
			<ResultsCount title="1.000+ αποτελέσματα" supporting="Με τα κριτήρια που επιλέξατε." />
		</div>
	{/snippet}
</Story>

<Story name="In the dark theme" globals={{ theme: 'dark' }}>
	{#snippet template()}
		<div class="w-full max-w-form bg-background p-card">
			<ResultsCount title="128 αποτελέσματα" supporting="Με τα κριτήρια που επιλέξατε." />
		</div>
	{/snippet}
</Story>
