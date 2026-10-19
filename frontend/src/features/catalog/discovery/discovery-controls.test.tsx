import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {cleanup,render,screen,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {useState} from 'react'
import {Field} from '@/components/ui/input'
import {CityPicker} from './city-picker'
import {LinkDiscoveryEditor} from './link-discovery-editor'
import {DiscoveryFields} from './discovery-fields'
import {emptyDiscovery} from './discovery-contract'
import {api} from '@/lib/api'
vi.mock('@/lib/api',()=>({api:vi.fn()}))
const mocked=vi.mocked(api),city={id:'3550308',name:'São Paulo',state:'SP'},options={cities:[city],selectedCity:null,languages:[{code:'pt',name:'português'}],modalities:[]}
beforeEach(()=>{mocked.mockReset();mocked.mockResolvedValue({status:200,body:options})})
afterEach(cleanup)
function CityForm(){const [value,setValue]=useState<string|null>(null);return <form aria-label="Cidade declarada"><Field label="Cidade no Brasil"><CityPicker value={value} onChange={setValue}/></Field><output aria-label="Cidade selecionada">{value??'nenhuma'}</output><button>Salvar</button></form>}
it('F27-C01 explicit city selection supports keyboard; typing alone is invalid and never infers a location',async()=>{
 const user=userEvent.setup();render(<CityForm/>);expect(mocked).not.toHaveBeenCalled()
 const input=screen.getByRole('combobox',{name:'Cidade no Brasil'});await user.type(input,'sao paulo');await screen.findByRole('option',{name:'São Paulo / SP'})
 expect((input as HTMLInputElement).validity.customError).toBe(true);expect(screen.getByLabelText('Cidade selecionada').textContent).toBe('nenhuma')
 await user.keyboard('{ArrowDown}{Enter}');expect((input as HTMLInputElement).value).toBe('São Paulo / SP');expect(screen.getByLabelText('Cidade selecionada').textContent).toBe('3550308');expect((input as HTMLInputElement).validity.valid).toBe(true)
 await user.clear(input);expect(screen.getByLabelText('Cidade selecionada').textContent).toBe('nenhuma');expect((input as HTMLInputElement).validity.valid).toBe(true)
})
it('F27-C02 failed city lookup preserves query and retries without selecting stale or private data',async()=>{
 const user=userEvent.setup();mocked.mockRejectedValueOnce(Error('offline'));render(<CityForm/>);await user.type(screen.getByRole('combobox'),'sao')
 await screen.findByRole('alert');expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('sao');expect(screen.queryByRole('option')).toBeNull()
 await user.click(screen.getByRole('button',{name:'Tentar de novo'}));await screen.findByRole('option',{name:'São Paulo / SP'});expect(screen.getByLabelText('Cidade selecionada').textContent).toBe('nenhuma')
})
it('F27-C03 owner edit keeps the submitted draft on connection failure and replays the same version on retry',async()=>{
 const empty={cityId:null,languageTag:null,modality:null};let patches=0
 mocked.mockImplementation(async(path,init)=>{
  if(String(path).includes('/discovery-options'))return {status:200,body:options}
  if(init?.method==='PATCH'){patches++;if(patches===1)throw Error('offline');return {status:200,body:{metadata:{...empty,modality:'ONLINE'},version:1}}}
  return {status:200,body:{metadata:empty,version:0}}
 })
 const user=userEvent.setup();render(<LinkDiscoveryEditor linkId="own-link"/>);await waitFor(()=>expect((screen.getByRole('button',{name:'Salvar dados'}) as HTMLButtonElement).disabled).toBe(false))
 await user.click(screen.getByRole('combobox',{name:'Forma de participação (Opcional)'}));await user.click(screen.getByRole('option',{name:'Online'}));await user.click(screen.getByRole('button',{name:'Salvar dados'}));await screen.findByRole('alert')
 await user.click(screen.getByRole('button',{name:'Salvar dados'}));await screen.findByText('Dados salvos.')
 const requests=mocked.mock.calls.filter(([,init])=>init?.method==='PATCH');expect(requests).toHaveLength(2);expect(requests[0][1]?.body).toBe(requests[1][1]?.body)
})
it('F27-C05 optional fields stay inline and update the creation draft without submitting it',async()=>{
 const user=userEvent.setup(),submit=vi.fn(),change=vi.fn()
 function DraftForm(){const [value,setValue]=useState(emptyDiscovery);return <form onSubmit={event=>{event.preventDefault();submit()}}><DiscoveryFields value={value} onChange={next=>{setValue(next);change(next)}}/></form>}
 render(<DraftForm/>);expect(screen.queryByRole('dialog')).toBeNull()
 const cityInput=screen.getByRole('combobox',{name:'Cidade no Brasil (Opcional)'}) as HTMLInputElement
 expect(cityInput.required).toBe(false)
 await user.type(cityInput,'sao paulo');await screen.findByRole('option',{name:'São Paulo / SP'});await user.keyboard('{ArrowDown}{Enter}')
 expect(change).toHaveBeenLastCalledWith({...emptyDiscovery(),cityId:'3550308'});expect(submit).not.toHaveBeenCalled()
 expect(screen.getByRole('combobox',{name:'Idioma principal (Opcional)'})).toBeTruthy()
 expect(screen.queryByText(/Local da comunidade/)).toBeNull()
})

it('automatically resolves an exact typed city only in catalog-filter mode',async()=>{
 mocked.mockResolvedValue({status:200,body:{...options,exactCity:city}})
 const user=userEvent.setup(),change=vi.fn();render(<CityPicker autoSelectExact value={null} onChange={change}/>)
 await user.type(screen.getByRole('combobox'),'sao paulo')
 await waitFor(()=>expect(change).toHaveBeenLastCalledWith('3550308'))
 expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('São Paulo / SP')
 expect(screen.queryByRole('option')).toBeNull()
})
