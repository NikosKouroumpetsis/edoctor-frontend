<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ErrorState } from '$shared/ui/molecules/error-state';
	import { Ionicon } from '$shared/ui/icons/ionicon';

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

<!-- With a glyph over the words (the application's `icon`): the home's rows that could not load (U-20). -->
<Story name="With Icon">
	{#snippet template()}
		<div class="w-full max-w-content bg-background p-card">
			<ErrorState
				title="Δεν μπορέσαμε να φορτώσουμε τους γιατρούς"
				description="Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά."
				actionLabel="Δοκιμή ξανά"
				onActionPress={() => {}}
				variant="framed"
			>
				{#snippet icon()}
					<span
						class="grid size-tile place-items-center rounded-full bg-foreground/5 text-foreground"
					>
						<Ionicon name="alert-circle" class="icon-lg" />
					</span>
				{/snippet}
			</ErrorState>
		</div>
	{/snippet}
</Story>
