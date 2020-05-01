module.exports = {
  title: 'mgFx',
  tagline: 'Managed Effects for JavaScript',
  url: 'https://ai-labs-team.github.io',
  baseUrl: '/mgFx',
  favicon: 'img/favicon.ico',
  organizationName: 'ai-labs-team',
  projectName: 'mgFx',
  themeConfig: {
    navbar: {
      title: 'mgFx',
      links: [
        {
          to: 'docs/intro',
          activeBasePath: 'docs',
          label: 'Docs',
          position: 'left',
        },
        {
          href: 'https://github.com/ai-labs-team/mgFx',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Introduction',
              to: 'docs/intro',
            },
            {
              label: 'Guide',
              to: 'docs/guide',
            },
            {
              label: 'API Reference',
              to: 'docs/api',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/mgFx',
            },
            /**
             * TODO: Gitter
             */
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/ai-labs-team/mgFx',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} mgFx Contributors. Built with Docusaurus.`,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/ai-labs-team/mgFx/edit/master/website/',
          remarkPlugins: [
            require('remark-mermaid'),
            require('remark-code-import'),
            require('./src/plugins/remark-npm2yarn'),
          ],
        },
        /**
         * TODO: Enable
        blog: {
          showReadingTime: true,
          editUrl:
            'https://github.com/ai-labs-team/mgFx/edit/master/website/blog/',
        },
         */
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
