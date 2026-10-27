"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import type { PublicRouteKey } from "./registry";
import { publicEditUrl, publicListUrl } from "./urls";

export function PublicRecordNav({
  routeKey,
  publicId,
  children,
}: {
  routeKey: PublicRouteKey;
  publicId: number;
  children: (nav: { onEdit: () => void; onBack: () => void }) => ReactNode;
}) {
  const router = useRouter();
  return (
    <>
      {children({
        onEdit: () => router.push(publicEditUrl(routeKey, publicId)),
        onBack: () => router.push(publicListUrl(routeKey)),
      })}
    </>
  );
}
