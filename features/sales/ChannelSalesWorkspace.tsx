"use client";

import { publicEditUrl, publicPrintUrl, publicViewUrl } from "@/lib/routing/urls";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import EmptyState from "@/components/shared/EmptyState";
import FormCard from "@/components/shared/FormCard";
import { FormattedNumberInput } from "@/components/shared/FormattedNumberInput";
import PageHeader from "@/components/shared/PageHeader";
import { colors } from "@/components/ui/colors";
import type { Location } from "@/features/administration/types";
import type { FleetTrip, Vehicle } from "@/features/fleet/types";
import type { BankAccount, Customer } from "@/features/master-data/types";
import { formatCurrency } from "@/lib/utils/cn";

type PaymentMethod = "CASH" | "BANK" | "CHEQUE" | "MOBILE_MONEY";

type CatalogItem = {
  id: string;
  itemCode: string;
  itemName: string;
  unitId?: string;
  uomCode?: string;
  uomName?: string;
  label: string;
  availableQty: number;
  unitPrice: number | null;
  currency: string;
  channel: string;
  priceListId?: string;
  priceListItemId?: string;
  priceListCode?: string;
  priceListName?: string;
  priceMissing: boolean;
  priceError?: string;
};

type CatalogResponse = {
  channel: string;
  currency: string;
  items: CatalogItem[];
};

type CartLine = {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unitId?: string;
  uomLabel: string;
  quantity: number;
  availableQty: number;
  unitPrice: number;
  lineTotal: number;
  priceListId: string;
  priceListItemId: string;
  priceListCode?: string;
};

type PostSaleResponse = {
  item: {
    id: string;
    saleNo: string;
    totalAmount: number;
    currency: string;
    channel: string;
    lineCount: number;
  };
};

type ChannelWorkspaceConfig = {
  title?: string;
  subtitle?: string;
  contextTitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  forcedChannel?: string;
  postEndpoint?: string;
  emptyCartMessage?: string;
  emptyCatalogMessage?: string;
  postActionLabel?: string;
  customerLabel?: string;
  customerEmptyLabel?: string;
  historyHref?: string;
  vehicles?: Vehicle[];
  trips?: FleetTrip[];
};

const shellStyle: React.CSSProperties = {
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 24,
  background: "#f8fafc",
};

const topGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

const workspaceStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.65fr) minmax(360px, 0.95fr)",
  gap: 24,
  alignItems: "start",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 700,
  color: "#667085",
  marginBottom: 8,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 48,
  borderRadius: 14,
  border: "1px solid #94a3b8",
  padding: "0 14px",
  fontSize: 16,
  color: "#1f2937",
  background: "#ffffff",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 92,
  height: 92,
  paddingTop: 12,
  paddingBottom: 12,
  resize: "vertical",
} as React.CSSProperties;

const infoChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "8px 12px",
  borderRadius: 999,
  background: "#ecfdf3",
  color: "#027a48",
  fontSize: 13,
  fontWeight: 700,
};

const mutedChipStyle: React.CSSProperties = {
  ...infoChipStyle,
  background: "#eff6ff",
  color: "#175cd3",
};

const warningStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 12,
  background: "#fff7ed",
  color: "#c2410c",
  fontSize: 14,
  border: "1px solid #fdba74",
};

const successStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 12,
  background: "#ecfdf3",
  color: "#027a48",
  fontSize: 14,
  border: "1px solid #86efac",
};

const productGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: 16,
};

const productCardStyle: React.CSSProperties = {
  border: "1px solid #e4e7ec",
  borderRadius: 18,
  padding: 18,
  background: "#ffffff",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  boxShadow: "0 4px 16px rgba(15, 23, 42, 0.04)",
};

const cartLineStyle: React.CSSProperties = {
  border: "1px solid #e4e7ec",
  borderRadius: 16,
  padding: 14,
  background: "#ffffff",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const smallGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
  gap: 12,
  alignItems: "end",
};

const addButtonStyle: React.CSSProperties = {
  height: 42,
  borderRadius: 12,
  border: `1px solid ${colors.primary[300]}`,
  background: "#d8f3f0",
  color: colors.primary[800],
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
  height: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: "none",
  background: colors.primary[700],
  color: "#ffffff",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  background: "#ffffff",
  color: "#344054",
  border: "1px solid #d0d5dd",
};

const dangerButtonStyle: React.CSSProperties = {
  ...secondaryButtonStyle,
  color: "#d92d20",
  border: "1px solid #fda29b",
  background: "#fef3f2",
  height: 42,
};

const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
  { value: "CASH", label: "Cash" },
  { value: "BANK", label: "Bank" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "MOBILE_MONEY", label: "Mobile Money" },
];

function buildUomLabel(item: {
  uomCode?: string;
  uomName?: string;
}) {
  if (item.uomCode && item.uomName) {
    return `${item.uomCode} - ${item.uomName}`;
  }
  return item.uomName || item.uomCode || "";
}

function deriveInitialLocation(locations: Location[]) {
  return (
    locations.find((location) => location.isActive && location.locationType?.toUpperCase().includes("FACTORY"))?.id
    ?? locations.find((location) => location.isActive)?.id
    ?? ""
  );
}

export function ChannelSalesWorkspace({
  locations,
  customers,
  bankAccounts,
  currencyCode,
  currencyLabel,
  title = "Point of Sale",
  subtitle = "Real finished-goods sales workspace with live price resolution, inventory issue, and finance posting",
  contextTitle = "POS Context",
  breadcrumbs = [
    { label: "Sales", href: "/sales" },
    { label: "Point of Sale" },
  ],
  forcedChannel,
  postEndpoint = "/api/sales/pos",
  emptyCartMessage = "Add finished goods from the left panel to build a real posted sale.",
  emptyCatalogMessage = "Create active finished-goods prices first, then they will appear here for selling.",
  postActionLabel = "Post Sale",
  customerLabel = "Customer",
  customerEmptyLabel = "Walk-in customer",
  historyHref = "/sales/history",
  vehicles = [],
  trips = [],
}: {
  locations: Location[];
  customers: Customer[];
  bankAccounts: BankAccount[];
  currencyCode: string;
  currencyLabel: string;
} & ChannelWorkspaceConfig) {
  const [saleDate, setSaleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [locationId, setLocationId] = useState(() => deriveInitialLocation(locations));
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [bankAccountId, setBankAccountId] = useState("");
  const [truckId, setTruckId] = useState("");
  const [tripId, setTripId] = useState("");
  const [routeName, setRouteName] = useState("");
  const [notes, setNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [channel, setChannel] = useState("FACTORY");
  const [resolvedCurrency, setResolvedCurrency] = useState(currencyCode);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [lastPostedSale, setLastPostedSale] = useState<{ id: string; saleNo: string } | null>(null);

  const activeChannel = forcedChannel || channel;
  const isTruckChannel = activeChannel === "TRUCK";
  const isAgentChannel = activeChannel === "AGENT";
  const filteredTrips = useMemo(
    () => trips.filter((trip) => trip.isActive && (!truckId || trip.vehicleId === truckId)),
    [trips, truckId],
  );
  const selectedTrip = useMemo(
    () => filteredTrips.find((trip) => trip.id === tripId) ?? trips.find((trip) => trip.id === tripId) ?? null,
    [filteredTrips, tripId, trips],
  );

  useEffect(() => {
    if (!saleDate || !locationId) {
      setCatalog([]);
      return;
    }

    let alive = true;
    const query = new URLSearchParams({
      saleDate,
      locationId,
    });
    if (forcedChannel) {
      query.set("channel", forcedChannel);
    }

    if (customerId) {
      query.set("customerId", customerId);
      if (isAgentChannel) {
        query.set("agentId", customerId);
      }
    }

    setCatalogLoading(true);
    setCatalogError("");

    void fetch(`/api/sales/catalog?${query.toString()}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as CatalogResponse & { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load POS catalog");
        }
        return payload;
      })
      .then((payload) => {
        if (!alive) {
          return;
        }

        setChannel(payload.channel);
        setResolvedCurrency(payload.currency || currencyCode);
        setCatalog(payload.items);
        setCart((current) =>
          current.map((line) => {
            const refreshed = payload.items.find((item) => item.id === line.itemId);
            if (!refreshed || refreshed.unitPrice == null || refreshed.priceMissing) {
              return {
                ...line,
                availableQty: refreshed?.availableQty ?? line.availableQty,
              };
            }

            return {
              ...line,
              availableQty: refreshed.availableQty,
              unitPrice: refreshed.unitPrice,
              lineTotal: Number((refreshed.unitPrice * line.quantity).toFixed(2)),
              priceListId: refreshed.priceListId ?? line.priceListId,
              priceListItemId: refreshed.priceListItemId ?? line.priceListItemId,
              priceListCode: refreshed.priceListCode ?? line.priceListCode,
              unitId: refreshed.unitId ?? line.unitId,
              uomLabel: buildUomLabel(refreshed),
            };
          }),
        );
      })
      .catch((error) => {
        if (!alive) {
          return;
        }
        setCatalog([]);
        setCatalogError(error instanceof Error ? error.message : "Failed to load POS catalog");
      })
      .finally(() => {
        if (alive) {
          setCatalogLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [currencyCode, customerId, forcedChannel, isAgentChannel, locationId, saleDate]);

  useEffect(() => {
    if (!selectedTrip) {
      return;
    }

    if (selectedTrip.vehicleId && selectedTrip.vehicleId !== truckId) {
      setTruckId(selectedTrip.vehicleId);
    }
    if (selectedTrip.routeName && selectedTrip.routeName !== routeName) {
      setRouteName(selectedTrip.routeName);
    }
  }, [routeName, selectedTrip, truckId]);

  const filteredCatalog = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) {
      return catalog;
    }

    return catalog.filter((item) =>
      `${item.itemCode} ${item.itemName} ${item.uomCode ?? ""} ${item.uomName ?? ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [catalog, searchTerm]);

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.lineTotal, 0),
    [cart],
  );

  const selectedLocation = useMemo(
    () => locations.find((entry) => entry.id === locationId) ?? null,
    [locations, locationId],
  );

  function addToCart(item: CatalogItem) {
    if (item.priceMissing || item.unitPrice == null) {
      return;
    }

    const resolvedPrice = item.unitPrice;

    setSubmitError("");
    setSubmitSuccess("");
    setCart((current) => {
      const existing = current.find((line) => line.itemId === item.id);
      if (existing) {
        return current.map((line) => {
          if (line.itemId !== item.id) {
            return line;
          }

          const nextQuantity = Math.min(line.quantity + 1, Math.max(item.availableQty, 1));
          return {
            ...line,
            quantity: nextQuantity,
            availableQty: item.availableQty,
            unitPrice: resolvedPrice,
            lineTotal: Number((nextQuantity * resolvedPrice).toFixed(2)),
          };
        });
      }

      return [
        ...current,
        {
          id: `${item.id}-${Date.now()}`,
          itemId: item.id,
          itemCode: item.itemCode,
          itemName: item.itemName,
          unitId: item.unitId,
          uomLabel: buildUomLabel(item),
          quantity: 1,
          availableQty: item.availableQty,
          unitPrice: resolvedPrice,
          lineTotal: Number(resolvedPrice.toFixed(2)),
          priceListId: item.priceListId ?? "",
          priceListItemId: item.priceListItemId ?? "",
          priceListCode: item.priceListCode,
        },
      ];
    });
  }

  function updateCartQuantity(lineId: string, nextQuantity: number) {
    setCart((current) =>
      current.map((line) => {
        if (line.id !== lineId) {
          return line;
        }

        const boundedQuantity =
          Number.isFinite(nextQuantity) && nextQuantity > 0
            ? Math.min(nextQuantity, Math.max(line.availableQty, 1))
            : 1;

        return {
          ...line,
          quantity: boundedQuantity,
          lineTotal: Number((boundedQuantity * line.unitPrice).toFixed(2)),
        };
      }),
    );
  }

  async function postSale() {
    if (!locationId) {
      setSubmitError("Select a sales location before posting.");
      return;
    }
    if (isTruckChannel && !truckId) {
      setSubmitError("Select a truck before posting a truck sale.");
      return;
    }
    if (isAgentChannel && !customerId) {
      setSubmitError("Select an agent customer before posting an agent sale.");
      return;
    }
    if (!cart.length) {
      setSubmitError("Add at least one priced item to the cart.");
      return;
    }
    if ((paymentMethod === "BANK" || paymentMethod === "CHEQUE" || paymentMethod === "MOBILE_MONEY") && !bankAccountId) {
      setSubmitError("Select a bank account for the chosen payment method.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setSubmitSuccess("");
    setLastPostedSale(null);

    try {
      const response = await fetch(postEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          saleDate,
          locationId,
          customerId: customerId || null,
          agentId: isAgentChannel ? customerId || null : null,
          truckId: isTruckChannel ? truckId || null : null,
          tripId: isTruckChannel ? tripId || null : null,
          routeName: isTruckChannel ? routeName || null : null,
          channel: forcedChannel || null,
          paymentMethod,
          bankAccountId: bankAccountId || null,
          notes: notes || null,
          lines: cart.map((line) => ({
            itemId: line.itemId,
            quantity: line.quantity,
          })),
        }),
      });

      const payload = await response.json() as PostSaleResponse & { error?: string };
      if (!response.ok || !payload.item) {
        throw new Error(payload.error || "Failed to post sale");
      }

      setSubmitSuccess(
        `Sale ${payload.item.saleNo} posted successfully. Inventory was issued and finance posting was created for ${formatCurrency(payload.item.totalAmount, payload.item.currency)}.`,
      );
      setLastPostedSale({ id: payload.item.id, saleNo: payload.item.saleNo });
      setCart([]);
      setNotes("");

      const query = new URLSearchParams({
        saleDate,
        locationId,
      });
      if (forcedChannel) {
        query.set("channel", forcedChannel);
      }
      if (customerId) {
        query.set("customerId", customerId);
        if (isAgentChannel) {
          query.set("agentId", customerId);
        }
      }
      const refreshed = await fetch(`/api/sales/catalog?${query.toString()}`, { cache: "no-store" });
      const refreshedPayload = await refreshed.json() as CatalogResponse;
      if (refreshed.ok) {
        setCatalog(refreshedPayload.items);
        setChannel(refreshedPayload.channel);
        setResolvedCurrency(refreshedPayload.currency || currencyCode);
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to post sale");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={shellStyle}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        actions={(
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href={historyHref}
              style={{
                height: 38,
                padding: "0 14px",
                borderRadius: 999,
                border: "1px solid #d0d5dd",
                background: "#ffffff",
                color: "#344054",
                display: "inline-flex",
                alignItems: "center",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Posted Sales
            </Link>
            <span style={mutedChipStyle}>
              Currency: {resolvedCurrency} ({currencyLabel})
            </span>
            <span style={infoChipStyle}>Channel: {channel}</span>
          </div>
        )}
      />

      <FormCard title={contextTitle} variant="teal-header">
        <div style={topGridStyle}>
          <div>
            <label style={labelStyle}>Sale Date</label>
            <input
              type="date"
              style={inputStyle}
              value={saleDate}
              onChange={(event) => setSaleDate(event.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Sales Location</label>
            <select
              style={inputStyle}
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
            >
              <option value="">Select ...</option>
              {locations.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.locationCode} - {entry.locationName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>{customerLabel}</label>
            <select
              style={inputStyle}
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
            >
              <option value="">{customerEmptyLabel}</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.customerCode} - {customer.name}
                </option>
              ))}
            </select>
          </div>
          {isTruckChannel ? (
            <div>
              <label style={labelStyle}>Truck</label>
              <select
                style={inputStyle}
                value={truckId}
                onChange={(event) => setTruckId(event.target.value)}
              >
                <option value="">Select ...</option>
                {vehicles.filter((entry) => entry.isActive).map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.vehicleCode} - {entry.plateNumber}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {isTruckChannel ? (
            <div>
              <label style={labelStyle}>Trip</label>
              <select
                style={inputStyle}
                value={tripId}
                onChange={(event) => setTripId(event.target.value)}
              >
                <option value="">Select ...</option>
                {filteredTrips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.tripNo} - {trip.routeName}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <label style={labelStyle}>Payment Method</label>
            <select
              style={inputStyle}
              value={paymentMethod}
              onChange={(event) => {
                const next = event.target.value as PaymentMethod;
                setPaymentMethod(next);
                if (next === "CASH") {
                  setBankAccountId("");
                }
              }}
            >
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>
          {isTruckChannel ? (
            <div>
              <label style={labelStyle}>Route</label>
              <input
                style={inputStyle}
                value={routeName}
                onChange={(event) => setRouteName(event.target.value)}
                placeholder="Route or dispatch note"
              />
            </div>
          ) : null}
          {paymentMethod !== "CASH" ? (
            <div>
              <label style={labelStyle}>Bank Account</label>
              <select
                style={inputStyle}
                value={bankAccountId}
                onChange={(event) => setBankAccountId(event.target.value)}
              >
                <option value="">Select ...</option>
                {bankAccounts
                  .filter((account) => account.isActive)
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.accountCode} - {account.accountName}
                    </option>
                  ))}
              </select>
            </div>
          ) : null}
          <div>
            <label style={labelStyle}>Search Product</label>
            <input
              style={inputStyle}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Code, name, or UOM"
            />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={labelStyle}>Sale Notes</label>
          <textarea
            style={textareaStyle}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional cashier notes or receipt memo"
          />
        </div>
      </FormCard>

      {submitError ? <div style={warningStyle}>{submitError}</div> : null}
      {submitSuccess ? (
        <div style={successStyle}>
          <div>{submitSuccess}</div>
          {lastPostedSale ? (
            <div style={{ marginTop: 8 }}>
              <Link
                href={publicViewUrl("sales.sale", lastPostedSale.publicId)}
                style={{ color: "#027a48", fontWeight: 800, textDecoration: "underline" }}
              >
                View {lastPostedSale.saleNo}
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={workspaceStyle}>
        <FormCard title="Products">
          {!locationId ? (
            <EmptyState
              title="Choose a sales location"
              message="The product catalog resolves prices and available stock from the selected sales location."
            />
          ) : catalogLoading ? (
            <EmptyState title="Loading product catalog" message="Resolving price list and available stock..." />
          ) : catalogError ? (
            <div style={warningStyle}>{catalogError}</div>
          ) : !filteredCatalog.length ? (
            <EmptyState
              title="No saleable products found"
              message={emptyCatalogMessage}
            />
          ) : (
            <div style={productGridStyle}>
              {filteredCatalog.map((item) => {
                const canAdd = !item.priceMissing && item.unitPrice != null && item.availableQty > 0;
                return (
                  <div key={item.id} style={productCardStyle}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#0f766e", marginBottom: 8 }}>
                        {item.itemCode}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#101828", lineHeight: 1.3 }}>
                        {item.itemName}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 14, color: "#667085" }}>
                        {buildUomLabel(item)}
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}>
                      <span style={{ color: "#667085" }}>Available</span>
                      <strong style={{ color: item.availableQty > 0 ? "#027a48" : "#d92d20" }}>
                        {item.availableQty.toFixed(2)}
                      </strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}>
                      <span style={{ color: "#667085" }}>Price</span>
                      <strong style={{ color: "#101828" }}>
                        {item.unitPrice == null ? "No active price" : formatCurrency(item.unitPrice, resolvedCurrency)}
                      </strong>
                    </div>
                    <div style={{ fontSize: 13, color: "#667085", minHeight: 38 }}>
                      {item.priceMissing
                        ? item.priceError || "No active price found for this item/channel/date."
                        : `${item.priceListCode || "Price list"}${item.priceListName ? ` - ${item.priceListName}` : ""}`}
                    </div>

                    <button
                      type="button"
                      style={{
                        ...addButtonStyle,
                        opacity: canAdd ? 1 : 0.55,
                        cursor: canAdd ? "pointer" : "not-allowed",
                      }}
                      disabled={!canAdd}
                      onClick={() => addToCart(item)}
                    >
                      {item.priceMissing
                        ? "No Price"
                        : item.availableQty <= 0
                          ? "Out of Stock"
                          : "Add to Cart"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </FormCard>

        <FormCard
          title="Cart"
          footer={{
            actions: (
              <div style={{ display: "flex", width: "100%", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: "#667085" }}>
                  <span>Subtotal</span>
                  <strong style={{ color: "#101828" }}>{formatCurrency(subtotal, resolvedCurrency)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 800, color: "#101828" }}>
                  <span>Grand Total</span>
                  <span>{formatCurrency(subtotal, resolvedCurrency)}</span>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    onClick={() => {
                      setCart([]);
                      setSubmitError("");
                      setSubmitSuccess("");
                    }}
                  >
                    Clear Cart
                  </button>
                  <button
                    type="button"
                    style={{ ...primaryButtonStyle, opacity: submitting ? 0.7 : 1 }}
                    disabled={submitting || cart.length === 0}
                    onClick={() => void postSale()}
                  >
                    {submitting ? `${postActionLabel.replace("Post", "Posting")}...` : postActionLabel}
                  </button>
                </div>
              </div>
            ),
          }}
        >
          {!cart.length ? (
            <EmptyState
              title="Cart is empty"
              message={emptyCartMessage}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {cart.map((line) => (
                <div key={line.id} style={cartLineStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#0f766e" }}>{line.itemCode}</div>
                      <div style={{ marginTop: 4, fontSize: 17, fontWeight: 700, color: "#101828" }}>{line.itemName}</div>
                      <div style={{ marginTop: 4, fontSize: 13, color: "#667085" }}>
                        {line.uomLabel} · {line.priceListCode || "Price list snapshot"}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="erp-remove-row-btn"
                      style={dangerButtonStyle}
                      onClick={() => setCart((current) => current.filter((entry) => entry.id !== line.id))}
                    >
                      X
                    </button>
                  </div>

                  <div style={smallGridStyle}>
                    <div>
                      <label style={labelStyle}>Quantity</label>
                      <FormattedNumberInput
                        style={inputStyle}
                        decimals={0}
                        min={1}
                        value={line.quantity}
                        onChange={(nextValue) => updateCartQuantity(line.id, nextValue)}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Available</label>
                      <input
                        style={{ ...inputStyle, background: "#f8fafc" }}
                        value={line.availableQty.toFixed(2)}
                        readOnly
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Unit Price</label>
                      <input
                        style={{ ...inputStyle, background: "#f8fafc" }}
                        value={formatCurrency(line.unitPrice, resolvedCurrency)}
                        readOnly
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Line Total</label>
                      <input
                        style={{ ...inputStyle, background: "#f8fafc" }}
                        value={formatCurrency(line.lineTotal, resolvedCurrency)}
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </FormCard>
      </div>

      {!selectedLocation ? (
        <div style={warningStyle}>Select a valid location to begin selling.</div>
      ) : null}
    </div>
  );
}

export function PointOfSalePricingWorkspace(props: {
  locations: Location[];
  customers: Customer[];
  bankAccounts: BankAccount[];
  currencyCode: string;
  currencyLabel: string;
}) {
  return <ChannelSalesWorkspace {...props} />;
}
