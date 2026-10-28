<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AppShell from '$shared/ui/organisms/app-shell';
	import { AppHeader } from '$shared/ui/organisms/app-header';
	import BottomNav from '$shared/ui/organisms/bottom-nav';
	import { sampleBottomNavItems } from '$shared/ui/organisms/bottom-nav/bottom-nav.sample';
	import SiteFooter from '$shared/ui/organisms/site-footer';
	import { Button } from '$shared/ui/primitives/button';

	const { Story } = defineMeta({
		title: 'Organisms/AppShell',
		component: AppShell,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' }
	});
</script>

<!-- Layout only: every part is the caller's (the product's frame lives in `modules/shell`). -->
<Story name="Default">
	{#snippet template()}
		<AppShell skipLinkLabel="Μετάβαση στο περιεχόμενο">
			{#snippet header()}
				<AppHeader>
					{#snippet brand()}
						<a href="#home" class="inline-flex min-h-touch min-w-touch items-center font-semibold"
							>Δείγμα</a
						>
					{/snippet}
					{#snippet actions()}
						<Button tone="outline" label="Σύνδεση" />
					{/snippet}
				</AppHeader>
			{/snippet}
			<div class="container-page py-section">
				<h1 class="text-title-lg font-semibold">Σελίδα</h1>
				<p class="mt-2 text-body-md text-muted-foreground">Το περιεχόμενο της σελίδας.</p>
			</div>
			{#snippet footer()}
				<SiteFooter
					columns={[
						{ title: 'Υποστήριξη', links: [{ label: 'Βοήθεια' }, { label: 'Επικοινωνία' }] }
					]}
				/>
			{/snippet}
			{#snippet bottomNav()}
				<BottomNav items={sampleBottomNavItems} aria-label="Πλοήγηση" />
			{/snippet}
		</AppShell>
	{/snippet}
</Story>
