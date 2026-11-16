import type { DoctorDashboardModeView, DoctorDashboardView } from '$shared/lib/api-client';

/** The two dashboards the account may open in (D-W51-11), the contract's own enum. */
export type DoctorDashboardMode = DoctorDashboardModeView;

/** The registration's state (`registration`), the contract's. */
export type DoctorDashboardRegistration = DoctorDashboardView['registration'];

/** A licence of one category: none, in force, or ended (with its last day). */
export type DoctorDashboardLicence = {
	status: DoctorDashboardView['licences']['marketplace']['status'];
	endsAt: string | null;
};

/**
 * FACTS of «who am I as a doctor» (D-W51-10), as the server answers them for the session's own account — never an
 * email, a tax number or an id (the server sends none, and none is kept here).
 */
export type DoctorDashboardFacts = {
	registration: DoctorDashboardRegistration;
	marketplace: DoctorDashboardLicence;
	payments: DoctorDashboardLicence;
	licensed: boolean;
	notice: { kind: 'EXPIRING' | 'EXPIRED'; endsAt: string } | null;
	lastMode: DoctorDashboardMode;
	card: { firstName: string | null; lastName: string | null; specialtyName: string | null } | null;
};
