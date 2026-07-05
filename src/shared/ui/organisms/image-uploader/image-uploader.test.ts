import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { m } from '$paraglide/messages.js';
import ImageUploader from './image-uploader.svelte';
import type { RemoteImage } from './lib/types';

// jsdom lacks object-URL APIs; the controller feature-detects them, so shim
// them (as in the controller unit test) to exercise the local-preview path.
let urlSeq = 0;
beforeEach(() => {
	urlSeq = 0;
	(URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(
		() => `blob:mock/${++urlSeq}`
	);
	(URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
});
afterEach(() => {
	delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL;
	delete (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL;
});

function png(name: string): File {
	return new File(['x'], name, { type: 'image/png' });
}

function fileInput(): HTMLInputElement {
	return document.querySelector('input[type="file"]') as HTMLInputElement;
}

function remote(id: string): RemoteImage {
	return { kind: 'remote', id, url: `https://cdn/${id}.jpg`, alt: id };
}

describe('ImageUploader (integration)', () => {
	it('goes empty → dialog → selection-only commit → gallery', async () => {
		const user = userEvent.setup({ delay: null });
		render(ImageUploader, { props: { minCount: 3, items: [] } });

		// Empty surface with the entry CTA.
		expect(screen.getByText(m.image_uploader_empty_title())).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: m.image_uploader_empty_cta() }));

		// Dialog opens on the empty dropzone.
		expect(await screen.findByRole('dialog')).toBeInTheDocument();

		// Stage two files, then commit (selection-only: no upload injected).
		await user.upload(fileInput(), [png('a.png'), png('b.png')]);
		await waitFor(() =>
			expect(document.querySelectorAll('[data-slot="upload-tile"]').length).toBe(2)
		);
		await user.click(screen.getByRole('button', { name: m.image_uploader_upload() }));

		// Dialog closes; the gallery now shows the cover badge.
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		expect(screen.getByText(m.image_uploader_cover_badge())).toBeInTheDocument();
	});

	it('reorders via the item menu (move forward → new cover) and deletes', async () => {
		const user = userEvent.setup({ delay: null });
		render(ImageUploader, {
			props: { minCount: 3, items: [remote('a'), remote('b'), remote('c')] }
		});

		// Cover starts as item "a".
		const coverImg = () =>
			document.querySelector('[data-slot="photo-cover"] img') as HTMLImageElement;
		expect(coverImg().src).toContain('/a.jpg');

		// Open the 2nd item's menu and promote it to the cover.
		const optionButtons = screen.getAllByRole('button', { name: m.image_uploader_options() });
		await user.click(optionButtons[1]); // item "b"
		const menu = await screen.findByRole('menu');
		await user.click(
			within(menu).getByRole('menuitem', { name: m.image_uploader_menu_move_front() })
		);
		await waitFor(() => expect(coverImg().src).toContain('/b.jpg'));

		// Delete the current cover ("b") via its menu.
		const optionsAfter = screen.getAllByRole('button', { name: m.image_uploader_options() });
		await user.click(optionsAfter[0]);
		const menu2 = await screen.findByRole('menu');
		await user.click(within(menu2).getByRole('menuitem', { name: m.image_uploader_menu_delete() }));
		await waitFor(() => expect(coverImg().src).toContain('/a.jpg'));
	});
});
