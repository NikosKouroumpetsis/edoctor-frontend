<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { ActionBar } from '$shared/ui/molecules/action-bar';
	import { Container } from '$shared/ui/molecules/container';
	import { SearchTrigger, layoutOf } from '$shared/ui/molecules/search-trigger';
	import { Button } from '$shared/ui/primitives/button';
	import {
		FullscreenModalTemplate,
		type FullscreenModalContentGap
	} from '$shared/ui/templates/fullscreen-modal';
	import type { ModalOrigin } from '$shared/ui/templates/modal-screen';

	const noop = () => {};
	const groups = ['Πρώτη ομάδα', 'Δεύτερη ομάδα', 'Τρίτη ομάδα'];

	// The application's window (`templates/fullscreen-modal`): «Επιλογές», three groups, «Εφαρμογή» / «Καθαρισμός».
	// The web shows the page behind it with «Άνοιγμα» (each story in its own frame); the column is the application's
	// `frame.contentWidthClassName` (`tablet:max-w-form`).
	const { Story } = defineMeta({
		title: 'Templates/FullscreenModal',
		component: FullscreenModalTemplate,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen', docs: { story: { inline: false, iframeHeight: 760 } } },
		args: { hideContentFromA11y: false },
		argTypes: { hideContentFromA11y: { control: 'boolean' } }
	});
</script>

<script lang="ts">
	let tight = $state(true);
	let loose = $state(true);
	let covered = $state(true);
	let zoomed = $state(false);
	let origin = $state<ModalOrigin | undefined>();
</script>

{#snippet page(reopen: () => void)}
	<Container class="flex flex-col gap-section py-section">
		<h1 class="text-heading-lg text-foreground">Σελίδα πίσω από το παράθυρο</h1>
		<Button tone="outline" label="Άνοιγμα" onclick={reopen} />
	</Container>
{/snippet}

{#snippet groupsOf()}
	{#each groups as label (label)}
		<div class="rounded-lg border border-border/60 bg-card p-4">
			<p class="text-body-md text-foreground">{label}</p>
		</div>
	{/each}
{/snippet}

{#snippet footerOf(gap: FullscreenModalContentGap)}
	<ActionBar
		preset={gap === 'loose' ? 'filters' : 'default'}
		primaryLabel="Εφαρμογή"
		secondaryLabel="Καθαρισμός"
		contentWidthClass="tablet:max-w-form"
		onPrimaryClick={noop}
		onSecondaryClick={noop}
	/>
{/snippet}

<!-- The criteria window: groups 12 apart, the default footer. -->
<Story name="Tight">
	{#snippet template()}
		{@render page(() => (tight = true))}
		<FullscreenModalTemplate
			bind:open={tight}
			title="Επιλογές"
			closeLabel="Κλείσιμο"
			contentGap="tight"
			onClose={noop}
		>
			{@render groupsOf()}
			{#snippet footer()}{@render footerOf('tight')}{/snippet}
		</FullscreenModalTemplate>
	{/snippet}
</Story>

<!-- The filters window: groups 20 apart, the separated compact footer. -->
<Story name="Loose">
	{#snippet template()}
		{@render page(() => (loose = true))}
		<FullscreenModalTemplate
			bind:open={loose}
			title="Επιλογές"
			closeLabel="Κλείσιμο"
			contentGap="loose"
			onClose={noop}
		>
			{@render groupsOf()}
			{#snippet footer()}{@render footerOf('loose')}{/snippet}
		</FullscreenModalTemplate>
	{/snippet}
</Story>

<!-- A full panel over the column, which leaves the accessibility tree under it. -->
<Story name="With Overlay" args={{ hideContentFromA11y: true }}>
	{#snippet template()}
		{@render page(() => (covered = true))}
		<FullscreenModalTemplate
			bind:open={covered}
			hideContentFromA11y
			title="Επιλογές"
			closeLabel="Κλείσιμο"
			onClose={noop}
		>
			{@render groupsOf()}
			{#snippet footer()}{@render footerOf('tight')}{/snippet}
			{#snippet overlay()}
				<div class="absolute inset-0 bg-background p-4">
					<p class="text-body-md text-foreground">Πάνελ αναζήτησης</p>
				</div>
			{/snippet}
		</FullscreenModalTemplate>
	{/snippet}
</Story>

<!-- A search pill whose press opens the window out of the pill's own rect, and «×» or Escape closes it into it. -->
<Story name="Zoom From Pill">
	{#snippet template()}
		<Container class="py-section">
			<SearchTrigger
				placeholder="Αναζήτηση γιατρού"
				hideFrom="none"
				onclick={(event) => {
					origin = layoutOf(event.currentTarget);
					zoomed = true;
				}}
			/>
		</Container>
		<FullscreenModalTemplate
			bind:open={zoomed}
			sourceLayout={origin}
			title="Επιλογές"
			closeLabel="Κλείσιμο"
			onClose={noop}
		>
			<p class="text-body-md text-foreground">Μεγαλώνει από το κουμπί σε 220 ms.</p>
		</FullscreenModalTemplate>
	{/snippet}
</Story>
