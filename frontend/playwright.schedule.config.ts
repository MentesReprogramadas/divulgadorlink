import base from './playwright.config'
import {defineConfig} from '@playwright/test'
export default defineConfig({...base,projects:[
  {name:'schedule-desktop',testMatch:/profile-schedules\.spec\.ts/,timeout:120000},
  {name:'schedule-mobile',testMatch:/profile-schedules\.spec\.ts/,timeout:120000,use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
]})
