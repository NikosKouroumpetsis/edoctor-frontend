<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, userEvent } from 'storybook/test';
	import { Tabs, TabsList, TabsTrigger, TabsContent } from '$shared/ui/primitives/tabs';

	// The application's tabs (`molecules/tabs`): the trigger's `sm` corner is the application's (R7-5).
	const { Story } = defineMeta({
		title: 'Primitives/Tabs',
		component: Tabs,
		tags: ['autodocs']
	});
</script>

<script lang="ts">
	let controlled = $state('overview');
	let vertical = $state('general');
</script>

<!-- The web has no `defaultValue`: an unbound `value` is the same uncontrolled start. -->
<Story
	name="Uncontrolled"
	play={async ({ canvas }) => {
		canvas.getByRole('tab', { name: 'Λογαριασμός' }).focus();
		await userEvent.keyboard('{ArrowRight}');
		await expect(canvas.getByRole('tab', { name: 'Κωδικός' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
	}}
>
	{#snippet template()}
		<Tabs value="account">
			<TabsList aria-label="Ρυθμίσεις">
				<TabsTrigger value="account">Λογαριασμός</TabsTrigger>
				<TabsTrigger value="password">Κωδικός</TabsTrigger>
			</TabsList>
			<TabsContent value="account">
				<p class="text-body-md text-foreground">Στοιχεία λογαριασμού</p>
			</TabsContent>
			<TabsContent value="password">
				<p class="text-body-md text-foreground">Αλλαγή κωδικού</p>
			</TabsContent>
		</Tabs>
	{/snippet}
</Story>

<Story name="Controlled">
	{#snippet template()}
		<Tabs bind:value={controlled}>
			<TabsList aria-label="Καρτέλες">
				<TabsTrigger value="overview">Επισκόπηση</TabsTrigger>
				<TabsTrigger value="reviews">Κριτικές</TabsTrigger>
				<TabsTrigger value="hours" disabled>Ωράριο</TabsTrigger>
			</TabsList>
			<TabsContent value="overview">
				<p class="text-body-md text-foreground">Γενική επισκόπηση</p>
			</TabsContent>
			<TabsContent value="reviews">
				<p class="text-body-md text-foreground">Κριτικές χρηστών</p>
			</TabsContent>
		</Tabs>
	{/snippet}
</Story>

<!-- The list as a column beside its panel. -->
<Story name="Vertical">
	{#snippet template()}
		<Tabs bind:value={vertical} orientation="vertical">
			<TabsList aria-label="Ρυθμίσεις">
				<TabsTrigger value="general">Γενικά</TabsTrigger>
				<TabsTrigger value="security">Ασφάλεια</TabsTrigger>
				<TabsTrigger value="billing">Χρεώσεις</TabsTrigger>
			</TabsList>
			<TabsContent value="general">
				<p class="text-body-md text-foreground">Γενικές ρυθμίσεις</p>
			</TabsContent>
			<TabsContent value="security">
				<p class="text-body-md text-foreground">Ρυθμίσεις ασφαλείας</p>
			</TabsContent>
			<TabsContent value="billing">
				<p class="text-body-md text-foreground">Ρυθμίσεις χρεώσεων</p>
			</TabsContent>
		</Tabs>
	{/snippet}
</Story>
