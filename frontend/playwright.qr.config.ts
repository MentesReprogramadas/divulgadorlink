import base from './playwright.config'
import { defineConfig } from '@playwright/test'
export default defineConfig({...base,projects:[
  {name:'qr-desktop',testMatch:/permanent-qr\.spec\.ts/,timeout:120000},
  {name:'qr-mobile',testMatch:/permanent-qr\.spec\.ts/,timeout:120000,use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
]})
