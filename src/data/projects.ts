export type ProjectVisual = {
  kind: 'identity' | 'site' | 'mobile' | 'type' | 'detail';
  title: string;
  kicker?: string;
  body?: string;
  asset?: {
    src: string;
    alt: string;
    width: number;
    height: number;
  };
  caption?: string;
};

export type ProjectStoryBlock =
  | {
      type: 'visual';
      layout: 'full' | 'wide' | 'left' | 'right';
      visual: ProjectVisual;
    }
  | {
      type: 'pair';
      ratio: '50-50' | '30-70' | '70-30';
      visuals: [ProjectVisual, ProjectVisual];
    }
  | {
      type: 'text-visual';
      align: 'text-left' | 'text-right';
      label: string;
      title: string;
      text: string;
      visual: ProjectVisual;
    };

export interface ProjectCaseStudy {
  slug: string;
  lang: 'cs' | 'en';
  title: string;
  seoTitle: string;
  description: string;
  summary: string;
  year: string;
  services: string[];
  hero: ProjectVisual;
  contextLabel: string;
  context: string[];
  contributionLabel: string;
  story: ProjectStoryBlock[];
  brandDetails?: {
    label: string;
    title: string;
    items: Array<{ label: string; value: string }>;
    visual: ProjectVisual;
  };
  outcomeLabel: string;
  outcome: string;
  next: {
    label: string;
    title: string;
    href: string;
  };
  placeholderLabel: string;
}

const projects: ProjectCaseStudy[] = [
  {
    slug: 'pradelna-krkonose',
    lang: 'en',
    title: 'Prádelna Krkonoše',
    seoTitle: 'Prádelna Krkonoše — case study | Jonas Rech',
    description: 'Brand and website case study for Prádelna Krkonoše by independent designer Jonas Rech.',
    summary: 'Making a regional B2B laundry service look as reliable as the service already was.',
    year: '2026',
    services: ['Strategy', 'Web design', 'Copy'],
    hero: {
      kind: 'identity',
      title: 'Prádelna Krkonoše',
      kicker: 'Regional service · Digital presence',
      caption: 'Project-art placeholder — replace with the final hero asset.',
    },
    contextLabel: 'The context',
    context: [
      'The business already had a strong reputation and long-term clients, but the website did not communicate the same level of reliability.',
      'The goal was to make the company easier to understand and give the brand a more confident digital presence.',
    ],
    contributionLabel: 'What I did',
    story: [
      {
        type: 'visual',
        layout: 'wide',
        visual: {
          kind: 'site',
          kicker: 'Information structure',
          title: 'Clear from the first screen.',
          body: 'Services · Capacity · Contact',
          caption: 'Desktop website presentation — replace the fallback with the finished page capture.',
        },
      },
      {
        type: 'text-visual',
        align: 'text-left',
        label: 'A practical website',
        title: 'Clarity mattered more than persuasion.',
        text: 'Most customers already knew the business offline. The website therefore focused on making services and contact information immediately clear.',
        visual: {
          kind: 'mobile',
          kicker: 'Responsive detail',
          title: 'Services first',
          caption: 'Mobile website detail — replace the fallback with a final responsive crop.',
        },
      },
      {
        type: 'visual',
        layout: 'right',
        visual: {
          kind: 'detail',
          kicker: 'Interface detail',
          title: 'What clients need, without the detour.',
          body: 'Service information and contact paths remain visible and easy to scan.',
          caption: 'Interface detail — replace the fallback with a real page crop.',
        },
      },
    ],
    brandDetails: {
      label: 'Visual language',
      title: 'A straightforward system built around trust and legibility.',
      items: [
        { label: 'Palette', value: 'Warm white · Black · Orange' },
        { label: 'Approach', value: 'Editorial hierarchy · Direct language' },
      ],
      visual: {
        kind: 'identity',
        kicker: 'Identity detail',
        title: 'Prádelna',
        caption: 'Brand-detail placeholder — replace if final identity assets are available.',
      },
    },
    outcomeLabel: 'The outcome',
    outcome: 'The result is a clearer digital presence that better reflects the reliability of the business, while making it easier for potential clients to understand the service and get in touch.',
    next: {
      label: 'Next project',
      title: 'Proelectrica',
      href: '/en/#work',
    },
    placeholderLabel: 'Replaceable project visual',
  },
  {
    slug: 'pradelna-krkonose',
    lang: 'cs',
    title: 'Prádelna Krkonoše',
    seoTitle: 'Prádelna Krkonoše — případová studie | Jonas Rech',
    description: 'Ukázka práce na značce a webu pro Prádelnu Krkonoše od designéra Jonase Recha.',
    summary: 'Aby regionální B2B prádelna působila na webu stejně spolehlivě jako její služby.',
    year: '2026',
    services: ['Strategie', 'Webdesign', 'Copy'],
    hero: {
      kind: 'identity',
      title: 'Prádelna Krkonoše',
      kicker: 'Regionální služba · Digitální prezentace',
      caption: 'Projektový placeholder — nahraďte finálním hero vizuálem.',
    },
    contextLabel: 'Kontext',
    context: [
      'Firma už měla dobrou pověst a dlouhodobé klienty, ale původní web stejnou míru spolehlivosti nekomunikoval.',
      'Cílem bylo nabídku rychleji vysvětlit a dát značce sebevědomější digitální podobu.',
    ],
    contributionLabel: 'Moje role',
    story: [
      {
        type: 'visual',
        layout: 'wide',
        visual: {
          kind: 'site',
          kicker: 'Struktura informací',
          title: 'Srozumitelné od první obrazovky.',
          body: 'Služby · Kapacita · Kontakt',
          caption: 'Desktopová prezentace webu — nahraďte fallback finálním screenshotem stránky.',
        },
      },
      {
        type: 'text-visual',
        align: 'text-left',
        label: 'Praktický web',
        title: 'Důležitější než přesvědčovat bylo věci jasně vysvětlit.',
        text: 'Většina zákazníků firmu znala offline. Web proto soustředil pozornost na služby a jednoduchou cestu ke kontaktu.',
        visual: {
          kind: 'mobile',
          kicker: 'Responzivní detail',
          title: 'Služby na prvním místě',
          caption: 'Mobilní detail webu — nahraďte fallback finálním responzivním výřezem.',
        },
      },
      {
        type: 'visual',
        layout: 'right',
        visual: {
          kind: 'detail',
          kicker: 'Detail rozhraní',
          title: 'To podstatné bez zbytečných odboček.',
          body: 'Informace o službách a kontakt zůstávají viditelné a snadno skenovatelné.',
          caption: 'Detail rozhraní — nahraďte fallback skutečným výřezem webu.',
        },
      },
    ],
    brandDetails: {
      label: 'Vizuální jazyk',
      title: 'Přímočarý systém postavený na důvěře a čitelnosti.',
      items: [
        { label: 'Paleta', value: 'Teplá bílá · Černá · Oranžová' },
        { label: 'Přístup', value: 'Editoriální hierarchie · Přímý jazyk' },
      ],
      visual: {
        kind: 'identity',
        kicker: 'Detail identity',
        title: 'Prádelna',
        caption: 'Placeholder identity — nahraďte, pokud jsou finální podklady k dispozici.',
      },
    },
    outcomeLabel: 'Výsledek',
    outcome: 'Výsledkem je srozumitelnější digitální prezentace, která lépe odpovídá spolehlivosti firmy a pomáhá potenciálním klientům rychle pochopit nabídku i způsob kontaktu.',
    next: {
      label: 'Další projekt',
      title: 'Proelectrica',
      href: '/cs/#work',
    },
    placeholderLabel: 'Nahraditelný projektový vizuál',
  },
];

export const getProjects = (lang: 'cs' | 'en') => projects.filter((project) => project.lang === lang);

export const getProject = (lang: 'cs' | 'en', slug: string) =>
  projects.find((project) => project.lang === lang && project.slug === slug);
