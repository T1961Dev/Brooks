export interface LeadInput {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  domain?: string | null;
}

export interface DedupedLead extends LeadInput {
  emailNormalized?: string | null;
  domainNormalized?: string | null;
  fullNameNormalized?: string | null;
}

export function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? null;
}

export function normalizeDomain(domain?: string | null, email?: string | null) {
  if (domain) return domain.trim().toLowerCase();
  const e = normalizeEmail(email);
  return e?.split("@")[1] ?? null;
}

export function normalizeName(firstName?: string | null, lastName?: string | null) {
  const parts = [firstName ?? "", lastName ?? ""].map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  return parts.join(" ").toLowerCase();
}

export function dedupeLeads(
  leads: LeadInput[],
  existingEmails: Set<string>,
  existingDomainName: Set<string>
): DedupedLead[] {
  const seenEmails = new Set<string>();
  const seenDomainName = new Set<string>();
  const results: DedupedLead[] = [];

  for (const lead of leads) {
    const emailNormalized = normalizeEmail(lead.email);
    const domainNormalized = normalizeDomain(lead.domain, lead.email);
    const fullNameNormalized = normalizeName(lead.firstName, lead.lastName);

    if (emailNormalized) {
      if (existingEmails.has(emailNormalized) || seenEmails.has(emailNormalized)) {
        continue;
      }
      seenEmails.add(emailNormalized);
    }

    if (domainNormalized && fullNameNormalized) {
      const key = `${domainNormalized}:${fullNameNormalized}`;
      if (existingDomainName.has(key) || seenDomainName.has(key)) {
        continue;
      }
      seenDomainName.add(key);
    }

    results.push({
      ...lead,
      emailNormalized,
      domainNormalized,
      fullNameNormalized,
    });
  }

  return results;
}
