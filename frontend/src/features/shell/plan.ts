/*
 * Plan usage shown in the top bar and the profile menu. Static until billing
 * exists; one constant so the two never disagree.
 */
export const FREE_MEETINGS = { left: 3, total: 3 } as const;
export const STORAGE_MINUTES = { used: 0, total: 400 } as const;
