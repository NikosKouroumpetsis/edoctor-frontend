/**
 * A node of a backend rich-text document, deliberately tolerant (the application's `shared/lib/rich-text`): every
 * field optional, both child spellings (`content`, `children`). Three shapes arrive: tiptap (`{ type: 'paragraph',
 * content: [{ type: 'text', text, marks }] }`), slate (`{ type: 'paragraph', children: [{ text, bold }] }`) and the
 * seed's plain `{ type, text }` (a heading with `attrs: { level, anchor?, label?, popular?, popularRank? }`, the backend's s610b).
 */
export type RichTextMark = { type?: string | null; attrs?: { href?: string | null } | null };

export type RichTextNode = {
	type?: string | null;
	text?: string | null;
	attrs?: {
		level?: number | string | null;
		anchor?: string | null;
		href?: string | null;
		label?: string | null;
		popular?: boolean | null;
		popularRank?: number | null;
	} | null;
	marks?: RichTextMark[] | null;
	content?: RichTextNode[] | null;
	children?: RichTextNode[] | null;
	level?: number | null;
	bold?: boolean | null;
	italic?: boolean | null;
	url?: string | null;
	href?: string | null;
};

/** A backend rich-text document: `content` (tiptap, the CMS and the articles) or `blocks` (slate), or both. */
export type RichTextDoc = {
	type?: string | null;
	content?: RichTextNode[] | null;
	blocks?: RichTextNode[] | null;
};

/** One document, or several read as ONE (an article's sections): their headings share one set of ids. */
export type RichTextInput =
	| RichTextDoc
	| readonly (RichTextDoc | null | undefined)[]
	| null
	| undefined;

/** A link the renderer may draw: http(s) opens a new tab (`external`), `mailto:`, `tel:` and `/…` stay. */
export type RichTextLink = { href: string; external: boolean };

export type RichTextRun = { text: string; bold: boolean; italic: boolean };

/** Runs that share one link (or none): the renderer draws a span as one `<a>` or as plain words. */
export type RichTextSpan = { link: RichTextLink | null; runs: RichTextRun[] };

export type RichTextHeadingLevel = 2 | 3 | 4;

export type RichTextListItem = { key: string; blocks: RichTextBlock[] };

/** The allowlist (U-57.4, common v2 §B): paragraph, heading 2–4, a list (bullets or numbers) of items. Nothing else is drawn. */
export type RichTextBlock =
	| { kind: 'paragraph'; key: string; spans: RichTextSpan[] }
	| {
			kind: 'heading';
			key: string;
			level: RichTextHeadingLevel;
			id: string;
			text: string;
			/** The CMS's short name of a heading (`attrs.label`, an FAQ topic's chip), when it gives one. */
			label: string | null;
			/** The CMS's «popular» mark of a heading (`attrs.popular`, an FAQ question). */
			popular: boolean;
			/** The popular question's place (`attrs.popularRank`, a whole number from 1), when the CMS orders them. */
			popularRank: number | null;
	  }
	| { kind: 'list'; key: string; ordered: boolean; items: RichTextListItem[] };

export type RichTextHeading = { id: string; label: string; level: RichTextHeadingLevel };

export type RichTextContent = { blocks: RichTextBlock[]; headings: RichTextHeading[] };

/** One entry of «Σε αυτό το άρθρο»: the heading's id (the body's own) and its words. */
export type RichTextTocEntry = { id: string; label: string };

const PARAGRAPH = new Set(['paragraph', 'p']);
const HEADING_WORDS = new Map<string, number>([
	['headingone', 1],
	['headingtwo', 2],
	['headingthree', 3],
	['headingfour', 4],
	['headingfive', 5],
	['headingsix', 6]
]);
const UNORDERED = new Set(['bulletlist', 'bulletedlist', 'unorderedlist', 'ul']);
const ORDERED = new Set(['orderedlist', 'numberedlist', 'ol']);
const LIST_ITEM = new Set(['listitem', 'li']);
const LINK = new Set(['link', 'a']);
const BREAK = new Set(['hardbreak', 'br']);
const BOLD = new Set(['bold', 'strong']);
const ITALIC = new Set(['italic', 'em']);

/** An author's `attrs.anchor`: lowercase latin letters and digits joined by single hyphens (the application's). */
const ANCHOR = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
/** At most this many characters make an id (an authored anchor or the slug of the words). */
const HEADING_ID_LIMIT = 80;

const typeOf = (node: { type?: string | null } | null | undefined): string =>
	typeof node?.type === 'string'
		? node.type
				.trim()
				.toLowerCase()
				.replace(/[\s_-]+/gu, '')
		: '';

const childrenOf = (node: RichTextNode): RichTextNode[] => [
	...(Array.isArray(node.content) ? node.content : []),
	...(Array.isArray(node.children) ? node.children : [])
];

const isNode = (value: unknown): value is RichTextNode =>
	Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** The heading level a node names (`attrs.level`, `level`, `h3`, `heading-three`), else `null`. */
function headingLevelOf(node: RichTextNode): RichTextHeadingLevel | null {
	const type = typeOf(node);
	const named = /^h([1-6])$/u.exec(type);
	let fromType: number | null;
	if (named) fromType = Number(named[1]);
	else if (HEADING_WORDS.has(type)) fromType = HEADING_WORDS.get(type) ?? null;
	else if (type === 'heading') fromType = null;
	else return null;
	const raw = node.attrs?.level ?? node.level ?? fromType;
	const level = typeof raw === 'string' ? Number.parseInt(raw, 10) : raw;
	// A heading without a level is the body's first level (2): the page's title is its one `h1` (common v2 §B).
	if (typeof level !== 'number' || !Number.isFinite(level)) return 2;
	return Math.min(4, Math.max(2, Math.round(level))) as RichTextHeadingLevel;
}

const isHeading = (node: RichTextNode) => headingLevelOf(node) !== null;
const isList = (node: RichTextNode) => UNORDERED.has(typeOf(node)) || ORDERED.has(typeOf(node));
const isBlockNode = (node: RichTextNode) =>
	PARAGRAPH.has(typeOf(node)) || isHeading(node) || isList(node) || LIST_ITEM.has(typeOf(node));

/**
 * 🔴 U-57.4 / common v2 §B (app = web): the only links drawn — `https:`, `http:`, `mailto:`, `tel:` and a path of this site (`/…`, never
 * `//host` or `/\host`). Anything else (`javascript:`, `data:`, a relative word, a fragment) is `null`: its words stay
 * plain text. http(s) is `external` (a new tab with `rel="noopener noreferrer"`).
 */
export function safeRichTextHref(raw: unknown): RichTextLink | null {
	if (typeof raw !== 'string') return null;
	const href = raw.trim();
	if (!href) return null;
	if (href.startsWith('/')) {
		// eslint-disable-next-line no-control-regex
		if (/^\/[/\\]/u.test(href) || /[\u0000-\u001F\u007F\\]/u.test(href)) return null;
		return { href, external: false };
	}
	let url: URL;
	try {
		url = new URL(href);
	} catch {
		return null;
	}
	if (url.protocol === 'https:' || url.protocol === 'http:')
		return { href: url.href, external: true };
	if (url.protocol === 'mailto:' || url.protocol === 'tel:')
		return { href: url.href, external: false };
	return null;
}

/**
 * A heading's id from its words (common v2 §B, U-57.4 app = web — the application's `toAnchorSlug`, letter for letter):
 * accents dropped, lower case, every run of what is not a letter or a digit one hyphen, none at either end, at most 80
 * characters; `section` when nothing is left. A link to a heading reads the same on both.
 */
export function slugifyHeading(text: string): string {
	const slug = text
		.normalize('NFD')
		.replace(/\p{M}+/gu, '')
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/gu, '')
		.slice(0, HEADING_ID_LIMIT)
		.replace(/-+$/u, '');
	return slug || 'section';
}

type InlineStyle = { bold: boolean; italic: boolean; link: RichTextLink | null };
type InlineRun = RichTextRun & { link: RichTextLink | null };

function collectInline(nodes: RichTextNode[], style: InlineStyle, out: InlineRun[]): void {
	for (const node of nodes) {
		if (!isNode(node)) continue;
		const type = typeOf(node);
		if (BREAK.has(type)) {
			out.push({ text: ' ', bold: style.bold, italic: style.italic, link: style.link });
			continue;
		}
		const marks = Array.isArray(node.marks) ? node.marks.filter(isNode) : [];
		const bold = style.bold || node.bold === true || marks.some((mark) => BOLD.has(typeOf(mark)));
		const italic =
			style.italic || node.italic === true || marks.some((mark) => ITALIC.has(typeOf(mark)));
		const markLink = marks.find((mark) => LINK.has(typeOf(mark)));
		let link = style.link;
		if (LINK.has(type)) link = safeRichTextHref(node.attrs?.href ?? node.href ?? node.url);
		else if (markLink) link = safeRichTextHref(markLink.attrs?.href);
		if (typeof node.text === 'string' && node.text)
			out.push({ text: node.text, bold, italic, link });
		collectInline(childrenOf(node), { bold, italic, link }, out);
	}
}

/** The runs of one block, grouped by link, white space collapsed and trimmed at the ends; `[]` when empty. */
function spansOf(node: RichTextNode): RichTextSpan[] {
	const runs: InlineRun[] = [];
	const plain: InlineStyle = { bold: false, italic: false, link: null };
	if (typeof node.text === 'string' && node.text) runs.push({ text: node.text, ...plain });
	collectInline(childrenOf(node), plain, runs);
	const spans: RichTextSpan[] = [];
	for (const run of runs) {
		const text = run.text.replace(/\s+/gu, ' ');
		const last = spans.at(-1);
		const sameLink = last && (last.link?.href ?? null) === (run.link?.href ?? null);
		const target = sameLink ? last : { link: run.link, runs: [] };
		if (!sameLink) spans.push(target);
		const previous = target.runs.at(-1);
		if (previous && previous.bold === run.bold && previous.italic === run.italic)
			previous.text += text;
		else target.runs.push({ text, bold: run.bold, italic: run.italic });
	}
	const first = spans[0]?.runs[0];
	if (first) first.text = first.text.replace(/^\s+/u, '');
	const lastRun = spans.at(-1)?.runs.at(-1);
	if (lastRun) lastRun.text = lastRun.text.replace(/\s+$/u, '');
	const kept = spans
		.map((span) => ({ ...span, runs: span.runs.filter((run) => run.text) }))
		.filter((span) => span.runs.length > 0);
	return kept.some((span) => span.runs.some((run) => run.text.trim())) ? kept : [];
}

const spansText = (spans: RichTextSpan[]) =>
	spans.flatMap((span) => span.runs.map((run) => run.text)).join('');

type Builder = {
	used: Set<string>;
	next: number;
	headings: RichTextHeading[];
};

const keyOf = (builder: Builder) => `block-${builder.next++}`;

/** A free id: the base, else the base with the next number (`-2`, `-3`, …), as a duplicate heading gets. */
/** `attrs.popularRank` when it is a whole number from 1, else `null`. */
function rankOf(value: unknown): number | null {
	return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : null;
}

function claimId(builder: Builder, base: string): string {
	let id = base;
	for (let count = 2; builder.used.has(id); count += 1) id = `${base}-${count}`;
	builder.used.add(id);
	return id;
}

function listItemOf(node: RichTextNode, builder: Builder): RichTextListItem | null {
	const children = childrenOf(node);
	const blocks = children.some((child) => isNode(child) && isBlockNode(child))
		? blocksOf(children, builder)
		: (() => {
				const spans = spansOf(node);
				return spans.length ? [{ kind: 'paragraph' as const, key: keyOf(builder), spans }] : [];
			})();
	return blocks.length ? { key: keyOf(builder), blocks } : null;
}

function blocksOf(nodes: RichTextNode[], builder: Builder): RichTextBlock[] {
	const blocks: RichTextBlock[] = [];
	for (const node of nodes) {
		if (!isNode(node)) continue;
		const type = typeOf(node);
		const level = headingLevelOf(node);
		if (level !== null) {
			const text = spansText(spansOf(node)).trim();
			if (!text) continue;
			const anchor = typeof node.attrs?.anchor === 'string' ? node.attrs.anchor.trim() : '';
			const authored = anchor.length <= HEADING_ID_LIMIT && ANCHOR.test(anchor);
			const id = claimId(builder, authored ? anchor : slugifyHeading(text));
			const label = typeof node.attrs?.label === 'string' ? node.attrs.label.trim() : '';
			builder.headings.push({ id, label: text, level });
			blocks.push({
				kind: 'heading',
				key: keyOf(builder),
				level,
				id,
				text,
				label: label || null,
				popular: node.attrs?.popular === true,
				popularRank: rankOf(node.attrs?.popularRank)
			});
		} else if (isList(node)) {
			const items = childrenOf(node)
				.filter(isNode)
				.map((child) =>
					LIST_ITEM.has(typeOf(child))
						? listItemOf(child, builder)
						: listItemOf({ children: [child] }, builder)
				)
				.filter((item): item is RichTextListItem => item !== null);
			if (items.length)
				blocks.push({ kind: 'list', key: keyOf(builder), ordered: ORDERED.has(type), items });
		} else if (
			!PARAGRAPH.has(type) &&
			childrenOf(node).some((child) => isNode(child) && isBlockNode(child))
		) {
			// A container the allowlist does not know (a quote, a nested document): its blocks, never its markup.
			blocks.push(...blocksOf(childrenOf(node), builder));
		} else {
			const spans = spansOf(node);
			if (spans.length) blocks.push({ kind: 'paragraph', key: keyOf(builder), spans });
		}
	}
	return blocks;
}

const docsOf = (input: RichTextInput): RichTextDoc[] =>
	(Array.isArray(input) ? input : [input]).filter(
		(doc): doc is RichTextDoc => Boolean(doc) && typeof doc === 'object'
	);

const rootsOf = (doc: RichTextDoc): RichTextNode[] => [
	...(Array.isArray(doc.content) ? doc.content : []),
	...(Array.isArray(doc.blocks) ? doc.blocks : [])
];

/**
 * 🔴 U-57.4 / U-59.1 (app = web): a document (or several, read as one) as the blocks the renderer draws and the headings «Σε
 * αυτό το άρθρο» lists — ONE pass, so the body and its ToC always share the same ids: `attrs.anchor` when it is a
 * clean anchor, else the slug of the words, a duplicate numbered (`-2`, `-3`). Only the allowlist survives; an unknown
 * block keeps its words as a paragraph, an unsafe link its words as plain text.
 */
export function buildRichText(input: RichTextInput): RichTextContent {
	const builder: Builder = { used: new Set(), next: 0, headings: [] };
	const blocks = docsOf(input).flatMap((doc) => blocksOf(rootsOf(doc), builder));
	return { blocks, headings: builder.headings };
}

/** «Σε αυτό το άρθρο»: the headings of one level (the body's first, 2), in order, with the body's ids. */
export function richTextToc(
	headings: readonly RichTextHeading[],
	level: RichTextHeadingLevel = 2
): RichTextTocEntry[] {
	return headings
		.filter((heading) => heading.level === level)
		.map(({ id, label }) => ({ id, label }));
}

/** The plain words of blocks (an FAQ answer for its search and its JSON-LD), one space between blocks. */
export function richTextBlocksText(blocks: readonly RichTextBlock[]): string {
	const parts: string[] = [];
	const walk = (list: readonly RichTextBlock[]) => {
		for (const block of list) {
			if (block.kind === 'heading') parts.push(block.text);
			else if (block.kind === 'paragraph') parts.push(spansText(block.spans));
			else for (const item of block.items) walk(item.blocks);
		}
	};
	walk(blocks);
	return parts
		.map((part) => part.trim())
		.filter(Boolean)
		.join(' ');
}

function collectNodeText(node: RichTextNode | null | undefined): string {
	if (!isNode(node)) return '';
	const parts: string[] = [];
	if (typeof node.text === 'string') parts.push(node.text);
	for (const children of [node.content, node.children]) {
		if (!Array.isArray(children)) continue;
		for (const child of children) {
			const childText = collectNodeText(child);
			if (childText.length > 0) parts.push(childText);
		}
	}
	return parts.join(' ');
}

/**
 * The plain words of a document, both dialects (the application's `extractPlainText`, the same rules): every `text`
 * of the tree, block fragments joined by one space, white space collapsed; `''` for an empty or absent document.
 */
export function extractPlainText(doc: RichTextDoc | null | undefined): string {
	if (!doc || typeof doc !== 'object') return '';
	return rootsOf(doc)
		.map((node) => collectNodeText(node))
		.filter((fragment) => fragment.length > 0)
		.join(' ')
		.replace(/\s+/gu, ' ')
		.trim();
}
