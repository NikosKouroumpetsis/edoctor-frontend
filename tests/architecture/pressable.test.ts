import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { Chip } from '$shared/ui/primitives/chip';
import { Button, buttonVariants, type ButtonTone } from '$shared/ui/primitives/button';
import { SelectableCard } from '$shared/ui/molecules/selectable-cards';
import { SegmentedControl } from '$shared/ui/molecules/segmented-control';
import { projectRoot, readSourceFiles, stripComments } from './source-scan';

/**
 * 🔴 U-28.4 (the owner, 29/10: «γιατί δεν φαίνονται οι επιλογές clickable σαν buttons… πρέπει να διορθωθούν στα
 * components»). Tailwind 4 draws a button with the browser's default cursor; Airbnb (measured 29/10) shows the hand
 * on everything that presses and `not-allowed` on what is disabled, and darkens or fills what the pointer is over.
 *
 * - the rule: `src/routes/layout.css` `@layer base` gives `cursor: pointer` to buttons and the pressable roles (not
 *   while disabled) and `cursor: not-allowed` to `:disabled` / `[aria-disabled=true]` — in `base`, under every
 *   utility, so a cursor of the kit wins;
 * - the kit: a sample of its pressable components (chip, selectable card, segmented control, button) carries a hover
 *   class behind `can-hover:` (a pointer that hovers), and the chosen look carries none;
 * - (γ) no element of `src/` takes a press without being a control: a `div` / `span` / `li` with a click or key
 *   handler has a role, or is a backdrop hidden from assistive tech (its keyboard way is Escape), or is listed. A handler
 *   is one however it is written: `onclick={go}` or the shorthand `{onclick}`.
 */

const layoutCss = () => readFileSync(join(projectRoot, 'src/routes/layout.css'), 'utf8');

/** The text of the `@layer base { … }` block (its braces balanced), comments out. */
function baseLayer(css: string): string {
	const start = css.indexOf('@layer base');
	expect(start).toBeGreaterThan(-1);
	const open = css.indexOf('{', start);
	let depth = 0;
	for (let index = open; index < css.length; index++) {
		if (css[index] === '{') depth++;
		if (css[index] === '}') depth--;
		if (depth === 0) return css.slice(open + 1, index).replace(/\/\*[\s\S]*?\*\//g, '');
	}
	throw new Error('unbalanced @layer base');
}

/** The selector list of the rule in `block` that declares `declaration`, whitespace folded. */
function selectorsOf(block: string, declaration: string): string {
	const at = block.indexOf(declaration);
	expect(at, declaration).toBeGreaterThan(-1);
	const open = block.lastIndexOf('{', at);
	const previous = Math.max(block.lastIndexOf('}', open), block.lastIndexOf(';', open));
	return block
		.slice(previous + 1, open)
		.replace(/\s+/g, ' ')
		.replace(/\(\s/g, '(')
		.replace(/\s\)/g, ')')
		.trim();
}

type ListedPress = { path: string; marker: string };

/** What takes a pointer without being a target of its own, each with its keyboard way: one tag, by its marker. */
const LISTED_PRESSES: ListedPress[] = [
	// The slider's track: a press moves the nearest thumb; the thumbs are the `slider`s the keyboard moves.
	{ path: 'src/shared/ui/primitives/slider/slider.svelte', marker: 'data-slot="slider-track"' },
	// A finger resting on a message (`w2-w5` §Φ2): its one action has a real button beside the message (`more`) and the
	// conversation's ⋯ menu for the keyboard (`messages/ui/inbox/page/index.test.ts`, «a report with the keyboard alone»).
	{
		path: 'src/shared/ui/molecules/message-bubble/message-bubble.svelte',
		marker: 'data-slot="message-bubble"'
	},
	// Its `mousedown` only keeps a double press from selecting the words; the press is the control's it labels.
	{ path: 'src/shared/ui/primitives/label/label.svelte', marker: 'data-slot="label"' },
	// The bar a sheet is dragged down by, to close: the same closing is the bar's × and Escape.
	{
		path: 'src/shared/ui/templates/action-dialog/action-dialog.svelte',
		marker: 'data-slot="action-dialog-bar"'
	},
	{
		path: 'src/shared/ui/templates/info-dialog/info-dialog.svelte',
		marker: 'data-slot="info-dialog-bar"'
	}
];

/** A press or a key on an element, in either form Svelte takes. */
const PRESS_HANDLER =
	/\s(?:(?:onclick|onmousedown|onpointerdown|onpointerup|onkeydown|onkeyup)\s*=|\{(?:onclick|onmousedown|onpointerdown|onpointerup|onkeydown|onkeyup)\})/;

const ROLES = [
	'button',
	'radio',
	'checkbox',
	'switch',
	'tab',
	'option',
	'menuitem',
	'menuitemradio',
	'menuitemcheckbox'
];

describe('U-28.4: what presses looks pressable', () => {
	it('U-28.4: `@layer base` gives the hand to buttons, the pressable roles, `summary`, `select` and a label of a pressable control — never while disabled', () => {
		const pointer = selectorsOf(baseLayer(layoutCss()), 'cursor: pointer');
		expect(pointer).toContain('button:not(:disabled)');
		for (const role of ROLES) expect(pointer).toContain(`[role='${role}']`);
		expect(pointer).toContain(":not(:disabled, [aria-disabled='true'])");
		expect(pointer).toMatch(/(^|, )summary(,|$)/);
		expect(pointer).toContain('select:not(:disabled)');
		// A label that holds a checkbox, radio or file input (or a pressable control) or sits beside one (`for`).
		expect(pointer).toContain(
			"label:has(:is(input:is([type='checkbox'], [type='radio'], [type='file'])"
		);
		expect(pointer).toContain('+ label[for]');
		expect(pointer).toContain('label[for]:has(+ :is(button');
	});

	it('U-28.4: `@layer base` gives `not-allowed` to `:disabled` and `[aria-disabled=true]` (Airbnb’s)', () => {
		const notAllowed = selectorsOf(baseLayer(layoutCss()), 'cursor: not-allowed');
		expect(notAllowed.split(/,\s*/).sort()).toEqual([':disabled', "[aria-disabled='true']"]);
	});

	it('U-28.4 (negative): the cursors live in `base` alone — under every utility, so the kit’s `cursor-grab` wins; no unlayered cursor rule in `layout.css`', () => {
		const css = layoutCss().replace(/\/\*[\s\S]*?\*\//g, '');
		const base = baseLayer(layoutCss());
		const outside = css.replace(base, '');
		expect(outside).not.toMatch(/cursor:\s*(pointer|not-allowed)/);
		expect(css).toMatch(/@import 'tailwindcss'/);
	});

	it('U-28.4: a sample of the kit takes a hover behind `can-hover:` — the outline chip and the card not chosen darken their border, the segment not chosen takes the light fill; the chosen ones none', () => {
		const hovers = (node: Element) =>
			[...node.classList].filter(
				(name) => name.startsWith('can-hover:') && name.includes('hover:')
			);

		render(Chip, { props: { label: 'Κάρτα', variant: 'outline' } });
		const idleChip = screen.getByRole('button', { name: 'Κάρτα' });
		const idlePill = idleChip.querySelector('[data-slot="chip-pill"]') as HTMLElement;
		expect(hovers(idlePill)).toEqual(['can-hover:group-enabled:group-hover:border-foreground']);
		expect(idleChip).toHaveClass('group');
		render(Chip, { props: { label: 'Μετρητά', variant: 'outline', selected: true } });
		const chosenPill = screen
			.getByRole('button', { name: 'Μετρητά' })
			.querySelector('[data-slot="chip-pill"]') as HTMLElement;
		expect(hovers(chosenPill)).toEqual([]);

		render(SelectableCard, { props: { title: 'Βαθμολογία', selected: false } });
		expect(hovers(screen.getByRole('radio', { name: /Βαθμολογία/ }))).toEqual([
			'can-hover:enabled:hover:border-foreground'
		]);
		render(SelectableCard, { props: { title: 'Προτεινόμενα', selected: true } });
		expect(hovers(screen.getByRole('radio', { name: /Προτεινόμενα/ }))).toEqual([]);

		render(SegmentedControl, {
			props: {
				segments: [
					{ value: 'all', label: 'Όλα' },
					{ value: 'male', label: 'Άνδρας' }
				],
				value: 'all',
				'aria-label': 'Φύλο'
			}
		});
		expect(hovers(screen.getByRole('radio', { name: 'Άνδρας' }))).toEqual([
			'can-hover:enabled:hover:bg-foreground/5'
		]);
		expect(hovers(screen.getByRole('radio', { name: 'Όλα' }))).toEqual([]);
	});

	it('U-28.4: every tone of the kit’s `Button` changes its fill on hover with a pointer, never while disabled — and a disabled button no longer lets the pointer through (so the base rule’s `not-allowed` shows)', () => {
		const tones: ButtonTone[] = [
			'primary',
			'secondary',
			'accent',
			'contrast',
			'ghost',
			'muted',
			'outline'
		];
		for (const tone of tones) {
			const classes = buttonVariants({ tone }).split(/\s+/);
			const hover = classes.filter((name) => name.startsWith('can-hover:'));
			expect(hover, tone).toHaveLength(1);
			expect(hover[0], tone).toMatch(/^can-hover:not-disabled:hover:bg-/);
			expect(classes, tone).toEqual(
				expect.arrayContaining(['transition-colors', 'duration-standard', 'ease-standard'])
			);
		}
		render(Button, { props: { label: 'Εμφάνιση', disabled: true } });
		const disabled = screen.getByRole('button', { name: 'Εμφάνιση' });
		expect(disabled).toBeDisabled();
		expect(disabled).not.toHaveClass('disabled:pointer-events-none');
		// A blocked LINK still takes no pointer (it has no `disabled` to refuse a press).
		expect(buttonVariants({})).toContain('aria-disabled:pointer-events-none');
	});

	it('U-28.4 (γ): nothing of `src/` takes a press or a key without being a control — a `div` / `span` / `li` with a handler has a role, or is an `aria-hidden` backdrop, or is listed', () => {
		const tag = /<(div|span|li|p|section|article|img|td|tr|ul|label)\b((?:[^>{]|\{[^}]*\})*)>/g;
		const used = new Set<ListedPress>();
		const found: string[] = [];
		let scanned = 0;
		for (const file of readSourceFiles()) {
			if (!file.path.endsWith('.svelte') || file.path.includes('.stories.')) continue;
			scanned++;
			for (const match of stripComments(file.text).matchAll(tag)) {
				const attributes = match[2];
				if (!PRESS_HANDLER.test(attributes)) continue;
				if (/\srole=/.test(attributes)) continue;
				if (/aria-hidden="true"/.test(attributes)) continue;
				const entry = LISTED_PRESSES.find(
					({ path, marker }) => path === file.path && attributes.includes(marker)
				);
				if (entry) {
					used.add(entry);
					continue;
				}
				found.push(`${file.path} <${match[1]}>`);
			}
		}
		expect(scanned).toBeGreaterThan(200);
		expect(found).toEqual([]);
		// N-3: an entry names one tag, so a new press in the same file shows; one that no longer matches goes.
		expect(LISTED_PRESSES.filter((entry) => !used.has(entry))).toEqual([]);
	});

	it('U-28.4 (γ, negative): the scan reads a `div` with a press and no role, and lets a role, a hidden backdrop and a `button` pass', () => {
		const tag = /<(div|span|li)\b((?:[^>{]|\{[^}]*\})*)>/g;
		const text = `<div class="a" onclick={go}></div><div role="option" onclick={go}></div>
			<div aria-hidden="true" onclick={close}></div><button onclick={go}></button><span onkeydown={(e) => e}>
			<li class="b" {onpointerdown}></li><li role="option" {onclick}></li><li {other}></li>`;
		const flagged = [...text.matchAll(tag)]
			.filter((match) => PRESS_HANDLER.test(match[2]))
			.filter((match) => !/\srole=/.test(match[2]) && !/aria-hidden="true"/.test(match[2]))
			.map((match) => match[1]);
		expect(flagged).toEqual(['div', 'span', 'li']);
	});
});
