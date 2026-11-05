<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { SignInRequest } from '$shared/state/session';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { ListRow, type ListRowSize } from '$shared/ui/molecules/list-row';
	import type { DoctorPricedService } from '$modules/doctor/lib/detail';
	import Fee from './fee.svelte';
	import { doctorServiceKindGlyphs } from './icons';

	let {
		service,
		onSignIn,
		href,
		onclick,
		expanded,
		onToggle,
		body,
		size,
		titleAs,
		testIdPrefix = 'doctor-detail-priced-service',
		class: className
	}: {
		service: DoctorPricedService;
		onSignIn: (request?: SignInRequest) => void;
		href?: string;
		onclick?: (event: MouseEvent) => void;
		expanded?: boolean;
		onToggle?: () => void;
		body?: Snippet;
		size?: ListRowSize;
		titleAs?: 'span' | 'h3' | 'h4';
		testIdPrefix?: string;
		class?: string;
	} = $props();
</script>

{#snippet leading()}
	<Ionicon
		name={doctorServiceKindGlyphs[service.kind]}
		data-testid={`${testIdPrefix}-glyph-${service.id}`}
		class="icon-lg"
	/>
{/snippet}

{#snippet duration()}
	{#if service.durationLabel}
		<span class="whitespace-nowrap text-muted-foreground tabular-nums">
			<span class="sr-only">{service.durationAccessibleLabel}</span>
			<span aria-hidden="true">{service.durationLabel}</span>
		</span>
	{/if}
{/snippet}

{#snippet meta()}
	{@render duration()}
	{#if service.durationLabel}<span aria-hidden="true">·</span>{/if}
	<Fee
		fee={service.price}
		placement="meta"
		{onSignIn}
		testId={`${testIdPrefix}-meta-fee-${service.id}`}
	/>
{/snippet}

{#snippet end()}
	<Fee
		fee={service.price}
		placement="row"
		{onSignIn}
		testId={`${testIdPrefix}-fee-${service.id}`}
	/>
	<span class="text-body-sm">{@render duration()}</span>
{/snippet}

<!-- 🔴 U-70 Π5, U-71.2 (app = web): one service in Airbnb's row: the glyph of its kind (nobody enters it), the title over
     its `sub`, the fee (a guest's «🔒 Συνδεθείτε για κόστος», its own press, U-34.4) and «30΄». -->
<ListRow
	title={service.title}
	subtitle={service.subtitle}
	{leading}
	{meta}
	{end}
	{href}
	{onclick}
	{expanded}
	{onToggle}
	{body}
	{size}
	{titleAs}
	testId={`${testIdPrefix}-${service.id}`}
	class={className}
/>
