/**
 * 🔴 D-W52-99 / D-W52-103 / D-W52-104 (U-222.2, U-222.4): the closed schema of an article's text, as the server checks it
 * (`backend/src/modules/article/domain/policies/content/Policy.ts`) — its limits, its link rule, its videos, a strict
 * reading of a document and the counts the editor stops at, so the person writing never reaches the server's refusal.
 * Pure rules: nothing here draws, sends or knows whose text it is.
 */

/** D-W52-99: the limits of one article's text, the server's `ArticleContentPolicy.LIMITS`, number for number. */
export const ARTICLE_TEXT_LIMITS = {
	characters: 50_000,
	nodes: 5_000,
	depth: 10,
	images: 20,
	videos: 5,
	tables: 10,
	hrefLength: 2_000,
	altLength: 300,
	captionLength: 300,
	orderedListStartMax: 999
} as const;

/** A mark of the closed list: the five plain ones and `link`, which carries only its `https:` address. */
export type ArticleTextMark =
	| { type: 'bold' | 'italic' | 'underline' | 'strike' | 'highlight' }
	| { type: 'link'; attrs: { href: string } };

/** One node of a document as JSON (the editor's `getJSON()`, the server's answer): read, never trusted. */
export type ArticleTextNode = {
	type: string;
	attrs?: Record<string, unknown>;
	content?: ArticleTextNode[];
	text?: string;
	marks?: { type: string; attrs?: Record<string, unknown> }[];
};

/** A whole document of the closed schema (`ArticleContentDoc`). */
export type ArticleTextDoc = { type: 'doc'; content: ArticleTextNode[] };

export type ArticleVideoProvider = 'youtube' | 'vimeo';

/** D-W52-99: a video as the text keeps it — its provider and its id, never an address. */
export type ArticleVideo = { provider: ArticleVideoProvider; id: string };

/** What a document counts against the limits: code points of its text, nodes, depth, images, videos, tables. */
export type ArticleTextStats = {
	characters: number;
	nodes: number;
	depth: number;
	images: number;
	videos: number;
	tables: number;
};

/** The limit a document passed, the first in the server's order; `null` within every one. */
export type ArticleTextLimit = 'characters' | 'nodes' | 'depth' | 'images' | 'videos' | 'tables';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const NODE_KEYS = new Set(['type', 'attrs', 'content', 'marks']);
const TEXT_KEYS = new Set(['type', 'text', 'marks']);
const PLAIN_MARKS = new Set(['bold', 'italic', 'underline', 'strike', 'highlight']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/u;
const VIMEO_ID = /^[1-9][0-9]{5,11}$/u;
const URL_FORBIDDEN = /[\s\\]/u;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u;
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u;
const BIDI = /[‪-‮⁦-⁩]/gu;
const LINE_CONTROLS = /[\t\n\r]/gu;
// eslint-disable-next-line no-control-regex
const CONTROLS_ALL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/gu;
const LONE_SURROGATES_ALL =
	/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/gu;
const MAX_MARKS = 6;

const FLOW = ['paragraph', 'bulletList', 'orderedList'];
const BLOCKS = [
	'paragraph',
	'heading',
	'bulletList',
	'orderedList',
	'blockquote',
	'callout',
	'horizontalRule',
	'image',
	'video',
	'table'
];
const INLINE = ['text', 'hardBreak'];

/** D-W52-99: the closed list — each node's attributes and the children it may hold (the server's ProseMirror schema). */
const NODES: Record<
	string,
	{ attrs: Record<string, (value: unknown) => boolean>; children: string[] }
> = {
	doc: { attrs: {}, children: BLOCKS },
	paragraph: { attrs: {}, children: INLINE },
	heading: { attrs: { level: (value) => value === 2 || value === 3 }, children: INLINE },
	hardBreak: { attrs: {}, children: [] },
	bulletList: { attrs: {}, children: ['listItem'] },
	orderedList: {
		attrs: {
			start: (value) =>
				Number.isInteger(value) &&
				(value as number) >= 1 &&
				(value as number) <= ARTICLE_TEXT_LIMITS.orderedListStartMax,
			type: (value) => value === null
		},
		children: ['listItem']
	},
	listItem: { attrs: {}, children: FLOW },
	blockquote: { attrs: {}, children: FLOW },
	callout: { attrs: {}, children: FLOW },
	horizontalRule: { attrs: {}, children: [] },
	image: {
		attrs: {
			imageId: (value) => typeof value === 'string' && UUID.test(value),
			alt: (value) => isPlain(value, ARTICLE_TEXT_LIMITS.altLength, false),
			caption: (value) => value === null || isPlain(value, ARTICLE_TEXT_LIMITS.captionLength, true)
		},
		children: []
	},
	video: {
		attrs: {
			provider: (value) => value === 'youtube' || value === 'vimeo',
			id: (value) => typeof value === 'string'
		},
		children: []
	},
	table: { attrs: {}, children: ['tableRow'] },
	tableRow: { attrs: {}, children: ['tableCell', 'tableHeader'] },
	tableHeader: { attrs: cellAttrs(), children: FLOW },
	tableCell: { attrs: cellAttrs(), children: FLOW }
};
const REQUIRED: Record<string, string[]> = {
	heading: ['level'],
	image: ['imageId', 'alt'],
	video: ['provider', 'id']
};

function cellAttrs(): Record<string, (value: unknown) => boolean> {
	return {
		colspan: (value) => value === 1,
		rowspan: (value) => value === 1,
		colwidth: (value) => value === null
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

/** Whether a text has a character the server refuses: a control character (not a tab or a line break) or half a pair. */
export function hasRefusedCharacters(text: string): boolean {
	return CONTROL.test(text) || LONE_SURROGATE.test(text);
}

/** The code points of a text, as the server counts them. */
export const codePointsOf = (text: string): number => [...text].length;

function isPlain(value: unknown, max: number, optional: boolean): boolean {
	if (typeof value !== 'string' || hasRefusedCharacters(value)) return false;
	const cleaned = value.replace(BIDI, '').normalize('NFC').trim();
	if (cleaned.length === 0) return optional;
	return codePointsOf(cleaned) <= max;
}

/**
 * 🔴 U-222.4 (the server's `linkVerdict`): a link's address — `null` when the text may keep it (`https:` with a host, at
 * most 2000 characters, no white space, backslash or control character, no user or password); `not-https` for any other
 * scheme (`http:`, `javascript:`, `data:` …); `invalid` for an address that is no URL at all.
 */
export function articleLinkIssue(href: unknown): 'invalid' | 'not-https' | null {
	if (typeof href !== 'string' || href.length === 0 || href.length > ARTICLE_TEXT_LIMITS.hrefLength)
		return 'invalid';
	if (URL_FORBIDDEN.test(href) || hasRefusedCharacters(href)) return 'invalid';
	let url: URL;
	try {
		url = new URL(href);
	} catch {
		return 'invalid';
	}
	if (url.protocol !== 'https:') return 'not-https';
	if (!/^https:\/\/[^/]/iu.test(href) || url.hostname.length === 0) return 'invalid';
	if (url.username.length > 0 || url.password.length > 0) return 'invalid';
	return null;
}

/** D-W52-99: a video id of its provider — YouTube 11 characters of `[A-Za-z0-9_-]`, Vimeo 6 to 12 digits. */
export function isArticleVideoId(provider: unknown, id: unknown): boolean {
	if (typeof id !== 'string') return false;
	if (provider === 'youtube') return YOUTUBE_ID.test(id);
	if (provider === 'vimeo') return VIMEO_ID.test(id);
	return false;
}

/**
 * 🔴 D-W52-103 (U-222.4): the video a pasted address names — `https:` only, `youtube.com/watch?v=`, `/shorts/`, `/embed/`,
 * `youtu.be/<id>` and `vimeo.com/<digits>` — as its provider and id; any other site, or an id out of its pattern, is
 * `null`. Only the provider and the id are ever kept: the frame is built by the page from a fixed template.
 */
export function readArticleVideoUrl(raw: string): ArticleVideo | null {
	let url: URL;
	try {
		url = new URL(raw.trim());
	} catch {
		return null;
	}
	if (url.protocol !== 'https:' || url.username || url.password) return null;
	const host = url.hostname.toLowerCase().replace(/^(?:www\.|m\.)/u, '');
	if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
		const id =
			url.pathname === '/watch'
				? (url.searchParams.get('v') ?? '')
				: (/^\/(?:shorts|embed|live)\/([^/]+)\/?$/u.exec(url.pathname)?.[1] ?? '');
		return isArticleVideoId('youtube', id) ? { provider: 'youtube', id } : null;
	}
	if (host === 'youtu.be') {
		const id = /^\/([^/]+)\/?$/u.exec(url.pathname)?.[1] ?? '';
		return isArticleVideoId('youtube', id) ? { provider: 'youtube', id } : null;
	}
	if (host === 'vimeo.com' || host === 'player.vimeo.com') {
		const id = /^\/(?:video\/)?(\d+)\/?$/u.exec(url.pathname)?.[1] ?? '';
		return isArticleVideoId('vimeo', id) ? { provider: 'vimeo', id } : null;
	}
	return null;
}

/** The provider's own name, as a person reads it. */
export const articleVideoName = (provider: ArticleVideoProvider): string =>
	provider === 'youtube' ? 'YouTube' : 'Vimeo';

/**
 * 🔴 D-W52-104 (U-222.4): the ONE address a video's frame loads, from a fixed template — YouTube without cookies
 * (`youtube-nocookie.com`), Vimeo with «do not track» — and only for an id of its pattern (`null` otherwise).
 */
export function articleVideoEmbedUrl(video: ArticleVideo): string | null {
	if (!isArticleVideoId(video.provider, video.id)) return null;
	return video.provider === 'youtube'
		? `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`
		: `https://player.vimeo.com/video/${video.id}?autoplay=1&dnt=1`;
}

/** The text of a text node as the server stores it: tabs and line breaks a space, bidi controls gone, NFC. */
export function cleanArticleTextRun(text: string): string {
	return text
		.replace(LINE_CONTROLS, ' ')
		.replace(CONTROLS_ALL, '')
		.replace(LONE_SURROGATES_ALL, '')
		.replace(BIDI, '')
		.normalize('NFC');
}

const childrenOf = (node: unknown): unknown[] =>
	isRecord(node) && Array.isArray(node.content) ? node.content : [];

/** What a document holds, counted as the server counts it (every node and text node, the root at depth 1). */
export function articleTextStats(doc: unknown): ArticleTextStats {
	const stats: ArticleTextStats = {
		characters: 0,
		nodes: 0,
		depth: 0,
		images: 0,
		videos: 0,
		tables: 0
	};
	const stack: { node: unknown; depth: number }[] = isRecord(doc) ? [{ node: doc, depth: 1 }] : [];
	while (stack.length > 0) {
		const { node, depth } = stack.pop() as { node: unknown; depth: number };
		stats.nodes += 1;
		stats.depth = Math.max(stats.depth, depth);
		if (!isRecord(node)) continue;
		if (node.type === 'text' && typeof node.text === 'string')
			stats.characters += codePointsOf(cleanArticleTextRun(node.text));
		if (node.type === 'image') stats.images += 1;
		if (node.type === 'video') stats.videos += 1;
		if (node.type === 'table') stats.tables += 1;
		for (const child of childrenOf(node)) stack.push({ node: child, depth: depth + 1 });
	}
	return stats;
}

/** The first limit the counts pass, in the server's order; `null` when they are all within. */
export function articleTextOverLimit(stats: ArticleTextStats): ArticleTextLimit | null {
	const order: ArticleTextLimit[] = ['nodes', 'depth', 'characters', 'images', 'videos', 'tables'];
	return order.find((limit) => stats[limit] > ARTICLE_TEXT_LIMITS[limit]) ?? null;
}

/** Whether a document has words (the server's «a text with a word» of a sending). */
export function articleTextHasWords(doc: unknown): boolean {
	const stack: unknown[] = [doc];
	while (stack.length > 0) {
		const node = stack.pop();
		if (!isRecord(node)) continue;
		if (node.type === 'text' && typeof node.text === 'string' && /[\p{L}\p{N}]/u.test(node.text))
			return true;
		stack.push(...childrenOf(node));
	}
	return false;
}

function marksValid(raw: unknown): boolean {
	if (raw === undefined) return true;
	if (!Array.isArray(raw) || raw.length > MAX_MARKS) return false;
	const seen = new Set<string>();
	for (const mark of raw) {
		if (!isRecord(mark) || typeof mark.type !== 'string' || seen.has(mark.type)) return false;
		const keys = Object.keys(mark);
		if (keys.some((key) => key !== 'type' && key !== 'attrs')) return false;
		seen.add(mark.type);
		if (PLAIN_MARKS.has(mark.type)) {
			if (
				mark.attrs !== undefined &&
				!(isRecord(mark.attrs) && Object.keys(mark.attrs).length === 0)
			)
				return false;
			continue;
		}
		if (mark.type !== 'link' || !isRecord(mark.attrs)) return false;
		if (Object.keys(mark.attrs).some((key) => key !== 'href')) return false;
		if (articleLinkIssue(mark.attrs.href) !== null) return false;
	}
	return true;
}

function attrsValid(type: string, raw: unknown): boolean {
	const rules = NODES[type].attrs;
	const required = REQUIRED[type] ?? [];
	if (raw === undefined) return required.length === 0;
	if (!isRecord(raw)) return false;
	const keys = Object.keys(raw);
	if (keys.some((key) => FORBIDDEN_KEYS.has(key) || !Object.hasOwn(rules, key))) return false;
	if (required.some((key) => !keys.includes(key))) return false;
	if (type === 'video' && !isArticleVideoId(raw.provider, raw.id)) return false;
	return keys.every((key) => rules[key](raw[key]));
}

/**
 * 🔴 D-W52-104 (U-222.4): a document read against the closed list, with a stack and never recursion — every node, mark
 * and attribute known, each child where its parent may hold it, a list item opening with a paragraph, text without
 * control characters, `https:` links, the video patterns and every limit. The document when it is one, else `null`: a
 * text that is not of the closed schema is never drawn as one.
 */
export function readArticleText(raw: unknown): ArticleTextDoc | null {
	if (!isRecord(raw) || raw.type !== 'doc' || !Array.isArray(raw.content)) return null;
	if (articleTextOverLimit(articleTextStats(raw)) !== null) return null;
	const stack: { node: unknown; parent: string | null; first: boolean }[] = [
		{ node: raw, parent: null, first: true }
	];
	while (stack.length > 0) {
		const { node, parent, first } = stack.pop() as (typeof stack)[number];
		if (!isRecord(node) || typeof node.type !== 'string') return null;
		const keys = Object.keys(node);
		if (keys.some((key) => FORBIDDEN_KEYS.has(key))) return null;
		if (parent !== null && !NODES[parent].children.includes(node.type)) return null;
		if (parent === 'listItem' && first && node.type !== 'paragraph') return null;
		if (node.type === 'text') {
			if (keys.some((key) => !TEXT_KEYS.has(key))) return null;
			if (typeof node.text !== 'string' || node.text.length === 0) return null;
			if (hasRefusedCharacters(node.text.replace(LINE_CONTROLS, ' '))) return null;
			if (!marksValid(node.marks)) return null;
			continue;
		}
		if (!Object.hasOwn(NODES, node.type) || (node.type === 'doc') !== (parent === null))
			return null;
		if (keys.some((key) => !NODE_KEYS.has(key))) return null;
		if (!attrsValid(node.type, node.attrs)) return null;
		if (node.marks !== undefined && (node.type !== 'hardBreak' || !marksValid(node.marks)))
			return null;
		if (node.content !== undefined) {
			if (!Array.isArray(node.content) || NODES[node.type].children.length === 0) return null;
			node.content.forEach((child, index) =>
				stack.push({ node: child, parent: node.type as string, first: index === 0 })
			);
		}
		if (NEEDS_CHILDREN.has(node.type) && childrenOf(node).length === 0) return null;
	}
	return raw as ArticleTextDoc;
}

/** The nodes the schema gives `+` children (a list, a quote, a table and its rows and cells, the document). */
const NEEDS_CHILDREN = new Set([
	'doc',
	'bulletList',
	'orderedList',
	'listItem',
	'blockquote',
	'callout',
	'table',
	'tableRow',
	'tableHeader',
	'tableCell'
]);

const SENT_NODE_KEYS = ['type', 'attrs', 'content', 'marks'] as const;
const WORTH_SENDING = new Set(['image', 'video', 'table', 'horizontalRule']);

/**
 * 🔴 D-W52-103 (U-222.4): the editor's document as the server takes it — each text cleaned as the server stores it
 * (`cleanArticleTextRun`), a text node left empty dropped, only the keys of the schema kept; `null` for a document with
 * nothing to send (no word, no image, video, table or rule: «no text» to the server).
 */
export function cleanArticleTextDoc(raw: unknown): ArticleTextDoc | null {
	if (!isRecord(raw) || raw.type !== 'doc') return null;
	const clean = (node: Record<string, unknown>): ArticleTextNode | null => {
		if (node.type === 'text') {
			const text = typeof node.text === 'string' ? cleanArticleTextRun(node.text) : '';
			if (!text) return null;
			return Array.isArray(node.marks) && node.marks.length > 0
				? { type: 'text', text, marks: node.marks as ArticleTextNode['marks'] }
				: { type: 'text', text };
		}
		const out: ArticleTextNode = { type: String(node.type) };
		for (const key of SENT_NODE_KEYS) {
			if (key === 'type' || node[key] === undefined) continue;
			if (key === 'content') {
				const children = (Array.isArray(node.content) ? node.content : [])
					.filter(isRecord)
					.map(clean)
					.filter((child): child is ArticleTextNode => child !== null);
				if (children.length > 0) out.content = children;
			} else if (key === 'attrs' && isRecord(node.attrs) && Object.keys(node.attrs).length > 0)
				out.attrs = node.attrs;
			else if (key === 'marks' && Array.isArray(node.marks) && node.marks.length > 0)
				out.marks = node.marks as ArticleTextNode['marks'];
		}
		return out;
	};
	const doc = clean(raw) as ArticleTextDoc;
	const stack: unknown[] = [doc];
	let worth = false;
	while (stack.length > 0 && !worth) {
		const node = stack.pop();
		if (!isRecord(node)) continue;
		if (WORTH_SENDING.has(String(node.type))) worth = true;
		stack.push(...childrenOf(node));
	}
	return worth || articleTextHasWords(doc) ? { type: 'doc', content: doc.content ?? [] } : null;
}
