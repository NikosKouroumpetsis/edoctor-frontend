<script module lang="ts">
	import type { ComponentProps, Snippet } from 'svelte';
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Container } from '$shared/ui/molecules/container';
	import { Section } from '$shared/ui/molecules/section';
	import { StickyActionBar } from '$shared/ui/organisms/sticky-action-bar';
	import { PriceLabel } from '$shared/ui/primitives/price-label';
	import { TwoColumnDetail } from '$shared/ui/templates/two-column-detail';

	const noop = () => {};
	const base = {
		cta: { label: 'Συνέχεια', onclick: noop },
		summary: 'Βασική επιλογή',
		supporting: 'Δευ 13 Απρ · 13:00'
	};
	const sections = ['Σχετικά', 'Υπηρεσίες', 'Κριτικές', 'Τοποθεσία'];

	// The application's meta (`organisms/sticky-action-bar`): «Βασική επιλογή», the 40 € price, «Συνέχεια». Below 950
	// the web bar is pinned to the bottom edge (it lands on the frame's bottom, as the application's `absolute
	// bottom-0`), so each example has its own frame; the browser has no device band (U-09.5: 16 above and below).
	const { Story } = defineMeta({
		title: 'Organisms/StickyActionBar',
		component: StickyActionBar,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen', docs: { story: { inline: false, iframeHeight: 640 } } },
		args: base,
		argTypes: { loading: { control: 'boolean' } },
		render: template
	});
</script>

<!-- The price is the kit's `PriceLabel` in its `bar` place (M-06): one line for an amount, two for a sentence. -->
{#snippet amount()}
	<PriceLabel kind="amount" placement="bar" label="40 €" />
{/snippet}

{#snippet sentence()}
	<PriceLabel kind="note" placement="bar" label="Η τιμή δίνεται κατόπιν επικοινωνίας" />
{/snippet}

{#snippet signIn()}
	<PriceLabel kind="action" placement="bar" label="Συνδεθείτε για την τιμή" onAction={noop} />
{/snippet}

{#snippet frame(bar: Snippet)}
	<div class="h-hero-h bg-background">{@render bar()}</div>
{/snippet}

{#snippet template(args: Record<string, unknown>)}
	{#snippet bar()}
		<StickyActionBar
			{...base}
			{...args as Partial<ComponentProps<typeof StickyActionBar>>}
			price={amount}
		/>
	{/snippet}
	{@render frame(bar)}
{/snippet}

<Story name="Playground" />

<!-- A sentence instead of an amount, on two lines (the price slot is the caller's). -->
<Story name="Sentence Price">
	{#snippet template()}
		{#snippet bar()}<StickyActionBar {...base} price={sentence} />{/snippet}
		{@render frame(bar)}
	{/snippet}
</Story>

<!-- A notice takes the last line and refuses the call to action. -->
<Story
	name="With Notice"
	args={{ notice: 'Υπάρχει ήδη μία εκκρεμής επιλογή σας· ολοκληρώστε την πρώτα.' }}
/>

<Story name="Disabled" args={{ cta: { disabled: true, label: 'Συνέχεια', onclick: noop } }} />

<Story name="Loading" args={{ loading: true }} />

<Story name="Without Price">
	{#snippet template()}
		{#snippet bar()}<StickyActionBar {...base} />{/snippet}
		{@render frame(bar)}
	{/snippet}
</Story>

<!-- The price a guest is asked to sign in for, pressable in the bar. -->
<Story name="Sign In Price">
	{#snippet template()}
		{#snippet bar()}<StickyActionBar {...base} price={signIn} />{/snippet}
		{@render frame(bar)}
	{/snippet}
</Story>

<!-- Web only (the zone): from 950 the bar is the aside's card of a two-column page (z950 … z1920). -->
<Story name="Aside Card">
	{#snippet template()}
		<Container width="listing" class="py-section">
			<TwoColumnDetail>
				{#snippet aside()}<StickyActionBar {...base} price={amount} />{/snippet}
				<div class="flex flex-col gap-section">
					{#each sections as title, index (title)}
						<Section variant="ruled" {title} showRule={index > 0}>
							<div class="h-card-list-media rounded-xl bg-muted"></div>
						</Section>
					{/each}
				</div>
			</TwoColumnDetail>
		</Container>
	{/snippet}
</Story>
