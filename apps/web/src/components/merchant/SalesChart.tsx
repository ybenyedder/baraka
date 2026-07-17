'use client';

import { useState } from 'react';
import type { MerchantAnalyticsPoint } from '@baraka/shared';
import { formatMoney, money, type Currency } from '@baraka/shared';

const BAR_FILL = '#0e8a76'; // déclinaison claire du pine, validée (contraste + lisibilité daltonisme)
const BAR_HOVER = '#005248';

/**
 * Barres quotidiennes de chiffre d'affaires (SVG inline, sans dépendance).
 * Série unique : pas de légende, le titre du panneau la nomme. Tooltip au survol,
 * seul le meilleur jour est étiqueté en direct.
 */
export function SalesChart({
  series,
  currency,
}: {
  series: MerchantAnalyticsPoint[];
  currency: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 720;
  const H = 180;
  const PAD_BOTTOM = 22;
  const PAD_TOP = 18;
  const plotH = H - PAD_TOP - PAD_BOTTOM;

  const max = Math.max(1, ...series.map((p) => p.revenueMinor));
  const maxIdx = series.findIndex((p) => p.revenueMinor === max);
  const n = Math.max(1, series.length);
  const step = W / n;
  const barW = Math.max(3, Math.min(18, step - 2)); // 2px d'écart entre barres

  function fmt(minor: number): string {
    return formatMoney(money(minor, currency as Currency));
  }

  const hovered = hover != null ? series[hover] : null;

  return (
    <div className="relative">
      {/* Tooltip HTML au-dessus de la barre survolée */}
      {hovered ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg bg-pine px-3 py-1.5 text-center shadow-md"
          style={{
            // Position par coordonnée de données du graphe (axe temps LTR), pas une propriété de
            // lecture → ne doit PAS passer en logique start/end (le graphe ne se retourne pas en RTL).
            // eslint-disable-next-line no-restricted-syntax
            left: `${(((hover ?? 0) + 0.5) * step * 100) / W}%`,
            top: 0,
          }}
        >
          <p className="whitespace-nowrap text-xs font-semibold text-cream">
            {new Date(hovered.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          </p>
          <p className="whitespace-nowrap text-xs text-cream/80">
            {fmt(hovered.revenueMinor)} · {hovered.bagsSold} panier{hovered.bagsSold > 1 ? 's' : ''}
          </p>
        </div>
      ) : null}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Chiffre d'affaires quotidien"
      >
        {/* Grille horizontale récessive (3 niveaux) */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={0}
            x2={W}
            y1={PAD_TOP + plotH * (1 - f)}
            y2={PAD_TOP + plotH * (1 - f)}
            stroke="#000000"
            strokeOpacity={0.07}
          />
        ))}
        {/* Ligne de base */}
        <line
          x1={0}
          x2={W}
          y1={PAD_TOP + plotH}
          y2={PAD_TOP + plotH}
          stroke="#000000"
          strokeOpacity={0.15}
        />

        {series.map((p, i) => {
          const h = Math.round((p.revenueMinor / max) * plotH);
          const x = i * step + (step - barW) / 2;
          const y = PAD_TOP + plotH - h;
          const isHover = hover === i;
          return (
            <g key={p.date}>
              {/* Barre visible : coins arrondis en tête, ancrée à la base */}
              {p.revenueMinor > 0 ? (
                <path
                  d={`M${x},${PAD_TOP + plotH} V${y + 3} Q${x},${y} ${x + 3},${y} H${x + barW - 3} Q${x + barW},${y} ${x + barW},${y + 3} V${PAD_TOP + plotH} Z`}
                  fill={isHover ? BAR_HOVER : BAR_FILL}
                />
              ) : (
                <rect
                  x={x}
                  y={PAD_TOP + plotH - 2}
                  width={barW}
                  height={2}
                  fill="#000000"
                  fillOpacity={0.1}
                />
              )}
              {/* Étiquette directe : uniquement le meilleur jour */}
              {i === maxIdx && p.revenueMinor > 0 ? (
                <text
                  x={Math.min(Math.max(x + barW / 2, 30), W - 30)}
                  y={y - 6}
                  textAnchor="middle"
                  className="fill-pine"
                  fontSize={11}
                  fontWeight={700}
                >
                  {fmt(p.revenueMinor)}
                </text>
              ) : null}
              {/* Zone de survol pleine hauteur (cible plus large que la barre) */}
              <rect
                x={i * step}
                y={PAD_TOP}
                width={step}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          );
        })}

        {/* Repères temporels : ~1 étiquette par semaine, encre atténuée */}
        {series.map((p, i) =>
          i % 7 === 0 ? (
            <text
              key={`t-${p.date}`}
              x={i * step + step / 2}
              y={H - 6}
              textAnchor="middle"
              fontSize={10}
              fill="#000000"
              fillOpacity={0.45}
            >
              {new Date(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}
