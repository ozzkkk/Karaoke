const ALLOWED_ORIGINS = new Set(['https://ozzkkk.github.io','http://localhost:8000','http://127.0.0.1:8000']);
function cors(origin){const allowed=ALLOWED_ORIGINS.has(origin)?origin:'https://ozzkkk.github.io';return {'Access-Control-Allow-Origin':allowed,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'};}
const json=(data,status=200,origin='')=>new Response(JSON.stringify(data),{status,headers:{...cors(origin),'Content-Type':'application/json; charset=utf-8'}});
export default {async fetch(request,env){
 const origin=request.headers.get('Origin')||'';
 if(request.method==='OPTIONS')return new Response(null,{headers:cors(origin)});
 if(!ALLOWED_ORIGINS.has(origin))return json({error:'Origin not allowed'},403,origin);
 if(request.method!=='POST')return json({error:'POST required'},405,origin);
 const path=new URL(request.url).pathname;
 try{
  if(path.endsWith('/recognize'))return await recognize(request,env,origin);
  if(path.endsWith('/lyrics'))return await lyrics(request,origin);
  return json({error:'Not found'},404,origin);
 }catch(e){return json({error:e.message||'Request failed'},500,origin);}
}};
async function recognize(request,env,origin){
 if(!env.AUDD_API_TOKEN)return json({error:'Cloudflare Worker secret AUDD_API_TOKEN is not configured.'},500,origin);
 const incoming=await request.formData(),file=incoming.get('file');
 if(!(file instanceof File)||file.size===0)return json({error:'Audio file is missing.'},400,origin);
 if(file.size>9*1024*1024)return json({error:'Audio file is too large.'},413,origin);
 const form=new FormData();form.append('api_token',env.AUDD_API_TOKEN);form.append('file',file,file.name||'karaoke.wav');
 const response=await fetch('https://api.audd.io/',{method:'POST',body:form});
 const data=await response.json();
 if(data.status!=='success')return json({error:data.error?.error_message||'AudD recognition failed.',code:data.error?.error_code},502,origin);
 const r=data.result;if(!r)return json({match:false},200,origin);
 return json({match:true,title:r.title||'',artist:r.artist||'',album:r.album||'',cover:r.apple_music?.artwork?.url||r.deezer?.album?.cover_big||'',duration:r.duration||0,offset:r.timecode?timecodeMs(r.timecode):0,songLink:r.song_link||''},200,origin);
}
function timecodeMs(value){const p=String(value).split(':').map(Number);if(p.some(Number.isNaN))return 0;return (p.reduce((n,v)=>n*60+v,0))*1000;}
async function lyrics(song,origin){
 const title=String(song.title||'').trim(),artist=String(song.artist||'').trim();
 if(!title||!artist)return json({error:'Title and artist are required'},400,origin);
 const params=new URLSearchParams({t:title,a:artist});if(song.duration)params.set('d',String(Math.round(song.duration)));
 let ttml='';
 for(const base of ['https://api.betterlyrics.org/getLyrics','https://lyrics-api.boidu.dev/getLyrics']){
  try{const r=await fetch(`${base}?${params}`);if(!r.ok)continue;const d=await r.json();if(d.ttml?.includes('<p')){ttml=d.ttml;break;}}catch{}
 }
 if(ttml)return json({ttml},200,origin);
 const q=new URLSearchParams({track_name:title,artist_name:artist});if(song.album)q.set('album_name',song.album);if(song.duration)q.set('duration',String(Math.round(song.duration)));
 try{
  let r=await fetch(`https://lrclib.net/api/get?${q}`),d=r.ok?await r.json():null;
  if(!d?.syncedLyrics&&!d?.plainLyrics){const search=new URLSearchParams({track_name:title,artist_name:artist});r=await fetch(`https://lrclib.net/api/search?${search}`);if(r.ok){const hits=await r.json();d=hits.filter(x=>x.syncedLyrics||x.plainLyrics).sort((a,b)=>Math.abs((a.duration||0)-(song.duration||a.duration||0))-Math.abs((b.duration||0)-(song.duration||b.duration||0)))[0];}}
  return json({syncedLyrics:d?.syncedLyrics||'',plainLyrics:d?.plainLyrics||''},200,origin);
 }catch{return json({ttml:'',syncedLyrics:'',plainLyrics:''},200,origin);}
}