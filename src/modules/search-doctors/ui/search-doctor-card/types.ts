/**
 * The doctor card's two placements (U-24.1: ONE component): `rail` the home's U-20 card (1:1 photo, four lines),
 * `list` the results' card (4:3 photo and the application's list facts: description, full address, reviews).
 */
export type SearchDoctorCardVariant = 'rail' | 'list';

/**
 * Where the card says the specialty: `lines` where the search and the home approved it (wave 1), `top` the bold first
 * line over the name, once — 🔴 U-83.2 / U-85.2 Ε1: only inside the favourites.
 */
export type SearchDoctorCardSpecialtyPlacement = 'lines' | 'top';
