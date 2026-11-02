import type { RichTextDoc } from '$shared/lib/rich-text';

/**
 * The CMS page `faq` as the route read it (the CMS reader is the legal module's, composed by the route): its body and
 * the language it came in (`null` body: a CMS without the page, the help centre's «empty»), or a failed read.
 */
export type HelpFaqSource =
	| { state: 'ready'; body: RichTextDoc | null; language: string | null }
	| { state: 'failed' };
