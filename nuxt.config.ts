export default defineNuxtConfig({
  ssr: false,
  modules: ["@nuxtjs/tailwindcss"],
  compatibilityDate: "2025-03-20",
  app: {
    head: {
      title: "CrewCal",
      meta: [
        {
          name: "description",
          content: "Export your crew roster to calendar events",
        },
      ],
    },
  },
});
