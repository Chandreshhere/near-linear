/**
 * Issue-detail constants.
 *
 * The acting user is the seeded primary user (u-yk — matches the reference
 * capture "YK"). Auth (§17) owns the session; when it lands, this is the one
 * place the issue surfaces read the actor from, so swapping the constant for
 * a session read changes every reaction, subscription and branch name at once.
 */
export const CURRENT_USER_ID = "u-yk";
