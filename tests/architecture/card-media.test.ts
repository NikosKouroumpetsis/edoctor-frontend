import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/svelte';
import type { SearchResultCard } from '$modules/search-doctors/types';
import SearchDoctorCard, {
	searchDoctorCardMedia
} from '$modules/search-doctors/ui/search-doctor-card';
import CardSkeleton from '$modules/search-doctors/ui/search-results/components/card-skeleton.svelte';
import SectionSkeleton from '$modules/search-doctors/ui/discovery-home/components/section-skeleton.svelte';
import { projectRoot, stripComments } from './source-scan';

const doctor: SearchResultCard = {
	id: '1',
	doctorSlug: 'dr-1',
	name: 'Γιατρός 1',
	specialty: 'Καρδιολόγος',
	area: 'Αθήνα',
	availabilityLabel: 'Σήμερα · 17:30',
	fee: { kind: 'amount', label: 'Από 60 €' },
	ratingLabel: '4,8',
	imageUrl: null,
	description: 'Περιγραφή',
	address: 'Λεωφόρος Αλεξάνδρας 112',
	reviewCountLabel: '12',
	point: null,
	pinLabel: '60 €'
};

const ASPECT = /(?<![\w-])(aspect-[\w/]+)/gu;
/** The aspect classes a rendered node and its children draw. */
const aspectsOf = (root: Element) =>
	[
		...new Set(
			[...root.querySelectorAll('[class*="aspect-"]')].flatMap((node) =>
				[...node.className.toString().matchAll(ASPECT)].map((match) => match[1])
			)
		)
	].sort();

/** An `aspect-*` class written as a literal in a file (comments out): the shape decided outside the ONE map. */
const literalAspects = (path: string) =>
	[...stripComments(readFileSync(join(projectRoot, path), 'utf8')).matchAll(ASPECT)].map(
		(match) => match[1]
	);

const OWNERS = {
	card: 'src/modules/search-doctors/ui/search-doctor-card/page/index.svelte',
	listSkeleton: 'src/modules/search-doctors/ui/search-results/components/card-skeleton.svelte',
	railSkeleton: 'src/modules/search-doctors/ui/discovery-home/components/section-skeleton.svelte'
};

// 🔴 MINOR-5 of the architecture audit (U-29), the D13 rule: the card and the skeleton that stands for it are ONE shape.
describe('the doctor card and its skeletons share ONE photo map (D13)', () => {
	it.each(['list', 'rail'] as const)(
		'U-29 (MINOR-5, D13): the %s card’s photo and its skeleton draw the same aspect, from `searchDoctorCardMedia`',
		(variant) => {
			const card = render(SearchDoctorCard, {
				props: {
					doctor,
					variant,
					href: '/doctors/dr-1',
					profileLabel: 'Προφίλ γιατρού',
					favoriteLabel: 'Αποθήκευσε γιατρό',
					onFavorite: () => {},
					onSignIn: () => {}
				}
			});
			const cardAspects = aspectsOf(card.container);
			card.unmount();
			const skeleton = render(variant === 'list' ? CardSkeleton : SectionSkeleton);
			expect(aspectsOf(skeleton.container)).toEqual([searchDoctorCardMedia[variant].skeletonClass]);
			expect(cardAspects).toEqual([searchDoctorCardMedia[variant].skeletonClass]);
		}
	);

	it('U-29 (MINOR-5, D13, negative): none of the three writes its own aspect — the shape is the map’s alone', () => {
		for (const path of Object.values(OWNERS)) expect(literalAspects(path), path).toEqual([]);
		// The scan reads: a planted literal is found.
		expect(
			[...stripComments('<Skeleton class="aspect-4/3 w-full" />').matchAll(ASPECT)].map(
				(match) => match[1]
			)
		).toEqual(['aspect-4/3']);
	});
});
