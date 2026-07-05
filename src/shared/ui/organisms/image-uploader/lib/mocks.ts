/**
 * Story-only mock fixtures for the image-uploader.
 *
 * Shared by the composed stories and every per-part `*.stories.svelte` so the
 * mock uploaders, seed images, and staged-file builders are defined once. This
 * module is internal to the organism and is intentionally NOT re-exported from
 * `index.ts` (it is not part of the public API).
 */
import type { RemoteImage, StagedFile, UploadFn, ValidationIssue } from './types';

/** A tiny 1×1 PNG so tiles render a real (if minimal) `File` preview. */
const TINY_PNG_BASE64 =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

/** A distinct solid-colour data-URI image (no network needed). */
export function dataUri(color: string): string {
	const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><rect width='48' height='48' fill='${color}'/></svg>`;
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** A seeded remote gallery item with a coloured data-URI source. */
export function remoteItem(id: string, color: string): RemoteImage {
	return { kind: 'remote', id, url: dataUri(color), alt: id };
}

/** Three visually-distinct seeded items for gallery stories. */
export const seededItems: RemoteImage[] = [
	remoteItem('a', '#2563eb'),
	remoteItem('b', '#16a34a'),
	remoteItem('c', '#f59e0b')
];

/** Build a sample image `File`; `type` drives the `accept` validator. */
export function sampleImage(name: string, type = 'image/png'): File {
	const bytes = Uint8Array.from(atob(TINY_PNG_BASE64), (c) => c.charCodeAt(0));
	return new File([bytes], name, { type });
}

export function samplePng(name: string): File {
	return sampleImage(name, 'image/png');
}

/** Progressive uploader that reports progress, then resolves to a remote ref. */
export const mockUpload: UploadFn = (file, { signal, onProgress }) =>
	new Promise((resolve, reject) => {
		let pct = 0;
		const timer = setInterval(() => {
			pct += 20;
			onProgress(Math.min(pct, 100));
			if (pct >= 100) {
				clearInterval(timer);
				resolve({ id: crypto.randomUUID(), url: URL.createObjectURL(file) });
			}
		}, 150);
		signal.addEventListener('abort', () => {
			clearInterval(timer);
			reject(new DOMException('aborted', 'AbortError'));
		});
	});

/** Uploader that advances to mid-progress and then never settles (until abort). */
export const pendingUpload: UploadFn = (_file, { signal, onProgress }) =>
	new Promise((_resolve, reject) => {
		onProgress(60);
		signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
	});

/** Uploader that always rejects — drives the error state. */
export const failingUpload: UploadFn = () => Promise.reject(new Error('network failed'));

/** Build a `StagedFile` in an explicit status for per-tile stories. */
export function makeStaged(overrides: Partial<StagedFile> = {}): StagedFile {
	const issues: ValidationIssue[] = overrides.issues ?? [];
	return {
		id: overrides.id ?? crypto.randomUUID(),
		file: overrides.file ?? sampleImage('photo.png'),
		previewUrl: overrides.previewUrl ?? dataUri('#94a3b8'),
		meta: overrides.meta ?? { width: 1200, height: 800 },
		status: overrides.status ?? 'valid',
		progress: overrides.progress ?? 0,
		issues,
		controller: overrides.controller,
		result: overrides.result
	};
}
