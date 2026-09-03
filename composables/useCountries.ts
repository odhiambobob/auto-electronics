export interface CountryInfo {
  name: string
  currency: string
  symbol: string
  flag: string
}

export const AFRICAN_COUNTRIES: CountryInfo[] = [
  { name: 'Algeria', currency: 'DZD', symbol: 'DA', flag: '🇩🇿' },
  { name: 'Angola', currency: 'AOA', symbol: 'Kz', flag: '🇦🇴' },
  { name: 'Benin', currency: 'XOF', symbol: 'CFA', flag: '🇧🇯' },
  { name: 'Botswana', currency: 'BWP', symbol: 'P', flag: '🇧🇼' },
  { name: 'Burkina Faso', currency: 'XOF', symbol: 'CFA', flag: '🇧🇫' },
  { name: 'Burundi', currency: 'BIF', symbol: 'FBu', flag: '🇧🇮' },
  { name: 'Cabo Verde', currency: 'CVE', symbol: '$', flag: '🇨🇻' },
  { name: 'Cameroon', currency: 'XAF', symbol: 'FCFA', flag: '🇨🇲' },
  { name: 'Central African Republic', currency: 'XAF', symbol: 'FCFA', flag: '🇨🇫' },
  { name: 'Chad', currency: 'XAF', symbol: 'FCFA', flag: '🇹🇩' },
  { name: 'Comoros', currency: 'KMF', symbol: 'CF', flag: '🇰🇲' },
  { name: 'Congo', currency: 'XAF', symbol: 'FCFA', flag: '🇨🇬' },
  { name: 'Côte d\'Ivoire', currency: 'XOF', symbol: 'CFA', flag: '🇨🇮' },
  { name: 'Democratic Republic of the Congo', currency: 'CDF', symbol: 'FC', flag: '🇨🇩' },
  { name: 'Djibouti', currency: 'DJF', symbol: 'Fdj', flag: '🇩🇯' },
  { name: 'Egypt', currency: 'EGP', symbol: 'E£', flag: '🇪🇬' },
  { name: 'Equatorial Guinea', currency: 'XAF', symbol: 'FCFA', flag: '🇬🇶' },
  { name: 'Eritrea', currency: 'ERN', symbol: 'Nfk', flag: '🇪🇷' },
  { name: 'Eswatini', currency: 'SZL', symbol: 'E', flag: '🇸🇿' },
  { name: 'Ethiopia', currency: 'ETB', symbol: 'Br', flag: '🇪🇹' },
  { name: 'Gabon', currency: 'XAF', symbol: 'FCFA', flag: '🇬🇦' },
  { name: 'Gambia', currency: 'GMD', symbol: 'D', flag: '🇬🇲' },
  { name: 'Ghana', currency: 'GHS', symbol: 'GH₵', flag: '🇬🇭' },
  { name: 'Guinea', currency: 'GNF', symbol: 'FG', flag: '🇬🇳' },
  { name: 'Guinea-Bissau', currency: 'XOF', symbol: 'CFA', flag: '🇬🇼' },
  { name: 'Kenya', currency: 'KES', symbol: 'KSh', flag: '🇰🇪' },
  { name: 'Lesotho', currency: 'LSL', symbol: 'L', flag: '🇱🇸' },
  { name: 'Liberia', currency: 'LRD', symbol: 'L$', flag: '🇱🇷' },
  { name: 'Libya', currency: 'LYD', symbol: 'LD', flag: '🇱🇾' },
  { name: 'Madagascar', currency: 'MGA', symbol: 'Ar', flag: '🇲🇬' },
  { name: 'Malawi', currency: 'MWK', symbol: 'MK', flag: '🇲🇼' },
  { name: 'Mali', currency: 'XOF', symbol: 'CFA', flag: '🇲🇱' },
  { name: 'Mauritania', currency: 'MRU', symbol: 'UM', flag: '🇲🇷' },
  { name: 'Mauritius', currency: 'MUR', symbol: '₨', flag: '🇲🇺' },
  { name: 'Morocco', currency: 'MAD', symbol: 'DH', flag: '🇲🇦' },
  { name: 'Mozambique', currency: 'MZN', symbol: 'MT', flag: '🇲🇿' },
  { name: 'Namibia', currency: 'NAD', symbol: 'N$', flag: '🇳🇦' },
  { name: 'Niger', currency: 'XOF', symbol: 'CFA', flag: '🇳🇪' },
  { name: 'Nigeria', currency: 'NGN', symbol: '₦', flag: '🇳🇬' },
  { name: 'Rwanda', currency: 'RWF', symbol: 'FRw', flag: '🇷🇼' },
  { name: 'São Tomé and Príncipe', currency: 'STN', symbol: 'Db', flag: '🇸🇹' },
  { name: 'Senegal', currency: 'XOF', symbol: 'CFA', flag: '🇸🇳' },
  { name: 'Seychelles', currency: 'SCR', symbol: '₨', flag: '🇸🇨' },
  { name: 'Sierra Leone', currency: 'SLE', symbol: 'Le', flag: '🇸🇱' },
  { name: 'Somalia', currency: 'SOS', symbol: 'Sh', flag: '🇸🇴' },
  { name: 'South Africa', currency: 'ZAR', symbol: 'R', flag: '🇿🇦' },
  { name: 'South Sudan', currency: 'SSP', symbol: '£', flag: '🇸🇸' },
  { name: 'Sudan', currency: 'SDG', symbol: '£', flag: '🇸🇩' },
  { name: 'Tanzania', currency: 'TZS', symbol: 'TSh', flag: '🇹🇿' },
  { name: 'Togo', currency: 'XOF', symbol: 'CFA', flag: '🇹🇬' },
  { name: 'Tunisia', currency: 'TND', symbol: 'DT', flag: '🇹🇳' },
  { name: 'Uganda', currency: 'UGX', symbol: 'USh', flag: '🇺🇬' },
  { name: 'Zambia', currency: 'ZMW', symbol: 'K', flag: '🇿🇲' },
  { name: 'Zimbabwe', currency: 'USD', symbol: '$', flag: '🇿🇼' },
]

export const GLOBAL_MARKET: CountryInfo = {
  name: 'Global',
  currency: 'USD',
  symbol: '$',
  flag: '🌍',
}

export function useCountries() {
  const countryList = [...AFRICAN_COUNTRIES, GLOBAL_MARKET]

  const countryData = Object.fromEntries(
    countryList.map(c => [c.name, { currency: c.currency, symbol: c.symbol }]),
  ) as Record<string, { currency: string; symbol: string }>

  const countryFlags = Object.fromEntries(
    countryList.map(c => [c.name, c.flag]),
  ) as Record<string, string>

  const countryOptions = countryList.map(c => ({
    value: c.name,
    label: `${c.flag} ${c.name}`,
  }))

  function getCountryFlag(country: string): string {
    return countryFlags[country] || '🏳️'
  }

  function getCountryCurrency(country: string): string {
    return countryData[country]?.currency || 'USD'
  }

  return {
    countryList,
    countryData,
    countryFlags,
    countryOptions,
    getCountryFlag,
    getCountryCurrency,
  }
}
