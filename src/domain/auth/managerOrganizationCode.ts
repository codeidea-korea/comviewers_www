// Imported organizations use LEGACY- followed by a 24-character hexadecimal digest.
// Keep existing ORG_ codes, including ORG_LEGACY_..., compatible.
const managerOrganizationCodePattern = /^(?:ORG_[A-Za-z0-9_]{1,46}|LEGACY-[a-f0-9]{24})$/i

export function isManagerOrganizationCode(value: string): boolean {
  return managerOrganizationCodePattern.test(value)
}
