<script lang="ts">
	import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './index';
	import type { AccordionItemVariant } from './index';

	let {
		type = 'single',
		value = $bindable(),
		collapsible = false,
		disabled = false,
		variant = 'default',
		showChevron = false,
		toggleOnClick = true,
		onTriggerClick = () => {},
		preventToggle = false
	}: {
		type?: 'single' | 'multiple';
		value?: string | string[];
		collapsible?: boolean;
		disabled?: boolean;
		variant?: AccordionItemVariant;
		showChevron?: boolean;
		toggleOnClick?: boolean;
		onTriggerClick?: () => void;
		preventToggle?: boolean;
	} = $props();
</script>

<Accordion {type} bind:value {collapsible} {disabled}>
	<AccordionItem value="one" {variant}>
		<AccordionTrigger
			{showChevron}
			{toggleOnClick}
			onclick={(event) => {
				onTriggerClick();
				if (preventToggle) event.preventDefault();
			}}>Question one</AccordionTrigger
		>
		<AccordionContent>Answer one</AccordionContent>
	</AccordionItem>
	<AccordionItem value="two" {variant}>
		<AccordionTrigger {showChevron}>Question two</AccordionTrigger>
		<AccordionContent contentClass="gap-0.5 pt-2">Answer two</AccordionContent>
	</AccordionItem>
</Accordion>
