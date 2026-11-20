import { untrack } from 'svelte';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { m } from '$paraglide/messages.js';
import { cleanArticleTextDoc, type ArticleTextDoc } from '$shared/lib/article-text';
import { ApiError } from '$shared/lib/http';
import { checkImageFile, readAsDataUri } from '$shared/lib/image';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import { getToastsOptional } from '$shared/ui/molecules/toast';
import {
	deleteDoctorArticle,
	doctorArticleQuery,
	readDoctorArticlesFailure,
	uploadDoctorArticleImage,
	writeDoctorArticle,
	type DoctorArticleFacts,
	type DoctorArticleKind
} from '$modules/doctor-dashboard/api/articles';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	DOCTOR_ARTICLE_COVER_LEAST_ACROSS,
	DOCTOR_ARTICLE_COVER_LEAST_DOWN,
	DOCTOR_ARTICLE_IMAGE_MAX_BYTES,
	DOCTOR_ARTICLE_IMAGE_TYPES
} from '$modules/doctor-dashboard/config';
import {
	doctorArticleCanDraft,
	doctorArticleErrors,
	doctorArticleNote,
	doctorArticlesFailureText
} from '$modules/doctor-dashboard/lib/articles';

/** Where the page stands: its article is on its way, could not be read, is no longer the doctor's, or the form. */
export type DoctorArticleView = 'loading' | 'failed' | 'gone' | 'form';

/**
 * Wave 5.2 · screen 85, ONE article (U-221, U-222, D-W52-103): a new one (`articleId` `null`) or one of the doctor's,
 * read as the server keeps it now.
 * - The form: the kind, the title, the short description, the cover (a new file, removed, or kept) and the text — seeded
 *   ONCE from the server's article; the uploads of the text by their address (the server's, then each new one).
 * - 🔴 D-W52-95: «Αποθήκευση πρόχειρου» (only before the first publication) and «Αποστολή για έλεγχο» — ONE call each,
 *   the page's three messages first (`doctorArticleErrors`), the words of a refusal after; done ⇒ a toast and the list.
 * - «Διαγραφή άρθρου» is asked first; done ⇒ «Το άρθρο διαγράφηκε.» and the list. A `401` ends the session.
 */
export function useDoctorArticle(options: {
	locale: () => SupportedLocale;
	articleId: () => string | null;
	onDone: () => void;
}) {
	const client = useQueryClient();
	const session = getSessionOptional();
	const toasts = getToastsOptional();
	const messages = () => ({ locale: options.locale() });

	const read = createQuery(() => ({
		...doctorArticleQuery(options.articleId() ?? ''),
		enabled: browser && options.articleId() !== null
	}));
	// 🔴 Every field the page needs is READ every time (the library tells a result only what it saw read).
	const answer = $derived({ data: read.data, error: read.error, isError: read.isError });

	const article = $derived<DoctorArticleFacts | null>(
		options.articleId() === null ? null : (answer.data ?? null)
	);
	const view = $derived.by((): DoctorArticleView => {
		if (options.articleId() === null) return 'form';
		if (answer.data) return 'form';
		if (answer.isError)
			return readDoctorArticlesFailure(answer.error) === 'gone' ? 'gone' : 'failed';
		return 'loading';
	});

	const values = $state({
		kind: 'ARTICLE' as DoctorArticleKind,
		title: '',
		description: '',
		content: null as ArticleTextDoc | null
	});
	// The cover: `undefined` keeps the one there is, `null` removes it, a `data:` text is a new one.
	let coverFile = $state<string | null | undefined>(undefined);
	let coverPreview = $state<string | null>(null);
	let coverError = $state<string | null>(null);
	// The uploads of the text, id ⇒ the address they are drawn from.
	const uploads = $state<Record<string, string>>({});
	let seeded = $state(false);

	$effect(() => {
		const current = article;
		if (seeded || (options.articleId() !== null && !current)) return;
		untrack(() => {
			if (current) {
				values.kind = current.kind;
				values.title = current.title;
				values.description = current.shortDescription ?? '';
				values.content = current.content;
				for (const image of current.contentImages) uploads[image.id] = image.url;
			}
			seeded = true;
		});
	});

	let tried = $state<'save' | 'send' | null>(null);
	const errors = $derived(tried ? doctorArticleErrors(values, tried, options.locale()) : {});
	let writing = $state(false);
	let failure = $state<string | null>(null);
	let preview = $state(false);

	let ended: unknown = null;
	$effect(() => {
		const error = answer.error;
		if (!(error instanceof ApiError) || error.status !== 401 || error === ended) return;
		ended = error;
		untrack(() => session?.expire({}));
	});

	const write = createMutation<
		DoctorArticleFacts | null,
		unknown,
		{ act: 'save' | 'send'; wasPublished: boolean }
	>(() => ({
		networkMode: 'always' as const,
		mutationFn: ({ act }) =>
			writeDoctorArticle(options.articleId(), act, {
				kind: values.kind,
				title: values.title,
				shortDescription: values.description,
				content: cleanArticleTextDoc(values.content),
				...(coverFile === undefined ? {} : { cover: coverFile })
			}),
		onSettled: () => {
			writing = false;
		},
		onSuccess: (_answer, { act, wasPublished }) => {
			void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.articles() });
			toasts?.show({
				message:
					act === 'save'
						? m.doctor_my_article_saved({}, messages())
						: wasPublished
							? m.doctor_my_article_change_sent({}, messages())
							: m.doctor_my_article_sent({}, messages())
			});
			options.onDone();
		},
		onError: (error: unknown, { act }) => {
			const reason = readDoctorArticlesFailure(error);
			if (reason === 'session') {
				session?.expire({});
				return;
			}
			if (reason === 'required') {
				tried = 'send';
				return;
			}
			if (reason === 'changed' || reason === 'gone')
				void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.articles() });
			failure = doctorArticlesFailureText(reason, act, options.locale());
		}
	}));

	let asking = $state(false);
	let deleting = $state(false);
	let deleteFailure = $state<string | null>(null);
	const removal = createMutation<boolean, unknown, string>(() => ({
		networkMode: 'always' as const,
		mutationFn: (articleId) => deleteDoctorArticle(articleId),
		onSettled: () => {
			deleting = false;
		},
		onSuccess: () => {
			void client.invalidateQueries({ queryKey: doctorDashboardQueryKeys.articles() });
			asking = false;
			toasts?.show({ message: m.doctor_my_article_deleted({}, messages()) });
			options.onDone();
		},
		onError: (error: unknown) => {
			const reason = readDoctorArticlesFailure(error);
			if (reason === 'session') {
				session?.expire({});
				return;
			}
			deleteFailure = doctorArticlesFailureText(reason, 'delete', options.locale());
		}
	}));

	return {
		get view() {
			return view;
		},
		/** The article as the server keeps it, `null` for a new one. */
		get article() {
			return article;
		},
		get values() {
			return values;
		},
		/** The form is filled (a new one at once; one of the doctor's once its answer came). */
		get seeded() {
			return seeded;
		},
		get note() {
			return doctorArticleNote(article, options.locale());
		},
		get canDraft() {
			return doctorArticleCanDraft(article);
		},
		get errors() {
			return errors;
		},
		get writing() {
			return writing;
		},
		get failure() {
			return failure;
		},
		/** The cover the page draws: a new file's preview, none, or the server's. */
		get cover() {
			if (coverFile === null) return null;
			if (coverFile !== undefined) return coverPreview;
			return article?.cover ?? null;
		},
		get coverError() {
			return coverError;
		},
		get preview() {
			return preview;
		},
		get asking() {
			return asking;
		},
		get deleting() {
			return deleting;
		},
		get deleteFailure() {
			return deleteFailure;
		},
		imageUrl(imageId: string): string | null {
			return uploads[imageId.toLowerCase()] ?? null;
		},
		setKind(kind: DoctorArticleKind) {
			values.kind = kind;
		},
		setTitle(title: string) {
			values.title = title;
		},
		setDescription(description: string) {
			values.description = description;
		},
		setContent(content: ArticleTextDoc) {
			values.content = content;
		},
		/** 🔴 D-W52-100 / U-65.6: a cover checked before a byte leaves — its type, 10 MB, 800 × 600. */
		async pickCover(file: File) {
			coverError = null;
			const issue = await checkImageFile(file, {
				types: DOCTOR_ARTICLE_IMAGE_TYPES,
				maxBytes: DOCTOR_ARTICLE_IMAGE_MAX_BYTES,
				minWidth: DOCTOR_ARTICLE_COVER_LEAST_ACROSS,
				minHeight: DOCTOR_ARTICLE_COVER_LEAST_DOWN
			});
			if (issue) {
				coverError =
					issue === 'type'
						? m.doctor_photos_error_type({}, messages())
						: issue === 'size'
							? m.doctor_photos_error_large({}, messages())
							: m.doctor_photos_error_small({}, messages());
				return;
			}
			const data = await readAsDataUri(file);
			if (coverPreview) URL.revokeObjectURL(coverPreview);
			coverPreview = typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : data;
			coverFile = data;
		},
		removeCover() {
			coverError = null;
			if (coverPreview) URL.revokeObjectURL(coverPreview);
			coverPreview = null;
			coverFile = null;
		},
		/** 🔴 D-W52-100: one image of the text — its upload's id (kept with its address), or the words of a refusal. */
		async upload(file: string): Promise<{ id: string } | { failure: string }> {
			try {
				const image = await uploadDoctorArticleImage(file);
				if (!image) return { failure: m.article_editor_image_failed({}, messages()) };
				uploads[image.id] = image.url;
				return { id: image.id };
			} catch (error) {
				const reason = readDoctorArticlesFailure(error);
				if (reason === 'session') session?.expire({});
				// An image of the text is refused below 200 × 200 (the cover's 800 × 600 is not its words).
				if (reason === 'cover-small')
					return { failure: m.article_editor_image_small({}, messages()) };
				if (reason === 'session' || reason === 'invalid' || reason === 'unknown')
					return { failure: m.article_editor_image_failed({}, messages()) };
				return { failure: doctorArticlesFailureText(reason, 'image', options.locale()) };
			}
		},
		/** «Αποθήκευση πρόχειρου» / «Αποστολή για έλεγχο»: the page's messages first, then ONE call. */
		submit(act: 'save' | 'send') {
			if (writing) return;
			tried = act;
			failure = null;
			if (Object.keys(doctorArticleErrors(values, act, options.locale())).length > 0) return;
			writing = true;
			write.mutate({ act, wasPublished: article?.status === 'PUBLISHED' });
		},
		openPreview() {
			preview = true;
		},
		closePreview() {
			preview = false;
		},
		ask() {
			if (deleting) return;
			deleteFailure = null;
			asking = true;
		},
		dismiss() {
			if (deleting) return;
			asking = false;
			deleteFailure = null;
		},
		remove() {
			const articleId = options.articleId();
			if (deleting || articleId === null) return;
			deleting = true;
			deleteFailure = null;
			removal.mutate(articleId);
		},
		retry() {
			void read.refetch();
		}
	};
}

export type DoctorArticleRead = ReturnType<typeof useDoctorArticle>;
