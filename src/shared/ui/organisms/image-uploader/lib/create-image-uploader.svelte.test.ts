import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createImageUploader } from './create-image-uploader.svelte';
import { ImageValidators } from './validators';
import type { RemoteImage, UploadFn } from './types';

// ── Object-URL shims ─────────────────────────────────────────────────────────
// jsdom does not implement URL.createObjectURL/revokeObjectURL; the controller
// feature-detects them, so we install spies to exercise (and assert) the
// preview create/revoke lifecycle. `browser` is `true` under the test mock.
let urlSeq = 0;
let createObjectURL: ReturnType<typeof vi.fn>;
let revokeObjectURL: ReturnType<typeof vi.fn>;

beforeEach(() => {
	urlSeq = 0;
	createObjectURL = vi.fn(() => `blob:mock/${++urlSeq}`);
	revokeObjectURL = vi.fn();
	(URL as unknown as { createObjectURL: unknown }).createObjectURL = createObjectURL;
	(URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = revokeObjectURL;
});

afterEach(() => {
	delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL;
	delete (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL;
});

function png(name = 'a.png', sizeBytes = 4): File {
	return new File(['x'.repeat(sizeBytes)], name, { type: 'image/png' });
}

function remote(id: string): RemoteImage {
	return { kind: 'remote', id, url: `https://cdn/${id}.jpg` };
}

describe('createImageUploader — staging & validation', () => {
	it('stages valid files and creates a preview per file', async () => {
		const c = createImageUploader();
		await c.pickFiles([png('a.png'), png('b.png')]);
		expect(c.staged).toHaveLength(2);
		expect(c.stagedValid).toHaveLength(2);
		expect(createObjectURL).toHaveBeenCalledTimes(2);
		expect(c.staged[0].previewUrl).toMatch(/^blob:mock\//);
	});

	it('marks files that fail an injected validator as invalid and reports them', async () => {
		const onReject = vi.fn();
		const c = createImageUploader({
			validators: [ImageValidators.accept(['image/jpeg'])],
			onReject
		});
		await c.pickFiles([png('a.png')]);
		expect(c.staged[0].status).toBe('invalid');
		expect(c.staged[0].issues[0].code).toBe('accept');
		expect(c.stagedValid).toHaveLength(0);
		expect(c.rejected).toHaveLength(1);
		expect(onReject).toHaveBeenCalledTimes(1);
	});

	it('honours single-select mode by staging only the first file', async () => {
		const c = createImageUploader({ multiple: false });
		await c.pickFiles([png('a.png'), png('b.png')]);
		expect(c.staged).toHaveLength(1);
	});

	it('revokes the preview URL when a staged file is removed', async () => {
		const c = createImageUploader();
		await c.pickFiles([png('a.png')]);
		const url = c.staged[0].previewUrl;
		c.removeStaged(c.staged[0].id);
		expect(c.staged).toHaveLength(0);
		expect(revokeObjectURL).toHaveBeenCalledWith(url);
	});
});

describe('createImageUploader — count gating', () => {
	it('blocks confirm when staging would exceed maxCount', async () => {
		const c = createImageUploader({ items: [remote('x')], maxCount: 2 });
		await c.pickFiles([png('a.png'), png('b.png')]);
		expect(c.countIssue?.code).toBe('maxCount');
		expect(c.canUpload).toBe(false);
	});

	it('exposes remainingToMin relative to current items', () => {
		const c = createImageUploader({ items: [remote('x')], minCount: 5 });
		expect(c.remainingToMin).toBe(4);
	});

	it('canUpload is true once at least one valid file is staged within limits', async () => {
		const c = createImageUploader({ maxCount: 5 });
		await c.pickFiles([png('a.png')]);
		expect(c.canUpload).toBe(true);
	});
});

describe('createImageUploader — selection-only commit', () => {
	it('commits valid staged files as local items, clears staging, keeps their previews', async () => {
		const onChange = vi.fn();
		const c = createImageUploader({ onChange });
		c.openDialog();
		await c.pickFiles([png('a.png'), png('b.png')]);
		const previews = c.staged.map((s) => s.previewUrl);
		await c.confirm();

		expect(c.items).toHaveLength(2);
		expect(c.items.every((i) => i.kind === 'local')).toBe(true);
		expect(c.staged).toHaveLength(0);
		expect(c.dialogOpen).toBe(false);
		expect(onChange).toHaveBeenCalled();
		// Committed previews are transferred to the items, NOT revoked.
		for (const url of previews) expect(revokeObjectURL).not.toHaveBeenCalledWith(url);
	});
});

describe('createImageUploader — upload lifecycle', () => {
	it('uploads valid files, reports progress, and commits remote items', async () => {
		const upload: UploadFn = vi.fn(async (_file, { onProgress }) => {
			onProgress(50);
			onProgress(100);
			return { id: 'r1', url: 'https://cdn/r1.jpg' };
		});
		const onChange = vi.fn();
		const c = createImageUploader({ upload, onChange });
		await c.pickFiles([png('a.png')]);
		const previewUrl = c.staged[0].previewUrl;
		await c.confirm();

		expect(upload).toHaveBeenCalledTimes(1);
		expect(c.items).toHaveLength(1);
		expect(c.items[0]).toMatchObject({ kind: 'remote', id: 'r1', url: 'https://cdn/r1.jpg' });
		expect(c.staged).toHaveLength(0);
		expect(c.dialogOpen).toBe(false);
		// The preview was replaced by the remote URL and revoked.
		expect(revokeObjectURL).toHaveBeenCalledWith(previewUrl);
	});

	it('marks a rejected upload as error and keeps the dialog open', async () => {
		const upload: UploadFn = vi.fn(async () => {
			throw new Error('network');
		});
		const c = createImageUploader({ upload });
		c.openDialog();
		await c.pickFiles([png('a.png')]);
		await c.confirm();

		expect(c.staged).toHaveLength(1);
		expect(c.staged[0].status).toBe('error');
		expect(c.items).toHaveLength(0);
		expect(c.dialogOpen).toBe(true);
	});

	it('cancels an in-flight upload and removes the tile', async () => {
		const upload: UploadFn = (_file, { signal }) =>
			new Promise((_resolve, reject) => {
				signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
			});
		const c = createImageUploader({ upload });
		await c.pickFiles([png('a.png')]);
		const id = c.staged[0].id;
		const url = c.staged[0].previewUrl;
		const pending = c.confirm();
		c.cancelStaged(id);
		await pending;

		expect(c.staged).toHaveLength(0);
		expect(c.items).toHaveLength(0);
		expect(revokeObjectURL).toHaveBeenCalledWith(url);
	});
});

describe('createImageUploader — gallery ops', () => {
	it('reports cover as the first item and promotes with moveToFront/setCover', () => {
		const onChange = vi.fn();
		const c = createImageUploader({ items: [remote('a'), remote('b'), remote('c')], onChange });
		expect(c.coverId).toBe('a');
		c.setCover('c');
		expect(c.items.map((i) => i.id)).toEqual(['c', 'a', 'b']);
		expect(c.coverId).toBe('c');
		expect(onChange).toHaveBeenCalled();
	});

	it('reorders via move(from, to)', () => {
		const c = createImageUploader({ items: [remote('a'), remote('b'), remote('c')] });
		c.move(0, 2);
		expect(c.items.map((i) => i.id)).toEqual(['b', 'c', 'a']);
	});

	it('removes an item and calls the edit callback', () => {
		const onEdit = vi.fn();
		const c = createImageUploader({ items: [remote('a'), remote('b')], onEdit });
		c.edit('b');
		expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
		c.remove('a');
		expect(c.items.map((i) => i.id)).toEqual(['b']);
	});
});

describe('createImageUploader — lifecycle', () => {
	it('revokes local previews on destroy', async () => {
		const c = createImageUploader();
		await c.pickFiles([png('a.png')]);
		await c.confirm(); // commits as local item, preview retained
		const localUrl = c.items[0].kind === 'local' ? c.items[0].previewUrl : '';
		c.destroy();
		expect(revokeObjectURL).toHaveBeenCalledWith(localUrl);
	});
});
