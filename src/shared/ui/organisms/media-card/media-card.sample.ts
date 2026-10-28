/**
 * Sample photos and cards for the stories of the card kit: local SVG pictures only (no network), and the
 * application's words (el and en) as its card libraries format them (S-31.1 … S-31.4).
 */

/** A stand-in portrait: a coloured backdrop, a head and shoulders (never the grey no-photo silhouette). */
function portrait(backdrop: string, figure: string, accent: string): string {
	const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' preserveAspectRatio='xMidYMid slice'><path d='M0 0H400V300H0Z' fill='${backdrop}'/><circle cx='320' cy='70' r='44' fill='${accent}' fill-opacity='0.55'/><circle cx='200' cy='120' r='54' fill='${figure}'/><path d='M104 300c0-58 43-104 96-104s96 46 96 104Z' fill='${figure}'/></svg>`;
	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** A stand-in illustration of an article: shapes on a tinted page. */
function illustration(page: string, shape: string, accent: string): string {
	const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300' preserveAspectRatio='xMidYMid slice'><path d='M0 0H400V300H0Z' fill='${page}'/><path d='M0 220C90 170 170 250 260 200S400 170 400 170V300H0Z' fill='${shape}'/><circle cx='110' cy='96' r='38' fill='${accent}'/><path d='M230 60h110v18H230ZM230 96h80v18h-80Z' fill='${shape}' fill-opacity='0.6'/></svg>`;
	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Five photos of one person, for a gallery. */
export const samplePhotos = [
	portrait('#9fc5e8', '#3b5b7a', '#fff4c2'),
	portrait('#f4c7b8', '#7a3b4b', '#ffffff'),
	portrait('#b7e1cd', '#2f6b55', '#fef3c7'),
	portrait('#d9d2f3', '#4c3f8f', '#ffffff'),
	portrait('#ffe0a3', '#8a5a14', '#ffffff')
];

export const sampleArticleImages = [
	illustration('#e0ecff', '#4f7fd1', '#ffd166'),
	illustration('#fde2e4', '#c0576b', '#9bd1b1'),
	illustration('#e6f4ea', '#3f8f63', '#f6c177')
];

/** An address that does not decode, so the browser fires `error` without any request (S-32.13). */
export const brokenPhoto = 'data:image/png;base64,AA==';

/** The application's slide names: «Φωτογραφία 2 από 5». */
export const photoPosition = {
	el: (position: number, total: number) => `Φωτογραφία ${position} από ${total}`,
	en: (position: number, total: number) => `Photo ${position} of ${total}`
};

export const sampleScrollLabels = {
	el: { previous: 'Προηγούμενη φωτογραφία', next: 'Επόμενη φωτογραφία' },
	en: { previous: 'Previous photo', next: 'Next photo' }
};

export type SampleDoctor = {
	slug: string;
	name: string;
	specialty: string;
	description: string;
	city: string;
	location: string;
	availability: string;
	badge?: string;
	photos: string[];
	fee: { kind: 'amount' | 'action' | 'note'; label: string };
	online?: string;
	rating: string;
	reviews?: string;
	profileLabel: string;
	favoriteLabel: string;
};

/** The doctor cards of the home rails and the results, as the application's card library writes them. */
export const sampleDoctors: { el: SampleDoctor[]; en: SampleDoctor[] } = {
	el: [
		{
			slug: 'maria-alexiou',
			name: 'Μαρία Αλεξίου',
			specialty: 'Καρδιολόγος',
			description:
				'Πρόληψη και θεραπεία καρδιαγγειακών παθήσεων, υπερηχογράφημα καρδιάς και Holter ρυθμού.',
			city: 'Αθήνα · Αττική',
			location: '0,1 χλμ · Αθήνα · Βασιλίσσης Σοφίας 12',
			availability: 'Αύριο · 10:00',
			badge: 'Επιλογή ασθενών',
			photos: samplePhotos,
			fee: { kind: 'amount', label: 'Από 40 €' },
			online: 'Διαδικτυακή επίσκεψη',
			rating: '4,9',
			reviews: '132',
			profileLabel: 'Μαρία Αλεξίου, Καρδιολόγος',
			favoriteLabel: 'Αποθήκευσε γιατρό: Μαρία Αλεξίου'
		},
		{
			slug: 'nikos-papadopoulos',
			name: 'Νίκος Παπαδόπουλος',
			specialty: 'Παθολόγος',
			description: 'Γενική παθολογία και προληπτικοί έλεγχοι για ενήλικες.',
			city: 'Θεσσαλονίκη · Κεντρική Μακεδονία',
			location: 'Θεσσαλονίκη · Τσιμισκή 40',
			availability: 'Σήμερα',
			photos: [samplePhotos[2]],
			fee: { kind: 'action', label: 'Συνδεθείτε για κόστος' },
			rating: 'Νέο',
			profileLabel: 'Νίκος Παπαδόπουλος, Παθολόγος',
			favoriteLabel: 'Αποθήκευσε γιατρό: Νίκος Παπαδόπουλος'
		},
		{
			slug: 'eleni-georgiou',
			name: 'Ελένη Γεωργίου',
			specialty: 'Δερματολόγος',
			description: 'Κλινική και αισθητική δερματολογία, έλεγχος σπίλων.',
			city: 'Πάτρα · Δυτική Ελλάδα',
			location: 'Πάτρα · Μαιζώνος 101',
			availability: 'Επόμενες 3 ημέρες',
			photos: [],
			fee: { kind: 'note', label: 'Επικοινωνία για κόστος' },
			online: 'Διαδικτυακή επίσκεψη',
			rating: '4,6',
			reviews: '18',
			profileLabel: 'Ελένη Γεωργίου, Δερματολόγος',
			favoriteLabel: 'Αποθήκευσε γιατρό: Ελένη Γεωργίου'
		}
	],
	en: [
		{
			slug: 'maria-alexiou',
			name: 'Maria Alexiou',
			specialty: 'Cardiologist',
			description:
				'Prevention and treatment of heart disease, echocardiography and Holter monitoring.',
			city: 'Athens · Attica',
			location: '0.1 km · Athens · Vasilissis Sofias 12',
			availability: 'Tomorrow · 10:00',
			badge: 'Patient favorite',
			photos: samplePhotos,
			fee: { kind: 'amount', label: 'From €40' },
			online: 'Online consultation',
			rating: '4.9',
			reviews: '132',
			profileLabel: 'Maria Alexiou, Cardiologist',
			favoriteLabel: 'Save doctor: Maria Alexiou'
		},
		{
			slug: 'nikos-papadopoulos',
			name: 'Nikos Papadopoulos',
			specialty: 'Internist',
			description: 'General internal medicine and check-ups for adults.',
			city: 'Thessaloniki · Central Macedonia',
			location: 'Thessaloniki · Tsimiski 40',
			availability: 'Today',
			photos: [samplePhotos[2]],
			fee: { kind: 'action', label: 'Sign in for pricing' },
			rating: 'New',
			profileLabel: 'Nikos Papadopoulos, Internist',
			favoriteLabel: 'Save doctor: Nikos Papadopoulos'
		},
		{
			slug: 'eleni-georgiou',
			name: 'Eleni Georgiou',
			specialty: 'Dermatologist',
			description: 'Clinical and aesthetic dermatology, mole checks.',
			city: 'Patras · Western Greece',
			location: 'Patras · Maizonos 101',
			availability: 'Next 3 days',
			photos: [],
			fee: { kind: 'note', label: 'Contact for pricing' },
			online: 'Online consultation',
			rating: '4.6',
			reviews: '18',
			profileLabel: 'Eleni Georgiou, Dermatologist',
			favoriteLabel: 'Save doctor: Eleni Georgiou'
		}
	]
};

export type SampleArticle = {
	slug: string;
	title: string;
	type: string;
	meta: string;
	excerpt: string;
	image: string;
	openLabel: string;
	readLabel: string;
};

/** The article cards of the home rail (framed), as the application's article card writes them. */
export const sampleArticles: SampleArticle[] = [
	{
		slug: 'heart-health',
		title: 'Πέντε καθημερινές συνήθειες για μια υγιή καρδιά',
		type: 'Οδηγός',
		meta: '12 Οκτ 2026 · Μαρία Αλεξίου',
		excerpt: 'Μικρές αλλαγές στη διατροφή, στην κίνηση και στον ύπνο που κάνουν μεγάλη διαφορά.',
		image: sampleArticleImages[0],
		openLabel: 'Ανοίξτε το άρθρο Πέντε καθημερινές συνήθειες για μια υγιή καρδιά',
		readLabel: 'Διαβάστε'
	},
	{
		slug: 'skin-summer',
		title: 'Το δέρμα μετά το καλοκαίρι',
		type: 'Άρθρο',
		meta: '3 Οκτ 2026',
		excerpt: 'Τι να προσέξετε στους σπίλους και πότε να κλείσετε έλεγχο.',
		image: sampleArticleImages[1],
		openLabel: 'Ανοίξτε το άρθρο Το δέρμα μετά το καλοκαίρι',
		readLabel: 'Διαβάστε'
	}
];
