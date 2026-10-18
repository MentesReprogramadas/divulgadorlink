import base from './playwright.config'
import {defineConfig} from '@playwright/test'
export default defineConfig({...base,projects:[
 {name:'discovery-desktop',testMatch:/discovery-filters\.spec\.ts/,timeout:120000},
 {name:'discovery-mobile',testMatch:/discovery-filters\.spec\.ts/,timeout:120000,use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
]})
