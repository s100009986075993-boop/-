function isOriginalQuestion(q) {
  return q?.source === "original";
}
function isOriginalAttempt(a) {
  return (
    a?.questionSource === "original" ||
    (typeof a?.id === "string" && a.id.startsWith("original-"))
  );
}
if (typeof module !== "undefined")
  module.exports = { isOriginalQuestion, isOriginalAttempt };
