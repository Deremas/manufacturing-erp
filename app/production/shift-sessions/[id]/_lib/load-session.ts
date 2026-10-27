import { notFound, redirect } from "next/navigation";

import { isPublicIdParam } from "@/lib/routing/public-id";
import { getShiftSessionById } from "@/services/shift/shift-session.service";

export function shiftPublicPath(publicId: number, suffix = "") {
  return `/production/shift-sessions/${publicId}${suffix}`;
}

export async function loadShift(id: string, suffix = "") {
  const session = await getShiftSessionById(id);
  if (!session) notFound();
  if (!isPublicIdParam(id)) {
    redirect(shiftPublicPath(session.publicId, suffix));
  }
  return session;
}

export async function redirectLegacyShift(id: string, suffix = "") {
  const session = await getShiftSessionById(id);
  if (!session) notFound();
  redirect(shiftPublicPath(session.publicId, suffix));
}
