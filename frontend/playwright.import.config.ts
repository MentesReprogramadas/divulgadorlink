import base from './playwright.config'
import {defineConfig} from '@playwright/test'
export default defineConfig({...base,projects:[
 {name:'import-desktop',testMatch:/profile-import\.spec\.ts/,timeout:120000},
 {name:'import-mobile',testMatch:/profile-import\.spec\.ts/,timeout:120000,use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
]})
