import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import DoctorCard from './card.svelte';
import type { Doctor } from '$modules/doctors/types';

// U-32.2: the raw palette of Tailwind (`bg-black/55`, `fill-rose-500`, `text-white` …) as a class of any variant.
const RAW_PALETTE =
	/(?<![\w-])(?:[\w-]+:)*(?:bg|text|fill|stroke|border|ring|outline|from|via|to)-(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?(?:\/[\d.]+)?(?![\w-])/gu;
const rawPaletteOf = (source: string) => source.match(RAW_PALETTE) ?? [];

const doctor: Doctor = {
	id: 'd1',
	name: 'Maria Alexiou',
	specialty: 'Cardiology',
	location: 'Athens',
	rating: 4.9,
	reviews: 128,
	available: true,
	tags: ['ECG', 'Hypertension']
};

describe('DoctorCard', () => {
	it('renders the doctor summary', () => {
		render(DoctorCard, { props: { doctor } });
		expect(screen.getByRole('heading', { name: 'Maria Alexiou' })).toBeInTheDocument();
		expect(screen.getByText('Cardiology')).toBeInTheDocument();
		expect(screen.getByText('4.9')).toBeInTheDocument();
		expect(screen.getByText('ECG')).toBeInTheDocument();
		expect(screen.getByText('Available today')).toBeInTheDocument();
	});

	it('toggles the wishlist and reports it', async () => {
		const user = userEvent.setup();
		const onToggleWishlist = vi.fn();
		render(DoctorCard, { props: { doctor, onToggleWishlist } });
		const heart = screen.getByRole('button', { name: 'Add to wishlist' });
		expect(heart).toHaveAttribute('aria-pressed', 'false');
		await user.click(heart);
		expect(onToggleWishlist).toHaveBeenLastCalledWith(true);
		expect(screen.getByRole('button', { name: 'Remove from wishlist' })).toBeInTheDocument();
	});

	it('U-32.2: the heart’s circle darkens to `bg-overlay` and a saved heart is the accent — the palette’s colours, no raw one in the card', async () => {
		const user = userEvent.setup();
		render(DoctorCard, { props: { doctor } });
		const heart = screen.getByRole('button', { name: 'Add to wishlist' });
		const circle = heart.querySelector('span') as HTMLElement;
		expect(circle).toHaveClass('bg-overlay/80', 'text-media-scrim', 'group-hover:bg-overlay');
		expect(heart.querySelector('svg')).not.toHaveClass('fill-accent');
		await user.click(heart);
		expect(heart.querySelector('svg')).toHaveClass('fill-accent', 'text-accent');
		const source = readFileSync(
			join(process.cwd(), 'src/modules/doctors/ui/card/card.svelte'),
			'utf8'
		);
		expect(source).toContain('group-hover:bg-overlay');
		expect(rawPaletteOf(source)).toEqual([]);
	});

	it('U-32.2 (negative): the card’s former classes are raw palette and are reported — the black hover, the rose heart', () => {
		expect(
			rawPaletteOf(
				"class=\"bg-overlay/80 group-hover:bg-black/55\" cn('size-5', wishlisted && 'fill-rose-500 text-rose-500') text-white"
			)
		).toEqual(['group-hover:bg-black/55', 'fill-rose-500', 'text-rose-500', 'text-white']);
		expect(rawPaletteOf('bg-overlay text-accent fill-accent text-media-scrim')).toEqual([]);
	});

	it('invokes onBook with the doctor', async () => {
		const user = userEvent.setup();
		const onBook = vi.fn();
		render(DoctorCard, { props: { doctor, onBook } });
		await user.click(screen.getByRole('button', { name: 'Book appointment' }));
		expect(onBook).toHaveBeenCalledWith(doctor);
	});
});
