import {expect,it} from 'vitest'
import {listProfileTemplates,profileTemplate,profileTemplateInput} from './profile-templates'
it('F16-U01 allows exactly the five versioned activities and existing appearance tokens; arbitrary style/script is rejected',()=>{
  const templates=listProfileTemplates()
  expect(templates.map(row=>row.activity).sort()).toEqual(['COMMUNITY','CREATOR','EVENT','PROFESSIONAL','SHOP'])
  expect(new Set(templates.map(row=>row.versionId)).size).toBe(5)
  for(const template of templates){expect(profileTemplateInput.safeParse(template).success).toBe(true);expect(profileTemplateInput.safeParse({...template,appearance:{...template.appearance,background:'url(https://malicious.test)'}}).success).toBe(false);expect(profileTemplateInput.safeParse({...template,html:'<script>alert(1)</script>'}).success).toBe(false)}
})
it('F16-U03 unknown version is explicit and returned catalog data cannot mutate the canonical model',()=>{
  expect(()=>profileTemplate('does-not-exist-v1')).toThrow('Modelo não encontrado')
  const first=listProfileTemplates()[0],before=profileTemplate(first.versionId)
  first.groups[0].name='Caller mutation';first.appearance.background='#ffffff'
  expect(profileTemplate(before.versionId)).toEqual(before)
})
