export { default } from './page/index.svelte';
export { default as AppointmentTimeChange } from './page/time.svelte';
export { default as AppointmentVisitorChange } from './page/for-whom.svelte';
export { default as AppointmentRelativeAdd } from './page/relative.svelte';
export { default as AppointmentNoteChange } from './page/note.svelte';
export type {
	AppointmentChangeProps,
	AppointmentChangeScreenProps,
	AppointmentRelativeAddProps,
	AppointmentTimeChangeProps
} from './types';
