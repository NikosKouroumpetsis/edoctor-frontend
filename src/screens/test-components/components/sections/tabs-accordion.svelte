<script lang="ts">
	import { Tabs, TabsList, TabsTrigger, TabsContent } from '$shared/ui/primitives/tabs';
	import {
		Accordion,
		AccordionItem,
		AccordionTrigger,
		AccordionContent
	} from '$shared/ui/primitives/accordion';
	import { Slider } from '$shared/ui/primitives/slider';
	import DemoSection from '../demo-section.svelte';
	import DemoRow from '../demo-row.svelte';

	let tab = $state('overview');
	let volume = $state(40);
	let priceRange = $state([20, 80]);
</script>

<DemoSection
	id="tabs-accordion"
	title="Tabs · Accordion · Slider"
	description="Disclosure and range primitives."
>
	<DemoRow label="Tabs (active: {tab})">
		<Tabs bind:value={tab} class="w-full max-w-md">
			<TabsList>
				<TabsTrigger value="overview">Overview</TabsTrigger>
				<TabsTrigger value="reviews">Reviews</TabsTrigger>
				<TabsTrigger value="info">Info</TabsTrigger>
			</TabsList>
			<TabsContent value="overview" class="pt-3 text-body-sm text-muted-foreground">
				Overview content — doctor profile summary.
			</TabsContent>
			<TabsContent value="reviews" class="pt-3 text-body-sm text-muted-foreground">
				Reviews content — patient feedback.
			</TabsContent>
			<TabsContent value="info" class="pt-3 text-body-sm text-muted-foreground">
				Info content — address and hours.
			</TabsContent>
		</Tabs>
	</DemoRow>

	<DemoRow label="Accordion (single)">
		<Accordion type="single" value="q1" class="w-full max-w-md">
			<AccordionItem value="q1">
				<AccordionTrigger>How do I book an appointment?</AccordionTrigger>
				<AccordionContent>Search for a doctor, pick a slot, and confirm.</AccordionContent>
			</AccordionItem>
			<AccordionItem value="q2">
				<AccordionTrigger>Can I cancel for free?</AccordionTrigger>
				<AccordionContent>Yes, up to 24 hours before the appointment.</AccordionContent>
			</AccordionItem>
		</Accordion>
	</DemoRow>

	<DemoRow label="Slider — single ({volume})">
		<div class="w-64"><Slider bind:value={volume} aria-label="Volume" /></div>
	</DemoRow>

	<DemoRow label="Slider — range ({priceRange[0]}–{priceRange[1]})">
		<div class="w-64"><Slider bind:value={priceRange} aria-label="Price range" /></div>
	</DemoRow>
</DemoSection>
