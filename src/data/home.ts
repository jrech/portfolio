/**
 * Homepage copy, taken verbatim from the approved Pen frames.
 * Where tablet/mobile frames use different copy, both versions are kept.
 * Projects and the testimonial live in the `projects` content collection.
 */

export interface Service {
  name: string;
  /** Desktop copy. */
  description: string;
  /** Tablet + mobile copy. */
  shortDescription: string;
}

export const services: Service[] = [
  {
    name: 'Brand & visual direction',
    description:
      'A clear, distinctive identity that makes your business memorable and helps the right people see what sets you apart.',
    shortDescription: 'A clear identity that makes your business stand out.',
  },
  {
    name: 'Web design & development',
    description:
      'A thoughtful website shaped around your goals and customers — from structure and design through development and launch.',
    shortDescription: 'Thoughtful websites, from first idea to launch.',
  },
  {
    name: 'Content & photography',
    description:
      'Original photography and clear content that bring your business to life, feel authentic and build trust.',
    shortDescription: 'Original words and images that tell your story.',
  },
  {
    name: 'Ongoing support',
    description:
      'Updates, improvements and practical support to keep your website useful as your business grows.',
    shortDescription: 'Updates and support as your business grows.',
  },
];

export interface Step {
  title: string;
  description: string;
  outcome: string;
}

export const steps: Step[] = [
  {
    title: 'Start with a conversation',
    description: 'We talk about your business, your customers and what needs to change.',
    outcome: 'A shared understanding',
  },
  {
    title: 'Find the right direction',
    description: 'We agree on the offer, scope and visual direction before design begins.',
    outcome: 'An agreed plan',
  },
  {
    title: 'Bring it to life',
    description:
      'Design, content and development come together, with your feedback along the way.',
    outcome: 'A website taking shape',
  },
  {
    title: 'Launch with confidence',
    description: 'We test, refine and launch — then agree on the support you need next.',
    outcome: 'Ready for the real world',
  },
];

export interface Faq {
  question: string;
  answer: string;
}

export const faqs: Faq[] = [
  {
    question: 'How much does a project cost?',
    answer:
      'It depends on the scope, content and level of support you need. After our first conversation, I’ll put together a proposal with clear deliverables and a project fee.',
  },
  {
    question: 'How long does a website take?',
    answer:
      'The timeline depends on the size of the project and how ready the content is. We agree on milestones and feedback points before work begins.',
  },
  {
    question: 'Can we work together on just one service?',
    answer:
      'Yes. We can focus on your brand, website or photography — or bring them together if that’s what your business needs.',
  },
  {
    question: 'Do I need to prepare all the content?',
    answer:
      'You don’t need everything ready to start a conversation. We’ll look at what you already have and decide where copy or original photography would help.',
  },
  {
    question: 'What happens after launch?',
    answer:
      'We agree on a handover and any ongoing support as part of the project. If your business changes, we can revisit the website and plan the next improvements.',
  },
];
