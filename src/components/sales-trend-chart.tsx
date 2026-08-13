"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import type { DailySalesPoint } from "@/lib/day-report";

export function SalesTrendChart({ points }: { points: DailySalesPoint[] }) {
  const [active, setActive] = useState<number | null>(null);

  const chart = useMemo(() => {
    const width = 720;
    const height = 260;
    const pad = { top: 18, right: 16, bottom: 36, left: 58 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const max = Math.max(...points.map((point) => point.total), 0);
    const niceMax = max <= 0 ? 100 : Math.ceil(max / 50) * 50;
    const x = (index: number) =>
      pad.left + (points.length === 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
    const y = (value: number) =>
      pad.top + innerH - (value / niceMax) * innerH;

    const line = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(point.total)}`)
      .join(" ");
    const area = `${line} L ${x(points.length - 1)} ${pad.top + innerH} L ${x(0)} ${pad.top + innerH} Z`;
    const ticks = [0, 0.5, 1].map((part) => niceMax * part);

    return { width, height, pad, innerH, niceMax, x, y, line, area, ticks };
  }, [points]);

  if (points.length === 0) {
    return <p className="muted">No sales days to chart yet.</p>;
  }

  const today = points[points.length - 1];
  const yesterday = points[points.length - 2];
  const change = yesterday ? today.total - yesterday.total : 0;
  const hovered = active === null ? today : points[active];

  return (
    <div className="sales-chart">
      <div className="sales-chart-head">
        <div>
          <span className="muted">Selected day</span>
          <strong>{formatCurrency(hovered.total)}</strong>
          <p className="muted" style={{ margin: "0.25rem 0 0" }}>
            {hovered.display} · {hovered.jobs} job
            {hovered.jobs === 1 ? "" : "s"} · MoMo {formatCurrency(hovered.momo)} ·
            Cash {formatCurrency(hovered.cash)}
          </p>
        </div>
        {yesterday ? (
          <div className={`sales-chart-delta${change >= 0 ? " up" : " down"}`}>
            {change >= 0 ? "Up" : "Down"} {formatCurrency(Math.abs(change))} vs yesterday
          </div>
        ) : null}
      </div>

      <svg
        className="sales-chart-svg"
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        role="img"
        aria-label="Daily sales for the last two weeks"
      >
        {chart.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={chart.pad.left}
              x2={chart.width - chart.pad.right}
              y1={chart.y(tick)}
              y2={chart.y(tick)}
              className="sales-chart-grid"
            />
            <text
              x={chart.pad.left - 8}
              y={chart.y(tick) + 4}
              textAnchor="end"
              className="sales-chart-axis"
            >
              {formatCurrency(tick)}
            </text>
          </g>
        ))}

        <path d={chart.area} className="sales-chart-area" />
        <path d={chart.line} className="sales-chart-line" />

        {points.map((point, index) => (
          <g key={point.label}>
            <circle
              cx={chart.x(index)}
              cy={chart.y(point.total)}
              r={active === index ? 6 : 4}
              className={`sales-chart-dot${active === index ? " active" : ""}`}
            />
            {index % 2 === 0 || index === points.length - 1 ? (
              <text
                x={chart.x(index)}
                y={chart.height - 10}
                textAnchor="middle"
                className="sales-chart-axis"
              >
                {point.display}
              </text>
            ) : null}
            <rect
              x={chart.x(index) - 18}
              y={chart.pad.top}
              width={36}
              height={chart.innerH}
              className="sales-chart-hit"
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
