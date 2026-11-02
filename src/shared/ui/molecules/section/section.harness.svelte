<script lang="ts">
	import { Section, type SectionVariant } from './index';

	let {
		variant,
		title = 'Τοποθεσία',
		subtitle,
		showRule,
		headingAs,
		withTrailing = false,
		withEnd = false
	}: {
		variant?: SectionVariant;
		title?: string;
		subtitle?: string;
		showRule?: boolean;
		headingAs?: string;
		withTrailing?: boolean;
		withEnd?: boolean;
	} = $props();
</script>

{#snippet beside()}
	<button type="button" class="size-touch">Όλα</button>
{/snippet}

{#snippet end()}
	<button type="button" class="size-touch">Επόμενα</button>
{/snippet}

<Section
	{variant}
	{title}
	{subtitle}
	{showRule}
	{headingAs}
	trailing={withTrailing ? beside : undefined}
	end={withEnd ? end : undefined}
	data-testid="section"
>
	<p>Σώμα</p>
</Section>
