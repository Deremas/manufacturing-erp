"use client";

import React from "react";

import PriceListDetail from "@/features/master-data/components/PriceListDetail";
import type { PriceList, PriceListUsageRecord } from "../types";

export interface PriceListDetailPageProps {
  priceList: PriceList;
  usage?: PriceListUsageRecord[];
  currencyCode?: string;
}

export default function PriceListDetailPage({
  priceList,
  usage = [],
  currencyCode = "ETB",
}: PriceListDetailPageProps) {
  return (
    <PriceListDetail
      priceList={priceList}
      usage={usage}
      currencyCode={currencyCode}
    />
  );
}
