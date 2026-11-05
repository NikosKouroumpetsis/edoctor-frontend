<script lang="ts">
	import type { Pathname, ResolvedPathname } from '$app/types';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { m } from '$paraglide/messages.js';
	import { localizeHref } from '$paraglide/runtime';
	import { useId } from '$shared/lib/headless';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { getSession } from '$shared/state/session';
	import { takePendingReturn } from '$modules/auth/lib/known-account';
	import AuthFlow, { getAuthFlow } from '$modules/auth/ui/flow';
	import type { AuthLoginPageProps } from '../types';

	let { params }: AuthLoginPageProps = $props();

	const session = getSession();
	const flow = getAuthFlow();
	const locale = $derived(getPageLocale(page.url));
	const options = $derived({ locale });
	const localized = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);
	const titleId = useId(undefined, 'auth-page-title');
	let windowHeight = $state(0);

	// Π4: a provider's return may carry the way back in the address; a failed one comes back without it (`?error=`),
	// so it waits in the tab too. Both are checked before use (`readSafeNext`, the closed `do`).
	let stored = $state<{ next: string | null; action: typeof params.action } | null>(null);
	const next = $derived(params.next ?? stored?.next ?? null);
	const action = $derived(params.action ?? stored?.action ?? null);

	onMount(() => {
		stored = takePendingReturn();
		session.hasPageFlow = true;
		flow.pageReturn = { next, action };
		if (params.via) flow.expectProviderReturn(params.via);
		if (!flow.isAfterSignIn) flow.open();
		const failed = params.error;
		if (failed === 'google') flow.showError(m.auth_prompt_errors_google_failed({}, options));
		if (failed === 'apple') flow.showError(m.auth_prompt_errors_apple_failed({}, options));
		return () => {
			// A guest leaving this page, however, has left the sign-in; a provider's redirect leaves the document, not this.
			if (!session.isMember) session.cancelSignIn();
			session.hasPageFlow = false;
			flow.pageReturn = null;
			flow.reset();
		};
	});

	/** Where the page leads: the checked `next`, else the home (`use-signed-in-exit`, `use-modal-exit`). */
	function leave() {
		void goto((next ?? localized('/')) as ResolvedPathname, { replaceState: true });
	}

	// A member never stays on this page (`use-signed-in-exit`): the action goes along for the page it was asked on.
	$effect(() => {
		if (session.isMember && !flow.isAfterSignIn) {
			session.resume(action);
			session.completeSignIn();
			leave();
		}
	});

	function afterSignIn() {
		flow.reset();
		session.resume(action);
		session.completeSignIn();
		leave();
	}
</script>

<!-- No surface holds the page's Escape: it closes a small surface of the step, and nothing else. -->
<svelte:window
	onkeydown={(event) => {
		if (event.key === 'Escape' && flow.sub) flow.sub = null;
	}}
/>

<svelte:head>
	<title>{m.auth_login_page_title({}, options)}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<!-- Ε2 (U-80.1): from 744 the same card of 480 in the middle of the band under the bar, nothing else; below 744 the
     application's sheet over nothing (the capsule and the footer give it the whole screen, `frame.ts`). -->
<main
	data-testid="auth-login-page"
	class="flex min-h-page items-center justify-center bg-background tablet:px-6 tablet:py-section"
>
	<div aria-hidden="true" class="fixed inset-0 z-40 bg-overlay tablet:hidden"></div>
	<section
		aria-labelledby={titleId}
		data-testid="auth-login-card"
		style={windowHeight ? `--auth-window-h:${windowHeight}px` : undefined}
		class="fixed inset-x-0 top-3 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-xl bg-card tablet:static tablet:h-auth-window tablet:max-h-window tablet:w-full tablet:max-w-text tablet:rounded-panel tablet:shadow-overlay tablet:transition-[height] tablet:duration-standard tablet:ease-standard"
	>
		<AuthFlow
			{flow}
			{locale}
			{titleId}
			privacyHref={localized('/legal/privacy-policy')}
			termsHref={localized('/legal/terms-of-use')}
			deletionHref={localized('/account-deletion')}
			onClose={() => {
				session.cancelSignIn();
				leave();
			}}
			onLeaveAfterSignIn={afterSignIn}
			onWindowHeight={(height) => (windowHeight = height)}
		/>
	</section>
</main>
