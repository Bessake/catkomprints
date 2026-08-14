"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  recordServiceSaleAction,
  type ServiceActionState,
} from "@/app/service-actions";

type ServiceOption = {
  id: string;
  name: string;
  defaultCost: number;
};

type ProductOption = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  categoryName: string | null;
};

const initialState: ServiceActionState = null;

function formatLocalDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

export function ServiceSaleForm({
  services,
  products,
  recorderName,
}: {
  services: ServiceOption[];
  products: ProductOption[];
  recorderName: string;
}) {
  const [state, formAction, pending] = useActionState(
    recordServiceSaleAction,
    initialState,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [costs, setCosts] = useState<Record<string, string>>({});
  const [materialCosts, setMaterialCosts] = useState<Record<string, string>>(
    {},
  );
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [materialMenuOpen, setMaterialMenuOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "cash" | "">("");
  const [momoName, setMomoName] = useState("");
  const [now, setNow] = useState(() => new Date());
  const menuRef = useRef<HTMLDivElement>(null);
  const materialMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (state?.success) {
      setSelectedIds([]);
      setSelectedProductIds([]);
      setCosts({});
      setMaterialCosts({});
      setQuantities({});
      setMenuOpen(false);
      setMaterialMenuOpen(false);
      setPaymentMethod("");
      setMomoName("");
    }
  }, [state]);

  useEffect(() => {
    if (!menuOpen && !materialMenuOpen) return;
    function handlePointer(event: MouseEvent) {
      const target = event.target as Node;
      if (menuOpen && !menuRef.current?.contains(target)) {
        setMenuOpen(false);
      }
      if (materialMenuOpen && !materialMenuRef.current?.contains(target)) {
        setMaterialMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, [menuOpen, materialMenuOpen]);

  const selected = useMemo(
    () => services.filter((service) => selectedIds.includes(service.id)),
    [services, selectedIds],
  );
  const selectedProducts = useMemo(
    () => products.filter((product) => selectedProductIds.includes(product.id)),
    [products, selectedProductIds],
  );

  const dateValue = now.toISOString().slice(0, 10);
  const timeValue = now.toTimeString().slice(0, 8);
  const summary =
    selected.length === 0
      ? "Select one or more services"
      : selected.length === 1
        ? selected[0].name
        : `${selected.length} services selected`;
  const materialSummary =
    selectedProducts.length === 0
      ? "Select materials sold"
      : selectedProducts.length === 1
        ? selectedProducts[0].name
        : `${selectedProducts.length} materials selected`;
  const itemCount = selected.length + selectedProducts.length;

  function toggleService(service: ServiceOption) {
    setSelectedIds((current) => {
      if (current.includes(service.id)) {
        setCosts((prev) => {
          const next = { ...prev };
          delete next[service.id];
          return next;
        });
        return current.filter((id) => id !== service.id);
      }
      if (service.defaultCost > 0) {
        setCosts((prev) => ({
          ...prev,
          [service.id]: prev[service.id] || String(service.defaultCost),
        }));
      }
      return [...current, service.id];
    });
  }

  function toggleProduct(product: ProductOption) {
    setSelectedProductIds((current) => {
      if (current.includes(product.id)) {
        setMaterialCosts((prev) => {
          const next = { ...prev };
          delete next[product.id];
          return next;
        });
        setQuantities((prev) => {
          const next = { ...prev };
          delete next[product.id];
          return next;
        });
        return current.filter((id) => id !== product.id);
      }
      setQuantities((prev) => ({
        ...prev,
        [product.id]: prev[product.id] || "1",
      }));
      if (product.unitPrice > 0) {
        setMaterialCosts((prev) => ({
          ...prev,
          [product.id]: prev[product.id] || String(product.unitPrice),
        }));
      }
      return [...current, product.id];
    });
  }

  if (services.length === 0 && products.length === 0) {
    return (
      <p className="muted">
        Add a service or a product first, then record sales here.
      </p>
    );
  }

  return (
    <form action={formAction} className="form-grid">
      {state?.error && <p className="error-text">{state.error}</p>}
      {state?.success && <div className="success-banner">{state.success}</div>}

      <div className="success-banner recording-as">
        Recording as: <strong>{recorderName}</strong>
      </div>

      {services.length > 0 ? (
        <div className="multi-select" ref={menuRef}>
          <span>Services</span>
          <button
            type="button"
            className="dropdown-select multi-select-toggle"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {summary}
          </button>
          {menuOpen ? (
            <div className="multi-select-menu">
              {services.map((service) => {
                const checked = selectedIds.includes(service.id);
                return (
                  <label key={service.id} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleService(service)}
                    />
                    {service.name}
                  </label>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {selected.map((service) => (
        <input
          key={`id-${service.id}`}
          type="hidden"
          name="serviceIds"
          value={service.id}
        />
      ))}

      {selected.length > 0 ? (
        <div className="form-grid">
          {selected.map((service) => (
            <label key={service.id}>
              Cost for {service.name} (GH₵)
              <input
                name={`cost-${service.id}`}
                type="number"
                min={0}
                step="0.01"
                required
                value={costs[service.id] || ""}
                onChange={(event) =>
                  setCosts((prev) => ({
                    ...prev,
                    [service.id]: event.target.value,
                  }))
                }
                placeholder="0.00"
              />
            </label>
          ))}
        </div>
      ) : null}

      {products.length > 0 ? (
        <div className="multi-select" ref={materialMenuRef}>
          <span>Materials sold</span>
          <button
            type="button"
            className="dropdown-select multi-select-toggle"
            aria-expanded={materialMenuOpen}
            onClick={() => setMaterialMenuOpen((open) => !open)}
          >
            {materialSummary}
          </button>
          {materialMenuOpen ? (
            <div className="multi-select-menu">
              {products.map((product) => {
                const checked = selectedProductIds.includes(product.id);
                const label = product.categoryName
                  ? `${product.categoryName} — ${product.name}`
                  : product.name;
                return (
                  <label key={product.id} className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProduct(product)}
                    />
                    {label} · {product.quantity} on hand
                  </label>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          Add products on the Stock page to sell materials here. Stock will
          deduct automatically.
        </p>
      )}

      {selectedProducts.map((product) => (
        <input
          key={`pid-${product.id}`}
          type="hidden"
          name="productIds"
          value={product.id}
        />
      ))}

      {selectedProducts.length > 0 ? (
        <div className="form-grid">
          {selectedProducts.map((product) => (
            <div key={product.id} className="form-grid two">
              <label>
                Qty of {product.name}
                <input
                  name={`qty-${product.id}`}
                  type="number"
                  min={1}
                  max={product.quantity}
                  required
                  value={quantities[product.id] || "1"}
                  onChange={(event) =>
                    setQuantities((prev) => ({
                      ...prev,
                      [product.id]: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Price for {product.name} (GH₵)
                <input
                  name={`material-cost-${product.id}`}
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={materialCosts[product.id] || ""}
                  onChange={(event) =>
                    setMaterialCosts((prev) => ({
                      ...prev,
                      [product.id]: event.target.value,
                    }))
                  }
                  placeholder="0.00"
                />
              </label>
            </div>
          ))}
        </div>
      ) : null}

      {itemCount === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          Tick services and/or materials, then enter a cost for each. Materials
          sold are taken out of stock.
        </p>
      ) : null}

      <label>
        Client name
        <input name="clientName" placeholder="Optional" />
      </label>

      <fieldset className="payment-fieldset">
        <legend>How did the client pay?</legend>
        <label className="checkbox-row">
          <input
            type="radio"
            name="paymentMethod"
            value="momo"
            required
            checked={paymentMethod === "momo"}
            onChange={() => setPaymentMethod("momo")}
          />
          MoMo
        </label>
        <label className="checkbox-row">
          <input
            type="radio"
            name="paymentMethod"
            value="cash"
            required
            checked={paymentMethod === "cash"}
            onChange={() => {
              setPaymentMethod("cash");
              setMomoName("");
            }}
          />
          Cash
        </label>
      </fieldset>

      {paymentMethod === "momo" ? (
        <label>
          MoMo name
          <input
            name="momoName"
            required
            value={momoName}
            onChange={(event) => setMomoName(event.target.value)}
            placeholder="Name on the MoMo payment"
          />
        </label>
      ) : null}

      <label>
        Note
        <input name="note" placeholder="Optional job details" />
      </label>

      <div className="form-grid two">
        <label>
          Date
          <input name="servedDate" type="date" value={dateValue} readOnly />
        </label>
        <label>
          Time
          <input
            name="servedTime"
            type="time"
            step={1}
            value={timeValue}
            readOnly
          />
        </label>
      </div>

      <p className="muted">
        Date and time are filled automatically: {formatLocalDateTime(now)}
      </p>

      <button
        type="submit"
        className="button"
        disabled={pending || itemCount === 0}
      >
        {pending
          ? "Recording…"
          : itemCount > 1
            ? `Record ${itemCount} items`
            : "Record sale"}
      </button>
    </form>
  );
}
