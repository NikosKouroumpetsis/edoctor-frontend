import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Banner from './banner.svelte';
import type { BannerProps } from './index';

const sorted = (element: Element) => [...element.classList].sort();
const classes = (list: string) => list.split(' ').sort();
const glyphs = (container: HTMLElement) =>
	[...container.querySelectorAll('[data-slot="ionicon"]')] as SVGElement[];
const bannerOf = (container: HTMLElement) =>
	container.querySelector('[data-slot="banner"]') as HTMLElement;

describe('Banner', () => {
	it('U-03.1 (K6, banner as it is): a polite status with its title over its line, in the info tint by default', () => {
		render(Banner, {
			props: { title: 'Το προφίλ σας ενημερώθηκε', description: 'Οι αλλαγές αποθηκεύτηκαν.' }
		});
		const banner = screen.getByRole('status');
		expect(screen.queryByRole('alert')).toBeNull();
		expect(banner).toHaveAttribute('data-tone', 'info');
		expect(banner).toHaveTextContent('Το προφίλ σας ενημερώθηκε');
		expect(banner).toHaveTextContent('Οι αλλαγές αποθηκεύτηκαν.');
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('U-02.2: the root, the words and the glyph class for class with the application’s banner', () => {
		const { container } = render(Banner, {
			props: { title: 'Τίτλος', description: 'Γραμμή', class: 'mt-4' }
		});
		expect(sorted(bannerOf(container))).toEqual(
			classes(
				'flex w-full flex-row items-start gap-3 rounded-md border p-4 border-primary/20 bg-primary/10 mt-4'
			)
		);
		const column = screen.getByText('Τίτλος').parentElement as HTMLElement;
		expect(sorted(column)).toEqual(classes('flex min-w-0 flex-1 flex-col gap-1'));
		expect(sorted(screen.getByText('Τίτλος'))).toEqual(
			classes('text-body-md font-semibold text-primary-text')
		);
		expect(sorted(screen.getByText('Γραμμή'))).toEqual(classes('text-body-sm text-foreground/80'));
		const [glyph] = glyphs(container);
		expect(glyph).toHaveAttribute('data-icon', 'information-circle');
		expect(glyph).toHaveAttribute('aria-hidden', 'true');
		expect(glyph).toHaveClass('icon-md', 'text-primary-text');
	});

	it.each([
		[
			'info',
			'border-primary/20 bg-primary/10',
			'text-primary-text',
			'text-primary-text',
			'information-circle'
		],
		[
			'success',
			'border-success/20 bg-success/10',
			'text-success-text',
			'text-success-text',
			'checkmark-circle'
		],
		[
			'warning',
			'border-warning/20 bg-warning/10',
			'text-foreground',
			'text-warning-icon',
			'warning'
		],
		[
			'danger',
			'border-danger/20 bg-danger/10',
			'text-danger-text',
			'text-danger-text',
			'alert-circle'
		]
	] as const)(
		'U-02.2: the %s tone — its tint, its title colour, its glyph',
		(tone, box, title, glyph, name) => {
			const { container } = render(Banner, { props: { title: 'Τίτλος', tone } });
			expect(bannerOf(container)).toHaveClass(...box.split(' '));
			expect(screen.getByText('Τίτλος')).toHaveClass(title);
			expect(glyphs(container)[0]).toHaveAttribute('data-icon', name);
			expect(glyphs(container)[0]).toHaveClass(glyph);
		}
	);

	it.each([
		['success', 'border-success-text bg-success-text', 'text-success-foreground'],
		['warning', 'border-warning bg-warning', 'text-warning-foreground'],
		['danger', 'border-danger-text bg-danger-text', 'text-danger-foreground']
	] as const)(
		'S-34.1: solid %s fills and writes every part in the fill’s foreground',
		async (tone, box, ink) => {
			const { container } = render(Banner, {
				props: {
					title: 'Τίτλος',
					description: 'Γραμμή',
					tone,
					solid: true,
					dismissLabel: 'Κλείσιμο',
					onDismiss: vi.fn()
				}
			});
			const banner = bannerOf(container);
			expect(banner).toHaveAttribute('data-solid', 'true');
			expect(banner).toHaveClass(...box.split(' '));
			expect(banner).not.toHaveClass(`bg-${tone}/10`);
			expect(screen.getByText('Τίτλος')).toHaveClass(ink);
			expect(screen.getByText('Γραμμή')).toHaveClass(ink);
			expect(screen.getByText('Γραμμή')).not.toHaveClass('text-foreground/80');
			for (const glyph of glyphs(container)) expect(glyph).toHaveClass(ink);
		}
	);

	it('S-34.1 (negative): solid info keeps its tint — the fill is only for the status tones', () => {
		const { container } = render(Banner, { props: { title: 'Τίτλος', tone: 'info', solid: true } });
		const banner = bannerOf(container);
		expect(banner).toHaveClass('border-primary/20', 'bg-primary/10');
		expect(banner).not.toHaveAttribute('data-solid');
	});

	it('U-03.1 (a11y): a dismissable banner’s «×» is a 48 button named by the caller, pressed once per press', async () => {
		const onDismiss = vi.fn();
		const { container } = render(Banner, {
			props: { title: 'Λήγει σύντομα', tone: 'warning', dismissLabel: 'Κλείσιμο', onDismiss }
		});
		const close = screen.getByRole('button', { name: 'Κλείσιμο' });
		expect(close).toHaveClass('size-touch', 'shrink-0', 'items-center', 'justify-center');
		expect(glyphs(container)[1]).toHaveAttribute('data-icon', 'close');
		expect(glyphs(container)[1]).toHaveClass('icon-md', 'text-muted-foreground');
		await userEvent.click(close);
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it('U-03.1 (negative): no «×» without `onDismiss`, and none without its name', () => {
		// @ts-expect-error a «×» without its name
		const nameless: BannerProps = { title: 'α', onDismiss: () => {} };
		expect(nameless.title).toBe('α');
		render(Banner, { props: { title: 'Τίτλος' } });
		expect(screen.queryByRole('button')).toBeNull();
	});

	it.each([
		['danger', 'alert'],
		['warning', 'status'],
		['info', 'status'],
		['success', 'status']
	] as const)(
		'U-03.1 (a11y, R1 MINOR-1): the %s tone is a live %s — only a danger interrupts the reader',
		(tone, role) => {
			for (const solid of [false, true]) {
				const { container, unmount } = render(Banner, { props: { title: 'Τίτλος', tone, solid } });
				expect(bannerOf(container)).toHaveAttribute('role', role);
				expect(screen.getByRole(role)).toBe(bannerOf(container));
				unmount();
			}
		}
	);

	it('U-03.1 (a11y, R1 MINOR-1): the caller’s role wins — alert when urgent, null for none, another role', () => {
		const roleOf = (props: BannerProps) => {
			const view = render(Banner, { props });
			const role = bannerOf(view.container).getAttribute('role');
			view.unmount();
			return role;
		};
		expect(roleOf({ title: 'α', tone: 'info', role: 'alert' })).toBe('alert');
		expect(roleOf({ title: 'α', tone: 'danger', role: null })).toBeNull();
		expect(roleOf({ title: 'α', tone: 'warning', role: null })).toBeNull();
		render(Banner, { props: { title: 'Τίτλος', role: 'note' } });
		expect(screen.queryByRole('status')).toBeNull();
		expect(screen.getByRole('note')).toHaveTextContent('Τίτλος');
	});

	it('U-03.1 (zones, light/dark): the same at every width, only theme tokens, status words in *-text', () => {
		for (const tone of ['info', 'success', 'warning', 'danger'] as const) {
			for (const solid of [false, true]) {
				const { container, unmount } = render(Banner, {
					props: {
						title: 'α',
						description: 'β',
						tone,
						solid,
						dismissLabel: 'γ',
						onDismiss: vi.fn()
					}
				});
				expect(container.innerHTML).not.toMatch(/\b(tablet|split|laptop|desktop|wide):/);
				expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
				expect(container.innerHTML).not.toMatch(
					/\btext-(danger|success|warning)(\/[\d.]+)?(?=[\s"])/
				);
				unmount();
			}
		}
	});
});
