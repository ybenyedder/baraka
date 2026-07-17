import type { Locale } from '@baraka/shared';

import frCommon from '../locales/fr/common.json';
import frAuth from '../locales/fr/auth.json';
import frDiscovery from '../locales/fr/discovery.json';
import frOrders from '../locales/fr/orders.json';
import frMerchant from '../locales/fr/merchant.json';
import frLegal from '../locales/fr/legal.json';

import enCommon from '../locales/en/common.json';
import enAuth from '../locales/en/auth.json';
import enDiscovery from '../locales/en/discovery.json';
import enOrders from '../locales/en/orders.json';
import enMerchant from '../locales/en/merchant.json';
import enLegal from '../locales/en/legal.json';

import arCommon from '../locales/ar/common.json';
import arAuth from '../locales/ar/auth.json';
import arDiscovery from '../locales/ar/discovery.json';
import arOrders from '../locales/ar/orders.json';
import arMerchant from '../locales/ar/merchant.json';
import arLegal from '../locales/ar/legal.json';

export const NAMESPACES = ['common', 'auth', 'discovery', 'orders', 'merchant', 'legal'] as const;
export type Namespace = (typeof NAMESPACES)[number];

/** Ressources i18n indexées par locale puis namespace (consommées par i18next et next-intl). */
export const resources: Record<Locale, Record<Namespace, Record<string, unknown>>> = {
  fr: {
    common: frCommon,
    auth: frAuth,
    discovery: frDiscovery,
    orders: frOrders,
    merchant: frMerchant,
    legal: frLegal,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    discovery: enDiscovery,
    orders: enOrders,
    merchant: enMerchant,
    legal: enLegal,
  },
  ar: {
    common: arCommon,
    auth: arAuth,
    discovery: arDiscovery,
    orders: arOrders,
    merchant: arMerchant,
    legal: arLegal,
  },
};

/** Messages aplatis d'une locale (toutes namespaces fusionnées) — pratique pour next-intl. */
export function getMessages(locale: Locale): Record<Namespace, Record<string, unknown>> {
  return resources[locale];
}

export * from './config';
