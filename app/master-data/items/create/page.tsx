"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ItemFormPage } from "@/features/master-data/items";
import type { Item } from "@/features/master-data/types";
import type { CreateItemInput } from "@/types/master-data";
import * as itemService from "@/services/master-data/itemService";
import { publicViewUrl } from "@/lib/routing/urls";

export default function CreateItemPage() {
  const router = useRouter();

  const handleSubmit = async (data: Partial<Item>) => {
    const result = await itemService.create(data as CreateItemInput);
    if (!result.success) {
      alert(result.error || "Failed to create item");
      return;
    }
    router.push(
      result.data?.publicId
        ? publicViewUrl("master-data.item", result.data.publicId)
        : "/master-data/items",
    );
  };

  return <ItemFormPage onSubmit={handleSubmit} />;
}
