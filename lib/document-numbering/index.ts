export {
  DEFAULT_DOCUMENT_NUMBERING,
  formatDocumentNumber,
  formatSequenceNumber,
  getDocumentNumberStem,
  type DocumentNumberingConfig,
} from "./format";

export {
  allocateNextDocumentNumber,
  insertDocumentNumberingIfMissing,
  normalizeDocumentNumberingDefaults,
  peekNextDocumentNumber,
  syncDocumentSequenceFromColumn,
  restoreDocumentNumberingDefaults,
  type Tx as DocumentNumberingTx,
} from "./allocate";
