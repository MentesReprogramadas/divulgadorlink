import { expect, it } from 'vitest'
import { appearanceInput } from './appearance'
const appearance = { background: '#173c32', buttonColor: '#d9efb6', backgroundStyle: 'solid', buttonStyle: 'filled', radius: 'pill', font: 'modern', alignment: 'center' }
it('accepts bounded appearance and rejects injected CSS and unknown options', () => {
  expect(appearanceInput.parse(appearance)).toEqual(appearance)
  for (const patch of [{ background: 'url(https://x)' }, { radius: '999999' }, { hideBrand: true }, { font: 'external-font' }]) expect(appearanceInput.safeParse({ ...appearance, ...patch }).success).toBe(false)
})

it('accepts an optional boolean search preference without changing older snapshots',()=>{expect(appearanceInput.parse({...appearance,searchEnabled:false}).searchEnabled).toBe(false);expect(appearanceInput.parse({...appearance,searchEnabled:true}).searchEnabled).toBe(true);expect(appearanceInput.safeParse({...appearance,searchEnabled:'true'}).success).toBe(false)})
