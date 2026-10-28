<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ErrorState } from '$shared/ui/molecules/error-state';

	const { Story } = defineMeta({
		title: 'Molecules/ErrorState',
		component: ErrorState,
		tags: ['autodocs'],
		args: {
			title: 'Δεν ήταν δυνατή η φόρτωση',
			description: 'Κάτι διέκοψε τη φόρτωση. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.',
			actionLabel: 'Δοκιμάστε ξανά',
			onActionPress: () => {},
			testId: 'demo-error',
			variant: 'plain'
		},
		argTypes: { variant: { control: 'inline-radio', options: ['plain', 'framed'] } }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-content"><ErrorState {...args} /></div>
	{/snippet}
</Story>

<Story name="Offline">
	{#snippet template()}
		<div class="w-full max-w-content">
			<ErrorState
				title="Χωρίς σύνδεση"
				description="Φαίνεται ότι είστε εκτός σύνδεσης."
				actionLabel="Δοκιμάστε ξανά"
				onActionPress={() => {}}
			/>
		</div>
	{/snippet}
</Story>

<Story name="Framed">
	{#snippet template()}
		<div class="w-full max-w-content bg-background p-card">
			<ErrorState
				title="Δεν ήταν δυνατή η φόρτωση"
				description="Κάτι διέκοψε τη φόρτωση. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά."
				actionLabel="Δοκιμάστε ξανά"
				onActionPress={() => {}}
				variant="framed"
			/>
		</div>
	{/snippet}
</Story>

<Story name="In the dark theme" globals={{ theme: 'dark' }}>
	{#snippet template()}
		<div class="flex w-full max-w-content flex-col gap-section bg-background p-card">
			<ErrorState
				title="Δεν ήταν δυνατή η φόρτωση"
				description="Κάτι διέκοψε τη φόρτωση. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά."
				actionLabel="Δοκιμάστε ξανά"
				onActionPress={() => {}}
			/>
			<ErrorState
				title="Δεν ήταν δυνατή η φόρτωση"
				description="Κάτι διέκοψε τη φόρτωση. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά."
				actionLabel="Δοκιμάστε ξανά"
				onActionPress={() => {}}
				variant="framed"
			/>
		</div>
	{/snippet}
</Story>
