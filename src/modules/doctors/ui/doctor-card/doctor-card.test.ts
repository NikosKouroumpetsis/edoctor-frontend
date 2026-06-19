import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import DoctorCard from './doctor-card.svelte';
import type { Doctor } from '$modules/doctors/types';

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

	it('invokes onBook with the doctor', async () => {
		const user = userEvent.setup();
		const onBook = vi.fn();
		render(DoctorCard, { props: { doctor, onBook } });
		await user.click(screen.getByRole('button', { name: 'Book appointment' }));
		expect(onBook).toHaveBeenCalledWith(doctor);
	});
});
