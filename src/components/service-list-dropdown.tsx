"use client";

import { useState } from "react";
import { togglePressServiceAction } from "@/app/service-actions";

type CatalogService = {
  id: string;
  name: string;
  active: boolean;
  jobs: number;
};

export function ServiceListDropdown({
  services,
}: {
  services: CatalogService[];
}) {
  const [serviceId, setServiceId] = useState(services[0]?.id || "");
  const selected = services.find((service) => service.id === serviceId);

  if (services.length === 0) {
    return <p className="muted">No services yet.</p>;
  }

  const toggle = selected
    ? togglePressServiceAction.bind(null, selected.id)
    : undefined;

  return (
    <div className="form-grid">
      <label>
        Service list
        <select
          className="dropdown-select"
          size={1}
          value={serviceId}
          onChange={(event) => setServiceId(event.target.value)}
        >
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
              {service.active ? "" : " (hidden)"}
            </option>
          ))}
        </select>
      </label>

      {selected ? (
        <>
          <p className="muted" style={{ margin: 0 }}>
            {selected.jobs} job{selected.jobs === 1 ? "" : "s"} recorded
            {selected.active ? "" : " · Hidden from the record form"}
          </p>
          {toggle ? (
            <form action={toggle}>
              <button type="submit" className="button secondary">
                {selected.active ? "Hide from dropdown" : "Show in dropdown"}
              </button>
            </form>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
