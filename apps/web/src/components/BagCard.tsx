import type { BagCard as BagCardData } from '@baraka/shared';
import { formatMoney, formatPickupWindow, money, type Currency } from '@baraka/shared';
import { LOCALE_BCP47, type Locale } from '@baraka/i18n/config';
import { Link } from '@/i18n/navigation';
import { foodPhoto } from '@/lib/photos';

function distance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

/** Carte de panier surprise (feed de recherche façon TGTG). */
export function BagCard({
  bag,
  locale,
  todayLabel,
  leftLabel,
}: {
  bag: BagCardData;
  locale: Locale;
  todayLabel: string;
  leftLabel: string;
}) {
  const bcp47 = LOCALE_BCP47[locale];
  const photo = bag.imageUrl ?? foodPhoto(bag.storeCategory, bag.storeSlug);
  // Fenêtre de retrait formatée en heure de Tunis (voir formatPickupWindow) — évite un
  // décalage d'heure/de jour selon le fuseau du navigateur du visiteur.
  const { dayLabel, range } = formatPickupWindow(
    bag.pickupStartAt,
    bag.pickupEndAt,
    bcp47,
    todayLabel,
  );
  const discount = Math.round((1 - bag.price.amountMinor / bag.originalValue.amountMinor) * 100);

  return (
    <Link
      href={`/stores/${bag.storeSlug}`}
      className="group block overflow-hidden rounded-3xl bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative h-36 overflow-hidden bg-cream-deep">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <span className="absolute start-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-pine shadow-sm">
          {leftLabel}
        </span>
        {discount > 0 ? (
          <span className="absolute end-3 top-3 rounded-full bg-yellow px-2.5 py-1 text-xs font-extrabold text-pine shadow-sm">
            -{discount}%
          </span>
        ) : null}
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pine text-xs font-bold text-cream">
            {bag.storeName.slice(0, 2).toUpperCase()}
          </span>
          <p className="truncate font-display font-extrabold text-pine">{bag.storeName}</p>
        </div>
        <p className="mt-1 truncate text-sm text-black/70">{bag.title}</p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-black/50">
          <span className="inline-flex items-center gap-1">
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" strokeLinecap="round" />
            </svg>
            {dayLabel} {range}
          </span>
          <span className="inline-flex items-center gap-1">
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
              <circle cx="12" cy="10" r="2.4" />
            </svg>
            {distance(bag.distanceMeters)}
          </span>
          {bag.ratingAvg ? (
            <span className="inline-flex items-center gap-1 font-semibold text-pine">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-yellow" aria-hidden>
                <path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18.8 6.2 21.9l1.1-6.5L2.6 9.8l6.5-.9z" />
              </svg>
              {bag.ratingAvg.toFixed(1)}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full bg-yellow px-3 py-1 font-bold text-pine">
            {formatMoney(money(bag.price.amountMinor, bag.price.currency as Currency), bcp47)}
          </span>
          <span className="text-sm text-black/40 line-through">
            {formatMoney(
              money(bag.originalValue.amountMinor, bag.originalValue.currency as Currency),
              bcp47,
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
