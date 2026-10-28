<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';

	const { Story } = defineMeta({
		title: 'Molecules/InlineNotice',
		component: InlineNotice,
		tags: ['autodocs'],
		args: { message: 'Δεν βρέθηκε καμία επιλογή.', variant: 'muted' },
		argTypes: { variant: { control: 'inline-radio', options: ['muted', 'tint', 'danger'] } }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-form"><InlineNotice {...args} /></div>
	{/snippet}
</Story>

<Story name="Muted">
	{#snippet template()}
		<div class="w-full max-w-form"><InlineNotice message="Δεν βρέθηκε καμία επιλογή." /></div>
	{/snippet}
</Story>

<Story name="Muted with an action">
	{#snippet template()}
		<div class="w-full max-w-form">
			<InlineNotice
				message="Η αναζήτηση δεν ολοκληρώθηκε."
				actionLabel="Δοκιμάστε ξανά"
				onAction={() => {}}
			/>
		</div>
	{/snippet}
</Story>

<Story name="Tint">
	{#snippet template()}
		<div class="w-full max-w-form">
			<InlineNotice message="Οι τιμές είναι ενδεικτικές και μπορεί να αλλάξουν." variant="tint" />
		</div>
	{/snippet}
</Story>

<Story name="Tint with an action">
	{#snippet template()}
		<div class="w-full max-w-form">
			<InlineNotice
				message="Οι τιμές είναι ενδεικτικές και μπορεί να αλλάξουν."
				variant="tint"
				actionLabel="Περισσότερα"
				onAction={() => {}}
			/>
		</div>
	{/snippet}
</Story>

<Story name="Danger">
	{#snippet template()}
		<div class="w-full max-w-form">
			<InlineNotice message="Η τοποθεσία δεν είναι διαθέσιμη αυτή τη στιγμή." variant="danger" />
		</div>
	{/snippet}
</Story>

<Story name="Danger with an action">
	{#snippet template()}
		<div class="w-full max-w-form">
			<InlineNotice
				message="Η πρόσβαση στην τοποθεσία είναι απενεργοποιημένη."
				variant="danger"
				actionLabel="Ρυθμίσεις"
				onAction={() => {}}
			/>
		</div>
	{/snippet}
</Story>

<Story name="Every look in the dark theme" globals={{ theme: 'dark' }}>
	{#snippet template()}
		<div class="flex w-full max-w-form flex-col gap-4 bg-background p-card">
			<InlineNotice
				message="Η αναζήτηση δεν ολοκληρώθηκε."
				actionLabel="Δοκιμάστε ξανά"
				onAction={() => {}}
			/>
			<InlineNotice message="Οι τιμές είναι ενδεικτικές και μπορεί να αλλάξουν." variant="tint" />
			<InlineNotice
				message="Η πρόσβαση στην τοποθεσία είναι απενεργοποιημένη."
				variant="danger"
				actionLabel="Ρυθμίσεις"
				onAction={() => {}}
			/>
		</div>
	{/snippet}
</Story>
