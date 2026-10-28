import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cardShellClasses } from '$shared/ui/primitives/card';
import { textVariants } from '$shared/ui/primitives/text';
import GuidanceCard from './guidance-card.svelte';

const props = {
	eyebrow: 'Πριν ξεκινήσεις',
	title: 'Οδηγίες σύνδεσης',
	body: 'Λίγα πράγματα να έχεις υπόψη σου.',
	rules: ['Κανόνας ένα', 'Κανόνας δύο', 'Κανόνας τρία']
};

/** A file of the application's `GuidanceCard` (read only, the sibling repo). */
const appFile = (name: string) =>
	readFileSync(
		resolve(process.cwd(), `../application/src/shared/ui/organisms/guidance-card/${name}`),
		'utf8'
	);
const classesOf = (value: string | undefined) => (value ?? '').split(/\s+/).filter(Boolean);
/** The row that holds a rule's words (its tinted box). */
const rowOf = (words: string) => screen.getByText(words).parentElement as HTMLElement;

describe('GuidanceCard', () => {
	it('U-14.2: draws the eyebrow, the title and the body, and one row per rule', () => {
		render(GuidanceCard, { props });
		expect(screen.getByText('Πριν ξεκινήσεις')).toBeInTheDocument();
		expect(screen.getByText('Οδηγίες σύνδεσης')).toBeInTheDocument();
		expect(screen.getByText('Λίγα πράγματα να έχεις υπόψη σου.')).toBeInTheDocument();
		for (const rule of props.rules) expect(rowOf(rule)).toHaveClass('rounded-xl', 'border');
	});

	it('U-14.2: the application’s card, class for class — read from its source (shell, columns, pill, rows, tints, roles of text)', () => {
		const app = appFile('index.tsx');
		const rootGap = /<Card className=\{cx\('([^']+)', className\)\}>/.exec(app)?.[1];
		const columns = [...app.matchAll(/<View className="(gap-\d+)">/g)].map((match) => match[1]);
		const pill = /<View className="([^"]+)">\s*<Text className="([^"]+)">\{eyebrow\}/.exec(app);
		const row =
			/'(rounded-xl border [^']+)',\s*guidanceCardToneClassNames\[index\] \?\? '([^']+)'/.exec(app);
		const tints = [
			...(/const guidanceCardToneClassNames = \[([\s\S]*?)\] as const;/
				.exec(app)?.[1]
				.matchAll(/'([^']+)'/g) ?? [])
		].map((match) => match[1]);
		// The source was read (an empty class list would make `toHaveClass()` below assert nothing).
		expect(rootGap).toBe('gap-6');
		expect(columns).toEqual(['gap-3', 'gap-3']);
		expect(tints).toHaveLength(3);
		expect(classesOf(pill?.[1])).toHaveLength(7);
		expect(classesOf(pill?.[2])).toHaveLength(2);
		expect(classesOf(row?.[1])).toHaveLength(4);
		expect(app).toContain('<Text variant="heading">{title}</Text>');
		expect(app).toContain('<Text>{body}</Text>');
		expect(app).toContain('<Text>{rule}</Text>');

		const { container } = render(GuidanceCard, {
			props: { ...props, rules: [...props.rules, 'Κανόνας τέσσερα'] }
		});
		const card = container.querySelector('[data-component="guidance-card"]') as HTMLElement;
		expect(card).toHaveAttribute('data-slot', 'card');
		expect(card).toHaveClass(...cardShellClasses.split(' '), ...classesOf(rootGap));
		const [head, list] = Array.from(card.children) as HTMLElement[];
		expect(head).toHaveClass('flex', 'flex-col', ...classesOf(columns[0]));
		expect(list).toHaveClass('flex', 'flex-col', ...classesOf(columns[1]));
		const eyebrow = screen.getByText('Πριν ξεκινήσεις');
		expect(eyebrow.parentElement).toHaveClass(...classesOf(pill?.[1]));
		expect(eyebrow).toHaveClass(...classesOf(pill?.[2]));
		// S-32.18: ONE colour of its own role on the pink tint, never the accent's foreground.
		expect(eyebrow).not.toHaveClass('text-accent-foreground');
		expect(screen.getByText('Οδηγίες σύνδεσης')).toHaveClass(...classesOf(textVariants.heading));
		expect(screen.getByText('Λίγα πράγματα να έχεις υπόψη σου.')).toHaveClass(
			...classesOf(textVariants.body)
		);
		[...props.rules, 'Κανόνας τέσσερα'].forEach((rule, index) => {
			expect(screen.getByText(rule)).toHaveClass(...classesOf(textVariants.body));
			expect(rowOf(rule)).toHaveClass(
				...classesOf(row?.[1]),
				...classesOf(tints[index] ?? row?.[2])
			);
		});
		// The fourth row falls back to the muted tint, as the application's (`?? 'border-border/70 bg-muted/70'`).
		expect(row?.[2]).toBe('border-border/70 bg-muted/70');
	});

	it('U-14.2: the application’s API and roles — the same props, words only from them, no role the application has not', () => {
		const app = appFile('index.tsx');
		const appProps = [
			...(/type GuidanceCardProps = \{([\s\S]*?)\};/.exec(app)?.[1].matchAll(/(\w+)\??:/g) ?? [])
		]
			.map((match) => (match[1] === 'className' ? 'class' : match[1]))
			.sort();
		const web = readFileSync(
			resolve(process.cwd(), 'src/shared/ui/organisms/guidance-card/guidance-card.svelte'),
			'utf8'
		);
		const webProps = [
			...(/export type GuidanceCardProps = \{([\s\S]*?)\};/.exec(web)?.[1].matchAll(/(\w+)\??:/g) ??
				[])
		]
			.map((match) => match[1])
			.sort();
		expect(appProps).toEqual(['body', 'class', 'eyebrow', 'rules', 'title']);
		expect(webProps).toEqual(appProps);
		// The application gives none of its views a role (no `accessibilityRole`): text, not a heading or a list.
		expect(app).not.toMatch(/accessibilityRole|role=/);
		const { container } = render(GuidanceCard, { props });
		expect(container.querySelectorAll('[role], h1, h2, h3, h4, h5, h6, ul, ol, li')).toHaveLength(
			0
		);
		const texts = Array.from(
			container.querySelectorAll('[data-slot="text"]'),
			(node) => node.textContent
		);
		expect(texts).toEqual([props.eyebrow, props.title, props.body, ...props.rules]);
	});

	it('U-14.2: the stories are the application’s — names, order and Greek words', () => {
		const appStories = appFile('index.stories.tsx');
		const appNames = [...appStories.matchAll(/export const (\w+): Story/g)].map((match) =>
			match[1].replace(/([a-z])([A-Z])/g, '$1 $2')
		);
		const appWords = [...appStories.matchAll(/'([^']*\p{L}[^']*)'/gu)]
			.map((match) => match[1])
			.filter((words) => /[α-ωά-ώ]/i.test(words));
		const web = readFileSync(
			resolve(process.cwd(), 'src/shared/ui/organisms/guidance-card/guidance-card.stories.svelte'),
			'utf8'
		);
		const webNames = [...web.matchAll(/<Story\s+name="([^"]+)"/g)].map((match) => match[1]);
		expect(appNames).toEqual(['Playground', 'Single Rule']);
		expect(webNames).toEqual(appNames);
		expect(appWords.length).toBeGreaterThan(4);
		for (const words of appWords) expect(web, words).toContain(`'${words}'`);
		expect(web).toContain("title: 'Organisms/GuidanceCard'");
	});
});
