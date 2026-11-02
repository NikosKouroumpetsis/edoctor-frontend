import { describe, expect, it } from 'vitest';
import { sampleDoctorProfile } from '../detail.sample';
import { buildDoctorSeo, serializeJsonLd } from './index';

const CANONICAL = 'https://edoctor.example/doctors/dr-athena-papadopoulou';

describe('lib/detail seo', () => {
	it('U-28.4: «Όνομα · Ειδικότητα · Περιοχή | eDoctor», the description from the first paragraph, the canonical address, the first photo', () => {
		const seo = buildDoctorSeo({
			doctor: sampleDoctorProfile(),
			locale: 'el',
			canonicalUrl: CANONICAL
		});
		expect(seo.title).toBe('Αθηνά Παπαδοπούλου · Παθολόγος · Αθήνα | eDoctor');
		expect(seo.description).toBe('Παθολόγος με έμφαση στην πρόληψη.');
		expect(seo.canonicalUrl).toBe(CANONICAL);
		expect(seo.imageUrl).toBe('https://media.example/l/1.jpg');
	});

	it('U-28.4 / NIT-5 of r1: the `hreflang` alternates — the profile in Greek and in English, `x-default` the Greek one; none given, none drawn', () => {
		const seo = buildDoctorSeo({
			doctor: sampleDoctorProfile(),
			locale: 'en',
			canonicalUrl: 'https://edoctor.example/en/doctors/dr-athena-papadopoulou',
			alternateUrls: {
				el: CANONICAL,
				en: 'https://edoctor.example/en/doctors/dr-athena-papadopoulou'
			}
		});
		expect(seo.alternates).toEqual([
			{ hreflang: 'el', href: CANONICAL },
			{ hreflang: 'en', href: 'https://edoctor.example/en/doctors/dr-athena-papadopoulou' },
			{ hreflang: 'x-default', href: CANONICAL }
		]);
		expect(
			buildDoctorSeo({ doctor: sampleDoctorProfile(), locale: 'el', canonicalUrl: CANONICAL })
				.alternates
		).toEqual([]);
	});

	it('U-28.4: the JSON-LD `Physician` — name, medicalSpecialty, address; `aggregateRating` only for a rated doctor — U-49: on the 5 stars in halves (best 5, worst ½)', () => {
		const rated = buildDoctorSeo({
			doctor: sampleDoctorProfile(),
			locale: 'el',
			canonicalUrl: CANONICAL
		});
		expect(rated.jsonLd).toMatchObject({
			'@context': 'https://schema.org',
			'@type': 'Physician',
			name: 'Αθηνά Παπαδοπούλου',
			medicalSpecialty: 'Παθολόγος',
			address: { '@type': 'PostalAddress', addressLocality: 'Αθήνα' },
			aggregateRating: {
				'@type': 'AggregateRating',
				ratingValue: 4.9,
				reviewCount: 184,
				bestRating: 5,
				worstRating: 0.5
			}
		});
		const unrated = buildDoctorSeo({
			doctor: sampleDoctorProfile({ rating: 0, reviewCount: 0, reviewSummary: undefined }),
			locale: 'el',
			canonicalUrl: CANONICAL
		});
		expect(unrated.jsonLd).not.toHaveProperty('aggregateRating');
	});

	it('U-28.4: a doctor’s words can never close the script tag — `<`, `>`, `&` and the line separators are escaped', () => {
		const text = serializeJsonLd({
			name: `</script><script>alert(1)</script>&${String.fromCodePoint(0x2028)}`
		});
		expect(text).not.toMatch(/<|>|&/u);
		expect(text).not.toContain(String.fromCodePoint(0x2028));
		expect(JSON.parse(text)).toEqual({
			name: `</script><script>alert(1)</script>&${String.fromCodePoint(0x2028)}`
		});
	});
});
