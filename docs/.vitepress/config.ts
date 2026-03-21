import { defineConfig } from "vitepress";

export default defineConfig({
  base: "/ts-concur/",
  title: "ts-concur",
  description:
    "Concurrent promise pool with adaptive concurrency, throttling and rate limiting for Node.js and browser.",
  lang: "en-US",

  themeConfig: {
    logo: "/logo.png",
    siteTitle: "ts-concur",
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "API", link: "/api" },
      { text: "Roadmap", link: "/roadmap" },
    ],
    sidebar: [
      {
        text: "Introduction",
        items: [{ text: "Getting Started", link: "/guide/getting-started" }],
      },
      {
        text: "Guide",
        items: [
          { text: "Examples & use cases", link: "/guide/examples" },
          { text: "Configuration", link: "/guide/configuration" },
          { text: "Cancellation & Timeouts", link: "/guide/cancellation-timeouts" },
          { text: "Adaptive Concurrency", link: "/guide/adaptive" },
          { text: "Throttle & Rate Limit", link: "/guide/throttle-rate-limit" },
          { text: "Using with Workers", link: "/guide/workers" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "API", link: "/api" },
          { text: "Roadmap", link: "/roadmap" },
        ],
      },
    ],
    outline: { level: [2, 6], label: "On this page" },
    search: {
      provider: "local",
    },
    footer: {
      message: "Released under the MIT License.",
      copyright: "ts-concur",
    },
    externalLinkIcon: true,
    lastUpdated: {
      text: "Updated at",
      formatOptions: {
        dateStyle: "full",
        timeStyle: "short",
      },
    },
  },

  head: [
    [
      "link",
      {
        rel: "icon",
        type: "image/png",
        href: "/logo.png",
      },
    ],
  ],
});
