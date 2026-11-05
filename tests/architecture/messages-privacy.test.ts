import { describe, expect, it } from 'vitest';
import { readSourceFiles } from './source-scan';

/**
 * 🔴 U-84, U-65.6: what a person writes reaches the request's body and the memory of the page, and nothing else, so no
 * code of the messages may even hold a way out: a storage, a log, analytics, an address built from a query, raw HTML, or
 * a link made of a message. The pages' own tests send a rare string down every path; this one keeps the ways shut.
 */
const SCOPE =
	/^src\/(modules\/messages|screens\/messages|shared\/ui\/molecules\/(composer|message-bubble|conversation-row))\//u;

const WAYS_OUT: { pattern: RegExp; reason: string }[] = [
	{ pattern: /\b(localStorage|sessionStorage|indexedDB)\b/u, reason: 'a storage' },
	{ pattern: /\bdocument\.cookie\b/u, reason: 'a cookie' },
	{ pattern: /\bconsole\s*\./u, reason: 'a log' },
	{ pattern: /\b(sendBeacon|gtag|dataLayer|analytics)\b/iu, reason: 'analytics' },
	{ pattern: /\bURLSearchParams\b|[?&]body=/u, reason: 'an address made of words' },
	{ pattern: /\bpersistQueryClient\b|\bsetItem\b/u, reason: 'a persisted cache' },
	{ pattern: /\{@html\b|\binnerHTML\b|\binsertAdjacentHTML\b/u, reason: 'raw HTML' },
	{ pattern: /\blinkify\b|\bInlineLinkText\b|\bRichText\b/u, reason: 'a link made of a message' }
];

const scoped = () => readSourceFiles().filter((file) => SCOPE.test(file.path));

describe('U-84: the words of a message go nowhere but the request', () => {
	it('the scan reads what it says', () => {
		const paths = scoped().map((file) => file.path);
		expect(paths).toContain('src/modules/messages/ui/inbox/hooks/use-thread.svelte.ts');
		expect(paths).toContain('src/modules/messages/ui/contact/hooks/use-contact.svelte.ts');
		expect(paths).toContain('src/shared/ui/molecules/message-bubble/message-bubble.svelte');
	});

	it('🔴 U-84: κανένα σώμα μηνύματος σε URL ή storage: no code of the messages holds a way out', () => {
		const found = scoped().flatMap((file) =>
			file.path.includes('.stories.')
				? []
				: WAYS_OUT.flatMap(({ pattern, reason }) =>
						pattern.test(file.text) ? [`${file.path}: ${reason}`] : []
					)
		);
		expect(found).toEqual([]);
	});

	it('🔴 U-84: every read of the messages wears the sign-out’s mark', () => {
		const api = readSourceFiles().filter((file) =>
			/^src\/modules\/messages\/api\/.*\/index\.ts$/u.test(file.path)
		);
		expect(api).toHaveLength(2);
		for (const file of api) {
			const reads = [...file.text.matchAll(/\bqueryFn\b/gu)].length;
			const marks = [...file.text.matchAll(/meta: personalQueryMeta/gu)].length;
			expect(reads, file.path).toBeGreaterThan(0);
			expect(marks, file.path).toBeGreaterThanOrEqual(reads);
		}
	});

	it('🔴 U-84.6, D-103: every screen of a doctor composes the button, and the doctor module asks nothing of the messages', () => {
		const files = readSourceFiles();
		const screens = [
			'src/screens/doctors/[slug]/page/index.svelte',
			'src/screens/doctors/[slug]/details/[section]/page/index.svelte',
			'src/screens/doctors/[slug]/about/page/index.svelte'
		];
		for (const path of screens) {
			const text = files.find((file) => file.path === path)?.text ?? '';
			expect(text, path).toContain('<ContactButton');
			expect(text, path).toContain('<ContactDialog');
		}
		const askers = files.filter(
			(file) => file.path.startsWith('src/modules/doctor/') && /\/messaging\b/u.test(file.text)
		);
		expect(askers.map((file) => file.path)).toEqual([]);
	});

	it('(negative) the scan finds a way out when one is planted', () => {
		const planted = "localStorage.setItem('draft', body); console.log(body);";
		expect(WAYS_OUT.some(({ pattern }) => pattern.test(planted))).toBe(true);
	});
});
