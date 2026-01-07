self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("cibaicibi").then(c =>
      c.addAll(["./", "./index.html", "./app.js"])
    )
  );
});
