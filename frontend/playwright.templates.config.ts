import base from './playwright.config'
import {defineConfig} from '@playwright/test'
export default defineConfig({...base,projects:[
  {name:'templates-desktop',testMatch:/profile-templates\.spec\.ts/,timeout:120000},
  {name:'templates-mobile',testMatch:/profile-templates\.spec\.ts/,timeout:120000,use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
]})
