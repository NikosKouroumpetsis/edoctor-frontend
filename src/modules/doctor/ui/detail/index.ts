export { default } from './page/index.svelte';
export { default as DoctorDetailError } from './page/error.svelte';
export { default as DoctorAbout } from './page/about.svelte';
export { DoctorDetailState, type DoctorDetailWindow } from './hooks/use-state.svelte';
export type {
	DoctorAboutPageProps,
	DoctorDetailErrorProps,
	DoctorDetailPageProps,
	DoctorSimilarAreaQuery
} from './types';
