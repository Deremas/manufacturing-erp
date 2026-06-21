"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ItemDetailPage } from "@/features/master-data/items";
import type { Item } from "@/features/master-data/types";
import * as itemService from "@/services/master-data/itemService";

export default function ItemDetailRoutePage() {
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadItem() {
      const result = await itemService.getById(params.id as string);
      setItem(result.success ? result.data ?? null : null);
      setLoading(false);
    }

    loadItem();
  }, [params.id]);

  if (loading) {
    return <div style={{ padding: 24 }}>Loading...</div>;
  }

  if (!item) {
    return <div style={{ padding: 24 }}>Item not found</div>;
  }

  return (
    <ItemDetailPage
      item={item}
      onEdit={() => router.push(`/master-data/items/${params.id}/edit`)}
      onBack={() => router.push("/master-data/items")}
    />
  );
}
