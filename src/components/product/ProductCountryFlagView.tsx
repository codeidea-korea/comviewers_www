import flagKorea from '../../assets/figma/flag-korea.png'

// Local, pinned MIT assets; only an existing asset can become an image URL.
const countryFlags = import.meta.glob<string>('../../assets/country-flags/*.svg', {
  eager: true, import: 'default', query: '?url&no-inline',
})

export function ProductCountryFlag({ country, countryCode, className }: {
  country: string | null
  countryCode?: string | null
  className?: string
}) {
  const normalized = countryCode?.trim().toLowerCase()
  const code = normalized && /^[a-z]{2}$/.test(normalized) ? normalized : country === 'Korea' ? 'kr' : null
  const source = code === 'kr' ? flagKorea : code ? countryFlags[`../../assets/country-flags/${code}.svg`] : null
  if (!source) return null
  return <img alt={country ?? code?.toUpperCase() ?? ''} className={className} height={20} src={source} style={{ objectFit: 'contain' }} width={20} />
}
