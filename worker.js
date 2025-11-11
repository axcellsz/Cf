
export default {
  async fetch(request, env, ctx) {
    return new Response("HAI", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
};
