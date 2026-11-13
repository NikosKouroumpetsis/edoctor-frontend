export { confirmDeletion, previewDeletion, startDeletion } from './endpoints';
export { readDeletionFailure } from './failure';
export { mapDeletionCodeSent, mapDeletionPreview } from './map';
export { deletionPreviewKey, deletionPreviewQuery } from './queries';
export type {
	DeletionChannel,
	DeletionCodeSent,
	DeletionFailureKind,
	DeletionPreviewFacts,
	DeletionRemovedItem,
	DeletionRetainedItem
} from './types';
