import { clampTextLength } from '$shared/lib/text';
import { MESSAGES_SEARCH_MAX_LENGTH } from '$modules/messages/config/limits';

/** Every control character (C0, DEL, C1): never part of a name, and the server refuses them. */
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/gu;

/**
 * 🔴 D-W51-80 · U-65.6: what the doctor's search asks the server — the words typed without control characters, trimmed
 * and cut at 40 (the server's own check stands whatever this says); `''` asks for every conversation.
 */
export function readInboxSearchQuery(value: string): string {
	return clampTextLength(value.replace(CONTROL, '').trim(), MESSAGES_SEARCH_MAX_LENGTH).trim();
}
