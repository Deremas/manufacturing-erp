"use client";

import type { ReactNode } from "react";
import {
  ArrowRightLeft,
  BadgePercent,
  Banknote,
  BookText,
  Boxes,
  Building2,
  CalendarOff,
  ClipboardList,
  Clock3,
  CreditCard,
  Factory,
  FileText,
  FlaskConical,
  Landmark,
  MapPin,
  Package,
  PackageCheck,
  PackageMinus,
  Receipt,
  RotateCcw,
  Shield,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Tags,
  Truck,
  User,
  UserCog,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

import { colors } from "@/components/ui/colors";

type IconMeta = { icon: ReactNode; fg: string; bg: string };

function metaForKind(kind: string): IconMeta {
  const key = kind.trim().toLowerCase();
  switch (key) {
    case "inventory.return":
    case "procurement.return":
    case "sales.return":
      return { icon: <RotateCcw size={18} />, fg: colors.primary[700], bg: "#dff3f1" };
    case "inventory.issue":
      return { icon: <PackageMinus size={18} />, fg: "#b45309", bg: "#fef3c7" };
    case "inventory.transfer":
      return { icon: <ArrowRightLeft size={18} />, fg: "#1d4ed8", bg: "#dbeafe" };
    case "inventory.adjustment":
      return { icon: <SlidersHorizontal size={18} />, fg: "#7c3aed", bg: "#ede9fe" };
    case "inventory.requisition":
    case "procurement.pr":
      return { icon: <ClipboardList size={18} />, fg: colors.primary[700], bg: "#dff3f1" };
    case "procurement.po":
      return { icon: <ShoppingCart size={18} />, fg: "#1d4ed8", bg: "#dbeafe" };
    case "procurement.grn":
      return { icon: <PackageCheck size={18} />, fg: "#15803d", bg: "#dcfce7" };
    case "procurement.invoice":
    case "sales.invoice":
      return { icon: <Receipt size={18} />, fg: "#b45309", bg: "#fef3c7" };
    case "procurement.payment":
      return { icon: <Wallet size={18} />, fg: "#0f766e", bg: "#ccfbf1" };
    case "sales.sale":
      return { icon: <ShoppingBag size={18} />, fg: colors.primary[700], bg: "#dff3f1" };
    case "qc":
    case "qc.task":
    case "qc.record":
      return { icon: <FlaskConical size={18} />, fg: "#7c3aed", bg: "#ede9fe" };
    case "hr.employee":
      return { icon: <User size={18} />, fg: "#1d4ed8", bg: "#dbeafe" };
    case "hr.leave":
      return { icon: <CalendarOff size={18} />, fg: "#b45309", bg: "#fef3c7" };
    case "hr.overtime":
      return { icon: <Clock3 size={18} />, fg: "#0f766e", bg: "#ccfbf1" };
    case "hr.payroll":
      return { icon: <Banknote size={18} />, fg: "#15803d", bg: "#dcfce7" };
    case "accounting.journal":
      return { icon: <BookText size={18} />, fg: "#4b5563", bg: "#f3f4f6" };
    case "admin.user":
      return { icon: <UserCog size={18} />, fg: "#1d4ed8", bg: "#dbeafe" };
    case "admin.role":
      return { icon: <Shield size={18} />, fg: "#7c3aed", bg: "#ede9fe" };
    case "admin.location":
      return { icon: <MapPin size={18} />, fg: "#dc2626", bg: "#fee2e2" };
    case "md.item":
      return { icon: <Package size={18} />, fg: colors.primary[700], bg: "#dff3f1" };
    case "md.item-type":
      return { icon: <Boxes size={18} />, fg: "#1d4ed8", bg: "#dbeafe" };
    case "md.category":
      return { icon: <Tags size={18} />, fg: "#b45309", bg: "#fef3c7" };
    case "md.unit":
      return { icon: <SlidersHorizontal size={18} />, fg: "#4b5563", bg: "#f3f4f6" };
    case "md.department":
      return { icon: <Building2 size={18} />, fg: "#0f766e", bg: "#ccfbf1" };
    case "md.supplier":
      return { icon: <Truck size={18} />, fg: "#b45309", bg: "#fef3c7" };
    case "md.customer":
      return { icon: <Users size={18} />, fg: "#1d4ed8", bg: "#dbeafe" };
    case "md.bank":
      return { icon: <Landmark size={18} />, fg: "#4b5563", bg: "#f3f4f6" };
    case "md.bank-account":
      return { icon: <CreditCard size={18} />, fg: "#0f766e", bg: "#ccfbf1" };
    case "md.tax":
      return { icon: <BadgePercent size={18} />, fg: "#15803d", bg: "#dcfce7" };
    case "md.price-list":
      return { icon: <Receipt size={18} />, fg: "#7c3aed", bg: "#ede9fe" };
    case "maintenance":
    case "maintenance.wo":
    case "maintenance.asset":
      return { icon: <Wrench size={18} />, fg: "#b45309", bg: "#fef3c7" };
    case "production":
    case "shift":
      return { icon: <Factory size={18} />, fg: "#0f766e", bg: "#ccfbf1" };
    case "fleet":
      return { icon: <Truck size={18} />, fg: "#1d4ed8", bg: "#dbeafe" };
    case "finance.recon":
    case "finance.reconciliation":
      return { icon: <Landmark size={18} />, fg: "#0f766e", bg: "#ccfbf1" };
    case "finance.transfer":
      return { icon: <ArrowRightLeft size={18} />, fg: "#1d4ed8", bg: "#dbeafe" };
    default:
      return { icon: <FileText size={18} />, fg: colors.primary[700], bg: "#dff3f1" };
  }
}

export function RecordDetailIcon({
  kind,
  size = 36,
}: {
  kind: string;
  size?: number;
}) {
  const meta = metaForKind(kind);
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        backgroundColor: meta.bg,
        color: meta.fg,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {meta.icon}
    </span>
  );
}
