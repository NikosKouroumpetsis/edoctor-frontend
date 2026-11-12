import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import DoctorPhoto from './index.svelte';

const box = () => screen.getByTestId('doctor-photo');
const silhouette = () => box().querySelector('[data-slot="media-placeholder"]');

describe('modules/appointments/ui/doctor-photo', () => {
	it('🔴 D-W4-68: the doctor’s photo in the shared avatar — its own box and corner, the photo covering it', () => {
		render(DoctorPhoto, {
			props: {
				photo: { src: '/maria.jpg', alt: 'Φωτογραφία γιατρού' },
				class: 'size-avatar-xl',
				testId: 'doctor-photo'
			}
		});
		expect(box()).toHaveAttribute('data-slot', 'avatar');
		expect(box()).toHaveClass('size-avatar-xl', 'rounded-sm', 'shrink-0', 'overflow-hidden');
		expect(box()).not.toHaveClass('rounded-full', 'size-avatar-md');
		const image = box().querySelector('img');
		expect(image).toHaveAttribute('src', '/maria.jpg');
		expect(image).toHaveAttribute('alt', 'Φωτογραφία γιατρού');
		expect(image).toHaveAttribute('loading', 'lazy');
		expect(image).toHaveClass('size-full', 'object-cover');
	});

	it('🔴 D-W4-68 (live check: the host of the photos did not answer): a photo that does not load gives way to the silhouette — never the browser’s broken image, never its `alt` as words', async () => {
		render(DoctorPhoto, {
			props: {
				photo: { src: 'https://cdn.example.test/gone.jpg', alt: 'Φωτογραφία γιατρού' },
				class: 'size-row',
				testId: 'doctor-photo'
			}
		});
		const image = box().querySelector('img') as HTMLImageElement;
		await fireEvent.error(image);
		expect(box().querySelector('img')).toBeNull();
		expect(box()).toHaveAttribute('data-status', 'error');
		expect(silhouette()).toBeInTheDocument();
		expect(silhouette()).toHaveAttribute('aria-hidden', 'true');
		expect(box()).not.toHaveTextContent('Φωτογραφία γιατρού');
	});

	it('a photo that loaded stands alone: the silhouette leaves', async () => {
		render(DoctorPhoto, {
			props: { photo: { src: '/maria.jpg', alt: '' }, class: 'size-row', testId: 'doctor-photo' }
		});
		await fireEvent.load(box().querySelector('img') as HTMLImageElement);
		expect(box()).toHaveAttribute('data-status', 'loaded');
		expect(silhouette()).toBeNull();
		expect(box().querySelector('img')).toBeInTheDocument();
	});

	it('(negative) a doctor with no photo: the silhouette (S-32.8), no image asked', () => {
		render(DoctorPhoto, { props: { photo: null, class: 'size-row', testId: 'doctor-photo' } });
		expect(box().querySelector('img')).toBeNull();
		expect(silhouette()).toBeInTheDocument();
	});
});
