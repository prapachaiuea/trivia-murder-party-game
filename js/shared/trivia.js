let cache = null;

export async function loadTrivia() {
  if (cache) return cache;
  const res = await fetch(new URL("../../trivia.json", import.meta.url));
  cache = await res.json();
  return cache;
}
