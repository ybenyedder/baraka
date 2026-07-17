'use client';

import { useCallback, useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { MerchantShell } from '@/components/MerchantShell';
import {
  Field,
  Panel,
  Feedback,
  inputCls,
  StatusBadge,
  STORE_STATUS_LABELS,
  STORE_CATEGORY_LABELS,
} from '@/components/merchant/ui';
import { webApi, type WebStore } from '@/lib/client';
import { Button } from '@/components/ui/Button';

export default function MerchantStores() {
  const [stores, setStores] = useState<WebStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await webApi.myStores();
      setStores(s.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <MerchantShell title="Mes boutiques">
      {loading ? (
        <p className="text-black/50">Chargement…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {stores.map((s) => (
              <Link
                key={s.id}
                href={`/merchant/stores/${s.id}`}
                className="group overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="relative h-32 bg-pine/10">
                  {s.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.coverImageUrl}
                      alt=""
                      className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-pine/40">
                      Pas encore de photo de couverture
                    </div>
                  )}
                  <span className="absolute right-3 top-3">
                    <StatusBadge status={s.status} labels={STORE_STATUS_LABELS} />
                  </span>
                </div>
                <div className="p-4">
                  <p className="font-semibold text-pine">{s.name}</p>
                  <p className="mt-0.5 text-sm text-black/50">
                    {s.category ? `${STORE_CATEGORY_LABELS[s.category] ?? s.category} · ` : ''}
                    {s.addressLine}, {s.city}
                  </p>
                  {s.ratingAvg != null ? (
                    <p className="mt-1 text-sm text-black/60">
                      ★ {s.ratingAvg.toFixed(1)} ({s.ratingCount} avis)
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>

          {stores.length === 0 && !showForm ? (
            <Panel className="text-center">
              <p className="text-black/55">
                Aucune boutique pour l'instant. Une boutique est ton point de retrait : les clients
                y récupèrent leurs paniers surprise.
              </p>
            </Panel>
          ) : null}

          {showForm ? (
            <CreateStoreForm
              onDone={() => {
                setShowForm(false);
                void load();
              }}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <div className="mt-6">
              <Button onClick={() => setShowForm(true)}>+ Nouvelle boutique</Button>
            </div>
          )}
        </>
      )}
    </MerchantShell>
  );
}

function CreateStoreForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('meals');
  const [description, setDescription] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('Tunis');
  const [governorate, setGovernorate] = useState('');
  const [lat, setLat] = useState('36.8008');
  const [lng, setLng] = useState('10.1815');
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await webApi.createStore({
        name,
        category: category as never,
        description: description || undefined,
        addressLine,
        city,
        governorate: governorate || undefined,
        lat: Number(lat),
        lng: Number(lng),
      });
      onDone();
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'Échec de la création.', ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
      <h3 className="font-display font-extrabold text-pine">Nouvelle boutique</h3>
      <p className="mt-1 text-sm text-black/50">
        Elle sera créée en brouillon : ajoute ensuite tes paniers puis active-la pour être visible
        des clients.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Nom de la boutique">
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
          />
        </Field>
        <Field label="Catégorie">
          <select
            className={inputCls}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {Object.entries(STORE_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description (visible des clients)">
            <textarea
              className={`${inputCls} min-h-20`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
            />
          </Field>
        </div>
        <Field label="Adresse">
          <input
            className={inputCls}
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
            required
            minLength={3}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ville">
            <input
              className={inputCls}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </Field>
          <Field label="Gouvernorat">
            <input
              className={inputCls}
              value={governorate}
              onChange={(e) => setGovernorate(e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:max-w-sm">
          <Field label="Latitude">
            <input
              className={inputCls}
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              required
            />
          </Field>
          <Field label="Longitude">
            <input
              className={inputCls}
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              required
            />
          </Field>
        </div>
      </div>
      <p className="mt-2 text-xs text-black/45">
        Astuce : clic droit sur ta boutique dans Google Maps ou OpenStreetMap pour copier
        latitude/longitude.
      </p>
      <Feedback msg={msg} />
      <div className="mt-5 flex gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? 'Création…' : 'Créer la boutique'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
