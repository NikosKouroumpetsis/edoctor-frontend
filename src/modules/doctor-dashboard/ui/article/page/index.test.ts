import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { Editor, JSONContent } from '@tiptap/core';
import { QueryClient } from '@tanstack/svelte-query';
import { goto } from '$app/navigation';
import { readArticleText } from '$shared/lib/article-text';
import { Session } from '$shared/state/session';
import { ToastState } from '$shared/ui/molecules/toast';
import {
	sampleArticleId,
	sampleArticleImageId,
	sampleArticleRow,
	sampleArticlesServer
} from '$modules/doctor-dashboard/api/articles/articles.sample';
import Harness from './article.harness.svelte';

/*
 * 🔴 Wave 5.2 · screen 85, ONE article (U-221, U-222, D-W52-103; card w52-w9, part 2): «Νέο άρθρο» and one of the
 * doctor's with the server stubbed at `fetch` (the module's precedent) — the fields, the cover, the editor's 16 tools,
 * links `https:` only, a video as `{ provider, id }`, an image by its upload, the limits, the preview, the buttons, the
 * three messages and the deletion asked first. Made-up words.
 */

const DRAFT = sampleArticleId(1);
const PUBLISHED = sampleArticleId(2);
const REFUSED = sampleArticleId(4);

function serve(start: Parameters<typeof sampleArticlesServer>[0] = {}) {
	const server = sampleArticlesServer({
		rows: [
			sampleArticleRow(1, { status: 'DRAFT', title: 'Πίεση στο σπίτι' }),
			sampleArticleRow(2, {
				status: 'PUBLISHED',
				title: 'Άσκηση μετά από έμφραγμα',
				publishedAt: '2026-10-12T09:00:00.000Z'
			}),
			sampleArticleRow(4, {
				status: 'REJECTED',
				title: 'Holter ρυθμού',
				rejectedAt: '2026-11-08T09:00:00.000Z',
				rejectionReason: 'Αφαιρέστε τη διαφήμιση του ιατρείου.'
			})
		],
		...start
	});
	vi.stubGlobal('fetch', vi.fn(server.fetch));
	return server;
}

function open(
	options: { articleId?: string | null; locale?: 'el' | 'en'; session?: Session } = {}
) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: Infinity } }
	});
	const toasts = new ToastState();
	let editor: Editor | null = null;
	const view = render(Harness, {
		props: {
			client,
			toasts,
			...options,
			onEditorReady: (made: Editor) => {
				editor = made;
			}
		}
	});
	const typed = async () => {
		await waitFor(() => expect(editor).not.toBeNull());
		return editor as unknown as Editor;
	};
	return { client, toasts, typed, ...view };
}

const main = () => screen.getByTestId('doctor-article');
const words = (element: Element | null) => element?.textContent?.replace(/\s+/gu, ' ').trim();
// The form is there once its editor loaded (`import()` with the article's page).
const shown = async (state: string) => {
	await waitFor(() => expect(main()).toHaveAttribute('data-view', state));
	if (state === 'form') await screen.findByTestId('doctor-article-editor-body');
};
const tool = (id: string) => screen.getByTestId(`doctor-article-tool-${id}`);
const sentBody = (server: ReturnType<typeof serve>) =>
	server.writes().at(-1)?.body as Record<string, unknown> | undefined;

beforeAll(() => {
	// jsdom draws no layout: ProseMirror asks a range for its boxes when it scrolls the selection into view.
	const empty = () => ({
		x: 0,
		y: 0,
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		width: 0,
		height: 0,
		toJSON: () => ({})
	});
	Range.prototype.getBoundingClientRect = empty as never;
	Range.prototype.getClientRects = (() => ({
		length: 0,
		item: () => null,
		[Symbol.iterator]: [][Symbol.iterator]
	})) as never;
	document.elementFromPoint = (() => null) as never;
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	vi.mocked(goto).mockClear();
});

describe('screen 85, one article (wave 5.2 · D-W52-103)', () => {
	it('🔴 U-221.1 · D-W52-103: «Νέο άρθρο» — the kind in rows, the title, the short description, the cover, «Μη γράφετε στοιχεία ασθενών», the editor with «Στυλ κειμένου» and the 16 tools, «0 / 50.000», the buttons; no «Διαγραφή»; «‹» only below 744', async () => {
		serve();
		open();
		await shown('form');
		expect(main()).toHaveClass('mx-auto', 'max-w-document-wide');
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Νέο άρθρο');
		expect(screen.getByTestId('doctor-article-back')).toHaveAttribute('href', '/doctor/articles');
		expect(screen.getByTestId('doctor-article-back')).toHaveClass('tablet:hidden');
		expect(screen.queryByTestId('doctor-article-note')).toBeNull();
		const kinds = within(screen.getByTestId('doctor-article-kind')).getAllByRole('radio');
		expect(kinds.map((row) => words(row))).toEqual([
			'Άρθρο Εξηγεί ένα θέμα υγείας, με υπότιτλους.',
			'Συμβουλή υγείας Σύντομες, πρακτικές οδηγίες για την καθημερινότητα.'
		]);
		expect(screen.getByTestId('doctor-article-title')).toHaveAttribute('maxlength', '200');
		expect(screen.getByTestId('doctor-article-cover-add')).toHaveTextContent('Προσθήκη εικόνας');
		expect(screen.getByTestId('doctor-article-privacy')).toHaveTextContent(
			'Με απλά λόγια, για ασθενείς. Μη γράφετε στοιχεία ασθενών.'
		);
		const toolbar = screen.getByTestId('doctor-article-editor-toolbar');
		expect(toolbar).toHaveAttribute('role', 'toolbar');
		expect(toolbar).toHaveClass('sticky', 'top-0', 'tablet:top-bar-top', 'scrollbar-none');
		expect(
			within(toolbar)
				.getAllByRole('button')
				.map((button) => button.getAttribute('aria-label'))
		).toEqual([
			'Έντονα',
			'Πλάγια',
			'Υπογράμμιση',
			'Διακριτή διαγραφή',
			'Επισήμανση',
			'Σύνδεσμος',
			'Λίστα με κουκκίδες',
			'Λίστα με αρίθμηση',
			'Παράθεμα',
			'Πλαίσιο «Σημαντικό»',
			'Διαχωριστική γραμμή',
			'Εικόνα',
			'Βίντεο YouTube ή Vimeo',
			'Πίνακας',
			'Αναίρεση',
			'Επανάληψη'
		]);
		for (const button of within(toolbar).getAllByRole('button'))
			expect(button, button.getAttribute('aria-label') ?? '').toHaveClass('size-touch');
		expect(screen.getByTestId('doctor-article-editor-style')).toHaveAccessibleName('Στυλ κειμένου');
		expect(words(screen.getByTestId('doctor-article-editor-count'))).toBe('0 / 50.000 χαρακτήρες');
		expect(screen.getByTestId('doctor-article-preview-open')).toHaveTextContent('Προεπισκόπηση');
		expect(screen.getByTestId('doctor-article-save')).toHaveTextContent('Αποθήκευση πρόχειρου');
		expect(screen.getByTestId('doctor-article-cancel')).toHaveTextContent('Άκυρο');
		expect(screen.getByTestId('doctor-article-send')).toHaveTextContent('Αποστολή για έλεγχο');
		expect(screen.queryByTestId('doctor-article-delete')).toBeNull();
		// U-207.3: Greek alone — no choice of a language anywhere on the page.
		expect(main()).not.toHaveTextContent(/Γλώσσα|English/u);
	});

	it('🔴 D-W52-103 (U-221.1): the three messages — «Αποστολή» with nothing says all three and calls no one; «Αποθήκευση πρόχειρου» needs only the title', async () => {
		const server = serve();
		open();
		await shown('form');
		await userEvent.click(screen.getByTestId('doctor-article-send'));
		expect(main()).toHaveTextContent('Γράψτε τον τίτλο.');
		expect(main()).toHaveTextContent('Γράψτε μια σύντομη περιγραφή.');
		expect(screen.getByTestId('doctor-article-text-error')).toHaveTextContent(
			'Γράψτε το κείμενο του άρθρου.'
		);
		expect(screen.getByTestId('doctor-article-editor')).toHaveClass('border-danger');
		expect(screen.getByTestId('doctor-article-editor-body')).toHaveAttribute(
			'aria-describedby',
			'doctor-article-text-error'
		);
		await userEvent.click(screen.getByTestId('doctor-article-save'));
		expect(main()).toHaveTextContent('Γράψτε τίτλο για να το αποθηκεύσετε.');
		expect(main()).not.toHaveTextContent('Γράψτε μια σύντομη περιγραφή.');
		expect(server.writes()).toEqual([]);
	});

	it('🔴 D-W52-95 / 103: «Αποστολή για έλεγχο» of a new article — ONE call with the server’s body (Greek, the kind, the words, the closed text), the toast and the list', async () => {
		const server = serve();
		const { typed, toasts } = open();
		await shown('form');
		await userEvent.click(
			within(screen.getByTestId('doctor-article-kind')).getAllByRole('radio')[1]
		);
		await userEvent.type(screen.getByTestId('doctor-article-title'), 'Πίεση στο σπίτι');
		await userEvent.type(
			screen.getByRole('textbox', { name: 'Σύντομη περιγραφή' }),
			'Πώς τη μετράτε σωστά.'
		);
		const editor = await typed();
		editor.commands.insertContent('Καθίστε ήσυχα πέντε λεπτά.');
		await waitFor(() =>
			expect(words(screen.getByTestId('doctor-article-editor-count'))).toBe(
				'26 / 50.000 χαρακτήρες'
			)
		);
		await userEvent.click(screen.getByTestId('doctor-article-send'));
		await waitFor(() => expect(vi.mocked(goto)).toHaveBeenCalledWith('/doctor/articles'));
		expect(server.writes().map((call) => `${call.method} ${call.path}`)).toEqual([
			'POST /article/me/articles/submission'
		]);
		const body = sentBody(server);
		expect(body).toMatchObject({
			language: 'el',
			type: 'HEALTH_ADVICE',
			title: 'Πίεση στο σπίτι',
			shortDescription: 'Πώς τη μετράτε σωστά.'
		});
		expect(body).not.toHaveProperty('image');
		expect(readArticleText(body?.content)).toEqual({
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'Καθίστε ήσυχα πέντε λεπτά.' }] }
			]
		});
		expect(toasts.current?.message).toBe(
			'Στάλθηκε για έλεγχο. Θα σας ειδοποιήσουμε μόλις δημοσιευτεί.'
		);
	});

	it('🔴 D-W52-103: a draft — seeded from the server, «Πρόχειρο…» over it; «Αποθήκευση πρόχειρου» is ONE `PUT`, an empty text goes as `null`', async () => {
		const server = serve({
			articles: { [DRAFT]: { shortDescription: 'Δύο γραμμές.', content: null } }
		});
		const { toasts } = open({ articleId: DRAFT });
		await shown('form');
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Αλλαγή άρθρου');
		expect(words(screen.getByTestId('doctor-article-note'))).toBe(
			'Πρόχειρο. Το βλέπετε μόνο εσείς.'
		);
		expect(screen.getByTestId('doctor-article-title')).toHaveValue('Πίεση στο σπίτι');
		await userEvent.click(screen.getByTestId('doctor-article-save'));
		await waitFor(() => expect(vi.mocked(goto)).toHaveBeenCalledWith('/doctor/articles'));
		expect(server.writes().map((call) => `${call.method} ${call.path}`)).toEqual([
			`PUT /article/me/articles/${DRAFT}`
		]);
		expect(sentBody(server)).toMatchObject({ title: 'Πίεση στο σπίτι', content: null });
		expect(toasts.current?.message).toBe('Αποθηκεύτηκε. Το βλέπετε μόνο εσείς.');
	});

	it('🔴 D-W52-95 (U-221.1): a published article — no «Αποθήκευση πρόχειρου»; its change goes ONE `POST …/submission` with «Η αλλαγή στάλθηκε…»', async () => {
		const server = serve();
		const { toasts } = open({ articleId: PUBLISHED });
		await shown('form');
		expect(words(screen.getByTestId('doctor-article-note'))).toBe(
			'Δημοσιευμένο από 12 Οκτωβρίου 2026. Αν το αλλάξετε, η αλλαγή περνά από έλεγχο· ως τότε οι ασθενείς βλέπουν το άρθρο όπως είναι.'
		);
		expect(screen.queryByTestId('doctor-article-save')).toBeNull();
		await userEvent.click(screen.getByTestId('doctor-article-send'));
		await waitFor(() => expect(vi.mocked(goto)).toHaveBeenCalled());
		expect(server.writes().map((call) => `${call.method} ${call.path}`)).toEqual([
			`POST /article/me/articles/${PUBLISHED}/submission`
		]);
		expect(toasts.current?.message).toBe(
			'Η αλλαγή στάλθηκε για έλεγχο. Ως τότε φαίνεται το άρθρο όπως ήταν.'
		);
	});

	it('🔴 D-W52-103: a refused article — «Δεν δημοσιεύτηκε · day», the team’s words, «Διορθώστε το…»; «Αποθήκευση πρόχειρου» stays', async () => {
		serve();
		open({ articleId: REFUSED });
		await shown('form');
		const note = screen.getByTestId('doctor-article-note');
		expect(note).toHaveAttribute('data-refused');
		expect(words(note)).toBe(
			'Δεν δημοσιεύτηκε · 8 Νοεμβρίου 2026 Η ομάδα του eDoctor γράφει: «Αφαιρέστε τη διαφήμιση του ιατρείου.» Διορθώστε το και στείλτε το ξανά.'
		);
		expect(screen.getByTestId('doctor-article-save')).toBeInTheDocument();
	});

	it('🔴 D-W52-95: «Διαγραφή άρθρου» is asked first («Άκυρο» keeps it); yes ⇒ ONE `DELETE`, «Το άρθρο διαγράφηκε.» and the list; a published one says it leaves the public page', async () => {
		const server = serve();
		const { toasts } = open({ articleId: PUBLISHED });
		await shown('form');
		await userEvent.click(screen.getByTestId('doctor-article-delete'));
		const dialog = await screen.findByTestId('doctor-article-delete-dialog');
		expect(within(dialog).getByRole('heading')).toHaveTextContent('Διαγραφή άρθρου;');
		expect(screen.getByTestId('doctor-article-delete-body')).toHaveTextContent(
			'Το άρθρο φεύγει από τη σελίδα σας και από τα «Άρθρα» του eDoctor. Δεν επανέρχεται.'
		);
		await userEvent.click(screen.getByTestId('doctor-article-delete-cancel'));
		await waitFor(() => expect(screen.queryByTestId('doctor-article-delete-dialog')).toBeNull());
		expect(server.writes()).toEqual([]);
		await userEvent.click(screen.getByTestId('doctor-article-delete'));
		await userEvent.click(await screen.findByTestId('doctor-article-delete-confirm'));
		await waitFor(() => expect(vi.mocked(goto)).toHaveBeenCalledWith('/doctor/articles'));
		expect(server.writes().map((call) => `${call.method} ${call.path}`)).toEqual([
			`DELETE /article/me/articles/${PUBLISHED}`
		]);
		expect(toasts.current?.message).toBe('Το άρθρο διαγράφηκε.');
	});

	it('🔴 U-222.4: «Σύνδεσμος» — `javascript:` and `http:` are refused with the page’s words, `https:` becomes the link (its address alone)', async () => {
		serve();
		const { typed } = open();
		await shown('form');
		const editor = await typed();
		editor.commands.insertContent('ΕΟΔΥ');
		editor.commands.setTextSelection({ from: 1, to: 5 });
		await userEvent.click(tool('link'));
		const field = await screen.findByTestId('doctor-article-editor-link-address');
		await userEvent.type(field, 'javascript:alert(1)');
		await userEvent.click(screen.getByTestId('doctor-article-editor-panel-add'));
		expect(screen.getByTestId('doctor-article-editor-link')).toHaveTextContent(
			'Δεχόμαστε μόνο ασφαλείς διευθύνσεις, που ξεκινούν με https://'
		);
		await userEvent.clear(field);
		await userEvent.type(field, 'http://eody.gov.gr');
		await userEvent.click(screen.getByTestId('doctor-article-editor-panel-add'));
		expect(screen.getByTestId('doctor-article-editor-link')).toHaveTextContent(
			'Δεχόμαστε μόνο ασφαλείς διευθύνσεις, που ξεκινούν με https://'
		);
		await userEvent.clear(field);
		await userEvent.type(field, 'eody');
		await userEvent.click(screen.getByTestId('doctor-article-editor-panel-add'));
		expect(screen.getByTestId('doctor-article-editor-link')).toHaveTextContent(
			'Γράψτε ολόκληρη τη διεύθυνση, π.χ. https://www.example.gr'
		);
		expect(JSON.stringify(editor.getJSON())).not.toContain('"link"');
		await userEvent.clear(field);
		await userEvent.type(field, 'https://eody.gov.gr/');
		await userEvent.click(screen.getByTestId('doctor-article-editor-panel-add'));
		await waitFor(() => expect(screen.queryByTestId('doctor-article-editor-link')).toBeNull());
		expect(editor.getJSON().content?.[0].content?.[0].marks).toEqual([
			{ type: 'link', attrs: { href: 'https://eody.gov.gr/' } }
		]);
		const anchor = screen.getByTestId('doctor-article-editor-body').querySelector('a');
		expect(anchor).toHaveAttribute('rel', 'nofollow ugc noopener noreferrer');
	});

	it('🔴 D-W52-103: «Βίντεο» — another site is refused; a YouTube address becomes `{ provider, id }`, drawn as a PLACE with no frame', async () => {
		serve();
		const { typed } = open();
		await shown('form');
		const editor = await typed();
		await userEvent.click(tool('video'));
		const field = await screen.findByTestId('doctor-article-editor-video-address');
		await userEvent.type(field, 'https://evil.example/watch?v=dQw4w9WgXcQ');
		await userEvent.click(screen.getByTestId('doctor-article-editor-panel-add'));
		expect(screen.getByTestId('doctor-article-editor-video')).toHaveTextContent(
			'Δεχόμαστε συνδέσμους YouTube ή Vimeo, π.χ. https://www.youtube.com/watch?v=…'
		);
		await userEvent.clear(field);
		await userEvent.type(field, 'https://youtu.be/dQw4w9WgXcQ');
		await userEvent.click(screen.getByTestId('doctor-article-editor-panel-add'));
		await waitFor(() => expect(screen.queryByTestId('doctor-article-editor-video')).toBeNull());
		expect(editor.getJSON().content).toContainEqual({
			type: 'video',
			attrs: { provider: 'youtube', id: 'dQw4w9WgXcQ' }
		});
		const body = screen.getByTestId('doctor-article-editor-body');
		expect(body.querySelector('iframe')).toBeNull();
		expect(body).toHaveTextContent('Βίντεο YouTube · φορτώνει όταν το πατήσει ο ασθενής');
	});

	it('🔴 D-W52-100: «Εικόνα» — the file checked first (200 × 200), its description required, the server’s refusal in the text’s words, then ONE upload and the node `{ imageId, alt, caption }`', async () => {
		const server = serve();
		const { typed } = open();
		await shown('form');
		const editor = await typed();
		const file = new File([new Uint8Array([1, 2, 3])], 'p.png', { type: 'image/png' });
		vi.stubGlobal(
			'createImageBitmap',
			vi.fn(async () => ({ width: 120, height: 120, close: () => {} }))
		);
		await userEvent.upload(screen.getByTestId('doctor-article-editor-image-file'), file);
		expect(await screen.findByTestId('doctor-article-editor-image')).toHaveTextContent(
			'Πολύ μικρή εικόνα: χρειάζεται τουλάχιστον 200 × 200.'
		);
		await userEvent.click(screen.getByTestId('doctor-article-editor-panel-cancel'));
		vi.stubGlobal(
			'createImageBitmap',
			vi.fn(async () => ({ width: 1200, height: 800, close: () => {} }))
		);
		await userEvent.upload(screen.getByTestId('doctor-article-editor-image-file'), file);
		const alt = await screen.findByTestId('doctor-article-editor-image-alt');
		await userEvent.click(screen.getByTestId('doctor-article-editor-panel-add'));
		expect(screen.getByTestId('doctor-article-editor-image')).toHaveTextContent(
			'Γράψτε μια σύντομη περιγραφή της εικόνας.'
		);
		expect(server.writes()).toEqual([]);
		await userEvent.type(alt, 'Πιεσόμετρο στο μπράτσο');
		await userEvent.type(screen.getByTestId('doctor-article-editor-image-caption'), 'Σωστή θέση');
		// The server's own refusal of a small picture says the text's 200 × 200 (never the cover's 800 × 600).
		server.refuse('POST', '/images', 422, 'IMAGE_TOO_SMALL');
		await userEvent.click(screen.getByTestId('doctor-article-editor-panel-add'));
		await waitFor(() =>
			expect(screen.getByTestId('doctor-article-editor-image')).toHaveTextContent(
				'Πολύ μικρή εικόνα: χρειάζεται τουλάχιστον 200 × 200.'
			)
		);
		await userEvent.click(screen.getByTestId('doctor-article-editor-panel-add'));
		await waitFor(() => expect(screen.queryByTestId('doctor-article-editor-image')).toBeNull());
		expect(server.writes().map((call) => `${call.method} ${call.path}`)).toEqual([
			'POST /article/me/articles/images',
			'POST /article/me/articles/images'
		]);
		expect((server.writes()[0].body as { image: { file: string } }).image.file).toMatch(
			/^data:image\/png;base64,/u
		);
		expect(editor.getJSON().content).toContainEqual({
			type: 'image',
			attrs: {
				imageId: sampleArticleImageId(1),
				alt: 'Πιεσόμετρο στο μπράτσο',
				caption: 'Σωστή θέση'
			}
		});
		const picture = screen.getByTestId('doctor-article-editor-body').querySelector('figure img');
		expect(picture).toHaveAttribute('alt', 'Πιεσόμετρο στο μπράτσο');
	});

	it('🔴 D-W52-103: «Πίνακας» — a table with its header row and its own actions; inside it the tools of other blocks wait', async () => {
		serve();
		const { typed } = open();
		await shown('form');
		const editor = await typed();
		await userEvent.click(tool('table'));
		const actions = await screen.findByTestId('doctor-article-editor-table');
		expect(
			within(actions)
				.getAllByRole('button')
				.map((button) => words(button))
		).toEqual([
			'Γραμμή από κάτω',
			'Στήλη δεξιά',
			'Αφαίρεση γραμμής',
			'Αφαίρεση στήλης',
			'Αφαίρεση πίνακα'
		]);
		const table = editor.getJSON().content?.find((node) => node.type === 'table') as JSONContent;
		expect(table.content?.[0].content?.map((cell: JSONContent) => cell.type)).toEqual([
			'tableHeader',
			'tableHeader',
			'tableHeader'
		]);
		for (const id of ['quote', 'callout', 'rule', 'image', 'video', 'table'])
			expect(tool(id), id).toBeDisabled();
		expect(screen.getByTestId('doctor-article-editor-style')).toBeDisabled();
		await userEvent.click(screen.getByTestId('doctor-article-table-row'));
		expect(editor.getJSON().content?.find((node) => node.type === 'table')?.content).toHaveLength(
			4
		);
		await userEvent.click(screen.getByTestId('doctor-article-table-remove'));
		expect(editor.getJSON().content?.some((node) => node.type === 'table')).toBe(false);
	});

	it('🔴 D-W52-103: the marks and blocks of the toolbar press their state (`aria-pressed`, never a colour of the pointer); undo / redo', async () => {
		serve();
		const { typed } = open();
		await shown('form');
		const editor = await typed();
		editor.commands.insertContent('Λέξη');
		editor.commands.setTextSelection({ from: 1, to: 5 });
		for (const id of ['bold', 'italic', 'underline', 'strike', 'highlight']) {
			expect(tool(id)).toHaveAttribute('aria-pressed', 'false');
			await userEvent.click(tool(id));
			expect(tool(id), id).toHaveAttribute('aria-pressed', 'true');
			expect(tool(id).className).not.toMatch(/hover:/u);
		}
		await userEvent.click(tool('bullet-list'));
		expect(tool('bullet-list')).toHaveAttribute('aria-pressed', 'true');
		await userEvent.click(tool('quote'));
		expect(tool('quote')).toHaveAttribute('aria-pressed', 'true');
		await userEvent.selectOptions(screen.getByTestId('doctor-article-editor-style'), 'h2');
		expect(readArticleText(editor.getJSON())).not.toBeNull();
		expect(tool('undo')).toBeEnabled();
		await userEvent.click(tool('undo'));
		expect(tool('redo')).toBeEnabled();
	});

	it('🔴 U-222.2: «Σημαντικό» on an empty line opens the box with its first word', async () => {
		serve();
		const { typed } = open();
		await shown('form');
		const editor = await typed();
		await userEvent.click(tool('callout'));
		expect(editor.getJSON().content?.[0]).toEqual({
			type: 'callout',
			content: [
				{
					type: 'paragraph',
					content: [
						{ type: 'text', text: 'Σημαντικό:', marks: [{ type: 'bold' }] },
						{ type: 'text', text: ' ' }
					]
				}
			]
		});
	});

	it('🔴 D-W52-103 (U-221.1): «Προεπισκόπηση» — the article as its public page draws it, only to look at, «Κλείσιμο» back to the form as it was', async () => {
		serve();
		const { typed } = open();
		await shown('form');
		await userEvent.type(screen.getByTestId('doctor-article-title'), 'Πίεση στο σπίτι');
		const editor = await typed();
		editor.commands.insertContent([
			{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Πριν' }] },
			{
				type: 'paragraph',
				content: [
					{
						type: 'text',
						text: 'ΕΟΔΥ',
						marks: [{ type: 'link', attrs: { href: 'https://eody.gov.gr/' } }]
					}
				]
			},
			{ type: 'video', attrs: { provider: 'youtube', id: 'dQw4w9WgXcQ' } }
		]);
		await userEvent.click(screen.getByTestId('doctor-article-preview-open'));
		const preview = await screen.findByTestId('doctor-article-preview');
		expect(screen.getByTestId('doctor-article-preview-band')).toHaveTextContent(
			'Έτσι θα το δουν οι ασθενείς'
		);
		expect(screen.getByTestId('doctor-article-preview-band')).toHaveTextContent(
			'Ως τη δημοσίευση, το βλέπετε μόνο εσείς.'
		);
		const body = screen.getByTestId('doctor-article-preview-body');
		expect(body).toHaveAttribute('inert');
		expect(within(preview).getByRole('heading', { level: 1, hidden: true })).toHaveTextContent(
			'Πίεση στο σπίτι'
		);
		expect(body.querySelector('h2')).toHaveTextContent('Πριν');
		expect(body.querySelector('a')).toHaveAttribute('rel', 'nofollow ugc noopener noreferrer');
		// D-W52-104: the video only on a press — no frame drawn by the preview.
		expect(body.querySelector('iframe')).toBeNull();
		expect(screen.getByTestId('doctor-article-title').closest('[hidden]')).not.toBeNull();
		await userEvent.click(screen.getByTestId('doctor-article-preview-close'));
		expect(screen.queryByTestId('doctor-article-preview')).toBeNull();
		expect(screen.getByTestId('doctor-article-title')).toHaveValue('Πίεση στο σπίτι');
		expect(editor.getJSON().content?.[0]).toMatchObject({ type: 'heading' });
	});

	it('🔴 D-W52-103: a refusal of the server says its words — the text refused (422) stays on the page with the form', async () => {
		const server = serve();
		server.refuse('POST', '/submission', 422, 'ARTICLE_CONTENT_REFUSED', { content: 'NODE' });
		const { typed } = open();
		await shown('form');
		await userEvent.type(screen.getByTestId('doctor-article-title'), 'Τίτλος');
		await userEvent.type(screen.getByRole('textbox', { name: 'Σύντομη περιγραφή' }), 'Δύο.');
		(await typed()).commands.insertContent('Λέξη.');
		await userEvent.click(screen.getByTestId('doctor-article-send'));
		expect(await screen.findByTestId('doctor-article-failure')).toHaveTextContent(
			'Το κείμενο έχει κάτι που δεν δεχόμαστε. Ελέγξτε τους συνδέσμους, τα βίντεο και τις εικόνες και δοκιμάστε ξανά.'
		);
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('D-107: an article that is not the doctor’s (403) is «Αυτό το άρθρο δεν υπάρχει πια.» — no form', async () => {
		serve();
		open({ articleId: sampleArticleId(77) });
		await shown('gone');
		expect(screen.getByTestId('doctor-article-gone')).toHaveTextContent(
			'Αυτό το άρθρο δεν υπάρχει πια.'
		);
		expect(screen.queryByTestId('doctor-article-editor')).toBeNull();
	});

	it('🔴 U-65.6: a cover below 800 × 600 never leaves; one that passes goes as a `data:` text with the write', async () => {
		const server = serve();
		open({ articleId: DRAFT });
		await shown('form');
		const file = new File([new Uint8Array([1, 2, 3])], 'c.jpg', { type: 'image/jpeg' });
		vi.stubGlobal(
			'createImageBitmap',
			vi.fn(async () => ({ width: 640, height: 480, close: () => {} }))
		);
		await userEvent.upload(screen.getByTestId('doctor-article-cover-file'), file);
		expect(await screen.findByTestId('doctor-article-cover-error')).toHaveTextContent(
			'Πολύ μικρή φωτογραφία: χρειάζεται τουλάχιστον 800 × 600.'
		);
		vi.stubGlobal(
			'createImageBitmap',
			vi.fn(async () => ({ width: 1600, height: 900, close: () => {} }))
		);
		await userEvent.upload(screen.getByTestId('doctor-article-cover-file'), file);
		await screen.findByTestId('doctor-article-cover');
		await userEvent.click(screen.getByTestId('doctor-article-save'));
		await waitFor(() => expect(server.writes()).toHaveLength(1));
		expect((sentBody(server)?.image as { file: string }).file).toMatch(
			/^data:image\/jpeg;base64,/u
		);
	});
	it('🔴 round 2 (`sw.css:527`, `:626-628`): each kind’s line stands UNDER its name (13 muted, 2 apart); «Είδος», «Σύντομη περιγραφή», «Εικόνα (προαιρετικό)» and «Κείμενο» are the quiet section names (15/600 muted)', async () => {
		serve();
		open();
		await shown('form');
		const [article] = within(screen.getByTestId('doctor-article-kind')).getAllByRole('radio');
		const note = article.querySelector('[data-slot="radio-rows-note"]');
		expect(note).toHaveTextContent('Εξηγεί ένα θέμα υγείας, με υπότιτλους.');
		expect(note).toHaveClass('text-label-lg', 'text-muted-foreground');
		expect(note?.parentElement).toHaveClass('flex-col', 'gap-0.5');
		for (const name of ['Είδος', 'Σύντομη περιγραφή', 'Εικόνα (προαιρετικό)', 'Κείμενο']) {
			const heading = screen.getByRole('heading', { level: 2, name });
			expect(heading, name).toHaveClass('text-body-md', 'font-semibold', 'text-muted-foreground');
			expect(heading, name).not.toHaveClass('text-foreground');
		}
	});

	it('🔴 round 2 (`sw.js:748-758`, `sw.css:642-645`): B / I / U / S are LETTERS at 17 (B 800, I serif italic, U underlined, S struck through); every other tool the prototype’s line art at 20 with the 1.8 stroke; each a 48 target', async () => {
		serve();
		open();
		await shown('form');
		const letters = {
			bold: ['B', 'font-extrabold'],
			italic: ['I', 'font-serif', 'italic'],
			underline: ['U', 'underline'],
			strike: ['S', 'line-through']
		} as const;
		for (const [id, [letter, ...look]] of Object.entries(letters)) {
			const glyph = tool(id).querySelector('[data-slot="tool-letter"]');
			expect(glyph, id).toHaveTextContent(letter);
			expect(glyph, id).toHaveClass('text-title-xs', ...look);
			expect(tool(id).querySelector('svg'), id).toBeNull();
		}
		for (const id of [
			'highlight',
			'link',
			'bullet-list',
			'ordered-list',
			'quote',
			'callout',
			'rule',
			'image',
			'video',
			'table',
			'undo',
			'redo'
		]) {
			const lines = tool(id).querySelector('svg[data-slot="tool-lines"]');
			expect(lines, id).toHaveAttribute('stroke-width', '1.8');
			expect(lines, id).toHaveClass('icon-md');
			expect(tool(id), id).toHaveClass('size-touch');
		}
	});

	it('🔴 round 2 (`sw.css:668` `.w-arpic`): a cover or a picture of the text that does not load leaves its 16:9 place with the glyph — never a broken image, never its words in a band; the caption stays', async () => {
		serve({
			articles: {
				[DRAFT]: {
					image: {
						smSizeUrl: 'https://cdn.seed.edoctor.test/articles/c-s.webp',
						mediumSizeUrl: 'https://cdn.seed.edoctor.test/articles/c-m.webp',
						lgSizeUrl: 'https://cdn.seed.edoctor.test/articles/c-l.webp'
					} as never,
					content: {
						type: 'doc',
						content: [
							{
								type: 'image',
								attrs: {
									imageId: sampleArticleImageId(1),
									alt: 'Πιεσόμετρο',
									caption: 'Σωστή θέση'
								}
							}
						]
					},
					contentImages: [
						{
							id: sampleArticleImageId(1),
							smSizeUrl: 'https://cdn.seed.edoctor.test/articles/e1-s.webp',
							mediumSizeUrl: 'https://cdn.seed.edoctor.test/articles/e1-m.webp',
							lgSizeUrl: 'https://cdn.seed.edoctor.test/articles/e1-l.webp',
							width: 1200,
							height: 800
						}
					] as never
				}
			}
		});
		open({ articleId: DRAFT });
		await shown('form');
		await fireEvent.error(
			screen.getByTestId('doctor-article-cover').querySelector('img') as HTMLImageElement
		);
		const cover = screen.getByTestId('doctor-article-cover-missing');
		expect(cover).toHaveClass('aspect-video', 'max-h-cover-max', 'bg-muted', 'text-line-2');
		expect(cover.querySelector('svg[data-slot="picture"]')).not.toBeNull();
		expect(screen.getByTestId('doctor-article-cover').querySelector('img')).toBeNull();
		const body = screen.getByTestId('doctor-article-editor-body');
		await fireEvent.error(body.querySelector('figure img') as HTMLImageElement);
		const place = body.querySelector('[data-slot="article-image-missing"]');
		expect(place).toHaveAttribute('role', 'img');
		expect(place).toHaveAccessibleName('Πιεσόμετρο');
		expect(place).not.toHaveTextContent('Πιεσόμετρο');
		expect(place).toHaveClass('aspect-video', 'max-h-figure-max', 'bg-muted', 'text-line-2');
		expect(place?.querySelector('svg path')).toHaveAttribute('d', 'M3.5 17.5 9 12l4 4 2.5-2.5 5 5');
		expect(body.querySelector('figure img')).toBeNull();
		expect(body.querySelector('figcaption')).toHaveTextContent('Σωστή θέση');
	});
});
