<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Container } from '$shared/ui/molecules/container';
	import { ActionBar } from '$shared/ui/molecules/action-bar';
	import { Button } from '$shared/ui/primitives/button';
	import { Card } from '$shared/ui/primitives/card';
	import { Text } from '$shared/ui/primitives/text';
	import { ModalScreenTemplate, type ModalOrigin } from '$shared/ui/templates/modal-screen';

	const noop = () => {};
	const rows = Array.from({ length: 8 }, (_, index) => `row-${index + 1}`);

	// The application's meta (`templates/modal-screen`): «Λεπτομέρειες ραντεβού» with its «×». The web shows the page
	// behind it with «Άνοιγμα» (the surface is fixed, so each story has its own frame); it opens with the focus on the
	// surface, not on the «×» (U-09.7), and grows in on the application's 220 ms (U-09.8).
	const { Story } = defineMeta({
		title: 'Templates/ModalScreen',
		component: ModalScreenTemplate,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen', docs: { story: { inline: false, iframeHeight: 720 } } },
		args: { closeLabel: 'Κλείσιμο', title: 'Λεπτομέρειες ραντεβού', isTitleLoading: false },
		argTypes: { title: { control: 'text' }, isTitleLoading: { control: 'boolean' } }
	});

	/** The rect a modal zooms out of: the pressed control's, as the application measures its source. */
	function originOf(event: MouseEvent): ModalOrigin {
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
	}
</script>

<script lang="ts">
	let playground = $state(true);
	let back = $state(true);
	let loading = $state(true);
	let compact = $state(true);
	let centred = $state(true);
	let withFooter = $state(true);
	let zoom = $state(false);
	let origin = $state<ModalOrigin | undefined>();
</script>

{#snippet page(reopen: (event: MouseEvent) => void)}
	<Container class="flex flex-col gap-section py-section">
		<h1 class="text-heading-lg text-foreground">Σελίδα πίσω από το παράθυρο</h1>
		<Button tone="outline" label="Άνοιγμα" onclick={reopen} />
	</Container>
{/snippet}

<!-- One step of a multi-step modal, as a card. -->
{#snippet stepCard()}
	<Card class="gap-2">
		<Text class="text-body-md text-muted-foreground">Βήμα 2 από 3</Text>
	</Card>
{/snippet}

<Story name="Playground">
	{#snippet template()}
		{@render page(() => (playground = true))}
		<ModalScreenTemplate
			bind:open={playground}
			title="Λεπτομέρειες ραντεβού"
			onClose={noop}
			closeLabel="Κλείσιμο"
		>
			{#each [0, 1, 2, 3, 4, 5] as index (index)}
				<Card class="gap-2">
					<Text variant="heading">Δρ. Παπαδοπούλου</Text>
					<Text class="text-body-md text-muted-foreground">Τρίτη 10:00 · Καρδιολογία</Text>
				</Card>
			{/each}
		</ModalScreenTemplate>
	{/snippet}
</Story>

<!-- A step inside a multi-step modal: back returns to the previous step, close leaves the modal. -->
<Story name="With Back">
	{#snippet template()}
		{@render page(() => (back = true))}
		<ModalScreenTemplate
			bind:open={back}
			title="Ας δημιουργήσουμε τον λογαριασμό σας"
			onBack={noop}
			backLabel="Πίσω"
			onClose={noop}
			closeLabel="Κλείσιμο"
		>
			{@render stepCard()}
		</ModalScreenTemplate>
	{/snippet}
</Story>

<Story name="Loading Title">
	{#snippet template()}
		{@render page(() => (loading = true))}
		<ModalScreenTemplate
			bind:open={loading}
			isTitleLoading
			onClose={noop}
			closeLabel="Κλείσιμο"
			aria-label="Φόρτωση"
		>
			<Card class="gap-2">
				<Text class="text-body-md text-muted-foreground">Φόρτωση τίτλου…</Text>
			</Card>
		</ModalScreenTemplate>
	{/snippet}
</Story>

<!-- A title that is a whole sentence takes the smaller scale. -->
<Story name="Compact Title">
	{#snippet template()}
		{@render page(() => (compact = true))}
		<ModalScreenTemplate
			bind:open={compact}
			title="Γνωρίστε τον επαγγελματία υγείας"
			titleSize="compact"
			onClose={noop}
			closeLabel="Κλείσιμο"
		>
			{@render stepCard()}
		</ModalScreenTemplate>
	{/snippet}
</Story>

<!-- One balanced group centred in the scroll area (the sign-in surface). -->
<Story name="Centered Content">
	{#snippet template()}
		{@render page(() => (centred = true))}
		<ModalScreenTemplate
			bind:open={centred}
			title={undefined}
			contentAlignment="center"
			maxWidth="form"
			onClose={noop}
			closeLabel="Κλείσιμο"
			aria-label="Σύνδεση"
		>
			<div class="flex flex-col items-center gap-4">
				<h2 class="text-center text-heading-md text-foreground">Σύνδεση ή εγγραφή</h2>
				<Button label="Συνέχεια" class="w-full" onclick={noop} />
			</div>
		</ModalScreenTemplate>
	{/snippet}
</Story>

<!-- A pinned footer below the scroll: the rows scroll, the two actions stay. -->
<Story name="With Footer">
	{#snippet template()}
		{@render page(() => (withFooter = true))}
		<ModalScreenTemplate
			bind:open={withFooter}
			title="Διαθεσιμότητα"
			onClose={noop}
			closeLabel="Κλείσιμο"
		>
			{#each rows as row (row)}
				<div class="min-h-row rounded-md bg-muted"></div>
			{/each}
			{#snippet footer()}
				<ActionBar
					preset="plain"
					primaryLabel="Επιβεβαίωση"
					secondaryLabel="Ακύρωση"
					onPrimaryClick={noop}
					onSecondaryClick={noop}
				/>
			{/snippet}
		</ModalScreenTemplate>
	{/snippet}
</Story>

<!-- Web only: press «Άνοιγμα» and the surface grows out of it (220 ms, whatever the motion setting, U-12.1). -->
<Story name="Zoom From Control">
	{#snippet template()}
		{@render page((event) => {
			origin = originOf(event);
			zoom = true;
		})}
		<ModalScreenTemplate
			bind:open={zoom}
			sourceLayout={origin}
			title="Λεπτομέρειες ραντεβού"
			onClose={noop}
			closeLabel="Κλείσιμο"
		>
			<p class="text-body-lg text-foreground/88">Μεγαλώνει από το κουμπί και γυρίζει σε αυτό.</p>
		</ModalScreenTemplate>
	{/snippet}
</Story>
