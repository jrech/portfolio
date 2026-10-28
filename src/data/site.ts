import { localePath, type Dict, type Locale } from '@/i18n';

export interface NavItem {
  label: string;
  href: string;
}

export const site = {
  name: 'Jonas Rech',
  wordmark: 'JONAS RECH',
  email: 'hello@jonasrech.com',
  year: 2026,
};

/** Fullscreen menu, numbered 01–05 in the approved frames. */
export const menuNav = (t: Dict, locale: Locale): NavItem[] => [
  { label: t.nav.work, href: localePath(locale, '/#work') },
  { label: t.nav.services, href: localePath(locale, '/#services') },
  { label: t.nav.about, href: localePath(locale, '/#about') },
  { label: t.nav.process, href: localePath(locale, '/#process') },
  { label: t.nav.contact, href: '#contact' },
];

/** Footer "Explore" list. */
export const footerNav = (t: Dict, locale: Locale): NavItem[] => [
  { label: t.nav.work, href: localePath(locale, '/#work') },
  { label: t.nav.services, href: localePath(locale, '/#services') },
  { label: t.nav.about, href: localePath(locale, '/#about') },
  { label: t.nav.process, href: localePath(locale, '/#process') },
  { label: t.nav.faq, href: localePath(locale, '/#faq') },
];

// From Jonas (2026-10-28). Instagram handle "jonasrech.design" still to be confirmed.
export const socials = [
  { label: 'Instagram', href: 'https://www.instagram.com/jonasrech.design/', icon: 'instagram' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/jonasrech/', icon: 'linkedin' },
] as const;
