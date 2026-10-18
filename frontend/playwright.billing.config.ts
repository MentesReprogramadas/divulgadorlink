import base from './playwright.config'
import { defineConfig } from '@playwright/test'
export default defineConfig({...base,projects:[
  {name:'billing-desktop',testMatch:/profile-billing\.spec\.ts/,timeout:120000},
  {name:'billing-mobile',testMatch:/profile-billing\.spec\.ts/,timeout:120000,use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
]})
