<script lang="ts">
	import { Button } from '$shared/ui/primitives/button';
	import SearchIcon from '~icons/lucide/search';
	import DemoSection from '../demo-section.svelte';
	import DemoRow from '../demo-row.svelte';
</script>

<DemoSection
	id="buttons"
	title="Button"
	description="Variants and sizes from the in-house button primitive (tailwind-variants)."
>
	<DemoRow label="Variants">
		<Button>Default</Button>
		<Button variant="secondary">Secondary</Button>
		<Button variant="destructive">Destructive</Button>
		<Button variant="outline">Outline</Button>
		<Button variant="ghost">Ghost</Button>
		<Button variant="link">Link</Button>
	</DemoRow>

	<DemoRow label="Sizes">
		<Button size="sm">Small</Button>
		<Button size="default">Default</Button>
		<Button size="lg">Large</Button>
		<Button size="icon" aria-label="Search"><SearchIcon /></Button>
	</DemoRow>

	<DemoRow label="States">
		<Button disabled>Disabled</Button>
		<Button href="#buttons">As link</Button>
		<Button><SearchIcon /> With icon</Button>
	</DemoRow>
</DemoSection>
