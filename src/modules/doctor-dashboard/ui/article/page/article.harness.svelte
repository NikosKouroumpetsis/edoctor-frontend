<script lang="ts">
	import { untrack } from 'svelte';
	import type { Editor } from '@tiptap/core';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setSession, type Session } from '$shared/state/session';
	import { setToasts, ToastState } from '$shared/ui/molecules/toast';
	import DoctorArticle from './index.svelte';

	let {
		client,
		session,
		toasts = new ToastState(),
		locale = 'el',
		articleId = null,
		onEditorReady
	}: {
		client: QueryClient;
		session?: Session;
		toasts?: ToastState;
		locale?: 'el' | 'en';
		articleId?: string | null;
		onEditorReady?: (editor: Editor) => void;
	} = $props();

	untrack(() => {
		if (session) setSession(session);
		setToasts(toasts);
	});
</script>

<!-- Tests only: one article's page under the page tree's query client, the layout's session and its toast. -->
<QueryClientProvider {client}>
	<DoctorArticle {locale} {articleId} {onEditorReady} />
</QueryClientProvider>
