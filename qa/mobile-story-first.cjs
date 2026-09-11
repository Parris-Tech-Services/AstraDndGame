'use strict';
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../dist');

function serve(){
  return new Promise(resolve=>{
    const server=http.createServer((req,res)=>{
      const url=new URL(req.url,'http://localhost');
      const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
      if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
      try{
        const data=fs.readFileSync(file);
        res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');
        res.end(data);
      }catch{res.writeHead(404);res.end('Not found')}
    });
    server.listen(0,'127.0.0.1',()=>resolve(server));
  });
}

(async()=>{
  const server=await serve();
  const browser=await chromium.launch({headless:true});
  try{
    const port=server.address().port;
    for(const viewport of [{width:390,height:844},{width:800,height:900}]){
      const page=await browser.newPage({viewport});
      await page.route('**/api/turn',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({configured:true,mode:'open-world',version:3,features:[],build:'mobile-layout-test'})}));
      await page.goto(`http://127.0.0.1:${port}`,{waitUntil:'networkidle'});
      const layout=await page.evaluate(()=>{
        const game=document.querySelector('#game');
        game.hidden=false;
        const article=document.querySelector('#game article').getBoundingClientRect();
        const aside=document.querySelector('#game aside').getBoundingClientRect();
        return {articleTop:article.top,articleBottom:article.bottom,asideTop:aside.top};
      });
      assert(layout.articleTop<layout.asideTop,`${viewport.width}px viewport must show the adventure before the character sheet`);
      assert(layout.articleBottom<=layout.asideTop+1,`${viewport.width}px viewport must not interleave the sidebar ahead of the action area`);
      await page.close();
    }
    console.log('Mobile story-first browser QA passed at 390px and 800px.');
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exit(1)});
