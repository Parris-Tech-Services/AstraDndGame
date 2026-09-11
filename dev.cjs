'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const turn=require('./api/turn.js');
const tactical=require('./api/tactical.js');
const root=path.join(__dirname,'dist'),port=Number(process.env.PORT)||3000,maxBodyBytes=100000;
const apiHandlers=new Map([['/api/turn',turn],['/api/tactical',tactical]]);
const contentTypes={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json; charset=utf-8','.json':'application/json; charset=utf-8'};
function addVercelResponseHelpers(res){res.status=code=>{res.statusCode=code;return res};res.json=value=>{res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));return value}}
function readRequestBody(req){
  return new Promise((resolve,reject)=>{let size=0,body='';req.on('data',chunk=>{size+=chunk.length;if(size>maxBodyBytes){reject(new Error('too_large'));req.destroy();return}body+=chunk});req.on('end',()=>resolve(body));req.on('error',reject)})
}
async function serveApi(req,res,handler){
  addVercelResponseHelpers(res);if(req.method==='POST'){try{const raw=await readRequestBody(req);req.body=raw?JSON.parse(raw):{}}catch{return res.status(400).json({error:'Invalid request.'})}}
  await handler(req,res);
}
function safeStaticPath(urlPath){
  const pathname=urlPath==='/'?'/index.html':urlPath,decoded=decodeURIComponent(pathname),file=path.resolve(root,'.'+decoded);return file.startsWith(root+path.sep)?file:null;
}
function serveStatic(req,res,url){
  const file=safeStaticPath(url.pathname);if(!file){res.statusCode=403;return res.end('Forbidden')}
  fs.readFile(file,(error,data)=>{if(error){res.statusCode=404;return res.end('Not found')}res.setHeader('Content-Type',contentTypes[path.extname(file)]||'application/octet-stream');res.end(data)});
}
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  try{const handler=apiHandlers.get(url.pathname);if(handler)return await serveApi(req,res,handler);serveStatic(req,res,url)}
  catch(error){console.error('[astra dev]',error instanceof Error?error.name:'Error');if(!res.headersSent){res.statusCode=500;res.setHeader('Content-Type','application/json; charset=utf-8')}if(!res.writableEnded)res.end(JSON.stringify({error:'Local server error.'}))}
});
server.listen(port,()=>console.log(`Astra running at http://localhost:${port}`));
