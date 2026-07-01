// Sheet reuses the Dialog state machine (same context); only the content slides
// in from a side instead of centering.
import Root from '$shared/ui/primitives/dialog/dialog.svelte';
import Trigger from '$shared/ui/primitives/dialog/dialog-trigger.svelte';
import Close from '$shared/ui/primitives/dialog/dialog-close.svelte';
import Header from '$shared/ui/primitives/dialog/dialog-header.svelte';
import Footer from '$shared/ui/primitives/dialog/dialog-footer.svelte';
import Title from '$shared/ui/primitives/dialog/dialog-title.svelte';
import Description from '$shared/ui/primitives/dialog/dialog-description.svelte';
import Content, { type SheetSide, type SheetSize } from './sheet-content.svelte';

export {
	Root,
	Trigger,
	Content,
	Close,
	Header,
	Footer,
	Title,
	Description,
	type SheetSide,
	type SheetSize,
	//
	Root as Sheet,
	Trigger as SheetTrigger,
	Content as SheetContent,
	Close as SheetClose,
	Header as SheetHeader,
	Footer as SheetFooter,
	Title as SheetTitle,
	Description as SheetDescription
};
