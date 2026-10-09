// Throwaway reference simulator. Run on its own (node measure-sim.js) it prints quick unseeded
// means; spec/sim/report.mjs loads these functions and produces the seeded "sim" numbers.
// Each algorithm runs on random permutations of ranks 0..n-1 and must leave A sorted and B empty.
function M(r){this.A=r.slice();this.B=[];this.n=0}
M.prototype.op=function(o,k){k=k===undefined?1:k;for(var i=0;i<k;i++){var A=this.A,B=this.B;
 switch(o){case'sa':if(A.length>1){var t=A[0];A[0]=A[1];A[1]=t}break;case'pb':B.unshift(A.shift());break;case'pa':A.unshift(B.shift());break;
 case'ra':A.push(A.shift());break;case'rra':A.unshift(A.pop());break;case'rb':B.push(B.shift());break;case'rrb':B.unshift(B.pop());break;
 case'rr':A.push(A.shift());B.push(B.shift());break;case'rrr':A.unshift(A.pop());B.unshift(B.pop());break}this.n++}};
M.prototype.bring=function(S,i,a,b){var m=this[S].length;if(i<=m/2)this.op(a,i);else this.op(b,m-i)};
M.prototype.ok=function(){return this.B.length===0&&this.A.every((x,k)=>x===k)};
function three(m){var A=m.A,mx=Math.max(A[0],A[1],A[2]);if(A[0]===mx)m.op('ra');else if(A[1]===mx)m.op('rra');if(A[0]>A[1])m.op('sa')}
function minext(r){var m=new M(r);while(m.A.length>3){var mn=Math.min(...m.A);m.bring('A',m.A.indexOf(mn),'ra','rra');m.op('pb')}if(m.A.length===3)three(m);else if(m.A.length===2&&m.A[0]>m.A[1])m.op('sa');while(m.B.length)m.op('pa');return m}
function radix(r){var m=new M(r),n=r.length,bits=0;while(((n-1)>>bits)>0)bits++;for(var b=0;b<bits;b++){for(var i=0;i<n;i++){if((m.A[0]>>b)&1)m.op('ra');else m.op('pb')}while(m.B.length)m.op('pa')}return m}
function bubble(r){var m=new M(r),n=r.length;for(var p=0;p<2*n&&!m.A.every((x,k)=>x===k);p++){for(var i=0;i<n-1;i++){if(m.A[0]>m.A[1])m.op('sa');m.op('ra')}m.op('ra')}var lo=m.A.indexOf(0);m.bring('A',lo,'ra','rra');return m}
function insB(r){var m=new M(r);while(m.A.length){var x=m.A[0],B=m.B,mb=B.length,j=0;if(mb>1){ // B descending circular: find slot
 for(var t=0;t<mb;t++){var p=B[(t-1+mb)%mb],s=B[t];if(p>s?(p>x&&x>s):(x<p||x>s)){j=t;break}}}m.bring('B',j,'rb','rrb');m.op('pb')}
 var mx=m.B.indexOf(Math.max(...m.B));m.bring('B',mx,'rb','rrb');while(m.B.length)m.op('pa');return m}
function chunks(r,K){var m=new M(r),n=r.length,w=Math.ceil(n/K);for(var c=0;c<K;c++){var lo=c*w,hi=Math.min(n,lo+w);var left=hi-lo;while(left>0){var A=m.A,f=A.findIndex(x=>x>=lo&&x<hi),bk=-1;for(var i=A.length-1;i>=0;i--)if(A[i]>=lo&&A[i]<hi){bk=i;break}
 if(f<=A.length-bk)m.op('ra',f);else m.op('rra',A.length-bk);var v=m.A[0];m.op('pb');left--;if(v<lo+w/2&&m.B.length>1)m.op('rb')}}
 while(m.B.length){var mx=m.B.indexOf(Math.max(...m.B));m.bring('B',mx,'rb','rrb');m.op('pa')}return m}
function butterfly(r,w){var m=new M(r),i=0;while(m.A.length){var x=m.A[0];if(x<=i){m.op('pb');m.op('rb');i++}else if(x<=i+w){m.op('pb');i++}else m.op('ra')}
 while(m.B.length){var mx=m.B.indexOf(Math.max(...m.B));m.bring('B',mx,'rb','rrb');m.op('pa')}return m}
function cost4(fa,ba,fb,bb){return [[Math.max(fa,fb),'rr',fa,fb,0],[Math.max(ba,bb),'rrr',ba,bb,1],[fa+bb,'x',fa,bb,2],[ba+fb,'y',ba,fb,3]].reduce((a,b)=>b[0]<a[0]?b:a)}
function doMove(m,c){var t=c[4],a=c[2],b=c[3];if(t===0){var s=Math.min(a,b);m.op('rr',s);m.op('ra',a-s);m.op('rb',b-s)}else if(t===1){var s=Math.min(a,b);m.op('rrr',s);m.op('rra',a-s);m.op('rrb',b-s)}else if(t===2){m.op('ra',a);m.op('rrb',b)}else{m.op('rra',a);m.op('rb',b)}}
function turk(r){var m=new M(r);if(m.A.length>3)m.op('pb');if(m.A.length>3)m.op('pb');
 while(m.A.length>3){var A=m.A,B=m.B,best=null;for(var i=0;i<A.length;i++){var x=A[i],tj=-1,tv=-1,mxi=0;for(var j=0;j<B.length;j++){if(B[j]<x&&B[j]>tv){tv=B[j];tj=j}if(B[j]>B[mxi])mxi=j}if(tj<0)tj=mxi;
  var c=cost4(i,(A.length-i)%A.length,tj,(B.length-tj)%B.length);if(!best||c[0]<best[0])best=c}doMove(m,best);m.op('pb')}
 if(m.A.length===3)three(m);while(m.B.length){var x=m.B[0],A=m.A,tj=-1,tv=1e9,mni=0;for(var j=0;j<A.length;j++){if(A[j]>x&&A[j]<tv){tv=A[j];tj=j}if(A[j]<A[mni])mni=j}if(tj<0)tj=mni;m.bring('A',tj,'ra','rra');m.op('pa')}
 m.bring('A',m.A.indexOf(0),'ra','rra');return m}
function quick2(r){ // A/B recursive quicksort on ranks, median pivot, leaves by min-extract style small sort
 var m=new M(r);
 function sortedTopA(k){for(var i=1;i<k;i++)if(m.A[i-1]>m.A[i])return false;return true}
 function aToB(lo,hi){var k=hi-lo;if(k<=1)return;if(k===2){if(m.A[0]>m.A[1])m.op('sa');return}if(sortedTopA(k))return;
  var piv=lo+(k>>1),pushed=0,rot=0,need=piv-lo;for(var i=0;i<k&&pushed<need;i++){if(m.A[0]<piv){m.op('pb');pushed++}else{m.op('ra');rot++}}
  if(m.A.length>k-pushed)m.op('rra',rot);aToB(piv,hi);bToA(lo,piv)}
 function bToA(lo,hi){var k=hi-lo;if(k===0)return;if(k===1){m.op('pa');return}if(k===2){if(m.B[0]<m.B[1])m.op('sb');m.op('pa',2);return}
  var piv=lo+(k>>1),pushed=0,rot=0,need=hi-piv;for(var i=0;i<k&&pushed<need;i++){if(m.B[0]>=piv){m.op('pa');pushed++}else{m.op('rb');rot++}}
  if(m.B.length>k-pushed)m.op('rrb',rot);aToB(piv,hi);bToA(lo,piv)}
 m.op=(function(o){return function(x,k){if(x==='sb'){var B=this.B,t=B[0];B[0]=B[1];B[1]=t;this.n++;return}o.call(this,x,k)}})(m.op);
 aToB(0,r.length);return m}
function lisIns(r){ // LIS anchor + cheapest(4-way) + better of 1/2 bands
 function run(bands){var m=new M(r),n=r.length,v=r,t=[],p=new Array(n).fill(-1);for(var i=0;i<n;i++){var lo=0,hi=t.length;while(lo<hi){var mid=(lo+hi)>>1;if(v[t[mid]]<v[i])lo=mid+1;else hi=mid}if(lo>0)p[i]=t[lo-1];t[lo]=i}
  var keep=new Set(),k=t[t.length-1];while(k>=0){keep.add(r[k]);k=p[k]}var last=-1;for(var i=0;i<n;i++)if(!keep.has(r[i]))last=i;var sink=false;
  for(var j=0;j<=last;j++){var x=m.A[0];if(keep.has(x)){m.op(sink?'rr':'ra')}else{if(sink)m.op('rb');m.op('pb')}sink=bands===2&&!keep.has(x)&&x<n/2}if(sink)m.op('rb');
  while(m.B.length){var A=m.A,B=m.B,best=null;for(var i=0;i<B.length;i++){var x=B[i],j=0,ma=A.length;for(var q=0;q<ma;q++){var pr=A[(q-1+ma)%ma],s=A[q];if(pr<s?(pr<x&&x<s):(x>pr||x<s)){j=q;break}}
   var c=cost4(j,(ma-j)%ma,i,(B.length-i)%B.length);if(!best||c[0]<best[0])best=c}doMove(m,best);m.op('pa')}m.bring('A',m.A.indexOf(0),'ra','rra');return m}
 var a=run(1),b=run(2);return a.n<=b.n?a:b}
function shuf(n){var p=[...Array(n).keys()];for(var i=n-1;i>0;i--){var j=Math.random()*(i+1)|0;[p[i],p[j]]=[p[j],p[i]]}return p}
var algos={bubble,minext,insB,radix,chunks:(r)=>chunks(r,r.length<=100?5:11),butterfly:(r)=>butterfly(r,r.length<=100?15:30),turk,quick2,lisIns};
for(var name in algos){var out=[];for(const n of [100,500]){var T=n===100?50:12,s=0,mx=0;for(var k=0;k<T;k++){var m=algos[name](shuf(n));if(!m.ok())throw name+" unsorted n="+n;s+=m.n;mx=Math.max(mx,m.n)}out.push(n+": mean "+(s/T).toFixed(0)+" max "+mx)}console.log(name.padEnd(10),out.join(" | "))}
