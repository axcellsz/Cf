addEventListener("fetch", event => {
  event.respondWith(handle(event.request));
});

async function handle(req) {
  return new Response("HALLO BANGSAT", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}
