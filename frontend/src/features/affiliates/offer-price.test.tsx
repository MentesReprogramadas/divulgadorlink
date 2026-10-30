import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {OfferPrice} from './offer-price'
afterEach(cleanup)
it('usa o mesmo padrão para referência informada e calculada, identificando a estimativa',()=>{
 const view=render(<OfferPrice priceCents={37296} oldPriceCents={47090}/>);
 expect(screen.getByText('20% OFF')).toBeTruthy();expect(view.container.querySelector('s')?.textContent?.replace(/\u00a0/g,' ')).toBe('R$ 470,90')
 view.rerender(<OfferPrice priceCents={2130} oldPriceCents={3492} reportedDiscountPercent={39} oldPriceEstimated variant="review"/>);
 expect(screen.getByText('39% OFF')).toBeTruthy();expect(screen.getByText(/Preço anterior estimado:/)).toBeTruthy()
 expect(screen.queryByText('Preço anterior não informado')).toBeNull()
})
