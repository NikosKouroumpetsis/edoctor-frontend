import type { DeletionChannel, DeletionCodeSent, DeletionPreviewFacts } from './types';

// A code of the server (an item, a warning, a category) as it may ever spell one; a mask as long as any real one.
const CODE = /^[A-Za-z][A-Za-z0-9_]{0,63}$/u;
const MAX_MASK_LENGTH = 120;
const MAX_ROWS = 100;
const MAX_COUNT = 1_000_000_000;
const MAX_YEARS = 100;

const record = (value: unknown): Record<string, unknown> | null =>
	value && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;

const code = (value: unknown): string | null =>
	typeof value === 'string' && CODE.test(value) ? value : null;

const rows = (value: unknown): unknown[] => (Array.isArray(value) ? value.slice(0, MAX_ROWS) : []);

const channel = (value: unknown): DeletionChannel | null =>
	value === 'email' || value === 'phone' ? value : null;

const whole = (value: unknown, max: number): number | null =>
	typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max ? value : null;

/** 🔴 U-65.6: the destination only when it is a mask (`e***a@example.gr`, `+30 69•• ••• 678`) — a whole address is none. */
function mask(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed && trimmed.length <= MAX_MASK_LENGTH && /[•*]/u.test(trimmed) ? trimmed : null;
}

/**
 * The preview, checked at the boundary (W-4: a broken answer never throws): `null` when it does not say whether the
 * deletion is allowed; a row whose code or number is not one is dropped, never guessed.
 */
export function mapDeletionPreview(view: unknown): DeletionPreviewFacts | null {
	const data = record(view);
	if (!data || typeof data.allowed !== 'boolean') return null;
	return {
		allowed: data.allowed,
		refusal: code(data.refusal),
		codeChannel: channel(data.codeChannel),
		codeDestinationMasked: mask(data.codeDestinationMasked),
		removed: rows(data.removed).flatMap((entry) => {
			const item = code(record(entry)?.item);
			const count = whole(record(entry)?.count, MAX_COUNT);
			return item && count !== null ? [{ item, count }] : [];
		}),
		warnings: rows(data.warnings).flatMap((entry) => {
			const warning = code(entry);
			return warning ? [warning] : [];
		}),
		retained: rows(data.retained).flatMap((entry) => {
			const category = code(record(entry)?.category);
			const purpose = code(record(entry)?.purpose);
			const maxRetentionYears = whole(record(entry)?.maxRetentionYears, MAX_YEARS);
			return category && purpose && maxRetentionYears !== null
				? [{ category, purpose, maxRetentionYears }]
				: [];
		})
	};
}

/** The channel the code went to, `null` for an answer that names none. */
export function mapDeletionCodeSent(view: unknown): DeletionCodeSent | null {
	const sent = channel(record(view)?.channel);
	return sent ? { channel: sent } : null;
}
