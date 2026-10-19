import base from './playwright.config'
import {defineConfig} from '@playwright/test'
export default defineConfig({...base,projects:[
 {name:'link-modal-desktop',testMatch:/profile-channels\.spec\.ts|profiles\.spec\.ts/,timeout:120000},
 {name:'link-modal-mobile',testMatch:/profile-channels\.spec\.ts|profiles\.spec\.ts/,timeout:120000,use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
]})
