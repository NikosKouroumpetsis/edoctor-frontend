<script lang="ts" module>
	export type ToolGlyphName =
		| 'bold'
		| 'italic'
		| 'underline'
		| 'strike'
		| 'highlight'
		| 'link'
		| 'bullet-list'
		| 'ordered-list'
		| 'quote'
		| 'callout'
		| 'rule'
		| 'image'
		| 'video'
		| 'table'
		| 'undo'
		| 'redo';

	type Lines = {
		paths: string[];
		circles?: { cx: string; cy: string; r: string }[];
	};

	// The prototype's 1.8 stroke in the 24 box (`sw.js:756` `sv(d, 20, 1.8)`).
	const STROKE = 1.8;

	// The four marks are letters (`sw.js:754` `tt`): B 800, I a serif italic, U underlined, S struck through.
	const LETTERS: Partial<Record<ToolGlyphName, { letter: string; look: string }>> = {
		bold: { letter: 'B', look: 'font-extrabold' },
		italic: { letter: 'I', look: 'font-serif font-normal italic' },
		underline: { letter: 'U', look: 'font-normal underline' },
		strike: { letter: 'S', look: 'font-normal line-through' }
	};

	// Every other tool: the prototype's own lines (`sw.js:679`, `:754-758`), path for path, in its 24 box — its framing
	// `<rect>`s written as the same rounded outline in a path.
	const LINES: Partial<Record<ToolGlyphName, Lines>> = {
		highlight: { paths: ['m9 15 8.5-8.5a2.1 2.1 0 0 0-3-3L6 12l-1 4 4-1Z', 'M4 20.5h16'] },
		link: {
			paths: [
				'M10 14a4 4 0 0 0 5.7 0l3.1-3.1a4 4 0 0 0-5.7-5.7L12 6.3M14 10a4 4 0 0 0-5.7 0l-3.1 3.1a4 4 0 0 0 5.7 5.7l1.1-1.1'
			]
		},
		'bullet-list': {
			paths: ['M9.5 6.5h10M9.5 12h10M9.5 17.5h10'],
			circles: [
				{ cx: '5', cy: '6.5', r: '1' },
				{ cx: '5', cy: '12', r: '1' },
				{ cx: '5', cy: '17.5', r: '1' }
			]
		},
		'ordered-list': {
			paths: [
				'M10 6.5h9.5M10 12h9.5M10 17.5h9.5M4.5 5l1-.5v4M4 15.5c.4-.6 2-.9 2 .3 0 .9-2 1.6-2 2.7h2.2'
			]
		},
		quote: { paths: ['M5 7.5h5v5c0 2.5-1.5 4-4 4.5M14 7.5h5v5c0 2.5-1.5 4-4 4.5'] },
		callout: {
			paths: [
				'M6 4.5h12a2.5 2.5 0 0 1 2.5 2.5v10a2.5 2.5 0 0 1-2.5 2.5H6a2.5 2.5 0 0 1-2.5-2.5V7A2.5 2.5 0 0 1 6 4.5Z',
				'M12 8.5v4.5M12 16v.01'
			]
		},
		rule: { paths: ['M4 12h16'] },
		image: {
			paths: [
				'M3.5 17.5 9 12l4 4 2.5-2.5 5 5',
				'M6 4.5h12a2.5 2.5 0 0 1 2.5 2.5v10a2.5 2.5 0 0 1-2.5 2.5H6a2.5 2.5 0 0 1-2.5-2.5V7A2.5 2.5 0 0 1 6 4.5Z'
			],
			circles: [{ cx: '15.5', cy: '8.5', r: '2' }]
		},
		video: {
			paths: [
				'M6.5 5.5h11a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3Z',
				'M10.5 9.5v5l4-2.5Z'
			]
		},
		table: {
			paths: [
				'M5.5 4.5h13a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z',
				'M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10M15 9.5v10'
			]
		},
		undo: { paths: ['M9 7.5 4.5 12 9 16.5', 'M5 12h9.5a5 5 0 0 1 0 10H12'] },
		redo: { paths: ['m15 7.5 4.5 4.5-4.5 4.5', 'M19 12H9.5a5 5 0 0 0 0 10H12'] }
	};
</script>

<script lang="ts">
	let { name }: { name: ToolGlyphName } = $props();

	const letter = $derived(LETTERS[name]);
	const lines = $derived(LINES[name]);
</script>

<!-- Wave 5.2 · screen 85 (`64-switch/sw.js:748-758`, `sw.css:642-645`): a tool's glyph as the prototype draws it — a
     mark as its letter at 17, every other tool its line art at 20 with the 1.8 stroke, in the text's colour. Decorative:
     the button names the tool. -->
{#if letter}
	<span
		aria-hidden="true"
		data-slot="tool-letter"
		class={['text-title-xs leading-flat text-foreground', letter.look]}>{letter.letter}</span
	>
{:else if lines}
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width={STROKE}
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
		focusable="false"
		data-slot="tool-lines"
		class="icon-md shrink-0"
	>
		{#each lines.paths as d, index (index)}
			<path {d} />
		{/each}
		{#each lines.circles ?? [] as dot, index (index)}
			<circle cx={dot.cx} cy={dot.cy} r={dot.r} />
		{/each}
	</svg>
{/if}
