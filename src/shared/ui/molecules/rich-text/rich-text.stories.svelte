<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import type { RichTextDoc } from '$shared/lib/rich-text';
	import { RichText } from '$shared/ui/molecules/rich-text';

	// The three shapes the backend sends (tiptap, slate, the seed's plain `{ type, text }`), in Greek.
	const tiptap: RichTextDoc = {
		type: 'doc',
		content: [
			{ type: 'heading', attrs: { level: 2, anchor: 'eisagogi' }, text: 'Εισαγωγή' },
			{
				type: 'paragraph',
				content: [
					{ type: 'text', text: 'Ένα κείμενο με ' },
					{ type: 'text', text: 'έντονα', marks: [{ type: 'bold' }] },
					{ type: 'text', text: ', ' },
					{ type: 'text', text: 'πλάγια', marks: [{ type: 'italic' }] },
					{ type: 'text', text: ' και έναν ' },
					{
						type: 'text',
						text: 'εξωτερικό σύνδεσμο',
						marks: [{ type: 'link', attrs: { href: 'https://example.org' } }]
					},
					{ type: 'text', text: '.' }
				]
			},
			{ type: 'heading', attrs: { level: 3 }, text: 'Μια υποενότητα' },
			{
				type: 'bulletList',
				content: [
					{ type: 'listItem', content: [{ type: 'paragraph', text: 'Πρώτο σημείο' }] },
					{ type: 'listItem', content: [{ type: 'paragraph', text: 'Δεύτερο σημείο' }] }
				]
			},
			{ type: 'heading', attrs: { level: 2 }, text: 'Επικοινωνία' },
			{
				type: 'paragraph',
				content: [
					{ type: 'text', text: 'Γράψτε μας στο ' },
					{
						type: 'text',
						text: 'info@example.org',
						marks: [{ type: 'link', attrs: { href: 'mailto:info@example.org' } }]
					},
					{ type: 'text', text: '. Ένας μη ασφαλής σύνδεσμος μένει ' },
					{
						type: 'text',
						text: 'απλό κείμενο',
						marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }]
					},
					{ type: 'text', text: '.' }
				]
			}
		]
	};

	const slate: RichTextDoc = {
		blocks: [
			{
				type: 'paragraph',
				children: [
					{ text: 'Μια παράγραφος σε άλλη διάλεκτο, με ' },
					{ text: 'έντονη λέξη', bold: true },
					{ text: '.' }
				]
			},
			{
				type: 'numbered-list',
				children: [
					{ type: 'list-item', children: [{ text: 'Βήμα ένα' }] },
					{ type: 'list-item', children: [{ text: 'Βήμα δύο' }] }
				]
			}
		]
	};

	const plain: RichTextDoc = {
		type: 'doc',
		content: [
			{ type: 'heading', text: 'Επικεφαλίδα χωρίς επίπεδο' },
			{ type: 'paragraph', text: 'Κάθε γραμμή του κειμένου είναι μία παράγραφος.' },
			{ type: 'paragraph', text: 'Και αυτή η δεύτερη.' }
		]
	};

	const { Story } = defineMeta({
		title: 'Molecules/RichText',
		component: RichText,
		tags: ['autodocs'],
		args: { document: tiptap }
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="w-full max-w-content"><RichText {...args} /></div>
	{/snippet}
</Story>

<Story name="Headings, lists and links">
	{#snippet template()}
		<div class="w-full max-w-content"><RichText document={tiptap} /></div>
	{/snippet}
</Story>

<Story name="Slate dialect">
	{#snippet template()}
		<div class="w-full max-w-content"><RichText document={slate} /></div>
	{/snippet}
</Story>

<Story name="Plain lines">
	{#snippet template()}
		<div class="w-full max-w-content"><RichText document={plain} /></div>
	{/snippet}
</Story>
