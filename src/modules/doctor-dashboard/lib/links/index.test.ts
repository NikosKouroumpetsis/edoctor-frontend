import { describe, expect, it } from 'vitest';
import {
	DOCTOR_LINK_FIELDS,
	type DoctorLinkField,
	type DoctorLinkRefusal
} from '$modules/doctor-dashboard/api/links';
import {
	buildDoctorLinkLines,
	doctorLinkExamples,
	doctorLinkLabel,
	doctorLinkMessages,
	doctorLinkNames,
	doctorLinkRefusal,
	doctorLinkRefusalText,
	doctorLinksCountText,
	doctorLinksFailureText,
	emptyDoctorLinkValues,
	normalizeDoctorLink,
	shortDoctorLink,
	toDoctorLinks,
	toDoctorLinkValues
} from './index';

/*
 * Wave 5.2 · screen 82 (U-211, D-W52-67, D-W52-70): the page's own check of a link — the server's rule, said before
 * anything is sent — and the words of the four fields. Pure. Made-up addresses only.
 */

const NETWORKS = ['facebook', 'instagram', 'linkedin'] as const;
const refusals = (field: DoctorLinkField, links: readonly string[]) =>
	links.map((link): [string, DoctorLinkRefusal | null] => [link, doctorLinkRefusal(field, link)]);
const all = (links: readonly string[], refusal: DoctorLinkRefusal | null) =>
	links.map((link) => [link, refusal]);

describe('normalizeDoctorLink (D-W52-70)', () => {
	it('🔴 U-211 / D-W52-70: «Αν λείπει το https://, το βάζουμε εμείς» — a link typed without a scheme gets `https://`; one with it stays as typed; an empty field is none', () => {
		expect(normalizeDoctorLink('www.example.gr')).toBe('https://www.example.gr');
		expect(normalizeDoctorLink('  facebook.com/eleni  ')).toBe('https://facebook.com/eleni');
		expect(normalizeDoctorLink('example.gr:8443/a')).toBe('https://example.gr:8443/a');
		expect(normalizeDoctorLink('https://www.example.gr')).toBe('https://www.example.gr');
		expect(normalizeDoctorLink('HTTPS://www.example.gr')).toBe('HTTPS://www.example.gr');
		expect(normalizeDoctorLink('')).toBeNull();
		expect(normalizeDoctorLink('   ')).toBeNull();
	});

	it('🔴 U-65.6 (negative): another scheme is NEVER rewritten into `https://` — it stays as typed, for the rule to refuse', () => {
		expect(normalizeDoctorLink('http://www.example.gr')).toBe('http://www.example.gr');
		expect(normalizeDoctorLink('ftp://example.gr')).toBe('ftp://example.gr');
		expect(doctorLinkRefusal('website', 'http://www.example.gr')).toBe('NOT_HTTPS');
	});
});

describe('doctorLinkRefusal (D-W52-67 / 70, U-65.6)', () => {
	it('🔴 U-211 / D-W52-70: a link of the field’s own site passes — with or without `https://`, in any case, with a path, a query or a port; an empty field is no refusal', () => {
		expect(
			refusals('website', [
				'https://www.example.gr',
				'example.gr',
				'https://example.gr:8443/path?x=1#y',
				'HTTPS://Example.GR/A',
				'https://παράδειγμα.gr',
				'https://clinic.example.co.uk/eleni',
				'',
				'   '
			])
		).toEqual(
			all(
				[
					'https://www.example.gr',
					'example.gr',
					'https://example.gr:8443/path?x=1#y',
					'HTTPS://Example.GR/A',
					'https://παράδειγμα.gr',
					'https://clinic.example.co.uk/eleni',
					'',
					'   '
				],
				null
			)
		);
		const facebook = [
			'https://www.facebook.com/eleni.pappa.example',
			'facebook.com/eleni.pappa.example',
			'https://facebook.com/eleni',
			'https://m.facebook.com/eleni',
			'https://el-gr.facebook.com/eleni',
			'https://fb.com/eleni',
			'https://WWW.Facebook.com/eleni',
			'https://www.facebook.com:443/eleni'
		];
		expect(refusals('facebook', facebook)).toEqual(all(facebook, null));
		const instagram = [
			'https://www.instagram.com/eleni.pappa.example',
			'https://instagram.com/eleni',
			'instagram.com/eleni'
		];
		expect(refusals('instagram', instagram)).toEqual(all(instagram, null));
		const linkedin = [
			'https://www.linkedin.com/in/eleni-pappa-example',
			'https://linkedin.com/in/eleni',
			'https://gr.linkedin.com/in/eleni',
			'linkedin.com/in/eleni'
		];
		expect(refusals('linkedin', linkedin)).toEqual(all(linkedin, null));
	});

	it('🔴 U-211 / D-W52-70 (negative): the host is the one `new URL()` reads, never a search in the text — `evil.com/facebook.com`, `facebook.com.evil.com` and every look-alike are NOT the network', () => {
		const facebook = [
			'https://evil.com/facebook.com',
			'https://facebook.com.evil.com',
			'https://facebook.com.evil.com/facebook.com',
			'https://evil.com/?u=https://facebook.com',
			'https://evil.com/#facebook.com',
			'https://notfacebook.com/eleni',
			'https://facebook.co/eleni',
			'https://facebook.com-login.example/eleni',
			'https://www.fb.com/eleni',
			'https://fb.me/eleni',
			'https://xfb.com/eleni',
			'https://www.instagram.com/eleni.pappa.example',
			'https://www.linkedin.com/in/eleni',
			'https://127.0.0.1/facebook.com',
			'https://localhost/facebook.com',
			'https://facebook.com./eleni',
			// A look-alike: Cyrillic «а», a full-width letter, an ideographic full stop.
			'https://f\u0430cebook.com/eleni',
			'https://\uFF46acebook.com/eleni',
			'https://facebook\u3002com/eleni'
		];
		expect(refusals('facebook', facebook)).toEqual(all(facebook, 'NOT_OF_NETWORK'));
		const instagram = [
			'https://evil.com/instagram.com',
			'https://instagram.com.evil.com',
			'https://m.instagram.com/eleni',
			'https://help.instagram.com/eleni',
			'https://instagr.am/eleni',
			'https://www.facebook.com/eleni'
		];
		expect(refusals('instagram', instagram)).toEqual(all(instagram, 'NOT_OF_NETWORK'));
		const linkedin = [
			'https://evil.com/linkedin.com',
			'https://linkedin.com.evil.com/in/eleni',
			'https://linkedin.evil.com/in/eleni',
			'https://lnkd.in/eleni',
			'https://notlinkedin.com/in/eleni'
		];
		expect(refusals('linkedin', linkedin)).toEqual(all(linkedin, 'NOT_OF_NETWORK'));
	});

	it('🔴 U-211 / D-W52-70 (negative): no name or password inside the link — `fb.com@evil.com` is refused in every field, typed with or without `https://`', () => {
		const links = [
			'https://fb.com@evil.com',
			'fb.com@evil.com',
			'https://facebook.com@evil.com/eleni',
			'https://user:pass@www.facebook.com/eleni',
			'https://user@www.example.gr',
			'https://facebook.com:secret@evil.com/',
			'https://@www.example.gr'
		];
		for (const field of DOCTOR_LINK_FIELDS) {
			expect(refusals(field, links), field).toEqual(all(links, 'HAS_CREDENTIALS'));
		}
	});

	it('🔴 U-211 / D-W52-70 (negative): only `https` — `http:` and every other scheme written whole is refused in every field', () => {
		const links = [
			'http://www.facebook.com/eleni',
			'http://www.example.gr',
			'HTTP://www.example.gr',
			'ftp://example.gr/file',
			'ws://example.gr'
		];
		for (const field of DOCTOR_LINK_FIELDS) {
			expect(refusals(field, links), field).toEqual(all(links, 'NOT_HTTPS'));
		}
	});

	it('🔴 U-65.6 (negative): what is no link is refused in every field — `javascript:` and `data:`, no host, a space, a tab, a backslash, a hidden or bidi character, `%` in the host', () => {
		const links = [
			'javascript:alert(1)',
			'data:text/html,<script>alert(1)</script>',
			'https://',
			'https:///eleni',
			'//evil.example',
			'https://exa mple.gr',
			'https://www.example.gr/a b',
			'https://www.example.gr\t/a',
			'https://www.example.gr\\@evil.example',
			'https:\\\\www.example.gr',
			'https://www.example.gr/\u200Beleni',
			'https://www.example.gr/\u202Eeleni',
			'https://www.example\u00AD.gr',
			'https://exa%6Dple.gr',
			'https://www.facebook.com%2Fevil.example/'
		];
		for (const field of DOCTOR_LINK_FIELDS) {
			expect(refusals(field, links), field).toEqual(all(links, 'NOT_A_LINK'));
		}
	});

	it('🔴 U-211 / D-W52-70 (negative): a website lives on a public name — no IP address in any writing, no `localhost`, nothing under `.local`, no name without a dot', () => {
		const links = [
			'https://127.0.0.1',
			'127.0.0.1',
			'https://192.168.1.10/admin',
			'https://10.0.0.1:8443',
			'https://2130706433',
			'https://0x7f.0.0.1',
			'https://0177.0.0.1',
			'https://[::1]/',
			'https://[::ffff:127.0.0.1]/',
			'https://[2001:db8::1]',
			'https://localhost',
			'localhost',
			'https://localhost:8080/admin',
			'https://app.localhost',
			'https://printer.local',
			'https://nas.home.local/files',
			'https://intranet',
			'https://www.example.gr.'
		];
		expect(refusals('website', links)).toEqual(all(links, 'NOT_A_PUBLIC_HOST'));
	});

	it('🔴 U-211 / D-W52-70 (negative): at most 2000 characters, counted as the link is sent (with the `https://` the page adds)', () => {
		const longest = `https://www.example.gr/${'a'.repeat(1977)}`;
		expect(longest).toHaveLength(2000);
		expect(doctorLinkRefusal('website', longest)).toBeNull();
		expect(doctorLinkRefusal('website', `${longest}a`)).toBe('TOO_LONG');
		// Typed without the scheme: the eight characters the page adds count too.
		expect(doctorLinkRefusal('website', longest.slice(8))).toBeNull();
		expect(doctorLinkRefusal('website', `${longest.slice(8)}a`)).toBe('TOO_LONG');
		for (const field of NETWORKS) {
			expect(doctorLinkRefusal(field, `https://evil.example/${'a'.repeat(2000)}`)).toBe('TOO_LONG');
		}
	});
});

describe('the words of the four fields (D-W52-70, U-140)', () => {
	it('🔴 U-211.2 (Ε1 = Α): the four fields and no other — «Ιστοσελίδα», Facebook, Instagram, LinkedIn, each with how its link starts', () => {
		expect(DOCTOR_LINK_FIELDS.map((field) => doctorLinkLabel(field, 'el'))).toEqual([
			'Ιστοσελίδα',
			'Facebook',
			'Instagram',
			'LinkedIn'
		]);
		expect(DOCTOR_LINK_FIELDS.map((field) => doctorLinkLabel(field, 'en'))).toEqual([
			'Website',
			'Facebook',
			'Instagram',
			'LinkedIn'
		]);
		expect(doctorLinkExamples).toEqual({
			website: 'https://…',
			facebook: 'https://www.facebook.com/…',
			instagram: 'https://www.instagram.com/…',
			linkedin: 'https://www.linkedin.com/in/…'
		});
		expect(doctorLinkNames('el')).toBe('Ιστοσελίδα, Facebook, Instagram, LinkedIn');
		expect(doctorLinkNames('en')).toBe('Website, Facebook, Instagram, LinkedIn');
	});

	it('🔴 U-140 / D-W52-70: the page’s words for each refusal, word for word — «Αυτός δεν είναι σύνδεσμος Facebook / Instagram / LinkedIn.», «Χρειάζεται ασφαλής σύνδεσμος (https://).», «Αυτό δεν είναι σύνδεσμος.», «Έως 2000 χαρακτήρες.»', () => {
		expect(doctorLinkRefusalText('facebook', 'NOT_OF_NETWORK', 'el')).toBe(
			'Αυτός δεν είναι σύνδεσμος Facebook.'
		);
		expect(doctorLinkRefusalText('instagram', 'NOT_OF_NETWORK', 'el')).toBe(
			'Αυτός δεν είναι σύνδεσμος Instagram.'
		);
		expect(doctorLinkRefusalText('linkedin', 'NOT_OF_NETWORK', 'el')).toBe(
			'Αυτός δεν είναι σύνδεσμος LinkedIn.'
		);
		for (const field of DOCTOR_LINK_FIELDS) {
			expect(doctorLinkRefusalText(field, 'NOT_HTTPS', 'el')).toBe(
				'Χρειάζεται ασφαλής σύνδεσμος (https://).'
			);
			expect(doctorLinkRefusalText(field, 'TOO_LONG', 'el')).toBe('Έως 2000 χαρακτήρες.');
			for (const refusal of ['NOT_A_LINK', 'HAS_CREDENTIALS', 'NOT_A_PUBLIC_HOST'] as const) {
				expect(doctorLinkRefusalText(field, refusal, 'el')).toBe('Αυτό δεν είναι σύνδεσμος.');
			}
		}
		expect(doctorLinkRefusalText('facebook', 'NOT_OF_NETWORK', 'en')).toBe(
			'This is not a Facebook link.'
		);
		expect(doctorLinkRefusalText('website', 'NOT_HTTPS', 'en')).toBe(
			'A secure link is needed (https://).'
		);
		expect(doctorLinkRefusalText('website', 'NOT_A_LINK', 'en')).toBe('This is not a link.');
		expect(doctorLinkRefusalText('website', 'TOO_LONG', 'en')).toBe('Up to 2000 characters.');
		// The form reads the same words, a set for each field.
		const messages = doctorLinkMessages('el');
		expect(Object.keys(messages)).toEqual(['website', 'facebook', 'instagram', 'linkedin']);
		expect(messages.instagram.NOT_OF_NETWORK).toBe('Αυτός δεν είναι σύνδεσμος Instagram.');
		expect(Object.keys(messages.website).sort()).toEqual([
			'HAS_CREDENTIALS',
			'NOT_A_LINK',
			'NOT_A_PUBLIC_HOST',
			'NOT_HTTPS',
			'NOT_OF_NETWORK',
			'TOO_LONG'
		]);
	});

	it('🔴 D-W52-70: a refused save that names no field — a body the server will not take, too many writes, and «δεν αποθηκεύτηκε» for the rest', () => {
		expect(doctorLinksFailureText('invalid', 'el')).toBe(
			'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τους συνδέσμους και δοκιμάστε ξανά.'
		);
		expect(doctorLinksFailureText('rate-limited', 'el')).toBe(
			'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'
		);
		for (const reason of ['conflict', 'forbidden', 'unknown'] as const) {
			expect(doctorLinksFailureText(reason, 'el')).toBe(
				'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
			);
		}
		expect(doctorLinksFailureText('invalid', 'en')).toBe(
			'The change was not saved. Check the links and try again.'
		);
	});
});

describe('what the pages hold and send (D-W52-70)', () => {
	const kept = {
		website: 'https://www.example.gr',
		facebook: null,
		instagram: null,
		linkedin: 'https://www.linkedin.com/in/eleni-pappa-example'
	};

	it('D-W52-70: the fields open with the links as the server keeps them, an empty field for none', () => {
		expect(toDoctorLinkValues(kept)).toEqual({
			website: 'https://www.example.gr',
			facebook: '',
			instagram: '',
			linkedin: 'https://www.linkedin.com/in/eleni-pappa-example'
		});
		expect(emptyDoctorLinkValues()).toEqual({
			website: '',
			facebook: '',
			instagram: '',
			linkedin: ''
		});
	});

	it('🔴 U-211 / D-W52-70: «Αποθήκευση» sends the four fields as they are made — trimmed, `https://` added, `null` for an empty one — and NOTHING while any field is refused', () => {
		expect(
			toDoctorLinks({
				website: ' www.example.gr ',
				facebook: 'facebook.com/eleni.pappa.example',
				instagram: '',
				linkedin: 'https://www.linkedin.com/in/eleni-pappa-example'
			})
		).toEqual({
			website: 'https://www.example.gr',
			facebook: 'https://facebook.com/eleni.pappa.example',
			instagram: null,
			linkedin: 'https://www.linkedin.com/in/eleni-pappa-example'
		});
		expect(toDoctorLinks(emptyDoctorLinkValues())).toEqual({
			website: null,
			facebook: null,
			instagram: null,
			linkedin: null
		});
		for (const field of DOCTOR_LINK_FIELDS) {
			expect(
				toDoctorLinks({ ...emptyDoctorLinkValues(), [field]: 'http://evil.example' }),
				field
			).toBeNull();
		}
		expect(
			toDoctorLinks({
				...emptyDoctorLinkValues(),
				website: 'https://www.example.gr',
				facebook: 'https://www.instagram.com/eleni.pappa.example'
			})
		).toBeNull();
	});

	it('🔴 D-W52-70 · U-65.6: a kept link is WRITTEN short — its host without `www.` and its path without the last slash; what is no `https` link is written as it is, never read as an address', () => {
		expect(shortDoctorLink('https://www.example.gr')).toBe('example.gr');
		expect(shortDoctorLink('https://www.example.gr/')).toBe('example.gr');
		expect(shortDoctorLink('https://www.linkedin.com/in/eleni-pappa-example')).toBe(
			'linkedin.com/in/eleni-pappa-example'
		);
		expect(shortDoctorLink('https://www.facebook.com/eleni/?ref=x#top')).toBe('facebook.com/eleni');
		expect(shortDoctorLink('javascript:alert(1)')).toBe('javascript:alert(1)');
		expect(shortDoctorLink('http://www.example.gr')).toBe('http://www.example.gr');
		expect(shortDoctorLink('<img src=x onerror=alert(1)>')).toBe('<img src=x onerror=alert(1)>');
	});

	it('🔴 U-140 / D-W52-70: the row of screen 82 — «Ιστοσελίδα · example.gr» for each field that holds a link, in the page’s order, and «2 από 4»', () => {
		expect(buildDoctorLinkLines(kept, 'el')).toEqual([
			{ field: 'website', label: 'Ιστοσελίδα', link: 'example.gr' },
			{ field: 'linkedin', label: 'LinkedIn', link: 'linkedin.com/in/eleni-pappa-example' }
		]);
		expect(
			buildDoctorLinkLines({ website: null, facebook: null, instagram: null, linkedin: null }, 'el')
		).toEqual([]);
		expect(buildDoctorLinkLines(kept, 'en')[0].label).toBe('Website');
		expect(doctorLinksCountText(2, 'el')).toBe('2 από 4');
		expect(doctorLinksCountText(4, 'el')).toBe('4 από 4');
		expect(doctorLinksCountText(1, 'en')).toBe('1 of 4');
	});
});
