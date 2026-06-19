<script lang="ts">
	import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './index';

	let {
		type = 'single',
		value = $bindable()
	}: { type?: 'single' | 'multiple'; value?: string | string[] } = $props();
</script>

<Accordion {type} bind:value>
	<AccordionItem value="one">
		<AccordionTrigger>Question one</AccordionTrigger>
		<AccordionContent>Answer one</AccordionContent>
	</AccordionItem>
	<AccordionItem value="two">
		<AccordionTrigger>Question two</AccordionTrigger>
		<AccordionContent>Answer two</AccordionContent>
	</AccordionItem>
</Accordion>
