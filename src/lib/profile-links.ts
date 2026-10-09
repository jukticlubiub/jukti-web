/** Profile links (LinkedIn, a website, Behance...): which site a link is on, for its icon and label. Safe to import anywhere. */

export type LinkKind = "linkedin" | "github" | "behance" | "dribbble" | "facebook" | "instagram" | "x" | "youtube" | "scholar" | "researchgate" | "website";

const sites: [RegExp, LinkKind, string][] = [
  [/(^|\.)linkedin\.com$/, "linkedin", "LinkedIn"],
  [/(^|\.)github\.com$/, "github", "GitHub"],
  [/(^|\.)behance\.net$/, "behance", "Behance"],
  [/(^|\.)dribbble\.com$/, "dribbble", "Dribbble"],
  [/(^|\.)(facebook|fb)\.com$/, "facebook", "Facebook"],
  [/(^|\.)instagram\.com$/, "instagram", "Instagram"],
  [/(^|\.)(x|twitter)\.com$/, "x", "X"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "youtube", "YouTube"],
  [/^scholar\.google\./, "scholar", "Google Scholar"],
  [/(^|\.)researchgate\.net$/, "researchgate", "ResearchGate"],
];

export function describeLink(url: string): { kind: LinkKind; label: string } {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return { kind: "website", label: "Website" };
  }
  const site = sites.find(([pattern]) => pattern.test(host));
  return site ? { kind: site[1], label: site[2] } : { kind: "website", label: "Website" };
}

/** Read the panel's "one link per line" box: full https links, with "https://" added where it was left off. */
export function parseLinks(text: string): { links: string[]; invalid: string | null } {
  const links: string[] = [];
  for (const raw of text.split(/\s*\n\s*/)) {
    const line = raw.trim();
    if (!line) continue;
    const candidate = /^[a-z][a-z0-9+.-]*:/i.test(line) ? line : `https://${line}`;
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      return { links, invalid: line };
    }
    if ((parsed.protocol !== "https:" && parsed.protocol !== "http:") || !parsed.hostname.includes(".")) return { links, invalid: line };
    if (!links.includes(parsed.href)) links.push(parsed.href);
  }
  return { links, invalid: null };
}
