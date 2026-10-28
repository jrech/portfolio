export interface NavItem {
  label: string;
  href: string;
}

export const site = {
  name: 'Jonas Rech',
  wordmark: 'JONAS RECH',
  email: 'hello@jonasrech.com',
  location: 'Based in Czech Republic / Working everywhere',
  year: 2026,
};

/** Fullscreen menu, numbered 01–05 in the approved frames. */
export const menuNav: NavItem[] = [
  { label: 'Work', href: '/#work' },
  { label: 'Services', href: '/#services' },
  { label: 'About', href: '/#about' },
  { label: 'Process', href: '/#process' },
  { label: 'Contact', href: '#contact' },
];

/** Footer "Explore" list. */
export const footerNav: NavItem[] = [
  { label: 'Work', href: '/#work' },
  { label: 'Services', href: '/#services' },
  { label: 'About', href: '/#about' },
  { label: 'Process', href: '/#process' },
  { label: 'FAQ', href: '/#faq' },
];

// From Jonas (2026-10-28). Instagram handle "jonasrech.design" still to be confirmed.
export const socials = [
  { label: 'Instagram', href: 'https://www.instagram.com/jonasrech.design/', icon: 'instagram' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/jonasrech/', icon: 'linkedin' },
] as const;
