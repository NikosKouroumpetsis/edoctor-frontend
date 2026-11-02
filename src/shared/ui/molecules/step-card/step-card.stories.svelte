<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { StepCard } from '$shared/ui/molecules/step-card';

	const steps = [
		{
			id: 'what',
			label: 'Τι',
			title: 'Τι;',
			placeholder: 'Προσθέστε ειδικότητα, υπηρεσία ή γιατρό'
		},
		{ id: 'where', label: 'Πού', title: 'Πού;', placeholder: 'Προσθέστε περιοχή' },
		{ id: 'when', label: 'Πότε', title: 'Πότε;', placeholder: 'Προσθέστε ημερομηνίες' }
	] as const;

	// Web (U-21/U-23.2): Airbnb's search cards on the phone, one open at a time.
	const { Story } = defineMeta({
		title: 'Molecules/StepCard',
		component: StepCard,
		tags: ['autodocs'],
		args: {
			label: 'Πού',
			title: 'Πού;',
			placeholder: 'Προσθέστε περιοχή',
			expanded: false,
			onExpand: () => {}
		}
	});
</script>

<script lang="ts">
	let open = $state<string>('where');
	const values: Record<string, string | undefined> = { what: 'Καρδιολόγος' };
</script>

{#snippet content()}
	<p class="pb-4 text-body-sm text-muted-foreground">Το περιεχόμενο της κάρτας.</p>
{/snippet}

<Story name="Closed">
	{#snippet template(args)}
		<div class="w-full max-w-form bg-background p-3">
			<StepCard {...args} children={content} />
		</div>
	{/snippet}
</Story>

<Story name="Closed With Value" args={{ value: 'Πειραιάς' }}>
	{#snippet template(args)}
		<div class="w-full max-w-form bg-background p-3">
			<StepCard {...args} children={content} />
		</div>
	{/snippet}
</Story>

<Story name="Open" args={{ expanded: true }}>
	{#snippet template(args)}
		<div class="w-full max-w-form bg-background p-3">
			<StepCard {...args} children={content} />
		</div>
	{/snippet}
</Story>

<!-- The three steps: a press on a closed card opens it, the open one closes to its line. -->
<Story name="Three Steps">
	{#snippet template()}
		<div class="flex w-full max-w-form flex-col gap-3 bg-background p-3">
			{#each steps as step (step.id)}
				<StepCard
					label={step.label}
					title={step.title}
					value={values[step.id]}
					placeholder={step.placeholder}
					expanded={open === step.id}
					onExpand={() => (open = step.id)}
				>
					{@render content()}
				</StepCard>
			{/each}
		</div>
	{/snippet}
</Story>
