<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ProfileSummaryCard } from '$shared/ui/molecules/profile-summary-card';
	import { samplePhotos } from '$shared/ui/organisms/media-card/media-card.sample';

	const stats = [
		{ id: 'rating', kind: 'rating' as const, value: '4,9', label: 'Βαθμολογία' },
		{ id: 'reviews', value: '124', label: 'Κριτικές' },
		{ id: 'years', value: '12', label: 'Χρόνια εμπειρίας' }
	];

	const { Story } = defineMeta({
		title: 'Molecules/ProfileSummaryCard',
		component: ProfileSummaryCard,
		tags: ['autodocs'],
		args: { name: 'Μαρία Παπαδοπούλου', role: 'Καρδιολόγος', initial: 'ΜΠ', stats }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-form"><ProfileSummaryCard {...args} /></div>
	{/snippet}
</Story>

<Story name="With a photo">
	{#snippet template()}
		<div class="w-full max-w-form">
			<ProfileSummaryCard
				name="Μαρία Παπαδοπούλου"
				role="Καρδιολόγος"
				initial="ΜΠ"
				imageUrl={samplePhotos[0]}
				{stats}
			/>
		</div>
	{/snippet}
</Story>

<Story name="One stat">
	{#snippet template()}
		<div class="w-full max-w-form">
			<ProfileSummaryCard
				name="Γιώργος Νικολάου"
				role="Παθολόγος"
				initial="ΓΝ"
				stats={stats.slice(1, 2)}
			/>
		</div>
	{/snippet}
</Story>

<Story name="Without stats">
	{#snippet template()}
		<div class="w-full max-w-form">
			<ProfileSummaryCard name="Γιώργος Νικολάου" role="Παθολόγος" initial="ΓΝ" stats={[]} />
		</div>
	{/snippet}
</Story>

<Story
	name="On the phone"
	parameters={{ layout: 'fullscreen' }}
	globals={{ viewport: { value: 'z375', isRotated: false } }}
>
	{#snippet template()}
		<div class="px-gutter-sm py-card">
			<ProfileSummaryCard name="Μαρία Παπαδοπούλου" role="Καρδιολόγος" initial="ΜΠ" {stats} />
		</div>
	{/snippet}
</Story>

<Story name="In the dark theme" globals={{ theme: 'dark' }}>
	{#snippet template()}
		<div class="w-full max-w-form bg-background p-card">
			<ProfileSummaryCard
				name="Μαρία Παπαδοπούλου"
				role="Καρδιολόγος"
				initial="ΜΠ"
				imageUrl={samplePhotos[1]}
				{stats}
			/>
		</div>
	{/snippet}
</Story>
