/**
 * File-aware image validators, mirroring the shape of the form-field
 * `Validators` (`src/shared/lib/form/validators.ts`) but returning a richer
 * {@link ValidationIssue} (with a `code`) instead of a `{ key: true }` map, and
 * accepting the decoded {@link ImageMeta} so dimension/ratio rules can run.
 *
 * A validator returns `null` when the file passes, or a `ValidationIssue`
 * describing the failure. `issue.code` maps to `m.image_uploader_error_<code>`
 * at render time (with a generic fallback); a parent may attach a custom
 * `message` by wrapping a validator.
 */
import { m } from '$paraglide/messages.js';
import type { ImageMeta, ImageValidatorFn, ValidationIssue } from './types';

/** Does `file` satisfy one of the `accept` tokens (MIME, wildcard, or ext)? */
function matchesAccept(file: File, types: string[]): boolean {
	if (types.length === 0) return true;
	const fileType = file.type.toLowerCase();
	const name = file.name.toLowerCase();
	return types.some((raw) => {
		const type = raw.trim().toLowerCase();
		if (!type) return false;
		if (type.startsWith('.')) return name.endsWith(type);
		if (type.endsWith('/*')) return fileType.startsWith(type.slice(0, -1));
		return fileType === type;
	});
}

export const ImageValidators = {
	/** Reject files whose type/extension is not in `types` (e.g. `['image/*']`). */
	accept(types: string[]): ImageValidatorFn {
		return (file) =>
			matchesAccept(file, types)
				? null
				: { code: 'accept', meta: { accept: types.join(', '), type: file.type } };
	},
	/** Reject files larger than `bytes`. */
	maxSize(bytes: number): ImageValidatorFn {
		return (file) =>
			file.size <= bytes ? null : { code: 'maxSize', meta: { max: bytes, size: file.size } };
	},
	/** Reject files smaller than `bytes`. */
	minSize(bytes: number): ImageValidatorFn {
		return (file) =>
			file.size >= bytes ? null : { code: 'minSize', meta: { min: bytes, size: file.size } };
	},
	/** Reject images below `w`×`h`. Skipped when dimensions could not be decoded. */
	minDimensions(w: number, h: number): ImageValidatorFn {
		return (_file, meta) => {
			if (meta.width == null || meta.height == null) return null;
			return meta.width >= w && meta.height >= h
				? null
				: { code: 'minDimensions', meta: { minWidth: w, minHeight: h, ...meta } };
		};
	},
	/** Reject images above `w`×`h`. Skipped when dimensions could not be decoded. */
	maxDimensions(w: number, h: number): ImageValidatorFn {
		return (_file, meta) => {
			if (meta.width == null || meta.height == null) return null;
			return meta.width <= w && meta.height <= h
				? null
				: { code: 'maxDimensions', meta: { maxWidth: w, maxHeight: h, ...meta } };
		};
	},
	/** Reject images whose aspect ratio differs from `ratio` by > `tolerance`. */
	aspectRatio(ratio: number, tolerance = 0.01): ImageValidatorFn {
		return (_file, meta) => {
			if (!meta.width || !meta.height) return null;
			const actual = meta.width / meta.height;
			return Math.abs(actual - ratio) <= tolerance
				? null
				: { code: 'aspectRatio', meta: { ratio, actual } };
		};
	}
};

/**
 * Resolve a {@link ValidationIssue} to a localized message. A parent-supplied
 * `issue.message` wins; otherwise `issue.code` maps to
 * `m.image_uploader_error_<code>`, falling back to a generic message for
 * unknown codes. Shared by the per-tile error state and the dialog banner.
 */
export function issueMessage(issue: ValidationIssue): string {
	if (issue.message) return issue.message;
	const count = Number(issue.meta?.count ?? 0);
	switch (issue.code) {
		case 'accept':
			return m.image_uploader_error_accept();
		case 'maxSize':
			return m.image_uploader_error_maxSize();
		case 'minSize':
			return m.image_uploader_error_minSize();
		case 'minDimensions':
			return m.image_uploader_error_minDimensions();
		case 'maxDimensions':
			return m.image_uploader_error_maxDimensions();
		case 'aspectRatio':
			return m.image_uploader_error_aspectRatio();
		case 'minCount':
			return m.image_uploader_error_minCount({ count });
		case 'maxCount':
			return m.image_uploader_error_maxCount({ count });
		default:
			return m.image_uploader_error_generic();
	}
}

/** Run every validator against `file`/`meta` and collect all issues. */
export async function runImageValidators(
	file: File,
	meta: ImageMeta,
	validators: ImageValidatorFn[]
): Promise<ValidationIssue[]> {
	const issues: ValidationIssue[] = [];
	for (const validator of validators) {
		const issue = await validator(file, meta);
		if (issue) issues.push(issue);
	}
	return issues;
}
