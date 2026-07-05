import ImageUploader from './image-uploader.svelte';
import UploaderEmpty from './components/uploader-empty.svelte';
import UploadDialog from './components/upload-dialog.svelte';
import PhotoGallery from './components/photo-gallery.svelte';
import { getImageUploaderContext, setImageUploaderContext } from './lib/context';
import { ImageUploaderController, createImageUploader } from './lib/create-image-uploader.svelte';
import { ImageValidators, runImageValidators, issueMessage } from './lib/validators';
import { move, moveToFront } from './lib/reorder';
import type {
	RemoteImage,
	LocalImage,
	UploaderItem,
	ValidationIssue,
	ImageMeta,
	ImageValidatorFn,
	UploadResult,
	UploadFn,
	StagedStatus,
	StagedFile,
	RejectedFile,
	ImageUploaderOptions,
	ImageUploaderContext
} from './lib/types';

export {
	// Components — default orchestrator + composable sub-surfaces
	ImageUploader,
	UploaderEmpty,
	UploadDialog,
	PhotoGallery,
	// Controller
	createImageUploader,
	ImageUploaderController,
	getImageUploaderContext,
	setImageUploaderContext,
	// Validation
	ImageValidators,
	runImageValidators,
	issueMessage,
	// Reorder helpers
	move,
	moveToFront,
	// Types
	type RemoteImage,
	type LocalImage,
	type UploaderItem,
	type ValidationIssue,
	type ImageMeta,
	type ImageValidatorFn,
	type UploadResult,
	type UploadFn,
	type StagedStatus,
	type StagedFile,
	type RejectedFile,
	type ImageUploaderOptions,
	type ImageUploaderContext
};
