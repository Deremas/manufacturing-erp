"use client";

export async function deleteRecord(
  endpoint: string,
  label: string,
): Promise<boolean> {
  const confirmed = window.confirm(
    `Delete this ${label}? This action cannot be undone.`,
  );
  if (!confirmed) return false;

  const response = await fetch(endpoint, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error ?? `Failed to delete ${label}`);
  }

  return true;
}
