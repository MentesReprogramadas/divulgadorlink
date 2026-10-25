const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ttf':'font/ttf','.pdf':'application/pdf','.md':'text/plain; charset=utf-8','.zip':'application/zip','.ico':'image/x-icon'};
http.createServer((req,res) => {
  const file = path.resolve(root, '.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if (file !== root && !file.startsWith(root+path.sep)) {res.writeHead(403);res.end();return;}
  const target = file === root ? path.join(root,'index.html') : file;
  fs.stat(target,(error,stat) => {
    if(error || !stat.isFile()){res.writeHead(404);res.end('Not found');return;}
    res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream','cache-control':'no-store'});
    fs.createReadStream(target).pipe(res);
  });
}).listen(0,'127.0.0.1',function(){console.log(`Brand showroom: http://127.0.0.1:${this.address().port}`);});
