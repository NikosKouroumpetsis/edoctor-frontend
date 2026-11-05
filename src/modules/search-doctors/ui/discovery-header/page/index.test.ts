import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { searchDoctorsCategories } from '$modules/search-doctors/api/home/categories';
import type { CategoryId } from '$modules/search-doctors/types';
import { projectRoot } from '../../../../../../tests/architecture/source-scan';
import DiscoveryHeader from './index.svelte';

const categories: { id: CategoryId }[] = [
	{ id: 'all' },
	{ id: 'cardiology' },
	{ id: 'pediatrics' }
];

function renderHeader(overrides: Record<string, unknown> = {}) {
	const props = {
		categories,
		selectedCategoryId: 'all' as CategoryId,
		onSelectCategory: vi.fn(),
		searchOpen: false,
		onOpenSearch: vi.fn(),
		locale: 'el' as const,
		...overrides
	};
	return { props, ...render(DiscoveryHeader, { props }) };
}

/** The home's slice draws the pill or the rail itself (the shape before U-32.6), from its page's source. */
const drawsHeaderItself = (source: string) =>
	/\bSearchTrigger\b/u.test(source) || /category-rail\.svelte/u.test(source);

const homePage = () =>
	readFileSync(
		join(process.cwd(), 'src/modules/search-doctors/ui/discovery-home/page/index.svelte'),
		'utf8'
	);

// 🔴 U-32.6 (the owner, 29/10): the home's header is its own unit, `search-doctors/ui/discovery-header`, the same name
// and role as the application's — the phone's search pill and the categories' rail.
describe('search-doctors::ui::discovery-header', () => {
	it('U-32.6: the phone’s pill and the categories in ONE stuck band — the home’s words, the chosen category pressed', async () => {
		const { props } = renderHeader({ selectedCategoryId: 'cardiology' });
		const top = document.querySelector('[data-slot="home-top"]') as HTMLElement;
		expect(top).toHaveClass('sticky', 'top-0', 'z-30', 'tablet:static');
		expect(top).toHaveAttribute('data-scrolled', 'false');
		const trigger = within(top).getByTestId('home-search-trigger');
		expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
		expect(trigger).toHaveAttribute('aria-expanded', 'false');
		const names = within(top)
			.getAllByRole('button')
			.filter((button) => button !== trigger)
			.map((button) => [button.textContent?.trim(), button.getAttribute('aria-pressed')]);
		expect(names).toEqual([
			['Όλοι', 'false'],
			['Καρδιολόγος', 'true'],
			['Παιδίατρος', 'false']
		]);
		await userEvent.setup().click(within(top).getByRole('button', { name: 'Όλοι' }));
		expect(props.onSelectCategory).toHaveBeenCalledWith('all');
		await fireEvent.click(trigger);
		expect(props.onOpenSearch).toHaveBeenCalledOnce();
		expect(props.onOpenSearch.mock.calls[0][0]).toBeInstanceOf(MouseEvent);
	});

	it('U-32.6: the band takes its shadow once the page scrolls, and the pill says when the window is open', async () => {
		renderHeader({ searchOpen: true });
		const top = document.querySelector('[data-slot="home-top"]') as HTMLElement;
		expect(within(top).getByTestId('home-search-trigger')).toHaveAttribute('aria-expanded', 'true');
		Object.defineProperty(window, 'scrollY', { configurable: true, value: 120 });
		try {
			await fireEvent.scroll(window);
			expect(top).toHaveAttribute('data-scrolled', 'true');
		} finally {
			Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
		}
	});

	it('U-32.6 (negative): the home’s slice draws neither the pill nor the rail itself — only through `discovery-header`; the former shape is reported', () => {
		const source = homePage();
		expect(source).toContain("from '$modules/search-doctors/ui/discovery-header'");
		expect(drawsHeaderItself(source)).toBe(false);
		expect(
			drawsHeaderItself(
				"import { layoutOf, SearchTrigger } from '$shared/ui/molecules/search-trigger';\nimport CategoryRail from '../components/category-rail.svelte';"
			)
		).toBe(true);
	});

	// Rewrites the sample's «Online» of this file: U-89.1 takes the home's tab out of the product (its key stays, U-30.2).
	it('U-89.1: καμία βιντεοκλήση στις αναζητήσεις — the home’s categories have no «Online», and no camera is drawn', () => {
		expect(searchDoctorsCategories.map((category) => category.id)).toEqual([
			'all',
			'internal-medicine',
			'pediatrics',
			'cardiology',
			'dermatology'
		]);
		const rail = readFileSync(
			join(
				projectRoot,
				'src/modules/search-doctors/ui/discovery-header/components/category-rail.svelte'
			),
			'utf8'
		);
		expect(rail).not.toMatch(/VideoIcon|lucide\/video|online/u);
		const scope = readFileSync(
			join(projectRoot, 'src/modules/search-doctors/api/marketplace/category-scope.ts'),
			'utf8'
		);
		expect(scope).not.toMatch(/video-consultation|'online'/u);
	});
});
