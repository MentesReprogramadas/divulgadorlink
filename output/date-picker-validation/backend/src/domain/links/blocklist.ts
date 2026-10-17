const PHONE = /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}/
const URL = /https?:\/\/|www\./i

export function hitsBlocklist(input: {
  text: string
  selectedNiche: string
  nicheNames: string[]
  terms: string[]
}): boolean {
  const haystack = input.text.toLowerCase()
  const otherNiche = input.nicheNames
    .filter((name) => name.toLowerCase() !== input.selectedNiche.toLowerCase())
    .some((name) => haystack.includes(name.toLowerCase()))
  const term = input.terms.some((item) => haystack.includes(item.toLowerCase()))
  return otherNiche || term || PHONE.test(input.text) || URL.test(input.text)
}
