import {expect,it} from 'vitest'
import {manualMediaMetric,measuredMediaMetric,visibleMediaFields} from './media-kit'
it('F21-U01 manual values remain informed without verified label',()=>{expect(manualMediaMetric({platform:'INSTAGRAM',value:1200,asOf:'2026-10-18'})).toMatchObject({source:'INFORMED',value:1200,period:{from:'2026-10-18',to:'2026-10-18'}})})
it('F21-U02 missing/partial coverage produces unavailable, while measured zero with coverage is honest',()=>{for(const coverage of ['UNAVAILABLE','PARTIAL','ERROR'])expect(measuredMediaMetric(0,coverage)).toEqual({value:null,source:'MEASURED',coverage});expect(measuredMediaMetric(0,'COMPLETE')).toEqual({value:0,source:'MEASURED',coverage:'COMPLETE'})})
it('F21-U03 privacy removal intersects published selection; draft addition never leaks',()=>{expect(visibleMediaFields({showBio:true,showPhoto:true,contactIds:['a','b']},{showBio:false,showPhoto:true,contactIds:['b','c']})).toEqual({showBio:false,showPhoto:true,contactIds:['b']})})
