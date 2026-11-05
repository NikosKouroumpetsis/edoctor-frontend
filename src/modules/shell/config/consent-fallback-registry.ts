import type { ConsentRegistryFacts } from '$modules/shell/api/consent';

/**
 * The catalogue used whenever the backend registry cannot be read (the application's `fallbackConsentRegistry`,
 * the same version and the same web tool): the card never asks about an empty catalogue, and the served registry
 * wins as soon as it answers.
 */
export const fallbackConsentRegistry: ConsentRegistryFacts = {
	registryVersion: '1.1.0',
	tools: [
		{
			category: 'essential',
			id: 'edoctor-api',
			platforms: ['app', 'web'],
			policyUrl: null,
			translations: {
				el: {
					title: 'Υπηρεσίες edoctor',
					description:
						'Η επικοινωνία της εφαρμογής με τους διακομιστές του edoctor για την αναζήτηση γιατρών, τα ραντεβού και την ασφάλεια του λογαριασμού σας.'
				},
				en: {
					title: 'edoctor services',
					description:
						'The app’s communication with the edoctor servers for doctor search, appointments and the security of your account.'
				}
			}
		},
		{
			// U-24.4 (D3): the results' map loads its tiles from OpenFreeMap on the web too — the application's entry, its
			// words as they are, with `web` among its platforms (the backend's registry still says `app` only: open).
			category: 'essential',
			id: 'openfreemap',
			platforms: ['app', 'web'],
			policyUrl: null,
			translations: {
				el: {
					title: 'OpenFreeMap',
					description:
						'Φορτώνει τον χάρτη που δείχνει πού βρίσκεται το ιατρείο. Ο πάροχος του χάρτη λαμβάνει τη διεύθυνση IP σας και την περιοχή του χάρτη που βλέπετε.'
				},
				en: {
					title: 'OpenFreeMap',
					description:
						'Loads the map that shows where a practice is located. The map provider receives your IP address and the map area you are viewing.'
				}
			}
		},
		{
			// `texts/texts-notes.md` §Υλοποίηση 6, the «Πολιτική cookies» 1.1.2: the backend's entry, its words as they are.
			category: 'essential',
			id: 'helpful-answers-storage',
			platforms: ['web'],
			policyUrl: null,
			translations: {
				el: {
					title: 'Μνήμη απαντήσεων «Ήταν χρήσιμο;»',
					description:
						'Αποθηκεύει στον περιηγητή σας, σε τοπική αποθήκευση, ένα τυχαίο κλειδί, ώστε να θυμόμαστε τι απαντήσατε στο «Ήταν χρήσιμο;» σε άρθρα και σε ερωτήσεις του Κέντρου βοήθειας και να μετρά μία απάντηση ανά συσκευή. Το κλειδί δεν συνδέεται με τον λογαριασμό σας ή με στοιχεία σας· ο διακομιστής μας κρατά μόνο μια μη αναστρέψιμη μορφή του (hash).'
				},
				en: {
					title: '"Was this helpful?" answer memory',
					description:
						'Stores a random key in your browser, in local storage, so that we remember what you answered to "Was this helpful?" on articles and Help Centre questions and so that one answer counts per device. The key is not linked to your account or to any of your details; our server keeps only an irreversible form of it (hash).'
				}
			}
		}
	]
};
