import Root, { type AccordionType } from './accordion.svelte';
import Item, { accordionItemVariants, type AccordionItemVariant } from './accordion-item.svelte';
import Trigger from './accordion-trigger.svelte';
import Content, { ACCORDION_DURATION } from './accordion-content.svelte';
import Details, {
	type AccordionDetailsProps,
	type AccordionDetailsSummaryTag
} from './accordion-details.svelte';

export {
	Root,
	Item,
	Trigger,
	Content,
	Details,
	ACCORDION_DURATION,
	accordionItemVariants,
	type AccordionDetailsProps,
	type AccordionDetailsSummaryTag,
	type AccordionItemVariant,
	type AccordionType,
	//
	Root as Accordion,
	Item as AccordionItem,
	Trigger as AccordionTrigger,
	Content as AccordionContent,
	Details as AccordionDetails
};
