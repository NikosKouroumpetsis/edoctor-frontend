<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { EmptyState } from '$shared/ui/molecules/empty-state';

	const at = (value: string) => ({ viewport: { value, isRotated: false } });

	const { Story } = defineMeta({
		title: 'Molecules/EmptyState',
		component: EmptyState,
		tags: ['autodocs'],
		args: {
			title: 'Δεν βρέθηκε τίποτα',
			description: 'Δοκιμάστε λιγότερα φίλτρα ή άλλη αναζήτηση.',
			actionLabel: 'Καθαρισμός φίλτρων',
			onActionPress: () => {},
			variant: 'plain'
		},
		argTypes: {
			variant: { control: 'inline-radio', options: ['plain', 'framed'] },
			actionTone: {
				control: 'select',
				options: ['outline', 'primary', 'secondary', 'accent', 'contrast', 'ghost', 'muted']
			}
		}
	});
</script>

{#snippet calendar()}
	<Ionicon name="calendar-outline" class="icon-xl text-muted-foreground" />
{/snippet}

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-content"><EmptyState {...args} /></div>
	{/snippet}
</Story>

<Story name="With an icon">
	{#snippet template()}
		<div class="w-full max-w-content">
			<EmptyState
				title="Δεν υπάρχουν ραντεβού"
				description="Κλείστε το πρώτο σας ραντεβού."
				icon={calendar}
				actionLabel="Αναζήτηση"
				onActionPress={() => {}}
			/>
		</div>
	{/snippet}
</Story>

<Story name="Title and description only">
	{#snippet template()}
		<div class="w-full max-w-content">
			<EmptyState
				title="Δεν βρέθηκε τίποτα"
				description="Δοκιμάστε λιγότερα φίλτρα ή άλλη αναζήτηση."
			/>
		</div>
	{/snippet}
</Story>

<Story name="Title only">
	{#snippet template()}
		<div class="w-full max-w-content"><EmptyState title="Δεν βρέθηκε τίποτα" /></div>
	{/snippet}
</Story>

<Story name="Framed">
	{#snippet template()}
		<div class="w-full max-w-content bg-background p-card">
			<EmptyState
				title="Δεν βρέθηκε τίποτα"
				description="Δοκιμάστε λιγότερα φίλτρα ή άλλη αναζήτηση."
				actionLabel="Καθαρισμός φίλτρων"
				onActionPress={() => {}}
				variant="framed"
				testId="demo-empty"
			/>
		</div>
	{/snippet}
</Story>

<Story name="Framed without an action">
	{#snippet template()}
		<div class="w-full max-w-content bg-background p-card">
			<EmptyState
				title="Δεν βρέθηκε τίποτα"
				description="Δοκιμάστε λιγότερα φίλτρα ή άλλη αναζήτηση."
				variant="framed"
			/>
		</div>
	{/snippet}
</Story>

<Story name="A link home on a page of its own" globals={at('z375')}>
	{#snippet template()}
		<EmptyState
			title="Η σελίδα δεν βρέθηκε"
			description="Ο σύνδεσμος μπορεί να είναι παλιός ή λάθος."
			titleAs="h1"
			actionLabel="Αρχική"
			actionHref="#home"
		/>
	{/snippet}
</Story>

<Story name="In the dark theme" globals={{ theme: 'dark' }}>
	{#snippet template()}
		<div class="flex w-full max-w-content flex-col gap-section bg-background p-card">
			<EmptyState
				title="Δεν βρέθηκε τίποτα"
				description="Δοκιμάστε λιγότερα φίλτρα ή άλλη αναζήτηση."
				icon={calendar}
				actionLabel="Καθαρισμός φίλτρων"
				onActionPress={() => {}}
			/>
			<EmptyState
				title="Δεν βρέθηκε τίποτα"
				description="Δοκιμάστε λιγότερα φίλτρα ή άλλη αναζήτηση."
				actionLabel="Καθαρισμός φίλτρων"
				onActionPress={() => {}}
				variant="framed"
			/>
		</div>
	{/snippet}
</Story>
