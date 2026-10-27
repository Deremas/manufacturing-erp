"use client";

import React from "react";

import PriceListForm from "@/features/master-data/components/PriceListForm";
import type { Customer, Location, PriceList } from "../types";
import type { SaleableItemOption } from "@/services/master-data/priceListService";

export interface PriceListFormPageProps {
  initialData?: PriceList;
  saleableItems?: SaleableItemOption[];
  customers?: Customer[];
  locations?: Location[];
  customerGroups?: string[];
  currencyCode?: string;
  currencyLabel?: string;
  mode?: "create" | "edit";
}

export default function PriceListFormPage({
  initialData,
  saleableItems = [],
  customers = [],
  locations = [],
  customerGroups = [],
  currencyCode = "ETB",
  currencyLabel = "Ethiopian Birr",
  mode,
}: PriceListFormPageProps) {
  return (
    <PriceListForm
      initialData={initialData}
      saleableItems={saleableItems}
      customers={customers}
      locations={locations}
      customerGroups={customerGroups}
      currencyCode={currencyCode}
      currencyLabel={currencyLabel}
      mode={mode ?? (initialData ? "edit" : "create")}
    />
  );
}
