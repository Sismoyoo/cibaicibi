self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("cibaicibi").then(cache => {
      return cache.addAll([
        "./",
        "./index.html",
        "./app.js"
      ]);
    })
  );
});
