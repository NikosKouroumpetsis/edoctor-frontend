import Root from './popover.svelte';
import Trigger from './popover-trigger.svelte';
import Content, { type PopoverSize } from './popover-content.svelte';

export {
	Root,
	Trigger,
	Content,
	type PopoverSize,
	//
	Root as Popover,
	Trigger as PopoverTrigger,
	Content as PopoverContent
};
