import {
	Extension,
	Mark,
	Node,
	type AnyExtension,
	type Editor,
	type JSONContent
} from '@tiptap/core';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import { TableCell, TableHeader, TableKit, TableRow } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import { NodeRange, type Node as ProseMirrorNode } from '@tiptap/pm/model';
import { NodeSelection, Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { findWrapping, liftTarget } from '@tiptap/pm/transform';
import StarterKit from '@tiptap/starter-kit';
import {
	ARTICLE_TEXT_LIMITS,
	articleLinkIssue,
	articleVideoName,
	cleanArticleTextRun,
	codePointsOf,
	type ArticleTextLimit,
	type ArticleTextStats,
	type ArticleVideoProvider
} from '$shared/lib/article-text';
import { PICTURE_GLYPH } from '$shared/ui/icons/picture';

/** What the editor's own nodes need from the page: an upload's address, the words of a video's place, the limits' voice. */
export type ArticleEditorOptions = {
	/** The address an uploaded image of this article is drawn from (`null`: not known — a placeholder is drawn). */
	imageUrl: (imageId: string) => string | null;
	/** «Βίντεο YouTube · φορτώνει όταν το πατήσει ο ασθενής». */
	videoLabel: (name: string) => string;
	/** «Γράψτε το άρθρο σας…». */
	placeholder: string;
	/** ⌘ / Ctrl + K: the link's panel. */
	onLinkShortcut: () => void;
	/** A change refused because it would pass a limit of the server's (the page says it). */
	onLimit: (limit: ArticleTextLimit) => void;
};

/** D-W52-99: what a quote, «Σημαντικό», a list item's rest and a table cell hold — the server's schema. */
const FLOW = '(paragraph | bulletList | orderedList)+';

/**
 * 🔴 D-W52-99 · U-222.4: a link carries its `https:` address ALONE (no `target` / `rel` / `class`, which the server
 * refuses); a pasted `<a>` keeps its words and its mark only with an address the server takes. Drawn in the editor with
 * the page's `rel`; never opened by a press there.
 */
const ArticleLink = Mark.create<{ onShortcut: () => void }>({
	name: 'link',
	priority: 1000,
	inclusive: false,
	exitable: true,
	addOptions() {
		return { onShortcut: () => undefined };
	},
	addAttributes() {
		return { href: { default: null } };
	},
	parseHTML() {
		return [
			{
				tag: 'a[href]',
				getAttrs: (dom) => {
					const href = (dom as HTMLElement).getAttribute('href');
					return href && articleLinkIssue(href) === null ? { href } : false;
				}
			}
		];
	},
	renderHTML({ HTMLAttributes }) {
		return [
			'a',
			{
				href: HTMLAttributes.href,
				rel: 'nofollow ugc noopener noreferrer',
				target: '_blank',
				class: 'text-primary-text underline underline-offset-3'
			},
			0
		];
	},
	addKeyboardShortcuts() {
		return {
			'Mod-k': () => {
				this.options.onShortcut();
				return true;
			}
		};
	}
});

/** D-W52-99: «Παράθεμα» — paragraphs and lists only. */
const ArticleQuote = Node.create({
	name: 'blockquote',
	group: 'block',
	content: FLOW,
	defining: true,
	parseHTML: () => [{ tag: 'blockquote' }],
	renderHTML: () => [
		'blockquote',
		{ class: 'my-4 border-l-2 border-line-2 pl-4 text-muted-foreground italic' },
		0
	]
});

/** D-W52-99: the box «Σημαντικό» (`callout`) — paragraphs and lists only. */
const ArticleCallout = Node.create({
	name: 'callout',
	group: 'block',
	content: FLOW,
	defining: true,
	parseHTML: () => [{ tag: 'aside[data-callout]' }],
	renderHTML: () => [
		'aside',
		{
			'data-callout': '',
			class: 'my-4 block rounded-md border border-warning/40 bg-warning/10 px-4 py-3'
		},
		0
	]
});

/** D-W52-99: a list item opens with a paragraph, then paragraphs and lists. */
const ArticleListItem = Node.create({
	name: 'listItem',
	content: 'paragraph (paragraph | bulletList | orderedList)*',
	defining: true,
	parseHTML: () => [{ tag: 'li' }],
	renderHTML: () => ['li', 0],
	addKeyboardShortcuts() {
		return {
			Enter: () => this.editor.commands.splitListItem(this.name),
			Tab: () => this.editor.commands.sinkListItem(this.name),
			'Shift-Tab': () => this.editor.commands.liftListItem(this.name)
		};
	}
});

/**
 * 🔴 D-W52-99 / 100 (U-222.4): an image of the text — `imageId` of an upload, `alt` (required) and `caption`, NOTHING
 * else; never read from a paste or a drop (an `<img>` is not this node), no markdown rule. Drawn from the upload's
 * address the page knows.
 */
const SVG = 'http://www.w3.org/2000/svg';

/**
 * A picture's place (`64-switch/sw.css:668` `.w-arpic`): 16:9 on the muted surface with the prototype's glyph, named by
 * the picture's words — where its upload is not known or does not load (never a broken image, never its words in a band).
 */
function missingPicture(alt: string): HTMLElement {
	const place = document.createElement('span');
	place.className =
		'flex aspect-video max-h-figure-max w-full items-center justify-center rounded-lg bg-muted text-line-2';
	place.setAttribute('role', 'img');
	place.setAttribute('aria-label', alt);
	place.dataset.slot = 'article-image-missing';
	const glyph = document.createElementNS(SVG, 'svg');
	const look = {
		viewBox: '0 0 24 24',
		fill: 'none',
		stroke: 'currentColor',
		'stroke-width': '1.4',
		'stroke-linecap': 'round',
		'stroke-linejoin': 'round',
		'aria-hidden': 'true',
		class: 'size-figure-glyph'
	};
	for (const [name, value] of Object.entries(look)) glyph.setAttribute(name, value);
	const path = document.createElementNS(SVG, 'path');
	path.setAttribute('d', PICTURE_GLYPH.path);
	const circle = document.createElementNS(SVG, 'circle');
	for (const [name, value] of Object.entries(PICTURE_GLYPH.circle))
		circle.setAttribute(name, value);
	glyph.append(path, circle);
	place.append(glyph);
	return place;
}

const ArticleImage = Image.extend<ArticleEditorOptions & { inline: boolean }>({
	atom: true,
	draggable: true,
	addOptions() {
		return {
			...(this.parent?.() ?? {}),
			inline: false,
			allowBase64: false,
			resize: false,
			imageUrl: () => null
		} as never;
	},
	addAttributes() {
		return {
			imageId: { default: null, parseHTML: () => null, renderHTML: () => ({}) },
			alt: { default: '', parseHTML: () => '', renderHTML: () => ({}) },
			caption: { default: null, parseHTML: () => null, renderHTML: () => ({}) }
		};
	},
	parseHTML() {
		return [];
	},
	renderHTML({ node }) {
		const url = this.options.imageUrl(String(node.attrs.imageId ?? ''));
		const picture = url
			? ['img', { src: url, alt: node.attrs.alt, class: 'h-auto w-full rounded-lg bg-muted' }]
			: [
					'span',
					{
						class: 'block aspect-video w-full rounded-lg bg-muted',
						role: 'img',
						'aria-label': node.attrs.alt
					}
				];
		return [
			'figure',
			{ class: 'my-4', 'data-image-id': node.attrs.imageId },
			picture,
			[
				'figcaption',
				{ class: 'mt-2 text-label-lg text-muted-foreground' },
				node.attrs.caption ?? ''
			]
		] as never;
	},
	// In the editor: the upload's picture, or its place when it is not known or does not load; the caption under it.
	addNodeView() {
		const imageUrl = this.options.imageUrl;
		return ({ node }) => {
			const alt = String(node.attrs.alt ?? '');
			const figure = document.createElement('figure');
			figure.className = 'my-4';
			figure.dataset.imageId = String(node.attrs.imageId ?? '');
			const url = imageUrl(String(node.attrs.imageId ?? ''));
			if (url) {
				const picture = document.createElement('img');
				picture.src = url;
				picture.alt = alt;
				picture.className = 'h-auto w-full rounded-lg bg-muted';
				picture.addEventListener('error', () => picture.replaceWith(missingPicture(alt)), {
					once: true
				});
				figure.append(picture);
			} else figure.append(missingPicture(alt));
			const caption = document.createElement('figcaption');
			caption.className = 'mt-2 text-label-lg text-muted-foreground';
			caption.textContent = String(node.attrs.caption ?? '');
			figure.append(caption);
			return { dom: figure, update: (updated) => updated.sameMarkup(node) };
		};
	},
	addInputRules() {
		return [];
	},
	addPasteRules() {
		return [];
	}
});

/**
 * 🔴 D-W52-99 / 103 (U-222.4): a video as the text keeps it — `provider` + `id`, never an address; in the editor a PLACE
 * («Βίντεο YouTube · φορτώνει όταν το πατήσει ο ασθενής»), never a frame; never read from a paste.
 */
const ArticleVideo = Node.create<{ videoLabel: (name: string) => string }>({
	name: 'video',
	group: 'block',
	atom: true,
	draggable: true,
	addOptions() {
		return { videoLabel: (name: string) => name };
	},
	addAttributes() {
		return {
			provider: { default: null, parseHTML: () => null, renderHTML: () => ({}) },
			id: { default: null, parseHTML: () => null, renderHTML: () => ({}) }
		};
	},
	parseHTML() {
		return [];
	},
	renderHTML({ node }) {
		const provider = node.attrs.provider as ArticleVideoProvider;
		const name = articleVideoName(provider === 'vimeo' ? 'vimeo' : 'youtube');
		return [
			'figure',
			{ class: 'my-4', 'data-video': `${provider}:${node.attrs.id}` },
			[
				'span',
				{
					class:
						'flex aspect-video w-full items-center justify-center rounded-lg bg-secondary text-secondary-foreground',
					'aria-hidden': 'true'
				},
				[
					'http://www.w3.org/2000/svg svg',
					{ viewBox: '0 0 24 24', class: 'icon-xl', fill: 'currentColor' },
					['http://www.w3.org/2000/svg path', { d: 'M9 6.5v11l9-5.5Z' }]
				]
			],
			[
				'figcaption',
				{ class: 'mt-2 text-label-lg text-muted-foreground' },
				this.options.videoLabel(name)
			]
		] as never;
	}
});

/** D-W52-99: a cell holds paragraphs and lists, and its span and width are ALWAYS the server's 1 / 1 / null. */
const cellAttributes = () => ({
	colspan: { default: 1, parseHTML: () => 1 },
	rowspan: { default: 1, parseHTML: () => 1 },
	colwidth: { default: null, parseHTML: () => null }
});
const ArticleTableCell = TableCell.extend({ content: FLOW, addAttributes: cellAttributes });
const ArticleTableHeader = TableHeader.extend({ content: FLOW, addAttributes: cellAttributes });
/** D-W52-99: a row holds at least one cell (the server's `(tableCell | tableHeader)+`). */
const ArticleTableRow = TableRow.extend({ content: '(tableCell | tableHeader)+' });

/** The counts of a document as the server makes them (`articleTextStats` of its JSON), read straight off the tree. */
export function editorTextStats(doc: ProseMirrorNode): ArticleTextStats {
	const stats: ArticleTextStats = {
		characters: 0,
		nodes: 0,
		depth: 0,
		images: 0,
		videos: 0,
		tables: 0
	};
	const stack: [ProseMirrorNode, number][] = [[doc, 1]];
	while (stack.length > 0) {
		const [node, depth] = stack.pop() as [ProseMirrorNode, number];
		stats.nodes += 1;
		stats.depth = Math.max(stats.depth, depth);
		if (node.isText) stats.characters += codePointsOf(cleanArticleTextRun(node.text ?? ''));
		const name = node.type.name;
		if (name === 'image') stats.images += 1;
		if (name === 'video') stats.videos += 1;
		if (name === 'table') stats.tables += 1;
		node.forEach((child) => stack.push([child, depth + 1]));
	}
	return stats;
}

/**
 * An image or a video put in the text: the cursor goes on AFTER it (never left on the node, where the next tool would
 * replace it). `false` when nothing changed (a limit, or no place for a block).
 */
export function insertArticleBlock(editor: Editor, content: JSONContent): boolean {
	const before = editor.state.doc;
	editor
		.chain()
		.focus()
		.insertContent(content)
		.command(({ tr }) => {
			if (!(tr.selection instanceof NodeSelection)) return true;
			// The line after it, or a new empty one when it ends its part of the text.
			const after = tr.selection.to;
			const $after = tr.doc.resolve(after);
			const paragraph = tr.doc.type.schema.nodes.paragraph;
			if (!$after.nodeAfter?.isTextblock) {
				if (!$after.parent.canReplaceWith($after.index(), $after.index(), paragraph)) return true;
				tr.insert(after, paragraph.create());
			}
			tr.setSelection(TextSelection.create(tr.doc, after + 1));
			return true;
		})
		.run();
	return !editor.state.doc.eq(before);
}

/**
 * «Παράθεμα» / «Σημαντικό» as a toggle: inside one, the whole box opens up again; otherwise the blocks of the selection
 * at the top of the text are wrapped (a list item's lines with their whole list — a box holds paragraphs and lists, a
 * list never a box). `false` where the server's schema has no place for it (a heading, a table).
 */
export function toggleArticleWrap(editor: Editor, name: 'blockquote' | 'callout'): boolean {
	const before = editor.state.doc;
	editor
		.chain()
		.focus()
		.command(({ tr, state }) => {
			const { $from, $to } = tr.selection;
			for (let depth = $from.depth; depth > 0; depth -= 1) {
				if ($from.node(depth).type.name !== name) continue;
				const range = new NodeRange(
					tr.doc.resolve($from.start(depth)),
					tr.doc.resolve($from.end(depth)),
					depth
				);
				const target = liftTarget(range);
				if (target === null) return false;
				tr.lift(range, target);
				return true;
			}
			const range = $from.blockRange($to, (node) => node.type === state.schema.topNodeType);
			const wrapping = range && findWrapping(range, state.schema.nodes[name]);
			if (!range || !wrapping) return false;
			tr.wrap(range, wrapping);
			return true;
		})
		.run();
	return !editor.state.doc.eq(before);
}

const LIMITED: ArticleTextLimit[] = ['nodes', 'depth', 'characters', 'images', 'videos', 'tables'];

/**
 * 🔴 D-W52-103 (U-222.2): the server's limits, kept by the editor — a change that would pass one (typing, a paste, a
 * drop, a tool) is refused whole and the page says which (a change that only shrinks a text already over passes). Ordered
 * lists, headings and table cells keep the server's attributes whatever a paste or a command brought.
 */
const ArticleLimits = Extension.create<{ onLimit: (limit: ArticleTextLimit) => void }>({
	name: 'articleLimits',
	addOptions() {
		return { onLimit: () => undefined };
	},
	addProseMirrorPlugins() {
		const onLimit = () => this.options.onLimit;
		return [
			new Plugin({
				key: new PluginKey('articleLimits'),
				filterTransaction: (transaction, state) => {
					if (!transaction.docChanged) return true;
					const before = editorTextStats(state.doc);
					const after = editorTextStats(transaction.doc);
					const passed = LIMITED.find(
						(limit) => after[limit] > ARTICLE_TEXT_LIMITS[limit] && after[limit] > before[limit]
					);
					if (!passed) return true;
					onLimit()(passed);
					return false;
				},
				appendTransaction: (transactions, _old, state) => {
					if (!transactions.some((transaction) => transaction.docChanged)) return null;
					const { tr } = state;
					state.doc.descendants((node, pos) => {
						const attrs = node.attrs as Record<string, unknown>;
						// A heading is of level 2 or 3 only (the editor's own default is 1).
						if (node.type.name === 'heading' && attrs.level !== 2 && attrs.level !== 3)
							tr.setNodeMarkup(pos, undefined, { level: 2 });
						if (node.type.name === 'orderedList') {
							const start = Number(attrs.start);
							const valid =
								Number.isInteger(start) &&
								start >= 1 &&
								start <= ARTICLE_TEXT_LIMITS.orderedListStartMax;
							if (attrs.type !== null || !valid)
								tr.setNodeMarkup(pos, undefined, { start: valid ? start : 1, type: null });
						}
						if (
							(node.type.name === 'tableCell' || node.type.name === 'tableHeader') &&
							(attrs.colspan !== 1 || attrs.rowspan !== 1 || attrs.colwidth !== null)
						)
							tr.setNodeMarkup(pos, undefined, { colspan: 1, rowspan: 1, colwidth: null });
					});
					return tr.docChanged ? tr : null;
				},
				props: {
					// 🔴 U-222.2: a picture comes in ONLY by its upload — a pasted or dropped file goes nowhere.
					handlePaste: (_view, event) => Boolean(event.clipboardData?.files?.length),
					handleDrop: (_view, event) => Boolean((event as DragEvent).dataTransfer?.files?.length),
					// The pasted markup is parsed by the schema in a document of its own (nothing loads or runs); images are dropped first.
					transformPastedHTML: (html) => html.replace(/<img\b[^>]*>/giu, '')
				}
			})
		];
	}
});

/**
 * 🔴 D-W52-99 / 103 (U-222.2, U-222.4): the editor's extensions — the closed schema of the server and nothing else.
 * StarterKit without `code` / `codeBlock` and with headings 2 / 3; its link, quote and list item replaced by ours (the
 * server's attributes and contents); a highlight without a colour; a table without resizing or merging; our image,
 * video and «Σημαντικό»; the placeholder; the limits.
 */
export function articleEditorExtensions(options: ArticleEditorOptions): AnyExtension[] {
	return [
		StarterKit.configure({
			code: false,
			codeBlock: false,
			link: false,
			blockquote: false,
			listItem: false,
			heading: { levels: [2, 3] }
		}),
		ArticleLink.configure({ onShortcut: options.onLinkShortcut }),
		ArticleQuote,
		ArticleCallout,
		ArticleListItem,
		Highlight.configure({ multicolor: false }),
		TableKit.configure({
			table: { resizable: false, allowTableNodeSelection: false },
			tableCell: false,
			tableHeader: false,
			tableRow: false
		}),
		ArticleTableCell,
		ArticleTableHeader,
		ArticleTableRow,
		ArticleImage.configure({ imageUrl: options.imageUrl } as never),
		ArticleVideo.configure({ videoLabel: options.videoLabel }),
		Placeholder.configure({ placeholder: options.placeholder }),
		ArticleLimits.configure({ onLimit: options.onLimit })
	];
}
