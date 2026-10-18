import base from './playwright.config'
import {defineConfig} from '@playwright/test'
export default defineConfig({...base,projects:[
 {name:'interaction-desktop',testMatch:/profile-interaction\.spec\.ts/,timeout:120000},
 {name:'interaction-mobile',testMatch:/profile-interaction\.spec\.ts/,timeout:120000,use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
]})
