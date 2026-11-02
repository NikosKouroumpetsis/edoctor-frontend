<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { StatusArt, StatusPage } from '$shared/ui/organisms/status-page';

	const links = [
		{ label: 'Αρχική', href: '#home' },
		{ label: 'Αναζήτηση', href: '#search' },
		{ label: 'Άρθρα', href: '#articles' },
		{ label: 'Βοήθεια', href: '#help' }
	];

	const { Story } = defineMeta({
		title: 'Organisms/StatusPage',
		component: StatusPage,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' }
	});
</script>

<Story name="Not found">
	{#snippet template()}
		<StatusPage
			oops="Ωχ!"
			glyph="compass-outline"
			title="Δεν βρίσκουμε τη σελίδα που ψάχνετε."
			text="Ο σύνδεσμος μπορεί να είναι παλιός ή λανθασμένος."
			codeLabel="Κωδικός σφάλματος: 404"
			linksTitle="Ίσως σας βοηθήσουν:"
			{links}
			phoneActions={[
				{ label: 'Αναζήτηση', href: '#search' },
				{ label: 'Βοήθεια', href: '#help' }
			]}
			art="pin"
			status={404}
		/>
	{/snippet}
</Story>

<Story name="A profile that is not there">
	{#snippet template()}
		<StatusPage
			oops="Ωχ!"
			glyph="medical-outline"
			title="Το προφίλ δεν βρέθηκε"
			text="Μπορεί το προφίλ να μην είναι πια διαθέσιμο."
			codeLabel="Κωδικός σφάλματος: 404"
			actions={[{ label: 'Αναζήτηση', href: '#search' }]}
			phoneActions={[
				{ label: 'Αναζήτηση', href: '#search' },
				{ label: 'Βοήθεια', href: '#help' }
			]}
			linksTitle="Ίσως σας βοηθήσουν:"
			links={links.filter((link) => link.href !== '#search')}
			art="card"
			status={404}
		/>
	{/snippet}
</Story>

<Story name="Error with a retry">
	{#snippet template()}
		<StatusPage
			oops="Ωχ!"
			glyph="alert-circle"
			title="Κάτι πήγε στραβά"
			text="Δεν φταίτε εσείς. Δοκιμάστε ξανά σε λίγο."
			codeLabel="Κωδικός σφάλματος: 500"
			actions={[
				{ label: 'Δοκιμάστε ξανά', onPress: () => {} },
				{ label: 'Αρχική', href: '#home' }
			]}
			phoneActions={[
				{ label: 'Δοκιμάστε ξανά', onPress: () => {} },
				{ label: 'Αρχική', href: '#home' }
			]}
			art="plug"
			status={500}
		/>
	{/snippet}
</Story>

<Story name="Phone" globals={{ viewport: { value: 'z375' } }}>
	{#snippet template()}
		<StatusPage
			oops="Ωχ!"
			glyph="compass-outline"
			title="Δεν βρίσκουμε τη σελίδα που ψάχνετε."
			text="Ο σύνδεσμος μπορεί να είναι παλιός ή λανθασμένος."
			codeLabel="Κωδικός σφάλματος: 404"
			linksTitle="Ίσως σας βοηθήσουν:"
			{links}
			phoneActions={[
				{ label: 'Αναζήτηση', href: '#search' },
				{ label: 'Βοήθεια', href: '#help' }
			]}
			art="pin"
		/>
	{/snippet}
</Story>

<Story name="The three pictures">
	{#snippet template()}
		<div class="grid grid-cols-3 gap-section p-section">
			<StatusArt name="pin" />
			<StatusArt name="card" />
			<StatusArt name="plug" />
		</div>
	{/snippet}
</Story>
