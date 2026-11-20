<script lang="ts">
	import { onDestroy, onMount, tick, untrack } from 'svelte';
	import { Editor } from '@tiptap/core';
	import { NodeSelection } from '@tiptap/pm/state';
	import { m } from '$paraglide/messages.js';
	import {
		ARTICLE_TEXT_LIMITS,
		articleLinkIssue,
		readArticleVideoUrl,
		type ArticleTextDoc,
		type ArticleTextLimit
	} from '$shared/lib/article-text';
	import { checkImageFile, readAsDataUri } from '$shared/lib/image';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { Button } from '$shared/ui/primitives/button';
	import {
		DOCTOR_ARTICLE_IMAGE_LEAST_PIXELS,
		DOCTOR_ARTICLE_IMAGE_MAX_BYTES,
		DOCTOR_ARTICLE_IMAGE_TYPES
	} from '$modules/doctor-dashboard/config';
	import { doctorArticleCount } from '$modules/doctor-dashboard/lib/articles';
	import {
		articleEditorExtensions,
		editorTextStats,
		insertArticleBlock,
		toggleArticleWrap
	} from '../lib/extensions';
	import ToolGlyph, { type ToolGlyphName } from './tool-glyph.svelte';

	let {
		locale,
		content,
		imageUrl,
		invalid = false,
		describedBy,
		onChange,
		onUpload,
		onReady
	}: {
		locale: SupportedLocale;
		/** The text the page opens with (`null`: none yet). */
		content: ArticleTextDoc | null;
		/** The address of an upload of this article (`null`: not known). */
		imageUrl: (imageId: string) => string | null;
		/** The page's «Γράψτε το κείμενο του άρθρου.» stands under the editor. */
		invalid?: boolean;
		describedBy?: string;
		/** Every change of the text, as the editor's JSON. */
		onChange: (doc: ArticleTextDoc) => void;
		/** An image of the text to upload (a `data:` text): its id, or the words of a refusal. */
		onUpload: (file: string) => Promise<{ id: string } | { failure: string }>;
		/** Tests only: the editor once it exists. */
		onReady?: (editor: Editor) => void;
	} = $props();

	const options = $derived({ locale });
	let element: HTMLDivElement | undefined = $state();
	let editor = $state.raw<Editor | null>(null);
	// Every transaction: the toolbar reads the editor's state again.
	let version = $state(0);
	let limitHit = $state<ArticleTextLimit | null>(null);

	type Panel = 'link' | 'video' | 'image' | null;
	let panel = $state<Panel>(null);
	let address = $state('');
	let panelError = $state<string | null>(null);
	let imageFile = $state<string | null>(null);
	let imagePreview = $state<string | null>(null);
	let imageAlt = $state('');
	let imageCaption = $state('');
	let imageEditing = $state(false);
	let uploading = $state(false);
	let picker: HTMLInputElement | undefined = $state();
	const panelId = 'doctor-article-editor-panel';

	// The body's own attributes: its name, the page's message it is described by, and whether it holds one.
	const attributes = (described: string | undefined, wrong: boolean): Record<string, string> => ({
		role: 'textbox',
		'aria-multiline': 'true',
		'aria-label': m.doctor_my_article_text({}, options),
		...(described ? { 'aria-describedby': described } : {}),
		...(wrong ? { 'aria-invalid': 'true' } : {}),
		'data-testid': 'doctor-article-editor-body',
		class:
			'min-h-article-editor px-4 pt-3.5 pb-5 text-body-lg text-foreground outline-none [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-heading-sm [&_h3]:mt-5 [&_h3]:mb-1.5 [&_h3]:text-title-sm [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mt-2.5 [&_table]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2.5 [&_td]:py-2 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2.5 [&_th]:py-2 [&_th]:text-left [&_ul]:list-disc [&_ul]:pl-6 [&_mark]:rounded-xs [&_mark]:bg-warning/25 [&_mark]:text-inherit [&_hr]:my-5 [&_hr]:border-border [&_.ProseMirror-selectednode]:rounded-lg [&_.ProseMirror-selectednode]:ring-2 [&_.ProseMirror-selectednode]:ring-ring [&_.is-editor-empty:first-child]:before:pointer-events-none [&_.is-editor-empty:first-child]:before:float-left [&_.is-editor-empty:first-child]:before:h-0 [&_.is-editor-empty:first-child]:before:text-muted-foreground [&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]'
	});

	onMount(() => {
		if (!element) return;
		editor = new Editor({
			element,
			content: content ?? undefined,
			extensions: articleEditorExtensions({
				imageUrl: (id) => imageUrl(id),
				videoLabel: (name) => m.article_editor_video_node({ name }, options),
				placeholder: m.article_editor_placeholder({}, options),
				onLinkShortcut: () => void open('link'),
				onLimit: (limit) => (limitHit = limit)
			}),
			editorProps: { attributes: attributes(describedBy, invalid) },
			onTransaction: () => {
				version += 1;
			},
			onUpdate: ({ editor: current }) => {
				limitHit = null;
				onChange(current.getJSON() as ArticleTextDoc);
			}
		});
		onReady?.(editor);
	});

	// The page's message comes and goes after the editor exists: its body is told so.
	$effect(() => {
		const props = { attributes: attributes(describedBy, invalid) };
		untrack(() => editor)?.setOptions({ editorProps: props });
	});

	onDestroy(() => {
		editor?.destroy();
		if (imagePreview) URL.revokeObjectURL(imagePreview);
	});

	// What the toolbar shows, read again at every transaction.
	const shown = $derived.by(() => {
		void version;
		const current = editor;
		if (!current) return null;
		const stats = editorTextStats(current.state.doc);
		const selection = current.state.selection;
		const imageSelected =
			selection instanceof NodeSelection && selection.node.type.name === 'image';
		return {
			stats,
			style: current.isActive('heading', { level: 2 })
				? 'h2'
				: current.isActive('heading', { level: 3 })
					? 'h3'
					: 'p',
			active: (name: string) => current.isActive(name),
			inTable: current.isActive('table'),
			// A heading only where the server's schema has one (never in a list, a quote, «Σημαντικό» or a cell).
			canHeading: current.isActive('heading') || current.can().setHeading({ level: 2 }),
			imageSelected,
			canUndo: current.can().undo(),
			canRedo: current.can().redo()
		};
	});

	const limitWords: Record<ArticleTextLimit, () => string> = {
		images: () => m.article_editor_limit_images({}, options),
		videos: () => m.article_editor_limit_videos({}, options),
		tables: () => m.article_editor_limit_tables({}, options),
		characters: () => m.article_editor_limit_size({}, options),
		nodes: () => m.article_editor_limit_size({}, options),
		depth: () => m.article_editor_limit_size({}, options)
	};
	// A limit reached is said under the editor (a refused change, or a tool whose limit is full).
	const limitNote = $derived.by(() => {
		if (limitHit) return limitWords[limitHit]();
		const stats = shown?.stats;
		if (!stats) return '';
		if (stats.images >= ARTICLE_TEXT_LIMITS.images) return limitWords.images();
		if (stats.videos >= ARTICLE_TEXT_LIMITS.videos) return limitWords.videos();
		if (stats.tables >= ARTICLE_TEXT_LIMITS.tables) return limitWords.tables();
		return '';
	});

	const chain = () => editor?.chain().focus();

	function setStyle(value: string) {
		if (value === 'h2') chain()?.setHeading({ level: 2 }).run();
		else if (value === 'h3') chain()?.setHeading({ level: 3 }).run();
		else chain()?.setParagraph().run();
	}

	// «Σημαντικό»: an empty line becomes the box with its first word; a line with words is wrapped in it (and unwrapped).
	function callout() {
		const current = editor;
		if (!current) return;
		const selection = current.state.selection;
		if (
			current.isActive('callout') ||
			!selection.empty ||
			selection.$from.parent.textContent.trim()
		) {
			toggleArticleWrap(current, 'callout');
			return;
		}
		chain()
			?.insertContent({
				type: 'callout',
				content: [
					{
						type: 'paragraph',
						content: [
							{
								type: 'text',
								text: m.article_editor_callout_start({}, options),
								marks: [{ type: 'bold' }]
							},
							{ type: 'text', text: ' ' }
						]
					}
				]
			})
			.run();
	}

	async function open(kind: Exclude<Panel, null>) {
		panelError = null;
		if (kind === 'link') {
			address = editor?.getAttributes('link').href ?? '';
		} else if (kind === 'video') {
			address = '';
		}
		panel = kind;
		await tick();
		document.getElementById(`${panelId}-${kind}`)?.querySelector('input')?.focus();
	}

	function close() {
		panel = null;
		panelError = null;
		imageEditing = false;
		if (imagePreview) URL.revokeObjectURL(imagePreview);
		imagePreview = null;
		imageFile = null;
		imageAlt = '';
		imageCaption = '';
		editor?.commands.focus();
	}

	const urlOf = (raw: string): URL | null => {
		try {
			return new URL(raw);
		} catch {
			return null;
		}
	};

	// 🔴 U-222.4: a link only with an address the server takes — the page's three words for the three ways it is not.
	function addLink() {
		const href = address.trim();
		const parsed = urlOf(href);
		if (!parsed) {
			panelError = m.article_editor_link_whole({}, options);
			return;
		}
		if (parsed.protocol !== 'https:') {
			panelError = m.article_editor_link_https({}, options);
			return;
		}
		if (articleLinkIssue(href) !== null) {
			panelError = m.article_editor_link_invalid({}, options);
			return;
		}
		const current = editor;
		if (!current) return;
		if (current.state.selection.empty && !current.isActive('link'))
			current
				.chain()
				.focus()
				.insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] })
				.run();
		else current.chain().focus().extendMarkRange('link').setMark('link', { href }).run();
		close();
	}

	function removeLink() {
		editor?.chain().focus().extendMarkRange('link').unsetMark('link').run();
		close();
	}

	// 🔴 D-W52-103: a video as its provider and id — any other site is refused with the page's words.
	function addVideo() {
		const video = readArticleVideoUrl(address);
		if (!video) {
			panelError = m.article_editor_video_invalid({}, options);
			return;
		}
		if (editor)
			insertArticleBlock(editor, {
				type: 'video',
				attrs: { provider: video.provider, id: video.id }
			});
		close();
	}

	// The image tool: a selected image opens its words; otherwise a file is picked.
	function imageTool() {
		const current = editor;
		if (!current) return;
		const selection = current.state.selection;
		if (selection instanceof NodeSelection && selection.node.type.name === 'image') {
			imageEditing = true;
			imageAlt = String(selection.node.attrs.alt ?? '');
			imageCaption = String(selection.node.attrs.caption ?? '');
			void open('image');
			return;
		}
		picker?.click();
	}

	// 🔴 D-W52-100 (U-65.6): the file checked before a byte leaves — its type, 10 MB, 200 × 200 — then its words.
	async function picked(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		const issue = await checkImageFile(file, {
			types: DOCTOR_ARTICLE_IMAGE_TYPES,
			maxBytes: DOCTOR_ARTICLE_IMAGE_MAX_BYTES,
			minWidth: DOCTOR_ARTICLE_IMAGE_LEAST_PIXELS,
			minHeight: DOCTOR_ARTICLE_IMAGE_LEAST_PIXELS
		});
		imageEditing = false;
		imageAlt = '';
		imageCaption = '';
		if (issue) {
			panelError =
				issue === 'type'
					? m.doctor_photos_error_type({}, options)
					: issue === 'size'
						? m.doctor_photos_error_large({}, options)
						: m.article_editor_image_small({}, options);
			panel = 'image';
			imageFile = null;
			return;
		}
		imageFile = await readAsDataUri(file);
		imagePreview = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : null;
		void open('image');
	}

	async function addImage() {
		const alt = imageAlt.trim();
		if (!alt) {
			panelError = m.article_editor_image_alt_error({}, options);
			return;
		}
		const caption = imageCaption.trim() || null;
		if (imageEditing) {
			chain()?.updateAttributes('image', { alt, caption }).run();
			close();
			return;
		}
		if (!imageFile || uploading) return;
		uploading = true;
		panelError = null;
		const answer = await onUpload(imageFile);
		uploading = false;
		if ('failure' in answer) {
			panelError = answer.failure;
			return;
		}
		if (editor)
			insertArticleBlock(editor, { type: 'image', attrs: { imageId: answer.id, alt, caption } });
		close();
	}

	type Tool = {
		id: string;
		label: string;
		glyph: ToolGlyphName;
		press: () => void;
		pressed?: boolean;
		disabled?: boolean;
	};
	const tools = $derived.by((): Tool[][] => {
		const now = shown;
		const active = (name: string) => now?.active(name) ?? false;
		const full = (limit: 'images' | 'videos' | 'tables') =>
			(now?.stats[limit] ?? 0) >= ARTICLE_TEXT_LIMITS[limit];
		// D-W52-99: a cell holds paragraphs and lists only — the tools of the other blocks wait outside the table.
		const inCell = Boolean(now?.inTable);
		return [
			[
				{
					id: 'bold',
					label: m.article_editor_bold({}, options),
					glyph: 'bold',
					pressed: active('bold'),
					press: () => chain()?.toggleBold().run()
				},
				{
					id: 'italic',
					label: m.article_editor_italic({}, options),
					glyph: 'italic',
					pressed: active('italic'),
					press: () => chain()?.toggleItalic().run()
				},
				{
					id: 'underline',
					label: m.article_editor_underline({}, options),
					glyph: 'underline',
					pressed: active('underline'),
					press: () => chain()?.toggleUnderline().run()
				},
				{
					id: 'strike',
					label: m.article_editor_strike({}, options),
					glyph: 'strike',
					pressed: active('strike'),
					press: () => chain()?.toggleStrike().run()
				},
				{
					id: 'highlight',
					label: m.article_editor_highlight({}, options),
					glyph: 'highlight',
					pressed: active('highlight'),
					press: () => chain()?.toggleHighlight().run()
				}
			],
			[
				{
					id: 'link',
					label: m.article_editor_link({}, options),
					glyph: 'link',
					pressed: active('link') || panel === 'link',
					press: () => void open('link')
				}
			],
			[
				{
					id: 'bullet-list',
					label: m.article_editor_bullet_list({}, options),
					glyph: 'bullet-list',
					pressed: active('bulletList'),
					press: () => chain()?.toggleBulletList().run()
				},
				{
					id: 'ordered-list',
					label: m.article_editor_ordered_list({}, options),
					glyph: 'ordered-list',
					pressed: active('orderedList'),
					press: () => chain()?.toggleOrderedList().run()
				},
				{
					id: 'quote',
					label: m.article_editor_quote({}, options),
					glyph: 'quote',
					pressed: active('blockquote'),
					disabled: inCell,
					press: () => editor && toggleArticleWrap(editor, 'blockquote')
				},
				{
					id: 'callout',
					label: m.article_editor_callout({}, options),
					glyph: 'callout',
					pressed: active('callout'),
					disabled: inCell,
					press: callout
				},
				{
					id: 'rule',
					label: m.article_editor_rule({}, options),
					glyph: 'rule',
					disabled: inCell,
					press: () => chain()?.setHorizontalRule().run()
				}
			],
			[
				{
					id: 'image',
					label: m.article_editor_image({}, options),
					glyph: 'image',
					pressed: Boolean(now?.imageSelected) || panel === 'image',
					disabled: inCell || (full('images') && !now?.imageSelected),
					press: imageTool
				},
				{
					id: 'video',
					label: m.article_editor_video({}, options),
					glyph: 'video',
					pressed: panel === 'video',
					disabled: inCell || full('videos'),
					press: () => void open('video')
				},
				{
					id: 'table',
					label: m.article_editor_table({}, options),
					glyph: 'table',
					pressed: inCell,
					disabled: inCell || full('tables'),
					press: () => chain()?.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
				}
			],
			[
				{
					id: 'undo',
					label: m.article_editor_undo({}, options),
					glyph: 'undo',
					disabled: !now?.canUndo,
					press: () => chain()?.undo().run()
				},
				{
					id: 'redo',
					label: m.article_editor_redo({}, options),
					glyph: 'redo',
					disabled: !now?.canRedo,
					press: () => chain()?.redo().run()
				}
			]
		];
	});

	const tableTools = $derived([
		{
			id: 'row',
			label: m.article_editor_table_row({}, options),
			press: () => chain()?.addRowAfter().run()
		},
		{
			id: 'column',
			label: m.article_editor_table_column({}, options),
			press: () => chain()?.addColumnAfter().run()
		},
		{
			id: 'remove-row',
			label: m.article_editor_table_remove_row({}, options),
			press: () => chain()?.deleteRow().run()
		},
		{
			id: 'remove-column',
			label: m.article_editor_table_remove_column({}, options),
			press: () => chain()?.deleteColumn().run()
		},
		{
			id: 'remove',
			label: m.article_editor_table_remove({}, options),
			press: () => chain()?.deleteTable().run()
		}
	]);
</script>

{#snippet panelButtons(
	add: () => void,
	extra?: { label: string; press: () => void; testId: string }
)}
	<div class="mt-3 flex flex-row items-center justify-end gap-3">
		<Button
			label={m.doctor_photos_cancel({}, options)}
			tone="outline"
			bordered={false}
			hover={false}
			onclick={close}
			data-testid="doctor-article-editor-panel-cancel"
		/>
		{#if extra}
			<Button
				label={extra.label}
				tone="outline"
				bordered={false}
				hover={false}
				onclick={extra.press}
				data-testid={extra.testId}
			/>
		{/if}
		<Button
			label={m.article_editor_add({}, options)}
			tone="contrast"
			bordered={false}
			radius="full"
			hover={false}
			loading={uploading}
			onclick={add}
			data-testid="doctor-article-editor-panel-add"
		/>
	</div>
{/snippet}

<!-- 🔴 Wave 5.2 · screen 85, the editor (U-222.2, D-W52-103; `64-switch/sw.js` `arEditPage`): our own component on
     Tiptap, no look of its own — ONE toolbar under the top bar (sticky; below 744 it scrolls sideways), «Στυλ κειμένου»
     and the 16 tools, pressed = state, never a colour under the pointer (U-100); a link, a video and an image open their
     words in a band under the toolbar (never a window, U-102); a table its own row of actions; the body edited in place,
     «… / 50.000 χαρακτήρες» under it. Only the server's schema can be written (`lib/extensions`). -->
<div
	data-testid="doctor-article-editor"
	class={[
		'mt-3 rounded-lg border bg-card',
		invalid ? 'border-danger ring-1 ring-danger ring-inset' : 'border-input'
	]}
>
	<div
		role="toolbar"
		aria-label={m.article_editor_toolbar({}, options)}
		data-testid="doctor-article-editor-toolbar"
		class="sticky top-0 z-20 scrollbar-none flex flex-row items-center gap-0.5 overflow-x-auto rounded-t-lg border-b border-line bg-card p-1.5 tablet:top-bar-top tablet:flex-wrap tablet:overflow-visible"
	>
		<select
			aria-label={m.article_editor_style({}, options)}
			data-testid="doctor-article-editor-style"
			value={shown?.style ?? 'p'}
			disabled={shown ? !shown.canHeading : false}
			onchange={(event) => setStyle((event.currentTarget as HTMLSelectElement).value)}
			class="h-touch min-w-touch shrink-0 rounded-md border border-line-2 bg-card px-2 text-body-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40"
		>
			<option value="p">{m.article_editor_style_text({}, options)}</option>
			<option value="h2">{m.article_editor_style_heading({}, options)}</option>
			<option value="h3">{m.article_editor_style_subheading({}, options)}</option>
		</select>
		{#each tools as group, index (index)}
			<span aria-hidden="true" class="mx-1 h-5 w-px shrink-0 bg-line"></span>
			{#each group as tool (tool.id)}
				<button
					type="button"
					aria-label={tool.label}
					title={tool.label}
					aria-pressed={tool.pressed === undefined ? undefined : tool.pressed}
					aria-controls={['link', 'video', 'image'].includes(tool.id)
						? `${panelId}-${tool.id}`
						: undefined}
					disabled={tool.disabled}
					data-testid={`doctor-article-tool-${tool.id}`}
					onmousedown={(event) => event.preventDefault()}
					onclick={tool.press}
					class="inline-flex size-touch shrink-0 items-center justify-center rounded-md text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-40 aria-pressed:bg-chip aria-pressed:ring-1 aria-pressed:ring-line-2 aria-pressed:ring-inset"
				>
					<ToolGlyph name={tool.glyph} />
				</button>
			{/each}
		{/each}
	</div>

	{#if panel === 'link'}
		<div
			id={`${panelId}-link`}
			data-testid="doctor-article-editor-link"
			class="border-b border-line bg-muted/40 px-4 py-3.5"
		>
			<TextField
				bind:value={address}
				label={m.article_editor_link_label({}, options)}
				type="url"
				inputmode="url"
				autocomplete="off"
				spellcheck="false"
				maxlength={ARTICLE_TEXT_LIMITS.hrefLength}
				placeholder="https://"
				error={panelError ?? undefined}
				helperText={m.article_editor_link_help({}, options)}
				onkeydown={(event: KeyboardEvent) => {
					if (event.key === 'Enter') {
						event.preventDefault();
						addLink();
					}
				}}
				data-testid="doctor-article-editor-link-address"
			/>
			{@render panelButtons(
				addLink,
				editor?.isActive('link')
					? {
							label: m.article_editor_unlink({}, options),
							press: removeLink,
							testId: 'doctor-article-editor-unlink'
						}
					: undefined
			)}
		</div>
	{:else if panel === 'video'}
		<div
			id={`${panelId}-video`}
			data-testid="doctor-article-editor-video"
			class="border-b border-line bg-muted/40 px-4 py-3.5"
		>
			<TextField
				bind:value={address}
				label={m.article_editor_video_label({}, options)}
				type="url"
				inputmode="url"
				autocomplete="off"
				spellcheck="false"
				maxlength={ARTICLE_TEXT_LIMITS.hrefLength}
				placeholder="https://www.youtube.com/watch?v=…"
				error={panelError ?? undefined}
				helperText={m.article_editor_video_help({}, options)}
				data-testid="doctor-article-editor-video-address"
			/>
			{@render panelButtons(addVideo)}
		</div>
	{:else if panel === 'image'}
		<div
			id={`${panelId}-image`}
			data-testid="doctor-article-editor-image"
			class="border-b border-line bg-muted/40 px-4 py-3.5"
		>
			{#if imageFile || imageEditing}
				{#if imagePreview}
					<img src={imagePreview} alt="" class="mb-3 max-h-placeholder-lg w-auto rounded-md" />
				{/if}
				<TextField
					bind:value={imageAlt}
					label={m.article_editor_image_alt({}, options)}
					autocomplete="off"
					maxlength={ARTICLE_TEXT_LIMITS.altLength}
					error={panelError ?? undefined}
					helperText={m.article_editor_image_alt_help({}, options)}
					data-testid="doctor-article-editor-image-alt"
				/>
				<div class="mt-3">
					<TextField
						bind:value={imageCaption}
						label={m.article_editor_caption({}, options)}
						autocomplete="off"
						maxlength={ARTICLE_TEXT_LIMITS.captionLength}
						data-testid="doctor-article-editor-image-caption"
					/>
				</div>
				{@render panelButtons(addImage)}
			{:else}
				<p role="alert" class="text-label-lg font-medium text-danger-text">{panelError}</p>
				<div class="mt-3 flex flex-row justify-end">
					<Button
						label={m.doctor_photos_cancel({}, options)}
						tone="outline"
						bordered={false}
						hover={false}
						onclick={close}
						data-testid="doctor-article-editor-panel-cancel"
					/>
				</div>
			{/if}
		</div>
	{/if}

	{#if shown?.inTable}
		<div
			role="group"
			aria-label={m.article_editor_table({}, options)}
			data-testid="doctor-article-editor-table"
			class="scrollbar-none flex flex-row gap-1 overflow-x-auto border-b border-line px-1.5 py-1"
		>
			{#each tableTools as tool (tool.id)}
				<button
					type="button"
					data-testid={`doctor-article-table-${tool.id}`}
					onmousedown={(event) => event.preventDefault()}
					onclick={tool.press}
					class="inline-flex min-h-touch min-w-touch shrink-0 items-center rounded-md px-3 text-body-sm font-medium whitespace-nowrap text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				>
					{tool.label}
				</button>
			{/each}
		</div>
	{/if}

	<div bind:this={element}></div>
	<input
		bind:this={picker}
		type="file"
		accept={DOCTOR_ARTICLE_IMAGE_TYPES.join(',')}
		class="hidden"
		tabindex="-1"
		aria-hidden="true"
		data-testid="doctor-article-editor-image-file"
		onchange={picked}
	/>
</div>
<div class="mt-1.5 flex flex-row items-start justify-between gap-3 px-0.5">
	<p
		aria-live="polite"
		data-testid="doctor-article-editor-limit"
		class="text-label-lg text-muted-foreground"
	>
		{limitNote}
	</p>
	<p data-testid="doctor-article-editor-count" class="shrink-0 text-label-lg text-muted-foreground">
		{doctorArticleCount(shown?.stats.characters ?? 0, ARTICLE_TEXT_LIMITS.characters, locale)}
	</p>
</div>
