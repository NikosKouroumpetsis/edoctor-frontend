import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveFile } from '.';

// jsdom does not implement URL.createObjectURL / revokeObjectURL (precedent: the image uploader's spec).
type ObjectUrls = { createObjectURL?: unknown; revokeObjectURL?: unknown };
let createObjectURL: ReturnType<typeof vi.fn>;
let revokeObjectURL: ReturnType<typeof vi.fn>;

beforeEach(() => {
	createObjectURL = vi.fn(() => 'blob:mock/1');
	revokeObjectURL = vi.fn();
	(URL as unknown as ObjectUrls).createObjectURL = createObjectURL;
	(URL as unknown as ObjectUrls).revokeObjectURL = revokeObjectURL;
});

afterEach(() => {
	delete (URL as unknown as ObjectUrls).createObjectURL;
	delete (URL as unknown as ObjectUrls).revokeObjectURL;
	vi.restoreAllMocks();
});

describe('shared/lib/save-file · saveFile (U-84.5, D-W4-31)', () => {
	it('hands the file to the browser under the caller’s name, by a `blob:` address revoked at once, and leaves nothing in the page', () => {
		const clicked: { href: string; download: string; inPage: boolean; revoked: boolean }[] = [];
		vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
			this: HTMLAnchorElement
		) {
			clicked.push({
				href: this.getAttribute('href') ?? '',
				download: this.download,
				inPage: document.body.contains(this),
				revoked: revokeObjectURL.mock.calls.length > 0
			});
		});

		const blob = new Blob(['BEGIN:VCALENDAR'], { type: 'text/calendar;charset=utf-8' });
		saveFile(blob, 'edoctor-appointment-2026-11-12.ics');

		expect(createObjectURL).toHaveBeenCalledWith(blob);
		expect(clicked).toEqual([
			{
				href: 'blob:mock/1',
				download: 'edoctor-appointment-2026-11-12.ics',
				inPage: true,
				revoked: false
			}
		]);
		expect(revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:mock/1');
		expect(document.querySelectorAll('a[download]')).toHaveLength(0);
	});
});
