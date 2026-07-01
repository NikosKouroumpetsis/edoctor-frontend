import Root from './dialog.svelte';
import Trigger from './dialog-trigger.svelte';
import Content, { type DialogSize } from './dialog-content.svelte';
import Close from './dialog-close.svelte';
import Header from './dialog-header.svelte';
import Footer from './dialog-footer.svelte';
import Title from './dialog-title.svelte';
import Description from './dialog-description.svelte';

export {
	Root,
	Trigger,
	Content,
	Close,
	Header,
	Footer,
	Title,
	Description,
	type DialogSize,
	//
	Root as Dialog,
	Trigger as DialogTrigger,
	Content as DialogContent,
	Close as DialogClose,
	Header as DialogHeader,
	Footer as DialogFooter,
	Title as DialogTitle,
	Description as DialogDescription
};
