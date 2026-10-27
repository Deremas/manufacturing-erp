"use client";

import { publicEditUrl, publicPrintUrl, publicViewUrl } from "@/lib/routing/urls";

import { Fragment, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Printer } from "lucide-react";

import { ActionButtons, EmptyState, FormCard, FormattedNumberInput, LineItemsGrid, LineItemsGridRow, LineItemsGridSpan, PageHeader, RemarksWithRemoveCell, StatusBadge } from "@/components/shared";
import type { Action } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import type { Location } from "@/features/administration/types";
import type { Customer } from "@/features/master-data/types";
import type { FleetDriver, FleetTrip, Vehicle } from "@/features/fleet/types";
import { blankOrRemoveRow } from "@/lib/forms/line-rows";
import { formatCurrency } from "@/lib/utils/cn";
import type {
  LoadingOrderDetail,
  LoadingOrderStatus,
  LoadingOrderSummary,
} from "@/services/sales/loading-order.service";
import type { BadgeVariant } from "@/components/ui/badges";

type LoadingChannel = "FACTORY" | "BRANCH" | "AGENT" | "TRUCK";

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

type LoadingFormLine = {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unitId?: string;
  uomCode?: string;
  uomName?: string;
  availableQty: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  priceListId?: string;
  priceListItemId?: string;
  priceListCode?: string;
  remarks: string;
};

const shellStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
  padding: 24,
  background: "#f8fafc",
};

const cardGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 16,
};

const metricCardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 18,
  padding: "18px 20px",
  border: "1px solid #e4e7ec",
  boxShadow: "0 6px 20px rgba(15, 23, 42, 0.04)",
};

const fieldGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const labelStyle: React.CSSProperties = {
  color: colors.text.secondary,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: radius.components.input,
  backgroundColor: "#ffffff",
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
  boxSizing: "border-box",
};

const readonlyInputStyle: React.CSSProperties = {
  ...inputStyle,
  backgroundColor: "#f8fafc",
};

const tableScrollStyle: React.CSSProperties = {
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  paddingBottom: 8,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const loadingLineGridTemplate =
  "minmax(220px, 2fr) minmax(140px, 1fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(140px, 1fr) 40px";

const tableHeaderStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 2fr) minmax(140px, 1fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(140px, 1fr) minmax(200px, 260px)",
  gap: 12,
  minWidth: 1040,
  padding: "0 4px 10px",
  color: colors.text.secondary,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 2fr) minmax(140px, 1fr) minmax(120px, 1fr) minmax(120px, 1fr) minmax(140px, 1fr) minmax(200px, 260px)",
  gap: 12,
  minWidth: 1040,
  alignItems: "center",
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

const addButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 32,
  padding: "0 12px",
  border: "none",
  borderRadius: 6,
  background: colors.primary[600],
  color: "white",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  width: "fit-content",
};

const dangerButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  minWidth: 28,
  maxWidth: 28,
  height: 28,
  padding: 0,
  borderRadius: 6,
  border: "1px solid #fda29b",
  background: "#fef3f2",
  color: "#d92d20",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  justifySelf: "center",
};

const listIconLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 34,
  borderRadius: 10,
  border: `1px solid ${colors.border}`,
  background: "#ffffff",
  color: colors.text.primary,
  textDecoration: "none",
};

const infoTextStyle: React.CSSProperties = {
  fontSize: typography.sizes.caption.fontSize,
  color: colors.text.secondary,
};

function buildLineTotal(quantity: number, unitPrice: number) {
  return Number((quantity * unitPrice).toFixed(2));
}

function buildUomLabel(item: {
  uomCode?: string;
  uomName?: string;
}) {
  if (item.uomCode && item.uomName) {
    return `${item.uomCode} - ${item.uomName}`;
  }
  return item.uomName || item.uomCode || "UOM";
}

function createBlankLine(): LoadingFormLine {
  return {
    id: crypto.randomUUID(),
    itemId: "",
    itemCode: "",
    itemName: "",
    unitId: undefined,
    uomCode: undefined,
    uomName: undefined,
    availableQty: 0,
    quantity: 1,
    unitPrice: 0,
    lineTotal: 0,
    priceListId: undefined,
    priceListItemId: undefined,
    priceListCode: undefined,
    remarks: "",
  };
}

function channelOptionAllowed(channel: LoadingChannel, forcedChannel?: LoadingChannel | null) {
  return !forcedChannel || forcedChannel === channel;
}

function customerLooksLikeAgent(customer: Customer) {
  const label = `${customer.customerCode} ${customer.name}`.toUpperCase();
  return label.includes("AGENT") || label.includes("DISTRIBUTOR");
}

function toBadgeStatus(status: string): BadgeVariant {
  switch (String(status).trim().toUpperCase()) {
    case "POSTED":
    case "ISSUED":
      return "posted";
    case "CONFIRMED":
    case "ACTIVE":
      return "active";
    case "PARTIALLY_CONFIRMED":
    case "PARTIALLY_RELEASED":
      return "pending";
    case "CANCELLED":
    case "RELEASED":
      return "voided";
    case "APPROVED":
      return "approved";
    case "REJECTED":
      return "rejected";
    default:
      return "draft";
  }
}

export function LoadingOrdersListPage({
  items,
  forcedChannel,
  currencyCode = "ETB",
  tripOptions = [],
  selectedTripId = "",
  filterBasePath,
}: {
  items: LoadingOrderSummary[];
  forcedChannel?: LoadingChannel;
  currencyCode?: string;
  tripOptions?: FleetTrip[];
  selectedTripId?: string;
  filterBasePath?: string;
}) {
  const router = useRouter();
  const title = forcedChannel ? `${forcedChannel} Loading` : "Loading Orders";
  const activeItems = forcedChannel ? items.filter((item) => item.channel === forcedChannel) : items;

  const metrics = {
    total: activeItems.length,
    draft: activeItems.filter((item) => item.status === "DRAFT").length,
    posted: activeItems.filter((item) => item.status === "POSTED").length,
    confirmed: activeItems.filter((item) => item.status === "CONFIRMED").length,
    cancelled: activeItems.filter((item) => item.status === "CANCELLED").length,
  };

  return (
    <div style={shellStyle}>
      <PageHeader
        title={title}
        subtitle="Reserve-only loading documents with location-scoped visibility and saved pricing snapshots"
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: title },
        ]}
        actions={(
          <button
            type="button"
            style={primaryButtonStyle}
            onClick={() => router.push(
              forcedChannel
                ? forcedChannel === "TRUCK"
                  ? "/sales/truck/loading/create"
                  : forcedChannel === "AGENT"
                    ? "/sales/agents/loading/create"
                    : forcedChannel === "BRANCH"
                      ? "/sales/branch/loading/create"
                      : "/sales/loading/create"
                : "/sales/loading/create",
            )}
          >
            Create Loading
          </button>
        )}
      />

      <div style={cardGridStyle}>
        {[
          { label: "Total", value: metrics.total },
          { label: "Draft", value: metrics.draft },
          { label: "Posted", value: metrics.posted },
          { label: "Confirmed", value: metrics.confirmed },
          { label: "Cancelled", value: metrics.cancelled },
        ].map((metric) => (
          <div key={metric.label} style={metricCardStyle}>
            <div style={{ ...infoTextStyle, textTransform: "uppercase", letterSpacing: "0.04em" }}>{metric.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: colors.text.primary, marginTop: 10 }}>{metric.value}</div>
          </div>
        ))}
      </div>

      {tripOptions.length > 0 && filterBasePath ? (
        <FormCard title="Trip Filter" variant="teal-header">
          <div style={{ ...fieldGridStyle, alignItems: "end" }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Trip Assignment</label>
              <select
                style={inputStyle}
                value={selectedTripId}
                onChange={(event) => {
                  const query = new URLSearchParams();
                  if (event.target.value) {
                    query.set("tripId", event.target.value);
                  }
                  router.push(
                    query.size > 0
                      ? `${filterBasePath}?${query.toString()}`
                      : filterBasePath,
                  );
                }}
              >
                <option value="">All trips</option>
                {tripOptions.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.tripNo} - {trip.routeName} - {trip.vehicleCode}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ ...fieldStyle, justifyContent: "flex-end" }}>
              <div style={infoTextStyle}>
                Narrow truck loading visibility to a specific dispatch trip without leaving the location-scoped live list.
              </div>
            </div>
          </div>
        </FormCard>
      ) : null}

      <FormCard title="Loading Register" variant="teal-header">
        {activeItems.length === 0 ? (
          <EmptyState
            title="No loading orders"
            message="Create the first reserve-only loading order to start reserving finished-goods stock by channel."
          />
        ) : (
          <div className="erp-table-scroll" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 1100, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", color: colors.text.secondary }}>
                  {["Loading No", "Date", "Channel", "From Location", "Counterparty / Truck", "Items", "Qty", "Amount", "Status", "Actions"].map((label) => (
                    <th key={label} style={{ padding: "12px 10px", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeItems.map((item) => (
                  <tr key={item.id} style={{ borderTop: "1px solid #eaecf0" }}>
                    <td style={{ padding: "14px 10px", fontWeight: 700 }}>{item.loadingNo}</td>
                    <td style={{ padding: "14px 10px" }}>{item.loadingDate.slice(0, 10)}</td>
                    <td style={{ padding: "14px 10px" }}>{item.channel}</td>
                    <td style={{ padding: "14px 10px" }}>{item.fromLocationCode} - {item.fromLocationName}</td>
                    <td style={{ padding: "14px 10px" }}>
                      {item.agentName
                        ?? item.customerName
                        ?? item.tripLabel
                        ?? item.truckLabel
                        ?? item.destinationLocationName
                        ?? "Not assigned"}
                    </td>
                    <td style={{ padding: "14px 10px" }}>{item.itemCount}</td>
                    <td style={{ padding: "14px 10px" }}>{item.totalQuantity}</td>
                    <td style={{ padding: "14px 10px" }}>{formatCurrency(item.totalAmount, currencyCode)}</td>
                    <td style={{ padding: "14px 10px" }}><StatusBadge status={toBadgeStatus(item.status)} /></td>
                    <td style={{ padding: "14px 10px" }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Link href={publicViewUrl("sales.loading", item.publicId)} style={listIconLinkStyle} title="View loading order" aria-label="View loading order">
                          <Eye size={16} />
                        </Link>
                        {item.status !== "CONFIRMED" && item.status !== "CANCELLED" ? (
                          <Link href={publicEditUrl("sales.loading", item.publicId)} style={listIconLinkStyle} title="Edit loading order" aria-label="Edit loading order">
                            <Pencil size={16} />
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormCard>
    </div>
  );
}

export function LoadingOrderFormPage({
  locations,
  customers,
  vehicles,
  drivers,
  trips,
  currencyCode,
  currencyLabel,
  forcedChannel,
  allowedChannels,
  initialData,
}: {
  locations: Location[];
  customers: Customer[];
  vehicles: Vehicle[];
  drivers: FleetDriver[];
  trips: FleetTrip[];
  currencyCode: string;
  currencyLabel: string;
  forcedChannel?: LoadingChannel;
  allowedChannels?: LoadingChannel[];
  initialData?: LoadingOrderDetail;
}) {
  const router = useRouter();
  const [savingKey, setSavingKey] = useState<LoadingOrderStatus | null>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [header, setHeader] = useState({
    loadingDate: initialData?.loadingDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    channel: (forcedChannel ?? initialData?.channel ?? "FACTORY") as LoadingChannel,
    fromLocationId: initialData?.fromLocationId ?? locations[0]?.id ?? "",
    destinationLocationId: initialData?.destinationLocationId ?? "",
    agentId: initialData?.agentId ?? "",
    customerId: initialData?.customerId ?? "",
    truckId: initialData?.truckId ?? "",
    driverId: initialData?.driverId ?? "",
    tripId: initialData?.tripId ?? "",
    routeName: initialData?.routeName ?? "",
    remarks: initialData?.remarks ?? "",
  });
  const [lines, setLines] = useState<LoadingFormLine[]>(
    initialData?.items.length
      ? initialData.items.map((item) => ({
          id: item.id,
          itemId: item.itemId,
          itemCode: item.itemCode,
          itemName: item.itemName,
          unitId: item.unitId,
          uomCode: item.uomCode,
          uomName: item.uomName,
          availableQty: 0,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          priceListId: item.priceListId,
          priceListItemId: item.priceListItemId,
          priceListCode: item.priceListCode,
          remarks: item.remarks ?? "",
        }))
      : [createBlankLine()],
  );

  const allowedLocations = useMemo(
    () => locations.filter((location) => location.isActive),
    [locations],
  );

  const branchLocations = useMemo(
    () => locations.filter((location) => location.isActive && location.locationType?.toUpperCase().includes("BRANCH")),
    [locations],
  );

  const agentCustomers = useMemo(() => {
    const filtered = customers.filter((customer) => customer.isActive && customerLooksLikeAgent(customer));
    return filtered.length ? filtered : customers.filter((customer) => customer.isActive);
  }, [customers]);

  const activeVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.isActive),
    [vehicles],
  );

  const activeDrivers = useMemo(
    () => drivers.filter((driver) => driver.isActive),
    [drivers],
  );

  const activeTrips = useMemo(
    () =>
      trips
        .filter((trip) => trip.isActive)
        .filter((trip) => !trip.fromLocationId || trip.fromLocationId === header.fromLocationId),
    [trips, header.fromLocationId],
  );

  const totalAmount = useMemo(
    () => lines.reduce((sum, line) => sum + Number(line.lineTotal ?? 0), 0),
    [lines],
  );

  useEffect(() => {
    if (header.channel !== "TRUCK" || !header.tripId) {
      return;
    }

    const trip = trips.find((entry) => entry.id === header.tripId);
    if (!trip) {
      return;
    }

    setHeader((current) => ({
      ...current,
      truckId: trip.vehicleId,
      driverId: trip.driverId ?? current.driverId,
      fromLocationId: trip.fromLocationId ?? current.fromLocationId,
      destinationLocationId: trip.destinationId ?? current.destinationLocationId,
      routeName: trip.routeName,
    }));
  }, [header.channel, header.tripId, trips]);

  useEffect(() => {
    if (!header.loadingDate || !header.fromLocationId) {
      return;
    }

    const query = new URLSearchParams({
      saleDate: header.loadingDate,
      locationId: header.fromLocationId,
      channel: header.channel,
    });

    if (header.channel === "AGENT" && header.agentId) {
      query.set("agentId", header.agentId);
    } else if (header.customerId) {
      query.set("customerId", header.customerId);
    }

    setCatalogLoading(true);
    fetch(`/api/sales/catalog?${query.toString()}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load live item catalog");
        }
        setCatalog(payload.items ?? []);
        setLines((current) =>
          current.map((line) => {
            if (!line.itemId) {
              return line;
            }

            const match = (payload.items ?? []).find((item: CatalogItem) => item.id === line.itemId);
            if (!match) {
              return { ...line, availableQty: 0 };
            }

            return {
              ...line,
              availableQty: Number(match.availableQty ?? 0),
              unitId: line.unitId ?? match.unitId,
              uomCode: line.uomCode ?? match.uomCode,
              uomName: line.uomName ?? match.uomName,
            };
          }),
        );
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Failed to load live item catalog");
      })
      .finally(() => setCatalogLoading(false));
  }, [header.loadingDate, header.fromLocationId, header.channel, header.agentId, header.customerId]);

  function upsertLine(index: number, patch: Partial<LoadingFormLine>) {
    setLines((current) =>
      current.map((line, lineIndex) => {
        if (lineIndex !== index) {
          return line;
        }

        const next = { ...line, ...patch };
        next.lineTotal = buildLineTotal(Number(next.quantity ?? 0), Number(next.unitPrice ?? 0));
        return next;
      }),
    );
  }

  function applyCatalogItem(index: number, itemId: string) {
    const duplicateLine = lines.find((line, lineIndex) => lineIndex !== index && line.itemId === itemId);
    if (duplicateLine) {
      setMessage("This item is already included in the loading order. Increase the quantity on the existing row instead.");
      return;
    }

    const selected = catalog.find((item) => item.id === itemId);
    if (!selected) {
      upsertLine(index, {
        itemId,
        itemCode: "",
        itemName: "",
        unitId: undefined,
        uomCode: undefined,
        uomName: undefined,
        availableQty: 0,
        unitPrice: 0,
        lineTotal: 0,
        priceListId: undefined,
        priceListItemId: undefined,
        priceListCode: undefined,
      });
      return;
    }

    if (selected.priceMissing || selected.unitPrice === null) {
      setMessage(selected.priceError ?? "No active price found for this item/channel/date.");
    } else {
      setMessage("");
    }

    upsertLine(index, {
      itemId: selected.id,
      itemCode: selected.itemCode,
      itemName: selected.itemName,
      unitId: selected.unitId,
      uomCode: selected.uomCode,
      uomName: selected.uomName,
      availableQty: Number(selected.availableQty ?? 0),
      unitPrice: Number(selected.unitPrice ?? 0),
      lineTotal: buildLineTotal(1, Number(selected.unitPrice ?? 0)),
      priceListId: selected.priceListId,
      priceListItemId: selected.priceListItemId,
      priceListCode: selected.priceListCode,
      quantity: 1,
    });
  }

  function addLine() {
    setLines((current) => [...current, createBlankLine()]);
  }

  function removeLine(index: number) {
    setLines((current) => blankOrRemoveRow(current, index, createBlankLine()));
  }

  async function submit(status: LoadingOrderStatus) {
    setMessage("");

    const payload = {
      ...header,
      status,
      lines: lines.map((line) => ({
        id: line.id,
        itemId: line.itemId,
        unitId: line.unitId ?? null,
        priceListId: line.priceListId ?? null,
        priceListItemId: line.priceListItemId ?? null,
        quantity: Number(line.quantity ?? 0),
        unitPrice: Number(line.unitPrice ?? 0),
        lineTotal: Number(line.lineTotal ?? 0),
        remarks: line.remarks || null,
      })),
    };

    setSavingKey(status);
    startTransition(async () => {
      try {
        const response = await fetch(
          initialData ? `/api/sales/loading/${initialData.id}` : "/api/sales/loading",
          {
            method: initialData ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const result = await response.json();
        if (!response.ok) {
          setMessage(result.error ?? "Failed to save loading order");
          return;
        }
        router.push(publicViewUrl("sales.loading", result.item.publicId ?? initialData?.publicId));
        router.refresh();
      } finally {
        setSavingKey(null);
      }
    });
  }

  const actions: Action[] = [
    { label: "Cancel", variant: "secondary", onClick: () => router.push(initialData ? publicViewUrl("sales.loading", initialData.publicId) : "/sales/loading"), disabled: isPending },
    ...(initialData?.status === "POSTED"
      ? []
      : [{ label: initialData ? "Update Draft" : "Save Draft", variant: "secondary" as const, onClick: () => submit("DRAFT"), loading: savingKey === "DRAFT", disabled: isPending }]),
    { label: initialData?.status === "POSTED" ? "Update Reservation" : "Post / Reserve Stock", variant: "primary", onClick: () => submit("POSTED"), loading: savingKey === "POSTED", disabled: isPending },
  ];

  return (
    <div style={shellStyle}>
      <PageHeader
        title={initialData ? "Edit Loading Order" : "Create Loading Order"}
        subtitle="Reserve finished-goods stock now and issue later on confirmed sale or dispatch"
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Loading Orders", href: "/sales/loading" },
          { label: initialData ? "Edit" : "Create" },
        ]}
      />

      <FormCard title="Loading Header" variant="teal-header">
        {message ? <p style={{ marginTop: 0, color: colors.danger[600] }}>{message}</p> : null}
        <div style={fieldGridStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Loading Date</label>
            <input type="date" style={inputStyle} value={header.loadingDate} onChange={(event) => setHeader((current) => ({ ...current, loadingDate: event.target.value }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Channel</label>
            <select
              style={inputStyle}
              value={header.channel}
              disabled={Boolean(forcedChannel)}
              onChange={(event) => setHeader((current) => ({ ...current, channel: event.target.value as LoadingChannel }))}
            >
              {channelOptionAllowed("FACTORY", forcedChannel) && (!allowedChannels || allowedChannels.includes("FACTORY")) ? <option value="FACTORY">FACTORY</option> : null}
              {channelOptionAllowed("BRANCH", forcedChannel) && (!allowedChannels || allowedChannels.includes("BRANCH")) ? <option value="BRANCH">BRANCH</option> : null}
              {channelOptionAllowed("AGENT", forcedChannel) && (!allowedChannels || allowedChannels.includes("AGENT")) ? <option value="AGENT">AGENT</option> : null}
              {channelOptionAllowed("TRUCK", forcedChannel) && (!allowedChannels || allowedChannels.includes("TRUCK")) ? <option value="TRUCK">TRUCK</option> : null}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>From Location</label>
            <select style={inputStyle} value={header.fromLocationId} onChange={(event) => setHeader((current) => ({ ...current, fromLocationId: event.target.value }))}>
              <option value="">Select ...</option>
              {allowedLocations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.locationCode} - {location.locationName}
                </option>
              ))}
            </select>
          </div>
          {header.channel === "BRANCH" ? (
            <div style={fieldStyle}>
              <label style={labelStyle}>Destination Branch</label>
              <select style={inputStyle} value={header.destinationLocationId} onChange={(event) => setHeader((current) => ({ ...current, destinationLocationId: event.target.value }))}>
                <option value="">Select ...</option>
                {branchLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.locationCode} - {location.locationName}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {header.channel === "AGENT" ? (
            <div style={fieldStyle}>
              <label style={labelStyle}>Agent</label>
              <select style={inputStyle} value={header.agentId} onChange={(event) => setHeader((current) => ({ ...current, agentId: event.target.value }))}>
                <option value="">Select ...</option>
                {agentCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.customerCode} - {customer.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div style={fieldStyle}>
              <label style={labelStyle}>Customer</label>
              <select style={inputStyle} value={header.customerId} onChange={(event) => setHeader((current) => ({ ...current, customerId: event.target.value }))}>
                <option value="">Walk-in / none</option>
                {customers.filter((customer) => customer.isActive).map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.customerCode} - {customer.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {header.channel === "TRUCK" ? (
            <>
              <div style={fieldStyle}>
                <label style={labelStyle}>Trip Assignment</label>
                <select style={inputStyle} value={header.tripId} onChange={(event) => setHeader((current) => ({ ...current, tripId: event.target.value }))}>
                  <option value="">Select ...</option>
                  {activeTrips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.tripNo} - {trip.routeName} - {trip.vehicleCode}
                    </option>
                  ))}
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Truck</label>
                <select style={inputStyle} value={header.truckId} onChange={(event) => setHeader((current) => ({ ...current, truckId: event.target.value }))} disabled={Boolean(header.tripId)}>
                  <option value="">Select ...</option>
                  {activeVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.vehicleCode} - {vehicle.plateNumber} - {vehicle.vehicleName}
                    </option>
                  ))}
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Driver</label>
                <select style={inputStyle} value={header.driverId} onChange={(event) => setHeader((current) => ({ ...current, driverId: event.target.value }))} disabled={Boolean(header.tripId)}>
                  <option value="">Select ...</option>
                  {activeDrivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.driverCode} - {driver.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : null}
          <div style={fieldStyle}>
            <label style={labelStyle}>{header.channel === "TRUCK" ? "Route / Trip Path" : "Route Name"}</label>
            <input style={inputStyle} value={header.routeName} onChange={(event) => setHeader((current) => ({ ...current, routeName: event.target.value }))} placeholder="Optional route" disabled={Boolean(header.tripId)} />
          </div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Remarks</label>
            <textarea style={{ ...inputStyle, minHeight: 96, resize: "vertical" }} value={header.remarks} onChange={(event) => setHeader((current) => ({ ...current, remarks: event.target.value }))} placeholder="Remarks" />
          </div>
        </div>
      </FormCard>

      <FormCard
        title="Items"
        variant="teal-header"
        footer={{
          actions: (
            <div style={{ display: "flex", width: "100%", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              <div style={infoTextStyle}>
                {catalogLoading ? "Refreshing live prices and available stock..." : `Amounts use ${currencyCode} (${currencyLabel}) snapshots from the active price list.`}
              </div>
              <ActionButtons actions={actions} />
            </div>
          ),
        }}
      >
        <div style={{ ...infoTextStyle, marginBottom: 16 }}>Save draft first if you want to review before reserving stock.</div>
        <LineItemsGrid
          template={loadingLineGridTemplate}
          headers={["Item", "UOM", "Available", "Loading Qty", `Unit Price (${currencyCode})`, ""]}
          minWidth={1040}
        >
          {lines.map((line, index) => (
            <Fragment key={line.id}>
              <LineItemsGridRow>
                <select style={inputStyle} value={line.itemId} onChange={(event) => applyCatalogItem(index, event.target.value)}>
                  <option value="">Select ...</option>
                  {catalog.map((item) => (
                    <option key={item.id} value={item.id} disabled={item.priceMissing}>
                      {item.itemCode} - {item.itemName} - {buildUomLabel(item)}
                    </option>
                  ))}
                </select>
                <input style={readonlyInputStyle} value={buildUomLabel(line)} disabled />
                <input style={readonlyInputStyle} value={line.availableQty} disabled />
                <FormattedNumberInput
                  style={inputStyle}
                  decimals={0}
                  value={line.quantity}
                  onChange={(rawQuantity) => {
                    const quantity = Math.max(1, rawQuantity);
                    const cappedQuantity = line.availableQty > 0 ? Math.min(quantity, line.availableQty) : quantity;
                    if (line.availableQty > 0 && quantity > line.availableQty) {
                      setMessage("Loading quantity cannot exceed available stock at the selected location.");
                    }
                    upsertLine(index, { quantity: cappedQuantity });
                  }}
                />
                <FormattedNumberInput
                  style={inputStyle}
                  decimals={2}
                  value={line.unitPrice}
                  onChange={(nextValue) => upsertLine(index, { unitPrice: nextValue })}
                />
                <RemarksWithRemoveCell
                  value={line.remarks}
                  canRemove
                  inputStyle={inputStyle}
                  onChange={(next) => upsertLine(index, { remarks: next })}
                  onRemove={() => removeLine(index)}
                  removeAriaLabel={`Remove loading order line ${index + 1}`}
                />
              </LineItemsGridRow>
              <LineItemsGridSpan style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: "0 4px" }}>
                <span style={infoTextStyle}>Price List: {line.priceListCode ?? "No active price"}</span>
                <span style={infoTextStyle}>Line Total: {formatCurrency(line.lineTotal, currencyCode)}</span>
              </LineItemsGridSpan>
            </Fragment>
          ))}
        </LineItemsGrid>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 700, color: colors.text.primary }}>
            Total Loading Value: {formatCurrency(totalAmount, currencyCode)}
          </div>
          <button type="button" style={addButtonStyle} onClick={addLine}>+ Add Item</button>
        </div>
      </FormCard>
    </div>
  );
}

export function LoadingOrderDetailPage({
  item,
  currencyCode,
}: {
  item: LoadingOrderDetail;
  currencyCode: string;
}) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const isPending = pendingAction != null;
  const isActionLoading = (action: string) => pendingAction === action;
  const [message, setMessage] = useState("");
  const [confirmLines, setConfirmLines] = useState<Record<string, number>>(
    () => Object.fromEntries(item.items.map((line) => [line.id, Number(line.reservedQty ?? 0)])),
  );

  async function runAction(endpoint: string, successRedirect?: string, body?: unknown) {
    const actionKey = endpoint.split("/").pop() ?? "action";
    setMessage("");
    setPendingAction(actionKey);
    startTransition(async () => {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });
        const result = await response.json();
        if (!response.ok) {
          setMessage(result.error ?? "Action failed");
          return;
        }
        if (result?.item?.dispatchNo) {
          setMessage(`Dispatch ${result.item.dispatchNo} posted successfully.`);
        }
        if (successRedirect) {
          router.push(successRedirect);
        } else {
          router.refresh();
        }
      } finally {
        setPendingAction(null);
      }
    });
  }

  const confirmableItems = useMemo(
    () => item.items.filter((line) => Number(line.reservedQty ?? 0) > 0),
    [item.items],
  );

  function buildConfirmBody(confirmAll = false) {
    return {
      lines: confirmableItems
        .map((line) => ({
          loadingOrderItemId: line.id,
          quantity: confirmAll ? Number(line.reservedQty ?? 0) : Number(confirmLines[line.id] ?? 0),
        }))
        .filter((line) => line.quantity > 0),
    };
  }

  const actions: Action[] = [
    { label: "Back", variant: "secondary", onClick: () => router.push("/sales/loading"), disabled: isPending },
    ...(item.status !== "CONFIRMED" && item.status !== "CANCELLED"
      ? [{ label: "Edit", variant: "secondary" as const, onClick: () => router.push(publicEditUrl("sales.loading", item.publicId)), disabled: isPending }]
      : []),
    ...(item.status === "DRAFT"
      ? [{ label: "Post / Reserve", variant: "primary" as const, onClick: () => runAction(`/api/sales/loading/${item.id}/post`), loading: isActionLoading("post"), disabled: isPending }]
      : []),
    ...((item.status === "POSTED" || item.status === "PARTIALLY_CONFIRMED") && confirmableItems.length > 0
      ? [{ label: "Confirm All Remaining", variant: "primary" as const, onClick: () => runAction(`/api/sales/loading/${item.id}/confirm-sale`, undefined, buildConfirmBody(true)), loading: isActionLoading("confirm-sale"), disabled: isPending }]
      : []),
    ...(item.status !== "CONFIRMED" && item.status !== "CANCELLED"
      ? [{ label: "Cancel Loading", variant: "danger" as const, onClick: () => runAction(`/api/sales/loading/${item.id}/cancel`), loading: isActionLoading("cancel"), disabled: isPending }]
      : []),
  ];

  return (
    <div style={shellStyle}>
      <PageHeader
        recordKind="sales.sale"
        title={item.loadingNo}
        subtitle="Review saved price snapshots, live reservation records, and confirm the reserve-only loading flow"
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Loading Orders", href: "/sales/loading" },
          { label: item.loadingNo },
        ]}
      />

      {message ? <div style={{ color: colors.danger[600], fontWeight: 600 }}>{message}</div> : null}

      <FormCard title="Loading Summary" variant="teal-header" footer={{ actions: <ActionButtons actions={actions} /> }}>
        <div style={fieldGridStyle}>
          {[
            ["Channel", item.channel],
            ["From Location", `${item.fromLocationCode} - ${item.fromLocationName}`],
            ["Destination", item.destinationLocationCode ? `${item.destinationLocationCode} - ${item.destinationLocationName}` : "Not assigned"],
            ["Trip", item.tripLabel ?? "Not assigned"],
            ["Agent", item.agentName ?? "Not assigned"],
            ["Customer", item.customerName ?? "Walk-in / none"],
            ["Truck", item.truckLabel ?? item.truckId ?? "Not assigned"],
            ["Driver", item.driverName ?? item.driverId ?? "Not assigned"],
            ["Route", item.routeName ?? "Not assigned"],
            ["Status", item.status],
            ["Reserved At", item.reservedAt ? item.reservedAt.slice(0, 19).replace("T", " ") : "Not posted"],
            ["Confirmed At", item.confirmedAt ? item.confirmedAt.slice(0, 19).replace("T", " ") : "Not confirmed"],
            ["Cancelled At", item.cancelledAt ? item.cancelledAt.slice(0, 19).replace("T", " ") : "Active"],
          ].map(([label, value]) => (
            <div key={label} style={fieldStyle}>
              <span style={labelStyle}>{label}</span>
              <div style={{ color: colors.text.primary, fontWeight: 600 }}>{value}</div>
            </div>
          ))}
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <span style={labelStyle}>Remarks</span>
            <div style={{ color: colors.text.primary }}>{item.remarks || "No remarks"}</div>
          </div>
        </div>
      </FormCard>

      <FormCard title="Loading Items" variant="teal-header">
        <div className="erp-table-scroll" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 1200, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: colors.text.secondary }}>
                {["Item", "UOM", "Qty", "Reserved", "Issued", "Unit Price", "Line Total", "Price List", "Reservation"].map((label) => (
                  <th key={label} style={{ padding: "12px 10px", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {item.items.map((line) => (
                <tr key={line.id} style={{ borderTop: "1px solid #eaecf0" }}>
                  <td style={{ padding: "14px 10px" }}>{line.itemCode} - {line.itemName}</td>
                  <td style={{ padding: "14px 10px" }}>{buildUomLabel(line)}</td>
                  <td style={{ padding: "14px 10px" }}>{line.quantity}</td>
                  <td style={{ padding: "14px 10px" }}>{line.reservedQty}</td>
                  <td style={{ padding: "14px 10px" }}>{line.issuedQty}</td>
                  <td style={{ padding: "14px 10px" }}>{formatCurrency(line.unitPrice, currencyCode)}</td>
                  <td style={{ padding: "14px 10px" }}>{formatCurrency(line.lineTotal, currencyCode)}</td>
                  <td style={{ padding: "14px 10px" }}>{line.priceListCode ?? "No saved price list"}</td>
                  <td style={{ padding: "14px 10px" }}>
                    {line.reservationNo ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span>{line.reservationNo}</span>
                        {line.reservationStatus ? <StatusBadge status={toBadgeStatus(line.reservationStatus)} /> : null}
                      </div>
                    ) : "No reservation"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 16, fontWeight: 700, color: colors.text.primary }}>
          Total Value: {formatCurrency(item.totalAmount, currencyCode)}
        </div>
      </FormCard>

      <FormCard title="Reservation Register" variant="teal-header">
        {item.reservations.length === 0 ? (
          <EmptyState title="No reservations yet" message="Draft loading orders do not reserve stock until they are posted." />
        ) : (
          <div className="erp-table-scroll" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 1100, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", color: colors.text.secondary }}>
                  {["Reservation No", "Item", "Location", "Qty", "Released", "Issued", "Active", "Status"].map((label) => (
                    <th key={label} style={{ padding: "12px 10px", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {item.reservations.map((reservation) => (
                  <tr key={reservation.id} style={{ borderTop: "1px solid #eaecf0" }}>
                    <td style={{ padding: "14px 10px" }}>{reservation.reservationNo}</td>
                    <td style={{ padding: "14px 10px" }}>{reservation.itemCode} - {reservation.itemName}</td>
                    <td style={{ padding: "14px 10px" }}>{reservation.locationCode} - {reservation.locationName}</td>
                    <td style={{ padding: "14px 10px" }}>{reservation.quantity}</td>
                    <td style={{ padding: "14px 10px" }}>{reservation.releasedQty}</td>
                    <td style={{ padding: "14px 10px" }}>{reservation.issuedQty}</td>
                    <td style={{ padding: "14px 10px" }}>{reservation.activeQty}</td>
                    <td style={{ padding: "14px 10px" }}><StatusBadge status={toBadgeStatus(reservation.status)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormCard>

      <FormCard title="Dispatch History" variant="teal-header">
        {item.dispatches.length === 0 ? (
          <EmptyState title="No dispatches yet" message="Confirm reserved quantities to generate posted dispatch documents and linked sales snapshots." />
        ) : (
          <div className="erp-table-scroll" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 960, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", color: colors.text.secondary }}>
                  {["Dispatch No", "Date", "Sale", "Quantity", "Amount", "Posted", "Status", "Actions"].map((label) => (
                    <th key={label} style={{ padding: "12px 10px", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {item.dispatches.map((dispatch) => (
                  <tr key={dispatch.id} style={{ borderTop: "1px solid #eaecf0" }}>
                    <td style={{ padding: "14px 10px", fontWeight: 700 }}>{dispatch.dispatchNo}</td>
                    <td style={{ padding: "14px 10px" }}>{dispatch.dispatchDate.slice(0, 10)}</td>
                    <td style={{ padding: "14px 10px" }}>{dispatch.saleNo ?? "Not linked"}</td>
                    <td style={{ padding: "14px 10px" }}>{dispatch.totalQuantity}</td>
                    <td style={{ padding: "14px 10px" }}>{formatCurrency(dispatch.totalAmount, currencyCode)}</td>
                    <td style={{ padding: "14px 10px" }}>{dispatch.postedAt ? dispatch.postedAt.slice(0, 19).replace("T", " ") : "Not posted"}</td>
                    <td style={{ padding: "14px 10px" }}><StatusBadge status={toBadgeStatus(dispatch.status)} /></td>
                    <td style={{ padding: "14px 10px" }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Link href={publicViewUrl("sales.dispatch", dispatch.publicId)} style={listIconLinkStyle} title="View dispatch" aria-label="View dispatch">
                          <Eye size={16} />
                        </Link>
                        <Link href={publicPrintUrl("sales.dispatch", dispatch.publicId)} style={listIconLinkStyle} title="Print dispatch" aria-label="Print dispatch">
                          <Printer size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormCard>

      {(item.status === "POSTED" || item.status === "PARTIALLY_CONFIRMED") && confirmableItems.length > 0 ? (
        <FormCard
          title="Partial Confirm / Dispatch"
          variant="teal-header"
          footer={{
            actions: (
              <ActionButtons
                actions={[
                  {
                    label: "Confirm Selected Qty",
                    variant: "primary",
                    onClick: () => runAction(`/api/sales/loading/${item.id}/confirm-sale`, undefined, buildConfirmBody(false)),
                    loading: isActionLoading("confirm-sale"),
                    disabled: isPending,
                  },
                ]}
              />
            ),
          }}
        >
          <div style={{ color: colors.text.secondary, marginBottom: 16 }}>
            Confirm only the quantities being dispatched now. Remaining reserved stock stays reserved on this loading order.
          </div>
          <div className="erp-table-scroll" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 960, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", color: colors.text.secondary }}>
                  {["Item", "Reserved", "Already Issued", "Dispatch Now", "Unit Price", "Dispatch Value"].map((label) => (
                    <th key={label} style={{ padding: "12px 10px", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {confirmableItems.map((line) => {
                  const dispatchQty = Math.max(0, Math.min(Number(confirmLines[line.id] ?? 0), Number(line.reservedQty ?? 0)));
                  return (
                    <tr key={line.id} style={{ borderTop: "1px solid #eaecf0" }}>
                      <td style={{ padding: "14px 10px" }}>{line.itemCode} - {line.itemName}</td>
                      <td style={{ padding: "14px 10px" }}>{line.reservedQty}</td>
                      <td style={{ padding: "14px 10px" }}>{line.issuedQty}</td>
                      <td style={{ padding: "14px 10px", width: 180 }}>
                        <FormattedNumberInput
                          style={inputStyle}
                          decimals={0}
                          min={0}
                          value={dispatchQty}
                          onChange={(nextValue) =>
                            setConfirmLines((current) => ({
                              ...current,
                              [line.id]: Math.max(0, Math.min(nextValue, Number(line.reservedQty ?? 0))),
                            }))
                          }
                        />
                      </td>
                      <td style={{ padding: "14px 10px" }}>{formatCurrency(line.unitPrice, currencyCode)}</td>
                      <td style={{ padding: "14px 10px" }}>{formatCurrency(dispatchQty * Number(line.unitPrice ?? 0), currencyCode)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </FormCard>
      ) : null}
    </div>
  );
}
