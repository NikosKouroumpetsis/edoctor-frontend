export const appEnvs = ['development', 'test', 'preview', 'production'] as const;
export const appVariants = ['development', 'preview', 'production'] as const;

export type AppEnv = (typeof appEnvs)[number];
export type AppVariant = (typeof appVariants)[number];

const isAppEnv = (value: string | undefined): value is AppEnv =>
	value === 'development' || value === 'test' || value === 'preview' || value === 'production';

const isAppVariant = (value: string | undefined): value is AppVariant =>
	value === 'development' || value === 'preview' || value === 'production';

const mode = import.meta.env.MODE;

export const appEnv: AppEnv = isAppEnv(import.meta.env.PUBLIC_APP_ENV)
	? import.meta.env.PUBLIC_APP_ENV
	: isAppEnv(mode)
		? mode
		: 'development';

export const appVariant: AppVariant = isAppVariant(import.meta.env.PUBLIC_APP_VARIANT)
	? import.meta.env.PUBLIC_APP_VARIANT
	: appEnv === 'production'
		? 'production'
		: appEnv === 'preview'
			? 'preview'
			: 'development';

export const preferencesStorageKey = `edoctor.${appEnv}.preferences.v1`;
