import base from './playwright.config'
import {defineConfig} from '@playwright/test'
export default defineConfig({...base,projects:[
 {name:'profile-search-desktop',testMatch:/profile-search\.spec\.ts/,timeout:120000},
 {name:'profile-search-mobile',testMatch:/profile-search\.spec\.ts/,timeout:120000,use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
]})
