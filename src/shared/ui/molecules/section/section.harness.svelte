<script lang="ts">
	import { Section, type SectionVariant } from './index';

	let {
		variant,
		title = 'Τοποθεσία',
		subtitle,
		showRule,
		headingAs,
		withTrailing = false
	}: {
		variant?: SectionVariant;
		title?: string;
		subtitle?: string;
		showRule?: boolean;
		headingAs?: string;
		withTrailing?: boolean;
	} = $props();
</script>

{#snippet end()}
	<button type="button" class="size-touch">Όλα</button>
{/snippet}

<Section
	{variant}
	{title}
	{subtitle}
	{showRule}
	{headingAs}
	trailing={withTrailing ? end : undefined}
	data-testid="section"
>
	<p>Σώμα</p>
</Section>
