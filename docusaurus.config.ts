import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'RGS Carbide Enclave',
  tagline: 'Airgapped deployment of the RGS Carbide suite',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://jradtke-rgs.github.io',
  baseUrl: '/',

  organizationName: 'jradtke-rgs',
  projectName: 'docs.carbide-enclave.kubernerdes.com',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/jradtke-rgs/docs.carbide-enclave.kubernerdes.com/tree/main/',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Carbide Enclave',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'enclaveSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/jradtke-rgs/carbide-enclave.kubernerdes.com',
          label: 'Infra repo',
          position: 'right',
        },
        {
          href: 'https://github.com/jradtke-rgs/docs.carbide-enclave.kubernerdes.com',
          label: 'Docs repo',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Resources',
          items: [
            {label: 'Hauler', href: 'https://hauler.dev'},
            {label: 'RKE2 airgap install', href: 'https://docs.rke2.io/install/airgap'},
            {label: 'Harvester docs', href: 'https://docs.harvesterhci.io'},
            {label: 'step-ca docs', href: 'https://smallstep.com/docs/step-ca'},
          ],
        },
        {
          title: 'Repositories',
          items: [
            {
              label: 'Infra repo',
              href: 'https://github.com/jradtke-rgs/carbide-enclave.kubernerdes.com',
            },
            {
              label: 'Docs repo',
              href: 'https://github.com/jradtke-rgs/docs.carbide-enclave.kubernerdes.com',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} RGS Carbide Enclave. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'yaml', 'typescript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
