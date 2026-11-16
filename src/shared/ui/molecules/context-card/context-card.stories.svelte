<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ContextCard } from '$shared/ui/molecules/context-card';
	import { Avatar, AvatarFallback } from '$shared/ui/primitives/avatar';

	const { Story } = defineMeta({
		title: 'Molecules/ContextCard',
		component: ContextCard,
		tags: ['autodocs'],
		args: {
			label: 'Το αίτημα',
			title: 'Σάββατο 14 Νοεμβρίου · 17:30',
			lines: ['Νίκος Μαυρίδης · Επίσκεψη · 30 λεπτά', 'Λεωφ. Κηφισίας 120']
		}
	});
</script>

<Story name="Playground" />

<Story name="With Initials">
	{#snippet template(args)}
		{#snippet initials()}
			<Avatar size="lg" class="size-row" aria-hidden="true">
				<AvatarFallback class="text-body-lg text-foreground">ΝΜ</AvatarFallback>
			</Avatar>
		{/snippet}
		<ContextCard {...args} leading={initials} />
	{/snippet}
</Story>

<Story name="With A Way On">
	{#snippet template(args)}
		{#snippet initials()}
			<Avatar size="lg" class="size-row" aria-hidden="true">
				<AvatarFallback class="text-body-lg text-foreground">ΙΚ</AvatarFallback>
			</Avatar>
		{/snippet}
		{#snippet change()}
			<button
				type="button"
				class="inline-flex min-h-touch min-w-touch items-center justify-end outline-none"
			>
				<span
					class="inline-flex h-control-xs items-center rounded-sm bg-chip px-3 text-label-md font-medium"
					>Αλλαγή</span
				>
			</button>
		{/snippet}
		<ContextCard
			{...args}
			label="Έχει λογαριασμό eDoctor"
			title="Ιωάννα Καρρά"
			lines={['+30 697 765 4321', '4 επισκέψεις · τελευταία 22 Οκτωβρίου']}
			leading={initials}
			trailing={change}
		/>
	{/snippet}
</Story>
