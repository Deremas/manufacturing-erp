"use client";

import type { ReactNode } from "react";
import {
  ArrowRightLeft,
  BadgePercent,
  Boxes,
  CalendarOff,
  ClipboardCheck,
  ClipboardList,
  Factory,
  FileText,
  Filter,
  FlaskConical,
  History,
  Landmark,
  Package,
  PackageMinus,
  Receipt,
  RotateCcw,
  ShoppingCart,
  SlidersHorizontal,
  UserCog,
  Users,
  Wrench,
} from "lucide-react";

export function sectionIconForTitle(title: string, size = 16): ReactNode {
  const key = title.trim().toLowerCase();

  if (/\breturn/.test(key)) return <RotateCcw size={size} />;
  if (/\bissue/.test(key) && !/assign/.test(key)) return <PackageMinus size={size} />;
  if (/transfer/.test(key)) return <ArrowRightLeft size={size} />;
  if (/attendance|employee/.test(key)) return <Users size={size} />;
  if (/component|items?|lines?|parts?|spare/.test(key)) return <Package size={size} />;
  if (/parameter|settings?|tracking|checklist/.test(key)) return <SlidersHorizontal size={size} />;
  if (/template/.test(key)) return <ClipboardCheck size={size} />;
  if (/reading|results?|weight|qc |test |quality/.test(key)) return <FlaskConical size={size} />;
  if (/downtime/.test(key)) return <CalendarOff size={size} />;
  if (/output|production|batch|\bbom\b/.test(key)) return <Factory size={size} />;
  if (/tax/.test(key)) return <BadgePercent size={size} />;
  if (/pricing|price|cost|invoice|receipt|allocation/.test(key)) return <Receipt size={size} />;
  if (/histor|timeline/.test(key)) return <History size={size} />;
  if (/workflow|assignment/.test(key)) return <UserCog size={size} />;
  if (/bank|reconcil|statement|variance|closing/.test(key)) return <Landmark size={size} />;
  if (/inventory/.test(key)) return <Boxes size={size} />;
  if (/ticket|problem|diagnos|maintenance|work order|asset|disposition/.test(key)) {
    return <Wrench size={size} />;
  }
  if (/filter/.test(key)) return <Filter size={size} />;
  if (/order|quotation|purchas|requisition/.test(key)) return <ShoppingCart size={size} />;
  if (/summary|register|overview|header|detail|information|basic/.test(key)) {
    return <ClipboardList size={size} />;
  }
  return <FileText size={size} />;
}
