import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { controls, spacingScale, steps } from '$shared/design/tokens';
import {
	projectRoot,
	readSourceFiles,
	splitVariants,
	stripComments,
	type SourceFile
} from './source-scan';

const TARGET_TAG =
	/<(button|a|input|select|textarea)(?=[\s/>])|<[\w:-]+(?=[^<>]*\srole="(button|tab|checkbox|radio|switch|option|menuitem|menuitemcheckbox|menuitemradio|slider|link)")/g;
const WIDE_ENOUGH = /^(w-full|size-full|flex-1|grow|self-stretch|col-span-\d+)$/;
const TARGET_COMPONENT =
	/<(Button|Toggle|ToggleGroupItem|Input|Textarea|Checkbox|Switch|RadioGroupItem|Slider|SelectItem|TabsTrigger|AccordionTrigger|CommandItem|CarouselPrevious|CarouselNext|DropdownMenu(Checkbox|Radio)?Item|[A-Z]\w*Trigger|[A-Z]\w*Close)(?=[\s/>])/g;

/**
 * The class recipes interactive primitives share, keyed by the name a component calls them by. Each one is
 * checked on its own (`findRecipeIssues`), so a tag that takes its classes from a recipe inherits the
 * recipe's verdict instead of being read as a tag without a height.
 */
const RECIPES: Record<string, { path: string; definition: string; sizes: string }> = {
	buttonVariants: {
		path: 'src/shared/ui/primitives/button/button.svelte',
		definition: 'buttonVariants',
		sizes: 'size'
	},
	toggleVariants: {
		path: 'src/shared/ui/primitives/toggle/toggle.svelte',
		definition: 'toggleVariants',
		sizes: 'size'
	},
	inputSizes: {
		path: 'src/shared/ui/primitives/input/input.svelte',
		definition: 'inputSizes',
		sizes: ''
	},
	fieldSizes: {
		path: 'src/shared/ui/primitives/input/input.svelte',
		definition: 'fieldSizes',
		sizes: ''
	}
};

const touch = controls.touch;

/** The px a named or stepped length resolves to, or `null` when it is relative or unknown. */
function lengthOf(value: string): number | null {
	const named = spacingScale[value];
	if (named?.endsWith('px')) return Number.parseFloat(named);
	if (/^\d+(\.\d+)?$/.test(value)) return Number(value) * steps.base;
	if (value === 'px') return 1;
	return null;
}

/** Whether a set of unprefixed utilities shrinks a box below the touch target (`min-w-0`, `size-6` …). */
function shrinks(utilities: string[]): boolean {
	return utilities.some((utility) => {
		const sized = /^(h|min-h|max-h|w|min-w|max-w|size)-(.+)$/.exec(utility);
		const length = sized ? lengthOf(sized[2]) : null;
		return length !== null && length < touch;
	});
}

/** Whether a set of unprefixed utilities gives the box a touch-sized height and width. */
function boxOf(utilities: string[]): { height: boolean; width: boolean } {
	let height = false;
	let width = false;
	for (const utility of utilities) {
		const sized = /^(h|min-h|w|min-w|size)-(.+)$/.exec(utility);
		if (sized && (lengthOf(sized[2]) ?? 0) >= touch) {
			if (sized[1] !== 'w' && sized[1] !== 'min-w') height = true;
			if (sized[1] !== 'h' && sized[1] !== 'min-h') width = true;
		}
		if (WIDE_ENOUGH.test(utility)) width = true;
	}
	return { height, width };
}

/** The identifiers a class expression names in code (`cn(base, sizes[size])`), not the words of its strings. */
const codeNamesOf = (expression: string) =>
	[...expression.replace(/'[^']*'|"[^"]*"|`[^`]*`/g, ' ').matchAll(/[A-Za-z_$][\w$]*/g)].map(
		(name) => name[0]
	);

const utilitiesOf = (text: string) =>
	text
		.split(/[\s'"`{}(),]+/)
		.map((token) => splitVariants(token))
		.filter(({ variants }) => variants.length === 0)
		.map(({ utility }) => utility);

/**
 * The text of the statement that assigns `name` in this file (`const name = …;` or `{@const name = …}`), or ''
 * when absent. Reads to the `;` or bracket that closes it, skipping quoted strings so `has-[>svg]` is inert.
 */
function definitionOf(text: string, name: string): string {
	const start = new RegExp(`\\b(const|let|var)\\s+${name}\\b[^=;]*=`).exec(text);
	if (!start) return '';
	let depth = 0;
	let quote = '';
	for (let index = start.index + start[0].length; index < text.length; index += 1) {
		const char = text[index];
		if (quote) {
			if (char === '\\') index += 1;
			else if (char === quote) quote = '';
		} else if (char === "'" || char === '"' || char === '`') {
			quote = char;
		} else if ('([{'.includes(char)) {
			depth += 1;
		} else if (')]}'.includes(char)) {
			depth -= 1;
			if (depth < 0) return text.slice(start.index, index);
		} else if (char === ';' && depth === 0) {
			return text.slice(start.index, index);
		}
	}
	return text.slice(start.index);
}

/** The value of the `class` attribute of an opening tag: a quoted string or a balanced `{…}` expression. */
function classAttributeOf(tag: string): string {
	const start = /\sclass=/.exec(tag);
	if (!start) return '';
	const from = start.index + start[0].length;
	if (tag[from] === '"') return tag.slice(from, tag.indexOf('"', from + 1) + 1);
	let depth = 0;
	for (let index = from; index < tag.length; index += 1) {
		if (tag[index] === '{') depth += 1;
		if (tag[index] === '}') depth -= 1;
		if (depth === 0) return tag.slice(from, index + 1);
	}
	return tag.slice(from);
}

/** The opening tag starting at `start`, skipping `>` inside `{…}` expressions and quotes. */
function tagAt(text: string, start: number): string {
	let depth = 0;
	let quote = '';
	for (let index = start; index < text.length; index += 1) {
		const char = text[index];
		if (quote) {
			if (char === quote) quote = '';
		} else if ((char === '"' || char === "'") && depth === 0) {
			quote = char;
		} else if (char === '{') {
			depth += 1;
		} else if (char === '}') {
			depth -= 1;
		} else if (char === '>' && depth === 0) {
			return text.slice(start, index + 1);
		}
	}
	return text.slice(start);
}

/**
 * Every recipe size that does not give a touch-sized height, and every variant recipe whose `base` does not give
 * a touch-sized width, as `recipe.size (classes)` / `recipe.base (classes)`.
 */
function findRecipeIssues(
	recipes = RECIPES,
	read = (path: string) => readFileSync(join(projectRoot, path), 'utf8')
): string[] {
	const issues: string[] = [];
	for (const [name, recipe] of Object.entries(recipes)) {
		const definition = definitionOf(stripComments(read(recipe.path)), recipe.definition);
		if (!definition) {
			issues.push(`${name}: definition not found in ${recipe.path}`);
			continue;
		}
		const base = /\bbase:\s*('[^']*'|"[^"]*")/.exec(definition)?.[1].slice(1, -1) ?? '';
		if (recipe.sizes && !boxOf(utilitiesOf(base)).width)
			issues.push(`${name}.base (${base.trim()})`);
		const block = recipe.sizes
			? (new RegExp(`\\b${recipe.sizes}:\\s*\\{([\\s\\S]*?)\\n\\t*\\}`).exec(definition)?.[1] ?? '')
			: definition.slice(definition.indexOf('{') + 1);
		const entries = [...block.matchAll(/^\s*'?([\w-]+)'?:\s*(\{[\s\S]*?\}|'[^']*'|"[^"]*")/gm)];
		if (entries.length === 0) issues.push(`${name}: no size entries found`);
		for (const [, size, classes] of entries) {
			const ownClasses = classes.startsWith('{')
				? (/input:\s*'([^']*)'/.exec(classes)?.[1] ?? '')
				: classes.slice(1, -1);
			if (!boxOf(utilitiesOf(ownClasses)).height)
				issues.push(`${name}.${size} (${ownClasses.trim()})`);
		}
	}
	return issues;
}

/**
 * Every interactive tag (`button`, `a`, `input`, `select`, `textarea`, ARIA widget roles) whose box is not at
 * least the touch target on both axes, and every use of an interactive component whose `class` shrinks it, as
 * `path:line <tag>`. The box comes from the tag's classes, same-file definitions and the shared recipes; a
 * shrinking class cancels any of them. Hidden mirrors (`type="hidden"`, `aria-hidden` + `tabindex -1`) are skipped.
 */
function findTouchIssues(files: SourceFile[]): string[] {
	const issues: string[] = [];
	for (const { path, text } of files) {
		if (!path.endsWith('.svelte')) continue;
		for (const match of text.matchAll(TARGET_TAG)) {
			const tag = tagAt(text, match.index ?? 0);
			if (/\stype="hidden"/.test(tag)) continue;
			if (/\saria-hidden="true"/.test(tag) && /\stabindex=(\{-1\}|"-1")/.test(tag)) continue;
			const classAttribute = classAttributeOf(tag);
			const names = codeNamesOf(classAttribute);
			const recipes = names.filter((name) => name in RECIPES);
			const definitions = names.map((name) => definitionOf(text, name)).join(' ');
			const own = utilitiesOf(`${classAttribute} ${definitions}`);
			const box = boxOf(own);
			const recipeWidth = recipes.some(
				(name) => name === 'buttonVariants' || name === 'toggleVariants'
			);
			const sized = (box.height || recipes.length > 0) && (box.width || recipeWidth);
			if (sized && !shrinks(own)) continue;
			const line = text.slice(0, match.index ?? 0).split('\n').length;
			issues.push(`${path}:${line} ${tag.split(/\s/)[0]}>`);
		}
		for (const match of text.matchAll(TARGET_COMPONENT)) {
			const tag = tagAt(text, match.index ?? 0);
			const classAttribute = classAttributeOf(tag);
			const definitions = codeNamesOf(classAttribute)
				.map((name) => definitionOf(text, name))
				.join(' ');
			if (!shrinks(utilitiesOf(`${classAttribute} ${definitions}`))) continue;
			const line = text.slice(0, match.index ?? 0).split('\n').length;
			issues.push(`${path}:${line} ${tag.split(/\s/)[0]}>`);
		}
	}
	return issues;
}

const fixture = (text: string): SourceFile[] => [
	{ path: 'fixture.svelte', text: stripComments(text) }
];

describe('touch target checker', () => {
	it('accepts touch-sized boxes from classes, local definitions and shared recipes', () => {
		const text = `<script>
	const linkClass = 'inline-flex min-h-touch min-w-touch items-center';
</script>
<button class="size-touch"></button>
<a href="/x" class={linkClass}>x</a>
<button class={cn(buttonVariants({ variant, size }), className)}></button>
<input class={cn(base, inputSizes[size], 'w-full')} />
<li role="option" class="min-h-touch w-full"></li>
<input type="hidden" name="x" />
<input type="checkbox" aria-hidden="true" tabindex={-1} class="sr-only" />`;
		expect(findTouchIssues(fixture(text))).toEqual([]);
	});

	it('reports a recipe whose minimum the same tag cancels, and a component shrunk by its class', () => {
		const text = `<button class={cn(toggleVariants({ size }), 'min-w-0 flex-1')}></button>
<button class={cn(buttonVariants({ size: 'icon' }), 'size-6')}></button>
<Button size="icon" class="size-6"><Icon /></Button>
<Button class="rounded-sm px-2 text-label-md">EL</Button>
<DropdownMenuTrigger class="min-h-0">x</DropdownMenuTrigger>`;
		expect(findTouchIssues(fixture(text))).toEqual([
			'fixture.svelte:1 <button>',
			'fixture.svelte:2 <button>',
			'fixture.svelte:3 <Button>',
			'fixture.svelte:5 <DropdownMenuTrigger>'
		]);
	});

	it('reports boxes below the touch target, a missing width and a size only some breakpoints get', () => {
		const text = `<button class="h-9 w-9"></button>
<a href="/x" class="min-h-touch">x</a>
<div role="option" class="px-2"></div>
<button class="tablet:size-touch"></button>
<button class="size-control-sm"></button>`;
		expect(findTouchIssues(fixture(text))).toEqual([
			'fixture.svelte:1 <button>',
			'fixture.svelte:2 <a>',
			'fixture.svelte:3 <div>',
			'fixture.svelte:4 <button>',
			'fixture.svelte:5 <button>'
		]);
	});

	it('reports a recipe size without the touch height and a recipe base without the touch width', () => {
		const files: Record<string, string> = {
			'button.svelte': `export const buttonVariants = tv({
	base: 'inline-flex items-center',
	variants: {
		size: {
			default: 'min-h-control-md px-4',
			sm: 'h-8 px-3'
		}
	}
});`
		};
		const recipes = {
			buttonVariants: { path: 'button.svelte', definition: 'buttonVariants', sizes: 'size' }
		};
		expect(findRecipeIssues(recipes, (path) => files[path])).toEqual([
			'buttonVariants.base (inline-flex items-center)',
			'buttonVariants.sm (h-8 px-3)'
		]);
	});
});

describe('touch targets of the project', () => {
	const files = readSourceFiles();

	it('reads every interactive tag', () => {
		const tags = files
			.filter((file) => file.path.endsWith('.svelte'))
			.flatMap((file) => [...file.text.matchAll(TARGET_TAG)]);
		expect(tags.length).toBeGreaterThan(80);
	});

	it('gives every shared recipe size a touch-sized height and every variant base a touch width', () => {
		expect(findRecipeIssues()).toEqual([]);
	});

	it('gives every interactive element a box of at least the touch target', () => {
		expect(findTouchIssues(files)).toEqual([]);
	});
});
