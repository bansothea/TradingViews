/**
 * Minimal class joiner. Filters out false/null/undefined so conditional
 * classes read as `cond && "..."` at call sites.
 *
 * Deliberately not clsx/tailwind-merge: no dependency, and every component
 * here puts overrides last, which is enough for our merge needs.
 */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
