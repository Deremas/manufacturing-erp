import assert from "node:assert/strict";
import test from "node:test";

import {
  canPerformLabeledAction,
  filterNavigation,
} from "@/lib/permissions/ui-access";
import type { NavItem } from "@/lib/constants/navigation";

test("action labels are hidden unless the user has the matching permission", () => {
  const path = "/procurement/requisitions";
  assert.equal(canPerformLabeledAction(["procurement.view"], "Create", path), false);
  assert.equal(canPerformLabeledAction(["procurement.create"], "Create", path), true);
  assert.equal(canPerformLabeledAction(["procurement.pr.create"], "Create", path), true);
  assert.equal(canPerformLabeledAction(["procurement.view"], "Approve", path), false);
  assert.equal(canPerformLabeledAction(["procurement.approve"], "Approve", path), true);
  assert.equal(canPerformLabeledAction(["procurement.pr.approve"], "Approve", path), true);
  assert.equal(canPerformLabeledAction(["procurement.view"], "Edit", path), false);
  assert.equal(canPerformLabeledAction(["procurement.edit"], "Edit", path), true);
  assert.equal(canPerformLabeledAction(["procurement.delete"], "Delete", path), true);
  assert.equal(canPerformLabeledAction(["procurement.view"], "View", path), true);
  assert.equal(canPerformLabeledAction(["*"], "Approve", path), true);
});

test("related create actions check the destination document, not the current list", () => {
  const path = "/procurement/purchase-orders";
  assert.equal(canPerformLabeledAction(["procurement.po.view"], "Create GRN", path), false);
  assert.equal(canPerformLabeledAction(["procurement.grn.create"], "Create GRN", path), true);
  assert.equal(canPerformLabeledAction(["procurement.create"], "Convert to PO", "/procurement/requisitions"), true);
});

test("sidebar children are filtered to routes the user can open", () => {
  const items: NavItem[] = [
    { title: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
    {
      title: "Procurement",
      icon: "ShoppingCart",
      children: [
        { title: "Purchase Requisitions", href: "/procurement/requisitions" },
        { title: "Purchase Orders", href: "/procurement/purchase-orders" },
      ],
    },
    {
      title: "Sales",
      icon: "ShoppingBag",
      children: [{ title: "Quotations", href: "/sales/quotations" }],
    },
  ];

  const visible = filterNavigation(items, ["procurement.pr.view"]);
  assert.equal(visible.some((item) => item.title === "Dashboard"), true);
  assert.equal(visible.some((item) => item.title === "Sales"), false);
  const procurement = visible.find((item) => item.title === "Procurement");
  assert.deepEqual(
    procurement?.children?.map((child) => child.title),
    ["Purchase Requisitions"],
  );
});
