/**
 * Clerk's Replit-managed instance has first_name / last_name disabled at the
 * attribute level, so user.update({ firstName }) throws "not a valid parameter".
 * We store them in unsafeMetadata instead and read back with a fallback to the
 * Clerk field (which Google / GitHub OAuth may still populate automatically).
 */

import type { UserResource } from "@clerk/types";

export function getUserFirstName(user: UserResource | null | undefined): string {
  return (user?.unsafeMetadata?.firstName as string | undefined)
    || user?.firstName
    || "";
}

export function getUserLastName(user: UserResource | null | undefined): string {
  return (user?.unsafeMetadata?.lastName as string | undefined)
    || user?.lastName
    || "";
}

export function getUserFullName(user: UserResource | null | undefined): string {
  return [getUserFirstName(user), getUserLastName(user)].filter(Boolean).join(" ");
}

/** Save first/last name to unsafeMetadata (always writable). */
export async function saveUserName(
  user: UserResource,
  firstName: string,
  lastName: string,
) {
  await user.update({
    unsafeMetadata: {
      ...user.unsafeMetadata,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    },
  });
}
