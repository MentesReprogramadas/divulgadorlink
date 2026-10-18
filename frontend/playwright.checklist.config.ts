import base from './playwright.config'
import {defineConfig} from '@playwright/test'
export default defineConfig({...base,projects:[
 {name:'checklist-desktop',testMatch:/profile-checklist\.spec\.ts/,timeout:120000},
 {name:'checklist-mobile',testMatch:/profile-checklist\.spec\.ts/,timeout:120000,use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
]})
