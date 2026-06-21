// Export all inventory page components
export { default as StockOverview } from "./stock/StockOverview";
export { default as BinCardsPage } from "./bin-cards/BinCardsPage";
export { default as TransfersListPage } from "./transfers/TransfersListPage";
export { default as TransferFormPage } from "./transfers/TransferFormPage";
export { default as TransferDetailPage } from "./transfers/TransferDetailPage";
export { default as AdjustmentsListPage } from "./adjustments/AdjustmentsListPage";
export { default as AdjustmentFormPage } from "./adjustments/AdjustmentFormPage";
export { default as AdjustmentDetailPage } from "./adjustments/AdjustmentDetailPage";
export { default as RequisitionsListPage } from "./requisitions/RequisitionsListPage";
export { default as RequisitionFormPage } from "./requisitions/RequisitionFormPage";
export { default as IssuesListPage } from "./issues/IssuesListPage";
export { default as IssueFormPage } from "./issues/IssueFormPage";
export { default as ReturnsListPage } from "./returns/ReturnsListPage";
export { default as ReturnFormPage } from "./returns/ReturnFormPage";
export { default as SRVCardPage } from "./srv-card/SRVCardPage";
export { default as ProductionBinCardPage } from "./production-bin-cards/ProductionBinCardPage";

// Export types
export type {
  StockBalanceView,
  BinCardEntry,
  TransferRecord,
  TransferLineItem,
  AdjustmentRecord,
  AdjustmentLineItem,
  RequisitionRecord,
  RequisitionLineItem,
  IssueVoucher,
  IssueLineItem,
  ReturnVoucher,
  ReturnLineItem,
  SRVRecord,
  ProductionBinCardEntry,
} from "./types";
