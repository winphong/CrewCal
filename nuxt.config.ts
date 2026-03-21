export default defineNuxtConfig({
  ssr: false,
  modules: ["@nuxtjs/tailwindcss"],
  compatibilityDate: "2025-03-20",
  app: {
    head: {
      title: "CrewCal",
      link: [
        {
          rel: "icon",
          href: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✈️</text></svg>",
        },
      ],
      meta: [
        {
          name: "description",
          content: "Export your crew roster to calendar events",
        },
      ],
    },
  },
});
