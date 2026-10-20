/** Same local-file download behavior for generated QR codes and share artwork. */
export function downloadBlob(blob:Blob,filename:string){
 const url=URL.createObjectURL(blob),anchor=document.createElement('a')
 anchor.href=url;anchor.download=filename;document.body.append(anchor);anchor.click();anchor.remove()
 setTimeout(()=>URL.revokeObjectURL(url),1000)
}
