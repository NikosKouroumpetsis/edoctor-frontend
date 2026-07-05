/**
 * Public contracts for the `image-uploader` organism.
 *
 * Type-only module: no runtime values live here (contract §Naming — keep
 * `types.ts` type-only). The runes controller in
 * `create-image-uploader.svelte.ts` implements {@link ImageUploaderContext};
 * component sub-parts read that shape through the shared context.
 */

/** An image that already exists remotely (edit flows / seeded galleries). */
export type RemoteImage = {
	kind: 'remote';
	id: string;
	url: string;
	alt?: string;
	width?: number;
	height?: number;
};

/** A freshly-picked local file with a browser object URL preview. */
export type LocalImage = {
	kind: 'local';
	id: string;
	file: File;
	previewUrl: string;
	width?: number;
	height?: number;
};

/** A single ordered gallery item; index `0` is the cover photo. */
export type UploaderItem = RemoteImage | LocalImage;

/** A validation failure. `code` maps to `m.image_uploader_error_<code>`. */
export type ValidationIssue = { code: string; message?: string; meta?: Record<string, unknown> };

/** Decoded intrinsic dimensions, when a browser decode succeeded. */
export type ImageMeta = { width?: number; height?: number };

/** Parent-injected, file-aware validator. Sync or async (dimensions decode). */
export type ImageValidatorFn = (
	file: File,
	meta: ImageMeta
) => ValidationIssue | null | Promise<ValidationIssue | null>;

/** What an injected `upload` may return to seed a committed remote item. */
export type UploadResult = { id?: string; url?: string; alt?: string } | void;

/** Optional parent-owned transport. Absent → selection-only mode. */
export type UploadFn = (
	file: File,
	ctx: { signal: AbortSignal; onProgress: (p: number) => void }
) => Promise<UploadResult>;

/** Lifecycle of a file staged inside the upload dialog. */
export type StagedStatus =
	| 'valid'
	| 'invalid'
	| 'queued'
	| 'uploading'
	| 'done'
	| 'error'
	| 'canceled';

/** A file staged in the dialog before it is committed to `items`. */
export type StagedFile = {
	id: string;
	file: File;
	previewUrl: string;
	meta: ImageMeta;
	status: StagedStatus;
	progress: number;
	issues: ValidationIssue[];
	controller?: AbortController;
	result?: UploadResult;
};

/** A rejected file grouped with the issues that rejected it (A3 banner). */
export type RejectedFile = { file: File; issues: ValidationIssue[] };

/** Construction options for {@link ImageUploaderContext}. */
export type ImageUploaderOptions = {
	/** Seed items (works controlled or uncontrolled at the component level). */
	items?: UploaderItem[];
	/** `accept` attribute for the hidden file input. Default `'image/*'`. */
	accept?: string;
	/** Allow selecting multiple files. Default `true`. */
	multiple?: boolean;
	minCount?: number;
	maxCount?: number;
	/** Parent-injected per-file validators (compose from `ImageValidators`). */
	validators?: ImageValidatorFn[];
	/** Optional transport; present → in-dialog progress/cancel (A1). */
	upload?: UploadFn;
	onChange?: (items: UploaderItem[]) => void;
	onReject?: (rejected: RejectedFile[]) => void;
	/** A7 placeholder hook for the "Edit" menu action. */
	onEdit?: (item: UploaderItem) => void;
};

/**
 * The controller's public shape, shared with every sub-part through context.
 * Getters are reactive reads over the controller's runes state.
 */
export interface ImageUploaderContext {
	// Config
	readonly accept: string;
	readonly multiple: boolean;
	readonly minCount: number | undefined;
	readonly maxCount: number | undefined;
	readonly hasUpload: boolean;

	// State
	readonly items: UploaderItem[];
	readonly staged: StagedFile[];
	readonly rejected: RejectedFile[];
	readonly dialogOpen: boolean;
	readonly menuOpenFor: string | null;

	// Derived
	readonly count: number;
	readonly coverId: string | undefined;
	readonly isUploading: boolean;
	readonly stagedValid: StagedFile[];
	readonly uploadedCount: number;
	readonly totalStaged: number;
	readonly canUpload: boolean;
	readonly remainingToMin: number;
	readonly countIssue: ValidationIssue | null;

	// Dialog + staging
	openDialog(): void;
	closeDialog(): void;
	pickFiles(files: FileList | File[]): Promise<void>;
	removeStaged(id: string): void;
	clearStaged(): void;
	confirm(): Promise<void>;
	cancelStaged(id: string): void;
	cancelAll(): void;

	// Gallery
	remove(id: string): void;
	moveToFront(id: string): void;
	move(from: number, to: number): void;
	setCover(id: string): void;
	edit(id: string): void;

	// External / lifecycle
	setItems(next: UploaderItem[]): void;
	setMenuOpen(id: string | null): void;
	destroy(): void;
}
