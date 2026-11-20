import type { Pathname } from '$app/types';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { localizeHref } from '$paraglide/runtime';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getPageLocale } from '$shared/preferences/i18n/page-locale';
import {
	doctorArticlePath,
	doctorMenuPath,
	doctorNewArticlePath
} from '$modules/doctor-dashboard/lib/paths';
import type { DoctorArticlesLinks } from '$modules/doctor-dashboard/ui/articles';
import type { DoctorArticlesScreenData } from '../types';

/**
 * Wave 5.2 · screen 85 «Τα άρθρα μου» (D-W52-102 / 103; `/doctor/articles`, `…/new`, `…/<id>`): the page the route names,
 * its language, and every address it leads to — in the page's language and resolved here (a module knows no route):
 * «‹» to «Μενού», «+ Νέο άρθρο», one article.
 */
export function useDoctorArticlesScreen(data: () => DoctorArticlesScreenData) {
	const locale = $derived<SupportedLocale>(getPageLocale(page.url));
	const href = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);
	const links = $derived<DoctorArticlesLinks>({
		menu: href(doctorMenuPath),
		newArticle: href(doctorNewArticlePath),
		article: (articleId) => href(doctorArticlePath(articleId))
	});
	return {
		get locale() {
			return locale;
		},
		get address() {
			return data().address;
		},
		get links() {
			return links;
		}
	};
}
