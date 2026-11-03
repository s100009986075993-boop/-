// Public URLs only. Session tokens never belong in invitation links.
function resolveRoomApi(config, fallback, origin) {
  if (config?.enabled === false) return null;
  const setting =
    typeof config?.apiBase === "string" ? config.apiBase : fallback;
  if (typeof setting !== "string") return null;
  try {
    const url = new URL(setting || origin);
    if (url.username || url.password) return null;
    if (
      url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )
    )
      return null;
    return url.href.replace(/\/$/, "");
  } catch {
    return null;
  }
}
function buildRoomInvite(apiBase, code, release, nonce) {
  if (!/^[A-Z2-9]{6}$/.test(code)) throw Error("房號格式不正確");
  const base = resolveRoomApi({ apiBase }, null, "");
  if (!base) throw Error("房間服務網址不正確");
  // The Node room service serves the complete game at its root. Using it also
  // keeps invited players' page and API on the same origin in embedded browsers.
  const url = new URL("/", base);
  url.search = new URLSearchParams({ v: release, invite: nonce }).toString();
  url.hash = "room=" + code;
  return url.href;
}
function parseRoomCode(value) {
  if (typeof value !== "string") return "";
  const text = value.trim().normalize("NFKC").toUpperCase();
  if (/^[A-Z2-9]{6}$/.test(text)) return text;
  try {
    const url = new URL(value.trim());
    return /^#room=([A-Z2-9]{6})$/i.exec(url.hash)?.[1]?.toUpperCase() || "";
  } catch {
    return "";
  }
}
if (typeof module !== "undefined")
  module.exports = { resolveRoomApi, buildRoomInvite, parseRoomCode };
