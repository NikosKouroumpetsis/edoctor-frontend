import Root, {
	type ModalScreenBackProps,
	type ModalScreenCloseProps,
	type ModalScreenContentAlignment,
	type ModalScreenTitleSize
} from './modal-screen.svelte';
import Surface, {
	MODAL_ZOOM_DURATION,
	zoomEnd,
	type ModalOrigin,
	type ModalSurfaceTone,
	type ModalZoomEnd
} from './modal-screen-surface.svelte';

export {
	Root,
	Surface,
	//
	Root as ModalScreenTemplate,
	Surface as ModalScreenSurface,
	MODAL_ZOOM_DURATION,
	zoomEnd,
	type ModalOrigin,
	type ModalScreenBackProps,
	type ModalScreenCloseProps,
	type ModalScreenContentAlignment,
	type ModalScreenTitleSize,
	type ModalSurfaceTone,
	type ModalZoomEnd
};
