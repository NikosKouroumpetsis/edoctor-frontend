// Drawer reuses the Dialog state machine (same context). The content slides in
// from a screen edge and can be dragged toward that edge to dismiss.
import Root from '$shared/ui/primitives/dialog/dialog.svelte';
import Trigger from '$shared/ui/primitives/dialog/dialog-trigger.svelte';
import Close from '$shared/ui/primitives/dialog/dialog-close.svelte';
import Header from '$shared/ui/primitives/dialog/dialog-header.svelte';
import Footer from '$shared/ui/primitives/dialog/dialog-footer.svelte';
import Title from '$shared/ui/primitives/dialog/dialog-title.svelte';
import Description from '$shared/ui/primitives/dialog/dialog-description.svelte';
import Content, { type DrawerDirection, type DrawerSize } from './drawer-content.svelte';

export {
	Root,
	Trigger,
	Content,
	Close,
	Header,
	Footer,
	Title,
	Description,
	type DrawerDirection,
	type DrawerSize,
	//
	Root as Drawer,
	Trigger as DrawerTrigger,
	Content as DrawerContent,
	Close as DrawerClose,
	Header as DrawerHeader,
	Footer as DrawerFooter,
	Title as DrawerTitle,
	Description as DrawerDescription
};
