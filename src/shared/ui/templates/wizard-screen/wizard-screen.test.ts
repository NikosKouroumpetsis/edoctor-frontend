import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './wizard-screen.harness.svelte';

const slot = (name: string) => document.querySelector(`[data-slot="${name}"]`) as HTMLElement;
/** The classes of a node that only apply from a zone up (`tablet:`, `split:` …): below 744 none of them counts. */
const phoneClasses = (node: Element) =>
	[...node.classList].filter((name) => !/^(tablet|split|laptop|desktop|wide):/u.test(name));

describe('WizardScreen (the steps’ frame, record §6.3)', () => {
	it('W8-Δ3: the page and its pinned bar on the card’s surface (the prototype’s `--page`: white, the dark theme’s own) — never the site’s grey background', () => {
		render(Harness);
		const root = slot('wizard-screen');
		expect(root).toHaveClass('bg-card', 'min-h-dvh');
		expect(root).not.toHaveClass('bg-background');
		expect(slot('wizard-screen-bar')).toHaveClass('bg-card');
		expect(slot('wizard-screen-bar')).not.toHaveClass('bg-background');
	});

	it('U-81.2: below 744 the application’s frame — the 64 bar with the pills at its end and no mark, the column in the zone’s gutter, the bar pinned to the bottom', () => {
		render(Harness);
		const header = slot('wizard-screen-header');
		expect(phoneClasses(header)).toEqual(
			expect.arrayContaining(['flex', 'h-bar-top', 'justify-end', 'gap-2', 'px-gutter-sm'])
		);
		expect(slot('wizard-screen-brand')).toHaveClass('hidden', 'tablet:flex', 'mr-auto');
		const main = screen.getByRole('main');
		expect(phoneClasses(main)).toEqual(
			expect.arrayContaining(['flex-1', 'px-gutter-sm', 'pt-2', 'pb-page-bar'])
		);
		expect(phoneClasses(main)).not.toContain('justify-center');
		expect(slot('wizard-screen-column')).toHaveClass('mx-auto', 'w-full', 'max-w-wizard-column');
		expect(slot('wizard-screen-bar')).toHaveClass('fixed', 'inset-x-0', 'bottom-0', 'bg-card');
		// None of the site's frame: no navigation of its own (the frame draws none here either, P-W3 §3.1).
		expect(screen.queryAllByRole('navigation')).toEqual([]);
	});

	it('record §6.3: from 744 — the 80 bar with the mark, 48 a side, and the content in the middle of the screen’s height (unless told otherwise)', () => {
		const centred = render(Harness);
		expect(slot('wizard-screen-header')).toHaveClass(
			'tablet:h-wizard-top',
			'tablet:gap-3',
			'tablet:px-gutter-lg'
		);
		expect(screen.getByRole('main')).toHaveClass(
			'tablet:justify-center',
			'tablet:px-gutter-lg',
			'tablet:pt-4'
		);
		centred.unmount();
		render(Harness, { props: { centered: false } });
		expect(screen.getByRole('main')).not.toHaveClass('tablet:justify-center');
	});

	it('record §6.3: one h1, 28/600 (30 from 744), its muted line 16 (17 from 744), then the step', () => {
		render(Harness);
		const headings = screen.getAllByRole('heading', { level: 1 });
		expect(headings).toHaveLength(1);
		expect(headings[0]).toHaveTextContent('Τα στοιχεία σας');
		expect(headings[0]).toHaveClass('text-heading-lg', 'font-semibold', 'tablet:text-heading-xl');
		expect(screen.getByText('Όπως αναγράφονται στην ταυτότητά σας.')).toHaveClass(
			'text-body-lg',
			'text-muted-foreground',
			'tablet:text-title-xs'
		);
		expect(screen.getByText('Περιεχόμενο βήματος').parentElement).toBe(
			slot('wizard-screen-column')
		);
	});

	it('record §6.3: the pills — 36 (40 from 744) inside a 48 target, named by their long words at every width; the short words only below 744', async () => {
		const user = userEvent.setup({ delay: null });
		const onExit = vi.fn();
		render(Harness, { props: { onExit } });
		const help = screen.getByRole('link', { name: 'Χρειάζεστε βοήθεια;' });
		expect(help).toHaveAttribute('href', '/help');
		expect(help).toHaveClass('min-h-touch', 'min-w-touch', 'rounded-full');
		const face = help.querySelector('[data-slot="wizard-screen-pill-face"]') as HTMLElement;
		expect(face).toHaveClass(
			'h-wizard-pill',
			'tablet:h-control-sm',
			'border',
			'border-border',
			'rounded-full',
			'text-label-lg',
			'tablet:text-body-sm'
		);
		expect(within(help).getByText('Βοήθεια')).toHaveClass('tablet:hidden');
		expect(within(help).getByText('Χρειάζεστε βοήθεια;')).toHaveClass('hidden', 'tablet:inline');
		expect(help.querySelector('[data-icon="help-circle-outline"]')).not.toBeNull();
		const exit = screen.getByRole('button', { name: 'Αποθήκευση και έξοδος' });
		await user.click(exit);
		expect(onExit).toHaveBeenCalledOnce();
		// The order of reading: the mark, then the pills as given.
		const header = slot('wizard-screen-header');
		expect(
			within(header)
				.getAllByRole('link')
				.map((link) => link.getAttribute('aria-label') ?? link.textContent?.trim())
		).toEqual(['Σήμα', 'Χρειάζεστε βοήθεια;']);
	});

	it('review w3-w6 R1 NIT-1: a locked pill is a disabled button at half strength — a press does nothing; a link stays a link', async () => {
		const user = userEvent.setup({ delay: null });
		const onClick = vi.fn();
		render(Harness, {
			props: {
				pills: [
					{ key: 'help', label: 'Χρειάζεστε βοήθεια;', href: '/help', disabled: true },
					{ key: 'exit', label: 'Αποθήκευση και έξοδος', onClick, disabled: true }
				]
			}
		});
		const exit = screen.getByRole('button', { name: 'Αποθήκευση και έξοδος' });
		expect(exit).toBeDisabled();
		expect(exit).toHaveClass('disabled:opacity-50');
		await user.click(exit);
		expect(onClick).not.toHaveBeenCalled();
		expect(screen.getByRole('link', { name: 'Χρειάζεστε βοήθεια;' })).not.toHaveAttribute(
			'disabled'
		);
	});

	it('`doctor.css` below 360 (review w3-w1 MINOR-2): a pill with a glyph keeps only the glyph, every pill 12 a side; its name stays', () => {
		render(Harness, {
			props: {
				pills: [
					{
						key: 'help',
						label: 'Χρειάζεστε βοήθεια;',
						shortLabel: 'Βοήθεια',
						icon: 'help-circle-outline'
					},
					{ key: 'words', label: 'Μόνο λέξεις', shortLabel: 'Λέξεις' }
				]
			}
		});
		const help = screen.getByRole('button', { name: 'Χρειάζεστε βοήθεια;' });
		const words = screen.getByRole('button', { name: 'Μόνο λέξεις' });
		const short = (pill: HTMLElement, text: string) =>
			[...pill.querySelectorAll('span')].find((node) => node.textContent === text);
		expect(short(help, 'Βοήθεια')).toHaveClass('tablet:hidden', 'narrow-phone:hidden');
		expect(short(words, 'Λέξεις')).toHaveClass('tablet:hidden');
		expect(short(words, 'Λέξεις')).not.toHaveClass('narrow-phone:hidden');
		for (const pill of [help, words]) {
			expect(pill.querySelector('[data-slot="wizard-screen-pill-face"]')).toHaveClass(
				'px-3.5',
				'narrow-phone:px-3'
			);
		}
	});

	it('U-100 / D-W3-27: nothing of the frame takes a colour under the pointer — the pills, «Πίσω» and «Επόμενο»; and no modal anywhere (U-102)', () => {
		render(Harness);
		const parts = [
			...document.querySelectorAll('[data-slot="wizard-screen-pill"]'),
			...document.querySelectorAll('[data-slot="wizard-screen-bar"]')
		];
		expect(parts.length).toBeGreaterThan(2);
		expect(screen.getByRole('button', { name: 'Επόμενο' })).toBeInTheDocument();
		for (const part of parts) {
			for (const node of [part, ...part.querySelectorAll('*')]) {
				expect([...node.classList].filter((name) => name.includes('hover:'))).toEqual([]);
			}
		}
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('record §6.3: the bar — the 3 segments (4 high, 6 apart) with their spoken name, «Πίσω» underlined and «Επόμενο» the full round accent', async () => {
		const user = userEvent.setup({ delay: null });
		const onBack = vi.fn();
		const onNext = vi.fn();
		render(Harness, { props: { onBack, onNext } });
		const bar = slot('wizard-screen-bar');
		const progress = within(bar).getByRole('progressbar', { name: 'Στάδιο 1 από 3' });
		expect(progress).toHaveClass('gap-1.5');
		expect(progress.querySelectorAll('[data-slot="step-progress-segment"]')).toHaveLength(3);
		for (const segment of progress.querySelectorAll('[data-slot="step-progress-segment"]')) {
			expect(segment).toHaveClass('h-1');
		}
		expect(
			[...progress.querySelectorAll<HTMLElement>('[data-slot="step-progress-fill"]')].map(
				(fill) => fill.style.width
			)
		).toEqual(['50%', '0%', '0%']);
		expect(bar).not.toHaveClass('border-t');
		const back = within(bar).getByRole('button', { name: 'Πίσω' });
		expect(back.querySelector('span')).toHaveClass('underline');
		const next = within(bar).getByRole('button', { name: 'Επόμενο' });
		expect(next).toHaveClass('rounded-full', 'bg-accent', 'ml-auto');
		await user.click(back);
		await user.click(next);
		expect(onBack).toHaveBeenCalledOnce();
		expect(onNext).toHaveBeenCalledOnce();
	});

	it('record §6.3 (negative): «Επόμενο» is locked until the step is complete, and while it saves — a press does nothing', async () => {
		const user = userEvent.setup({ delay: null });
		const onNext = vi.fn();
		const locked = render(Harness, { props: { nextDisabled: true, onNext } });
		const next = screen.getByRole('button', { name: 'Επόμενο' });
		expect(next).toBeDisabled();
		await user.click(next);
		expect(onNext).not.toHaveBeenCalled();
		locked.unmount();
		render(Harness, { props: { nextLoading: true, onNext } });
		const busy = screen.getByRole('button', { name: 'Επόμενο' });
		expect(busy).toHaveAttribute('aria-busy', 'true');
		await user.click(busy);
		expect(onNext).not.toHaveBeenCalled();
	});

	it('record §6.4 (the overview): no progress and the caller’s one button instead of «Πίσω / Επόμενο», over a thin line; no pills when none are given', () => {
		render(Harness, {
			props: { withProgress: false, withActions: false, withFooter: true, pills: [] }
		});
		const bar = slot('wizard-screen-bar');
		expect(within(bar).queryByRole('progressbar')).toBeNull();
		expect(bar).toHaveClass('border-t', 'border-border');
		expect(within(bar).getByRole('button', { name: 'Ξεκινήστε' })).toBeInTheDocument();
		expect(within(bar).queryByRole('button', { name: 'Επόμενο' })).toBeNull();
		expect(document.querySelectorAll('[data-slot="wizard-screen-pill"]')).toHaveLength(0);
	});

	it('U-65.6 (negative): the caller’s words are text, never markup — a title made of a tag stays its letters', () => {
		const hostile = '<img src=x onerror="alert(1)">';
		render(Harness, { props: { title: hostile, subtitle: '</p><script>x</script>' } });
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(hostile);
		expect(document.querySelector('[data-slot="wizard-screen"] img')).toBeNull();
		expect(document.querySelector('[data-slot="wizard-screen"] script')).toBeNull();
	});
});
