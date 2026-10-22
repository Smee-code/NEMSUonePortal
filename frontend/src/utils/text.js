// Capitalize the first letter of each word, leaving the rest of each word as the
// user typed it (so "mcdonald" keeps its inner letters, acronyms aren't mangled).
// Used for name / place fields on data-entry forms. It never changes the string
// length, so the input caret position is preserved on controlled inputs.
export const titleCase = (s = '') =>
  String(s).replace(/(^|[\s\-'.])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
