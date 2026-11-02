import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import RevealingPhoto from './revealing-photo.svelte';
import { revealingPhotoClasses, revealingPhotoPhase, wasPhotoShown } from './index';

// The kit keeps the addresses it showed for the whole session (module scope, U-14.6): every test takes its own.
let batch = 0;
const nextUrl = () => `data:image/png;base64,revealing-${(batch += 1)}`;

describe('RevealingPhoto', () => {
	it('U-14.6(α): a photo of the server’s page lights up from the first paint — the keyframe, never `opacity-0` — so it shows without JavaScript', () => {
		expect(revealingPhotoPhase({ paint: true, arrived: false, shownBefore: false })).toBe('paint');
		expect(revealingPhotoClasses.paint).toBe('animate-reveal');
		expect(revealingPhotoClasses.paint).not.toContain('opacity-0');
		const css = readFileSync(join(process.cwd(), 'src/routes/layout.css'), 'utf8');
		expect(css).toContain(
			'--animate-reveal: reveal var(--transition-duration-reveal) var(--ease-standard) both;'
		);
		expect(css).toMatch(/@keyframes reveal \{\s*from \{\s*opacity: 0;/u);
		expect(css).not.toMatch(/prefers-reduced-motion[^}]*animate-reveal/u);
	});

	it('U-14.6(α): only a photo mounted in the browser waits transparent; it is the server’s markup that tells (hydration-stable id)', () => {
		expect(revealingPhotoPhase({ paint: false, arrived: false, shownBefore: false })).toBe(
			'waiting'
		);
		expect(revealingPhotoClasses.waiting).toBe('opacity-0');
		const source = readFileSync(
			join(process.cwd(), 'src/shared/ui/molecules/revealing-photo/revealing-photo.svelte'),
			'utf8'
		);
		expect(source).toContain('const uid = $props.id();');
		expect(source).toContain('document.querySelector(`[data-revealing-photo="${uid}"]`) !== null');
	});

	it('U-14.1(γ) — MINOR-10 of r1: a photo of the server’s page still loading when the page comes alive waits transparent and lights up at its load — never its 0.8 s on an empty frame', () => {
		expect(
			revealingPhotoPhase({ paint: true, pending: true, arrived: false, shownBefore: false })
		).toBe('waiting');
		expect(
			revealingPhotoPhase({ paint: true, pending: true, arrived: true, shownBefore: false })
		).toBe('arriving');
		expect(
			revealingPhotoPhase({ paint: true, pending: false, arrived: false, shownBefore: false })
		).toBe('paint');
		const source = readFileSync(
			join(process.cwd(), 'src/shared/ui/molecules/revealing-photo/revealing-photo.svelte'),
			'utf8'
		);
		expect(source).toContain('if (paintUrl && node && !node.complete) paintPending = true;');
		expect(source).toContain('const waited = loaded !== paintUrl || paintPending;');
	});

	it('U-14 / U-12 (app = web): a photo mounted in the browser lights up at its load (0.8 s keyframe, whatever the motion setting); shown again, at once', async () => {
		const url = nextUrl();
		const first = render(RevealingPhoto, { props: { url, alt: 'Φωτογραφία', testId: 'photo' } });
		expect(screen.getByTestId('photo')).toHaveAttribute('data-phase', 'waiting');
		expect(screen.getByTestId('photo')).toHaveClass('opacity-0');
		expect(wasPhotoShown(url)).toBe(false);
		await fireEvent.load(screen.getByTestId('photo-media'));
		expect(screen.getByTestId('photo')).toHaveAttribute('data-phase', 'arriving');
		expect(screen.getByTestId('photo')).toHaveClass('animate-reveal');
		expect(wasPhotoShown(url)).toBe(true);
		first.unmount();
		render(RevealingPhoto, { props: { url, alt: 'Φωτογραφία', testId: 'photo' } });
		expect(screen.getByTestId('photo')).toHaveAttribute('data-phase', 'shown');
		expect(screen.getByTestId('photo').className).not.toMatch(/opacity-0|animate-reveal/u);
	});

	it('S-32.13: a photo that does not load tells its caller, who draws the silhouette', async () => {
		const onError = vi.fn();
		const url = nextUrl();
		render(RevealingPhoto, { props: { url, alt: '', onError, testId: 'photo' } });
		await fireEvent.error(screen.getByTestId('photo-media'));
		expect(onError).toHaveBeenCalledWith(url);
	});

	it('U-41.1: `contain` shows the whole photo on the muted ground, `cover` (the default) fills the frame', () => {
		const contain = render(RevealingPhoto, {
			props: { url: nextUrl(), alt: '', fit: 'contain', testId: 'photo' }
		});
		expect(screen.getByTestId('photo-media')).toHaveClass('object-contain');
		contain.unmount();
		render(RevealingPhoto, { props: { url: nextUrl(), alt: '', testId: 'photo' } });
		expect(screen.getByTestId('photo-media')).toHaveClass('object-cover');
	});
});
