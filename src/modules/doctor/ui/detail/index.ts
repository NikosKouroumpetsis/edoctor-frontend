export { default } from './page/index.svelte';
export { default as DoctorDetailError } from './page/error.svelte';
export { DoctorDetailState, type DoctorDetailWindow } from './hooks/use-state.svelte';
export type {
	DoctorDetailErrorProps,
	DoctorDetailPageProps,
	DoctorSimilarAreaQuery
} from './types';
