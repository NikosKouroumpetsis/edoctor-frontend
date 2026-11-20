import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { cutImageToJpeg, loadImage } from '$shared/lib/image';
import { Session } from '$shared/state/session';
import { ToastState } from '$shared/ui/molecules/toast';
import {
	SAMPLE_PHOTO_IDS,
	samplePhotoServer
} from '$modules/doctor-dashboard/api/images/images.sample';
import Harness from './crop.harness.svelte';

/*
 * Wave 5.2 · screen 78 «Προσαρμογή» (U-206.2, D-W52-35 / 40): the page with the server stubbed at `fetch` and at
 * `XMLHttpRequest`. jsdom loads no picture and draws no canvas: the device's load and cut are the spec's (the shared
 * functions themselves are proven in `shared/lib/image`), the geometry and the page are the real ones.
 */
vi.mock('$shared/lib/image', async (original) => ({
	...(await original<typeof import('$shared/lib/image')>()),
	loadImage: vi.fn(),
	cutImageToJpeg: vi.fn()
}));

const [, B] = SAMPLE_PHOTO_IDS;
const API = 'http://localhost:8080';
const LARGE = `${API}/uploads/doctor/profile/images/large/2.webp`;
const stored = (width = 1200, height = 900) =>
	({ naturalWidth: width, naturalHeight: height }) as HTMLImageElement;

function serve() {
	const server = samplePhotoServer();
	vi.stubGlobal('fetch', vi.fn(server.fetch));
	vi.stubGlobal('XMLHttpRequest', server.Upload);
	return server;
}

function open(options: { imageId?: string; session?: Session; toasts?: ToastState } = {}) {
	const client = new QueryClient({
		defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity } }
	});
	const onClose = vi.fn();
	const view = render(Harness, { props: { client, imageId: B, onClose, ...options } });
	return { client, onClose, ...view };
}

const frame = () => screen.findByRole('button', { name: 'Προσαρμογή' });
const zoom = () => screen.getByRole('slider', { name: 'Μεγέθυνση' });

beforeEach(() => {
	vi.mocked(loadImage).mockReset().mockResolvedValue(stored());
	vi.mocked(cutImageToJpeg).mockReset().mockReturnValue('data:image/jpeg;base64,CUT');
});
afterEach(() => {
	vi.unstubAllGlobals();
});

describe('«Προσαρμογή» of a photo (wave 5.2 · screen 78)', () => {
	it('🔴 U-102 · D-W52-40: a PAGE, never a window — the title, «Έτσι θα φαίνεται η φωτογραφία, …», the 4:3 frame of the largest size the server keeps, «Μεγέθυνση», and «Άκυρο · Αποθήκευση»', async () => {
		serve();
		open();
		const crop = await frame();
		const page = screen.getByTestId('doctor-photo-crop');
		expect(page).toHaveAttribute('data-slot', 'step-screen');
		expect(page).toHaveAttribute('data-placement', 'menu');
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(screen.getByRole('heading', { level: 2, name: 'Προσαρμογή' })).toBeInTheDocument();
		const lead = screen.getByText(
			'Έτσι θα φαίνεται η φωτογραφία, στην αναζήτηση και στη σελίδα σας. Σύρετε για να διαλέξετε τι φαίνεται.'
		);
		expect(crop).toHaveAttribute('aria-describedby', lead.id);
		// The picture is the photo's own largest stored size, asked for so that the canvas may read it.
		expect(loadImage).toHaveBeenCalledWith(LARGE);
		expect(crop.querySelector('img')).toHaveAttribute('src', LARGE);
		expect(zoom()).toHaveAttribute('aria-valuemax', '1.5');
		expect(screen.getByTestId('doctor-photo-crop-cancel')).toHaveTextContent('Άκυρο');
		expect(screen.getByTestId('doctor-photo-crop-save')).toHaveTextContent('Αποθήκευση');
	});

	it('🔴 U-217: «‹» leads to the photos below 950 and is not drawn from 950, where the menu stands beside the page', async () => {
		serve();
		open();
		await frame();
		const back = screen.getByTestId('doctor-photo-crop-back');
		expect(back).toHaveAttribute('href', '/doctor/profile/photos');
		expect(back).toHaveAccessibleName('Πίσω');
		expect(back.parentElement).toHaveClass('split:hidden');
	});

	it('🔴 D-W52-35 · D-W52-40: «Αποθήκευση» cuts on the device — the chosen part, at least 800 × 600 of the picture’s own pixels — and sends it in the photo’s place (`PATCH`, the same id); then «Αποθηκεύτηκε.» and the page closes', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const toasts = new ToastState();
		const image = stored();
		vi.mocked(loadImage).mockResolvedValue(image);
		const { onClose } = open({ toasts });
		const crop = await frame();
		// All the way in, then towards the right edge of the picture.
		zoom().focus();
		await user.keyboard('{End}');
		crop.focus();
		await user.keyboard('{ArrowRight}{ArrowRight}');
		await user.click(screen.getByTestId('doctor-photo-crop-save'));
		await waitFor(() => expect(server.sending()).not.toBeNull());
		expect(cutImageToJpeg).toHaveBeenCalledTimes(1);
		expect(cutImageToJpeg).toHaveBeenCalledWith(image, { x: 280, y: 150, width: 800, height: 600 });
		expect(server.sending()).toMatchObject({
			method: 'PATCH',
			path: `/doctor/profile/images/${B}`,
			body: { image: { file: 'data:image/jpeg;base64,CUT', fileName: 'photo.jpg' } }
		});
		expect(onClose).not.toHaveBeenCalled();
		// A second press while it travels sends nothing more.
		await user.click(screen.getByTestId('doctor-photo-crop-save'));
		expect(server.uploads).toHaveLength(1);
		server.sending()?.store();
		await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
		expect(toasts.current?.message).toBe('Αποθηκεύτηκε.');
		// The photos are read again after the write.
		await waitFor(() => expect(server.callsOf('GET')).toHaveLength(2));
	});

	it('D-W52-40: untouched, the cut is the whole 4:3 picture — never larger than the picture is; «Άκυρο» closes and sends nothing', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const first = open();
		await frame();
		await user.click(screen.getByTestId('doctor-photo-crop-save'));
		await waitFor(() => expect(server.sending()).not.toBeNull());
		expect(vi.mocked(cutImageToJpeg).mock.calls[0][1]).toEqual({
			x: 0,
			y: 0,
			width: 1200,
			height: 900
		});
		server.sending()?.store();
		await waitFor(() => expect(first.onClose).toHaveBeenCalledTimes(1));
		first.unmount();

		const second = open();
		await frame();
		await user.click(screen.getByTestId('doctor-photo-crop-cancel'));
		expect(second.onClose).toHaveBeenCalledTimes(1);
		expect(server.uploads).toHaveLength(1);
	});

	it('🔴 D-W52-30 · U-65.6 (negative): the server checks the cut again — its refusal is said in the page’s words and the cut STAYS; a `401` ends the session; nothing closes', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const expire = vi.fn();
		const { onClose } = open({
			session: new Session({
				status: () => 'member',
				member: () => ({ firstName: 'Ελένη' }),
				signOut: async () => undefined,
				expire
			})
		});
		await frame();
		const save = () => user.click(screen.getByTestId('doctor-photo-crop-save'));
		const failure = () => screen.findByTestId('doctor-photo-crop-failure');
		await save();
		await waitFor(() => expect(server.sending()).not.toBeNull());
		server.sending()?.refuse(422, {
			errorCode: 'EC422',
			errorMessage: 'Validation Error: IMAGE_TOO_SMALL'
		});
		expect(await failure()).toHaveTextContent(
			'Πολύ μικρή φωτογραφία: χρειάζεται τουλάχιστον 800 × 600.'
		);
		await save();
		await waitFor(() => expect(server.uploads).toHaveLength(2));
		server.sending()?.lose();
		await waitFor(async () =>
			expect(await failure()).toHaveTextContent(
				'Η αποθήκευση δεν ολοκληρώθηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
			)
		);
		expect(expire).not.toHaveBeenCalled();
		await save();
		await waitFor(() => expect(server.uploads).toHaveLength(3));
		server.sending()?.refuse(401, { errorCode: 'EC401', errorMessage: 'Unauthorized' });
		await waitFor(() => expect(expire).toHaveBeenCalledTimes(1));
		expect(onClose).not.toHaveBeenCalled();
		expect(await frame()).toBeInTheDocument();
	});

	it('🔴 U-65.6 (negative): a photo that is not the doctor’s (an id the list does not hold) cannot be cut — «Αυτή η φωτογραφία δεν υπάρχει πια.», one way back, nothing loaded, nothing sent', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const { onClose } = open({ imageId: '0199a0d0-0000-7000-8000-0000000000ff' });
		expect(await screen.findByTestId('doctor-photo-crop-notice')).toHaveTextContent(
			'Αυτή η φωτογραφία δεν υπάρχει πια.'
		);
		expect(loadImage).not.toHaveBeenCalled();
		expect(screen.queryByTestId('doctor-photo-crop-save')).toBeNull();
		expect(screen.queryByTestId('doctor-photo-crop-cancel')).toBeNull();
		await user.click(screen.getByTestId('doctor-photo-crop-leave'));
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(server.uploads).toEqual([]);
	});

	it('🔴 D-W52-40 (negative): a stored picture under 800 × 600 cannot be cut — the page says so with its own words and offers no «Αποθήκευση»', async () => {
		serve();
		vi.mocked(loadImage).mockResolvedValue(stored(640, 480));
		open();
		expect(await screen.findByTestId('doctor-photo-crop-notice')).toHaveTextContent(
			'Πολύ μικρή φωτογραφία: χρειάζεται τουλάχιστον 800 × 600.'
		);
		expect(screen.queryByTestId('doctor-photo-crop-save')).toBeNull();
		expect(screen.queryByRole('slider')).toBeNull();
	});

	it('(negative) D-W52-40: a picture that does not load (or whose host does not let a canvas read it) says so with «Δοκιμάστε ξανά», which asks for it again; a failed read of the photos too', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		vi.mocked(loadImage).mockRejectedValueOnce(new Error('blocked'));
		const first = open();
		expect(await screen.findByTestId('doctor-photo-crop-error')).toHaveTextContent(
			'Δεν μπορέσαμε να ανοίξουμε τη φωτογραφία. Δοκιμάστε ξανά.'
		);
		expect(screen.queryByTestId('doctor-photo-crop-save')).toBeNull();
		await user.click(screen.getByTestId('doctor-photo-crop-retry'));
		expect(await frame()).toBeInTheDocument();
		expect(loadImage).toHaveBeenCalledTimes(2);
		first.unmount();

		server.refuse('GET', '/doctor/profile/images', 500);
		server.refuse('GET', '/doctor/profile/images', 500);
		open();
		expect(await screen.findByTestId('doctor-photo-crop-error')).toHaveTextContent(
			'Δεν μπορέσαμε να φορτώσουμε τη σελίδα. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
	});

	it('the wait draws the frame’s place and no bar; nothing is sent from it', async () => {
		const server = serve();
		vi.mocked(loadImage).mockReturnValue(new Promise(() => {}));
		open();
		const wait = await screen.findByTestId('doctor-photo-crop-wait');
		expect(wait.querySelector('[aria-busy="true"]')).not.toBeNull();
		expect(wait.querySelector('[data-slot="step-screen-bar"]')).toBeNull();
		expect(server.uploads).toEqual([]);
	});
});
