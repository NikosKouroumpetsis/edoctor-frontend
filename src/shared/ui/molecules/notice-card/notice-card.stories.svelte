<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { NoticeCard } from '$shared/ui/molecules/notice-card';
	import { Button } from '$shared/ui/primitives/button';

	const { Story } = defineMeta({
		title: 'Molecules/NoticeCard',
		component: NoticeCard,
		tags: ['autodocs'],
		args: {
			title: 'Η άδειά σας λήγει στις 14 Δεκεμβρίου 2026',
			lines: [
				'Μετά τη λήξη δεν θα εμφανίζεστε στην αναζήτηση και δεν θα δέχεστε νέα ραντεβού. Για ανανέωση, γράψτε μας από το Κέντρο βοήθειας.'
			],
			tone: 'warm'
		},
		argTypes: { tone: { control: 'inline-radio', options: ['warm', 'neutral', 'done'] } }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-form"><NoticeCard {...args} /></div>
	{/snippet}
</Story>

<Story name="Neutral">
	{#snippet template()}
		<div class="w-full max-w-form">
			<NoticeCard tone="neutral" title="Το ραντεβού ακυρώθηκε." lines={['Από εσάς · Σάββατο']} />
		</div>
	{/snippet}
</Story>

<Story name="Done">
	{#snippet template()}
		<div class="w-full max-w-form">
			<NoticeCard tone="done" role="status" title="Αποθηκεύτηκε." />
		</div>
	{/snippet}
</Story>

<Story name="With an icon">
	{#snippet template()}
		<div class="grid w-full max-w-form gap-3">
			<NoticeCard
				tone="done"
				icon="checkmark-circle-outline"
				title="Αποθηκεύτηκε."
				lines={['Η αλλαγή φαίνεται αμέσως.']}
			/>
			<NoticeCard
				tone="warm"
				icon="alert-circle-outline"
				title="Κάτι λείπει ακόμη."
				lines={['Συμπληρώστε το για να συνεχίσετε.']}
			/>
		</div>
	{/snippet}
</Story>

<Story name="With a number to call">
	{#snippet template()}
		<div class="w-full max-w-form">
			<NoticeCard title="Το ραντεβού είναι σε 20 λεπτά.">
				{#snippet detail()}
					Αν μπορείτε, τηλεφωνήστε και στον ασθενή:
					<a
						href="tel:+306934445566"
						class="-my-3 inline-flex min-h-touch min-w-touch items-center font-semibold text-primary-text"
						>+30 693 444 5566</a
					>
				{/snippet}
			</NoticeCard>
		</div>
	{/snippet}
</Story>

<Story name="With an action">
	{#snippet template()}
		<div class="w-full max-w-form">
			<NoticeCard
				title="Η άδειά σας έληξε στις 31 Οκτωβρίου 2026"
				lines={['Δεν εμφανίζεστε στην αναζήτηση.']}
			>
				{#snippet action()}
					<Button tone="outline" hover={false} label="Κέντρο βοήθειας" textClass="text-body-sm" />
				{/snippet}
			</NoticeCard>
		</div>
	{/snippet}
</Story>
