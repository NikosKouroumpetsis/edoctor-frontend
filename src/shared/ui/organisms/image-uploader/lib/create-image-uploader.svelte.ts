/**
 * `createImageUploader` — the runes controller behind the `image-uploader`
 * organism. It owns the full photo-management state machine (gallery items,
 * staged files in the dialog, validation, and the optional upload lifecycle)
 * and is shared with every sub-part through context.
 *
 * Boundaries (contract §State, §Security):
 *  - Browser-only APIs (`URL.createObjectURL`, image decode) run only in the
 *    browser, guarded by `$app/environment`'s `browser` flag and feature
 *    detection, so the controller is safe to instantiate during SSR.
 *  - Every local object URL is revoked on remove / cancel / commit-to-remote /
 *    destroy, so previews never leak.
 */
import { browser } from '$app/environment';
import { move as moveItem, moveToFront as moveItemToFront } from './reorder';
import { runImageValidators } from './validators';
import type {
	ImageMeta,
	ImageUploaderContext,
	ImageUploaderOptions,
	ImageValidatorFn,
	LocalImage,
	RejectedFile,
	RemoteImage,
	StagedFile,
	UploaderItem,
	ValidationIssue
} from './types';

let __idCounter = 0;
function newId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `iu-${Date.now().toString(36)}-${(++__idCounter).toString(36)}`;
}

/** Create a browser object URL preview, or `''` when unavailable (SSR/jsdom). */
function createPreview(file: File): string {
	if (browser && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
		return URL.createObjectURL(file);
	}
	return '';
}

function revokePreview(url: string | undefined): void {
	if (url && browser && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
		URL.revokeObjectURL(url);
	}
}

/** Best-effort decode of intrinsic dimensions; `{}` when it cannot decode. */
async function decodeMeta(file: File, previewUrl: string): Promise<ImageMeta> {
	if (!browser) return {};
	try {
		if (typeof createImageBitmap === 'function') {
			const bitmap = await createImageBitmap(file);
			const meta = { width: bitmap.width, height: bitmap.height };
			bitmap.close?.();
			return meta;
		}
	} catch {
		/* fall through to the <img> decode path */
	}
	try {
		if (typeof Image === 'function' && previewUrl) {
			const img = new Image();
			img.src = previewUrl;
			await img.decode();
			return { width: img.naturalWidth, height: img.naturalHeight };
		}
	} catch {
		/* undecodable (or jsdom) — leave dimensions unknown */
	}
	return {};
}

export class ImageUploaderController implements ImageUploaderContext {
	items = $state<UploaderItem[]>([]);
	staged = $state<StagedFile[]>([]);
	rejected = $state<RejectedFile[]>([]);
	dialogOpen = $state(false);
	menuOpenFor = $state<string | null>(null);

	#options: ImageUploaderOptions;
	#validators: ImageValidatorFn[];

	constructor(options: ImageUploaderOptions = {}) {
		this.#options = options;
		this.#validators = options.validators ?? [];
		this.items = options.items ? [...options.items] : [];
	}

	// ── Config ────────────────────────────────────────────────────────────────
	get accept(): string {
		return this.#options.accept ?? 'image/*';
	}
	get multiple(): boolean {
		return this.#options.multiple ?? true;
	}
	get minCount(): number | undefined {
		return this.#options.minCount;
	}
	get maxCount(): number | undefined {
		return this.#options.maxCount;
	}
	get hasUpload(): boolean {
		return typeof this.#options.upload === 'function';
	}

	// ── Derived ───────────────────────────────────────────────────────────────
	get count(): number {
		return this.items.length;
	}
	get coverId(): string | undefined {
		return this.items[0]?.id;
	}
	get isUploading(): boolean {
		return this.staged.some((s) => s.status === 'uploading');
	}
	get stagedValid(): StagedFile[] {
		return this.staged.filter((s) => s.status === 'valid');
	}
	get uploadedCount(): number {
		return this.staged.filter((s) => s.status === 'done').length;
	}
	get totalStaged(): number {
		return this.staged.length;
	}
	get remainingToMin(): number {
		return this.minCount == null ? 0 : Math.max(0, this.minCount - this.count);
	}
	get countIssue(): ValidationIssue | null {
		if (this.maxCount != null && this.count + this.stagedValid.length > this.maxCount) {
			return { code: 'maxCount', meta: { count: this.maxCount } };
		}
		return null;
	}
	get canUpload(): boolean {
		if (this.isUploading) return false;
		if (this.stagedValid.length === 0) return false;
		return this.countIssue == null;
	}

	// ── Dialog + staging ────────────────────────────────────────────────────────
	openDialog(): void {
		this.dialogOpen = true;
	}

	closeDialog(): void {
		this.clearStaged();
		this.dialogOpen = false;
	}

	async pickFiles(files: FileList | File[]): Promise<void> {
		const list = Array.from(files);
		if (list.length === 0) return;
		const selected = this.multiple ? list : list.slice(0, 1);
		const rejected: RejectedFile[] = [];

		for (const file of selected) {
			const id = newId();
			const previewUrl = createPreview(file);
			const entry: StagedFile = {
				id,
				file,
				previewUrl,
				meta: {},
				status: 'valid',
				progress: 0,
				issues: []
			};
			this.staged.push(entry);

			// Decode before validating; a file removed mid-decode must be dropped
			// (guard by re-checking that its id is still staged) and its URL revoked.
			const meta = await decodeMeta(file, previewUrl);
			if (!this.#isStaged(id)) {
				revokePreview(previewUrl);
				continue;
			}
			const issues = await runImageValidators(file, meta, this.#validators);
			const current = this.staged.find((s) => s.id === id);
			if (!current) {
				revokePreview(previewUrl);
				continue;
			}
			current.meta = meta;
			current.issues = issues;
			current.status = issues.length ? 'invalid' : 'valid';
			if (issues.length) rejected.push({ file, issues });
		}

		if (rejected.length) {
			this.rejected = [...this.rejected, ...rejected];
			this.#options.onReject?.(rejected);
		}
	}

	removeStaged(id: string): void {
		const index = this.staged.findIndex((s) => s.id === id);
		if (index < 0) return;
		const [entry] = this.staged.splice(index, 1);
		entry.controller?.abort();
		revokePreview(entry.previewUrl);
	}

	clearStaged(): void {
		for (const entry of this.staged) {
			entry.controller?.abort();
			revokePreview(entry.previewUrl);
		}
		this.staged = [];
		this.rejected = [];
	}

	cancelStaged(id: string): void {
		this.removeStaged(id);
	}

	cancelAll(): void {
		this.clearStaged();
	}

	async confirm(): Promise<void> {
		if (this.hasUpload) return this.#runUploads();
		return this.#commitLocal();
	}

	#commitLocal(): void {
		const valid = this.stagedValid;
		if (valid.length === 0) return;
		const committed: LocalImage[] = valid.map((s) => ({
			kind: 'local',
			id: s.id,
			file: s.file,
			previewUrl: s.previewUrl,
			width: s.meta.width,
			height: s.meta.height
		}));
		// Revoke previews of any staged file we are NOT committing (invalid ones).
		for (const entry of this.staged) {
			if (!valid.includes(entry)) revokePreview(entry.previewUrl);
		}
		this.items = [...this.items, ...committed];
		this.staged = [];
		this.rejected = [];
		this.#emitChange();
		this.dialogOpen = false;
	}

	async #runUploads(): Promise<void> {
		const valid = this.stagedValid;
		if (valid.length === 0) return;
		await Promise.allSettled(valid.map((entry) => this.#uploadOne(entry.id)));

		const done = this.staged.filter((s) => s.status === 'done');
		if (done.length) {
			const committed: RemoteImage[] = done.map((s) => {
				const url = s.result?.url;
				return {
					kind: 'remote',
					id: s.result?.id ?? s.id,
					url: url ?? s.previewUrl,
					alt: s.result?.alt,
					width: s.meta.width,
					height: s.meta.height
				};
			});
			// Only revoke previews we replaced with a real remote URL; if the result
			// carried no URL we keep the object URL alive as the item's source.
			for (const s of done) if (s.result?.url) revokePreview(s.previewUrl);
			this.items = [...this.items, ...committed];
			this.staged = this.staged.filter((s) => s.status !== 'done');
			this.#emitChange();
		}

		// Close only when nothing is left needing attention (errors stay visible).
		if (this.staged.length === 0) {
			this.rejected = [];
			this.dialogOpen = false;
		}
	}

	async #uploadOne(id: string): Promise<void> {
		const upload = this.#options.upload;
		if (!upload) return;
		const start = this.staged.find((s) => s.id === id);
		if (!start) return;
		const controller = new AbortController();
		start.controller = controller;
		start.status = 'uploading';
		start.progress = 0;
		try {
			const result = await upload(start.file, {
				signal: controller.signal,
				onProgress: (p) => {
					const cur = this.staged.find((s) => s.id === id);
					if (cur) cur.progress = Math.max(0, Math.min(100, p));
				}
			});
			const cur = this.staged.find((s) => s.id === id);
			if (!cur) return;
			cur.result = result ?? undefined;
			cur.status = 'done';
			cur.progress = 100;
		} catch {
			const cur = this.staged.find((s) => s.id === id);
			if (!cur) return;
			cur.status = controller.signal.aborted ? 'canceled' : 'error';
		} finally {
			const cur = this.staged.find((s) => s.id === id);
			if (cur) cur.controller = undefined;
		}
	}

	// ── Gallery ─────────────────────────────────────────────────────────────────
	remove(id: string): void {
		const index = this.items.findIndex((i) => i.id === id);
		if (index < 0) return;
		const [item] = this.items.splice(index, 1);
		if (item.kind === 'local') revokePreview(item.previewUrl);
		if (this.menuOpenFor === id) this.menuOpenFor = null;
		this.#emitChange();
	}

	moveToFront(id: string): void {
		const index = this.items.findIndex((i) => i.id === id);
		if (index <= 0) return;
		this.items = moveItemToFront(this.items, index);
		this.#emitChange();
	}

	move(from: number, to: number): void {
		if (from === to) return;
		this.items = moveItem(this.items, from, to);
		this.#emitChange();
	}

	setCover(id: string): void {
		this.moveToFront(id);
	}

	edit(id: string): void {
		const item = this.items.find((i) => i.id === id);
		if (item) this.#options.onEdit?.(item);
	}

	// ── External / lifecycle ─────────────────────────────────────────────────────
	setItems(next: UploaderItem[]): void {
		this.items = next;
	}

	setMenuOpen(id: string | null): void {
		this.menuOpenFor = id;
	}

	destroy(): void {
		for (const entry of this.staged) {
			entry.controller?.abort();
			revokePreview(entry.previewUrl);
		}
		for (const item of this.items) {
			if (item.kind === 'local') revokePreview(item.previewUrl);
		}
		this.staged = [];
	}

	// ── Internals ────────────────────────────────────────────────────────────────
	#isStaged(id: string): boolean {
		return this.staged.some((s) => s.id === id);
	}

	#emitChange(): void {
		this.#options.onChange?.(this.items);
	}
}

/** Factory mirroring `createForm`; returns a fresh controller instance. */
export function createImageUploader(options: ImageUploaderOptions = {}): ImageUploaderController {
	return new ImageUploaderController(options);
}
