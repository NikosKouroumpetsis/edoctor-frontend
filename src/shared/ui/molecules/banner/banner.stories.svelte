<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Banner } from '$shared/ui/molecules/banner';

	const tones = ['info', 'success', 'warning', 'danger'] as const;
	const statusTones = ['success', 'warning', 'danger'] as const;

	const { Story } = defineMeta({
		title: 'Molecules/Banner',
		component: Banner,
		tags: ['autodocs'],
		args: {
			title: 'Το προφίλ σας ενημερώθηκε',
			description: 'Οι αλλαγές αποθηκεύτηκαν με επιτυχία.',
			tone: 'info',
			solid: false,
			dismissLabel: 'Κλείσιμο',
			onDismiss: () => {}
		},
		argTypes: { tone: { control: 'select', options: tones }, solid: { control: 'boolean' } }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-form"><Banner {...args} /></div>
	{/snippet}
</Story>

<Story name="Tones">
	{#snippet template()}
		<div class="flex w-full max-w-form flex-col gap-3">
			{#each tones as tone (tone)}
				<Banner
					title={tone}
					description="Οι αλλαγές αποθηκεύτηκαν με επιτυχία."
					{tone}
					dismissLabel="Κλείσιμο"
					onDismiss={() => {}}
				/>
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Title only">
	{#snippet template()}
		<div class="w-full max-w-form"><Banner title="Το προφίλ σας ενημερώθηκε" /></div>
	{/snippet}
</Story>

<Story name="Dismissible">
	{#snippet template()}
		<div class="w-full max-w-form">
			<Banner
				title="Λήγει σύντομα"
				description="Ολοκληρώστε τη διαδικασία."
				tone="warning"
				dismissLabel="Κλείσιμο"
				onDismiss={() => {}}
			/>
		</div>
	{/snippet}
</Story>

<!-- The opt-in solid status fills with the fill's own foreground; `info` keeps its tint. -->
<Story name="Solid">
	{#snippet template()}
		<div class="flex w-full max-w-form flex-col gap-3">
			{#each statusTones as tone (tone)}
				<Banner
					title={tone}
					description="Οι αλλαγές αποθηκεύτηκαν με επιτυχία."
					{tone}
					solid
					dismissLabel="Κλείσιμο"
					onDismiss={() => {}}
				/>
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="On the phone" globals={{ viewport: { value: 'z375', isRotated: false } }}>
	{#snippet template()}
		<Banner
			title="Η πολιτική απορρήτου άλλαξε"
			description="Διαβάστε τι αλλάζει από την 1η Νοεμβρίου."
			dismissLabel="Κλείσιμο"
			onDismiss={() => {}}
		/>
	{/snippet}
</Story>

<Story name="Tones and solid in the dark theme" globals={{ theme: 'dark' }}>
	{#snippet template()}
		<div class="flex w-full max-w-form flex-col gap-3 bg-background p-card">
			{#each tones as tone (tone)}
				<Banner title={tone} description="Οι αλλαγές αποθηκεύτηκαν." {tone} />
			{/each}
			{#each statusTones as tone (tone)}
				<Banner
					title={tone}
					description="Οι αλλαγές αποθηκεύτηκαν."
					{tone}
					solid
					dismissLabel="Κλείσιμο"
					onDismiss={() => {}}
				/>
			{/each}
		</div>
	{/snippet}
</Story>
