'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
  BAG_CATEGORY_LABELS,
  DIETARY_LABELS,
  INSTANCE_STATUS_LABELS,
  WEEKDAY_LABELS,
  formatTimeFr,
} from '@/components/merchant/ui';
import {
  webApi,
  type WebStore,
  type WebTemplate,
  type WebSchedule,
  type WebInstance,
} from '@/lib/client';
import { Button } from '@/components/ui/Button';
import {
  formatMoney,
  money,
  fromMajor,
  toMajor,
  type Currency,
  type UpsertBagTemplate,
  type UpsertStore,
} from '@baraka/shared';

type Tab = 'bags' | 'today' | 'info';
type Msg = { text: string; ok: boolean } | null;

export default function StoreManage() {
  const params = useParams<{ storeId: string }>();
  const storeId = params.storeId;
  const [store, setStore] = useState<WebStore | null>(null);
  const [tab, setTab] = useState<Tab>('bags');
  const [msg, setMsg] = useState<Msg>(null);

  const loadStore = useCallback(async () => {
    const s = await webApi.myStores();
    setStore(s.items.find((x) => x.id === storeId) ?? null);
  }, [storeId]);

  useEffect(() => {
    void loadStore();
  }, [loadStore]);

  async function toggleStatus() {
    if (!store) return;
    const next = store.status === 'active' ? 'paused' : 'active';
    try {
      await webApi.setStoreStatus(store.id, next);
      setMsg({
        text:
          next === 'active'
            ? 'Boutique activée : elle est visible des clients.'
            : 'Boutique mise en pause.',
        ok: true,
      });
      void loadStore();
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'Échec.', ok: false });
    }
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'bags', label: 'Paniers & plannings' },
    { key: 'today', label: "Aujourd'hui" },
    { key: 'info', label: 'Infos & photos' },
  ];

  return (
    <MerchantShell>
      {!store ? (
        <p className="text-black/50">Chargement…</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-black/45">
                <Link href="/merchant/stores" className="underline">
                  Boutiques
                </Link>{' '}
                / {store.city}
              </p>
              <h1 className="font-display mt-1 flex items-center gap-3 text-2xl font-extrabold text-pine">
                {store.name}
                <StatusBadge status={store.status} labels={STORE_STATUS_LABELS} />
              </h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" href={`/stores/${store.slug}`}>
                Voir la page publique
              </Button>
              <Button
                onClick={toggleStatus}
                variant={store.status === 'active' ? 'outline' : 'primary'}
              >
                {store.status === 'active' ? 'Mettre en pause' : 'Activer la boutique'}
              </Button>
            </div>
          </div>
          <Feedback msg={msg} />

          <div className="mt-6 flex gap-1 overflow-x-auto rounded-full bg-pine/5 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                  tab === t.key ? 'bg-pine text-cream' : 'text-pine/70 hover:text-pine'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {tab === 'bags' ? <TemplatesTab storeId={store.id} /> : null}
            {tab === 'today' ? <TodayTab storeId={store.id} /> : null}
            {tab === 'info' ? <InfoTab store={store} onSaved={loadStore} /> : null}
          </div>
        </>
      )}
    </MerchantShell>
  );
}

// ── Onglet Paniers & plannings ────────────────────────────────────────────────

function TemplatesTab({ storeId }: { storeId: string }) {
  const [templates, setTemplates] = useState<WebTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const t = await webApi.templates(storeId);
      setTemplates(t.items);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-black/50">Chargement…</p>;

  return (
    <div className="grid gap-4">
      {templates.length === 0 && !creating ? (
        <Panel className="text-center">
          <p className="text-black/55">
            Un panier surprise décrit ce que tu vends (prix, contenu type). Le planning hebdomadaire
            génère ensuite automatiquement les quantités mises en vente chaque jour.
          </p>
        </Panel>
      ) : null}

      {templates.map((t) => (
        <TemplateCard key={t.id} template={t} onChanged={load} />
      ))}

      {creating ? (
        <TemplateForm
          title="Nouveau panier"
          onSubmit={async (input) => {
            await webApi.createTemplate(storeId, input);
            setCreating(false);
            void load();
          }}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <div>
          <Button onClick={() => setCreating(true)}>+ Nouveau panier</Button>
        </div>
      )}
    </div>
  );
}

function TemplateCard({ template, onChanged }: { template: WebTemplate; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  async function uploadImage(file: File) {
    setMsg(null);
    try {
      await webApi.uploadTemplateImage(template.id, file);
      setMsg({ text: 'Photo mise à jour.', ok: true });
      onChanged();
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Échec de l'upload.", ok: false });
    }
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-pine/10">
          {template.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={template.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-pine">
            {template.name}
            {!template.active ? (
              <span className="ml-2 rounded-full bg-black/[0.06] px-2 py-0.5 text-xs font-semibold text-black/50">
                Désactivé
              </span>
            ) : null}
          </p>
          <p className="text-sm text-black/50">
            {BAG_CATEGORY_LABELS[template.bagCategory] ?? template.bagCategory} ·{' '}
            <span className="font-bold text-pine">
              {formatMoney(money(template.priceMinor, template.currency as Currency))}
            </span>{' '}
            <span className="line-through">
              {formatMoney(money(template.originalValueMinor, template.currency as Currency))}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <label className="cursor-pointer rounded-full border-2 border-pine px-4 py-1.5 text-sm font-bold text-pine transition hover:bg-pine/5">
            Photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadImage(f);
              }}
            />
          </label>
          <Button variant="outline" onClick={() => setEditing((v) => !v)}>
            {editing ? 'Fermer' : 'Modifier'}
          </Button>
          <Button variant="dark" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Masquer le planning' : 'Planning'}
          </Button>
        </div>
      </div>
      <Feedback msg={msg} />

      {editing ? (
        <div className="mt-4 border-t border-black/[0.06] pt-4">
          <TemplateForm
            title="Modifier le panier"
            initial={template}
            onSubmit={async (input) => {
              await webApi.updateTemplate(template.id, input);
              setEditing(false);
              onChanged();
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : null}

      {expanded ? (
        <div className="mt-4 border-t border-black/[0.06] pt-4">
          <SchedulesEditor templateId={template.id} />
        </div>
      ) : null}
    </Panel>
  );
}

function TemplateForm({
  title,
  initial,
  onSubmit,
  onCancel,
}: {
  title: string;
  initial?: WebTemplate;
  onSubmit: (input: UpsertBagTemplate) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [bagCategory, setBagCategory] = useState(initial?.bagCategory ?? 'meal');
  const [price, setPrice] = useState(
    initial ? String(toMajor(money(initial.priceMinor, initial.currency as Currency))) : '7.5',
  );
  const [original, setOriginal] = useState(
    initial
      ? String(toMajor(money(initial.originalValueMinor, initial.currency as Currency)))
      : '20',
  );
  const [dietary, setDietary] = useState<string[]>(initial?.dietary ?? []);
  const [active, setActive] = useState(initial?.active ?? true);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);

  function toggleDietary(flag: string) {
    setDietary((d) => (d.includes(flag) ? d.filter((x) => x !== flag) : [...d, flag]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await onSubmit({
        name,
        description: description || undefined,
        bagCategory: bagCategory as UpsertBagTemplate['bagCategory'],
        dietary: dietary as UpsertBagTemplate['dietary'],
        priceMinor: fromMajor(Number(price), 'TND').amountMinor,
        originalValueMinor: fromMajor(Number(original), 'TND').amountMinor,
        currency: 'TND',
        active,
      });
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'Échec.', ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className={initial ? '' : 'rounded-3xl bg-white p-6 shadow-sm'}>
      <h3 className="font-display font-extrabold text-pine">{title}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Field label="Nom du panier">
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
            value={bagCategory}
            onChange={(e) => setBagCategory(e.target.value)}
          >
            {Object.entries(BAG_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prix (TND)">
            <input
              className={inputCls}
              type="number"
              step="0.1"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </Field>
          <Field label="Valeur d'origine">
            <input
              className={inputCls}
              type="number"
              step="0.1"
              min="0"
              value={original}
              onChange={(e) => setOriginal(e.target.value)}
              required
            />
          </Field>
        </div>
        <div className="sm:col-span-3">
          <Field label="Description (contenu type, visible des clients)">
            <textarea
              className={`${inputCls} min-h-16`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
            />
          </Field>
        </div>
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-black/45">
        Régimes & allergènes
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {Object.entries(DIETARY_LABELS).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => toggleDietary(key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              dietary.includes(key)
                ? 'bg-pine text-cream'
                : 'bg-pine/5 text-pine/70 hover:bg-pine/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-pine">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Panier actif (proposé à la vente selon son planning)
      </label>

      <Feedback msg={msg} />
      <div className="mt-5 flex gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </form>
  );
}

/** Planning hebdomadaire : une ligne par jour, quantité 0 = pas de vente ce jour-là. */
function SchedulesEditor({ templateId }: { templateId: string }) {
  const [schedules, setSchedules] = useState<WebSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<Msg>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await webApi.schedules(templateId);
      setSchedules(s.items);
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-sm text-black/50">Chargement du planning…</p>;

  // Lundi (1) → dimanche (0) : l'ordre d'affichage suit la semaine française.
  const displayOrder = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div>
      <p className="text-sm text-black/55">
        Les paniers du jour sont générés automatiquement chaque nuit à partir de ce planning
        (fenêtre de retrait + quantité).
      </p>
      <div className="mt-3 grid gap-2">
        {displayOrder.map((weekday) => (
          <ScheduleRow
            key={weekday}
            weekday={weekday}
            schedule={schedules.find((s) => s.weekday === weekday) ?? null}
            templateId={templateId}
            onChanged={load}
            onMsg={setMsg}
          />
        ))}
      </div>
      <Feedback msg={msg} />
    </div>
  );
}

function ScheduleRow({
  weekday,
  schedule,
  templateId,
  onChanged,
  onMsg,
}: {
  weekday: number;
  schedule: WebSchedule | null;
  templateId: string;
  onChanged: () => void;
  onMsg: (m: Msg) => void;
}) {
  const [start, setStart] = useState(schedule?.pickupStart?.slice(0, 5) ?? '18:00');
  const [end, setEnd] = useState(schedule?.pickupEnd?.slice(0, 5) ?? '20:00');
  const [qty, setQty] = useState(String(schedule?.quantity ?? 0));
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    onMsg(null);
    try {
      await webApi.upsertSchedule(templateId, {
        weekday,
        pickupStart: start,
        pickupEnd: end,
        quantity: Number(qty),
      });
      onMsg({ text: `${WEEKDAY_LABELS[weekday]} enregistré.`, ok: true });
      onChanged();
    } catch (err) {
      onMsg({ text: err instanceof Error ? err.message : 'Échec.', ok: false });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!schedule) return;
    setBusy(true);
    try {
      await webApi.deleteSchedule(schedule.id);
      onMsg({ text: `${WEEKDAY_LABELS[weekday]} supprimé du planning.`, ok: true });
      onChanged();
    } catch (err) {
      onMsg({ text: err instanceof Error ? err.message : 'Échec.', ok: false });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-cream/70 px-3 py-2">
      <span className="w-24 text-sm font-semibold text-pine">{WEEKDAY_LABELS[weekday]}</span>
      <input
        type="time"
        className="rounded-lg border border-pine/15 bg-white px-2 py-1.5 text-sm"
        value={start}
        onChange={(e) => setStart(e.target.value)}
      />
      <span className="text-black/40">→</span>
      <input
        type="time"
        className="rounded-lg border border-pine/15 bg-white px-2 py-1.5 text-sm"
        value={end}
        onChange={(e) => setEnd(e.target.value)}
      />
      <input
        type="number"
        min={0}
        max={500}
        className="w-20 rounded-lg border border-pine/15 bg-white px-2 py-1.5 text-sm"
        value={qty}
        onChange={(e) => setQty(e.target.value)}
        aria-label="Quantité"
      />
      <span className="text-xs text-black/45">paniers</span>
      <div className="ml-auto flex gap-2">
        <button
          onClick={() => void save()}
          disabled={busy}
          className="rounded-full bg-pine px-4 py-1.5 text-xs font-bold text-cream transition hover:bg-pine/90 disabled:opacity-50"
        >
          Enregistrer
        </button>
        {schedule ? (
          <button
            onClick={() => void remove()}
            disabled={busy}
            className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            Retirer
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ── Onglet Aujourd'hui ────────────────────────────────────────────────────────

function TodayTab({ storeId }: { storeId: string }) {
  const [instances, setInstances] = useState<WebInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<Msg>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const i = await webApi.todayInstances(storeId);
      setInstances(i.items);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-black/50">Chargement…</p>;

  return (
    <div className="grid gap-3">
      <Feedback msg={msg} />
      {instances.length === 0 ? (
        <Panel className="text-center">
          <p className="text-black/55">
            Aucune vente prévue aujourd'hui. Les paniers du jour sont générés depuis les plannings
            des paniers actifs (boutique active requise).
          </p>
        </Panel>
      ) : (
        instances.map((i) => (
          <InstanceRow key={i.id} instance={i} onChanged={load} onMsg={setMsg} />
        ))
      )}
    </div>
  );
}

function InstanceRow({
  instance,
  onChanged,
  onMsg,
}: {
  instance: WebInstance;
  onChanged: () => void;
  onMsg: (m: Msg) => void;
}) {
  const [qty, setQty] = useState(String(instance.quantity_total));
  const [busy, setBusy] = useState(false);
  const remaining = instance.quantity_total - instance.quantity_reserved - instance.quantity_sold;

  async function saveQty() {
    setBusy(true);
    onMsg(null);
    try {
      await webApi.adjustInstance(instance.id, { quantityTotal: Number(qty) });
      onMsg({ text: 'Quantité ajustée.', ok: true });
      onChanged();
    } catch (err) {
      onMsg({ text: err instanceof Error ? err.message : 'Échec.', ok: false });
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (
      !window.confirm(
        'Annuler cette vente du jour ? Les réservations en cours seront annulées et remboursées.',
      )
    )
      return;
    setBusy(true);
    try {
      await webApi.adjustInstance(instance.id, { cancel: true });
      onMsg({ text: 'Vente du jour annulée.', ok: true });
      onChanged();
    } catch (err) {
      onMsg({ text: err instanceof Error ? err.message : 'Échec.', ok: false });
    } finally {
      setBusy(false);
    }
  }

  const isOver = ['cancelled', 'ended'].includes(instance.status);

  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-semibold text-pine">
            {instance.title}
            <StatusBadge status={instance.status} labels={INSTANCE_STATUS_LABELS} />
          </p>
          <p className="mt-0.5 text-sm text-black/50">
            Retrait {formatTimeFr(instance.pickup_start_at)} –{' '}
            {formatTimeFr(instance.pickup_end_at)} ·{' '}
            {formatMoney(money(instance.price_minor, instance.currency as Currency))}
          </p>
          <p className="mt-1 text-sm text-black/60">
            <strong className="text-pine">{remaining}</strong> restants ·{' '}
            {instance.quantity_reserved} réservés · {instance.quantity_sold} vendus ·{' '}
            {instance.quantity_total} au total
          </p>
        </div>
        {!isOver ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              className="w-20 rounded-lg border border-pine/15 px-2 py-1.5 text-sm"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              aria-label="Quantité totale"
            />
            <Button variant="outline" onClick={() => void saveQty()} disabled={busy}>
              Ajuster
            </Button>
            <button
              onClick={() => void cancel()}
              disabled={busy}
              className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              Annuler la vente
            </button>
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

// ── Onglet Infos & photos ─────────────────────────────────────────────────────

function InfoTab({ store, onSaved }: { store: WebStore; onSaved: () => void }) {
  const [name, setName] = useState(store.name);
  const [category, setCategory] = useState(store.category ?? 'meals');
  const [description, setDescription] = useState(store.description ?? '');
  const [addressLine, setAddressLine] = useState(store.addressLine);
  const [city, setCity] = useState(store.city);
  const [governorate, setGovernorate] = useState(store.governorate ?? '');
  const [lat, setLat] = useState(String(store.lat));
  const [lng, setLng] = useState(String(store.lng));
  const [hours, setHours] = useState<Record<string, string>>(store.openingHours ?? {});
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);

  const HOURS_KEYS = [
    ['mon', 'Lundi'],
    ['tue', 'Mardi'],
    ['wed', 'Mercredi'],
    ['thu', 'Jeudi'],
    ['fri', 'Vendredi'],
    ['sat', 'Samedi'],
    ['sun', 'Dimanche'],
  ] as const;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const openingHours = Object.fromEntries(
        Object.entries(hours).filter(([, v]) => v.trim() !== ''),
      );
      const input: UpsertStore = {
        name,
        category: category as UpsertStore['category'],
        description: description || undefined,
        addressLine,
        city,
        governorate: governorate || undefined,
        lat: Number(lat),
        lng: Number(lng),
        openingHours: Object.keys(openingHours).length ? openingHours : undefined,
      };
      await webApi.updateStore(store.id, input);
      setMsg({ text: 'Boutique mise à jour.', ok: true });
      onSaved();
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'Échec.', ok: false });
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File, type: 'cover' | 'logo') {
    setMsg(null);
    try {
      await webApi.uploadStoreImage(store.id, file, type);
      setMsg({
        text: type === 'cover' ? 'Photo de couverture mise à jour.' : 'Logo mis à jour.',
        ok: true,
      });
      onSaved();
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : "Échec de l'upload.", ok: false });
    }
  }

  return (
    <div className="grid gap-6">
      <Panel title="Photos">
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ['cover', 'Photo de couverture', store.coverImageUrl],
              ['logo', 'Logo', store.logoUrl],
            ] as const
          ).map(([type, label, url]) => (
            <div key={type}>
              <p className="text-xs font-semibold uppercase tracking-wide text-black/45">{label}</p>
              <div className="mt-2 h-36 overflow-hidden rounded-xl bg-pine/10">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-pine/40">
                    Aucune image
                  </div>
                )}
              </div>
              <label className="mt-2 inline-block cursor-pointer rounded-full border-2 border-pine px-4 py-1.5 text-sm font-bold text-pine transition hover:bg-pine/5">
                Changer
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void upload(f, type);
                  }}
                />
              </label>
            </div>
          ))}
        </div>
      </Panel>

      <form onSubmit={submit}>
        <Panel title="Informations">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom">
              <input
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
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
              <Field label="Description">
                <textarea
                  className={`${inputCls} min-h-20`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Adresse">
              <input
                className={inputCls}
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                required
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
            <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
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

          <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-black/45">
            Horaires d'ouverture (affichage, ex : 09:00–19:00 — vide = fermé)
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {HOURS_KEYS.map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-24 text-sm text-pine">{label}</span>
                <input
                  className={inputCls}
                  placeholder="09:00–19:00"
                  value={hours[key] ?? ''}
                  onChange={(e) => setHours((h) => ({ ...h, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>

          <Feedback msg={msg} />
          <Button type="submit" className="mt-5" disabled={busy}>
            {busy ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </Button>
        </Panel>
      </form>
    </div>
  );
}
