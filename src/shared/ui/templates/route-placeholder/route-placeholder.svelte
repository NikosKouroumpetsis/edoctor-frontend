<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ArrowLeftIcon from '~icons/lucide/arrow-left';
	import PanelsTopLeftIcon from '~icons/lucide/panels-top-left';
	import { Button } from '$shared/ui/primitives/button';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { m } from '$paraglide/messages.js';
	import { localizeHref } from '$paraglide/runtime';

	let {
		eyebrow,
		title,
		body
	}: {
		eyebrow: string;
		title: string;
		body: string;
	} = $props();

	const currentLocale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale: currentLocale });

	const localizedHref = (path: string) =>
		resolve(localizeHref(path, { locale: currentLocale }) as Pathname);
</script>

<svelte:head>
	<title>{title} | eDoctor</title>
	<meta name="description" content={body} />
</svelte:head>

<main class="bg-background">
	<section
		class="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-7xl place-items-center px-4 py-12 sm:px-6 lg:px-8"
	>
		<div class="w-full max-w-2xl rounded-md border border-border bg-card p-card shadow-raised">
			<div class="flex items-start gap-4">
				<div
					class="grid size-11 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground"
				>
					<PanelsTopLeftIcon class="size-5" />
				</div>
				<div>
					<p class="text-body-sm font-semibold text-primary">{eyebrow}</p>
					<h1 class="mt-2 text-heading-xl text-balance">{title}</h1>
					<p class="mt-3 text-body-lg text-muted-foreground">{body}</p>
				</div>
			</div>

			<div class="mt-6">
				<Button href={localizedHref('/')} variant="outline">
					<ArrowLeftIcon class="size-4" />
					{m.back_home({}, messageOptions)}
				</Button>
			</div>
		</div>
	</section>
</main>
