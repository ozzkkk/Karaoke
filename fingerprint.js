// Correctly align each 2048-sample FFT window to the end of each 128-sample hop,
// matching the ring-buffer timing used by the original ShazamSignature implementation.
window.makeSignature = function(samples) {
  const N=2048,H=128,hann=new Float64Array(N);
  for(let i=0;i<N;i++)hann[i]=.5-.5*Math.cos(2*Math.PI*(i+1)/(N+1));
  const powers=[],spreads=[];
  for(let end=H;end<=samples.length;end+=H){
    const frame=new Float32Array(N),from=end-N;
    if(from<0)frame.set(samples.subarray(0,end),N-end);else frame.set(samples.subarray(from,end));
    const p=fftPower(frame,hann);powers.push(p);
    const spread=p.slice();
    for(let k=0;k<=1022;k++)spread[k]=Math.max(spread[k],spread[k+1],spread[k+2]);
    for(const back of [1,3,6])if(spreads.length>=back){
      const previous=spreads[spreads.length-back];
      for(let k=0;k<1025;k++)previous[k]=Math.max(previous[k],spread[k]);
    }
    spreads.push(spread);
  }
  const bands=[[],[],[],[]];
  for(let i=45;i<powers.length;i++){
    const magnitudeFrame=powers[i-45],old=i>=48?spreads[i-48]:new Float32Array(1025);
    for(let bin=10;bin<=1014;bin++){
      const v=magnitudeFrame[bin];if(v<1/64||v<old[bin-1])continue;
      let neighbour=0;
      for(const o of [-10,-7,-4,-3,1,2,5,8])neighbour=Math.max(neighbour,old[bin+o]);
      if(v<=neighbour)continue;
      let other=neighbour;
      for(const o of [-53,-45,165,172,179,186,193,200,214,221,228,235,242,249]){
        let idx=(i+1+o)%256;if(idx<0)idx+=256;
        idx=i-((i-idx+256)%256);
        if(idx>=0)other=Math.max(other,spreads[idx][bin-1]);
      }
      if(v<=other)continue;
      const mag=x=>Math.max(Math.log(x),1/64)*1477.3+6144;
      const peak=mag(v),before=mag(magnitudeFrame[bin-1]),after=mag(magnitudeFrame[bin+1]);
      const variation=peak*2-before-after;if(variation<=0)continue;
      const corrected=bin*64+Math.trunc((after-before)*32/variation);
      const hz=corrected*16000/2/1024/64;
      const band=hz>=250&&hz<520?0:hz>=520&&hz<1450?1:hz>=1450&&hz<3500?2:hz>=3500&&hz<=5500?3:-1;
      if(band>=0)bands[band].push({pass:i-45,mag:Math.trunc(peak),bin:corrected});
    }
  }
  const u32=n=>{const a=new Uint8Array(4);new DataView(a.buffer).setUint32(0,n>>>0,true);return a};
  let bytes=[];
  for(const n of [0xcafe2580,0,0,0x94119c00,0,0,0,3<<27,0,0,samples.length+3840,(15<<19)+0x40000,0x40000000,0])bytes.push(...u32(n));
  for(let b=0;b<4;b++){
    const payload=[];let pass=0;
    for(const p of bands[b]){
      if(p.pass-pass>=255){payload.push(255,...u32(p.pass));pass=p.pass}
      payload.push(p.pass-pass,p.mag&255,(p.mag>>8)&255,p.bin&255,(p.bin>>8)&255);pass=p.pass;
    }
    bytes.push(...u32(0x60030040+b),...u32(payload.length),...payload);
    while(bytes.length%4)bytes.push(0);
  }
  const out=new Uint8Array(bytes),view=new DataView(out.buffer);
  view.setUint32(8,out.length-48,true);view.setUint32(52,out.length-48,true);
  let crc=0xffffffff;
  for(let i=8;i<out.length;i++){crc^=out[i];for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}
  view.setUint32(4,(crc^0xffffffff)>>>0,true);
  let binary='';
  for(let i=0;i<out.length;i+=0x8000)binary+=String.fromCharCode(...out.subarray(i,Math.min(i+0x8000,out.length)));
  return{samplems:Math.round(samples.length/16000*1000),uri:'data:audio/vnd.shazam.sig;base64,'+btoa(binary)};
};