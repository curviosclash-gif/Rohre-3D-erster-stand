(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const s of i)if(s.type==="childList")for(const a of s.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function e(i){const s={};return i.integrity&&(s.integrity=i.integrity),i.referrerPolicy&&(s.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?s.credentials="include":i.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function n(i){if(i.ep)return;i.ep=!0;const s=e(i);fetch(i.href,s)}})();/**
 * @license
 * Copyright 2010-2023 Three.js Authors
 * SPDX-License-Identifier: MIT
 */const xo="160",kc=0,Wo=1,Gc=2,Vc=0,Gl=1,Hc=2,En=3,bn=0,Le=1,ge=2,Fn=0,Ii=1,Xo=2,Yo=3,qo=4,Wc=5,jn=100,Xc=101,Yc=102,Ko=103,jo=104,qc=200,Kc=201,jc=202,$c=203,eo=204,no=205,Zc=206,Jc=207,Qc=208,th=209,eh=210,nh=211,ih=212,sh=213,rh=214,oh=0,ah=1,lh=2,Qs=3,ch=4,hh=5,uh=6,dh=7,yo=0,fh=1,ph=2,wn=0,mh=1,gh=2,_h=3,io=4,vh=5,xh=6,Vl=300,Ui=301,Fi=302,so=303,ro=304,or=306,Bi=1e3,on=1001,oo=1002,Ce=1003,$o=1004,$s=1005,je=1006,yh=1007,rs=1008,Bn=1009,Sh=1010,Mh=1011,So=1012,Hl=1013,On=1014,Un=1015,os=1016,Wl=1017,Xl=1018,Jn=1020,Eh=1021,an=1023,Ah=1024,Th=1025,Qn=1026,zi=1027,wh=1028,Yl=1029,bh=1030,ql=1031,Kl=1033,mr=33776,gr=33777,_r=33778,vr=33779,Zo=35840,Jo=35841,Qo=35842,ta=35843,jl=36196,ea=37492,na=37496,ia=37808,sa=37809,ra=37810,oa=37811,aa=37812,la=37813,ca=37814,ha=37815,ua=37816,da=37817,fa=37818,pa=37819,ma=37820,ga=37821,xr=36492,_a=36494,va=36495,Rh=36283,xa=36284,ya=36285,Sa=36286,$l=3e3,ti=3001,Ph=3200,Ch=3201,Mo=0,Lh=1,Je="",Te="srgb",Rn="srgb-linear",Eo="display-p3",ar="display-p3-linear",tr="linear",oe="srgb",er="rec709",nr="p3",li=7680,Ma=519,Ih=512,Dh=513,Nh=514,Zl=515,Oh=516,Uh=517,Fh=518,Bh=519,Ea=35044,Jl=35048,Aa="300 es",ao=1035,Tn=2e3,ir=2001;class Gi{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});const n=this._listeners;n[t]===void 0&&(n[t]=[]),n[t].indexOf(e)===-1&&n[t].push(e)}hasEventListener(t,e){if(this._listeners===void 0)return!1;const n=this._listeners;return n[t]!==void 0&&n[t].indexOf(e)!==-1}removeEventListener(t,e){if(this._listeners===void 0)return;const i=this._listeners[t];if(i!==void 0){const s=i.indexOf(e);s!==-1&&i.splice(s,1)}}dispatchEvent(t){if(this._listeners===void 0)return;const n=this._listeners[t.type];if(n!==void 0){t.target=this;const i=n.slice(0);for(let s=0,a=i.length;s<a;s++)i[s].call(this,t);t.target=null}}}const Re=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let Ta=1234567;const Di=Math.PI/180,as=180/Math.PI;function ai(){const r=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Re[r&255]+Re[r>>8&255]+Re[r>>16&255]+Re[r>>24&255]+"-"+Re[t&255]+Re[t>>8&255]+"-"+Re[t>>16&15|64]+Re[t>>24&255]+"-"+Re[e&63|128]+Re[e>>8&255]+"-"+Re[e>>16&255]+Re[e>>24&255]+Re[n&255]+Re[n>>8&255]+Re[n>>16&255]+Re[n>>24&255]).toLowerCase()}function ve(r,t,e){return Math.max(t,Math.min(e,r))}function Ao(r,t){return(r%t+t)%t}function zh(r,t,e,n,i){return n+(r-t)*(i-n)/(e-t)}function kh(r,t,e){return r!==t?(e-r)/(t-r):0}function Ji(r,t,e){return(1-e)*r+e*t}function Gh(r,t,e,n){return Ji(r,t,1-Math.exp(-e*n))}function Vh(r,t=1){return t-Math.abs(Ao(r,t*2)-t)}function Hh(r,t,e){return r<=t?0:r>=e?1:(r=(r-t)/(e-t),r*r*(3-2*r))}function Wh(r,t,e){return r<=t?0:r>=e?1:(r=(r-t)/(e-t),r*r*r*(r*(r*6-15)+10))}function Xh(r,t){return r+Math.floor(Math.random()*(t-r+1))}function Yh(r,t){return r+Math.random()*(t-r)}function qh(r){return r*(.5-Math.random())}function Kh(r){r!==void 0&&(Ta=r);let t=Ta+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function jh(r){return r*Di}function $h(r){return r*as}function lo(r){return(r&r-1)===0&&r!==0}function Zh(r){return Math.pow(2,Math.ceil(Math.log(r)/Math.LN2))}function sr(r){return Math.pow(2,Math.floor(Math.log(r)/Math.LN2))}function Jh(r,t,e,n,i){const s=Math.cos,a=Math.sin,o=s(e/2),l=a(e/2),c=s((t+n)/2),h=a((t+n)/2),d=s((t-n)/2),u=a((t-n)/2),f=s((n-t)/2),g=a((n-t)/2);switch(i){case"XYX":r.set(o*h,l*d,l*u,o*c);break;case"YZY":r.set(l*u,o*h,l*d,o*c);break;case"ZXZ":r.set(l*d,l*u,o*h,o*c);break;case"XZX":r.set(o*h,l*g,l*f,o*c);break;case"YXY":r.set(l*f,o*h,l*g,o*c);break;case"ZYZ":r.set(l*g,l*f,o*h,o*c);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+i)}}function bi(r,t){switch(t.constructor){case Float32Array:return r;case Uint32Array:return r/4294967295;case Uint16Array:return r/65535;case Uint8Array:return r/255;case Int32Array:return Math.max(r/2147483647,-1);case Int16Array:return Math.max(r/32767,-1);case Int8Array:return Math.max(r/127,-1);default:throw new Error("Invalid component type.")}}function Ne(r,t){switch(t.constructor){case Float32Array:return r;case Uint32Array:return Math.round(r*4294967295);case Uint16Array:return Math.round(r*65535);case Uint8Array:return Math.round(r*255);case Int32Array:return Math.round(r*2147483647);case Int16Array:return Math.round(r*32767);case Int8Array:return Math.round(r*127);default:throw new Error("Invalid component type.")}}const zn={DEG2RAD:Di,RAD2DEG:as,generateUUID:ai,clamp:ve,euclideanModulo:Ao,mapLinear:zh,inverseLerp:kh,lerp:Ji,damp:Gh,pingpong:Vh,smoothstep:Hh,smootherstep:Wh,randInt:Xh,randFloat:Yh,randFloatSpread:qh,seededRandom:Kh,degToRad:jh,radToDeg:$h,isPowerOfTwo:lo,ceilPowerOfTwo:Zh,floorPowerOfTwo:sr,setQuaternionFromProperEuler:Jh,normalize:Ne,denormalize:bi};class ot{constructor(t=0,e=0){ot.prototype.isVector2=!0,this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const e=this.x,n=this.y,i=t.elements;return this.x=i[0]*e+i[3]*n+i[6],this.y=i[1]*e+i[4]*n+i[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(ve(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y;return e*e+n*n}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){const n=Math.cos(e),i=Math.sin(e),s=this.x-t.x,a=this.y-t.y;return this.x=s*n-a*i+t.x,this.y=s*i+a*n+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class Xt{constructor(t,e,n,i,s,a,o,l,c){Xt.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,n,i,s,a,o,l,c)}set(t,e,n,i,s,a,o,l,c){const h=this.elements;return h[0]=t,h[1]=i,h[2]=o,h[3]=e,h[4]=s,h[5]=l,h[6]=n,h[7]=a,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],this}extractBasis(t,e,n){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,i=e.elements,s=this.elements,a=n[0],o=n[3],l=n[6],c=n[1],h=n[4],d=n[7],u=n[2],f=n[5],g=n[8],_=i[0],m=i[3],p=i[6],x=i[1],v=i[4],y=i[7],P=i[2],A=i[5],R=i[8];return s[0]=a*_+o*x+l*P,s[3]=a*m+o*v+l*A,s[6]=a*p+o*y+l*R,s[1]=c*_+h*x+d*P,s[4]=c*m+h*v+d*A,s[7]=c*p+h*y+d*R,s[2]=u*_+f*x+g*P,s[5]=u*m+f*v+g*A,s[8]=u*p+f*y+g*R,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[1],i=t[2],s=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8];return e*a*h-e*o*c-n*s*h+n*o*l+i*s*c-i*a*l}invert(){const t=this.elements,e=t[0],n=t[1],i=t[2],s=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8],d=h*a-o*c,u=o*l-h*s,f=c*s-a*l,g=e*d+n*u+i*f;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const _=1/g;return t[0]=d*_,t[1]=(i*c-h*n)*_,t[2]=(o*n-i*a)*_,t[3]=u*_,t[4]=(h*e-i*l)*_,t[5]=(i*s-o*e)*_,t[6]=f*_,t[7]=(n*l-c*e)*_,t[8]=(a*e-n*s)*_,this}transpose(){let t;const e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,n,i,s,a,o){const l=Math.cos(s),c=Math.sin(s);return this.set(n*l,n*c,-n*(l*a+c*o)+a+t,-i*c,i*l,-i*(-c*a+l*o)+o+e,0,0,1),this}scale(t,e){return this.premultiply(yr.makeScale(t,e)),this}rotate(t){return this.premultiply(yr.makeRotation(-t)),this}translate(t,e){return this.premultiply(yr.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,n,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){const e=this.elements,n=t.elements;for(let i=0;i<9;i++)if(e[i]!==n[i])return!1;return!0}fromArray(t,e=0){for(let n=0;n<9;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t}clone(){return new this.constructor().fromArray(this.elements)}}const yr=new Xt;function Ql(r){for(let t=r.length-1;t>=0;--t)if(r[t]>=65535)return!0;return!1}function ls(r){return document.createElementNS("http://www.w3.org/1999/xhtml",r)}function Qh(){const r=ls("canvas");return r.style.display="block",r}const wa={};function Qi(r){r in wa||(wa[r]=!0,console.warn(r))}const ba=new Xt().set(.8224621,.177538,0,.0331941,.9668058,0,.0170827,.0723974,.9105199),Ra=new Xt().set(1.2249401,-.2249404,0,-.0420569,1.0420571,0,-.0196376,-.0786361,1.0982735),ps={[Rn]:{transfer:tr,primaries:er,toReference:r=>r,fromReference:r=>r},[Te]:{transfer:oe,primaries:er,toReference:r=>r.convertSRGBToLinear(),fromReference:r=>r.convertLinearToSRGB()},[ar]:{transfer:tr,primaries:nr,toReference:r=>r.applyMatrix3(Ra),fromReference:r=>r.applyMatrix3(ba)},[Eo]:{transfer:oe,primaries:nr,toReference:r=>r.convertSRGBToLinear().applyMatrix3(Ra),fromReference:r=>r.applyMatrix3(ba).convertLinearToSRGB()}},tu=new Set([Rn,ar]),te={enabled:!0,_workingColorSpace:Rn,get workingColorSpace(){return this._workingColorSpace},set workingColorSpace(r){if(!tu.has(r))throw new Error(`Unsupported working color space, "${r}".`);this._workingColorSpace=r},convert:function(r,t,e){if(this.enabled===!1||t===e||!t||!e)return r;const n=ps[t].toReference,i=ps[e].fromReference;return i(n(r))},fromWorkingColorSpace:function(r,t){return this.convert(r,this._workingColorSpace,t)},toWorkingColorSpace:function(r,t){return this.convert(r,t,this._workingColorSpace)},getPrimaries:function(r){return ps[r].primaries},getTransfer:function(r){return r===Je?tr:ps[r].transfer}};function Ni(r){return r<.04045?r*.0773993808:Math.pow(r*.9478672986+.0521327014,2.4)}function Sr(r){return r<.0031308?r*12.92:1.055*Math.pow(r,.41666)-.055}let ci;class tc{static getDataURL(t){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let e;if(t instanceof HTMLCanvasElement)e=t;else{ci===void 0&&(ci=ls("canvas")),ci.width=t.width,ci.height=t.height;const n=ci.getContext("2d");t instanceof ImageData?n.putImageData(t,0,0):n.drawImage(t,0,0,t.width,t.height),e=ci}return e.width>2048||e.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",t),e.toDataURL("image/jpeg",.6)):e.toDataURL("image/png")}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const e=ls("canvas");e.width=t.width,e.height=t.height;const n=e.getContext("2d");n.drawImage(t,0,0,t.width,t.height);const i=n.getImageData(0,0,t.width,t.height),s=i.data;for(let a=0;a<s.length;a++)s[a]=Ni(s[a]/255)*255;return n.putImageData(i,0,0),e}else if(t.data){const e=t.data.slice(0);for(let n=0;n<e.length;n++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[n]=Math.floor(Ni(e[n]/255)*255):e[n]=Ni(e[n]);return{data:e,width:t.width,height:t.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let eu=0;class ec{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:eu++}),this.uuid=ai(),this.data=t,this.version=0}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const n={uuid:this.uuid,url:""},i=this.data;if(i!==null){let s;if(Array.isArray(i)){s=[];for(let a=0,o=i.length;a<o;a++)i[a].isDataTexture?s.push(Mr(i[a].image)):s.push(Mr(i[a]))}else s=Mr(i);n.url=s}return e||(t.images[this.uuid]=n),n}}function Mr(r){return typeof HTMLImageElement<"u"&&r instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&r instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&r instanceof ImageBitmap?tc.getDataURL(r):r.data?{data:Array.from(r.data),width:r.width,height:r.height,type:r.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}let nu=0;class Fe extends Gi{constructor(t=Fe.DEFAULT_IMAGE,e=Fe.DEFAULT_MAPPING,n=on,i=on,s=je,a=rs,o=an,l=Bn,c=Fe.DEFAULT_ANISOTROPY,h=Je){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:nu++}),this.uuid=ai(),this.name="",this.source=new ec(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=n,this.wrapT=i,this.magFilter=s,this.minFilter=a,this.anisotropy=c,this.format=o,this.internalFormat=null,this.type=l,this.offset=new ot(0,0),this.repeat=new ot(1,1),this.center=new ot(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Xt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,typeof h=="string"?this.colorSpace=h:(Qi("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace=h===ti?Te:Je),this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.needsPMREMUpdate=!1}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const n={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),e||(t.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==Vl)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case Bi:t.x=t.x-Math.floor(t.x);break;case on:t.x=t.x<0?0:1;break;case oo:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case Bi:t.y=t.y-Math.floor(t.y);break;case on:t.y=t.y<0?0:1;break;case oo:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}get encoding(){return Qi("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace===Te?ti:$l}set encoding(t){Qi("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace=t===ti?Te:Je}}Fe.DEFAULT_IMAGE=null;Fe.DEFAULT_MAPPING=Vl;Fe.DEFAULT_ANISOTROPY=1;class we{constructor(t=0,e=0,n=0,i=1){we.prototype.isVector4=!0,this.x=t,this.y=e,this.z=n,this.w=i}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,n,i){return this.x=t,this.y=e,this.z=n,this.w=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const e=this.x,n=this.y,i=this.z,s=this.w,a=t.elements;return this.x=a[0]*e+a[4]*n+a[8]*i+a[12]*s,this.y=a[1]*e+a[5]*n+a[9]*i+a[13]*s,this.z=a[2]*e+a[6]*n+a[10]*i+a[14]*s,this.w=a[3]*e+a[7]*n+a[11]*i+a[15]*s,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,n,i,s;const l=t.elements,c=l[0],h=l[4],d=l[8],u=l[1],f=l[5],g=l[9],_=l[2],m=l[6],p=l[10];if(Math.abs(h-u)<.01&&Math.abs(d-_)<.01&&Math.abs(g-m)<.01){if(Math.abs(h+u)<.1&&Math.abs(d+_)<.1&&Math.abs(g+m)<.1&&Math.abs(c+f+p-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;const v=(c+1)/2,y=(f+1)/2,P=(p+1)/2,A=(h+u)/4,R=(d+_)/4,N=(g+m)/4;return v>y&&v>P?v<.01?(n=0,i=.707106781,s=.707106781):(n=Math.sqrt(v),i=A/n,s=R/n):y>P?y<.01?(n=.707106781,i=0,s=.707106781):(i=Math.sqrt(y),n=A/i,s=N/i):P<.01?(n=.707106781,i=.707106781,s=0):(s=Math.sqrt(P),n=R/s,i=N/s),this.set(n,i,s,e),this}let x=Math.sqrt((m-g)*(m-g)+(d-_)*(d-_)+(u-h)*(u-h));return Math.abs(x)<.001&&(x=1),this.x=(m-g)/x,this.y=(d-_)/x,this.z=(u-h)/x,this.w=Math.acos((c+f+p-1)/2),this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this.w=Math.max(t.w,Math.min(e.w,this.w)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this.w=Math.max(t,Math.min(e,this.w)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this.w=t.w+(e.w-t.w)*n,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class iu extends Gi{constructor(t=1,e=1,n={}){super(),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=1,this.scissor=new we(0,0,t,e),this.scissorTest=!1,this.viewport=new we(0,0,t,e);const i={width:t,height:e,depth:1};n.encoding!==void 0&&(Qi("THREE.WebGLRenderTarget: option.encoding has been replaced by option.colorSpace."),n.colorSpace=n.encoding===ti?Te:Je),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:je,depthBuffer:!0,stencilBuffer:!1,depthTexture:null,samples:0},n),this.texture=new Fe(i,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.flipY=!1,this.texture.generateMipmaps=n.generateMipmaps,this.texture.internalFormat=n.internalFormat,this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.depthTexture=n.depthTexture,this.samples=n.samples}setSize(t,e,n=1){(this.width!==t||this.height!==e||this.depth!==n)&&(this.width=t,this.height=e,this.depth=n,this.texture.image.width=t,this.texture.image.height=e,this.texture.image.depth=n,this.dispose()),this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.texture=t.texture.clone(),this.texture.isRenderTargetTexture=!0;const e=Object.assign({},t.texture.image);return this.texture.source=new ec(e),this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class ei extends iu{constructor(t=1,e=1,n={}){super(t,e,n),this.isWebGLRenderTarget=!0}}class nc extends Fe{constructor(t=null,e=1,n=1,i=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:n,depth:i},this.magFilter=Ce,this.minFilter=Ce,this.wrapR=on,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class su extends Fe{constructor(t=null,e=1,n=1,i=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:n,depth:i},this.magFilter=Ce,this.minFilter=Ce,this.wrapR=on,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class ni{constructor(t=0,e=0,n=0,i=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=n,this._w=i}static slerpFlat(t,e,n,i,s,a,o){let l=n[i+0],c=n[i+1],h=n[i+2],d=n[i+3];const u=s[a+0],f=s[a+1],g=s[a+2],_=s[a+3];if(o===0){t[e+0]=l,t[e+1]=c,t[e+2]=h,t[e+3]=d;return}if(o===1){t[e+0]=u,t[e+1]=f,t[e+2]=g,t[e+3]=_;return}if(d!==_||l!==u||c!==f||h!==g){let m=1-o;const p=l*u+c*f+h*g+d*_,x=p>=0?1:-1,v=1-p*p;if(v>Number.EPSILON){const P=Math.sqrt(v),A=Math.atan2(P,p*x);m=Math.sin(m*A)/P,o=Math.sin(o*A)/P}const y=o*x;if(l=l*m+u*y,c=c*m+f*y,h=h*m+g*y,d=d*m+_*y,m===1-o){const P=1/Math.sqrt(l*l+c*c+h*h+d*d);l*=P,c*=P,h*=P,d*=P}}t[e]=l,t[e+1]=c,t[e+2]=h,t[e+3]=d}static multiplyQuaternionsFlat(t,e,n,i,s,a){const o=n[i],l=n[i+1],c=n[i+2],h=n[i+3],d=s[a],u=s[a+1],f=s[a+2],g=s[a+3];return t[e]=o*g+h*d+l*f-c*u,t[e+1]=l*g+h*u+c*d-o*f,t[e+2]=c*g+h*f+o*u-l*d,t[e+3]=h*g-o*d-l*u-c*f,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,n,i){return this._x=t,this._y=e,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){const n=t._x,i=t._y,s=t._z,a=t._order,o=Math.cos,l=Math.sin,c=o(n/2),h=o(i/2),d=o(s/2),u=l(n/2),f=l(i/2),g=l(s/2);switch(a){case"XYZ":this._x=u*h*d+c*f*g,this._y=c*f*d-u*h*g,this._z=c*h*g+u*f*d,this._w=c*h*d-u*f*g;break;case"YXZ":this._x=u*h*d+c*f*g,this._y=c*f*d-u*h*g,this._z=c*h*g-u*f*d,this._w=c*h*d+u*f*g;break;case"ZXY":this._x=u*h*d-c*f*g,this._y=c*f*d+u*h*g,this._z=c*h*g+u*f*d,this._w=c*h*d-u*f*g;break;case"ZYX":this._x=u*h*d-c*f*g,this._y=c*f*d+u*h*g,this._z=c*h*g-u*f*d,this._w=c*h*d+u*f*g;break;case"YZX":this._x=u*h*d+c*f*g,this._y=c*f*d+u*h*g,this._z=c*h*g-u*f*d,this._w=c*h*d-u*f*g;break;case"XZY":this._x=u*h*d-c*f*g,this._y=c*f*d-u*h*g,this._z=c*h*g+u*f*d,this._w=c*h*d+u*f*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+a)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){const n=e/2,i=Math.sin(n);return this._x=t.x*i,this._y=t.y*i,this._z=t.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(t){const e=t.elements,n=e[0],i=e[4],s=e[8],a=e[1],o=e[5],l=e[9],c=e[2],h=e[6],d=e[10],u=n+o+d;if(u>0){const f=.5/Math.sqrt(u+1);this._w=.25/f,this._x=(h-l)*f,this._y=(s-c)*f,this._z=(a-i)*f}else if(n>o&&n>d){const f=2*Math.sqrt(1+n-o-d);this._w=(h-l)/f,this._x=.25*f,this._y=(i+a)/f,this._z=(s+c)/f}else if(o>d){const f=2*Math.sqrt(1+o-n-d);this._w=(s-c)/f,this._x=(i+a)/f,this._y=.25*f,this._z=(l+h)/f}else{const f=2*Math.sqrt(1+d-n-o);this._w=(a-i)/f,this._x=(s+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let n=t.dot(e)+1;return n<Number.EPSILON?(n=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=n):(this._x=0,this._y=-t.z,this._z=t.y,this._w=n)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=n),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(ve(this.dot(t),-1,1)))}rotateTowards(t,e){const n=this.angleTo(t);if(n===0)return this;const i=Math.min(1,e/n);return this.slerp(t,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){const n=t._x,i=t._y,s=t._z,a=t._w,o=e._x,l=e._y,c=e._z,h=e._w;return this._x=n*h+a*o+i*c-s*l,this._y=i*h+a*l+s*o-n*c,this._z=s*h+a*c+n*l-i*o,this._w=a*h-n*o-i*l-s*c,this._onChangeCallback(),this}slerp(t,e){if(e===0)return this;if(e===1)return this.copy(t);const n=this._x,i=this._y,s=this._z,a=this._w;let o=a*t._w+n*t._x+i*t._y+s*t._z;if(o<0?(this._w=-t._w,this._x=-t._x,this._y=-t._y,this._z=-t._z,o=-o):this.copy(t),o>=1)return this._w=a,this._x=n,this._y=i,this._z=s,this;const l=1-o*o;if(l<=Number.EPSILON){const f=1-e;return this._w=f*a+e*this._w,this._x=f*n+e*this._x,this._y=f*i+e*this._y,this._z=f*s+e*this._z,this.normalize(),this}const c=Math.sqrt(l),h=Math.atan2(c,o),d=Math.sin((1-e)*h)/c,u=Math.sin(e*h)/c;return this._w=a*d+this._w*u,this._x=n*d+this._x*u,this._y=i*d+this._y*u,this._z=s*d+this._z*u,this._onChangeCallback(),this}slerpQuaternions(t,e,n){return this.copy(t).slerp(e,n)}random(){const t=Math.random(),e=Math.sqrt(1-t),n=Math.sqrt(t),i=2*Math.PI*Math.random(),s=2*Math.PI*Math.random();return this.set(e*Math.cos(i),n*Math.sin(s),n*Math.cos(s),e*Math.sin(i))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class b{constructor(t=0,e=0,n=0){b.prototype.isVector3=!0,this.x=t,this.y=e,this.z=n}set(t,e,n){return n===void 0&&(n=this.z),this.x=t,this.y=e,this.z=n,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(Pa.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(Pa.setFromAxisAngle(t,e))}applyMatrix3(t){const e=this.x,n=this.y,i=this.z,s=t.elements;return this.x=s[0]*e+s[3]*n+s[6]*i,this.y=s[1]*e+s[4]*n+s[7]*i,this.z=s[2]*e+s[5]*n+s[8]*i,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const e=this.x,n=this.y,i=this.z,s=t.elements,a=1/(s[3]*e+s[7]*n+s[11]*i+s[15]);return this.x=(s[0]*e+s[4]*n+s[8]*i+s[12])*a,this.y=(s[1]*e+s[5]*n+s[9]*i+s[13])*a,this.z=(s[2]*e+s[6]*n+s[10]*i+s[14])*a,this}applyQuaternion(t){const e=this.x,n=this.y,i=this.z,s=t.x,a=t.y,o=t.z,l=t.w,c=2*(a*i-o*n),h=2*(o*e-s*i),d=2*(s*n-a*e);return this.x=e+l*c+a*d-o*h,this.y=n+l*h+o*c-s*d,this.z=i+l*d+s*h-a*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const e=this.x,n=this.y,i=this.z,s=t.elements;return this.x=s[0]*e+s[4]*n+s[8]*i,this.y=s[1]*e+s[5]*n+s[9]*i,this.z=s[2]*e+s[6]*n+s[10]*i,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Math.max(t.x,Math.min(e.x,this.x)),this.y=Math.max(t.y,Math.min(e.y,this.y)),this.z=Math.max(t.z,Math.min(e.z,this.z)),this}clampScalar(t,e){return this.x=Math.max(t,Math.min(e,this.x)),this.y=Math.max(t,Math.min(e,this.y)),this.z=Math.max(t,Math.min(e,this.z)),this}clampLength(t,e){const n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(t,Math.min(e,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,n){return this.x=t.x+(e.x-t.x)*n,this.y=t.y+(e.y-t.y)*n,this.z=t.z+(e.z-t.z)*n,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){const n=t.x,i=t.y,s=t.z,a=e.x,o=e.y,l=e.z;return this.x=i*l-s*o,this.y=s*a-n*l,this.z=n*o-i*a,this}projectOnVector(t){const e=t.lengthSq();if(e===0)return this.set(0,0,0);const n=t.dot(this)/e;return this.copy(t).multiplyScalar(n)}projectOnPlane(t){return Er.copy(this).projectOnVector(t),this.sub(Er)}reflect(t){return this.sub(Er.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const n=this.dot(t)/e;return Math.acos(ve(n,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,n=this.y-t.y,i=this.z-t.z;return e*e+n*n+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,n){const i=Math.sin(e)*t;return this.x=i*Math.sin(n),this.y=Math.cos(e)*t,this.z=i*Math.cos(n),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,n){return this.x=t*Math.sin(e),this.y=n,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){const e=this.setFromMatrixColumn(t,0).length(),n=this.setFromMatrixColumn(t,1).length(),i=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=n,this.z=i,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=(Math.random()-.5)*2,e=Math.random()*Math.PI*2,n=Math.sqrt(1-t**2);return this.x=n*Math.cos(e),this.y=n*Math.sin(e),this.z=t,this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Er=new b,Pa=new ni;class We{constructor(t=new b(1/0,1/0,1/0),e=new b(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e+=3)this.expandByPoint(en.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,n=t.count;e<n;e++)this.expandByPoint(en.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,n=t.length;e<n;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const n=en.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(n),this.max.copy(t).add(n),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);const n=t.geometry;if(n!==void 0){const s=n.getAttribute("position");if(e===!0&&s!==void 0&&t.isInstancedMesh!==!0)for(let a=0,o=s.count;a<o;a++)t.isMesh===!0?t.getVertexPosition(a,en):en.fromBufferAttribute(s,a),en.applyMatrix4(t.matrixWorld),this.expandByPoint(en);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),ms.copy(t.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),ms.copy(n.boundingBox)),ms.applyMatrix4(t.matrixWorld),this.union(ms)}const i=t.children;for(let s=0,a=i.length;s<a;s++)this.expandByObject(i[s],e);return this}containsPoint(t){return!(t.x<this.min.x||t.x>this.max.x||t.y<this.min.y||t.y>this.max.y||t.z<this.min.z||t.z>this.max.z)}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return!(t.max.x<this.min.x||t.min.x>this.max.x||t.max.y<this.min.y||t.min.y>this.max.y||t.max.z<this.min.z||t.min.z>this.max.z)}intersectsSphere(t){return this.clampPoint(t.center,en),en.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,n;return t.normal.x>0?(e=t.normal.x*this.min.x,n=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,n=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,n+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,n+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,n+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,n+=t.normal.z*this.min.z),e<=-t.constant&&n>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(Yi),gs.subVectors(this.max,Yi),hi.subVectors(t.a,Yi),ui.subVectors(t.b,Yi),di.subVectors(t.c,Yi),Pn.subVectors(ui,hi),Cn.subVectors(di,ui),Hn.subVectors(hi,di);let e=[0,-Pn.z,Pn.y,0,-Cn.z,Cn.y,0,-Hn.z,Hn.y,Pn.z,0,-Pn.x,Cn.z,0,-Cn.x,Hn.z,0,-Hn.x,-Pn.y,Pn.x,0,-Cn.y,Cn.x,0,-Hn.y,Hn.x,0];return!Ar(e,hi,ui,di,gs)||(e=[1,0,0,0,1,0,0,0,1],!Ar(e,hi,ui,di,gs))?!1:(_s.crossVectors(Pn,Cn),e=[_s.x,_s.y,_s.z],Ar(e,hi,ui,di,gs))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,en).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(en).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(mn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),mn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),mn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),mn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),mn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),mn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),mn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),mn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(mn),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}}const mn=[new b,new b,new b,new b,new b,new b,new b,new b],en=new b,ms=new We,hi=new b,ui=new b,di=new b,Pn=new b,Cn=new b,Hn=new b,Yi=new b,gs=new b,_s=new b,Wn=new b;function Ar(r,t,e,n,i){for(let s=0,a=r.length-3;s<=a;s+=3){Wn.fromArray(r,s);const o=i.x*Math.abs(Wn.x)+i.y*Math.abs(Wn.y)+i.z*Math.abs(Wn.z),l=t.dot(Wn),c=e.dot(Wn),h=n.dot(Wn);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>o)return!1}return!0}const ru=new We,qi=new b,Tr=new b;class dn{constructor(t=new b,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){const n=this.center;e!==void 0?n.copy(e):ru.setFromPoints(t).getCenter(n);let i=0;for(let s=0,a=t.length;s<a;s++)i=Math.max(i,n.distanceToSquared(t[s]));return this.radius=Math.sqrt(i),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){const n=this.center.distanceToSquared(t);return e.copy(t),n>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;qi.subVectors(t,this.center);const e=qi.lengthSq();if(e>this.radius*this.radius){const n=Math.sqrt(e),i=(n-this.radius)*.5;this.center.addScaledVector(qi,i/n),this.radius+=i}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(Tr.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(qi.copy(t.center).add(Tr)),this.expandByPoint(qi.copy(t.center).sub(Tr))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}}const gn=new b,wr=new b,vs=new b,Ln=new b,br=new b,xs=new b,Rr=new b;class To{constructor(t=new b,e=new b(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,gn)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);const n=e.dot(this.direction);return n<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const e=gn.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(gn.copy(this.origin).addScaledVector(this.direction,e),gn.distanceToSquared(t))}distanceSqToSegment(t,e,n,i){wr.copy(t).add(e).multiplyScalar(.5),vs.copy(e).sub(t).normalize(),Ln.copy(this.origin).sub(wr);const s=t.distanceTo(e)*.5,a=-this.direction.dot(vs),o=Ln.dot(this.direction),l=-Ln.dot(vs),c=Ln.lengthSq(),h=Math.abs(1-a*a);let d,u,f,g;if(h>0)if(d=a*l-o,u=a*o-l,g=s*h,d>=0)if(u>=-g)if(u<=g){const _=1/h;d*=_,u*=_,f=d*(d+a*u+2*o)+u*(a*d+u+2*l)+c}else u=s,d=Math.max(0,-(a*u+o)),f=-d*d+u*(u+2*l)+c;else u=-s,d=Math.max(0,-(a*u+o)),f=-d*d+u*(u+2*l)+c;else u<=-g?(d=Math.max(0,-(-a*s+o)),u=d>0?-s:Math.min(Math.max(-s,-l),s),f=-d*d+u*(u+2*l)+c):u<=g?(d=0,u=Math.min(Math.max(-s,-l),s),f=u*(u+2*l)+c):(d=Math.max(0,-(a*s+o)),u=d>0?s:Math.min(Math.max(-s,-l),s),f=-d*d+u*(u+2*l)+c);else u=a>0?-s:s,d=Math.max(0,-(a*u+o)),f=-d*d+u*(u+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,d),i&&i.copy(wr).addScaledVector(vs,u),f}intersectSphere(t,e){gn.subVectors(t.center,this.origin);const n=gn.dot(this.direction),i=gn.dot(gn)-n*n,s=t.radius*t.radius;if(i>s)return null;const a=Math.sqrt(s-i),o=n-a,l=n+a;return l<0?null:o<0?this.at(l,e):this.at(o,e)}intersectsSphere(t){return this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;const n=-(this.origin.dot(t.normal)+t.constant)/e;return n>=0?n:null}intersectPlane(t,e){const n=this.distanceToPlane(t);return n===null?null:this.at(n,e)}intersectsPlane(t){const e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let n,i,s,a,o,l;const c=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,u=this.origin;return c>=0?(n=(t.min.x-u.x)*c,i=(t.max.x-u.x)*c):(n=(t.max.x-u.x)*c,i=(t.min.x-u.x)*c),h>=0?(s=(t.min.y-u.y)*h,a=(t.max.y-u.y)*h):(s=(t.max.y-u.y)*h,a=(t.min.y-u.y)*h),n>a||s>i||((s>n||isNaN(n))&&(n=s),(a<i||isNaN(i))&&(i=a),d>=0?(o=(t.min.z-u.z)*d,l=(t.max.z-u.z)*d):(o=(t.max.z-u.z)*d,l=(t.min.z-u.z)*d),n>l||o>i)||((o>n||n!==n)&&(n=o),(l<i||i!==i)&&(i=l),i<0)?null:this.at(n>=0?n:i,e)}intersectsBox(t){return this.intersectBox(t,gn)!==null}intersectTriangle(t,e,n,i,s){br.subVectors(e,t),xs.subVectors(n,t),Rr.crossVectors(br,xs);let a=this.direction.dot(Rr),o;if(a>0){if(i)return null;o=1}else if(a<0)o=-1,a=-a;else return null;Ln.subVectors(this.origin,t);const l=o*this.direction.dot(xs.crossVectors(Ln,xs));if(l<0)return null;const c=o*this.direction.dot(br.cross(Ln));if(c<0||l+c>a)return null;const h=-o*Ln.dot(Rr);return h<0?null:this.at(h/a,s)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class ne{constructor(t,e,n,i,s,a,o,l,c,h,d,u,f,g,_,m){ne.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,n,i,s,a,o,l,c,h,d,u,f,g,_,m)}set(t,e,n,i,s,a,o,l,c,h,d,u,f,g,_,m){const p=this.elements;return p[0]=t,p[4]=e,p[8]=n,p[12]=i,p[1]=s,p[5]=a,p[9]=o,p[13]=l,p[2]=c,p[6]=h,p[10]=d,p[14]=u,p[3]=f,p[7]=g,p[11]=_,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new ne().fromArray(this.elements)}copy(t){const e=this.elements,n=t.elements;return e[0]=n[0],e[1]=n[1],e[2]=n[2],e[3]=n[3],e[4]=n[4],e[5]=n[5],e[6]=n[6],e[7]=n[7],e[8]=n[8],e[9]=n[9],e[10]=n[10],e[11]=n[11],e[12]=n[12],e[13]=n[13],e[14]=n[14],e[15]=n[15],this}copyPosition(t){const e=this.elements,n=t.elements;return e[12]=n[12],e[13]=n[13],e[14]=n[14],this}setFromMatrix3(t){const e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,n){return t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(t,e,n){return this.set(t.x,e.x,n.x,0,t.y,e.y,n.y,0,t.z,e.z,n.z,0,0,0,0,1),this}extractRotation(t){const e=this.elements,n=t.elements,i=1/fi.setFromMatrixColumn(t,0).length(),s=1/fi.setFromMatrixColumn(t,1).length(),a=1/fi.setFromMatrixColumn(t,2).length();return e[0]=n[0]*i,e[1]=n[1]*i,e[2]=n[2]*i,e[3]=0,e[4]=n[4]*s,e[5]=n[5]*s,e[6]=n[6]*s,e[7]=0,e[8]=n[8]*a,e[9]=n[9]*a,e[10]=n[10]*a,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){const e=this.elements,n=t.x,i=t.y,s=t.z,a=Math.cos(n),o=Math.sin(n),l=Math.cos(i),c=Math.sin(i),h=Math.cos(s),d=Math.sin(s);if(t.order==="XYZ"){const u=a*h,f=a*d,g=o*h,_=o*d;e[0]=l*h,e[4]=-l*d,e[8]=c,e[1]=f+g*c,e[5]=u-_*c,e[9]=-o*l,e[2]=_-u*c,e[6]=g+f*c,e[10]=a*l}else if(t.order==="YXZ"){const u=l*h,f=l*d,g=c*h,_=c*d;e[0]=u+_*o,e[4]=g*o-f,e[8]=a*c,e[1]=a*d,e[5]=a*h,e[9]=-o,e[2]=f*o-g,e[6]=_+u*o,e[10]=a*l}else if(t.order==="ZXY"){const u=l*h,f=l*d,g=c*h,_=c*d;e[0]=u-_*o,e[4]=-a*d,e[8]=g+f*o,e[1]=f+g*o,e[5]=a*h,e[9]=_-u*o,e[2]=-a*c,e[6]=o,e[10]=a*l}else if(t.order==="ZYX"){const u=a*h,f=a*d,g=o*h,_=o*d;e[0]=l*h,e[4]=g*c-f,e[8]=u*c+_,e[1]=l*d,e[5]=_*c+u,e[9]=f*c-g,e[2]=-c,e[6]=o*l,e[10]=a*l}else if(t.order==="YZX"){const u=a*l,f=a*c,g=o*l,_=o*c;e[0]=l*h,e[4]=_-u*d,e[8]=g*d+f,e[1]=d,e[5]=a*h,e[9]=-o*h,e[2]=-c*h,e[6]=f*d+g,e[10]=u-_*d}else if(t.order==="XZY"){const u=a*l,f=a*c,g=o*l,_=o*c;e[0]=l*h,e[4]=-d,e[8]=c*h,e[1]=u*d+_,e[5]=a*h,e[9]=f*d-g,e[2]=g*d-f,e[6]=o*h,e[10]=_*d+u}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(ou,t,au)}lookAt(t,e,n){const i=this.elements;return Ge.subVectors(t,e),Ge.lengthSq()===0&&(Ge.z=1),Ge.normalize(),In.crossVectors(n,Ge),In.lengthSq()===0&&(Math.abs(n.z)===1?Ge.x+=1e-4:Ge.z+=1e-4,Ge.normalize(),In.crossVectors(n,Ge)),In.normalize(),ys.crossVectors(Ge,In),i[0]=In.x,i[4]=ys.x,i[8]=Ge.x,i[1]=In.y,i[5]=ys.y,i[9]=Ge.y,i[2]=In.z,i[6]=ys.z,i[10]=Ge.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const n=t.elements,i=e.elements,s=this.elements,a=n[0],o=n[4],l=n[8],c=n[12],h=n[1],d=n[5],u=n[9],f=n[13],g=n[2],_=n[6],m=n[10],p=n[14],x=n[3],v=n[7],y=n[11],P=n[15],A=i[0],R=i[4],N=i[8],M=i[12],w=i[1],U=i[5],V=i[9],J=i[13],L=i[2],B=i[6],k=i[10],j=i[14],q=i[3],$=i[7],Z=i[11],st=i[15];return s[0]=a*A+o*w+l*L+c*q,s[4]=a*R+o*U+l*B+c*$,s[8]=a*N+o*V+l*k+c*Z,s[12]=a*M+o*J+l*j+c*st,s[1]=h*A+d*w+u*L+f*q,s[5]=h*R+d*U+u*B+f*$,s[9]=h*N+d*V+u*k+f*Z,s[13]=h*M+d*J+u*j+f*st,s[2]=g*A+_*w+m*L+p*q,s[6]=g*R+_*U+m*B+p*$,s[10]=g*N+_*V+m*k+p*Z,s[14]=g*M+_*J+m*j+p*st,s[3]=x*A+v*w+y*L+P*q,s[7]=x*R+v*U+y*B+P*$,s[11]=x*N+v*V+y*k+P*Z,s[15]=x*M+v*J+y*j+P*st,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){const t=this.elements,e=t[0],n=t[4],i=t[8],s=t[12],a=t[1],o=t[5],l=t[9],c=t[13],h=t[2],d=t[6],u=t[10],f=t[14],g=t[3],_=t[7],m=t[11],p=t[15];return g*(+s*l*d-i*c*d-s*o*u+n*c*u+i*o*f-n*l*f)+_*(+e*l*f-e*c*u+s*a*u-i*a*f+i*c*h-s*l*h)+m*(+e*c*d-e*o*f-s*a*d+n*a*f+s*o*h-n*c*h)+p*(-i*o*h-e*l*d+e*o*u+i*a*d-n*a*u+n*l*h)}transpose(){const t=this.elements;let e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,n){const i=this.elements;return t.isVector3?(i[12]=t.x,i[13]=t.y,i[14]=t.z):(i[12]=t,i[13]=e,i[14]=n),this}invert(){const t=this.elements,e=t[0],n=t[1],i=t[2],s=t[3],a=t[4],o=t[5],l=t[6],c=t[7],h=t[8],d=t[9],u=t[10],f=t[11],g=t[12],_=t[13],m=t[14],p=t[15],x=d*m*c-_*u*c+_*l*f-o*m*f-d*l*p+o*u*p,v=g*u*c-h*m*c-g*l*f+a*m*f+h*l*p-a*u*p,y=h*_*c-g*d*c+g*o*f-a*_*f-h*o*p+a*d*p,P=g*d*l-h*_*l-g*o*u+a*_*u+h*o*m-a*d*m,A=e*x+n*v+i*y+s*P;if(A===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const R=1/A;return t[0]=x*R,t[1]=(_*u*s-d*m*s-_*i*f+n*m*f+d*i*p-n*u*p)*R,t[2]=(o*m*s-_*l*s+_*i*c-n*m*c-o*i*p+n*l*p)*R,t[3]=(d*l*s-o*u*s-d*i*c+n*u*c+o*i*f-n*l*f)*R,t[4]=v*R,t[5]=(h*m*s-g*u*s+g*i*f-e*m*f-h*i*p+e*u*p)*R,t[6]=(g*l*s-a*m*s-g*i*c+e*m*c+a*i*p-e*l*p)*R,t[7]=(a*u*s-h*l*s+h*i*c-e*u*c-a*i*f+e*l*f)*R,t[8]=y*R,t[9]=(g*d*s-h*_*s-g*n*f+e*_*f+h*n*p-e*d*p)*R,t[10]=(a*_*s-g*o*s+g*n*c-e*_*c-a*n*p+e*o*p)*R,t[11]=(h*o*s-a*d*s-h*n*c+e*d*c+a*n*f-e*o*f)*R,t[12]=P*R,t[13]=(h*_*i-g*d*i+g*n*u-e*_*u-h*n*m+e*d*m)*R,t[14]=(g*o*i-a*_*i-g*n*l+e*_*l+a*n*m-e*o*m)*R,t[15]=(a*d*i-h*o*i+h*n*l-e*d*l-a*n*u+e*o*u)*R,this}scale(t){const e=this.elements,n=t.x,i=t.y,s=t.z;return e[0]*=n,e[4]*=i,e[8]*=s,e[1]*=n,e[5]*=i,e[9]*=s,e[2]*=n,e[6]*=i,e[10]*=s,e[3]*=n,e[7]*=i,e[11]*=s,this}getMaxScaleOnAxis(){const t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],n=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],i=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,n,i))}makeTranslation(t,e,n){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,n,0,0,0,1),this}makeRotationX(t){const e=Math.cos(t),n=Math.sin(t);return this.set(1,0,0,0,0,e,-n,0,0,n,e,0,0,0,0,1),this}makeRotationY(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,0,n,0,0,1,0,0,-n,0,e,0,0,0,0,1),this}makeRotationZ(t){const e=Math.cos(t),n=Math.sin(t);return this.set(e,-n,0,0,n,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){const n=Math.cos(e),i=Math.sin(e),s=1-n,a=t.x,o=t.y,l=t.z,c=s*a,h=s*o;return this.set(c*a+n,c*o-i*l,c*l+i*o,0,c*o+i*l,h*o+n,h*l-i*a,0,c*l-i*o,h*l+i*a,s*l*l+n,0,0,0,0,1),this}makeScale(t,e,n){return this.set(t,0,0,0,0,e,0,0,0,0,n,0,0,0,0,1),this}makeShear(t,e,n,i,s,a){return this.set(1,n,s,0,t,1,a,0,e,i,1,0,0,0,0,1),this}compose(t,e,n){const i=this.elements,s=e._x,a=e._y,o=e._z,l=e._w,c=s+s,h=a+a,d=o+o,u=s*c,f=s*h,g=s*d,_=a*h,m=a*d,p=o*d,x=l*c,v=l*h,y=l*d,P=n.x,A=n.y,R=n.z;return i[0]=(1-(_+p))*P,i[1]=(f+y)*P,i[2]=(g-v)*P,i[3]=0,i[4]=(f-y)*A,i[5]=(1-(u+p))*A,i[6]=(m+x)*A,i[7]=0,i[8]=(g+v)*R,i[9]=(m-x)*R,i[10]=(1-(u+_))*R,i[11]=0,i[12]=t.x,i[13]=t.y,i[14]=t.z,i[15]=1,this}decompose(t,e,n){const i=this.elements;let s=fi.set(i[0],i[1],i[2]).length();const a=fi.set(i[4],i[5],i[6]).length(),o=fi.set(i[8],i[9],i[10]).length();this.determinant()<0&&(s=-s),t.x=i[12],t.y=i[13],t.z=i[14],nn.copy(this);const c=1/s,h=1/a,d=1/o;return nn.elements[0]*=c,nn.elements[1]*=c,nn.elements[2]*=c,nn.elements[4]*=h,nn.elements[5]*=h,nn.elements[6]*=h,nn.elements[8]*=d,nn.elements[9]*=d,nn.elements[10]*=d,e.setFromRotationMatrix(nn),n.x=s,n.y=a,n.z=o,this}makePerspective(t,e,n,i,s,a,o=Tn){const l=this.elements,c=2*s/(e-t),h=2*s/(n-i),d=(e+t)/(e-t),u=(n+i)/(n-i);let f,g;if(o===Tn)f=-(a+s)/(a-s),g=-2*a*s/(a-s);else if(o===ir)f=-a/(a-s),g=-a*s/(a-s);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=c,l[4]=0,l[8]=d,l[12]=0,l[1]=0,l[5]=h,l[9]=u,l[13]=0,l[2]=0,l[6]=0,l[10]=f,l[14]=g,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(t,e,n,i,s,a,o=Tn){const l=this.elements,c=1/(e-t),h=1/(n-i),d=1/(a-s),u=(e+t)*c,f=(n+i)*h;let g,_;if(o===Tn)g=(a+s)*d,_=-2*d;else if(o===ir)g=s*d,_=-1*d;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=2*c,l[4]=0,l[8]=0,l[12]=-u,l[1]=0,l[5]=2*h,l[9]=0,l[13]=-f,l[2]=0,l[6]=0,l[10]=_,l[14]=-g,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(t){const e=this.elements,n=t.elements;for(let i=0;i<16;i++)if(e[i]!==n[i])return!1;return!0}fromArray(t,e=0){for(let n=0;n<16;n++)this.elements[n]=t[n+e];return this}toArray(t=[],e=0){const n=this.elements;return t[e]=n[0],t[e+1]=n[1],t[e+2]=n[2],t[e+3]=n[3],t[e+4]=n[4],t[e+5]=n[5],t[e+6]=n[6],t[e+7]=n[7],t[e+8]=n[8],t[e+9]=n[9],t[e+10]=n[10],t[e+11]=n[11],t[e+12]=n[12],t[e+13]=n[13],t[e+14]=n[14],t[e+15]=n[15],t}}const fi=new b,nn=new ne,ou=new b(0,0,0),au=new b(1,1,1),In=new b,ys=new b,Ge=new b,Ca=new ne,La=new ni;class kn{constructor(t=0,e=0,n=0,i=kn.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=n,this._order=i}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,n,i=this._order){return this._x=t,this._y=e,this._z=n,this._order=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,n=!0){const i=t.elements,s=i[0],a=i[4],o=i[8],l=i[1],c=i[5],h=i[9],d=i[2],u=i[6],f=i[10];switch(e){case"XYZ":this._y=Math.asin(ve(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-a,s)):(this._x=Math.atan2(u,c),this._z=0);break;case"YXZ":this._x=Math.asin(-ve(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-d,s),this._z=0);break;case"ZXY":this._x=Math.asin(ve(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(l,s));break;case"ZYX":this._y=Math.asin(-ve(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,f),this._z=Math.atan2(l,s)):(this._x=0,this._z=Math.atan2(-a,c));break;case"YZX":this._z=Math.asin(ve(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-d,s)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-ve(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(u,c),this._y=Math.atan2(o,s)):(this._x=Math.atan2(-h,f),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,n===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,n){return Ca.makeRotationFromQuaternion(t),this.setFromRotationMatrix(Ca,e,n)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return La.setFromEuler(this),this.setFromQuaternion(La,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}kn.DEFAULT_ORDER="XYZ";class ic{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let lu=0;const Ia=new b,pi=new ni,_n=new ne,Ss=new b,Ki=new b,cu=new b,hu=new ni,Da=new b(1,0,0),Na=new b(0,1,0),Oa=new b(0,0,1),uu={type:"added"},du={type:"removed"};class ee extends Gi{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:lu++}),this.uuid=ai(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=ee.DEFAULT_UP.clone();const t=new b,e=new kn,n=new ni,i=new b(1,1,1);function s(){n.setFromEuler(e,!1)}function a(){e.setFromQuaternion(n,void 0,!1)}e._onChange(s),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new ne},normalMatrix:{value:new Xt}}),this.matrix=new ne,this.matrixWorld=new ne,this.matrixAutoUpdate=ee.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=ee.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new ic,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return pi.setFromAxisAngle(t,e),this.quaternion.multiply(pi),this}rotateOnWorldAxis(t,e){return pi.setFromAxisAngle(t,e),this.quaternion.premultiply(pi),this}rotateX(t){return this.rotateOnAxis(Da,t)}rotateY(t){return this.rotateOnAxis(Na,t)}rotateZ(t){return this.rotateOnAxis(Oa,t)}translateOnAxis(t,e){return Ia.copy(t).applyQuaternion(this.quaternion),this.position.add(Ia.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(Da,t)}translateY(t){return this.translateOnAxis(Na,t)}translateZ(t){return this.translateOnAxis(Oa,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(_n.copy(this.matrixWorld).invert())}lookAt(t,e,n){t.isVector3?Ss.copy(t):Ss.set(t,e,n);const i=this.parent;this.updateWorldMatrix(!0,!1),Ki.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?_n.lookAt(Ki,Ss,this.up):_n.lookAt(Ss,Ki,this.up),this.quaternion.setFromRotationMatrix(_n),i&&(_n.extractRotation(i.matrixWorld),pi.setFromRotationMatrix(_n),this.quaternion.premultiply(pi.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.parent!==null&&t.parent.remove(t),t.parent=this,this.children.push(t),t.dispatchEvent(uu)):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}const e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(du)),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),_n.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),_n.multiply(t.parent.matrixWorld)),t.applyMatrix4(_n),this.add(t),t.updateWorldMatrix(!1,!0),this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let n=0,i=this.children.length;n<i;n++){const a=this.children[n].getObjectByProperty(t,e);if(a!==void 0)return a}}getObjectsByProperty(t,e,n=[]){this[t]===e&&n.push(this);const i=this.children;for(let s=0,a=i.length;s<a;s++)i[s].getObjectsByProperty(t,e,n);return n}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ki,t,cu),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ki,hu,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);const e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const e=this.children;for(let n=0,i=e.length;n<i;n++)e[n].traverseVisible(t)}traverseAncestors(t){const e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),this.matrixWorldNeedsUpdate=!1,t=!0);const e=this.children;for(let n=0,i=e.length;n<i;n++){const s=e[n];(s.matrixWorldAutoUpdate===!0||t===!0)&&s.updateMatrixWorld(t)}}updateWorldMatrix(t,e){const n=this.parent;if(t===!0&&n!==null&&n.matrixWorldAutoUpdate===!0&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),e===!0){const i=this.children;for(let s=0,a=i.length;s<a;s++){const o=i[s];o.matrixWorldAutoUpdate===!0&&o.updateWorldMatrix(!1,!0)}}}toJSON(t){const e=t===void 0||typeof t=="string",n={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});const i={};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.castShadow===!0&&(i.castShadow=!0),this.receiveShadow===!0&&(i.receiveShadow=!0),this.visible===!1&&(i.visible=!1),this.frustumCulled===!1&&(i.frustumCulled=!1),this.renderOrder!==0&&(i.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),i.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(i.matrixAutoUpdate=!1),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(i.type="BatchedMesh",i.perObjectFrustumCulled=this.perObjectFrustumCulled,i.sortObjects=this.sortObjects,i.drawRanges=this._drawRanges,i.reservedRanges=this._reservedRanges,i.visibility=this._visibility,i.active=this._active,i.bounds=this._bounds.map(o=>({boxInitialized:o.boxInitialized,boxMin:o.box.min.toArray(),boxMax:o.box.max.toArray(),sphereInitialized:o.sphereInitialized,sphereRadius:o.sphere.radius,sphereCenter:o.sphere.center.toArray()})),i.maxGeometryCount=this._maxGeometryCount,i.maxVertexCount=this._maxVertexCount,i.maxIndexCount=this._maxIndexCount,i.geometryInitialized=this._geometryInitialized,i.geometryCount=this._geometryCount,i.matricesTexture=this._matricesTexture.toJSON(t),this.boundingSphere!==null&&(i.boundingSphere={center:i.boundingSphere.center.toArray(),radius:i.boundingSphere.radius}),this.boundingBox!==null&&(i.boundingBox={min:i.boundingBox.min.toArray(),max:i.boundingBox.max.toArray()}));function s(o,l){return o[l.uuid]===void 0&&(o[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?i.background=this.background.toJSON():this.background.isTexture&&(i.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(i.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){i.geometry=s(t.geometries,this.geometry);const o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){const l=o.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){const d=l[c];s(t.shapes,d)}else s(t.shapes,l)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(t.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const o=[];for(let l=0,c=this.material.length;l<c;l++)o.push(s(t.materials,this.material[l]));i.material=o}else i.material=s(t.materials,this.material);if(this.children.length>0){i.children=[];for(let o=0;o<this.children.length;o++)i.children.push(this.children[o].toJSON(t).object)}if(this.animations.length>0){i.animations=[];for(let o=0;o<this.animations.length;o++){const l=this.animations[o];i.animations.push(s(t.animations,l))}}if(e){const o=a(t.geometries),l=a(t.materials),c=a(t.textures),h=a(t.images),d=a(t.shapes),u=a(t.skeletons),f=a(t.animations),g=a(t.nodes);o.length>0&&(n.geometries=o),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),d.length>0&&(n.shapes=d),u.length>0&&(n.skeletons=u),f.length>0&&(n.animations=f),g.length>0&&(n.nodes=g)}return n.object=i,n;function a(o){const l=[];for(const c in o){const h=o[c];delete h.metadata,l.push(h)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let n=0;n<t.children.length;n++){const i=t.children[n];this.add(i.clone())}return this}}ee.DEFAULT_UP=new b(0,1,0);ee.DEFAULT_MATRIX_AUTO_UPDATE=!0;ee.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const sn=new b,vn=new b,Pr=new b,xn=new b,mi=new b,gi=new b,Ua=new b,Cr=new b,Lr=new b,Ir=new b;let Ms=!1;class $e{constructor(t=new b,e=new b,n=new b){this.a=t,this.b=e,this.c=n}static getNormal(t,e,n,i){i.subVectors(n,e),sn.subVectors(t,e),i.cross(sn);const s=i.lengthSq();return s>0?i.multiplyScalar(1/Math.sqrt(s)):i.set(0,0,0)}static getBarycoord(t,e,n,i,s){sn.subVectors(i,e),vn.subVectors(n,e),Pr.subVectors(t,e);const a=sn.dot(sn),o=sn.dot(vn),l=sn.dot(Pr),c=vn.dot(vn),h=vn.dot(Pr),d=a*c-o*o;if(d===0)return s.set(0,0,0),null;const u=1/d,f=(c*l-o*h)*u,g=(a*h-o*l)*u;return s.set(1-f-g,g,f)}static containsPoint(t,e,n,i){return this.getBarycoord(t,e,n,i,xn)===null?!1:xn.x>=0&&xn.y>=0&&xn.x+xn.y<=1}static getUV(t,e,n,i,s,a,o,l){return Ms===!1&&(console.warn("THREE.Triangle.getUV() has been renamed to THREE.Triangle.getInterpolation()."),Ms=!0),this.getInterpolation(t,e,n,i,s,a,o,l)}static getInterpolation(t,e,n,i,s,a,o,l){return this.getBarycoord(t,e,n,i,xn)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(s,xn.x),l.addScaledVector(a,xn.y),l.addScaledVector(o,xn.z),l)}static isFrontFacing(t,e,n,i){return sn.subVectors(n,e),vn.subVectors(t,e),sn.cross(vn).dot(i)<0}set(t,e,n){return this.a.copy(t),this.b.copy(e),this.c.copy(n),this}setFromPointsAndIndices(t,e,n,i){return this.a.copy(t[e]),this.b.copy(t[n]),this.c.copy(t[i]),this}setFromAttributeAndIndices(t,e,n,i){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,n),this.c.fromBufferAttribute(t,i),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return sn.subVectors(this.c,this.b),vn.subVectors(this.a,this.b),sn.cross(vn).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return $e.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return $e.getBarycoord(t,this.a,this.b,this.c,e)}getUV(t,e,n,i,s){return Ms===!1&&(console.warn("THREE.Triangle.getUV() has been renamed to THREE.Triangle.getInterpolation()."),Ms=!0),$e.getInterpolation(t,this.a,this.b,this.c,e,n,i,s)}getInterpolation(t,e,n,i,s){return $e.getInterpolation(t,this.a,this.b,this.c,e,n,i,s)}containsPoint(t){return $e.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return $e.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){const n=this.a,i=this.b,s=this.c;let a,o;mi.subVectors(i,n),gi.subVectors(s,n),Cr.subVectors(t,n);const l=mi.dot(Cr),c=gi.dot(Cr);if(l<=0&&c<=0)return e.copy(n);Lr.subVectors(t,i);const h=mi.dot(Lr),d=gi.dot(Lr);if(h>=0&&d<=h)return e.copy(i);const u=l*d-h*c;if(u<=0&&l>=0&&h<=0)return a=l/(l-h),e.copy(n).addScaledVector(mi,a);Ir.subVectors(t,s);const f=mi.dot(Ir),g=gi.dot(Ir);if(g>=0&&f<=g)return e.copy(s);const _=f*c-l*g;if(_<=0&&c>=0&&g<=0)return o=c/(c-g),e.copy(n).addScaledVector(gi,o);const m=h*g-f*d;if(m<=0&&d-h>=0&&f-g>=0)return Ua.subVectors(s,i),o=(d-h)/(d-h+(f-g)),e.copy(i).addScaledVector(Ua,o);const p=1/(m+_+u);return a=_*p,o=u*p,e.copy(n).addScaledVector(mi,a).addScaledVector(gi,o)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}const sc={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Dn={h:0,s:0,l:0},Es={h:0,s:0,l:0};function Dr(r,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?r+(t-r)*6*e:e<1/2?t:e<2/3?r+(t-r)*6*(2/3-e):r}class wt{constructor(t,e,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,n)}set(t,e,n){if(e===void 0&&n===void 0){const i=t;i&&i.isColor?this.copy(i):typeof i=="number"?this.setHex(i):typeof i=="string"&&this.setStyle(i)}else this.setRGB(t,e,n);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=Te){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,te.toWorkingColorSpace(this,e),this}setRGB(t,e,n,i=te.workingColorSpace){return this.r=t,this.g=e,this.b=n,te.toWorkingColorSpace(this,i),this}setHSL(t,e,n,i=te.workingColorSpace){if(t=Ao(t,1),e=ve(e,0,1),n=ve(n,0,1),e===0)this.r=this.g=this.b=n;else{const s=n<=.5?n*(1+e):n+e-n*e,a=2*n-s;this.r=Dr(a,s,t+1/3),this.g=Dr(a,s,t),this.b=Dr(a,s,t-1/3)}return te.toWorkingColorSpace(this,i),this}setStyle(t,e=Te){function n(s){s!==void 0&&parseFloat(s)<1&&console.warn("THREE.Color: Alpha component of "+t+" will be ignored.")}let i;if(i=/^(\w+)\(([^\)]*)\)/.exec(t)){let s;const a=i[1],o=i[2];switch(a){case"rgb":case"rgba":if(s=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(255,parseInt(s[1],10))/255,Math.min(255,parseInt(s[2],10))/255,Math.min(255,parseInt(s[3],10))/255,e);if(s=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setRGB(Math.min(100,parseInt(s[1],10))/100,Math.min(100,parseInt(s[2],10))/100,Math.min(100,parseInt(s[3],10))/100,e);break;case"hsl":case"hsla":if(s=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(s[4]),this.setHSL(parseFloat(s[1])/360,parseFloat(s[2])/100,parseFloat(s[3])/100,e);break;default:console.warn("THREE.Color: Unknown color model "+t)}}else if(i=/^\#([A-Fa-f\d]+)$/.exec(t)){const s=i[1],a=s.length;if(a===3)return this.setRGB(parseInt(s.charAt(0),16)/15,parseInt(s.charAt(1),16)/15,parseInt(s.charAt(2),16)/15,e);if(a===6)return this.setHex(parseInt(s,16),e);console.warn("THREE.Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=Te){const n=sc[t.toLowerCase()];return n!==void 0?this.setHex(n,e):console.warn("THREE.Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Ni(t.r),this.g=Ni(t.g),this.b=Ni(t.b),this}copyLinearToSRGB(t){return this.r=Sr(t.r),this.g=Sr(t.g),this.b=Sr(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=Te){return te.fromWorkingColorSpace(Pe.copy(this),t),Math.round(ve(Pe.r*255,0,255))*65536+Math.round(ve(Pe.g*255,0,255))*256+Math.round(ve(Pe.b*255,0,255))}getHexString(t=Te){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=te.workingColorSpace){te.fromWorkingColorSpace(Pe.copy(this),e);const n=Pe.r,i=Pe.g,s=Pe.b,a=Math.max(n,i,s),o=Math.min(n,i,s);let l,c;const h=(o+a)/2;if(o===a)l=0,c=0;else{const d=a-o;switch(c=h<=.5?d/(a+o):d/(2-a-o),a){case n:l=(i-s)/d+(i<s?6:0);break;case i:l=(s-n)/d+2;break;case s:l=(n-i)/d+4;break}l/=6}return t.h=l,t.s=c,t.l=h,t}getRGB(t,e=te.workingColorSpace){return te.fromWorkingColorSpace(Pe.copy(this),e),t.r=Pe.r,t.g=Pe.g,t.b=Pe.b,t}getStyle(t=Te){te.fromWorkingColorSpace(Pe.copy(this),t);const e=Pe.r,n=Pe.g,i=Pe.b;return t!==Te?`color(${t} ${e.toFixed(3)} ${n.toFixed(3)} ${i.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(n*255)},${Math.round(i*255)})`}offsetHSL(t,e,n){return this.getHSL(Dn),this.setHSL(Dn.h+t,Dn.s+e,Dn.l+n)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,n){return this.r=t.r+(e.r-t.r)*n,this.g=t.g+(e.g-t.g)*n,this.b=t.b+(e.b-t.b)*n,this}lerpHSL(t,e){this.getHSL(Dn),t.getHSL(Es);const n=Ji(Dn.h,Es.h,e),i=Ji(Dn.s,Es.s,e),s=Ji(Dn.l,Es.l,e);return this.setHSL(n,i,s),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const e=this.r,n=this.g,i=this.b,s=t.elements;return this.r=s[0]*e+s[3]*n+s[6]*i,this.g=s[1]*e+s[4]*n+s[7]*i,this.b=s[2]*e+s[5]*n+s[8]*i,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Pe=new wt;wt.NAMES=sc;let fu=0;class un extends Gi{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:fu++}),this.uuid=ai(),this.name="",this.type="Material",this.blending=Ii,this.side=bn,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=eo,this.blendDst=no,this.blendEquation=jn,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new wt(0,0,0),this.blendAlpha=0,this.depthFunc=Qs,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Ma,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=li,this.stencilZFail=li,this.stencilZPass=li,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBuild(){}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const e in t){const n=t[e];if(n===void 0){console.warn(`THREE.Material: parameter '${e}' has value of undefined.`);continue}const i=this[e];if(i===void 0){console.warn(`THREE.Material: '${e}' is not a property of THREE.${this.type}.`);continue}i&&i.isColor?i.set(n):i&&i.isVector3&&n&&n.isVector3?i.copy(n):this[e]=n}}toJSON(t){const e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});const n={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(t).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(t).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(t).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(t).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(t).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==Ii&&(n.blending=this.blending),this.side!==bn&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==eo&&(n.blendSrc=this.blendSrc),this.blendDst!==no&&(n.blendDst=this.blendDst),this.blendEquation!==jn&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==Qs&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Ma&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==li&&(n.stencilFail=this.stencilFail),this.stencilZFail!==li&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==li&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function i(s){const a=[];for(const o in s){const l=s[o];delete l.metadata,a.push(l)}return a}if(e){const s=i(t.textures),a=i(t.images);s.length>0&&(n.textures=s),a.length>0&&(n.images=a)}return n}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const e=t.clippingPlanes;let n=null;if(e!==null){const i=e.length;n=new Array(i);for(let s=0;s!==i;++s)n[s]=e[s].clone()}return this.clippingPlanes=n,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}}class Qt extends un{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new wt(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.combine=yo,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const pe=new b,As=new ot;class tn{constructor(t,e,n=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=n,this.usage=Ea,this._updateRange={offset:0,count:-1},this.updateRanges=[],this.gpuType=Un,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}get updateRange(){return console.warn("THREE.BufferAttribute: updateRange() is deprecated and will be removed in r169. Use addUpdateRange() instead."),this._updateRange}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,n){t*=this.itemSize,n*=e.itemSize;for(let i=0,s=this.itemSize;i<s;i++)this.array[t+i]=e.array[n+i];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,n=this.count;e<n;e++)As.fromBufferAttribute(this,e),As.applyMatrix3(t),this.setXY(e,As.x,As.y);else if(this.itemSize===3)for(let e=0,n=this.count;e<n;e++)pe.fromBufferAttribute(this,e),pe.applyMatrix3(t),this.setXYZ(e,pe.x,pe.y,pe.z);return this}applyMatrix4(t){for(let e=0,n=this.count;e<n;e++)pe.fromBufferAttribute(this,e),pe.applyMatrix4(t),this.setXYZ(e,pe.x,pe.y,pe.z);return this}applyNormalMatrix(t){for(let e=0,n=this.count;e<n;e++)pe.fromBufferAttribute(this,e),pe.applyNormalMatrix(t),this.setXYZ(e,pe.x,pe.y,pe.z);return this}transformDirection(t){for(let e=0,n=this.count;e<n;e++)pe.fromBufferAttribute(this,e),pe.transformDirection(t),this.setXYZ(e,pe.x,pe.y,pe.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let n=this.array[t*this.itemSize+e];return this.normalized&&(n=bi(n,this.array)),n}setComponent(t,e,n){return this.normalized&&(n=Ne(n,this.array)),this.array[t*this.itemSize+e]=n,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=bi(e,this.array)),e}setX(t,e){return this.normalized&&(e=Ne(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=bi(e,this.array)),e}setY(t,e){return this.normalized&&(e=Ne(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=bi(e,this.array)),e}setZ(t,e){return this.normalized&&(e=Ne(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=bi(e,this.array)),e}setW(t,e){return this.normalized&&(e=Ne(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,n){return t*=this.itemSize,this.normalized&&(e=Ne(e,this.array),n=Ne(n,this.array)),this.array[t+0]=e,this.array[t+1]=n,this}setXYZ(t,e,n,i){return t*=this.itemSize,this.normalized&&(e=Ne(e,this.array),n=Ne(n,this.array),i=Ne(i,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=i,this}setXYZW(t,e,n,i,s){return t*=this.itemSize,this.normalized&&(e=Ne(e,this.array),n=Ne(n,this.array),i=Ne(i,this.array),s=Ne(s,this.array)),this.array[t+0]=e,this.array[t+1]=n,this.array[t+2]=i,this.array[t+3]=s,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==Ea&&(t.usage=this.usage),t}}class rc extends tn{constructor(t,e,n){super(new Uint16Array(t),e,n)}}class oc extends tn{constructor(t,e,n){super(new Uint32Array(t),e,n)}}class Kt extends tn{constructor(t,e,n){super(new Float32Array(t),e,n)}}let pu=0;const Ye=new ne,Nr=new ee,_i=new b,Ve=new We,ji=new We,Ae=new b;class _e extends Gi{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:pu++}),this.uuid=ai(),this.name="",this.type="BufferGeometry",this.index=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(Ql(t)?oc:rc)(t,1):this.index=t,this}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,n=0){this.groups.push({start:t,count:e,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){const e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);const n=this.attributes.normal;if(n!==void 0){const s=new Xt().getNormalMatrix(t);n.applyNormalMatrix(s),n.needsUpdate=!0}const i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(t),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return Ye.makeRotationFromQuaternion(t),this.applyMatrix4(Ye),this}rotateX(t){return Ye.makeRotationX(t),this.applyMatrix4(Ye),this}rotateY(t){return Ye.makeRotationY(t),this.applyMatrix4(Ye),this}rotateZ(t){return Ye.makeRotationZ(t),this.applyMatrix4(Ye),this}translate(t,e,n){return Ye.makeTranslation(t,e,n),this.applyMatrix4(Ye),this}scale(t,e,n){return Ye.makeScale(t,e,n),this.applyMatrix4(Ye),this}lookAt(t){return Nr.lookAt(t),Nr.updateMatrix(),this.applyMatrix4(Nr.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(_i).negate(),this.translate(_i.x,_i.y,_i.z),this}setFromPoints(t){const e=[];for(let n=0,i=t.length;n<i;n++){const s=t[n];e.push(s.x,s.y,s.z||0)}return this.setAttribute("position",new Kt(e,3)),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new We);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingBox.set(new b(-1/0,-1/0,-1/0),new b(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let n=0,i=e.length;n<i;n++){const s=e[n];Ve.setFromBufferAttribute(s),this.morphTargetsRelative?(Ae.addVectors(this.boundingBox.min,Ve.min),this.boundingBox.expandByPoint(Ae),Ae.addVectors(this.boundingBox.max,Ve.max),this.boundingBox.expandByPoint(Ae)):(this.boundingBox.expandByPoint(Ve.min),this.boundingBox.expandByPoint(Ve.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new dn);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingSphere.set(new b,1/0);return}if(t){const n=this.boundingSphere.center;if(Ve.setFromBufferAttribute(t),e)for(let s=0,a=e.length;s<a;s++){const o=e[s];ji.setFromBufferAttribute(o),this.morphTargetsRelative?(Ae.addVectors(Ve.min,ji.min),Ve.expandByPoint(Ae),Ae.addVectors(Ve.max,ji.max),Ve.expandByPoint(Ae)):(Ve.expandByPoint(ji.min),Ve.expandByPoint(ji.max))}Ve.getCenter(n);let i=0;for(let s=0,a=t.count;s<a;s++)Ae.fromBufferAttribute(t,s),i=Math.max(i,n.distanceToSquared(Ae));if(e)for(let s=0,a=e.length;s<a;s++){const o=e[s],l=this.morphTargetsRelative;for(let c=0,h=o.count;c<h;c++)Ae.fromBufferAttribute(o,c),l&&(_i.fromBufferAttribute(t,c),Ae.add(_i)),i=Math.max(i,n.distanceToSquared(Ae))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const n=t.array,i=e.position.array,s=e.normal.array,a=e.uv.array,o=i.length/3;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new tn(new Float32Array(4*o),4));const l=this.getAttribute("tangent").array,c=[],h=[];for(let w=0;w<o;w++)c[w]=new b,h[w]=new b;const d=new b,u=new b,f=new b,g=new ot,_=new ot,m=new ot,p=new b,x=new b;function v(w,U,V){d.fromArray(i,w*3),u.fromArray(i,U*3),f.fromArray(i,V*3),g.fromArray(a,w*2),_.fromArray(a,U*2),m.fromArray(a,V*2),u.sub(d),f.sub(d),_.sub(g),m.sub(g);const J=1/(_.x*m.y-m.x*_.y);isFinite(J)&&(p.copy(u).multiplyScalar(m.y).addScaledVector(f,-_.y).multiplyScalar(J),x.copy(f).multiplyScalar(_.x).addScaledVector(u,-m.x).multiplyScalar(J),c[w].add(p),c[U].add(p),c[V].add(p),h[w].add(x),h[U].add(x),h[V].add(x))}let y=this.groups;y.length===0&&(y=[{start:0,count:n.length}]);for(let w=0,U=y.length;w<U;++w){const V=y[w],J=V.start,L=V.count;for(let B=J,k=J+L;B<k;B+=3)v(n[B+0],n[B+1],n[B+2])}const P=new b,A=new b,R=new b,N=new b;function M(w){R.fromArray(s,w*3),N.copy(R);const U=c[w];P.copy(U),P.sub(R.multiplyScalar(R.dot(U))).normalize(),A.crossVectors(N,U);const J=A.dot(h[w])<0?-1:1;l[w*4]=P.x,l[w*4+1]=P.y,l[w*4+2]=P.z,l[w*4+3]=J}for(let w=0,U=y.length;w<U;++w){const V=y[w],J=V.start,L=V.count;for(let B=J,k=J+L;B<k;B+=3)M(n[B+0]),M(n[B+1]),M(n[B+2])}}computeVertexNormals(){const t=this.index,e=this.getAttribute("position");if(e!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new tn(new Float32Array(e.count*3),3),this.setAttribute("normal",n);else for(let u=0,f=n.count;u<f;u++)n.setXYZ(u,0,0,0);const i=new b,s=new b,a=new b,o=new b,l=new b,c=new b,h=new b,d=new b;if(t)for(let u=0,f=t.count;u<f;u+=3){const g=t.getX(u+0),_=t.getX(u+1),m=t.getX(u+2);i.fromBufferAttribute(e,g),s.fromBufferAttribute(e,_),a.fromBufferAttribute(e,m),h.subVectors(a,s),d.subVectors(i,s),h.cross(d),o.fromBufferAttribute(n,g),l.fromBufferAttribute(n,_),c.fromBufferAttribute(n,m),o.add(h),l.add(h),c.add(h),n.setXYZ(g,o.x,o.y,o.z),n.setXYZ(_,l.x,l.y,l.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let u=0,f=e.count;u<f;u+=3)i.fromBufferAttribute(e,u+0),s.fromBufferAttribute(e,u+1),a.fromBufferAttribute(e,u+2),h.subVectors(a,s),d.subVectors(i,s),h.cross(d),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let e=0,n=t.count;e<n;e++)Ae.fromBufferAttribute(t,e),Ae.normalize(),t.setXYZ(e,Ae.x,Ae.y,Ae.z)}toNonIndexed(){function t(o,l){const c=o.array,h=o.itemSize,d=o.normalized,u=new c.constructor(l.length*h);let f=0,g=0;for(let _=0,m=l.length;_<m;_++){o.isInterleavedBufferAttribute?f=l[_]*o.data.stride+o.offset:f=l[_]*h;for(let p=0;p<h;p++)u[g++]=c[f++]}return new tn(u,h,d)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const e=new _e,n=this.index.array,i=this.attributes;for(const o in i){const l=i[o],c=t(l,n);e.setAttribute(o,c)}const s=this.morphAttributes;for(const o in s){const l=[],c=s[o];for(let h=0,d=c.length;h<d;h++){const u=c[h],f=t(u,n);l.push(f)}e.morphAttributes[o]=l}e.morphTargetsRelative=this.morphTargetsRelative;const a=this.groups;for(let o=0,l=a.length;o<l;o++){const c=a[o];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){const t={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};const e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});const n=this.attributes;for(const l in n){const c=n[l];t.data.attributes[l]=c.toJSON(t.data)}const i={};let s=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],h=[];for(let d=0,u=c.length;d<u;d++){const f=c[d];h.push(f.toJSON(t.data))}h.length>0&&(i[l]=h,s=!0)}s&&(t.data.morphAttributes=i,t.data.morphTargetsRelative=this.morphTargetsRelative);const a=this.groups;a.length>0&&(t.data.groups=JSON.parse(JSON.stringify(a)));const o=this.boundingSphere;return o!==null&&(t.data.boundingSphere={center:o.center.toArray(),radius:o.radius}),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const e={};this.name=t.name;const n=t.index;n!==null&&this.setIndex(n.clone(e));const i=t.attributes;for(const c in i){const h=i[c];this.setAttribute(c,h.clone(e))}const s=t.morphAttributes;for(const c in s){const h=[],d=s[c];for(let u=0,f=d.length;u<f;u++)h.push(d[u].clone(e));this.morphAttributes[c]=h}this.morphTargetsRelative=t.morphTargetsRelative;const a=t.groups;for(let c=0,h=a.length;c<h;c++){const d=a[c];this.addGroup(d.start,d.count,d.materialIndex)}const o=t.boundingBox;o!==null&&(this.boundingBox=o.clone());const l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Fa=new ne,Xn=new To,Ts=new dn,Ba=new b,vi=new b,xi=new b,yi=new b,Or=new b,ws=new b,bs=new ot,Rs=new ot,Ps=new ot,za=new b,ka=new b,Ga=new b,Cs=new b,Ls=new b;class X extends ee{constructor(t=new _e,e=new Qt){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const i=e[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=i.length;s<a;s++){const o=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}getVertexPosition(t,e){const n=this.geometry,i=n.attributes.position,s=n.morphAttributes.position,a=n.morphTargetsRelative;e.fromBufferAttribute(i,t);const o=this.morphTargetInfluences;if(s&&o){ws.set(0,0,0);for(let l=0,c=s.length;l<c;l++){const h=o[l],d=s[l];h!==0&&(Or.fromBufferAttribute(d,t),a?ws.addScaledVector(Or,h):ws.addScaledVector(Or.sub(e),h))}e.add(ws)}return e}raycast(t,e){const n=this.geometry,i=this.material,s=this.matrixWorld;i!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Ts.copy(n.boundingSphere),Ts.applyMatrix4(s),Xn.copy(t.ray).recast(t.near),!(Ts.containsPoint(Xn.origin)===!1&&(Xn.intersectSphere(Ts,Ba)===null||Xn.origin.distanceToSquared(Ba)>(t.far-t.near)**2))&&(Fa.copy(s).invert(),Xn.copy(t.ray).applyMatrix4(Fa),!(n.boundingBox!==null&&Xn.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(t,e,Xn)))}_computeIntersections(t,e,n){let i;const s=this.geometry,a=this.material,o=s.index,l=s.attributes.position,c=s.attributes.uv,h=s.attributes.uv1,d=s.attributes.normal,u=s.groups,f=s.drawRange;if(o!==null)if(Array.isArray(a))for(let g=0,_=u.length;g<_;g++){const m=u[g],p=a[m.materialIndex],x=Math.max(m.start,f.start),v=Math.min(o.count,Math.min(m.start+m.count,f.start+f.count));for(let y=x,P=v;y<P;y+=3){const A=o.getX(y),R=o.getX(y+1),N=o.getX(y+2);i=Is(this,p,t,n,c,h,d,A,R,N),i&&(i.faceIndex=Math.floor(y/3),i.face.materialIndex=m.materialIndex,e.push(i))}}else{const g=Math.max(0,f.start),_=Math.min(o.count,f.start+f.count);for(let m=g,p=_;m<p;m+=3){const x=o.getX(m),v=o.getX(m+1),y=o.getX(m+2);i=Is(this,a,t,n,c,h,d,x,v,y),i&&(i.faceIndex=Math.floor(m/3),e.push(i))}}else if(l!==void 0)if(Array.isArray(a))for(let g=0,_=u.length;g<_;g++){const m=u[g],p=a[m.materialIndex],x=Math.max(m.start,f.start),v=Math.min(l.count,Math.min(m.start+m.count,f.start+f.count));for(let y=x,P=v;y<P;y+=3){const A=y,R=y+1,N=y+2;i=Is(this,p,t,n,c,h,d,A,R,N),i&&(i.faceIndex=Math.floor(y/3),i.face.materialIndex=m.materialIndex,e.push(i))}}else{const g=Math.max(0,f.start),_=Math.min(l.count,f.start+f.count);for(let m=g,p=_;m<p;m+=3){const x=m,v=m+1,y=m+2;i=Is(this,a,t,n,c,h,d,x,v,y),i&&(i.faceIndex=Math.floor(m/3),e.push(i))}}}}function mu(r,t,e,n,i,s,a,o){let l;if(t.side===Le?l=n.intersectTriangle(a,s,i,!0,o):l=n.intersectTriangle(i,s,a,t.side===bn,o),l===null)return null;Ls.copy(o),Ls.applyMatrix4(r.matrixWorld);const c=e.ray.origin.distanceTo(Ls);return c<e.near||c>e.far?null:{distance:c,point:Ls.clone(),object:r}}function Is(r,t,e,n,i,s,a,o,l,c){r.getVertexPosition(o,vi),r.getVertexPosition(l,xi),r.getVertexPosition(c,yi);const h=mu(r,t,e,n,vi,xi,yi,Cs);if(h){i&&(bs.fromBufferAttribute(i,o),Rs.fromBufferAttribute(i,l),Ps.fromBufferAttribute(i,c),h.uv=$e.getInterpolation(Cs,vi,xi,yi,bs,Rs,Ps,new ot)),s&&(bs.fromBufferAttribute(s,o),Rs.fromBufferAttribute(s,l),Ps.fromBufferAttribute(s,c),h.uv1=$e.getInterpolation(Cs,vi,xi,yi,bs,Rs,Ps,new ot),h.uv2=h.uv1),a&&(za.fromBufferAttribute(a,o),ka.fromBufferAttribute(a,l),Ga.fromBufferAttribute(a,c),h.normal=$e.getInterpolation(Cs,vi,xi,yi,za,ka,Ga,new b),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));const d={a:o,b:l,c,normal:new b,materialIndex:0};$e.getNormal(vi,xi,yi,d.normal),h.face=d}return h}class Jt extends _e{constructor(t=1,e=1,n=1,i=1,s=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:n,widthSegments:i,heightSegments:s,depthSegments:a};const o=this;i=Math.floor(i),s=Math.floor(s),a=Math.floor(a);const l=[],c=[],h=[],d=[];let u=0,f=0;g("z","y","x",-1,-1,n,e,t,a,s,0),g("z","y","x",1,-1,n,e,-t,a,s,1),g("x","z","y",1,1,t,n,e,i,a,2),g("x","z","y",1,-1,t,n,-e,i,a,3),g("x","y","z",1,-1,t,e,n,i,s,4),g("x","y","z",-1,-1,t,e,-n,i,s,5),this.setIndex(l),this.setAttribute("position",new Kt(c,3)),this.setAttribute("normal",new Kt(h,3)),this.setAttribute("uv",new Kt(d,2));function g(_,m,p,x,v,y,P,A,R,N,M){const w=y/R,U=P/N,V=y/2,J=P/2,L=A/2,B=R+1,k=N+1;let j=0,q=0;const $=new b;for(let Z=0;Z<k;Z++){const st=Z*U-J;for(let at=0;at<B;at++){const W=at*w-V;$[_]=W*x,$[m]=st*v,$[p]=L,c.push($.x,$.y,$.z),$[_]=0,$[m]=0,$[p]=A>0?1:-1,h.push($.x,$.y,$.z),d.push(at/R),d.push(1-Z/N),j+=1}}for(let Z=0;Z<N;Z++)for(let st=0;st<R;st++){const at=u+st+B*Z,W=u+st+B*(Z+1),tt=u+(st+1)+B*(Z+1),pt=u+(st+1)+B*Z;l.push(at,W,pt),l.push(W,tt,pt),q+=6}o.addGroup(f,q,M),f+=q,u+=j}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Jt(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}function ki(r){const t={};for(const e in r){t[e]={};for(const n in r[e]){const i=r[e][n];i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)?i.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][n]=null):t[e][n]=i.clone():Array.isArray(i)?t[e][n]=i.slice():t[e][n]=i}}return t}function Oe(r){const t={};for(let e=0;e<r.length;e++){const n=ki(r[e]);for(const i in n)t[i]=n[i]}return t}function gu(r){const t=[];for(let e=0;e<r.length;e++)t.push(r[e].clone());return t}function ac(r){return r.getRenderTarget()===null?r.outputColorSpace:te.workingColorSpace}const _u={clone:ki,merge:Oe};var vu=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,xu=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class ii extends un{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=vu,this.fragmentShader=xu,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={derivatives:!1,fragDepth:!1,drawBuffers:!1,shaderTextureLOD:!1,clipCullDistance:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=ki(t.uniforms),this.uniformsGroups=gu(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){const e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(const i in this.uniforms){const a=this.uniforms[i].value;a&&a.isTexture?e.uniforms[i]={type:"t",value:a.toJSON(t).uuid}:a&&a.isColor?e.uniforms[i]={type:"c",value:a.getHex()}:a&&a.isVector2?e.uniforms[i]={type:"v2",value:a.toArray()}:a&&a.isVector3?e.uniforms[i]={type:"v3",value:a.toArray()}:a&&a.isVector4?e.uniforms[i]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?e.uniforms[i]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?e.uniforms[i]={type:"m4",value:a.toArray()}:e.uniforms[i]={value:a}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;const n={};for(const i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(e.extensions=n),e}}class lc extends ee{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ne,this.projectionMatrix=new ne,this.projectionMatrixInverse=new ne,this.coordinateSystem=Tn}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,e){super.updateWorldMatrix(t,e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}class Ze extends lc{constructor(t=50,e=1,n=.1,i=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const e=.5*this.getFilmHeight()/t;this.fov=as*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan(Di*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return as*2*Math.atan(Math.tan(Di*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}setViewOffset(t,e,n,i,s,a){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=i,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let e=t*Math.tan(Di*.5*this.fov)/this.zoom,n=2*e,i=this.aspect*n,s=-.5*i;const a=this.view;if(this.view!==null&&this.view.enabled){const l=a.fullWidth,c=a.fullHeight;s+=a.offsetX*i/l,e-=a.offsetY*n/c,i*=a.width/l,n*=a.height/c}const o=this.filmOffset;o!==0&&(s+=t*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+i,e,e-n,t,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}const Si=-90,Mi=1;class yu extends ee{constructor(t,e,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;const i=new Ze(Si,Mi,t,e);i.layers=this.layers,this.add(i);const s=new Ze(Si,Mi,t,e);s.layers=this.layers,this.add(s);const a=new Ze(Si,Mi,t,e);a.layers=this.layers,this.add(a);const o=new Ze(Si,Mi,t,e);o.layers=this.layers,this.add(o);const l=new Ze(Si,Mi,t,e);l.layers=this.layers,this.add(l);const c=new Ze(Si,Mi,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const t=this.coordinateSystem,e=this.children.concat(),[n,i,s,a,o,l]=e;for(const c of e)this.remove(c);if(t===Tn)n.up.set(0,1,0),n.lookAt(1,0,0),i.up.set(0,1,0),i.lookAt(-1,0,0),s.up.set(0,0,-1),s.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===ir)n.up.set(0,-1,0),n.lookAt(-1,0,0),i.up.set(0,-1,0),i.lookAt(1,0,0),s.up.set(0,0,1),s.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();const{renderTarget:n,activeMipmapLevel:i}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[s,a,o,l,c,h]=this.children,d=t.getRenderTarget(),u=t.getActiveCubeFace(),f=t.getActiveMipmapLevel(),g=t.xr.enabled;t.xr.enabled=!1;const _=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,t.setRenderTarget(n,0,i),t.render(e,s),t.setRenderTarget(n,1,i),t.render(e,a),t.setRenderTarget(n,2,i),t.render(e,o),t.setRenderTarget(n,3,i),t.render(e,l),t.setRenderTarget(n,4,i),t.render(e,c),n.texture.generateMipmaps=_,t.setRenderTarget(n,5,i),t.render(e,h),t.setRenderTarget(d,u,f),t.xr.enabled=g,n.texture.needsPMREMUpdate=!0}}class cc extends Fe{constructor(t,e,n,i,s,a,o,l,c,h){t=t!==void 0?t:[],e=e!==void 0?e:Ui,super(t,e,n,i,s,a,o,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class Su extends ei{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;const n={width:t,height:t,depth:1},i=[n,n,n,n,n,n];e.encoding!==void 0&&(Qi("THREE.WebGLCubeRenderTarget: option.encoding has been replaced by option.colorSpace."),e.colorSpace=e.encoding===ti?Te:Je),this.texture=new cc(i,e.mapping,e.wrapS,e.wrapT,e.magFilter,e.minFilter,e.format,e.type,e.anisotropy,e.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=e.generateMipmaps!==void 0?e.generateMipmaps:!1,this.texture.minFilter=e.minFilter!==void 0?e.minFilter:je}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;const n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},i=new Jt(5,5,5),s=new ii({name:"CubemapFromEquirect",uniforms:ki(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Le,blending:Fn});s.uniforms.tEquirect.value=e;const a=new X(i,s),o=e.minFilter;return e.minFilter===rs&&(e.minFilter=je),new yu(1,10,this).update(t,a),e.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(t,e,n,i){const s=t.getRenderTarget();for(let a=0;a<6;a++)t.setRenderTarget(this,a),t.clear(e,n,i);t.setRenderTarget(s)}}const Ur=new b,Mu=new b,Eu=new Xt;class qn{constructor(t=new b(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,n,i){return this.normal.set(t,e,n),this.constant=i,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,n){const i=Ur.subVectors(n,e).cross(Mu.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(i,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e){const n=t.delta(Ur),i=this.normal.dot(n);if(i===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;const s=-(t.start.dot(this.normal)+this.constant)/i;return s<0||s>1?null:e.copy(t.start).addScaledVector(n,s)}intersectsLine(t){const e=this.distanceToPoint(t.start),n=this.distanceToPoint(t.end);return e<0&&n>0||n<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){const n=e||Eu.getNormalMatrix(t),i=this.coplanarPoint(Ur).applyMatrix4(t),s=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(s),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}}const Yn=new dn,Ds=new b;class wo{constructor(t=new qn,e=new qn,n=new qn,i=new qn,s=new qn,a=new qn){this.planes=[t,e,n,i,s,a]}set(t,e,n,i,s,a){const o=this.planes;return o[0].copy(t),o[1].copy(e),o[2].copy(n),o[3].copy(i),o[4].copy(s),o[5].copy(a),this}copy(t){const e=this.planes;for(let n=0;n<6;n++)e[n].copy(t.planes[n]);return this}setFromProjectionMatrix(t,e=Tn){const n=this.planes,i=t.elements,s=i[0],a=i[1],o=i[2],l=i[3],c=i[4],h=i[5],d=i[6],u=i[7],f=i[8],g=i[9],_=i[10],m=i[11],p=i[12],x=i[13],v=i[14],y=i[15];if(n[0].setComponents(l-s,u-c,m-f,y-p).normalize(),n[1].setComponents(l+s,u+c,m+f,y+p).normalize(),n[2].setComponents(l+a,u+h,m+g,y+x).normalize(),n[3].setComponents(l-a,u-h,m-g,y-x).normalize(),n[4].setComponents(l-o,u-d,m-_,y-v).normalize(),e===Tn)n[5].setComponents(l+o,u+d,m+_,y+v).normalize();else if(e===ir)n[5].setComponents(o,d,_,v).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),Yn.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),Yn.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(Yn)}intersectsSprite(t){return Yn.center.set(0,0,0),Yn.radius=.7071067811865476,Yn.applyMatrix4(t.matrixWorld),this.intersectsSphere(Yn)}intersectsSphere(t){const e=this.planes,n=t.center,i=-t.radius;for(let s=0;s<6;s++)if(e[s].distanceToPoint(n)<i)return!1;return!0}intersectsBox(t){const e=this.planes;for(let n=0;n<6;n++){const i=e[n];if(Ds.x=i.normal.x>0?t.max.x:t.min.x,Ds.y=i.normal.y>0?t.max.y:t.min.y,Ds.z=i.normal.z>0?t.max.z:t.min.z,i.distanceToPoint(Ds)<0)return!1}return!0}containsPoint(t){const e=this.planes;for(let n=0;n<6;n++)if(e[n].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}function hc(){let r=null,t=!1,e=null,n=null;function i(s,a){e(s,a),n=r.requestAnimationFrame(i)}return{start:function(){t!==!0&&e!==null&&(n=r.requestAnimationFrame(i),t=!0)},stop:function(){r.cancelAnimationFrame(n),t=!1},setAnimationLoop:function(s){e=s},setContext:function(s){r=s}}}function Au(r,t){const e=t.isWebGL2,n=new WeakMap;function i(c,h){const d=c.array,u=c.usage,f=d.byteLength,g=r.createBuffer();r.bindBuffer(h,g),r.bufferData(h,d,u),c.onUploadCallback();let _;if(d instanceof Float32Array)_=r.FLOAT;else if(d instanceof Uint16Array)if(c.isFloat16BufferAttribute)if(e)_=r.HALF_FLOAT;else throw new Error("THREE.WebGLAttributes: Usage of Float16BufferAttribute requires WebGL2.");else _=r.UNSIGNED_SHORT;else if(d instanceof Int16Array)_=r.SHORT;else if(d instanceof Uint32Array)_=r.UNSIGNED_INT;else if(d instanceof Int32Array)_=r.INT;else if(d instanceof Int8Array)_=r.BYTE;else if(d instanceof Uint8Array)_=r.UNSIGNED_BYTE;else if(d instanceof Uint8ClampedArray)_=r.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+d);return{buffer:g,type:_,bytesPerElement:d.BYTES_PER_ELEMENT,version:c.version,size:f}}function s(c,h,d){const u=h.array,f=h._updateRange,g=h.updateRanges;if(r.bindBuffer(d,c),f.count===-1&&g.length===0&&r.bufferSubData(d,0,u),g.length!==0){for(let _=0,m=g.length;_<m;_++){const p=g[_];e?r.bufferSubData(d,p.start*u.BYTES_PER_ELEMENT,u,p.start,p.count):r.bufferSubData(d,p.start*u.BYTES_PER_ELEMENT,u.subarray(p.start,p.start+p.count))}h.clearUpdateRanges()}f.count!==-1&&(e?r.bufferSubData(d,f.offset*u.BYTES_PER_ELEMENT,u,f.offset,f.count):r.bufferSubData(d,f.offset*u.BYTES_PER_ELEMENT,u.subarray(f.offset,f.offset+f.count)),f.count=-1),h.onUploadCallback()}function a(c){return c.isInterleavedBufferAttribute&&(c=c.data),n.get(c)}function o(c){c.isInterleavedBufferAttribute&&(c=c.data);const h=n.get(c);h&&(r.deleteBuffer(h.buffer),n.delete(c))}function l(c,h){if(c.isGLBufferAttribute){const u=n.get(c);(!u||u.version<c.version)&&n.set(c,{buffer:c.buffer,type:c.type,bytesPerElement:c.elementSize,version:c.version});return}c.isInterleavedBufferAttribute&&(c=c.data);const d=n.get(c);if(d===void 0)n.set(c,i(c,h));else if(d.version<c.version){if(d.size!==c.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");s(d.buffer,c,h),d.version=c.version}}return{get:a,remove:o,update:l}}class lr extends _e{constructor(t=1,e=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:n,heightSegments:i};const s=t/2,a=e/2,o=Math.floor(n),l=Math.floor(i),c=o+1,h=l+1,d=t/o,u=e/l,f=[],g=[],_=[],m=[];for(let p=0;p<h;p++){const x=p*u-a;for(let v=0;v<c;v++){const y=v*d-s;g.push(y,-x,0),_.push(0,0,1),m.push(v/o),m.push(1-p/l)}}for(let p=0;p<l;p++)for(let x=0;x<o;x++){const v=x+c*p,y=x+c*(p+1),P=x+1+c*(p+1),A=x+1+c*p;f.push(v,y,A),f.push(y,P,A)}this.setIndex(f),this.setAttribute("position",new Kt(g,3)),this.setAttribute("normal",new Kt(_,3)),this.setAttribute("uv",new Kt(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new lr(t.width,t.height,t.widthSegments,t.heightSegments)}}var Tu=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,wu=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,bu=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Ru=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Pu=`#ifdef USE_ALPHATEST
	if ( diffuseColor.a < alphaTest ) discard;
#endif`,Cu=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Lu=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Iu=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Du=`#ifdef USE_BATCHING
	attribute float batchId;
	uniform highp sampler2D batchingTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Nu=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( batchId );
#endif`,Ou=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Uu=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Fu=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Bu=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,zu=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,ku=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#pragma unroll_loop_start
	for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
		plane = clippingPlanes[ i ];
		if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
	}
	#pragma unroll_loop_end
	#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
		bool clipped = true;
		#pragma unroll_loop_start
		for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
		}
		#pragma unroll_loop_end
		if ( clipped ) discard;
	#endif
#endif`,Gu=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Vu=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Hu=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Wu=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Xu=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Yu=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	varying vec3 vColor;
#endif`,qu=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif`,Ku=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
float luminance( const in vec3 rgb ) {
	const vec3 weights = vec3( 0.2126729, 0.7151522, 0.0721750 );
	return dot( weights, rgb );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,ju=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,$u=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Zu=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Ju=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Qu=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,td=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,ed="gl_FragColor = linearToOutputTexel( gl_FragColor );",nd=`
const mat3 LINEAR_SRGB_TO_LINEAR_DISPLAY_P3 = mat3(
	vec3( 0.8224621, 0.177538, 0.0 ),
	vec3( 0.0331941, 0.9668058, 0.0 ),
	vec3( 0.0170827, 0.0723974, 0.9105199 )
);
const mat3 LINEAR_DISPLAY_P3_TO_LINEAR_SRGB = mat3(
	vec3( 1.2249401, - 0.2249404, 0.0 ),
	vec3( - 0.0420569, 1.0420571, 0.0 ),
	vec3( - 0.0196376, - 0.0786361, 1.0982735 )
);
vec4 LinearSRGBToLinearDisplayP3( in vec4 value ) {
	return vec4( value.rgb * LINEAR_SRGB_TO_LINEAR_DISPLAY_P3, value.a );
}
vec4 LinearDisplayP3ToLinearSRGB( in vec4 value ) {
	return vec4( value.rgb * LINEAR_DISPLAY_P3_TO_LINEAR_SRGB, value.a );
}
vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}
vec4 LinearToLinear( in vec4 value ) {
	return value;
}
vec4 LinearTosRGB( in vec4 value ) {
	return sRGBTransferOETF( value );
}`,id=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,sd=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,rd=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,od=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,ad=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,ld=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,cd=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,hd=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,ud=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,dd=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,fd=`#ifdef USE_LIGHTMAP
	vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
	vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
	reflectedLight.indirectDiffuse += lightMapIrradiance;
#endif`,pd=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,md=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,gd=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,_d=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	#if defined ( LEGACY_LIGHTS )
		if ( cutoffDistance > 0.0 && decayExponent > 0.0 ) {
			return pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent );
		}
		return 1.0;
	#else
		float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
		if ( cutoffDistance > 0.0 ) {
			distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
		}
		return distanceFalloff;
	#endif
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,vd=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,xd=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,yd=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Sd=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Md=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Ed=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Ad=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Td=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,wd=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,bd=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Rd=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	gl_FragDepthEXT = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Pd=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Cd=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		varying float vFragDepth;
		varying float vIsPerspective;
	#else
		uniform float logDepthBufFC;
	#endif
#endif`,Ld=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		vFragDepth = 1.0 + gl_Position.w;
		vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
	#else
		if ( isPerspectiveMatrix( projectionMatrix ) ) {
			gl_Position.z = log2( max( EPSILON, gl_Position.w + 1.0 ) ) * logDepthBufFC - 1.0;
			gl_Position.z *= gl_Position.w;
		}
	#endif
#endif`,Id=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
	
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Dd=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Nd=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Od=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Ud=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Fd=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Bd=`#if defined( USE_MORPHCOLORS ) && defined( MORPHTARGETS_TEXTURE )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,zd=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		objectNormal += morphNormal0 * morphTargetInfluences[ 0 ];
		objectNormal += morphNormal1 * morphTargetInfluences[ 1 ];
		objectNormal += morphNormal2 * morphTargetInfluences[ 2 ];
		objectNormal += morphNormal3 * morphTargetInfluences[ 3 ];
	#endif
#endif`,kd=`#ifdef USE_MORPHTARGETS
	uniform float morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
		uniform sampler2DArray morphTargetsTexture;
		uniform ivec2 morphTargetsTextureSize;
		vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
			int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
			int y = texelIndex / morphTargetsTextureSize.x;
			int x = texelIndex - y * morphTargetsTextureSize.x;
			ivec3 morphUV = ivec3( x, y, morphTargetIndex );
			return texelFetch( morphTargetsTexture, morphUV, 0 );
		}
	#else
		#ifndef USE_MORPHNORMALS
			uniform float morphTargetInfluences[ 8 ];
		#else
			uniform float morphTargetInfluences[ 4 ];
		#endif
	#endif
#endif`,Gd=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		transformed += morphTarget0 * morphTargetInfluences[ 0 ];
		transformed += morphTarget1 * morphTargetInfluences[ 1 ];
		transformed += morphTarget2 * morphTargetInfluences[ 2 ];
		transformed += morphTarget3 * morphTargetInfluences[ 3 ];
		#ifndef USE_MORPHNORMALS
			transformed += morphTarget4 * morphTargetInfluences[ 4 ];
			transformed += morphTarget5 * morphTargetInfluences[ 5 ];
			transformed += morphTarget6 * morphTargetInfluences[ 6 ];
			transformed += morphTarget7 * morphTargetInfluences[ 7 ];
		#endif
	#endif
#endif`,Vd=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Hd=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Wd=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Xd=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Yd=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,qd=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Kd=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,jd=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,$d=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Zd=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Jd=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Qd=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;
const vec3 PackFactors = vec3( 256. * 256. * 256., 256. * 256., 256. );
const vec4 UnpackFactors = UnpackDownscale / vec4( PackFactors, 1. );
const float ShiftRight8 = 1. / 256.;
vec4 packDepthToRGBA( const in float v ) {
	vec4 r = vec4( fract( v * PackFactors ), v );
	r.yzw -= r.xyz * ShiftRight8;	return r * PackUpscale;
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors );
}
vec2 packDepthToRG( in highp float v ) {
	return packDepthToRGBA( v ).yx;
}
float unpackRGToDepth( const in highp vec2 v ) {
	return unpackRGBAToDepth( vec4( v.xy, 0.0, 0.0 ) );
}
vec4 pack2HalfToRGBA( vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,tf=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,ef=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,nf=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,sf=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,rf=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,of=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,af=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return shadow;
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
		vec3 lightToPosition = shadowCoord.xyz;
		float dp = ( length( lightToPosition ) - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );		dp += shadowBias;
		vec3 bd3D = normalize( lightToPosition );
		#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
			vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
			return (
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
			) * ( 1.0 / 9.0 );
		#else
			return texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
		#endif
	}
#endif`,lf=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,cf=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,hf=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,uf=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,df=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,ff=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,pf=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,mf=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,gf=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,_f=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,vf=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 OptimizedCineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color *= toneMappingExposure;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	return color;
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,xf=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,yf=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
		vec3 refractedRayExit = position + transmissionRay;
		vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
		vec2 refractionCoords = ndcPos.xy / ndcPos.w;
		refractionCoords += 1.0;
		refractionCoords /= 2.0;
		vec4 transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
		vec3 transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,Sf=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Mf=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Ef=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Af=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const Tf=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,wf=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,bf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Rf=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Pf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Cf=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Lf=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,If=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#endif
}`,Df=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,Nf=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,Of=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Uf=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Ff=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Bf=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,zf=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,kf=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Gf=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Vf=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Hf=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Wf=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Xf=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,Yf=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), opacity );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,qf=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Kf=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,jf=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,$f=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Zf=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Jf=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Qf=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,tp=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,ep=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,np=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,ip=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec2 scale;
	scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
	scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sp=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Gt={alphahash_fragment:Tu,alphahash_pars_fragment:wu,alphamap_fragment:bu,alphamap_pars_fragment:Ru,alphatest_fragment:Pu,alphatest_pars_fragment:Cu,aomap_fragment:Lu,aomap_pars_fragment:Iu,batching_pars_vertex:Du,batching_vertex:Nu,begin_vertex:Ou,beginnormal_vertex:Uu,bsdfs:Fu,iridescence_fragment:Bu,bumpmap_pars_fragment:zu,clipping_planes_fragment:ku,clipping_planes_pars_fragment:Gu,clipping_planes_pars_vertex:Vu,clipping_planes_vertex:Hu,color_fragment:Wu,color_pars_fragment:Xu,color_pars_vertex:Yu,color_vertex:qu,common:Ku,cube_uv_reflection_fragment:ju,defaultnormal_vertex:$u,displacementmap_pars_vertex:Zu,displacementmap_vertex:Ju,emissivemap_fragment:Qu,emissivemap_pars_fragment:td,colorspace_fragment:ed,colorspace_pars_fragment:nd,envmap_fragment:id,envmap_common_pars_fragment:sd,envmap_pars_fragment:rd,envmap_pars_vertex:od,envmap_physical_pars_fragment:vd,envmap_vertex:ad,fog_vertex:ld,fog_pars_vertex:cd,fog_fragment:hd,fog_pars_fragment:ud,gradientmap_pars_fragment:dd,lightmap_fragment:fd,lightmap_pars_fragment:pd,lights_lambert_fragment:md,lights_lambert_pars_fragment:gd,lights_pars_begin:_d,lights_toon_fragment:xd,lights_toon_pars_fragment:yd,lights_phong_fragment:Sd,lights_phong_pars_fragment:Md,lights_physical_fragment:Ed,lights_physical_pars_fragment:Ad,lights_fragment_begin:Td,lights_fragment_maps:wd,lights_fragment_end:bd,logdepthbuf_fragment:Rd,logdepthbuf_pars_fragment:Pd,logdepthbuf_pars_vertex:Cd,logdepthbuf_vertex:Ld,map_fragment:Id,map_pars_fragment:Dd,map_particle_fragment:Nd,map_particle_pars_fragment:Od,metalnessmap_fragment:Ud,metalnessmap_pars_fragment:Fd,morphcolor_vertex:Bd,morphnormal_vertex:zd,morphtarget_pars_vertex:kd,morphtarget_vertex:Gd,normal_fragment_begin:Vd,normal_fragment_maps:Hd,normal_pars_fragment:Wd,normal_pars_vertex:Xd,normal_vertex:Yd,normalmap_pars_fragment:qd,clearcoat_normal_fragment_begin:Kd,clearcoat_normal_fragment_maps:jd,clearcoat_pars_fragment:$d,iridescence_pars_fragment:Zd,opaque_fragment:Jd,packing:Qd,premultiplied_alpha_fragment:tf,project_vertex:ef,dithering_fragment:nf,dithering_pars_fragment:sf,roughnessmap_fragment:rf,roughnessmap_pars_fragment:of,shadowmap_pars_fragment:af,shadowmap_pars_vertex:lf,shadowmap_vertex:cf,shadowmask_pars_fragment:hf,skinbase_vertex:uf,skinning_pars_vertex:df,skinning_vertex:ff,skinnormal_vertex:pf,specularmap_fragment:mf,specularmap_pars_fragment:gf,tonemapping_fragment:_f,tonemapping_pars_fragment:vf,transmission_fragment:xf,transmission_pars_fragment:yf,uv_pars_fragment:Sf,uv_pars_vertex:Mf,uv_vertex:Ef,worldpos_vertex:Af,background_vert:Tf,background_frag:wf,backgroundCube_vert:bf,backgroundCube_frag:Rf,cube_vert:Pf,cube_frag:Cf,depth_vert:Lf,depth_frag:If,distanceRGBA_vert:Df,distanceRGBA_frag:Nf,equirect_vert:Of,equirect_frag:Uf,linedashed_vert:Ff,linedashed_frag:Bf,meshbasic_vert:zf,meshbasic_frag:kf,meshlambert_vert:Gf,meshlambert_frag:Vf,meshmatcap_vert:Hf,meshmatcap_frag:Wf,meshnormal_vert:Xf,meshnormal_frag:Yf,meshphong_vert:qf,meshphong_frag:Kf,meshphysical_vert:jf,meshphysical_frag:$f,meshtoon_vert:Zf,meshtoon_frag:Jf,points_vert:Qf,points_frag:tp,shadow_vert:ep,shadow_frag:np,sprite_vert:ip,sprite_frag:sp},ht={common:{diffuse:{value:new wt(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Xt},alphaMap:{value:null},alphaMapTransform:{value:new Xt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Xt}},envmap:{envMap:{value:null},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Xt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Xt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Xt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Xt},normalScale:{value:new ot(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Xt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Xt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Xt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Xt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new wt(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new wt(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Xt},alphaTest:{value:0},uvTransform:{value:new Xt}},sprite:{diffuse:{value:new wt(16777215)},opacity:{value:1},center:{value:new ot(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Xt},alphaMap:{value:null},alphaMapTransform:{value:new Xt},alphaTest:{value:0}}},hn={basic:{uniforms:Oe([ht.common,ht.specularmap,ht.envmap,ht.aomap,ht.lightmap,ht.fog]),vertexShader:Gt.meshbasic_vert,fragmentShader:Gt.meshbasic_frag},lambert:{uniforms:Oe([ht.common,ht.specularmap,ht.envmap,ht.aomap,ht.lightmap,ht.emissivemap,ht.bumpmap,ht.normalmap,ht.displacementmap,ht.fog,ht.lights,{emissive:{value:new wt(0)}}]),vertexShader:Gt.meshlambert_vert,fragmentShader:Gt.meshlambert_frag},phong:{uniforms:Oe([ht.common,ht.specularmap,ht.envmap,ht.aomap,ht.lightmap,ht.emissivemap,ht.bumpmap,ht.normalmap,ht.displacementmap,ht.fog,ht.lights,{emissive:{value:new wt(0)},specular:{value:new wt(1118481)},shininess:{value:30}}]),vertexShader:Gt.meshphong_vert,fragmentShader:Gt.meshphong_frag},standard:{uniforms:Oe([ht.common,ht.envmap,ht.aomap,ht.lightmap,ht.emissivemap,ht.bumpmap,ht.normalmap,ht.displacementmap,ht.roughnessmap,ht.metalnessmap,ht.fog,ht.lights,{emissive:{value:new wt(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Gt.meshphysical_vert,fragmentShader:Gt.meshphysical_frag},toon:{uniforms:Oe([ht.common,ht.aomap,ht.lightmap,ht.emissivemap,ht.bumpmap,ht.normalmap,ht.displacementmap,ht.gradientmap,ht.fog,ht.lights,{emissive:{value:new wt(0)}}]),vertexShader:Gt.meshtoon_vert,fragmentShader:Gt.meshtoon_frag},matcap:{uniforms:Oe([ht.common,ht.bumpmap,ht.normalmap,ht.displacementmap,ht.fog,{matcap:{value:null}}]),vertexShader:Gt.meshmatcap_vert,fragmentShader:Gt.meshmatcap_frag},points:{uniforms:Oe([ht.points,ht.fog]),vertexShader:Gt.points_vert,fragmentShader:Gt.points_frag},dashed:{uniforms:Oe([ht.common,ht.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Gt.linedashed_vert,fragmentShader:Gt.linedashed_frag},depth:{uniforms:Oe([ht.common,ht.displacementmap]),vertexShader:Gt.depth_vert,fragmentShader:Gt.depth_frag},normal:{uniforms:Oe([ht.common,ht.bumpmap,ht.normalmap,ht.displacementmap,{opacity:{value:1}}]),vertexShader:Gt.meshnormal_vert,fragmentShader:Gt.meshnormal_frag},sprite:{uniforms:Oe([ht.sprite,ht.fog]),vertexShader:Gt.sprite_vert,fragmentShader:Gt.sprite_frag},background:{uniforms:{uvTransform:{value:new Xt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Gt.background_vert,fragmentShader:Gt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1}},vertexShader:Gt.backgroundCube_vert,fragmentShader:Gt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Gt.cube_vert,fragmentShader:Gt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Gt.equirect_vert,fragmentShader:Gt.equirect_frag},distanceRGBA:{uniforms:Oe([ht.common,ht.displacementmap,{referencePosition:{value:new b},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Gt.distanceRGBA_vert,fragmentShader:Gt.distanceRGBA_frag},shadow:{uniforms:Oe([ht.lights,ht.fog,{color:{value:new wt(0)},opacity:{value:1}}]),vertexShader:Gt.shadow_vert,fragmentShader:Gt.shadow_frag}};hn.physical={uniforms:Oe([hn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Xt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Xt},clearcoatNormalScale:{value:new ot(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Xt},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Xt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Xt},sheen:{value:0},sheenColor:{value:new wt(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Xt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Xt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Xt},transmissionSamplerSize:{value:new ot},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Xt},attenuationDistance:{value:0},attenuationColor:{value:new wt(0)},specularColor:{value:new wt(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Xt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Xt},anisotropyVector:{value:new ot},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Xt}}]),vertexShader:Gt.meshphysical_vert,fragmentShader:Gt.meshphysical_frag};const Ns={r:0,b:0,g:0};function rp(r,t,e,n,i,s,a){const o=new wt(0);let l=s===!0?0:1,c,h,d=null,u=0,f=null;function g(m,p){let x=!1,v=p.isScene===!0?p.background:null;v&&v.isTexture&&(v=(p.backgroundBlurriness>0?e:t).get(v)),v===null?_(o,l):v&&v.isColor&&(_(v,1),x=!0);const y=r.xr.getEnvironmentBlendMode();y==="additive"?n.buffers.color.setClear(0,0,0,1,a):y==="alpha-blend"&&n.buffers.color.setClear(0,0,0,0,a),(r.autoClear||x)&&r.clear(r.autoClearColor,r.autoClearDepth,r.autoClearStencil),v&&(v.isCubeTexture||v.mapping===or)?(h===void 0&&(h=new X(new Jt(1,1,1),new ii({name:"BackgroundCubeMaterial",uniforms:ki(hn.backgroundCube.uniforms),vertexShader:hn.backgroundCube.vertexShader,fragmentShader:hn.backgroundCube.fragmentShader,side:Le,depthTest:!1,depthWrite:!1,fog:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(P,A,R){this.matrixWorld.copyPosition(R.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(h)),h.material.uniforms.envMap.value=v,h.material.uniforms.flipEnvMap.value=v.isCubeTexture&&v.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=p.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=p.backgroundIntensity,h.material.toneMapped=te.getTransfer(v.colorSpace)!==oe,(d!==v||u!==v.version||f!==r.toneMapping)&&(h.material.needsUpdate=!0,d=v,u=v.version,f=r.toneMapping),h.layers.enableAll(),m.unshift(h,h.geometry,h.material,0,0,null)):v&&v.isTexture&&(c===void 0&&(c=new X(new lr(2,2),new ii({name:"BackgroundMaterial",uniforms:ki(hn.background.uniforms),vertexShader:hn.background.vertexShader,fragmentShader:hn.background.fragmentShader,side:bn,depthTest:!1,depthWrite:!1,fog:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(c)),c.material.uniforms.t2D.value=v,c.material.uniforms.backgroundIntensity.value=p.backgroundIntensity,c.material.toneMapped=te.getTransfer(v.colorSpace)!==oe,v.matrixAutoUpdate===!0&&v.updateMatrix(),c.material.uniforms.uvTransform.value.copy(v.matrix),(d!==v||u!==v.version||f!==r.toneMapping)&&(c.material.needsUpdate=!0,d=v,u=v.version,f=r.toneMapping),c.layers.enableAll(),m.unshift(c,c.geometry,c.material,0,0,null))}function _(m,p){m.getRGB(Ns,ac(r)),n.buffers.color.setClear(Ns.r,Ns.g,Ns.b,p,a)}return{getClearColor:function(){return o},setClearColor:function(m,p=1){o.set(m),l=p,_(o,l)},getClearAlpha:function(){return l},setClearAlpha:function(m){l=m,_(o,l)},render:g}}function op(r,t,e,n){const i=r.getParameter(r.MAX_VERTEX_ATTRIBS),s=n.isWebGL2?null:t.get("OES_vertex_array_object"),a=n.isWebGL2||s!==null,o={},l=m(null);let c=l,h=!1;function d(L,B,k,j,q){let $=!1;if(a){const Z=_(j,k,B);c!==Z&&(c=Z,f(c.object)),$=p(L,j,k,q),$&&x(L,j,k,q)}else{const Z=B.wireframe===!0;(c.geometry!==j.id||c.program!==k.id||c.wireframe!==Z)&&(c.geometry=j.id,c.program=k.id,c.wireframe=Z,$=!0)}q!==null&&e.update(q,r.ELEMENT_ARRAY_BUFFER),($||h)&&(h=!1,N(L,B,k,j),q!==null&&r.bindBuffer(r.ELEMENT_ARRAY_BUFFER,e.get(q).buffer))}function u(){return n.isWebGL2?r.createVertexArray():s.createVertexArrayOES()}function f(L){return n.isWebGL2?r.bindVertexArray(L):s.bindVertexArrayOES(L)}function g(L){return n.isWebGL2?r.deleteVertexArray(L):s.deleteVertexArrayOES(L)}function _(L,B,k){const j=k.wireframe===!0;let q=o[L.id];q===void 0&&(q={},o[L.id]=q);let $=q[B.id];$===void 0&&($={},q[B.id]=$);let Z=$[j];return Z===void 0&&(Z=m(u()),$[j]=Z),Z}function m(L){const B=[],k=[],j=[];for(let q=0;q<i;q++)B[q]=0,k[q]=0,j[q]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:B,enabledAttributes:k,attributeDivisors:j,object:L,attributes:{},index:null}}function p(L,B,k,j){const q=c.attributes,$=B.attributes;let Z=0;const st=k.getAttributes();for(const at in st)if(st[at].location>=0){const tt=q[at];let pt=$[at];if(pt===void 0&&(at==="instanceMatrix"&&L.instanceMatrix&&(pt=L.instanceMatrix),at==="instanceColor"&&L.instanceColor&&(pt=L.instanceColor)),tt===void 0||tt.attribute!==pt||pt&&tt.data!==pt.data)return!0;Z++}return c.attributesNum!==Z||c.index!==j}function x(L,B,k,j){const q={},$=B.attributes;let Z=0;const st=k.getAttributes();for(const at in st)if(st[at].location>=0){let tt=$[at];tt===void 0&&(at==="instanceMatrix"&&L.instanceMatrix&&(tt=L.instanceMatrix),at==="instanceColor"&&L.instanceColor&&(tt=L.instanceColor));const pt={};pt.attribute=tt,tt&&tt.data&&(pt.data=tt.data),q[at]=pt,Z++}c.attributes=q,c.attributesNum=Z,c.index=j}function v(){const L=c.newAttributes;for(let B=0,k=L.length;B<k;B++)L[B]=0}function y(L){P(L,0)}function P(L,B){const k=c.newAttributes,j=c.enabledAttributes,q=c.attributeDivisors;k[L]=1,j[L]===0&&(r.enableVertexAttribArray(L),j[L]=1),q[L]!==B&&((n.isWebGL2?r:t.get("ANGLE_instanced_arrays"))[n.isWebGL2?"vertexAttribDivisor":"vertexAttribDivisorANGLE"](L,B),q[L]=B)}function A(){const L=c.newAttributes,B=c.enabledAttributes;for(let k=0,j=B.length;k<j;k++)B[k]!==L[k]&&(r.disableVertexAttribArray(k),B[k]=0)}function R(L,B,k,j,q,$,Z){Z===!0?r.vertexAttribIPointer(L,B,k,q,$):r.vertexAttribPointer(L,B,k,j,q,$)}function N(L,B,k,j){if(n.isWebGL2===!1&&(L.isInstancedMesh||j.isInstancedBufferGeometry)&&t.get("ANGLE_instanced_arrays")===null)return;v();const q=j.attributes,$=k.getAttributes(),Z=B.defaultAttributeValues;for(const st in $){const at=$[st];if(at.location>=0){let W=q[st];if(W===void 0&&(st==="instanceMatrix"&&L.instanceMatrix&&(W=L.instanceMatrix),st==="instanceColor"&&L.instanceColor&&(W=L.instanceColor)),W!==void 0){const tt=W.normalized,pt=W.itemSize,Mt=e.get(W);if(Mt===void 0)continue;const _t=Mt.buffer,Lt=Mt.type,Ut=Mt.bytesPerElement,Et=n.isWebGL2===!0&&(Lt===r.INT||Lt===r.UNSIGNED_INT||W.gpuType===Hl);if(W.isInterleavedBufferAttribute){const Nt=W.data,C=Nt.stride,lt=W.offset;if(Nt.isInstancedInterleavedBuffer){for(let K=0;K<at.locationSize;K++)P(at.location+K,Nt.meshPerAttribute);L.isInstancedMesh!==!0&&j._maxInstanceCount===void 0&&(j._maxInstanceCount=Nt.meshPerAttribute*Nt.count)}else for(let K=0;K<at.locationSize;K++)y(at.location+K);r.bindBuffer(r.ARRAY_BUFFER,_t);for(let K=0;K<at.locationSize;K++)R(at.location+K,pt/at.locationSize,Lt,tt,C*Ut,(lt+pt/at.locationSize*K)*Ut,Et)}else{if(W.isInstancedBufferAttribute){for(let Nt=0;Nt<at.locationSize;Nt++)P(at.location+Nt,W.meshPerAttribute);L.isInstancedMesh!==!0&&j._maxInstanceCount===void 0&&(j._maxInstanceCount=W.meshPerAttribute*W.count)}else for(let Nt=0;Nt<at.locationSize;Nt++)y(at.location+Nt);r.bindBuffer(r.ARRAY_BUFFER,_t);for(let Nt=0;Nt<at.locationSize;Nt++)R(at.location+Nt,pt/at.locationSize,Lt,tt,pt*Ut,pt/at.locationSize*Nt*Ut,Et)}}else if(Z!==void 0){const tt=Z[st];if(tt!==void 0)switch(tt.length){case 2:r.vertexAttrib2fv(at.location,tt);break;case 3:r.vertexAttrib3fv(at.location,tt);break;case 4:r.vertexAttrib4fv(at.location,tt);break;default:r.vertexAttrib1fv(at.location,tt)}}}}A()}function M(){V();for(const L in o){const B=o[L];for(const k in B){const j=B[k];for(const q in j)g(j[q].object),delete j[q];delete B[k]}delete o[L]}}function w(L){if(o[L.id]===void 0)return;const B=o[L.id];for(const k in B){const j=B[k];for(const q in j)g(j[q].object),delete j[q];delete B[k]}delete o[L.id]}function U(L){for(const B in o){const k=o[B];if(k[L.id]===void 0)continue;const j=k[L.id];for(const q in j)g(j[q].object),delete j[q];delete k[L.id]}}function V(){J(),h=!0,c!==l&&(c=l,f(c.object))}function J(){l.geometry=null,l.program=null,l.wireframe=!1}return{setup:d,reset:V,resetDefaultState:J,dispose:M,releaseStatesOfGeometry:w,releaseStatesOfProgram:U,initAttributes:v,enableAttribute:y,disableUnusedAttributes:A}}function ap(r,t,e,n){const i=n.isWebGL2;let s;function a(h){s=h}function o(h,d){r.drawArrays(s,h,d),e.update(d,s,1)}function l(h,d,u){if(u===0)return;let f,g;if(i)f=r,g="drawArraysInstanced";else if(f=t.get("ANGLE_instanced_arrays"),g="drawArraysInstancedANGLE",f===null){console.error("THREE.WebGLBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}f[g](s,h,d,u),e.update(d,s,u)}function c(h,d,u){if(u===0)return;const f=t.get("WEBGL_multi_draw");if(f===null)for(let g=0;g<u;g++)this.render(h[g],d[g]);else{f.multiDrawArraysWEBGL(s,h,0,d,0,u);let g=0;for(let _=0;_<u;_++)g+=d[_];e.update(g,s,1)}}this.setMode=a,this.render=o,this.renderInstances=l,this.renderMultiDraw=c}function lp(r,t,e){let n;function i(){if(n!==void 0)return n;if(t.has("EXT_texture_filter_anisotropic")===!0){const R=t.get("EXT_texture_filter_anisotropic");n=r.getParameter(R.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else n=0;return n}function s(R){if(R==="highp"){if(r.getShaderPrecisionFormat(r.VERTEX_SHADER,r.HIGH_FLOAT).precision>0&&r.getShaderPrecisionFormat(r.FRAGMENT_SHADER,r.HIGH_FLOAT).precision>0)return"highp";R="mediump"}return R==="mediump"&&r.getShaderPrecisionFormat(r.VERTEX_SHADER,r.MEDIUM_FLOAT).precision>0&&r.getShaderPrecisionFormat(r.FRAGMENT_SHADER,r.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}const a=typeof WebGL2RenderingContext<"u"&&r.constructor.name==="WebGL2RenderingContext";let o=e.precision!==void 0?e.precision:"highp";const l=s(o);l!==o&&(console.warn("THREE.WebGLRenderer:",o,"not supported, using",l,"instead."),o=l);const c=a||t.has("WEBGL_draw_buffers"),h=e.logarithmicDepthBuffer===!0,d=r.getParameter(r.MAX_TEXTURE_IMAGE_UNITS),u=r.getParameter(r.MAX_VERTEX_TEXTURE_IMAGE_UNITS),f=r.getParameter(r.MAX_TEXTURE_SIZE),g=r.getParameter(r.MAX_CUBE_MAP_TEXTURE_SIZE),_=r.getParameter(r.MAX_VERTEX_ATTRIBS),m=r.getParameter(r.MAX_VERTEX_UNIFORM_VECTORS),p=r.getParameter(r.MAX_VARYING_VECTORS),x=r.getParameter(r.MAX_FRAGMENT_UNIFORM_VECTORS),v=u>0,y=a||t.has("OES_texture_float"),P=v&&y,A=a?r.getParameter(r.MAX_SAMPLES):0;return{isWebGL2:a,drawBuffers:c,getMaxAnisotropy:i,getMaxPrecision:s,precision:o,logarithmicDepthBuffer:h,maxTextures:d,maxVertexTextures:u,maxTextureSize:f,maxCubemapSize:g,maxAttributes:_,maxVertexUniforms:m,maxVaryings:p,maxFragmentUniforms:x,vertexTextures:v,floatFragmentTextures:y,floatVertexTextures:P,maxSamples:A}}function cp(r){const t=this;let e=null,n=0,i=!1,s=!1;const a=new qn,o=new Xt,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u){const f=d.length!==0||u||n!==0||i;return i=u,n=d.length,f},this.beginShadows=function(){s=!0,h(null)},this.endShadows=function(){s=!1},this.setGlobalState=function(d,u){e=h(d,u,0)},this.setState=function(d,u,f){const g=d.clippingPlanes,_=d.clipIntersection,m=d.clipShadows,p=r.get(d);if(!i||g===null||g.length===0||s&&!m)s?h(null):c();else{const x=s?0:n,v=x*4;let y=p.clippingState||null;l.value=y,y=h(g,u,v,f);for(let P=0;P!==v;++P)y[P]=e[P];p.clippingState=y,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=x}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=n>0),t.numPlanes=n,t.numIntersection=0}function h(d,u,f,g){const _=d!==null?d.length:0;let m=null;if(_!==0){if(m=l.value,g!==!0||m===null){const p=f+_*4,x=u.matrixWorldInverse;o.getNormalMatrix(x),(m===null||m.length<p)&&(m=new Float32Array(p));for(let v=0,y=f;v!==_;++v,y+=4)a.copy(d[v]).applyMatrix4(x,o),a.normal.toArray(m,y),m[y+3]=a.constant}l.value=m,l.needsUpdate=!0}return t.numPlanes=_,t.numIntersection=0,m}}function hp(r){let t=new WeakMap;function e(a,o){return o===so?a.mapping=Ui:o===ro&&(a.mapping=Fi),a}function n(a){if(a&&a.isTexture){const o=a.mapping;if(o===so||o===ro)if(t.has(a)){const l=t.get(a).texture;return e(l,a.mapping)}else{const l=a.image;if(l&&l.height>0){const c=new Su(l.height/2);return c.fromEquirectangularTexture(r,a),t.set(a,c),a.addEventListener("dispose",i),e(c.texture,a.mapping)}else return null}}return a}function i(a){const o=a.target;o.removeEventListener("dispose",i);const l=t.get(o);l!==void 0&&(t.delete(o),l.dispose())}function s(){t=new WeakMap}return{get:n,dispose:s}}class uc extends lc{constructor(t=-1,e=1,n=1,i=-1,s=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=n,this.bottom=i,this.near=s,this.far=a,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,n,i,s,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=n,this.view.offsetY=i,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2;let s=n-t,a=n+t,o=i+e,l=i-e;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=c*this.view.offsetX,a=s+c*this.view.width,o-=h*this.view.offsetY,l=o-h*this.view.height}this.projectionMatrix.makeOrthographic(s,a,o,l,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}}const Ri=4,Va=[.125,.215,.35,.446,.526,.582],$n=20,Fr=new uc,Ha=new wt;let Br=null,zr=0,kr=0;const Kn=(1+Math.sqrt(5))/2,Ei=1/Kn,Wa=[new b(1,1,1),new b(-1,1,1),new b(1,1,-1),new b(-1,1,-1),new b(0,Kn,Ei),new b(0,Kn,-Ei),new b(Ei,0,Kn),new b(-Ei,0,Kn),new b(Kn,Ei,0),new b(-Kn,Ei,0)];class Xa{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(t,e=0,n=.1,i=100){Br=this._renderer.getRenderTarget(),zr=this._renderer.getActiveCubeFace(),kr=this._renderer.getActiveMipmapLevel(),this._setSize(256);const s=this._allocateTargets();return s.depthBuffer=!0,this._sceneToCubeUV(t,n,i,s),e>0&&this._blur(s,0,0,e),this._applyPMREM(s),this._cleanup(s),s}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Ka(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=qa(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodPlanes.length;t++)this._lodPlanes[t].dispose()}_cleanup(t){this._renderer.setRenderTarget(Br,zr,kr),t.scissorTest=!1,Os(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===Ui||t.mapping===Fi?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),Br=this._renderer.getRenderTarget(),zr=this._renderer.getActiveCubeFace(),kr=this._renderer.getActiveMipmapLevel();const n=e||this._allocateTargets();return this._textureToCubeUV(t,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,n={magFilter:je,minFilter:je,generateMipmaps:!1,type:os,format:an,colorSpace:Rn,depthBuffer:!1},i=Ya(t,e,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Ya(t,e,n);const{_lodMax:s}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=up(s)),this._blurMaterial=dp(s,t,e)}return i}_compileMaterial(t){const e=new X(this._lodPlanes[0],t);this._renderer.compile(e,Fr)}_sceneToCubeUV(t,e,n,i){const o=new Ze(90,1,e,n),l=[1,-1,1,1,1,1],c=[1,1,1,-1,-1,-1],h=this._renderer,d=h.autoClear,u=h.toneMapping;h.getClearColor(Ha),h.toneMapping=wn,h.autoClear=!1;const f=new Qt({name:"PMREM.Background",side:Le,depthWrite:!1,depthTest:!1}),g=new X(new Jt,f);let _=!1;const m=t.background;m?m.isColor&&(f.color.copy(m),t.background=null,_=!0):(f.color.copy(Ha),_=!0);for(let p=0;p<6;p++){const x=p%3;x===0?(o.up.set(0,l[p],0),o.lookAt(c[p],0,0)):x===1?(o.up.set(0,0,l[p]),o.lookAt(0,c[p],0)):(o.up.set(0,l[p],0),o.lookAt(0,0,c[p]));const v=this._cubeSize;Os(i,x*v,p>2?v:0,v,v),h.setRenderTarget(i),_&&h.render(g,o),h.render(t,o)}g.geometry.dispose(),g.material.dispose(),h.toneMapping=u,h.autoClear=d,t.background=m}_textureToCubeUV(t,e){const n=this._renderer,i=t.mapping===Ui||t.mapping===Fi;i?(this._cubemapMaterial===null&&(this._cubemapMaterial=Ka()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=qa());const s=i?this._cubemapMaterial:this._equirectMaterial,a=new X(this._lodPlanes[0],s),o=s.uniforms;o.envMap.value=t;const l=this._cubeSize;Os(e,0,0,3*l,2*l),n.setRenderTarget(e),n.render(a,Fr)}_applyPMREM(t){const e=this._renderer,n=e.autoClear;e.autoClear=!1;for(let i=1;i<this._lodPlanes.length;i++){const s=Math.sqrt(this._sigmas[i]*this._sigmas[i]-this._sigmas[i-1]*this._sigmas[i-1]),a=Wa[(i-1)%Wa.length];this._blur(t,i-1,i,s,a)}e.autoClear=n}_blur(t,e,n,i,s){const a=this._pingPongRenderTarget;this._halfBlur(t,a,e,n,i,"latitudinal",s),this._halfBlur(a,t,n,n,i,"longitudinal",s)}_halfBlur(t,e,n,i,s,a,o){const l=this._renderer,c=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");const h=3,d=new X(this._lodPlanes[i],c),u=c.uniforms,f=this._sizeLods[n]-1,g=isFinite(s)?Math.PI/(2*f):2*Math.PI/(2*$n-1),_=s/g,m=isFinite(s)?1+Math.floor(h*_):$n;m>$n&&console.warn(`sigmaRadians, ${s}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${$n}`);const p=[];let x=0;for(let R=0;R<$n;++R){const N=R/_,M=Math.exp(-N*N/2);p.push(M),R===0?x+=M:R<m&&(x+=2*M)}for(let R=0;R<p.length;R++)p[R]=p[R]/x;u.envMap.value=t.texture,u.samples.value=m,u.weights.value=p,u.latitudinal.value=a==="latitudinal",o&&(u.poleAxis.value=o);const{_lodMax:v}=this;u.dTheta.value=g,u.mipInt.value=v-n;const y=this._sizeLods[i],P=3*y*(i>v-Ri?i-v+Ri:0),A=4*(this._cubeSize-y);Os(e,P,A,3*y,2*y),l.setRenderTarget(e),l.render(d,Fr)}}function up(r){const t=[],e=[],n=[];let i=r;const s=r-Ri+1+Va.length;for(let a=0;a<s;a++){const o=Math.pow(2,i);e.push(o);let l=1/o;a>r-Ri?l=Va[a-r+Ri-1]:a===0&&(l=0),n.push(l);const c=1/(o-2),h=-c,d=1+c,u=[h,h,d,h,d,d,h,h,d,d,h,d],f=6,g=6,_=3,m=2,p=1,x=new Float32Array(_*g*f),v=new Float32Array(m*g*f),y=new Float32Array(p*g*f);for(let A=0;A<f;A++){const R=A%3*2/3-1,N=A>2?0:-1,M=[R,N,0,R+2/3,N,0,R+2/3,N+1,0,R,N,0,R+2/3,N+1,0,R,N+1,0];x.set(M,_*g*A),v.set(u,m*g*A);const w=[A,A,A,A,A,A];y.set(w,p*g*A)}const P=new _e;P.setAttribute("position",new tn(x,_)),P.setAttribute("uv",new tn(v,m)),P.setAttribute("faceIndex",new tn(y,p)),t.push(P),i>Ri&&i--}return{lodPlanes:t,sizeLods:e,sigmas:n}}function Ya(r,t,e){const n=new ei(r,t,e);return n.texture.mapping=or,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Os(r,t,e,n,i){r.viewport.set(t,e,n,i),r.scissor.set(t,e,n,i)}function dp(r,t,e){const n=new Float32Array($n),i=new b(0,1,0);return new ii({name:"SphericalGaussianBlur",defines:{n:$n,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${r}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:bo(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:Fn,depthTest:!1,depthWrite:!1})}function qa(){return new ii({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:bo(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Fn,depthTest:!1,depthWrite:!1})}function Ka(){return new ii({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:bo(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Fn,depthTest:!1,depthWrite:!1})}function bo(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function fp(r){let t=new WeakMap,e=null;function n(o){if(o&&o.isTexture){const l=o.mapping,c=l===so||l===ro,h=l===Ui||l===Fi;if(c||h)if(o.isRenderTargetTexture&&o.needsPMREMUpdate===!0){o.needsPMREMUpdate=!1;let d=t.get(o);return e===null&&(e=new Xa(r)),d=c?e.fromEquirectangular(o,d):e.fromCubemap(o,d),t.set(o,d),d.texture}else{if(t.has(o))return t.get(o).texture;{const d=o.image;if(c&&d&&d.height>0||h&&d&&i(d)){e===null&&(e=new Xa(r));const u=c?e.fromEquirectangular(o):e.fromCubemap(o);return t.set(o,u),o.addEventListener("dispose",s),u.texture}else return null}}}return o}function i(o){let l=0;const c=6;for(let h=0;h<c;h++)o[h]!==void 0&&l++;return l===c}function s(o){const l=o.target;l.removeEventListener("dispose",s);const c=t.get(l);c!==void 0&&(t.delete(l),c.dispose())}function a(){t=new WeakMap,e!==null&&(e.dispose(),e=null)}return{get:n,dispose:a}}function pp(r){const t={};function e(n){if(t[n]!==void 0)return t[n];let i;switch(n){case"WEBGL_depth_texture":i=r.getExtension("WEBGL_depth_texture")||r.getExtension("MOZ_WEBGL_depth_texture")||r.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":i=r.getExtension("EXT_texture_filter_anisotropic")||r.getExtension("MOZ_EXT_texture_filter_anisotropic")||r.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":i=r.getExtension("WEBGL_compressed_texture_s3tc")||r.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||r.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":i=r.getExtension("WEBGL_compressed_texture_pvrtc")||r.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:i=r.getExtension(n)}return t[n]=i,i}return{has:function(n){return e(n)!==null},init:function(n){n.isWebGL2?(e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance")):(e("WEBGL_depth_texture"),e("OES_texture_float"),e("OES_texture_half_float"),e("OES_texture_half_float_linear"),e("OES_standard_derivatives"),e("OES_element_index_uint"),e("OES_vertex_array_object"),e("ANGLE_instanced_arrays")),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture")},get:function(n){const i=e(n);return i===null&&console.warn("THREE.WebGLRenderer: "+n+" extension not supported."),i}}}function mp(r,t,e,n){const i={},s=new WeakMap;function a(d){const u=d.target;u.index!==null&&t.remove(u.index);for(const g in u.attributes)t.remove(u.attributes[g]);for(const g in u.morphAttributes){const _=u.morphAttributes[g];for(let m=0,p=_.length;m<p;m++)t.remove(_[m])}u.removeEventListener("dispose",a),delete i[u.id];const f=s.get(u);f&&(t.remove(f),s.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,e.memory.geometries--}function o(d,u){return i[u.id]===!0||(u.addEventListener("dispose",a),i[u.id]=!0,e.memory.geometries++),u}function l(d){const u=d.attributes;for(const g in u)t.update(u[g],r.ARRAY_BUFFER);const f=d.morphAttributes;for(const g in f){const _=f[g];for(let m=0,p=_.length;m<p;m++)t.update(_[m],r.ARRAY_BUFFER)}}function c(d){const u=[],f=d.index,g=d.attributes.position;let _=0;if(f!==null){const x=f.array;_=f.version;for(let v=0,y=x.length;v<y;v+=3){const P=x[v+0],A=x[v+1],R=x[v+2];u.push(P,A,A,R,R,P)}}else if(g!==void 0){const x=g.array;_=g.version;for(let v=0,y=x.length/3-1;v<y;v+=3){const P=v+0,A=v+1,R=v+2;u.push(P,A,A,R,R,P)}}else return;const m=new(Ql(u)?oc:rc)(u,1);m.version=_;const p=s.get(d);p&&t.remove(p),s.set(d,m)}function h(d){const u=s.get(d);if(u){const f=d.index;f!==null&&u.version<f.version&&c(d)}else c(d);return s.get(d)}return{get:o,update:l,getWireframeAttribute:h}}function gp(r,t,e,n){const i=n.isWebGL2;let s;function a(f){s=f}let o,l;function c(f){o=f.type,l=f.bytesPerElement}function h(f,g){r.drawElements(s,g,o,f*l),e.update(g,s,1)}function d(f,g,_){if(_===0)return;let m,p;if(i)m=r,p="drawElementsInstanced";else if(m=t.get("ANGLE_instanced_arrays"),p="drawElementsInstancedANGLE",m===null){console.error("THREE.WebGLIndexedBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}m[p](s,g,o,f*l,_),e.update(g,s,_)}function u(f,g,_){if(_===0)return;const m=t.get("WEBGL_multi_draw");if(m===null)for(let p=0;p<_;p++)this.render(f[p]/l,g[p]);else{m.multiDrawElementsWEBGL(s,g,0,o,f,0,_);let p=0;for(let x=0;x<_;x++)p+=g[x];e.update(p,s,1)}}this.setMode=a,this.setIndex=c,this.render=h,this.renderInstances=d,this.renderMultiDraw=u}function _p(r){const t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function n(s,a,o){switch(e.calls++,a){case r.TRIANGLES:e.triangles+=o*(s/3);break;case r.LINES:e.lines+=o*(s/2);break;case r.LINE_STRIP:e.lines+=o*(s-1);break;case r.LINE_LOOP:e.lines+=o*s;break;case r.POINTS:e.points+=o*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",a);break}}function i(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:i,update:n}}function vp(r,t){return r[0]-t[0]}function xp(r,t){return Math.abs(t[1])-Math.abs(r[1])}function yp(r,t,e){const n={},i=new Float32Array(8),s=new WeakMap,a=new we,o=[];for(let c=0;c<8;c++)o[c]=[c,0];function l(c,h,d){const u=c.morphTargetInfluences;if(t.isWebGL2===!0){const g=h.morphAttributes.position||h.morphAttributes.normal||h.morphAttributes.color,_=g!==void 0?g.length:0;let m=s.get(h);if(m===void 0||m.count!==_){let B=function(){J.dispose(),s.delete(h),h.removeEventListener("dispose",B)};var f=B;m!==void 0&&m.texture.dispose();const v=h.morphAttributes.position!==void 0,y=h.morphAttributes.normal!==void 0,P=h.morphAttributes.color!==void 0,A=h.morphAttributes.position||[],R=h.morphAttributes.normal||[],N=h.morphAttributes.color||[];let M=0;v===!0&&(M=1),y===!0&&(M=2),P===!0&&(M=3);let w=h.attributes.position.count*M,U=1;w>t.maxTextureSize&&(U=Math.ceil(w/t.maxTextureSize),w=t.maxTextureSize);const V=new Float32Array(w*U*4*_),J=new nc(V,w,U,_);J.type=Un,J.needsUpdate=!0;const L=M*4;for(let k=0;k<_;k++){const j=A[k],q=R[k],$=N[k],Z=w*U*4*k;for(let st=0;st<j.count;st++){const at=st*L;v===!0&&(a.fromBufferAttribute(j,st),V[Z+at+0]=a.x,V[Z+at+1]=a.y,V[Z+at+2]=a.z,V[Z+at+3]=0),y===!0&&(a.fromBufferAttribute(q,st),V[Z+at+4]=a.x,V[Z+at+5]=a.y,V[Z+at+6]=a.z,V[Z+at+7]=0),P===!0&&(a.fromBufferAttribute($,st),V[Z+at+8]=a.x,V[Z+at+9]=a.y,V[Z+at+10]=a.z,V[Z+at+11]=$.itemSize===4?a.w:1)}}m={count:_,texture:J,size:new ot(w,U)},s.set(h,m),h.addEventListener("dispose",B)}let p=0;for(let v=0;v<u.length;v++)p+=u[v];const x=h.morphTargetsRelative?1:1-p;d.getUniforms().setValue(r,"morphTargetBaseInfluence",x),d.getUniforms().setValue(r,"morphTargetInfluences",u),d.getUniforms().setValue(r,"morphTargetsTexture",m.texture,e),d.getUniforms().setValue(r,"morphTargetsTextureSize",m.size)}else{const g=u===void 0?0:u.length;let _=n[h.id];if(_===void 0||_.length!==g){_=[];for(let y=0;y<g;y++)_[y]=[y,0];n[h.id]=_}for(let y=0;y<g;y++){const P=_[y];P[0]=y,P[1]=u[y]}_.sort(xp);for(let y=0;y<8;y++)y<g&&_[y][1]?(o[y][0]=_[y][0],o[y][1]=_[y][1]):(o[y][0]=Number.MAX_SAFE_INTEGER,o[y][1]=0);o.sort(vp);const m=h.morphAttributes.position,p=h.morphAttributes.normal;let x=0;for(let y=0;y<8;y++){const P=o[y],A=P[0],R=P[1];A!==Number.MAX_SAFE_INTEGER&&R?(m&&h.getAttribute("morphTarget"+y)!==m[A]&&h.setAttribute("morphTarget"+y,m[A]),p&&h.getAttribute("morphNormal"+y)!==p[A]&&h.setAttribute("morphNormal"+y,p[A]),i[y]=R,x+=R):(m&&h.hasAttribute("morphTarget"+y)===!0&&h.deleteAttribute("morphTarget"+y),p&&h.hasAttribute("morphNormal"+y)===!0&&h.deleteAttribute("morphNormal"+y),i[y]=0)}const v=h.morphTargetsRelative?1:1-x;d.getUniforms().setValue(r,"morphTargetBaseInfluence",v),d.getUniforms().setValue(r,"morphTargetInfluences",i)}}return{update:l}}function Sp(r,t,e,n){let i=new WeakMap;function s(l){const c=n.render.frame,h=l.geometry,d=t.get(l,h);if(i.get(d)!==c&&(t.update(d),i.set(d,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",o)===!1&&l.addEventListener("dispose",o),i.get(l)!==c&&(e.update(l.instanceMatrix,r.ARRAY_BUFFER),l.instanceColor!==null&&e.update(l.instanceColor,r.ARRAY_BUFFER),i.set(l,c))),l.isSkinnedMesh){const u=l.skeleton;i.get(u)!==c&&(u.update(),i.set(u,c))}return d}function a(){i=new WeakMap}function o(l){const c=l.target;c.removeEventListener("dispose",o),e.remove(c.instanceMatrix),c.instanceColor!==null&&e.remove(c.instanceColor)}return{update:s,dispose:a}}class dc extends Fe{constructor(t,e,n,i,s,a,o,l,c,h){if(h=h!==void 0?h:Qn,h!==Qn&&h!==zi)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");n===void 0&&h===Qn&&(n=On),n===void 0&&h===zi&&(n=Jn),super(null,i,s,a,o,l,h,n,c),this.isDepthTexture=!0,this.image={width:t,height:e},this.magFilter=o!==void 0?o:Ce,this.minFilter=l!==void 0?l:Ce,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.compareFunction=t.compareFunction,this}toJSON(t){const e=super.toJSON(t);return this.compareFunction!==null&&(e.compareFunction=this.compareFunction),e}}const fc=new Fe,pc=new dc(1,1);pc.compareFunction=Zl;const mc=new nc,gc=new su,_c=new cc,ja=[],$a=[],Za=new Float32Array(16),Ja=new Float32Array(9),Qa=new Float32Array(4);function Vi(r,t,e){const n=r[0];if(n<=0||n>0)return r;const i=t*e;let s=ja[i];if(s===void 0&&(s=new Float32Array(i),ja[i]=s),t!==0){n.toArray(s,0);for(let a=1,o=0;a!==t;++a)o+=e,r[a].toArray(s,o)}return s}function ye(r,t){if(r.length!==t.length)return!1;for(let e=0,n=r.length;e<n;e++)if(r[e]!==t[e])return!1;return!0}function Se(r,t){for(let e=0,n=t.length;e<n;e++)r[e]=t[e]}function cr(r,t){let e=$a[t];e===void 0&&(e=new Int32Array(t),$a[t]=e);for(let n=0;n!==t;++n)e[n]=r.allocateTextureUnit();return e}function Mp(r,t){const e=this.cache;e[0]!==t&&(r.uniform1f(this.addr,t),e[0]=t)}function Ep(r,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(r.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(ye(e,t))return;r.uniform2fv(this.addr,t),Se(e,t)}}function Ap(r,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(r.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(r.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(ye(e,t))return;r.uniform3fv(this.addr,t),Se(e,t)}}function Tp(r,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(r.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(ye(e,t))return;r.uniform4fv(this.addr,t),Se(e,t)}}function wp(r,t){const e=this.cache,n=t.elements;if(n===void 0){if(ye(e,t))return;r.uniformMatrix2fv(this.addr,!1,t),Se(e,t)}else{if(ye(e,n))return;Qa.set(n),r.uniformMatrix2fv(this.addr,!1,Qa),Se(e,n)}}function bp(r,t){const e=this.cache,n=t.elements;if(n===void 0){if(ye(e,t))return;r.uniformMatrix3fv(this.addr,!1,t),Se(e,t)}else{if(ye(e,n))return;Ja.set(n),r.uniformMatrix3fv(this.addr,!1,Ja),Se(e,n)}}function Rp(r,t){const e=this.cache,n=t.elements;if(n===void 0){if(ye(e,t))return;r.uniformMatrix4fv(this.addr,!1,t),Se(e,t)}else{if(ye(e,n))return;Za.set(n),r.uniformMatrix4fv(this.addr,!1,Za),Se(e,n)}}function Pp(r,t){const e=this.cache;e[0]!==t&&(r.uniform1i(this.addr,t),e[0]=t)}function Cp(r,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(r.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(ye(e,t))return;r.uniform2iv(this.addr,t),Se(e,t)}}function Lp(r,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(r.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(ye(e,t))return;r.uniform3iv(this.addr,t),Se(e,t)}}function Ip(r,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(r.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(ye(e,t))return;r.uniform4iv(this.addr,t),Se(e,t)}}function Dp(r,t){const e=this.cache;e[0]!==t&&(r.uniform1ui(this.addr,t),e[0]=t)}function Np(r,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(r.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(ye(e,t))return;r.uniform2uiv(this.addr,t),Se(e,t)}}function Op(r,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(r.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(ye(e,t))return;r.uniform3uiv(this.addr,t),Se(e,t)}}function Up(r,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(r.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(ye(e,t))return;r.uniform4uiv(this.addr,t),Se(e,t)}}function Fp(r,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i);const s=this.type===r.SAMPLER_2D_SHADOW?pc:fc;e.setTexture2D(t||s,i)}function Bp(r,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),e.setTexture3D(t||gc,i)}function zp(r,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),e.setTextureCube(t||_c,i)}function kp(r,t,e){const n=this.cache,i=e.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),e.setTexture2DArray(t||mc,i)}function Gp(r){switch(r){case 5126:return Mp;case 35664:return Ep;case 35665:return Ap;case 35666:return Tp;case 35674:return wp;case 35675:return bp;case 35676:return Rp;case 5124:case 35670:return Pp;case 35667:case 35671:return Cp;case 35668:case 35672:return Lp;case 35669:case 35673:return Ip;case 5125:return Dp;case 36294:return Np;case 36295:return Op;case 36296:return Up;case 35678:case 36198:case 36298:case 36306:case 35682:return Fp;case 35679:case 36299:case 36307:return Bp;case 35680:case 36300:case 36308:case 36293:return zp;case 36289:case 36303:case 36311:case 36292:return kp}}function Vp(r,t){r.uniform1fv(this.addr,t)}function Hp(r,t){const e=Vi(t,this.size,2);r.uniform2fv(this.addr,e)}function Wp(r,t){const e=Vi(t,this.size,3);r.uniform3fv(this.addr,e)}function Xp(r,t){const e=Vi(t,this.size,4);r.uniform4fv(this.addr,e)}function Yp(r,t){const e=Vi(t,this.size,4);r.uniformMatrix2fv(this.addr,!1,e)}function qp(r,t){const e=Vi(t,this.size,9);r.uniformMatrix3fv(this.addr,!1,e)}function Kp(r,t){const e=Vi(t,this.size,16);r.uniformMatrix4fv(this.addr,!1,e)}function jp(r,t){r.uniform1iv(this.addr,t)}function $p(r,t){r.uniform2iv(this.addr,t)}function Zp(r,t){r.uniform3iv(this.addr,t)}function Jp(r,t){r.uniform4iv(this.addr,t)}function Qp(r,t){r.uniform1uiv(this.addr,t)}function tm(r,t){r.uniform2uiv(this.addr,t)}function em(r,t){r.uniform3uiv(this.addr,t)}function nm(r,t){r.uniform4uiv(this.addr,t)}function im(r,t,e){const n=this.cache,i=t.length,s=cr(e,i);ye(n,s)||(r.uniform1iv(this.addr,s),Se(n,s));for(let a=0;a!==i;++a)e.setTexture2D(t[a]||fc,s[a])}function sm(r,t,e){const n=this.cache,i=t.length,s=cr(e,i);ye(n,s)||(r.uniform1iv(this.addr,s),Se(n,s));for(let a=0;a!==i;++a)e.setTexture3D(t[a]||gc,s[a])}function rm(r,t,e){const n=this.cache,i=t.length,s=cr(e,i);ye(n,s)||(r.uniform1iv(this.addr,s),Se(n,s));for(let a=0;a!==i;++a)e.setTextureCube(t[a]||_c,s[a])}function om(r,t,e){const n=this.cache,i=t.length,s=cr(e,i);ye(n,s)||(r.uniform1iv(this.addr,s),Se(n,s));for(let a=0;a!==i;++a)e.setTexture2DArray(t[a]||mc,s[a])}function am(r){switch(r){case 5126:return Vp;case 35664:return Hp;case 35665:return Wp;case 35666:return Xp;case 35674:return Yp;case 35675:return qp;case 35676:return Kp;case 5124:case 35670:return jp;case 35667:case 35671:return $p;case 35668:case 35672:return Zp;case 35669:case 35673:return Jp;case 5125:return Qp;case 36294:return tm;case 36295:return em;case 36296:return nm;case 35678:case 36198:case 36298:case 36306:case 35682:return im;case 35679:case 36299:case 36307:return sm;case 35680:case 36300:case 36308:case 36293:return rm;case 36289:case 36303:case 36311:case 36292:return om}}class lm{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.setValue=Gp(e.type)}}class cm{constructor(t,e,n){this.id=t,this.addr=n,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=am(e.type)}}class hm{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,n){const i=this.seq;for(let s=0,a=i.length;s!==a;++s){const o=i[s];o.setValue(t,e[o.id],n)}}}const Gr=/(\w+)(\])?(\[|\.)?/g;function tl(r,t){r.seq.push(t),r.map[t.id]=t}function um(r,t,e){const n=r.name,i=n.length;for(Gr.lastIndex=0;;){const s=Gr.exec(n),a=Gr.lastIndex;let o=s[1];const l=s[2]==="]",c=s[3];if(l&&(o=o|0),c===void 0||c==="["&&a+2===i){tl(e,c===void 0?new lm(o,r,t):new cm(o,r,t));break}else{let d=e.map[o];d===void 0&&(d=new hm(o),tl(e,d)),e=d}}}class Zs{constructor(t,e){this.seq=[],this.map={};const n=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let i=0;i<n;++i){const s=t.getActiveUniform(e,i),a=t.getUniformLocation(e,s.name);um(s,a,this)}}setValue(t,e,n,i){const s=this.map[e];s!==void 0&&s.setValue(t,n,i)}setOptional(t,e,n){const i=e[n];i!==void 0&&this.setValue(t,n,i)}static upload(t,e,n,i){for(let s=0,a=e.length;s!==a;++s){const o=e[s],l=n[o.id];l.needsUpdate!==!1&&o.setValue(t,l.value,i)}}static seqWithValue(t,e){const n=[];for(let i=0,s=t.length;i!==s;++i){const a=t[i];a.id in e&&n.push(a)}return n}}function el(r,t,e){const n=r.createShader(t);return r.shaderSource(n,e),r.compileShader(n),n}const dm=37297;let fm=0;function pm(r,t){const e=r.split(`
`),n=[],i=Math.max(t-6,0),s=Math.min(t+6,e.length);for(let a=i;a<s;a++){const o=a+1;n.push(`${o===t?">":" "} ${o}: ${e[a]}`)}return n.join(`
`)}function mm(r){const t=te.getPrimaries(te.workingColorSpace),e=te.getPrimaries(r);let n;switch(t===e?n="":t===nr&&e===er?n="LinearDisplayP3ToLinearSRGB":t===er&&e===nr&&(n="LinearSRGBToLinearDisplayP3"),r){case Rn:case ar:return[n,"LinearTransferOETF"];case Te:case Eo:return[n,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space:",r),[n,"LinearTransferOETF"]}}function nl(r,t,e){const n=r.getShaderParameter(t,r.COMPILE_STATUS),i=r.getShaderInfoLog(t).trim();if(n&&i==="")return"";const s=/ERROR: 0:(\d+)/.exec(i);if(s){const a=parseInt(s[1]);return e.toUpperCase()+`

`+i+`

`+pm(r.getShaderSource(t),a)}else return i}function gm(r,t){const e=mm(t);return`vec4 ${r}( vec4 value ) { return ${e[0]}( ${e[1]}( value ) ); }`}function _m(r,t){let e;switch(t){case mh:e="Linear";break;case gh:e="Reinhard";break;case _h:e="OptimizedCineon";break;case io:e="ACESFilmic";break;case xh:e="AgX";break;case vh:e="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",t),e="Linear"}return"vec3 "+r+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}function vm(r){return[r.extensionDerivatives||r.envMapCubeUVHeight||r.bumpMap||r.normalMapTangentSpace||r.clearcoatNormalMap||r.flatShading||r.shaderID==="physical"?"#extension GL_OES_standard_derivatives : enable":"",(r.extensionFragDepth||r.logarithmicDepthBuffer)&&r.rendererExtensionFragDepth?"#extension GL_EXT_frag_depth : enable":"",r.extensionDrawBuffers&&r.rendererExtensionDrawBuffers?"#extension GL_EXT_draw_buffers : require":"",(r.extensionShaderTextureLOD||r.envMap||r.transmission)&&r.rendererExtensionShaderTextureLod?"#extension GL_EXT_shader_texture_lod : enable":""].filter(Pi).join(`
`)}function xm(r){return[r.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":""].filter(Pi).join(`
`)}function ym(r){const t=[];for(const e in r){const n=r[e];n!==!1&&t.push("#define "+e+" "+n)}return t.join(`
`)}function Sm(r,t){const e={},n=r.getProgramParameter(t,r.ACTIVE_ATTRIBUTES);for(let i=0;i<n;i++){const s=r.getActiveAttrib(t,i),a=s.name;let o=1;s.type===r.FLOAT_MAT2&&(o=2),s.type===r.FLOAT_MAT3&&(o=3),s.type===r.FLOAT_MAT4&&(o=4),e[a]={type:s.type,location:r.getAttribLocation(t,a),locationSize:o}}return e}function Pi(r){return r!==""}function il(r,t){const e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return r.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function sl(r,t){return r.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const Mm=/^[ \t]*#include +<([\w\d./]+)>/gm;function co(r){return r.replace(Mm,Am)}const Em=new Map([["encodings_fragment","colorspace_fragment"],["encodings_pars_fragment","colorspace_pars_fragment"],["output_fragment","opaque_fragment"]]);function Am(r,t){let e=Gt[t];if(e===void 0){const n=Em.get(t);if(n!==void 0)e=Gt[n],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,n);else throw new Error("Can not resolve #include <"+t+">")}return co(e)}const Tm=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function rl(r){return r.replace(Tm,wm)}function wm(r,t,e,n){let i="";for(let s=parseInt(t);s<parseInt(e);s++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return i}function ol(r){let t="precision "+r.precision+` float;
precision `+r.precision+" int;";return r.precision==="highp"?t+=`
#define HIGH_PRECISION`:r.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:r.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}function bm(r){let t="SHADOWMAP_TYPE_BASIC";return r.shadowMapType===Gl?t="SHADOWMAP_TYPE_PCF":r.shadowMapType===Hc?t="SHADOWMAP_TYPE_PCF_SOFT":r.shadowMapType===En&&(t="SHADOWMAP_TYPE_VSM"),t}function Rm(r){let t="ENVMAP_TYPE_CUBE";if(r.envMap)switch(r.envMapMode){case Ui:case Fi:t="ENVMAP_TYPE_CUBE";break;case or:t="ENVMAP_TYPE_CUBE_UV";break}return t}function Pm(r){let t="ENVMAP_MODE_REFLECTION";if(r.envMap)switch(r.envMapMode){case Fi:t="ENVMAP_MODE_REFRACTION";break}return t}function Cm(r){let t="ENVMAP_BLENDING_NONE";if(r.envMap)switch(r.combine){case yo:t="ENVMAP_BLENDING_MULTIPLY";break;case fh:t="ENVMAP_BLENDING_MIX";break;case ph:t="ENVMAP_BLENDING_ADD";break}return t}function Lm(r){const t=r.envMapCubeUVHeight;if(t===null)return null;const e=Math.log2(t)-2,n=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),7*16)),texelHeight:n,maxMip:e}}function Im(r,t,e,n){const i=r.getContext(),s=e.defines;let a=e.vertexShader,o=e.fragmentShader;const l=bm(e),c=Rm(e),h=Pm(e),d=Cm(e),u=Lm(e),f=e.isWebGL2?"":vm(e),g=xm(e),_=ym(s),m=i.createProgram();let p,x,v=e.glslVersion?"#version "+e.glslVersion+`
`:"";e.isRawShaderMaterial?(p=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_].filter(Pi).join(`
`),p.length>0&&(p+=`
`),x=[f,"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_].filter(Pi).join(`
`),x.length>0&&(x+=`
`)):(p=[ol(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+h:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors&&e.isWebGL2?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0&&e.isWebGL2?"#define MORPHTARGETS_TEXTURE":"",e.morphTargetsCount>0&&e.isWebGL2?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0&&e.isWebGL2?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.useLegacyLights?"#define LEGACY_LIGHTS":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.logarithmicDepthBuffer&&e.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#if ( defined( USE_MORPHTARGETS ) && ! defined( MORPHTARGETS_TEXTURE ) )","	attribute vec3 morphTarget0;","	attribute vec3 morphTarget1;","	attribute vec3 morphTarget2;","	attribute vec3 morphTarget3;","	#ifdef USE_MORPHNORMALS","		attribute vec3 morphNormal0;","		attribute vec3 morphNormal1;","		attribute vec3 morphNormal2;","		attribute vec3 morphNormal3;","	#else","		attribute vec3 morphTarget4;","		attribute vec3 morphTarget5;","		attribute vec3 morphTarget6;","		attribute vec3 morphTarget7;","	#endif","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Pi).join(`
`),x=[f,ol(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,_,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+h:"",e.envMap?"#define "+d:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.useLegacyLights?"#define LEGACY_LIGHTS":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",e.logarithmicDepthBuffer&&e.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==wn?"#define TONE_MAPPING":"",e.toneMapping!==wn?Gt.tonemapping_pars_fragment:"",e.toneMapping!==wn?_m("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",Gt.colorspace_pars_fragment,gm("linearToOutputTexel",e.outputColorSpace),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(Pi).join(`
`)),a=co(a),a=il(a,e),a=sl(a,e),o=co(o),o=il(o,e),o=sl(o,e),a=rl(a),o=rl(o),e.isWebGL2&&e.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,p=[g,"precision mediump sampler2DArray;","#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+p,x=["precision mediump sampler2DArray;","#define varying in",e.glslVersion===Aa?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===Aa?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+x);const y=v+p+a,P=v+x+o,A=el(i,i.VERTEX_SHADER,y),R=el(i,i.FRAGMENT_SHADER,P);i.attachShader(m,A),i.attachShader(m,R),e.index0AttributeName!==void 0?i.bindAttribLocation(m,0,e.index0AttributeName):e.morphTargets===!0&&i.bindAttribLocation(m,0,"position"),i.linkProgram(m);function N(V){if(r.debug.checkShaderErrors){const J=i.getProgramInfoLog(m).trim(),L=i.getShaderInfoLog(A).trim(),B=i.getShaderInfoLog(R).trim();let k=!0,j=!0;if(i.getProgramParameter(m,i.LINK_STATUS)===!1)if(k=!1,typeof r.debug.onShaderError=="function")r.debug.onShaderError(i,m,A,R);else{const q=nl(i,A,"vertex"),$=nl(i,R,"fragment");console.error("THREE.WebGLProgram: Shader Error "+i.getError()+" - VALIDATE_STATUS "+i.getProgramParameter(m,i.VALIDATE_STATUS)+`

Program Info Log: `+J+`
`+q+`
`+$)}else J!==""?console.warn("THREE.WebGLProgram: Program Info Log:",J):(L===""||B==="")&&(j=!1);j&&(V.diagnostics={runnable:k,programLog:J,vertexShader:{log:L,prefix:p},fragmentShader:{log:B,prefix:x}})}i.deleteShader(A),i.deleteShader(R),M=new Zs(i,m),w=Sm(i,m)}let M;this.getUniforms=function(){return M===void 0&&N(this),M};let w;this.getAttributes=function(){return w===void 0&&N(this),w};let U=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return U===!1&&(U=i.getProgramParameter(m,dm)),U},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(m),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=fm++,this.cacheKey=t,this.usedTimes=1,this.program=m,this.vertexShader=A,this.fragmentShader=R,this}let Dm=0;class Nm{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){const e=t.vertexShader,n=t.fragmentShader,i=this._getShaderStage(e),s=this._getShaderStage(n),a=this._getShaderCacheForMaterial(t);return a.has(i)===!1&&(a.add(i),i.usedTimes++),a.has(s)===!1&&(a.add(s),s.usedTimes++),this}remove(t){const e=this.materialCache.get(t);for(const n of e)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const e=this.materialCache;let n=e.get(t);return n===void 0&&(n=new Set,e.set(t,n)),n}_getShaderStage(t){const e=this.shaderCache;let n=e.get(t);return n===void 0&&(n=new Om(t),e.set(t,n)),n}}class Om{constructor(t){this.id=Dm++,this.code=t,this.usedTimes=0}}function Um(r,t,e,n,i,s,a){const o=new ic,l=new Nm,c=[],h=i.isWebGL2,d=i.logarithmicDepthBuffer,u=i.vertexTextures;let f=i.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function _(M){return M===0?"uv":`uv${M}`}function m(M,w,U,V,J){const L=V.fog,B=J.geometry,k=M.isMeshStandardMaterial?V.environment:null,j=(M.isMeshStandardMaterial?e:t).get(M.envMap||k),q=j&&j.mapping===or?j.image.height:null,$=g[M.type];M.precision!==null&&(f=i.getMaxPrecision(M.precision),f!==M.precision&&console.warn("THREE.WebGLProgram.getParameters:",M.precision,"not supported, using",f,"instead."));const Z=B.morphAttributes.position||B.morphAttributes.normal||B.morphAttributes.color,st=Z!==void 0?Z.length:0;let at=0;B.morphAttributes.position!==void 0&&(at=1),B.morphAttributes.normal!==void 0&&(at=2),B.morphAttributes.color!==void 0&&(at=3);let W,tt,pt,Mt;if($){const Ie=hn[$];W=Ie.vertexShader,tt=Ie.fragmentShader}else W=M.vertexShader,tt=M.fragmentShader,l.update(M),pt=l.getVertexShaderID(M),Mt=l.getFragmentShaderID(M);const _t=r.getRenderTarget(),Lt=J.isInstancedMesh===!0,Ut=J.isBatchedMesh===!0,Et=!!M.map,Nt=!!M.matcap,C=!!j,lt=!!M.aoMap,K=!!M.lightMap,rt=!!M.bumpMap,Y=!!M.normalMap,Tt=!!M.displacementMap,mt=!!M.emissiveMap,E=!!M.metalnessMap,S=!!M.roughnessMap,F=M.anisotropy>0,it=M.clearcoat>0,et=M.iridescence>0,Q=M.sheen>0,yt=M.transmission>0,ut=F&&!!M.anisotropyMap,vt=it&&!!M.clearcoatMap,Rt=it&&!!M.clearcoatNormalMap,Bt=it&&!!M.clearcoatRoughnessMap,nt=et&&!!M.iridescenceMap,jt=et&&!!M.iridescenceThicknessMap,Yt=Q&&!!M.sheenColorMap,Ot=Q&&!!M.sheenRoughnessMap,bt=!!M.specularMap,xt=!!M.specularColorMap,kt=!!M.specularIntensityMap,$t=yt&&!!M.transmissionMap,ue=yt&&!!M.thicknessMap,Ht=!!M.gradientMap,ct=!!M.alphaMap,I=M.alphaTest>0,dt=!!M.alphaHash,ft=!!M.extensions,It=!!B.attributes.uv1,Pt=!!B.attributes.uv2,ie=!!B.attributes.uv3;let se=wn;return M.toneMapped&&(_t===null||_t.isXRRenderTarget===!0)&&(se=r.toneMapping),{isWebGL2:h,shaderID:$,shaderType:M.type,shaderName:M.name,vertexShader:W,fragmentShader:tt,defines:M.defines,customVertexShaderID:pt,customFragmentShaderID:Mt,isRawShaderMaterial:M.isRawShaderMaterial===!0,glslVersion:M.glslVersion,precision:f,batching:Ut,instancing:Lt,instancingColor:Lt&&J.instanceColor!==null,supportsVertexTextures:u,outputColorSpace:_t===null?r.outputColorSpace:_t.isXRRenderTarget===!0?_t.texture.colorSpace:Rn,map:Et,matcap:Nt,envMap:C,envMapMode:C&&j.mapping,envMapCubeUVHeight:q,aoMap:lt,lightMap:K,bumpMap:rt,normalMap:Y,displacementMap:u&&Tt,emissiveMap:mt,normalMapObjectSpace:Y&&M.normalMapType===Lh,normalMapTangentSpace:Y&&M.normalMapType===Mo,metalnessMap:E,roughnessMap:S,anisotropy:F,anisotropyMap:ut,clearcoat:it,clearcoatMap:vt,clearcoatNormalMap:Rt,clearcoatRoughnessMap:Bt,iridescence:et,iridescenceMap:nt,iridescenceThicknessMap:jt,sheen:Q,sheenColorMap:Yt,sheenRoughnessMap:Ot,specularMap:bt,specularColorMap:xt,specularIntensityMap:kt,transmission:yt,transmissionMap:$t,thicknessMap:ue,gradientMap:Ht,opaque:M.transparent===!1&&M.blending===Ii,alphaMap:ct,alphaTest:I,alphaHash:dt,combine:M.combine,mapUv:Et&&_(M.map.channel),aoMapUv:lt&&_(M.aoMap.channel),lightMapUv:K&&_(M.lightMap.channel),bumpMapUv:rt&&_(M.bumpMap.channel),normalMapUv:Y&&_(M.normalMap.channel),displacementMapUv:Tt&&_(M.displacementMap.channel),emissiveMapUv:mt&&_(M.emissiveMap.channel),metalnessMapUv:E&&_(M.metalnessMap.channel),roughnessMapUv:S&&_(M.roughnessMap.channel),anisotropyMapUv:ut&&_(M.anisotropyMap.channel),clearcoatMapUv:vt&&_(M.clearcoatMap.channel),clearcoatNormalMapUv:Rt&&_(M.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Bt&&_(M.clearcoatRoughnessMap.channel),iridescenceMapUv:nt&&_(M.iridescenceMap.channel),iridescenceThicknessMapUv:jt&&_(M.iridescenceThicknessMap.channel),sheenColorMapUv:Yt&&_(M.sheenColorMap.channel),sheenRoughnessMapUv:Ot&&_(M.sheenRoughnessMap.channel),specularMapUv:bt&&_(M.specularMap.channel),specularColorMapUv:xt&&_(M.specularColorMap.channel),specularIntensityMapUv:kt&&_(M.specularIntensityMap.channel),transmissionMapUv:$t&&_(M.transmissionMap.channel),thicknessMapUv:ue&&_(M.thicknessMap.channel),alphaMapUv:ct&&_(M.alphaMap.channel),vertexTangents:!!B.attributes.tangent&&(Y||F),vertexColors:M.vertexColors,vertexAlphas:M.vertexColors===!0&&!!B.attributes.color&&B.attributes.color.itemSize===4,vertexUv1s:It,vertexUv2s:Pt,vertexUv3s:ie,pointsUvs:J.isPoints===!0&&!!B.attributes.uv&&(Et||ct),fog:!!L,useFog:M.fog===!0,fogExp2:L&&L.isFogExp2,flatShading:M.flatShading===!0,sizeAttenuation:M.sizeAttenuation===!0,logarithmicDepthBuffer:d,skinning:J.isSkinnedMesh===!0,morphTargets:B.morphAttributes.position!==void 0,morphNormals:B.morphAttributes.normal!==void 0,morphColors:B.morphAttributes.color!==void 0,morphTargetsCount:st,morphTextureStride:at,numDirLights:w.directional.length,numPointLights:w.point.length,numSpotLights:w.spot.length,numSpotLightMaps:w.spotLightMap.length,numRectAreaLights:w.rectArea.length,numHemiLights:w.hemi.length,numDirLightShadows:w.directionalShadowMap.length,numPointLightShadows:w.pointShadowMap.length,numSpotLightShadows:w.spotShadowMap.length,numSpotLightShadowsWithMaps:w.numSpotLightShadowsWithMaps,numLightProbes:w.numLightProbes,numClippingPlanes:a.numPlanes,numClipIntersection:a.numIntersection,dithering:M.dithering,shadowMapEnabled:r.shadowMap.enabled&&U.length>0,shadowMapType:r.shadowMap.type,toneMapping:se,useLegacyLights:r._useLegacyLights,decodeVideoTexture:Et&&M.map.isVideoTexture===!0&&te.getTransfer(M.map.colorSpace)===oe,premultipliedAlpha:M.premultipliedAlpha,doubleSided:M.side===ge,flipSided:M.side===Le,useDepthPacking:M.depthPacking>=0,depthPacking:M.depthPacking||0,index0AttributeName:M.index0AttributeName,extensionDerivatives:ft&&M.extensions.derivatives===!0,extensionFragDepth:ft&&M.extensions.fragDepth===!0,extensionDrawBuffers:ft&&M.extensions.drawBuffers===!0,extensionShaderTextureLOD:ft&&M.extensions.shaderTextureLOD===!0,extensionClipCullDistance:ft&&M.extensions.clipCullDistance&&n.has("WEBGL_clip_cull_distance"),rendererExtensionFragDepth:h||n.has("EXT_frag_depth"),rendererExtensionDrawBuffers:h||n.has("WEBGL_draw_buffers"),rendererExtensionShaderTextureLod:h||n.has("EXT_shader_texture_lod"),rendererExtensionParallelShaderCompile:n.has("KHR_parallel_shader_compile"),customProgramCacheKey:M.customProgramCacheKey()}}function p(M){const w=[];if(M.shaderID?w.push(M.shaderID):(w.push(M.customVertexShaderID),w.push(M.customFragmentShaderID)),M.defines!==void 0)for(const U in M.defines)w.push(U),w.push(M.defines[U]);return M.isRawShaderMaterial===!1&&(x(w,M),v(w,M),w.push(r.outputColorSpace)),w.push(M.customProgramCacheKey),w.join()}function x(M,w){M.push(w.precision),M.push(w.outputColorSpace),M.push(w.envMapMode),M.push(w.envMapCubeUVHeight),M.push(w.mapUv),M.push(w.alphaMapUv),M.push(w.lightMapUv),M.push(w.aoMapUv),M.push(w.bumpMapUv),M.push(w.normalMapUv),M.push(w.displacementMapUv),M.push(w.emissiveMapUv),M.push(w.metalnessMapUv),M.push(w.roughnessMapUv),M.push(w.anisotropyMapUv),M.push(w.clearcoatMapUv),M.push(w.clearcoatNormalMapUv),M.push(w.clearcoatRoughnessMapUv),M.push(w.iridescenceMapUv),M.push(w.iridescenceThicknessMapUv),M.push(w.sheenColorMapUv),M.push(w.sheenRoughnessMapUv),M.push(w.specularMapUv),M.push(w.specularColorMapUv),M.push(w.specularIntensityMapUv),M.push(w.transmissionMapUv),M.push(w.thicknessMapUv),M.push(w.combine),M.push(w.fogExp2),M.push(w.sizeAttenuation),M.push(w.morphTargetsCount),M.push(w.morphAttributeCount),M.push(w.numDirLights),M.push(w.numPointLights),M.push(w.numSpotLights),M.push(w.numSpotLightMaps),M.push(w.numHemiLights),M.push(w.numRectAreaLights),M.push(w.numDirLightShadows),M.push(w.numPointLightShadows),M.push(w.numSpotLightShadows),M.push(w.numSpotLightShadowsWithMaps),M.push(w.numLightProbes),M.push(w.shadowMapType),M.push(w.toneMapping),M.push(w.numClippingPlanes),M.push(w.numClipIntersection),M.push(w.depthPacking)}function v(M,w){o.disableAll(),w.isWebGL2&&o.enable(0),w.supportsVertexTextures&&o.enable(1),w.instancing&&o.enable(2),w.instancingColor&&o.enable(3),w.matcap&&o.enable(4),w.envMap&&o.enable(5),w.normalMapObjectSpace&&o.enable(6),w.normalMapTangentSpace&&o.enable(7),w.clearcoat&&o.enable(8),w.iridescence&&o.enable(9),w.alphaTest&&o.enable(10),w.vertexColors&&o.enable(11),w.vertexAlphas&&o.enable(12),w.vertexUv1s&&o.enable(13),w.vertexUv2s&&o.enable(14),w.vertexUv3s&&o.enable(15),w.vertexTangents&&o.enable(16),w.anisotropy&&o.enable(17),w.alphaHash&&o.enable(18),w.batching&&o.enable(19),M.push(o.mask),o.disableAll(),w.fog&&o.enable(0),w.useFog&&o.enable(1),w.flatShading&&o.enable(2),w.logarithmicDepthBuffer&&o.enable(3),w.skinning&&o.enable(4),w.morphTargets&&o.enable(5),w.morphNormals&&o.enable(6),w.morphColors&&o.enable(7),w.premultipliedAlpha&&o.enable(8),w.shadowMapEnabled&&o.enable(9),w.useLegacyLights&&o.enable(10),w.doubleSided&&o.enable(11),w.flipSided&&o.enable(12),w.useDepthPacking&&o.enable(13),w.dithering&&o.enable(14),w.transmission&&o.enable(15),w.sheen&&o.enable(16),w.opaque&&o.enable(17),w.pointsUvs&&o.enable(18),w.decodeVideoTexture&&o.enable(19),M.push(o.mask)}function y(M){const w=g[M.type];let U;if(w){const V=hn[w];U=_u.clone(V.uniforms)}else U=M.uniforms;return U}function P(M,w){let U;for(let V=0,J=c.length;V<J;V++){const L=c[V];if(L.cacheKey===w){U=L,++U.usedTimes;break}}return U===void 0&&(U=new Im(r,w,M,s),c.push(U)),U}function A(M){if(--M.usedTimes===0){const w=c.indexOf(M);c[w]=c[c.length-1],c.pop(),M.destroy()}}function R(M){l.remove(M)}function N(){l.dispose()}return{getParameters:m,getProgramCacheKey:p,getUniforms:y,acquireProgram:P,releaseProgram:A,releaseShaderCache:R,programs:c,dispose:N}}function Fm(){let r=new WeakMap;function t(s){let a=r.get(s);return a===void 0&&(a={},r.set(s,a)),a}function e(s){r.delete(s)}function n(s,a,o){r.get(s)[a]=o}function i(){r=new WeakMap}return{get:t,remove:e,update:n,dispose:i}}function Bm(r,t){return r.groupOrder!==t.groupOrder?r.groupOrder-t.groupOrder:r.renderOrder!==t.renderOrder?r.renderOrder-t.renderOrder:r.material.id!==t.material.id?r.material.id-t.material.id:r.z!==t.z?r.z-t.z:r.id-t.id}function al(r,t){return r.groupOrder!==t.groupOrder?r.groupOrder-t.groupOrder:r.renderOrder!==t.renderOrder?r.renderOrder-t.renderOrder:r.z!==t.z?t.z-r.z:r.id-t.id}function ll(){const r=[];let t=0;const e=[],n=[],i=[];function s(){t=0,e.length=0,n.length=0,i.length=0}function a(d,u,f,g,_,m){let p=r[t];return p===void 0?(p={id:d.id,object:d,geometry:u,material:f,groupOrder:g,renderOrder:d.renderOrder,z:_,group:m},r[t]=p):(p.id=d.id,p.object=d,p.geometry=u,p.material=f,p.groupOrder=g,p.renderOrder=d.renderOrder,p.z=_,p.group=m),t++,p}function o(d,u,f,g,_,m){const p=a(d,u,f,g,_,m);f.transmission>0?n.push(p):f.transparent===!0?i.push(p):e.push(p)}function l(d,u,f,g,_,m){const p=a(d,u,f,g,_,m);f.transmission>0?n.unshift(p):f.transparent===!0?i.unshift(p):e.unshift(p)}function c(d,u){e.length>1&&e.sort(d||Bm),n.length>1&&n.sort(u||al),i.length>1&&i.sort(u||al)}function h(){for(let d=t,u=r.length;d<u;d++){const f=r[d];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:e,transmissive:n,transparent:i,init:s,push:o,unshift:l,finish:h,sort:c}}function zm(){let r=new WeakMap;function t(n,i){const s=r.get(n);let a;return s===void 0?(a=new ll,r.set(n,[a])):i>=s.length?(a=new ll,s.push(a)):a=s[i],a}function e(){r=new WeakMap}return{get:t,dispose:e}}function km(){const r={};return{get:function(t){if(r[t.id]!==void 0)return r[t.id];let e;switch(t.type){case"DirectionalLight":e={direction:new b,color:new wt};break;case"SpotLight":e={position:new b,direction:new b,color:new wt,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new b,color:new wt,distance:0,decay:0};break;case"HemisphereLight":e={direction:new b,skyColor:new wt,groundColor:new wt};break;case"RectAreaLight":e={color:new wt,position:new b,halfWidth:new b,halfHeight:new b};break}return r[t.id]=e,e}}}function Gm(){const r={};return{get:function(t){if(r[t.id]!==void 0)return r[t.id];let e;switch(t.type){case"DirectionalLight":e={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ot};break;case"SpotLight":e={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ot};break;case"PointLight":e={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new ot,shadowCameraNear:1,shadowCameraFar:1e3};break}return r[t.id]=e,e}}}let Vm=0;function Hm(r,t){return(t.castShadow?2:0)-(r.castShadow?2:0)+(t.map?1:0)-(r.map?1:0)}function Wm(r,t){const e=new km,n=Gm(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let h=0;h<9;h++)i.probe.push(new b);const s=new b,a=new ne,o=new ne;function l(h,d){let u=0,f=0,g=0;for(let V=0;V<9;V++)i.probe[V].set(0,0,0);let _=0,m=0,p=0,x=0,v=0,y=0,P=0,A=0,R=0,N=0,M=0;h.sort(Hm);const w=d===!0?Math.PI:1;for(let V=0,J=h.length;V<J;V++){const L=h[V],B=L.color,k=L.intensity,j=L.distance,q=L.shadow&&L.shadow.map?L.shadow.map.texture:null;if(L.isAmbientLight)u+=B.r*k*w,f+=B.g*k*w,g+=B.b*k*w;else if(L.isLightProbe){for(let $=0;$<9;$++)i.probe[$].addScaledVector(L.sh.coefficients[$],k);M++}else if(L.isDirectionalLight){const $=e.get(L);if($.color.copy(L.color).multiplyScalar(L.intensity*w),L.castShadow){const Z=L.shadow,st=n.get(L);st.shadowBias=Z.bias,st.shadowNormalBias=Z.normalBias,st.shadowRadius=Z.radius,st.shadowMapSize=Z.mapSize,i.directionalShadow[_]=st,i.directionalShadowMap[_]=q,i.directionalShadowMatrix[_]=L.shadow.matrix,y++}i.directional[_]=$,_++}else if(L.isSpotLight){const $=e.get(L);$.position.setFromMatrixPosition(L.matrixWorld),$.color.copy(B).multiplyScalar(k*w),$.distance=j,$.coneCos=Math.cos(L.angle),$.penumbraCos=Math.cos(L.angle*(1-L.penumbra)),$.decay=L.decay,i.spot[p]=$;const Z=L.shadow;if(L.map&&(i.spotLightMap[R]=L.map,R++,Z.updateMatrices(L),L.castShadow&&N++),i.spotLightMatrix[p]=Z.matrix,L.castShadow){const st=n.get(L);st.shadowBias=Z.bias,st.shadowNormalBias=Z.normalBias,st.shadowRadius=Z.radius,st.shadowMapSize=Z.mapSize,i.spotShadow[p]=st,i.spotShadowMap[p]=q,A++}p++}else if(L.isRectAreaLight){const $=e.get(L);$.color.copy(B).multiplyScalar(k),$.halfWidth.set(L.width*.5,0,0),$.halfHeight.set(0,L.height*.5,0),i.rectArea[x]=$,x++}else if(L.isPointLight){const $=e.get(L);if($.color.copy(L.color).multiplyScalar(L.intensity*w),$.distance=L.distance,$.decay=L.decay,L.castShadow){const Z=L.shadow,st=n.get(L);st.shadowBias=Z.bias,st.shadowNormalBias=Z.normalBias,st.shadowRadius=Z.radius,st.shadowMapSize=Z.mapSize,st.shadowCameraNear=Z.camera.near,st.shadowCameraFar=Z.camera.far,i.pointShadow[m]=st,i.pointShadowMap[m]=q,i.pointShadowMatrix[m]=L.shadow.matrix,P++}i.point[m]=$,m++}else if(L.isHemisphereLight){const $=e.get(L);$.skyColor.copy(L.color).multiplyScalar(k*w),$.groundColor.copy(L.groundColor).multiplyScalar(k*w),i.hemi[v]=$,v++}}x>0&&(t.isWebGL2?r.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=ht.LTC_FLOAT_1,i.rectAreaLTC2=ht.LTC_FLOAT_2):(i.rectAreaLTC1=ht.LTC_HALF_1,i.rectAreaLTC2=ht.LTC_HALF_2):r.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=ht.LTC_FLOAT_1,i.rectAreaLTC2=ht.LTC_FLOAT_2):r.has("OES_texture_half_float_linear")===!0?(i.rectAreaLTC1=ht.LTC_HALF_1,i.rectAreaLTC2=ht.LTC_HALF_2):console.error("THREE.WebGLRenderer: Unable to use RectAreaLight. Missing WebGL extensions.")),i.ambient[0]=u,i.ambient[1]=f,i.ambient[2]=g;const U=i.hash;(U.directionalLength!==_||U.pointLength!==m||U.spotLength!==p||U.rectAreaLength!==x||U.hemiLength!==v||U.numDirectionalShadows!==y||U.numPointShadows!==P||U.numSpotShadows!==A||U.numSpotMaps!==R||U.numLightProbes!==M)&&(i.directional.length=_,i.spot.length=p,i.rectArea.length=x,i.point.length=m,i.hemi.length=v,i.directionalShadow.length=y,i.directionalShadowMap.length=y,i.pointShadow.length=P,i.pointShadowMap.length=P,i.spotShadow.length=A,i.spotShadowMap.length=A,i.directionalShadowMatrix.length=y,i.pointShadowMatrix.length=P,i.spotLightMatrix.length=A+R-N,i.spotLightMap.length=R,i.numSpotLightShadowsWithMaps=N,i.numLightProbes=M,U.directionalLength=_,U.pointLength=m,U.spotLength=p,U.rectAreaLength=x,U.hemiLength=v,U.numDirectionalShadows=y,U.numPointShadows=P,U.numSpotShadows=A,U.numSpotMaps=R,U.numLightProbes=M,i.version=Vm++)}function c(h,d){let u=0,f=0,g=0,_=0,m=0;const p=d.matrixWorldInverse;for(let x=0,v=h.length;x<v;x++){const y=h[x];if(y.isDirectionalLight){const P=i.directional[u];P.direction.setFromMatrixPosition(y.matrixWorld),s.setFromMatrixPosition(y.target.matrixWorld),P.direction.sub(s),P.direction.transformDirection(p),u++}else if(y.isSpotLight){const P=i.spot[g];P.position.setFromMatrixPosition(y.matrixWorld),P.position.applyMatrix4(p),P.direction.setFromMatrixPosition(y.matrixWorld),s.setFromMatrixPosition(y.target.matrixWorld),P.direction.sub(s),P.direction.transformDirection(p),g++}else if(y.isRectAreaLight){const P=i.rectArea[_];P.position.setFromMatrixPosition(y.matrixWorld),P.position.applyMatrix4(p),o.identity(),a.copy(y.matrixWorld),a.premultiply(p),o.extractRotation(a),P.halfWidth.set(y.width*.5,0,0),P.halfHeight.set(0,y.height*.5,0),P.halfWidth.applyMatrix4(o),P.halfHeight.applyMatrix4(o),_++}else if(y.isPointLight){const P=i.point[f];P.position.setFromMatrixPosition(y.matrixWorld),P.position.applyMatrix4(p),f++}else if(y.isHemisphereLight){const P=i.hemi[m];P.direction.setFromMatrixPosition(y.matrixWorld),P.direction.transformDirection(p),m++}}}return{setup:l,setupView:c,state:i}}function cl(r,t){const e=new Wm(r,t),n=[],i=[];function s(){n.length=0,i.length=0}function a(d){n.push(d)}function o(d){i.push(d)}function l(d){e.setup(n,d)}function c(d){e.setupView(n,d)}return{init:s,state:{lightsArray:n,shadowsArray:i,lights:e},setupLights:l,setupLightsView:c,pushLight:a,pushShadow:o}}function Xm(r,t){let e=new WeakMap;function n(s,a=0){const o=e.get(s);let l;return o===void 0?(l=new cl(r,t),e.set(s,[l])):a>=o.length?(l=new cl(r,t),o.push(l)):l=o[a],l}function i(){e=new WeakMap}return{get:n,dispose:i}}class Ym extends un{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Ph,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class qm extends un{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}const Km=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,jm=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function $m(r,t,e){let n=new wo;const i=new ot,s=new ot,a=new we,o=new Ym({depthPacking:Ch}),l=new qm,c={},h=e.maxTextureSize,d={[bn]:Le,[Le]:bn,[ge]:ge},u=new ii({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new ot},radius:{value:4}},vertexShader:Km,fragmentShader:jm}),f=u.clone();f.defines.HORIZONTAL_PASS=1;const g=new _e;g.setAttribute("position",new tn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const _=new X(g,u),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Gl;let p=this.type;this.render=function(A,R,N){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||A.length===0)return;const M=r.getRenderTarget(),w=r.getActiveCubeFace(),U=r.getActiveMipmapLevel(),V=r.state;V.setBlending(Fn),V.buffers.color.setClear(1,1,1,1),V.buffers.depth.setTest(!0),V.setScissorTest(!1);const J=p!==En&&this.type===En,L=p===En&&this.type!==En;for(let B=0,k=A.length;B<k;B++){const j=A[B],q=j.shadow;if(q===void 0){console.warn("THREE.WebGLShadowMap:",j,"has no shadow.");continue}if(q.autoUpdate===!1&&q.needsUpdate===!1)continue;i.copy(q.mapSize);const $=q.getFrameExtents();if(i.multiply($),s.copy(q.mapSize),(i.x>h||i.y>h)&&(i.x>h&&(s.x=Math.floor(h/$.x),i.x=s.x*$.x,q.mapSize.x=s.x),i.y>h&&(s.y=Math.floor(h/$.y),i.y=s.y*$.y,q.mapSize.y=s.y)),q.map===null||J===!0||L===!0){const st=this.type!==En?{minFilter:Ce,magFilter:Ce}:{};q.map!==null&&q.map.dispose(),q.map=new ei(i.x,i.y,st),q.map.texture.name=j.name+".shadowMap",q.camera.updateProjectionMatrix()}r.setRenderTarget(q.map),r.clear();const Z=q.getViewportCount();for(let st=0;st<Z;st++){const at=q.getViewport(st);a.set(s.x*at.x,s.y*at.y,s.x*at.z,s.y*at.w),V.viewport(a),q.updateMatrices(j,st),n=q.getFrustum(),y(R,N,q.camera,j,this.type)}q.isPointLightShadow!==!0&&this.type===En&&x(q,N),q.needsUpdate=!1}p=this.type,m.needsUpdate=!1,r.setRenderTarget(M,w,U)};function x(A,R){const N=t.update(_);u.defines.VSM_SAMPLES!==A.blurSamples&&(u.defines.VSM_SAMPLES=A.blurSamples,f.defines.VSM_SAMPLES=A.blurSamples,u.needsUpdate=!0,f.needsUpdate=!0),A.mapPass===null&&(A.mapPass=new ei(i.x,i.y)),u.uniforms.shadow_pass.value=A.map.texture,u.uniforms.resolution.value=A.mapSize,u.uniforms.radius.value=A.radius,r.setRenderTarget(A.mapPass),r.clear(),r.renderBufferDirect(R,null,N,u,_,null),f.uniforms.shadow_pass.value=A.mapPass.texture,f.uniforms.resolution.value=A.mapSize,f.uniforms.radius.value=A.radius,r.setRenderTarget(A.map),r.clear(),r.renderBufferDirect(R,null,N,f,_,null)}function v(A,R,N,M){let w=null;const U=N.isPointLight===!0?A.customDistanceMaterial:A.customDepthMaterial;if(U!==void 0)w=U;else if(w=N.isPointLight===!0?l:o,r.localClippingEnabled&&R.clipShadows===!0&&Array.isArray(R.clippingPlanes)&&R.clippingPlanes.length!==0||R.displacementMap&&R.displacementScale!==0||R.alphaMap&&R.alphaTest>0||R.map&&R.alphaTest>0){const V=w.uuid,J=R.uuid;let L=c[V];L===void 0&&(L={},c[V]=L);let B=L[J];B===void 0&&(B=w.clone(),L[J]=B,R.addEventListener("dispose",P)),w=B}if(w.visible=R.visible,w.wireframe=R.wireframe,M===En?w.side=R.shadowSide!==null?R.shadowSide:R.side:w.side=R.shadowSide!==null?R.shadowSide:d[R.side],w.alphaMap=R.alphaMap,w.alphaTest=R.alphaTest,w.map=R.map,w.clipShadows=R.clipShadows,w.clippingPlanes=R.clippingPlanes,w.clipIntersection=R.clipIntersection,w.displacementMap=R.displacementMap,w.displacementScale=R.displacementScale,w.displacementBias=R.displacementBias,w.wireframeLinewidth=R.wireframeLinewidth,w.linewidth=R.linewidth,N.isPointLight===!0&&w.isMeshDistanceMaterial===!0){const V=r.properties.get(w);V.light=N}return w}function y(A,R,N,M,w){if(A.visible===!1)return;if(A.layers.test(R.layers)&&(A.isMesh||A.isLine||A.isPoints)&&(A.castShadow||A.receiveShadow&&w===En)&&(!A.frustumCulled||n.intersectsObject(A))){A.modelViewMatrix.multiplyMatrices(N.matrixWorldInverse,A.matrixWorld);const J=t.update(A),L=A.material;if(Array.isArray(L)){const B=J.groups;for(let k=0,j=B.length;k<j;k++){const q=B[k],$=L[q.materialIndex];if($&&$.visible){const Z=v(A,$,M,w);A.onBeforeShadow(r,A,R,N,J,Z,q),r.renderBufferDirect(N,null,J,Z,A,q),A.onAfterShadow(r,A,R,N,J,Z,q)}}}else if(L.visible){const B=v(A,L,M,w);A.onBeforeShadow(r,A,R,N,J,B,null),r.renderBufferDirect(N,null,J,B,A,null),A.onAfterShadow(r,A,R,N,J,B,null)}}const V=A.children;for(let J=0,L=V.length;J<L;J++)y(V[J],R,N,M,w)}function P(A){A.target.removeEventListener("dispose",P);for(const N in c){const M=c[N],w=A.target.uuid;w in M&&(M[w].dispose(),delete M[w])}}}function Zm(r,t,e){const n=e.isWebGL2;function i(){let I=!1;const dt=new we;let ft=null;const It=new we(0,0,0,0);return{setMask:function(Pt){ft!==Pt&&!I&&(r.colorMask(Pt,Pt,Pt,Pt),ft=Pt)},setLocked:function(Pt){I=Pt},setClear:function(Pt,ie,se,Me,Ie){Ie===!0&&(Pt*=Me,ie*=Me,se*=Me),dt.set(Pt,ie,se,Me),It.equals(dt)===!1&&(r.clearColor(Pt,ie,se,Me),It.copy(dt))},reset:function(){I=!1,ft=null,It.set(-1,0,0,0)}}}function s(){let I=!1,dt=null,ft=null,It=null;return{setTest:function(Pt){Pt?Ut(r.DEPTH_TEST):Et(r.DEPTH_TEST)},setMask:function(Pt){dt!==Pt&&!I&&(r.depthMask(Pt),dt=Pt)},setFunc:function(Pt){if(ft!==Pt){switch(Pt){case oh:r.depthFunc(r.NEVER);break;case ah:r.depthFunc(r.ALWAYS);break;case lh:r.depthFunc(r.LESS);break;case Qs:r.depthFunc(r.LEQUAL);break;case ch:r.depthFunc(r.EQUAL);break;case hh:r.depthFunc(r.GEQUAL);break;case uh:r.depthFunc(r.GREATER);break;case dh:r.depthFunc(r.NOTEQUAL);break;default:r.depthFunc(r.LEQUAL)}ft=Pt}},setLocked:function(Pt){I=Pt},setClear:function(Pt){It!==Pt&&(r.clearDepth(Pt),It=Pt)},reset:function(){I=!1,dt=null,ft=null,It=null}}}function a(){let I=!1,dt=null,ft=null,It=null,Pt=null,ie=null,se=null,Me=null,Ie=null;return{setTest:function(re){I||(re?Ut(r.STENCIL_TEST):Et(r.STENCIL_TEST))},setMask:function(re){dt!==re&&!I&&(r.stencilMask(re),dt=re)},setFunc:function(re,De,ln){(ft!==re||It!==De||Pt!==ln)&&(r.stencilFunc(re,De,ln),ft=re,It=De,Pt=ln)},setOp:function(re,De,ln){(ie!==re||se!==De||Me!==ln)&&(r.stencilOp(re,De,ln),ie=re,se=De,Me=ln)},setLocked:function(re){I=re},setClear:function(re){Ie!==re&&(r.clearStencil(re),Ie=re)},reset:function(){I=!1,dt=null,ft=null,It=null,Pt=null,ie=null,se=null,Me=null,Ie=null}}}const o=new i,l=new s,c=new a,h=new WeakMap,d=new WeakMap;let u={},f={},g=new WeakMap,_=[],m=null,p=!1,x=null,v=null,y=null,P=null,A=null,R=null,N=null,M=new wt(0,0,0),w=0,U=!1,V=null,J=null,L=null,B=null,k=null;const j=r.getParameter(r.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let q=!1,$=0;const Z=r.getParameter(r.VERSION);Z.indexOf("WebGL")!==-1?($=parseFloat(/^WebGL (\d)/.exec(Z)[1]),q=$>=1):Z.indexOf("OpenGL ES")!==-1&&($=parseFloat(/^OpenGL ES (\d)/.exec(Z)[1]),q=$>=2);let st=null,at={};const W=r.getParameter(r.SCISSOR_BOX),tt=r.getParameter(r.VIEWPORT),pt=new we().fromArray(W),Mt=new we().fromArray(tt);function _t(I,dt,ft,It){const Pt=new Uint8Array(4),ie=r.createTexture();r.bindTexture(I,ie),r.texParameteri(I,r.TEXTURE_MIN_FILTER,r.NEAREST),r.texParameteri(I,r.TEXTURE_MAG_FILTER,r.NEAREST);for(let se=0;se<ft;se++)n&&(I===r.TEXTURE_3D||I===r.TEXTURE_2D_ARRAY)?r.texImage3D(dt,0,r.RGBA,1,1,It,0,r.RGBA,r.UNSIGNED_BYTE,Pt):r.texImage2D(dt+se,0,r.RGBA,1,1,0,r.RGBA,r.UNSIGNED_BYTE,Pt);return ie}const Lt={};Lt[r.TEXTURE_2D]=_t(r.TEXTURE_2D,r.TEXTURE_2D,1),Lt[r.TEXTURE_CUBE_MAP]=_t(r.TEXTURE_CUBE_MAP,r.TEXTURE_CUBE_MAP_POSITIVE_X,6),n&&(Lt[r.TEXTURE_2D_ARRAY]=_t(r.TEXTURE_2D_ARRAY,r.TEXTURE_2D_ARRAY,1,1),Lt[r.TEXTURE_3D]=_t(r.TEXTURE_3D,r.TEXTURE_3D,1,1)),o.setClear(0,0,0,1),l.setClear(1),c.setClear(0),Ut(r.DEPTH_TEST),l.setFunc(Qs),mt(!1),E(Wo),Ut(r.CULL_FACE),Y(Fn);function Ut(I){u[I]!==!0&&(r.enable(I),u[I]=!0)}function Et(I){u[I]!==!1&&(r.disable(I),u[I]=!1)}function Nt(I,dt){return f[I]!==dt?(r.bindFramebuffer(I,dt),f[I]=dt,n&&(I===r.DRAW_FRAMEBUFFER&&(f[r.FRAMEBUFFER]=dt),I===r.FRAMEBUFFER&&(f[r.DRAW_FRAMEBUFFER]=dt)),!0):!1}function C(I,dt){let ft=_,It=!1;if(I)if(ft=g.get(dt),ft===void 0&&(ft=[],g.set(dt,ft)),I.isWebGLMultipleRenderTargets){const Pt=I.texture;if(ft.length!==Pt.length||ft[0]!==r.COLOR_ATTACHMENT0){for(let ie=0,se=Pt.length;ie<se;ie++)ft[ie]=r.COLOR_ATTACHMENT0+ie;ft.length=Pt.length,It=!0}}else ft[0]!==r.COLOR_ATTACHMENT0&&(ft[0]=r.COLOR_ATTACHMENT0,It=!0);else ft[0]!==r.BACK&&(ft[0]=r.BACK,It=!0);It&&(e.isWebGL2?r.drawBuffers(ft):t.get("WEBGL_draw_buffers").drawBuffersWEBGL(ft))}function lt(I){return m!==I?(r.useProgram(I),m=I,!0):!1}const K={[jn]:r.FUNC_ADD,[Xc]:r.FUNC_SUBTRACT,[Yc]:r.FUNC_REVERSE_SUBTRACT};if(n)K[Ko]=r.MIN,K[jo]=r.MAX;else{const I=t.get("EXT_blend_minmax");I!==null&&(K[Ko]=I.MIN_EXT,K[jo]=I.MAX_EXT)}const rt={[qc]:r.ZERO,[Kc]:r.ONE,[jc]:r.SRC_COLOR,[eo]:r.SRC_ALPHA,[eh]:r.SRC_ALPHA_SATURATE,[Qc]:r.DST_COLOR,[Zc]:r.DST_ALPHA,[$c]:r.ONE_MINUS_SRC_COLOR,[no]:r.ONE_MINUS_SRC_ALPHA,[th]:r.ONE_MINUS_DST_COLOR,[Jc]:r.ONE_MINUS_DST_ALPHA,[nh]:r.CONSTANT_COLOR,[ih]:r.ONE_MINUS_CONSTANT_COLOR,[sh]:r.CONSTANT_ALPHA,[rh]:r.ONE_MINUS_CONSTANT_ALPHA};function Y(I,dt,ft,It,Pt,ie,se,Me,Ie,re){if(I===Fn){p===!0&&(Et(r.BLEND),p=!1);return}if(p===!1&&(Ut(r.BLEND),p=!0),I!==Wc){if(I!==x||re!==U){if((v!==jn||A!==jn)&&(r.blendEquation(r.FUNC_ADD),v=jn,A=jn),re)switch(I){case Ii:r.blendFuncSeparate(r.ONE,r.ONE_MINUS_SRC_ALPHA,r.ONE,r.ONE_MINUS_SRC_ALPHA);break;case Xo:r.blendFunc(r.ONE,r.ONE);break;case Yo:r.blendFuncSeparate(r.ZERO,r.ONE_MINUS_SRC_COLOR,r.ZERO,r.ONE);break;case qo:r.blendFuncSeparate(r.ZERO,r.SRC_COLOR,r.ZERO,r.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",I);break}else switch(I){case Ii:r.blendFuncSeparate(r.SRC_ALPHA,r.ONE_MINUS_SRC_ALPHA,r.ONE,r.ONE_MINUS_SRC_ALPHA);break;case Xo:r.blendFunc(r.SRC_ALPHA,r.ONE);break;case Yo:r.blendFuncSeparate(r.ZERO,r.ONE_MINUS_SRC_COLOR,r.ZERO,r.ONE);break;case qo:r.blendFunc(r.ZERO,r.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",I);break}y=null,P=null,R=null,N=null,M.set(0,0,0),w=0,x=I,U=re}return}Pt=Pt||dt,ie=ie||ft,se=se||It,(dt!==v||Pt!==A)&&(r.blendEquationSeparate(K[dt],K[Pt]),v=dt,A=Pt),(ft!==y||It!==P||ie!==R||se!==N)&&(r.blendFuncSeparate(rt[ft],rt[It],rt[ie],rt[se]),y=ft,P=It,R=ie,N=se),(Me.equals(M)===!1||Ie!==w)&&(r.blendColor(Me.r,Me.g,Me.b,Ie),M.copy(Me),w=Ie),x=I,U=!1}function Tt(I,dt){I.side===ge?Et(r.CULL_FACE):Ut(r.CULL_FACE);let ft=I.side===Le;dt&&(ft=!ft),mt(ft),I.blending===Ii&&I.transparent===!1?Y(Fn):Y(I.blending,I.blendEquation,I.blendSrc,I.blendDst,I.blendEquationAlpha,I.blendSrcAlpha,I.blendDstAlpha,I.blendColor,I.blendAlpha,I.premultipliedAlpha),l.setFunc(I.depthFunc),l.setTest(I.depthTest),l.setMask(I.depthWrite),o.setMask(I.colorWrite);const It=I.stencilWrite;c.setTest(It),It&&(c.setMask(I.stencilWriteMask),c.setFunc(I.stencilFunc,I.stencilRef,I.stencilFuncMask),c.setOp(I.stencilFail,I.stencilZFail,I.stencilZPass)),F(I.polygonOffset,I.polygonOffsetFactor,I.polygonOffsetUnits),I.alphaToCoverage===!0?Ut(r.SAMPLE_ALPHA_TO_COVERAGE):Et(r.SAMPLE_ALPHA_TO_COVERAGE)}function mt(I){V!==I&&(I?r.frontFace(r.CW):r.frontFace(r.CCW),V=I)}function E(I){I!==kc?(Ut(r.CULL_FACE),I!==J&&(I===Wo?r.cullFace(r.BACK):I===Gc?r.cullFace(r.FRONT):r.cullFace(r.FRONT_AND_BACK))):Et(r.CULL_FACE),J=I}function S(I){I!==L&&(q&&r.lineWidth(I),L=I)}function F(I,dt,ft){I?(Ut(r.POLYGON_OFFSET_FILL),(B!==dt||k!==ft)&&(r.polygonOffset(dt,ft),B=dt,k=ft)):Et(r.POLYGON_OFFSET_FILL)}function it(I){I?Ut(r.SCISSOR_TEST):Et(r.SCISSOR_TEST)}function et(I){I===void 0&&(I=r.TEXTURE0+j-1),st!==I&&(r.activeTexture(I),st=I)}function Q(I,dt,ft){ft===void 0&&(st===null?ft=r.TEXTURE0+j-1:ft=st);let It=at[ft];It===void 0&&(It={type:void 0,texture:void 0},at[ft]=It),(It.type!==I||It.texture!==dt)&&(st!==ft&&(r.activeTexture(ft),st=ft),r.bindTexture(I,dt||Lt[I]),It.type=I,It.texture=dt)}function yt(){const I=at[st];I!==void 0&&I.type!==void 0&&(r.bindTexture(I.type,null),I.type=void 0,I.texture=void 0)}function ut(){try{r.compressedTexImage2D.apply(r,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function vt(){try{r.compressedTexImage3D.apply(r,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Rt(){try{r.texSubImage2D.apply(r,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Bt(){try{r.texSubImage3D.apply(r,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function nt(){try{r.compressedTexSubImage2D.apply(r,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function jt(){try{r.compressedTexSubImage3D.apply(r,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Yt(){try{r.texStorage2D.apply(r,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function Ot(){try{r.texStorage3D.apply(r,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function bt(){try{r.texImage2D.apply(r,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function xt(){try{r.texImage3D.apply(r,arguments)}catch(I){console.error("THREE.WebGLState:",I)}}function kt(I){pt.equals(I)===!1&&(r.scissor(I.x,I.y,I.z,I.w),pt.copy(I))}function $t(I){Mt.equals(I)===!1&&(r.viewport(I.x,I.y,I.z,I.w),Mt.copy(I))}function ue(I,dt){let ft=d.get(dt);ft===void 0&&(ft=new WeakMap,d.set(dt,ft));let It=ft.get(I);It===void 0&&(It=r.getUniformBlockIndex(dt,I.name),ft.set(I,It))}function Ht(I,dt){const It=d.get(dt).get(I);h.get(dt)!==It&&(r.uniformBlockBinding(dt,It,I.__bindingPointIndex),h.set(dt,It))}function ct(){r.disable(r.BLEND),r.disable(r.CULL_FACE),r.disable(r.DEPTH_TEST),r.disable(r.POLYGON_OFFSET_FILL),r.disable(r.SCISSOR_TEST),r.disable(r.STENCIL_TEST),r.disable(r.SAMPLE_ALPHA_TO_COVERAGE),r.blendEquation(r.FUNC_ADD),r.blendFunc(r.ONE,r.ZERO),r.blendFuncSeparate(r.ONE,r.ZERO,r.ONE,r.ZERO),r.blendColor(0,0,0,0),r.colorMask(!0,!0,!0,!0),r.clearColor(0,0,0,0),r.depthMask(!0),r.depthFunc(r.LESS),r.clearDepth(1),r.stencilMask(4294967295),r.stencilFunc(r.ALWAYS,0,4294967295),r.stencilOp(r.KEEP,r.KEEP,r.KEEP),r.clearStencil(0),r.cullFace(r.BACK),r.frontFace(r.CCW),r.polygonOffset(0,0),r.activeTexture(r.TEXTURE0),r.bindFramebuffer(r.FRAMEBUFFER,null),n===!0&&(r.bindFramebuffer(r.DRAW_FRAMEBUFFER,null),r.bindFramebuffer(r.READ_FRAMEBUFFER,null)),r.useProgram(null),r.lineWidth(1),r.scissor(0,0,r.canvas.width,r.canvas.height),r.viewport(0,0,r.canvas.width,r.canvas.height),u={},st=null,at={},f={},g=new WeakMap,_=[],m=null,p=!1,x=null,v=null,y=null,P=null,A=null,R=null,N=null,M=new wt(0,0,0),w=0,U=!1,V=null,J=null,L=null,B=null,k=null,pt.set(0,0,r.canvas.width,r.canvas.height),Mt.set(0,0,r.canvas.width,r.canvas.height),o.reset(),l.reset(),c.reset()}return{buffers:{color:o,depth:l,stencil:c},enable:Ut,disable:Et,bindFramebuffer:Nt,drawBuffers:C,useProgram:lt,setBlending:Y,setMaterial:Tt,setFlipSided:mt,setCullFace:E,setLineWidth:S,setPolygonOffset:F,setScissorTest:it,activeTexture:et,bindTexture:Q,unbindTexture:yt,compressedTexImage2D:ut,compressedTexImage3D:vt,texImage2D:bt,texImage3D:xt,updateUBOMapping:ue,uniformBlockBinding:Ht,texStorage2D:Yt,texStorage3D:Ot,texSubImage2D:Rt,texSubImage3D:Bt,compressedTexSubImage2D:nt,compressedTexSubImage3D:jt,scissor:kt,viewport:$t,reset:ct}}function Jm(r,t,e,n,i,s,a){const o=i.isWebGL2,l=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),h=new WeakMap;let d;const u=new WeakMap;let f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(E,S){return f?new OffscreenCanvas(E,S):ls("canvas")}function _(E,S,F,it){let et=1;if((E.width>it||E.height>it)&&(et=it/Math.max(E.width,E.height)),et<1||S===!0)if(typeof HTMLImageElement<"u"&&E instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&E instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&E instanceof ImageBitmap){const Q=S?sr:Math.floor,yt=Q(et*E.width),ut=Q(et*E.height);d===void 0&&(d=g(yt,ut));const vt=F?g(yt,ut):d;return vt.width=yt,vt.height=ut,vt.getContext("2d").drawImage(E,0,0,yt,ut),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+E.width+"x"+E.height+") to ("+yt+"x"+ut+")."),vt}else return"data"in E&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+E.width+"x"+E.height+")."),E;return E}function m(E){return lo(E.width)&&lo(E.height)}function p(E){return o?!1:E.wrapS!==on||E.wrapT!==on||E.minFilter!==Ce&&E.minFilter!==je}function x(E,S){return E.generateMipmaps&&S&&E.minFilter!==Ce&&E.minFilter!==je}function v(E){r.generateMipmap(E)}function y(E,S,F,it,et=!1){if(o===!1)return S;if(E!==null){if(r[E]!==void 0)return r[E];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+E+"'")}let Q=S;if(S===r.RED&&(F===r.FLOAT&&(Q=r.R32F),F===r.HALF_FLOAT&&(Q=r.R16F),F===r.UNSIGNED_BYTE&&(Q=r.R8)),S===r.RED_INTEGER&&(F===r.UNSIGNED_BYTE&&(Q=r.R8UI),F===r.UNSIGNED_SHORT&&(Q=r.R16UI),F===r.UNSIGNED_INT&&(Q=r.R32UI),F===r.BYTE&&(Q=r.R8I),F===r.SHORT&&(Q=r.R16I),F===r.INT&&(Q=r.R32I)),S===r.RG&&(F===r.FLOAT&&(Q=r.RG32F),F===r.HALF_FLOAT&&(Q=r.RG16F),F===r.UNSIGNED_BYTE&&(Q=r.RG8)),S===r.RGBA){const yt=et?tr:te.getTransfer(it);F===r.FLOAT&&(Q=r.RGBA32F),F===r.HALF_FLOAT&&(Q=r.RGBA16F),F===r.UNSIGNED_BYTE&&(Q=yt===oe?r.SRGB8_ALPHA8:r.RGBA8),F===r.UNSIGNED_SHORT_4_4_4_4&&(Q=r.RGBA4),F===r.UNSIGNED_SHORT_5_5_5_1&&(Q=r.RGB5_A1)}return(Q===r.R16F||Q===r.R32F||Q===r.RG16F||Q===r.RG32F||Q===r.RGBA16F||Q===r.RGBA32F)&&t.get("EXT_color_buffer_float"),Q}function P(E,S,F){return x(E,F)===!0||E.isFramebufferTexture&&E.minFilter!==Ce&&E.minFilter!==je?Math.log2(Math.max(S.width,S.height))+1:E.mipmaps!==void 0&&E.mipmaps.length>0?E.mipmaps.length:E.isCompressedTexture&&Array.isArray(E.image)?S.mipmaps.length:1}function A(E){return E===Ce||E===$o||E===$s?r.NEAREST:r.LINEAR}function R(E){const S=E.target;S.removeEventListener("dispose",R),M(S),S.isVideoTexture&&h.delete(S)}function N(E){const S=E.target;S.removeEventListener("dispose",N),U(S)}function M(E){const S=n.get(E);if(S.__webglInit===void 0)return;const F=E.source,it=u.get(F);if(it){const et=it[S.__cacheKey];et.usedTimes--,et.usedTimes===0&&w(E),Object.keys(it).length===0&&u.delete(F)}n.remove(E)}function w(E){const S=n.get(E);r.deleteTexture(S.__webglTexture);const F=E.source,it=u.get(F);delete it[S.__cacheKey],a.memory.textures--}function U(E){const S=E.texture,F=n.get(E),it=n.get(S);if(it.__webglTexture!==void 0&&(r.deleteTexture(it.__webglTexture),a.memory.textures--),E.depthTexture&&E.depthTexture.dispose(),E.isWebGLCubeRenderTarget)for(let et=0;et<6;et++){if(Array.isArray(F.__webglFramebuffer[et]))for(let Q=0;Q<F.__webglFramebuffer[et].length;Q++)r.deleteFramebuffer(F.__webglFramebuffer[et][Q]);else r.deleteFramebuffer(F.__webglFramebuffer[et]);F.__webglDepthbuffer&&r.deleteRenderbuffer(F.__webglDepthbuffer[et])}else{if(Array.isArray(F.__webglFramebuffer))for(let et=0;et<F.__webglFramebuffer.length;et++)r.deleteFramebuffer(F.__webglFramebuffer[et]);else r.deleteFramebuffer(F.__webglFramebuffer);if(F.__webglDepthbuffer&&r.deleteRenderbuffer(F.__webglDepthbuffer),F.__webglMultisampledFramebuffer&&r.deleteFramebuffer(F.__webglMultisampledFramebuffer),F.__webglColorRenderbuffer)for(let et=0;et<F.__webglColorRenderbuffer.length;et++)F.__webglColorRenderbuffer[et]&&r.deleteRenderbuffer(F.__webglColorRenderbuffer[et]);F.__webglDepthRenderbuffer&&r.deleteRenderbuffer(F.__webglDepthRenderbuffer)}if(E.isWebGLMultipleRenderTargets)for(let et=0,Q=S.length;et<Q;et++){const yt=n.get(S[et]);yt.__webglTexture&&(r.deleteTexture(yt.__webglTexture),a.memory.textures--),n.remove(S[et])}n.remove(S),n.remove(E)}let V=0;function J(){V=0}function L(){const E=V;return E>=i.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+E+" texture units while this GPU supports only "+i.maxTextures),V+=1,E}function B(E){const S=[];return S.push(E.wrapS),S.push(E.wrapT),S.push(E.wrapR||0),S.push(E.magFilter),S.push(E.minFilter),S.push(E.anisotropy),S.push(E.internalFormat),S.push(E.format),S.push(E.type),S.push(E.generateMipmaps),S.push(E.premultiplyAlpha),S.push(E.flipY),S.push(E.unpackAlignment),S.push(E.colorSpace),S.join()}function k(E,S){const F=n.get(E);if(E.isVideoTexture&&Tt(E),E.isRenderTargetTexture===!1&&E.version>0&&F.__version!==E.version){const it=E.image;if(it===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(it.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{pt(F,E,S);return}}e.bindTexture(r.TEXTURE_2D,F.__webglTexture,r.TEXTURE0+S)}function j(E,S){const F=n.get(E);if(E.version>0&&F.__version!==E.version){pt(F,E,S);return}e.bindTexture(r.TEXTURE_2D_ARRAY,F.__webglTexture,r.TEXTURE0+S)}function q(E,S){const F=n.get(E);if(E.version>0&&F.__version!==E.version){pt(F,E,S);return}e.bindTexture(r.TEXTURE_3D,F.__webglTexture,r.TEXTURE0+S)}function $(E,S){const F=n.get(E);if(E.version>0&&F.__version!==E.version){Mt(F,E,S);return}e.bindTexture(r.TEXTURE_CUBE_MAP,F.__webglTexture,r.TEXTURE0+S)}const Z={[Bi]:r.REPEAT,[on]:r.CLAMP_TO_EDGE,[oo]:r.MIRRORED_REPEAT},st={[Ce]:r.NEAREST,[$o]:r.NEAREST_MIPMAP_NEAREST,[$s]:r.NEAREST_MIPMAP_LINEAR,[je]:r.LINEAR,[yh]:r.LINEAR_MIPMAP_NEAREST,[rs]:r.LINEAR_MIPMAP_LINEAR},at={[Ih]:r.NEVER,[Bh]:r.ALWAYS,[Dh]:r.LESS,[Zl]:r.LEQUAL,[Nh]:r.EQUAL,[Fh]:r.GEQUAL,[Oh]:r.GREATER,[Uh]:r.NOTEQUAL};function W(E,S,F){if(F?(r.texParameteri(E,r.TEXTURE_WRAP_S,Z[S.wrapS]),r.texParameteri(E,r.TEXTURE_WRAP_T,Z[S.wrapT]),(E===r.TEXTURE_3D||E===r.TEXTURE_2D_ARRAY)&&r.texParameteri(E,r.TEXTURE_WRAP_R,Z[S.wrapR]),r.texParameteri(E,r.TEXTURE_MAG_FILTER,st[S.magFilter]),r.texParameteri(E,r.TEXTURE_MIN_FILTER,st[S.minFilter])):(r.texParameteri(E,r.TEXTURE_WRAP_S,r.CLAMP_TO_EDGE),r.texParameteri(E,r.TEXTURE_WRAP_T,r.CLAMP_TO_EDGE),(E===r.TEXTURE_3D||E===r.TEXTURE_2D_ARRAY)&&r.texParameteri(E,r.TEXTURE_WRAP_R,r.CLAMP_TO_EDGE),(S.wrapS!==on||S.wrapT!==on)&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.wrapS and Texture.wrapT should be set to THREE.ClampToEdgeWrapping."),r.texParameteri(E,r.TEXTURE_MAG_FILTER,A(S.magFilter)),r.texParameteri(E,r.TEXTURE_MIN_FILTER,A(S.minFilter)),S.minFilter!==Ce&&S.minFilter!==je&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.minFilter should be set to THREE.NearestFilter or THREE.LinearFilter.")),S.compareFunction&&(r.texParameteri(E,r.TEXTURE_COMPARE_MODE,r.COMPARE_REF_TO_TEXTURE),r.texParameteri(E,r.TEXTURE_COMPARE_FUNC,at[S.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){const it=t.get("EXT_texture_filter_anisotropic");if(S.magFilter===Ce||S.minFilter!==$s&&S.minFilter!==rs||S.type===Un&&t.has("OES_texture_float_linear")===!1||o===!1&&S.type===os&&t.has("OES_texture_half_float_linear")===!1)return;(S.anisotropy>1||n.get(S).__currentAnisotropy)&&(r.texParameterf(E,it.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(S.anisotropy,i.getMaxAnisotropy())),n.get(S).__currentAnisotropy=S.anisotropy)}}function tt(E,S){let F=!1;E.__webglInit===void 0&&(E.__webglInit=!0,S.addEventListener("dispose",R));const it=S.source;let et=u.get(it);et===void 0&&(et={},u.set(it,et));const Q=B(S);if(Q!==E.__cacheKey){et[Q]===void 0&&(et[Q]={texture:r.createTexture(),usedTimes:0},a.memory.textures++,F=!0),et[Q].usedTimes++;const yt=et[E.__cacheKey];yt!==void 0&&(et[E.__cacheKey].usedTimes--,yt.usedTimes===0&&w(S)),E.__cacheKey=Q,E.__webglTexture=et[Q].texture}return F}function pt(E,S,F){let it=r.TEXTURE_2D;(S.isDataArrayTexture||S.isCompressedArrayTexture)&&(it=r.TEXTURE_2D_ARRAY),S.isData3DTexture&&(it=r.TEXTURE_3D);const et=tt(E,S),Q=S.source;e.bindTexture(it,E.__webglTexture,r.TEXTURE0+F);const yt=n.get(Q);if(Q.version!==yt.__version||et===!0){e.activeTexture(r.TEXTURE0+F);const ut=te.getPrimaries(te.workingColorSpace),vt=S.colorSpace===Je?null:te.getPrimaries(S.colorSpace),Rt=S.colorSpace===Je||ut===vt?r.NONE:r.BROWSER_DEFAULT_WEBGL;r.pixelStorei(r.UNPACK_FLIP_Y_WEBGL,S.flipY),r.pixelStorei(r.UNPACK_PREMULTIPLY_ALPHA_WEBGL,S.premultiplyAlpha),r.pixelStorei(r.UNPACK_ALIGNMENT,S.unpackAlignment),r.pixelStorei(r.UNPACK_COLORSPACE_CONVERSION_WEBGL,Rt);const Bt=p(S)&&m(S.image)===!1;let nt=_(S.image,Bt,!1,i.maxTextureSize);nt=mt(S,nt);const jt=m(nt)||o,Yt=s.convert(S.format,S.colorSpace);let Ot=s.convert(S.type),bt=y(S.internalFormat,Yt,Ot,S.colorSpace,S.isVideoTexture);W(it,S,jt);let xt;const kt=S.mipmaps,$t=o&&S.isVideoTexture!==!0&&bt!==jl,ue=yt.__version===void 0||et===!0,Ht=P(S,nt,jt);if(S.isDepthTexture)bt=r.DEPTH_COMPONENT,o?S.type===Un?bt=r.DEPTH_COMPONENT32F:S.type===On?bt=r.DEPTH_COMPONENT24:S.type===Jn?bt=r.DEPTH24_STENCIL8:bt=r.DEPTH_COMPONENT16:S.type===Un&&console.error("WebGLRenderer: Floating point depth texture requires WebGL2."),S.format===Qn&&bt===r.DEPTH_COMPONENT&&S.type!==So&&S.type!==On&&(console.warn("THREE.WebGLRenderer: Use UnsignedShortType or UnsignedIntType for DepthFormat DepthTexture."),S.type=On,Ot=s.convert(S.type)),S.format===zi&&bt===r.DEPTH_COMPONENT&&(bt=r.DEPTH_STENCIL,S.type!==Jn&&(console.warn("THREE.WebGLRenderer: Use UnsignedInt248Type for DepthStencilFormat DepthTexture."),S.type=Jn,Ot=s.convert(S.type))),ue&&($t?e.texStorage2D(r.TEXTURE_2D,1,bt,nt.width,nt.height):e.texImage2D(r.TEXTURE_2D,0,bt,nt.width,nt.height,0,Yt,Ot,null));else if(S.isDataTexture)if(kt.length>0&&jt){$t&&ue&&e.texStorage2D(r.TEXTURE_2D,Ht,bt,kt[0].width,kt[0].height);for(let ct=0,I=kt.length;ct<I;ct++)xt=kt[ct],$t?e.texSubImage2D(r.TEXTURE_2D,ct,0,0,xt.width,xt.height,Yt,Ot,xt.data):e.texImage2D(r.TEXTURE_2D,ct,bt,xt.width,xt.height,0,Yt,Ot,xt.data);S.generateMipmaps=!1}else $t?(ue&&e.texStorage2D(r.TEXTURE_2D,Ht,bt,nt.width,nt.height),e.texSubImage2D(r.TEXTURE_2D,0,0,0,nt.width,nt.height,Yt,Ot,nt.data)):e.texImage2D(r.TEXTURE_2D,0,bt,nt.width,nt.height,0,Yt,Ot,nt.data);else if(S.isCompressedTexture)if(S.isCompressedArrayTexture){$t&&ue&&e.texStorage3D(r.TEXTURE_2D_ARRAY,Ht,bt,kt[0].width,kt[0].height,nt.depth);for(let ct=0,I=kt.length;ct<I;ct++)xt=kt[ct],S.format!==an?Yt!==null?$t?e.compressedTexSubImage3D(r.TEXTURE_2D_ARRAY,ct,0,0,0,xt.width,xt.height,nt.depth,Yt,xt.data,0,0):e.compressedTexImage3D(r.TEXTURE_2D_ARRAY,ct,bt,xt.width,xt.height,nt.depth,0,xt.data,0,0):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):$t?e.texSubImage3D(r.TEXTURE_2D_ARRAY,ct,0,0,0,xt.width,xt.height,nt.depth,Yt,Ot,xt.data):e.texImage3D(r.TEXTURE_2D_ARRAY,ct,bt,xt.width,xt.height,nt.depth,0,Yt,Ot,xt.data)}else{$t&&ue&&e.texStorage2D(r.TEXTURE_2D,Ht,bt,kt[0].width,kt[0].height);for(let ct=0,I=kt.length;ct<I;ct++)xt=kt[ct],S.format!==an?Yt!==null?$t?e.compressedTexSubImage2D(r.TEXTURE_2D,ct,0,0,xt.width,xt.height,Yt,xt.data):e.compressedTexImage2D(r.TEXTURE_2D,ct,bt,xt.width,xt.height,0,xt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):$t?e.texSubImage2D(r.TEXTURE_2D,ct,0,0,xt.width,xt.height,Yt,Ot,xt.data):e.texImage2D(r.TEXTURE_2D,ct,bt,xt.width,xt.height,0,Yt,Ot,xt.data)}else if(S.isDataArrayTexture)$t?(ue&&e.texStorage3D(r.TEXTURE_2D_ARRAY,Ht,bt,nt.width,nt.height,nt.depth),e.texSubImage3D(r.TEXTURE_2D_ARRAY,0,0,0,0,nt.width,nt.height,nt.depth,Yt,Ot,nt.data)):e.texImage3D(r.TEXTURE_2D_ARRAY,0,bt,nt.width,nt.height,nt.depth,0,Yt,Ot,nt.data);else if(S.isData3DTexture)$t?(ue&&e.texStorage3D(r.TEXTURE_3D,Ht,bt,nt.width,nt.height,nt.depth),e.texSubImage3D(r.TEXTURE_3D,0,0,0,0,nt.width,nt.height,nt.depth,Yt,Ot,nt.data)):e.texImage3D(r.TEXTURE_3D,0,bt,nt.width,nt.height,nt.depth,0,Yt,Ot,nt.data);else if(S.isFramebufferTexture){if(ue)if($t)e.texStorage2D(r.TEXTURE_2D,Ht,bt,nt.width,nt.height);else{let ct=nt.width,I=nt.height;for(let dt=0;dt<Ht;dt++)e.texImage2D(r.TEXTURE_2D,dt,bt,ct,I,0,Yt,Ot,null),ct>>=1,I>>=1}}else if(kt.length>0&&jt){$t&&ue&&e.texStorage2D(r.TEXTURE_2D,Ht,bt,kt[0].width,kt[0].height);for(let ct=0,I=kt.length;ct<I;ct++)xt=kt[ct],$t?e.texSubImage2D(r.TEXTURE_2D,ct,0,0,Yt,Ot,xt):e.texImage2D(r.TEXTURE_2D,ct,bt,Yt,Ot,xt);S.generateMipmaps=!1}else $t?(ue&&e.texStorage2D(r.TEXTURE_2D,Ht,bt,nt.width,nt.height),e.texSubImage2D(r.TEXTURE_2D,0,0,0,Yt,Ot,nt)):e.texImage2D(r.TEXTURE_2D,0,bt,Yt,Ot,nt);x(S,jt)&&v(it),yt.__version=Q.version,S.onUpdate&&S.onUpdate(S)}E.__version=S.version}function Mt(E,S,F){if(S.image.length!==6)return;const it=tt(E,S),et=S.source;e.bindTexture(r.TEXTURE_CUBE_MAP,E.__webglTexture,r.TEXTURE0+F);const Q=n.get(et);if(et.version!==Q.__version||it===!0){e.activeTexture(r.TEXTURE0+F);const yt=te.getPrimaries(te.workingColorSpace),ut=S.colorSpace===Je?null:te.getPrimaries(S.colorSpace),vt=S.colorSpace===Je||yt===ut?r.NONE:r.BROWSER_DEFAULT_WEBGL;r.pixelStorei(r.UNPACK_FLIP_Y_WEBGL,S.flipY),r.pixelStorei(r.UNPACK_PREMULTIPLY_ALPHA_WEBGL,S.premultiplyAlpha),r.pixelStorei(r.UNPACK_ALIGNMENT,S.unpackAlignment),r.pixelStorei(r.UNPACK_COLORSPACE_CONVERSION_WEBGL,vt);const Rt=S.isCompressedTexture||S.image[0].isCompressedTexture,Bt=S.image[0]&&S.image[0].isDataTexture,nt=[];for(let ct=0;ct<6;ct++)!Rt&&!Bt?nt[ct]=_(S.image[ct],!1,!0,i.maxCubemapSize):nt[ct]=Bt?S.image[ct].image:S.image[ct],nt[ct]=mt(S,nt[ct]);const jt=nt[0],Yt=m(jt)||o,Ot=s.convert(S.format,S.colorSpace),bt=s.convert(S.type),xt=y(S.internalFormat,Ot,bt,S.colorSpace),kt=o&&S.isVideoTexture!==!0,$t=Q.__version===void 0||it===!0;let ue=P(S,jt,Yt);W(r.TEXTURE_CUBE_MAP,S,Yt);let Ht;if(Rt){kt&&$t&&e.texStorage2D(r.TEXTURE_CUBE_MAP,ue,xt,jt.width,jt.height);for(let ct=0;ct<6;ct++){Ht=nt[ct].mipmaps;for(let I=0;I<Ht.length;I++){const dt=Ht[I];S.format!==an?Ot!==null?kt?e.compressedTexSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ct,I,0,0,dt.width,dt.height,Ot,dt.data):e.compressedTexImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ct,I,xt,dt.width,dt.height,0,dt.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):kt?e.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ct,I,0,0,dt.width,dt.height,Ot,bt,dt.data):e.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ct,I,xt,dt.width,dt.height,0,Ot,bt,dt.data)}}}else{Ht=S.mipmaps,kt&&$t&&(Ht.length>0&&ue++,e.texStorage2D(r.TEXTURE_CUBE_MAP,ue,xt,nt[0].width,nt[0].height));for(let ct=0;ct<6;ct++)if(Bt){kt?e.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ct,0,0,0,nt[ct].width,nt[ct].height,Ot,bt,nt[ct].data):e.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ct,0,xt,nt[ct].width,nt[ct].height,0,Ot,bt,nt[ct].data);for(let I=0;I<Ht.length;I++){const ft=Ht[I].image[ct].image;kt?e.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ct,I+1,0,0,ft.width,ft.height,Ot,bt,ft.data):e.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ct,I+1,xt,ft.width,ft.height,0,Ot,bt,ft.data)}}else{kt?e.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ct,0,0,0,Ot,bt,nt[ct]):e.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ct,0,xt,Ot,bt,nt[ct]);for(let I=0;I<Ht.length;I++){const dt=Ht[I];kt?e.texSubImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ct,I+1,0,0,Ot,bt,dt.image[ct]):e.texImage2D(r.TEXTURE_CUBE_MAP_POSITIVE_X+ct,I+1,xt,Ot,bt,dt.image[ct])}}}x(S,Yt)&&v(r.TEXTURE_CUBE_MAP),Q.__version=et.version,S.onUpdate&&S.onUpdate(S)}E.__version=S.version}function _t(E,S,F,it,et,Q){const yt=s.convert(F.format,F.colorSpace),ut=s.convert(F.type),vt=y(F.internalFormat,yt,ut,F.colorSpace);if(!n.get(S).__hasExternalTextures){const Bt=Math.max(1,S.width>>Q),nt=Math.max(1,S.height>>Q);et===r.TEXTURE_3D||et===r.TEXTURE_2D_ARRAY?e.texImage3D(et,Q,vt,Bt,nt,S.depth,0,yt,ut,null):e.texImage2D(et,Q,vt,Bt,nt,0,yt,ut,null)}e.bindFramebuffer(r.FRAMEBUFFER,E),Y(S)?l.framebufferTexture2DMultisampleEXT(r.FRAMEBUFFER,it,et,n.get(F).__webglTexture,0,rt(S)):(et===r.TEXTURE_2D||et>=r.TEXTURE_CUBE_MAP_POSITIVE_X&&et<=r.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&r.framebufferTexture2D(r.FRAMEBUFFER,it,et,n.get(F).__webglTexture,Q),e.bindFramebuffer(r.FRAMEBUFFER,null)}function Lt(E,S,F){if(r.bindRenderbuffer(r.RENDERBUFFER,E),S.depthBuffer&&!S.stencilBuffer){let it=o===!0?r.DEPTH_COMPONENT24:r.DEPTH_COMPONENT16;if(F||Y(S)){const et=S.depthTexture;et&&et.isDepthTexture&&(et.type===Un?it=r.DEPTH_COMPONENT32F:et.type===On&&(it=r.DEPTH_COMPONENT24));const Q=rt(S);Y(S)?l.renderbufferStorageMultisampleEXT(r.RENDERBUFFER,Q,it,S.width,S.height):r.renderbufferStorageMultisample(r.RENDERBUFFER,Q,it,S.width,S.height)}else r.renderbufferStorage(r.RENDERBUFFER,it,S.width,S.height);r.framebufferRenderbuffer(r.FRAMEBUFFER,r.DEPTH_ATTACHMENT,r.RENDERBUFFER,E)}else if(S.depthBuffer&&S.stencilBuffer){const it=rt(S);F&&Y(S)===!1?r.renderbufferStorageMultisample(r.RENDERBUFFER,it,r.DEPTH24_STENCIL8,S.width,S.height):Y(S)?l.renderbufferStorageMultisampleEXT(r.RENDERBUFFER,it,r.DEPTH24_STENCIL8,S.width,S.height):r.renderbufferStorage(r.RENDERBUFFER,r.DEPTH_STENCIL,S.width,S.height),r.framebufferRenderbuffer(r.FRAMEBUFFER,r.DEPTH_STENCIL_ATTACHMENT,r.RENDERBUFFER,E)}else{const it=S.isWebGLMultipleRenderTargets===!0?S.texture:[S.texture];for(let et=0;et<it.length;et++){const Q=it[et],yt=s.convert(Q.format,Q.colorSpace),ut=s.convert(Q.type),vt=y(Q.internalFormat,yt,ut,Q.colorSpace),Rt=rt(S);F&&Y(S)===!1?r.renderbufferStorageMultisample(r.RENDERBUFFER,Rt,vt,S.width,S.height):Y(S)?l.renderbufferStorageMultisampleEXT(r.RENDERBUFFER,Rt,vt,S.width,S.height):r.renderbufferStorage(r.RENDERBUFFER,vt,S.width,S.height)}}r.bindRenderbuffer(r.RENDERBUFFER,null)}function Ut(E,S){if(S&&S.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(e.bindFramebuffer(r.FRAMEBUFFER,E),!(S.depthTexture&&S.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");(!n.get(S.depthTexture).__webglTexture||S.depthTexture.image.width!==S.width||S.depthTexture.image.height!==S.height)&&(S.depthTexture.image.width=S.width,S.depthTexture.image.height=S.height,S.depthTexture.needsUpdate=!0),k(S.depthTexture,0);const it=n.get(S.depthTexture).__webglTexture,et=rt(S);if(S.depthTexture.format===Qn)Y(S)?l.framebufferTexture2DMultisampleEXT(r.FRAMEBUFFER,r.DEPTH_ATTACHMENT,r.TEXTURE_2D,it,0,et):r.framebufferTexture2D(r.FRAMEBUFFER,r.DEPTH_ATTACHMENT,r.TEXTURE_2D,it,0);else if(S.depthTexture.format===zi)Y(S)?l.framebufferTexture2DMultisampleEXT(r.FRAMEBUFFER,r.DEPTH_STENCIL_ATTACHMENT,r.TEXTURE_2D,it,0,et):r.framebufferTexture2D(r.FRAMEBUFFER,r.DEPTH_STENCIL_ATTACHMENT,r.TEXTURE_2D,it,0);else throw new Error("Unknown depthTexture format")}function Et(E){const S=n.get(E),F=E.isWebGLCubeRenderTarget===!0;if(E.depthTexture&&!S.__autoAllocateDepthBuffer){if(F)throw new Error("target.depthTexture not supported in Cube render targets");Ut(S.__webglFramebuffer,E)}else if(F){S.__webglDepthbuffer=[];for(let it=0;it<6;it++)e.bindFramebuffer(r.FRAMEBUFFER,S.__webglFramebuffer[it]),S.__webglDepthbuffer[it]=r.createRenderbuffer(),Lt(S.__webglDepthbuffer[it],E,!1)}else e.bindFramebuffer(r.FRAMEBUFFER,S.__webglFramebuffer),S.__webglDepthbuffer=r.createRenderbuffer(),Lt(S.__webglDepthbuffer,E,!1);e.bindFramebuffer(r.FRAMEBUFFER,null)}function Nt(E,S,F){const it=n.get(E);S!==void 0&&_t(it.__webglFramebuffer,E,E.texture,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,0),F!==void 0&&Et(E)}function C(E){const S=E.texture,F=n.get(E),it=n.get(S);E.addEventListener("dispose",N),E.isWebGLMultipleRenderTargets!==!0&&(it.__webglTexture===void 0&&(it.__webglTexture=r.createTexture()),it.__version=S.version,a.memory.textures++);const et=E.isWebGLCubeRenderTarget===!0,Q=E.isWebGLMultipleRenderTargets===!0,yt=m(E)||o;if(et){F.__webglFramebuffer=[];for(let ut=0;ut<6;ut++)if(o&&S.mipmaps&&S.mipmaps.length>0){F.__webglFramebuffer[ut]=[];for(let vt=0;vt<S.mipmaps.length;vt++)F.__webglFramebuffer[ut][vt]=r.createFramebuffer()}else F.__webglFramebuffer[ut]=r.createFramebuffer()}else{if(o&&S.mipmaps&&S.mipmaps.length>0){F.__webglFramebuffer=[];for(let ut=0;ut<S.mipmaps.length;ut++)F.__webglFramebuffer[ut]=r.createFramebuffer()}else F.__webglFramebuffer=r.createFramebuffer();if(Q)if(i.drawBuffers){const ut=E.texture;for(let vt=0,Rt=ut.length;vt<Rt;vt++){const Bt=n.get(ut[vt]);Bt.__webglTexture===void 0&&(Bt.__webglTexture=r.createTexture(),a.memory.textures++)}}else console.warn("THREE.WebGLRenderer: WebGLMultipleRenderTargets can only be used with WebGL2 or WEBGL_draw_buffers extension.");if(o&&E.samples>0&&Y(E)===!1){const ut=Q?S:[S];F.__webglMultisampledFramebuffer=r.createFramebuffer(),F.__webglColorRenderbuffer=[],e.bindFramebuffer(r.FRAMEBUFFER,F.__webglMultisampledFramebuffer);for(let vt=0;vt<ut.length;vt++){const Rt=ut[vt];F.__webglColorRenderbuffer[vt]=r.createRenderbuffer(),r.bindRenderbuffer(r.RENDERBUFFER,F.__webglColorRenderbuffer[vt]);const Bt=s.convert(Rt.format,Rt.colorSpace),nt=s.convert(Rt.type),jt=y(Rt.internalFormat,Bt,nt,Rt.colorSpace,E.isXRRenderTarget===!0),Yt=rt(E);r.renderbufferStorageMultisample(r.RENDERBUFFER,Yt,jt,E.width,E.height),r.framebufferRenderbuffer(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0+vt,r.RENDERBUFFER,F.__webglColorRenderbuffer[vt])}r.bindRenderbuffer(r.RENDERBUFFER,null),E.depthBuffer&&(F.__webglDepthRenderbuffer=r.createRenderbuffer(),Lt(F.__webglDepthRenderbuffer,E,!0)),e.bindFramebuffer(r.FRAMEBUFFER,null)}}if(et){e.bindTexture(r.TEXTURE_CUBE_MAP,it.__webglTexture),W(r.TEXTURE_CUBE_MAP,S,yt);for(let ut=0;ut<6;ut++)if(o&&S.mipmaps&&S.mipmaps.length>0)for(let vt=0;vt<S.mipmaps.length;vt++)_t(F.__webglFramebuffer[ut][vt],E,S,r.COLOR_ATTACHMENT0,r.TEXTURE_CUBE_MAP_POSITIVE_X+ut,vt);else _t(F.__webglFramebuffer[ut],E,S,r.COLOR_ATTACHMENT0,r.TEXTURE_CUBE_MAP_POSITIVE_X+ut,0);x(S,yt)&&v(r.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(Q){const ut=E.texture;for(let vt=0,Rt=ut.length;vt<Rt;vt++){const Bt=ut[vt],nt=n.get(Bt);e.bindTexture(r.TEXTURE_2D,nt.__webglTexture),W(r.TEXTURE_2D,Bt,yt),_t(F.__webglFramebuffer,E,Bt,r.COLOR_ATTACHMENT0+vt,r.TEXTURE_2D,0),x(Bt,yt)&&v(r.TEXTURE_2D)}e.unbindTexture()}else{let ut=r.TEXTURE_2D;if((E.isWebGL3DRenderTarget||E.isWebGLArrayRenderTarget)&&(o?ut=E.isWebGL3DRenderTarget?r.TEXTURE_3D:r.TEXTURE_2D_ARRAY:console.error("THREE.WebGLTextures: THREE.Data3DTexture and THREE.DataArrayTexture only supported with WebGL2.")),e.bindTexture(ut,it.__webglTexture),W(ut,S,yt),o&&S.mipmaps&&S.mipmaps.length>0)for(let vt=0;vt<S.mipmaps.length;vt++)_t(F.__webglFramebuffer[vt],E,S,r.COLOR_ATTACHMENT0,ut,vt);else _t(F.__webglFramebuffer,E,S,r.COLOR_ATTACHMENT0,ut,0);x(S,yt)&&v(ut),e.unbindTexture()}E.depthBuffer&&Et(E)}function lt(E){const S=m(E)||o,F=E.isWebGLMultipleRenderTargets===!0?E.texture:[E.texture];for(let it=0,et=F.length;it<et;it++){const Q=F[it];if(x(Q,S)){const yt=E.isWebGLCubeRenderTarget?r.TEXTURE_CUBE_MAP:r.TEXTURE_2D,ut=n.get(Q).__webglTexture;e.bindTexture(yt,ut),v(yt),e.unbindTexture()}}}function K(E){if(o&&E.samples>0&&Y(E)===!1){const S=E.isWebGLMultipleRenderTargets?E.texture:[E.texture],F=E.width,it=E.height;let et=r.COLOR_BUFFER_BIT;const Q=[],yt=E.stencilBuffer?r.DEPTH_STENCIL_ATTACHMENT:r.DEPTH_ATTACHMENT,ut=n.get(E),vt=E.isWebGLMultipleRenderTargets===!0;if(vt)for(let Rt=0;Rt<S.length;Rt++)e.bindFramebuffer(r.FRAMEBUFFER,ut.__webglMultisampledFramebuffer),r.framebufferRenderbuffer(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0+Rt,r.RENDERBUFFER,null),e.bindFramebuffer(r.FRAMEBUFFER,ut.__webglFramebuffer),r.framebufferTexture2D(r.DRAW_FRAMEBUFFER,r.COLOR_ATTACHMENT0+Rt,r.TEXTURE_2D,null,0);e.bindFramebuffer(r.READ_FRAMEBUFFER,ut.__webglMultisampledFramebuffer),e.bindFramebuffer(r.DRAW_FRAMEBUFFER,ut.__webglFramebuffer);for(let Rt=0;Rt<S.length;Rt++){Q.push(r.COLOR_ATTACHMENT0+Rt),E.depthBuffer&&Q.push(yt);const Bt=ut.__ignoreDepthValues!==void 0?ut.__ignoreDepthValues:!1;if(Bt===!1&&(E.depthBuffer&&(et|=r.DEPTH_BUFFER_BIT),E.stencilBuffer&&(et|=r.STENCIL_BUFFER_BIT)),vt&&r.framebufferRenderbuffer(r.READ_FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.RENDERBUFFER,ut.__webglColorRenderbuffer[Rt]),Bt===!0&&(r.invalidateFramebuffer(r.READ_FRAMEBUFFER,[yt]),r.invalidateFramebuffer(r.DRAW_FRAMEBUFFER,[yt])),vt){const nt=n.get(S[Rt]).__webglTexture;r.framebufferTexture2D(r.DRAW_FRAMEBUFFER,r.COLOR_ATTACHMENT0,r.TEXTURE_2D,nt,0)}r.blitFramebuffer(0,0,F,it,0,0,F,it,et,r.NEAREST),c&&r.invalidateFramebuffer(r.READ_FRAMEBUFFER,Q)}if(e.bindFramebuffer(r.READ_FRAMEBUFFER,null),e.bindFramebuffer(r.DRAW_FRAMEBUFFER,null),vt)for(let Rt=0;Rt<S.length;Rt++){e.bindFramebuffer(r.FRAMEBUFFER,ut.__webglMultisampledFramebuffer),r.framebufferRenderbuffer(r.FRAMEBUFFER,r.COLOR_ATTACHMENT0+Rt,r.RENDERBUFFER,ut.__webglColorRenderbuffer[Rt]);const Bt=n.get(S[Rt]).__webglTexture;e.bindFramebuffer(r.FRAMEBUFFER,ut.__webglFramebuffer),r.framebufferTexture2D(r.DRAW_FRAMEBUFFER,r.COLOR_ATTACHMENT0+Rt,r.TEXTURE_2D,Bt,0)}e.bindFramebuffer(r.DRAW_FRAMEBUFFER,ut.__webglMultisampledFramebuffer)}}function rt(E){return Math.min(i.maxSamples,E.samples)}function Y(E){const S=n.get(E);return o&&E.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&S.__useRenderToTexture!==!1}function Tt(E){const S=a.render.frame;h.get(E)!==S&&(h.set(E,S),E.update())}function mt(E,S){const F=E.colorSpace,it=E.format,et=E.type;return E.isCompressedTexture===!0||E.isVideoTexture===!0||E.format===ao||F!==Rn&&F!==Je&&(te.getTransfer(F)===oe?o===!1?t.has("EXT_sRGB")===!0&&it===an?(E.format=ao,E.minFilter=je,E.generateMipmaps=!1):S=tc.sRGBToLinear(S):(it!==an||et!==Bn)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",F)),S}this.allocateTextureUnit=L,this.resetTextureUnits=J,this.setTexture2D=k,this.setTexture2DArray=j,this.setTexture3D=q,this.setTextureCube=$,this.rebindTextures=Nt,this.setupRenderTarget=C,this.updateRenderTargetMipmap=lt,this.updateMultisampleRenderTarget=K,this.setupDepthRenderbuffer=Et,this.setupFrameBufferTexture=_t,this.useMultisampledRTT=Y}function Qm(r,t,e){const n=e.isWebGL2;function i(s,a=Je){let o;const l=te.getTransfer(a);if(s===Bn)return r.UNSIGNED_BYTE;if(s===Wl)return r.UNSIGNED_SHORT_4_4_4_4;if(s===Xl)return r.UNSIGNED_SHORT_5_5_5_1;if(s===Sh)return r.BYTE;if(s===Mh)return r.SHORT;if(s===So)return r.UNSIGNED_SHORT;if(s===Hl)return r.INT;if(s===On)return r.UNSIGNED_INT;if(s===Un)return r.FLOAT;if(s===os)return n?r.HALF_FLOAT:(o=t.get("OES_texture_half_float"),o!==null?o.HALF_FLOAT_OES:null);if(s===Eh)return r.ALPHA;if(s===an)return r.RGBA;if(s===Ah)return r.LUMINANCE;if(s===Th)return r.LUMINANCE_ALPHA;if(s===Qn)return r.DEPTH_COMPONENT;if(s===zi)return r.DEPTH_STENCIL;if(s===ao)return o=t.get("EXT_sRGB"),o!==null?o.SRGB_ALPHA_EXT:null;if(s===wh)return r.RED;if(s===Yl)return r.RED_INTEGER;if(s===bh)return r.RG;if(s===ql)return r.RG_INTEGER;if(s===Kl)return r.RGBA_INTEGER;if(s===mr||s===gr||s===_r||s===vr)if(l===oe)if(o=t.get("WEBGL_compressed_texture_s3tc_srgb"),o!==null){if(s===mr)return o.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(s===gr)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(s===_r)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(s===vr)return o.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(o=t.get("WEBGL_compressed_texture_s3tc"),o!==null){if(s===mr)return o.COMPRESSED_RGB_S3TC_DXT1_EXT;if(s===gr)return o.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(s===_r)return o.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(s===vr)return o.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(s===Zo||s===Jo||s===Qo||s===ta)if(o=t.get("WEBGL_compressed_texture_pvrtc"),o!==null){if(s===Zo)return o.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(s===Jo)return o.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(s===Qo)return o.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(s===ta)return o.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(s===jl)return o=t.get("WEBGL_compressed_texture_etc1"),o!==null?o.COMPRESSED_RGB_ETC1_WEBGL:null;if(s===ea||s===na)if(o=t.get("WEBGL_compressed_texture_etc"),o!==null){if(s===ea)return l===oe?o.COMPRESSED_SRGB8_ETC2:o.COMPRESSED_RGB8_ETC2;if(s===na)return l===oe?o.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:o.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(s===ia||s===sa||s===ra||s===oa||s===aa||s===la||s===ca||s===ha||s===ua||s===da||s===fa||s===pa||s===ma||s===ga)if(o=t.get("WEBGL_compressed_texture_astc"),o!==null){if(s===ia)return l===oe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:o.COMPRESSED_RGBA_ASTC_4x4_KHR;if(s===sa)return l===oe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:o.COMPRESSED_RGBA_ASTC_5x4_KHR;if(s===ra)return l===oe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:o.COMPRESSED_RGBA_ASTC_5x5_KHR;if(s===oa)return l===oe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:o.COMPRESSED_RGBA_ASTC_6x5_KHR;if(s===aa)return l===oe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:o.COMPRESSED_RGBA_ASTC_6x6_KHR;if(s===la)return l===oe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:o.COMPRESSED_RGBA_ASTC_8x5_KHR;if(s===ca)return l===oe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:o.COMPRESSED_RGBA_ASTC_8x6_KHR;if(s===ha)return l===oe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:o.COMPRESSED_RGBA_ASTC_8x8_KHR;if(s===ua)return l===oe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:o.COMPRESSED_RGBA_ASTC_10x5_KHR;if(s===da)return l===oe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:o.COMPRESSED_RGBA_ASTC_10x6_KHR;if(s===fa)return l===oe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:o.COMPRESSED_RGBA_ASTC_10x8_KHR;if(s===pa)return l===oe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:o.COMPRESSED_RGBA_ASTC_10x10_KHR;if(s===ma)return l===oe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:o.COMPRESSED_RGBA_ASTC_12x10_KHR;if(s===ga)return l===oe?o.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:o.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(s===xr||s===_a||s===va)if(o=t.get("EXT_texture_compression_bptc"),o!==null){if(s===xr)return l===oe?o.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:o.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(s===_a)return o.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(s===va)return o.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(s===Rh||s===xa||s===ya||s===Sa)if(o=t.get("EXT_texture_compression_rgtc"),o!==null){if(s===xr)return o.COMPRESSED_RED_RGTC1_EXT;if(s===xa)return o.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(s===ya)return o.COMPRESSED_RED_GREEN_RGTC2_EXT;if(s===Sa)return o.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return s===Jn?n?r.UNSIGNED_INT_24_8:(o=t.get("WEBGL_depth_texture"),o!==null?o.UNSIGNED_INT_24_8_WEBGL:null):r[s]!==void 0?r[s]:null}return{convert:i}}class t0 extends Ze{constructor(t=[]){super(),this.isArrayCamera=!0,this.cameras=t}}class ae extends ee{constructor(){super(),this.isGroup=!0,this.type="Group"}}const e0={type:"move"};class Vr{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new ae,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new ae,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new b,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new b),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new ae,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new b,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new b),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const e=this._hand;if(e)for(const n of t.hand.values())this._getHandJoint(e,n)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,n){let i=null,s=null,a=null;const o=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){a=!0;for(const _ of t.hand.values()){const m=e.getJointPose(_,n),p=this._getHandJoint(c,_);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}const h=c.joints["index-finger-tip"],d=c.joints["thumb-tip"],u=h.position.distanceTo(d.position),f=.02,g=.005;c.inputState.pinching&&u>f+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&u<=f-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(s=e.getPose(t.gripSpace,n),s!==null&&(l.matrix.fromArray(s.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,s.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(s.linearVelocity)):l.hasLinearVelocity=!1,s.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(s.angularVelocity)):l.hasAngularVelocity=!1));o!==null&&(i=e.getPose(t.targetRaySpace,n),i===null&&s!==null&&(i=s),i!==null&&(o.matrix.fromArray(i.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,i.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(i.linearVelocity)):o.hasLinearVelocity=!1,i.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(i.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(e0)))}return o!==null&&(o.visible=i!==null),l!==null&&(l.visible=s!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){const n=new ae;n.matrixAutoUpdate=!1,n.visible=!1,t.joints[e.jointName]=n,t.add(n)}return t.joints[e.jointName]}}class n0 extends Gi{constructor(t,e){super();const n=this;let i=null,s=1,a=null,o="local-floor",l=1,c=null,h=null,d=null,u=null,f=null,g=null;const _=e.getContextAttributes();let m=null,p=null;const x=[],v=[],y=new ot;let P=null;const A=new Ze;A.layers.enable(1),A.viewport=new we;const R=new Ze;R.layers.enable(2),R.viewport=new we;const N=[A,R],M=new t0;M.layers.enable(1),M.layers.enable(2);let w=null,U=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(W){let tt=x[W];return tt===void 0&&(tt=new Vr,x[W]=tt),tt.getTargetRaySpace()},this.getControllerGrip=function(W){let tt=x[W];return tt===void 0&&(tt=new Vr,x[W]=tt),tt.getGripSpace()},this.getHand=function(W){let tt=x[W];return tt===void 0&&(tt=new Vr,x[W]=tt),tt.getHandSpace()};function V(W){const tt=v.indexOf(W.inputSource);if(tt===-1)return;const pt=x[tt];pt!==void 0&&(pt.update(W.inputSource,W.frame,c||a),pt.dispatchEvent({type:W.type,data:W.inputSource}))}function J(){i.removeEventListener("select",V),i.removeEventListener("selectstart",V),i.removeEventListener("selectend",V),i.removeEventListener("squeeze",V),i.removeEventListener("squeezestart",V),i.removeEventListener("squeezeend",V),i.removeEventListener("end",J),i.removeEventListener("inputsourceschange",L);for(let W=0;W<x.length;W++){const tt=v[W];tt!==null&&(v[W]=null,x[W].disconnect(tt))}w=null,U=null,t.setRenderTarget(m),f=null,u=null,d=null,i=null,p=null,at.stop(),n.isPresenting=!1,t.setPixelRatio(P),t.setSize(y.width,y.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(W){s=W,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(W){o=W,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(W){c=W},this.getBaseLayer=function(){return u!==null?u:f},this.getBinding=function(){return d},this.getFrame=function(){return g},this.getSession=function(){return i},this.setSession=async function(W){if(i=W,i!==null){if(m=t.getRenderTarget(),i.addEventListener("select",V),i.addEventListener("selectstart",V),i.addEventListener("selectend",V),i.addEventListener("squeeze",V),i.addEventListener("squeezestart",V),i.addEventListener("squeezeend",V),i.addEventListener("end",J),i.addEventListener("inputsourceschange",L),_.xrCompatible!==!0&&await e.makeXRCompatible(),P=t.getPixelRatio(),t.getSize(y),i.renderState.layers===void 0||t.capabilities.isWebGL2===!1){const tt={antialias:i.renderState.layers===void 0?_.antialias:!0,alpha:!0,depth:_.depth,stencil:_.stencil,framebufferScaleFactor:s};f=new XRWebGLLayer(i,e,tt),i.updateRenderState({baseLayer:f}),t.setPixelRatio(1),t.setSize(f.framebufferWidth,f.framebufferHeight,!1),p=new ei(f.framebufferWidth,f.framebufferHeight,{format:an,type:Bn,colorSpace:t.outputColorSpace,stencilBuffer:_.stencil})}else{let tt=null,pt=null,Mt=null;_.depth&&(Mt=_.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,tt=_.stencil?zi:Qn,pt=_.stencil?Jn:On);const _t={colorFormat:e.RGBA8,depthFormat:Mt,scaleFactor:s};d=new XRWebGLBinding(i,e),u=d.createProjectionLayer(_t),i.updateRenderState({layers:[u]}),t.setPixelRatio(1),t.setSize(u.textureWidth,u.textureHeight,!1),p=new ei(u.textureWidth,u.textureHeight,{format:an,type:Bn,depthTexture:new dc(u.textureWidth,u.textureHeight,pt,void 0,void 0,void 0,void 0,void 0,void 0,tt),stencilBuffer:_.stencil,colorSpace:t.outputColorSpace,samples:_.antialias?4:0});const Lt=t.properties.get(p);Lt.__ignoreDepthValues=u.ignoreDepthValues}p.isXRRenderTarget=!0,this.setFoveation(l),c=null,a=await i.requestReferenceSpace(o),at.setContext(i),at.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(i!==null)return i.environmentBlendMode};function L(W){for(let tt=0;tt<W.removed.length;tt++){const pt=W.removed[tt],Mt=v.indexOf(pt);Mt>=0&&(v[Mt]=null,x[Mt].disconnect(pt))}for(let tt=0;tt<W.added.length;tt++){const pt=W.added[tt];let Mt=v.indexOf(pt);if(Mt===-1){for(let Lt=0;Lt<x.length;Lt++)if(Lt>=v.length){v.push(pt),Mt=Lt;break}else if(v[Lt]===null){v[Lt]=pt,Mt=Lt;break}if(Mt===-1)break}const _t=x[Mt];_t&&_t.connect(pt)}}const B=new b,k=new b;function j(W,tt,pt){B.setFromMatrixPosition(tt.matrixWorld),k.setFromMatrixPosition(pt.matrixWorld);const Mt=B.distanceTo(k),_t=tt.projectionMatrix.elements,Lt=pt.projectionMatrix.elements,Ut=_t[14]/(_t[10]-1),Et=_t[14]/(_t[10]+1),Nt=(_t[9]+1)/_t[5],C=(_t[9]-1)/_t[5],lt=(_t[8]-1)/_t[0],K=(Lt[8]+1)/Lt[0],rt=Ut*lt,Y=Ut*K,Tt=Mt/(-lt+K),mt=Tt*-lt;tt.matrixWorld.decompose(W.position,W.quaternion,W.scale),W.translateX(mt),W.translateZ(Tt),W.matrixWorld.compose(W.position,W.quaternion,W.scale),W.matrixWorldInverse.copy(W.matrixWorld).invert();const E=Ut+Tt,S=Et+Tt,F=rt-mt,it=Y+(Mt-mt),et=Nt*Et/S*E,Q=C*Et/S*E;W.projectionMatrix.makePerspective(F,it,et,Q,E,S),W.projectionMatrixInverse.copy(W.projectionMatrix).invert()}function q(W,tt){tt===null?W.matrixWorld.copy(W.matrix):W.matrixWorld.multiplyMatrices(tt.matrixWorld,W.matrix),W.matrixWorldInverse.copy(W.matrixWorld).invert()}this.updateCamera=function(W){if(i===null)return;M.near=R.near=A.near=W.near,M.far=R.far=A.far=W.far,(w!==M.near||U!==M.far)&&(i.updateRenderState({depthNear:M.near,depthFar:M.far}),w=M.near,U=M.far);const tt=W.parent,pt=M.cameras;q(M,tt);for(let Mt=0;Mt<pt.length;Mt++)q(pt[Mt],tt);pt.length===2?j(M,A,R):M.projectionMatrix.copy(A.projectionMatrix),$(W,M,tt)};function $(W,tt,pt){pt===null?W.matrix.copy(tt.matrixWorld):(W.matrix.copy(pt.matrixWorld),W.matrix.invert(),W.matrix.multiply(tt.matrixWorld)),W.matrix.decompose(W.position,W.quaternion,W.scale),W.updateMatrixWorld(!0),W.projectionMatrix.copy(tt.projectionMatrix),W.projectionMatrixInverse.copy(tt.projectionMatrixInverse),W.isPerspectiveCamera&&(W.fov=as*2*Math.atan(1/W.projectionMatrix.elements[5]),W.zoom=1)}this.getCamera=function(){return M},this.getFoveation=function(){if(!(u===null&&f===null))return l},this.setFoveation=function(W){l=W,u!==null&&(u.fixedFoveation=W),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=W)};let Z=null;function st(W,tt){if(h=tt.getViewerPose(c||a),g=tt,h!==null){const pt=h.views;f!==null&&(t.setRenderTargetFramebuffer(p,f.framebuffer),t.setRenderTarget(p));let Mt=!1;pt.length!==M.cameras.length&&(M.cameras.length=0,Mt=!0);for(let _t=0;_t<pt.length;_t++){const Lt=pt[_t];let Ut=null;if(f!==null)Ut=f.getViewport(Lt);else{const Nt=d.getViewSubImage(u,Lt);Ut=Nt.viewport,_t===0&&(t.setRenderTargetTextures(p,Nt.colorTexture,u.ignoreDepthValues?void 0:Nt.depthStencilTexture),t.setRenderTarget(p))}let Et=N[_t];Et===void 0&&(Et=new Ze,Et.layers.enable(_t),Et.viewport=new we,N[_t]=Et),Et.matrix.fromArray(Lt.transform.matrix),Et.matrix.decompose(Et.position,Et.quaternion,Et.scale),Et.projectionMatrix.fromArray(Lt.projectionMatrix),Et.projectionMatrixInverse.copy(Et.projectionMatrix).invert(),Et.viewport.set(Ut.x,Ut.y,Ut.width,Ut.height),_t===0&&(M.matrix.copy(Et.matrix),M.matrix.decompose(M.position,M.quaternion,M.scale)),Mt===!0&&M.cameras.push(Et)}}for(let pt=0;pt<x.length;pt++){const Mt=v[pt],_t=x[pt];Mt!==null&&_t!==void 0&&_t.update(Mt,tt,c||a)}Z&&Z(W,tt),tt.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:tt}),g=null}const at=new hc;at.setAnimationLoop(st),this.setAnimationLoop=function(W){Z=W},this.dispose=function(){}}}function i0(r,t){function e(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function n(m,p){p.color.getRGB(m.fogColor.value,ac(r)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function i(m,p,x,v,y){p.isMeshBasicMaterial||p.isMeshLambertMaterial?s(m,p):p.isMeshToonMaterial?(s(m,p),d(m,p)):p.isMeshPhongMaterial?(s(m,p),h(m,p)):p.isMeshStandardMaterial?(s(m,p),u(m,p),p.isMeshPhysicalMaterial&&f(m,p,y)):p.isMeshMatcapMaterial?(s(m,p),g(m,p)):p.isMeshDepthMaterial?s(m,p):p.isMeshDistanceMaterial?(s(m,p),_(m,p)):p.isMeshNormalMaterial?s(m,p):p.isLineBasicMaterial?(a(m,p),p.isLineDashedMaterial&&o(m,p)):p.isPointsMaterial?l(m,p,x,v):p.isSpriteMaterial?c(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function s(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,e(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,e(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===Le&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,e(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===Le&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,e(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,e(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,e(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);const x=t.get(p).envMap;if(x&&(m.envMap.value=x,m.flipEnvMap.value=x.isCubeTexture&&x.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap){m.lightMap.value=p.lightMap;const v=r._useLegacyLights===!0?Math.PI:1;m.lightMapIntensity.value=p.lightMapIntensity*v,e(p.lightMap,m.lightMapTransform)}p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,e(p.aoMap,m.aoMapTransform))}function a(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,e(p.map,m.mapTransform))}function o(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function l(m,p,x,v){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*x,m.scale.value=v*.5,p.map&&(m.map.value=p.map,e(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function c(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,e(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,e(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function h(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function d(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function u(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,e(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,e(p.roughnessMap,m.roughnessMapTransform)),t.get(p).envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function f(m,p,x){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,e(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,e(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,e(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,e(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,e(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===Le&&m.clearcoatNormalScale.value.negate())),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,e(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,e(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=x.texture,m.transmissionSamplerSize.value.set(x.width,x.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,e(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,e(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,e(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,e(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,e(p.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,p){p.matcap&&(m.matcap.value=p.matcap)}function _(m,p){const x=t.get(p).light;m.referencePosition.value.setFromMatrixPosition(x.matrixWorld),m.nearDistance.value=x.shadow.camera.near,m.farDistance.value=x.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:i}}function s0(r,t,e,n){let i={},s={},a=[];const o=e.isWebGL2?r.getParameter(r.MAX_UNIFORM_BUFFER_BINDINGS):0;function l(x,v){const y=v.program;n.uniformBlockBinding(x,y)}function c(x,v){let y=i[x.id];y===void 0&&(g(x),y=h(x),i[x.id]=y,x.addEventListener("dispose",m));const P=v.program;n.updateUBOMapping(x,P);const A=t.render.frame;s[x.id]!==A&&(u(x),s[x.id]=A)}function h(x){const v=d();x.__bindingPointIndex=v;const y=r.createBuffer(),P=x.__size,A=x.usage;return r.bindBuffer(r.UNIFORM_BUFFER,y),r.bufferData(r.UNIFORM_BUFFER,P,A),r.bindBuffer(r.UNIFORM_BUFFER,null),r.bindBufferBase(r.UNIFORM_BUFFER,v,y),y}function d(){for(let x=0;x<o;x++)if(a.indexOf(x)===-1)return a.push(x),x;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(x){const v=i[x.id],y=x.uniforms,P=x.__cache;r.bindBuffer(r.UNIFORM_BUFFER,v);for(let A=0,R=y.length;A<R;A++){const N=Array.isArray(y[A])?y[A]:[y[A]];for(let M=0,w=N.length;M<w;M++){const U=N[M];if(f(U,A,M,P)===!0){const V=U.__offset,J=Array.isArray(U.value)?U.value:[U.value];let L=0;for(let B=0;B<J.length;B++){const k=J[B],j=_(k);typeof k=="number"||typeof k=="boolean"?(U.__data[0]=k,r.bufferSubData(r.UNIFORM_BUFFER,V+L,U.__data)):k.isMatrix3?(U.__data[0]=k.elements[0],U.__data[1]=k.elements[1],U.__data[2]=k.elements[2],U.__data[3]=0,U.__data[4]=k.elements[3],U.__data[5]=k.elements[4],U.__data[6]=k.elements[5],U.__data[7]=0,U.__data[8]=k.elements[6],U.__data[9]=k.elements[7],U.__data[10]=k.elements[8],U.__data[11]=0):(k.toArray(U.__data,L),L+=j.storage/Float32Array.BYTES_PER_ELEMENT)}r.bufferSubData(r.UNIFORM_BUFFER,V,U.__data)}}}r.bindBuffer(r.UNIFORM_BUFFER,null)}function f(x,v,y,P){const A=x.value,R=v+"_"+y;if(P[R]===void 0)return typeof A=="number"||typeof A=="boolean"?P[R]=A:P[R]=A.clone(),!0;{const N=P[R];if(typeof A=="number"||typeof A=="boolean"){if(N!==A)return P[R]=A,!0}else if(N.equals(A)===!1)return N.copy(A),!0}return!1}function g(x){const v=x.uniforms;let y=0;const P=16;for(let R=0,N=v.length;R<N;R++){const M=Array.isArray(v[R])?v[R]:[v[R]];for(let w=0,U=M.length;w<U;w++){const V=M[w],J=Array.isArray(V.value)?V.value:[V.value];for(let L=0,B=J.length;L<B;L++){const k=J[L],j=_(k),q=y%P;q!==0&&P-q<j.boundary&&(y+=P-q),V.__data=new Float32Array(j.storage/Float32Array.BYTES_PER_ELEMENT),V.__offset=y,y+=j.storage}}}const A=y%P;return A>0&&(y+=P-A),x.__size=y,x.__cache={},this}function _(x){const v={boundary:0,storage:0};return typeof x=="number"||typeof x=="boolean"?(v.boundary=4,v.storage=4):x.isVector2?(v.boundary=8,v.storage=8):x.isVector3||x.isColor?(v.boundary=16,v.storage=12):x.isVector4?(v.boundary=16,v.storage=16):x.isMatrix3?(v.boundary=48,v.storage=48):x.isMatrix4?(v.boundary=64,v.storage=64):x.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",x),v}function m(x){const v=x.target;v.removeEventListener("dispose",m);const y=a.indexOf(v.__bindingPointIndex);a.splice(y,1),r.deleteBuffer(i[v.id]),delete i[v.id],delete s[v.id]}function p(){for(const x in i)r.deleteBuffer(i[x]);a=[],i={},s={}}return{bind:l,update:c,dispose:p}}class vc{constructor(t={}){const{canvas:e=Qh(),context:n=null,depth:i=!0,stencil:s=!0,alpha:a=!1,antialias:o=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:d=!1}=t;this.isWebGLRenderer=!0;let u;n!==null?u=n.getContextAttributes().alpha:u=a;const f=new Uint32Array(4),g=new Int32Array(4);let _=null,m=null;const p=[],x=[];this.domElement=e,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=Te,this._useLegacyLights=!1,this.toneMapping=wn,this.toneMappingExposure=1;const v=this;let y=!1,P=0,A=0,R=null,N=-1,M=null;const w=new we,U=new we;let V=null;const J=new wt(0);let L=0,B=e.width,k=e.height,j=1,q=null,$=null;const Z=new we(0,0,B,k),st=new we(0,0,B,k);let at=!1;const W=new wo;let tt=!1,pt=!1,Mt=null;const _t=new ne,Lt=new ot,Ut=new b,Et={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};function Nt(){return R===null?j:1}let C=n;function lt(T,O){for(let G=0;G<T.length;G++){const H=T[G],z=e.getContext(H,O);if(z!==null)return z}return null}try{const T={alpha:!0,depth:i,stencil:s,antialias:o,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:d};if("setAttribute"in e&&e.setAttribute("data-engine",`three.js r${xo}`),e.addEventListener("webglcontextlost",ct,!1),e.addEventListener("webglcontextrestored",I,!1),e.addEventListener("webglcontextcreationerror",dt,!1),C===null){const O=["webgl2","webgl","experimental-webgl"];if(v.isWebGL1Renderer===!0&&O.shift(),C=lt(O,T),C===null)throw lt(O)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}typeof WebGLRenderingContext<"u"&&C instanceof WebGLRenderingContext&&console.warn("THREE.WebGLRenderer: WebGL 1 support was deprecated in r153 and will be removed in r163."),C.getShaderPrecisionFormat===void 0&&(C.getShaderPrecisionFormat=function(){return{rangeMin:1,rangeMax:1,precision:1}})}catch(T){throw console.error("THREE.WebGLRenderer: "+T.message),T}let K,rt,Y,Tt,mt,E,S,F,it,et,Q,yt,ut,vt,Rt,Bt,nt,jt,Yt,Ot,bt,xt,kt,$t;function ue(){K=new pp(C),rt=new lp(C,K,t),K.init(rt),xt=new Qm(C,K,rt),Y=new Zm(C,K,rt),Tt=new _p(C),mt=new Fm,E=new Jm(C,K,Y,mt,rt,xt,Tt),S=new hp(v),F=new fp(v),it=new Au(C,rt),kt=new op(C,K,it,rt),et=new mp(C,it,Tt,kt),Q=new Sp(C,et,it,Tt),Yt=new yp(C,rt,E),Bt=new cp(mt),yt=new Um(v,S,F,K,rt,kt,Bt),ut=new i0(v,mt),vt=new zm,Rt=new Xm(K,rt),jt=new rp(v,S,F,Y,Q,u,l),nt=new $m(v,Q,rt),$t=new s0(C,Tt,rt,Y),Ot=new ap(C,K,Tt,rt),bt=new gp(C,K,Tt,rt),Tt.programs=yt.programs,v.capabilities=rt,v.extensions=K,v.properties=mt,v.renderLists=vt,v.shadowMap=nt,v.state=Y,v.info=Tt}ue();const Ht=new n0(v,C);this.xr=Ht,this.getContext=function(){return C},this.getContextAttributes=function(){return C.getContextAttributes()},this.forceContextLoss=function(){const T=K.get("WEBGL_lose_context");T&&T.loseContext()},this.forceContextRestore=function(){const T=K.get("WEBGL_lose_context");T&&T.restoreContext()},this.getPixelRatio=function(){return j},this.setPixelRatio=function(T){T!==void 0&&(j=T,this.setSize(B,k,!1))},this.getSize=function(T){return T.set(B,k)},this.setSize=function(T,O,G=!0){if(Ht.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}B=T,k=O,e.width=Math.floor(T*j),e.height=Math.floor(O*j),G===!0&&(e.style.width=T+"px",e.style.height=O+"px"),this.setViewport(0,0,T,O)},this.getDrawingBufferSize=function(T){return T.set(B*j,k*j).floor()},this.setDrawingBufferSize=function(T,O,G){B=T,k=O,j=G,e.width=Math.floor(T*G),e.height=Math.floor(O*G),this.setViewport(0,0,T,O)},this.getCurrentViewport=function(T){return T.copy(w)},this.getViewport=function(T){return T.copy(Z)},this.setViewport=function(T,O,G,H){T.isVector4?Z.set(T.x,T.y,T.z,T.w):Z.set(T,O,G,H),Y.viewport(w.copy(Z).multiplyScalar(j).floor())},this.getScissor=function(T){return T.copy(st)},this.setScissor=function(T,O,G,H){T.isVector4?st.set(T.x,T.y,T.z,T.w):st.set(T,O,G,H),Y.scissor(U.copy(st).multiplyScalar(j).floor())},this.getScissorTest=function(){return at},this.setScissorTest=function(T){Y.setScissorTest(at=T)},this.setOpaqueSort=function(T){q=T},this.setTransparentSort=function(T){$=T},this.getClearColor=function(T){return T.copy(jt.getClearColor())},this.setClearColor=function(){jt.setClearColor.apply(jt,arguments)},this.getClearAlpha=function(){return jt.getClearAlpha()},this.setClearAlpha=function(){jt.setClearAlpha.apply(jt,arguments)},this.clear=function(T=!0,O=!0,G=!0){let H=0;if(T){let z=!1;if(R!==null){const gt=R.texture.format;z=gt===Kl||gt===ql||gt===Yl}if(z){const gt=R.texture.type,At=gt===Bn||gt===On||gt===So||gt===Jn||gt===Wl||gt===Xl,Ct=jt.getClearColor(),Dt=jt.getClearAlpha(),Vt=Ct.r,Ft=Ct.g,zt=Ct.b;At?(f[0]=Vt,f[1]=Ft,f[2]=zt,f[3]=Dt,C.clearBufferuiv(C.COLOR,0,f)):(g[0]=Vt,g[1]=Ft,g[2]=zt,g[3]=Dt,C.clearBufferiv(C.COLOR,0,g))}else H|=C.COLOR_BUFFER_BIT}O&&(H|=C.DEPTH_BUFFER_BIT),G&&(H|=C.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),C.clear(H)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){e.removeEventListener("webglcontextlost",ct,!1),e.removeEventListener("webglcontextrestored",I,!1),e.removeEventListener("webglcontextcreationerror",dt,!1),vt.dispose(),Rt.dispose(),mt.dispose(),S.dispose(),F.dispose(),Q.dispose(),kt.dispose(),$t.dispose(),yt.dispose(),Ht.dispose(),Ht.removeEventListener("sessionstart",Ie),Ht.removeEventListener("sessionend",re),Mt&&(Mt.dispose(),Mt=null),De.stop()};function ct(T){T.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),y=!0}function I(){console.log("THREE.WebGLRenderer: Context Restored."),y=!1;const T=Tt.autoReset,O=nt.enabled,G=nt.autoUpdate,H=nt.needsUpdate,z=nt.type;ue(),Tt.autoReset=T,nt.enabled=O,nt.autoUpdate=G,nt.needsUpdate=H,nt.type=z}function dt(T){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",T.statusMessage)}function ft(T){const O=T.target;O.removeEventListener("dispose",ft),It(O)}function It(T){Pt(T),mt.remove(T)}function Pt(T){const O=mt.get(T).programs;O!==void 0&&(O.forEach(function(G){yt.releaseProgram(G)}),T.isShaderMaterial&&yt.releaseShaderCache(T))}this.renderBufferDirect=function(T,O,G,H,z,gt){O===null&&(O=Et);const At=z.isMesh&&z.matrixWorld.determinant()<0,Ct=Uc(T,O,G,H,z);Y.setMaterial(H,At);let Dt=G.index,Vt=1;if(H.wireframe===!0){if(Dt=et.getWireframeAttribute(G),Dt===void 0)return;Vt=2}const Ft=G.drawRange,zt=G.attributes.position;let fe=Ft.start*Vt,ke=(Ft.start+Ft.count)*Vt;gt!==null&&(fe=Math.max(fe,gt.start*Vt),ke=Math.min(ke,(gt.start+gt.count)*Vt)),Dt!==null?(fe=Math.max(fe,0),ke=Math.min(ke,Dt.count)):zt!=null&&(fe=Math.max(fe,0),ke=Math.min(ke,zt.count));const Ee=ke-fe;if(Ee<0||Ee===1/0)return;kt.setup(z,H,Ct,G,Dt);let pn,ce=Ot;if(Dt!==null&&(pn=it.get(Dt),ce=bt,ce.setIndex(pn)),z.isMesh)H.wireframe===!0?(Y.setLineWidth(H.wireframeLinewidth*Nt()),ce.setMode(C.LINES)):ce.setMode(C.TRIANGLES);else if(z.isLine){let Wt=H.linewidth;Wt===void 0&&(Wt=1),Y.setLineWidth(Wt*Nt()),z.isLineSegments?ce.setMode(C.LINES):z.isLineLoop?ce.setMode(C.LINE_LOOP):ce.setMode(C.LINE_STRIP)}else z.isPoints?ce.setMode(C.POINTS):z.isSprite&&ce.setMode(C.TRIANGLES);if(z.isBatchedMesh)ce.renderMultiDraw(z._multiDrawStarts,z._multiDrawCounts,z._multiDrawCount);else if(z.isInstancedMesh)ce.renderInstances(fe,Ee,z.count);else if(G.isInstancedBufferGeometry){const Wt=G._maxInstanceCount!==void 0?G._maxInstanceCount:1/0,ur=Math.min(G.instanceCount,Wt);ce.renderInstances(fe,Ee,ur)}else ce.render(fe,Ee)};function ie(T,O,G){T.transparent===!0&&T.side===ge&&T.forceSinglePass===!1?(T.side=Le,T.needsUpdate=!0,fs(T,O,G),T.side=bn,T.needsUpdate=!0,fs(T,O,G),T.side=ge):fs(T,O,G)}this.compile=function(T,O,G=null){G===null&&(G=T),m=Rt.get(G),m.init(),x.push(m),G.traverseVisible(function(z){z.isLight&&z.layers.test(O.layers)&&(m.pushLight(z),z.castShadow&&m.pushShadow(z))}),T!==G&&T.traverseVisible(function(z){z.isLight&&z.layers.test(O.layers)&&(m.pushLight(z),z.castShadow&&m.pushShadow(z))}),m.setupLights(v._useLegacyLights);const H=new Set;return T.traverse(function(z){const gt=z.material;if(gt)if(Array.isArray(gt))for(let At=0;At<gt.length;At++){const Ct=gt[At];ie(Ct,G,z),H.add(Ct)}else ie(gt,G,z),H.add(gt)}),x.pop(),m=null,H},this.compileAsync=function(T,O,G=null){const H=this.compile(T,O,G);return new Promise(z=>{function gt(){if(H.forEach(function(At){mt.get(At).currentProgram.isReady()&&H.delete(At)}),H.size===0){z(T);return}setTimeout(gt,10)}K.get("KHR_parallel_shader_compile")!==null?gt():setTimeout(gt,10)})};let se=null;function Me(T){se&&se(T)}function Ie(){De.stop()}function re(){De.start()}const De=new hc;De.setAnimationLoop(Me),typeof self<"u"&&De.setContext(self),this.setAnimationLoop=function(T){se=T,Ht.setAnimationLoop(T),T===null?De.stop():De.start()},Ht.addEventListener("sessionstart",Ie),Ht.addEventListener("sessionend",re),this.render=function(T,O){if(O!==void 0&&O.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(y===!0)return;T.matrixWorldAutoUpdate===!0&&T.updateMatrixWorld(),O.parent===null&&O.matrixWorldAutoUpdate===!0&&O.updateMatrixWorld(),Ht.enabled===!0&&Ht.isPresenting===!0&&(Ht.cameraAutoUpdate===!0&&Ht.updateCamera(O),O=Ht.getCamera()),T.isScene===!0&&T.onBeforeRender(v,T,O,R),m=Rt.get(T,x.length),m.init(),x.push(m),_t.multiplyMatrices(O.projectionMatrix,O.matrixWorldInverse),W.setFromProjectionMatrix(_t),pt=this.localClippingEnabled,tt=Bt.init(this.clippingPlanes,pt),_=vt.get(T,p.length),_.init(),p.push(_),ln(T,O,0,v.sortObjects),_.finish(),v.sortObjects===!0&&_.sort(q,$),this.info.render.frame++,tt===!0&&Bt.beginShadows();const G=m.state.shadowsArray;if(nt.render(G,T,O),tt===!0&&Bt.endShadows(),this.info.autoReset===!0&&this.info.reset(),jt.render(_,T),m.setupLights(v._useLegacyLights),O.isArrayCamera){const H=O.cameras;for(let z=0,gt=H.length;z<gt;z++){const At=H[z];Bo(_,T,At,At.viewport)}}else Bo(_,T,O);R!==null&&(E.updateMultisampleRenderTarget(R),E.updateRenderTargetMipmap(R)),T.isScene===!0&&T.onAfterRender(v,T,O),kt.resetDefaultState(),N=-1,M=null,x.pop(),x.length>0?m=x[x.length-1]:m=null,p.pop(),p.length>0?_=p[p.length-1]:_=null};function ln(T,O,G,H){if(T.visible===!1)return;if(T.layers.test(O.layers)){if(T.isGroup)G=T.renderOrder;else if(T.isLOD)T.autoUpdate===!0&&T.update(O);else if(T.isLight)m.pushLight(T),T.castShadow&&m.pushShadow(T);else if(T.isSprite){if(!T.frustumCulled||W.intersectsSprite(T)){H&&Ut.setFromMatrixPosition(T.matrixWorld).applyMatrix4(_t);const At=Q.update(T),Ct=T.material;Ct.visible&&_.push(T,At,Ct,G,Ut.z,null)}}else if((T.isMesh||T.isLine||T.isPoints)&&(!T.frustumCulled||W.intersectsObject(T))){const At=Q.update(T),Ct=T.material;if(H&&(T.boundingSphere!==void 0?(T.boundingSphere===null&&T.computeBoundingSphere(),Ut.copy(T.boundingSphere.center)):(At.boundingSphere===null&&At.computeBoundingSphere(),Ut.copy(At.boundingSphere.center)),Ut.applyMatrix4(T.matrixWorld).applyMatrix4(_t)),Array.isArray(Ct)){const Dt=At.groups;for(let Vt=0,Ft=Dt.length;Vt<Ft;Vt++){const zt=Dt[Vt],fe=Ct[zt.materialIndex];fe&&fe.visible&&_.push(T,At,fe,G,Ut.z,zt)}}else Ct.visible&&_.push(T,At,Ct,G,Ut.z,null)}}const gt=T.children;for(let At=0,Ct=gt.length;At<Ct;At++)ln(gt[At],O,G,H)}function Bo(T,O,G,H){const z=T.opaque,gt=T.transmissive,At=T.transparent;m.setupLightsView(G),tt===!0&&Bt.setGlobalState(v.clippingPlanes,G),gt.length>0&&Oc(z,gt,O,G),H&&Y.viewport(w.copy(H)),z.length>0&&ds(z,O,G),gt.length>0&&ds(gt,O,G),At.length>0&&ds(At,O,G),Y.buffers.depth.setTest(!0),Y.buffers.depth.setMask(!0),Y.buffers.color.setMask(!0),Y.setPolygonOffset(!1)}function Oc(T,O,G,H){if((G.isScene===!0?G.overrideMaterial:null)!==null)return;const gt=rt.isWebGL2;Mt===null&&(Mt=new ei(1,1,{generateMipmaps:!0,type:K.has("EXT_color_buffer_half_float")?os:Bn,minFilter:rs,samples:gt?4:0})),v.getDrawingBufferSize(Lt),gt?Mt.setSize(Lt.x,Lt.y):Mt.setSize(sr(Lt.x),sr(Lt.y));const At=v.getRenderTarget();v.setRenderTarget(Mt),v.getClearColor(J),L=v.getClearAlpha(),L<1&&v.setClearColor(16777215,.5),v.clear();const Ct=v.toneMapping;v.toneMapping=wn,ds(T,G,H),E.updateMultisampleRenderTarget(Mt),E.updateRenderTargetMipmap(Mt);let Dt=!1;for(let Vt=0,Ft=O.length;Vt<Ft;Vt++){const zt=O[Vt],fe=zt.object,ke=zt.geometry,Ee=zt.material,pn=zt.group;if(Ee.side===ge&&fe.layers.test(H.layers)){const ce=Ee.side;Ee.side=Le,Ee.needsUpdate=!0,zo(fe,G,H,ke,Ee,pn),Ee.side=ce,Ee.needsUpdate=!0,Dt=!0}}Dt===!0&&(E.updateMultisampleRenderTarget(Mt),E.updateRenderTargetMipmap(Mt)),v.setRenderTarget(At),v.setClearColor(J,L),v.toneMapping=Ct}function ds(T,O,G){const H=O.isScene===!0?O.overrideMaterial:null;for(let z=0,gt=T.length;z<gt;z++){const At=T[z],Ct=At.object,Dt=At.geometry,Vt=H===null?At.material:H,Ft=At.group;Ct.layers.test(G.layers)&&zo(Ct,O,G,Dt,Vt,Ft)}}function zo(T,O,G,H,z,gt){T.onBeforeRender(v,O,G,H,z,gt),T.modelViewMatrix.multiplyMatrices(G.matrixWorldInverse,T.matrixWorld),T.normalMatrix.getNormalMatrix(T.modelViewMatrix),z.onBeforeRender(v,O,G,H,T,gt),z.transparent===!0&&z.side===ge&&z.forceSinglePass===!1?(z.side=Le,z.needsUpdate=!0,v.renderBufferDirect(G,O,H,z,T,gt),z.side=bn,z.needsUpdate=!0,v.renderBufferDirect(G,O,H,z,T,gt),z.side=ge):v.renderBufferDirect(G,O,H,z,T,gt),T.onAfterRender(v,O,G,H,z,gt)}function fs(T,O,G){O.isScene!==!0&&(O=Et);const H=mt.get(T),z=m.state.lights,gt=m.state.shadowsArray,At=z.state.version,Ct=yt.getParameters(T,z.state,gt,O,G),Dt=yt.getProgramCacheKey(Ct);let Vt=H.programs;H.environment=T.isMeshStandardMaterial?O.environment:null,H.fog=O.fog,H.envMap=(T.isMeshStandardMaterial?F:S).get(T.envMap||H.environment),Vt===void 0&&(T.addEventListener("dispose",ft),Vt=new Map,H.programs=Vt);let Ft=Vt.get(Dt);if(Ft!==void 0){if(H.currentProgram===Ft&&H.lightsStateVersion===At)return Go(T,Ct),Ft}else Ct.uniforms=yt.getUniforms(T),T.onBuild(G,Ct,v),T.onBeforeCompile(Ct,v),Ft=yt.acquireProgram(Ct,Dt),Vt.set(Dt,Ft),H.uniforms=Ct.uniforms;const zt=H.uniforms;return(!T.isShaderMaterial&&!T.isRawShaderMaterial||T.clipping===!0)&&(zt.clippingPlanes=Bt.uniform),Go(T,Ct),H.needsLights=Bc(T),H.lightsStateVersion=At,H.needsLights&&(zt.ambientLightColor.value=z.state.ambient,zt.lightProbe.value=z.state.probe,zt.directionalLights.value=z.state.directional,zt.directionalLightShadows.value=z.state.directionalShadow,zt.spotLights.value=z.state.spot,zt.spotLightShadows.value=z.state.spotShadow,zt.rectAreaLights.value=z.state.rectArea,zt.ltc_1.value=z.state.rectAreaLTC1,zt.ltc_2.value=z.state.rectAreaLTC2,zt.pointLights.value=z.state.point,zt.pointLightShadows.value=z.state.pointShadow,zt.hemisphereLights.value=z.state.hemi,zt.directionalShadowMap.value=z.state.directionalShadowMap,zt.directionalShadowMatrix.value=z.state.directionalShadowMatrix,zt.spotShadowMap.value=z.state.spotShadowMap,zt.spotLightMatrix.value=z.state.spotLightMatrix,zt.spotLightMap.value=z.state.spotLightMap,zt.pointShadowMap.value=z.state.pointShadowMap,zt.pointShadowMatrix.value=z.state.pointShadowMatrix),H.currentProgram=Ft,H.uniformsList=null,Ft}function ko(T){if(T.uniformsList===null){const O=T.currentProgram.getUniforms();T.uniformsList=Zs.seqWithValue(O.seq,T.uniforms)}return T.uniformsList}function Go(T,O){const G=mt.get(T);G.outputColorSpace=O.outputColorSpace,G.batching=O.batching,G.instancing=O.instancing,G.instancingColor=O.instancingColor,G.skinning=O.skinning,G.morphTargets=O.morphTargets,G.morphNormals=O.morphNormals,G.morphColors=O.morphColors,G.morphTargetsCount=O.morphTargetsCount,G.numClippingPlanes=O.numClippingPlanes,G.numIntersection=O.numClipIntersection,G.vertexAlphas=O.vertexAlphas,G.vertexTangents=O.vertexTangents,G.toneMapping=O.toneMapping}function Uc(T,O,G,H,z){O.isScene!==!0&&(O=Et),E.resetTextureUnits();const gt=O.fog,At=H.isMeshStandardMaterial?O.environment:null,Ct=R===null?v.outputColorSpace:R.isXRRenderTarget===!0?R.texture.colorSpace:Rn,Dt=(H.isMeshStandardMaterial?F:S).get(H.envMap||At),Vt=H.vertexColors===!0&&!!G.attributes.color&&G.attributes.color.itemSize===4,Ft=!!G.attributes.tangent&&(!!H.normalMap||H.anisotropy>0),zt=!!G.morphAttributes.position,fe=!!G.morphAttributes.normal,ke=!!G.morphAttributes.color;let Ee=wn;H.toneMapped&&(R===null||R.isXRRenderTarget===!0)&&(Ee=v.toneMapping);const pn=G.morphAttributes.position||G.morphAttributes.normal||G.morphAttributes.color,ce=pn!==void 0?pn.length:0,Wt=mt.get(H),ur=m.state.lights;if(tt===!0&&(pt===!0||T!==M)){const Xe=T===M&&H.id===N;Bt.setState(H,T,Xe)}let de=!1;H.version===Wt.__version?(Wt.needsLights&&Wt.lightsStateVersion!==ur.state.version||Wt.outputColorSpace!==Ct||z.isBatchedMesh&&Wt.batching===!1||!z.isBatchedMesh&&Wt.batching===!0||z.isInstancedMesh&&Wt.instancing===!1||!z.isInstancedMesh&&Wt.instancing===!0||z.isSkinnedMesh&&Wt.skinning===!1||!z.isSkinnedMesh&&Wt.skinning===!0||z.isInstancedMesh&&Wt.instancingColor===!0&&z.instanceColor===null||z.isInstancedMesh&&Wt.instancingColor===!1&&z.instanceColor!==null||Wt.envMap!==Dt||H.fog===!0&&Wt.fog!==gt||Wt.numClippingPlanes!==void 0&&(Wt.numClippingPlanes!==Bt.numPlanes||Wt.numIntersection!==Bt.numIntersection)||Wt.vertexAlphas!==Vt||Wt.vertexTangents!==Ft||Wt.morphTargets!==zt||Wt.morphNormals!==fe||Wt.morphColors!==ke||Wt.toneMapping!==Ee||rt.isWebGL2===!0&&Wt.morphTargetsCount!==ce)&&(de=!0):(de=!0,Wt.__version=H.version);let Gn=Wt.currentProgram;de===!0&&(Gn=fs(H,O,z));let Vo=!1,Xi=!1,dr=!1;const be=Gn.getUniforms(),Vn=Wt.uniforms;if(Y.useProgram(Gn.program)&&(Vo=!0,Xi=!0,dr=!0),H.id!==N&&(N=H.id,Xi=!0),Vo||M!==T){be.setValue(C,"projectionMatrix",T.projectionMatrix),be.setValue(C,"viewMatrix",T.matrixWorldInverse);const Xe=be.map.cameraPosition;Xe!==void 0&&Xe.setValue(C,Ut.setFromMatrixPosition(T.matrixWorld)),rt.logarithmicDepthBuffer&&be.setValue(C,"logDepthBufFC",2/(Math.log(T.far+1)/Math.LN2)),(H.isMeshPhongMaterial||H.isMeshToonMaterial||H.isMeshLambertMaterial||H.isMeshBasicMaterial||H.isMeshStandardMaterial||H.isShaderMaterial)&&be.setValue(C,"isOrthographic",T.isOrthographicCamera===!0),M!==T&&(M=T,Xi=!0,dr=!0)}if(z.isSkinnedMesh){be.setOptional(C,z,"bindMatrix"),be.setOptional(C,z,"bindMatrixInverse");const Xe=z.skeleton;Xe&&(rt.floatVertexTextures?(Xe.boneTexture===null&&Xe.computeBoneTexture(),be.setValue(C,"boneTexture",Xe.boneTexture,E)):console.warn("THREE.WebGLRenderer: SkinnedMesh can only be used with WebGL 2. With WebGL 1 OES_texture_float and vertex textures support is required."))}z.isBatchedMesh&&(be.setOptional(C,z,"batchingTexture"),be.setValue(C,"batchingTexture",z._matricesTexture,E));const fr=G.morphAttributes;if((fr.position!==void 0||fr.normal!==void 0||fr.color!==void 0&&rt.isWebGL2===!0)&&Yt.update(z,G,Gn),(Xi||Wt.receiveShadow!==z.receiveShadow)&&(Wt.receiveShadow=z.receiveShadow,be.setValue(C,"receiveShadow",z.receiveShadow)),H.isMeshGouraudMaterial&&H.envMap!==null&&(Vn.envMap.value=Dt,Vn.flipEnvMap.value=Dt.isCubeTexture&&Dt.isRenderTargetTexture===!1?-1:1),Xi&&(be.setValue(C,"toneMappingExposure",v.toneMappingExposure),Wt.needsLights&&Fc(Vn,dr),gt&&H.fog===!0&&ut.refreshFogUniforms(Vn,gt),ut.refreshMaterialUniforms(Vn,H,j,k,Mt),Zs.upload(C,ko(Wt),Vn,E)),H.isShaderMaterial&&H.uniformsNeedUpdate===!0&&(Zs.upload(C,ko(Wt),Vn,E),H.uniformsNeedUpdate=!1),H.isSpriteMaterial&&be.setValue(C,"center",z.center),be.setValue(C,"modelViewMatrix",z.modelViewMatrix),be.setValue(C,"normalMatrix",z.normalMatrix),be.setValue(C,"modelMatrix",z.matrixWorld),H.isShaderMaterial||H.isRawShaderMaterial){const Xe=H.uniformsGroups;for(let pr=0,zc=Xe.length;pr<zc;pr++)if(rt.isWebGL2){const Ho=Xe[pr];$t.update(Ho,Gn),$t.bind(Ho,Gn)}else console.warn("THREE.WebGLRenderer: Uniform Buffer Objects can only be used with WebGL 2.")}return Gn}function Fc(T,O){T.ambientLightColor.needsUpdate=O,T.lightProbe.needsUpdate=O,T.directionalLights.needsUpdate=O,T.directionalLightShadows.needsUpdate=O,T.pointLights.needsUpdate=O,T.pointLightShadows.needsUpdate=O,T.spotLights.needsUpdate=O,T.spotLightShadows.needsUpdate=O,T.rectAreaLights.needsUpdate=O,T.hemisphereLights.needsUpdate=O}function Bc(T){return T.isMeshLambertMaterial||T.isMeshToonMaterial||T.isMeshPhongMaterial||T.isMeshStandardMaterial||T.isShadowMaterial||T.isShaderMaterial&&T.lights===!0}this.getActiveCubeFace=function(){return P},this.getActiveMipmapLevel=function(){return A},this.getRenderTarget=function(){return R},this.setRenderTargetTextures=function(T,O,G){mt.get(T.texture).__webglTexture=O,mt.get(T.depthTexture).__webglTexture=G;const H=mt.get(T);H.__hasExternalTextures=!0,H.__hasExternalTextures&&(H.__autoAllocateDepthBuffer=G===void 0,H.__autoAllocateDepthBuffer||K.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),H.__useRenderToTexture=!1))},this.setRenderTargetFramebuffer=function(T,O){const G=mt.get(T);G.__webglFramebuffer=O,G.__useDefaultFramebuffer=O===void 0},this.setRenderTarget=function(T,O=0,G=0){R=T,P=O,A=G;let H=!0,z=null,gt=!1,At=!1;if(T){const Dt=mt.get(T);Dt.__useDefaultFramebuffer!==void 0?(Y.bindFramebuffer(C.FRAMEBUFFER,null),H=!1):Dt.__webglFramebuffer===void 0?E.setupRenderTarget(T):Dt.__hasExternalTextures&&E.rebindTextures(T,mt.get(T.texture).__webglTexture,mt.get(T.depthTexture).__webglTexture);const Vt=T.texture;(Vt.isData3DTexture||Vt.isDataArrayTexture||Vt.isCompressedArrayTexture)&&(At=!0);const Ft=mt.get(T).__webglFramebuffer;T.isWebGLCubeRenderTarget?(Array.isArray(Ft[O])?z=Ft[O][G]:z=Ft[O],gt=!0):rt.isWebGL2&&T.samples>0&&E.useMultisampledRTT(T)===!1?z=mt.get(T).__webglMultisampledFramebuffer:Array.isArray(Ft)?z=Ft[G]:z=Ft,w.copy(T.viewport),U.copy(T.scissor),V=T.scissorTest}else w.copy(Z).multiplyScalar(j).floor(),U.copy(st).multiplyScalar(j).floor(),V=at;if(Y.bindFramebuffer(C.FRAMEBUFFER,z)&&rt.drawBuffers&&H&&Y.drawBuffers(T,z),Y.viewport(w),Y.scissor(U),Y.setScissorTest(V),gt){const Dt=mt.get(T.texture);C.framebufferTexture2D(C.FRAMEBUFFER,C.COLOR_ATTACHMENT0,C.TEXTURE_CUBE_MAP_POSITIVE_X+O,Dt.__webglTexture,G)}else if(At){const Dt=mt.get(T.texture),Vt=O||0;C.framebufferTextureLayer(C.FRAMEBUFFER,C.COLOR_ATTACHMENT0,Dt.__webglTexture,G||0,Vt)}N=-1},this.readRenderTargetPixels=function(T,O,G,H,z,gt,At){if(!(T&&T.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ct=mt.get(T).__webglFramebuffer;if(T.isWebGLCubeRenderTarget&&At!==void 0&&(Ct=Ct[At]),Ct){Y.bindFramebuffer(C.FRAMEBUFFER,Ct);try{const Dt=T.texture,Vt=Dt.format,Ft=Dt.type;if(Vt!==an&&xt.convert(Vt)!==C.getParameter(C.IMPLEMENTATION_COLOR_READ_FORMAT)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}const zt=Ft===os&&(K.has("EXT_color_buffer_half_float")||rt.isWebGL2&&K.has("EXT_color_buffer_float"));if(Ft!==Bn&&xt.convert(Ft)!==C.getParameter(C.IMPLEMENTATION_COLOR_READ_TYPE)&&!(Ft===Un&&(rt.isWebGL2||K.has("OES_texture_float")||K.has("WEBGL_color_buffer_float")))&&!zt){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}O>=0&&O<=T.width-H&&G>=0&&G<=T.height-z&&C.readPixels(O,G,H,z,xt.convert(Vt),xt.convert(Ft),gt)}finally{const Dt=R!==null?mt.get(R).__webglFramebuffer:null;Y.bindFramebuffer(C.FRAMEBUFFER,Dt)}}},this.copyFramebufferToTexture=function(T,O,G=0){const H=Math.pow(2,-G),z=Math.floor(O.image.width*H),gt=Math.floor(O.image.height*H);E.setTexture2D(O,0),C.copyTexSubImage2D(C.TEXTURE_2D,G,0,0,T.x,T.y,z,gt),Y.unbindTexture()},this.copyTextureToTexture=function(T,O,G,H=0){const z=O.image.width,gt=O.image.height,At=xt.convert(G.format),Ct=xt.convert(G.type);E.setTexture2D(G,0),C.pixelStorei(C.UNPACK_FLIP_Y_WEBGL,G.flipY),C.pixelStorei(C.UNPACK_PREMULTIPLY_ALPHA_WEBGL,G.premultiplyAlpha),C.pixelStorei(C.UNPACK_ALIGNMENT,G.unpackAlignment),O.isDataTexture?C.texSubImage2D(C.TEXTURE_2D,H,T.x,T.y,z,gt,At,Ct,O.image.data):O.isCompressedTexture?C.compressedTexSubImage2D(C.TEXTURE_2D,H,T.x,T.y,O.mipmaps[0].width,O.mipmaps[0].height,At,O.mipmaps[0].data):C.texSubImage2D(C.TEXTURE_2D,H,T.x,T.y,At,Ct,O.image),H===0&&G.generateMipmaps&&C.generateMipmap(C.TEXTURE_2D),Y.unbindTexture()},this.copyTextureToTexture3D=function(T,O,G,H,z=0){if(v.isWebGL1Renderer){console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: can only be used with WebGL2.");return}const gt=T.max.x-T.min.x+1,At=T.max.y-T.min.y+1,Ct=T.max.z-T.min.z+1,Dt=xt.convert(H.format),Vt=xt.convert(H.type);let Ft;if(H.isData3DTexture)E.setTexture3D(H,0),Ft=C.TEXTURE_3D;else if(H.isDataArrayTexture||H.isCompressedArrayTexture)E.setTexture2DArray(H,0),Ft=C.TEXTURE_2D_ARRAY;else{console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: only supports THREE.DataTexture3D and THREE.DataTexture2DArray.");return}C.pixelStorei(C.UNPACK_FLIP_Y_WEBGL,H.flipY),C.pixelStorei(C.UNPACK_PREMULTIPLY_ALPHA_WEBGL,H.premultiplyAlpha),C.pixelStorei(C.UNPACK_ALIGNMENT,H.unpackAlignment);const zt=C.getParameter(C.UNPACK_ROW_LENGTH),fe=C.getParameter(C.UNPACK_IMAGE_HEIGHT),ke=C.getParameter(C.UNPACK_SKIP_PIXELS),Ee=C.getParameter(C.UNPACK_SKIP_ROWS),pn=C.getParameter(C.UNPACK_SKIP_IMAGES),ce=G.isCompressedTexture?G.mipmaps[z]:G.image;C.pixelStorei(C.UNPACK_ROW_LENGTH,ce.width),C.pixelStorei(C.UNPACK_IMAGE_HEIGHT,ce.height),C.pixelStorei(C.UNPACK_SKIP_PIXELS,T.min.x),C.pixelStorei(C.UNPACK_SKIP_ROWS,T.min.y),C.pixelStorei(C.UNPACK_SKIP_IMAGES,T.min.z),G.isDataTexture||G.isData3DTexture?C.texSubImage3D(Ft,z,O.x,O.y,O.z,gt,At,Ct,Dt,Vt,ce.data):G.isCompressedArrayTexture?(console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: untested support for compressed srcTexture."),C.compressedTexSubImage3D(Ft,z,O.x,O.y,O.z,gt,At,Ct,Dt,ce.data)):C.texSubImage3D(Ft,z,O.x,O.y,O.z,gt,At,Ct,Dt,Vt,ce),C.pixelStorei(C.UNPACK_ROW_LENGTH,zt),C.pixelStorei(C.UNPACK_IMAGE_HEIGHT,fe),C.pixelStorei(C.UNPACK_SKIP_PIXELS,ke),C.pixelStorei(C.UNPACK_SKIP_ROWS,Ee),C.pixelStorei(C.UNPACK_SKIP_IMAGES,pn),z===0&&H.generateMipmaps&&C.generateMipmap(Ft),Y.unbindTexture()},this.initTexture=function(T){T.isCubeTexture?E.setTextureCube(T,0):T.isData3DTexture?E.setTexture3D(T,0):T.isDataArrayTexture||T.isCompressedArrayTexture?E.setTexture2DArray(T,0):E.setTexture2D(T,0),Y.unbindTexture()},this.resetState=function(){P=0,A=0,R=null,Y.reset(),kt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Tn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const e=this.getContext();e.drawingBufferColorSpace=t===Eo?"display-p3":"srgb",e.unpackColorSpace=te.workingColorSpace===ar?"display-p3":"srgb"}get outputEncoding(){return console.warn("THREE.WebGLRenderer: Property .outputEncoding has been removed. Use .outputColorSpace instead."),this.outputColorSpace===Te?ti:$l}set outputEncoding(t){console.warn("THREE.WebGLRenderer: Property .outputEncoding has been removed. Use .outputColorSpace instead."),this.outputColorSpace=t===ti?Te:Rn}get useLegacyLights(){return console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights}set useLegacyLights(t){console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights=t}}class r0 extends vc{}r0.prototype.isWebGL1Renderer=!0;class Ro{constructor(t,e=1,n=1e3){this.isFog=!0,this.name="",this.color=new wt(t),this.near=e,this.far=n}clone(){return new Ro(this.color,this.near,this.far)}toJSON(){return{type:"Fog",name:this.name,color:this.color.getHex(),near:this.near,far:this.far}}}class o0 extends ee{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(e.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(e.object.backgroundIntensity=this.backgroundIntensity),e}}class hl extends tn{constructor(t,e,n,i=1){super(t,e,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=i}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}toJSON(){const t=super.toJSON();return t.meshPerAttribute=this.meshPerAttribute,t.isInstancedBufferAttribute=!0,t}}const Ai=new ne,ul=new ne,Us=[],dl=new We,a0=new ne,$i=new X,Zi=new dn;class xc extends X{constructor(t,e,n){super(t,e),this.isInstancedMesh=!0,this.instanceMatrix=new hl(new Float32Array(n*16),16),this.instanceColor=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let i=0;i<n;i++)this.setMatrixAt(i,a0)}computeBoundingBox(){const t=this.geometry,e=this.count;this.boundingBox===null&&(this.boundingBox=new We),t.boundingBox===null&&t.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Ai),dl.copy(t.boundingBox).applyMatrix4(Ai),this.boundingBox.union(dl)}computeBoundingSphere(){const t=this.geometry,e=this.count;this.boundingSphere===null&&(this.boundingSphere=new dn),t.boundingSphere===null&&t.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<e;n++)this.getMatrixAt(n,Ai),Zi.copy(t.boundingSphere).applyMatrix4(Ai),this.boundingSphere.union(Zi)}copy(t,e){return super.copy(t,e),this.instanceMatrix.copy(t.instanceMatrix),t.instanceColor!==null&&(this.instanceColor=t.instanceColor.clone()),this.count=t.count,t.boundingBox!==null&&(this.boundingBox=t.boundingBox.clone()),t.boundingSphere!==null&&(this.boundingSphere=t.boundingSphere.clone()),this}getColorAt(t,e){e.fromArray(this.instanceColor.array,t*3)}getMatrixAt(t,e){e.fromArray(this.instanceMatrix.array,t*16)}raycast(t,e){const n=this.matrixWorld,i=this.count;if($i.geometry=this.geometry,$i.material=this.material,$i.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Zi.copy(this.boundingSphere),Zi.applyMatrix4(n),t.ray.intersectsSphere(Zi)!==!1))for(let s=0;s<i;s++){this.getMatrixAt(s,Ai),ul.multiplyMatrices(n,Ai),$i.matrixWorld=ul,$i.raycast(t,Us);for(let a=0,o=Us.length;a<o;a++){const l=Us[a];l.instanceId=s,l.object=this,e.push(l)}Us.length=0}}setColorAt(t,e){this.instanceColor===null&&(this.instanceColor=new hl(new Float32Array(this.instanceMatrix.count*3),3)),e.toArray(this.instanceColor.array,t*3)}setMatrixAt(t,e){e.toArray(this.instanceMatrix.array,t*16)}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"})}}class ts extends un{constructor(t){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new wt(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.linewidth=t.linewidth,this.linecap=t.linecap,this.linejoin=t.linejoin,this.fog=t.fog,this}}const fl=new b,pl=new b,ml=new ne,Hr=new To,Fs=new dn;class l0 extends ee{constructor(t=new _e,e=new ts){super(),this.isLine=!0,this.type="Line",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}computeLineDistances(){const t=this.geometry;if(t.index===null){const e=t.attributes.position,n=[0];for(let i=1,s=e.count;i<s;i++)fl.fromBufferAttribute(e,i-1),pl.fromBufferAttribute(e,i),n[i]=n[i-1],n[i]+=fl.distanceTo(pl);t.setAttribute("lineDistance",new Kt(n,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(t,e){const n=this.geometry,i=this.matrixWorld,s=t.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Fs.copy(n.boundingSphere),Fs.applyMatrix4(i),Fs.radius+=s,t.ray.intersectsSphere(Fs)===!1)return;ml.copy(i).invert(),Hr.copy(t.ray).applyMatrix4(ml);const o=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=new b,h=new b,d=new b,u=new b,f=this.isLineSegments?2:1,g=n.index,m=n.attributes.position;if(g!==null){const p=Math.max(0,a.start),x=Math.min(g.count,a.start+a.count);for(let v=p,y=x-1;v<y;v+=f){const P=g.getX(v),A=g.getX(v+1);if(c.fromBufferAttribute(m,P),h.fromBufferAttribute(m,A),Hr.distanceSqToSegment(c,h,u,d)>l)continue;u.applyMatrix4(this.matrixWorld);const N=t.ray.origin.distanceTo(u);N<t.near||N>t.far||e.push({distance:N,point:d.clone().applyMatrix4(this.matrixWorld),index:v,face:null,faceIndex:null,object:this})}}else{const p=Math.max(0,a.start),x=Math.min(m.count,a.start+a.count);for(let v=p,y=x-1;v<y;v+=f){if(c.fromBufferAttribute(m,v),h.fromBufferAttribute(m,v+1),Hr.distanceSqToSegment(c,h,u,d)>l)continue;u.applyMatrix4(this.matrixWorld);const A=t.ray.origin.distanceTo(u);A<t.near||A>t.far||e.push({distance:A,point:d.clone().applyMatrix4(this.matrixWorld),index:v,face:null,faceIndex:null,object:this})}}}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const i=e[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=i.length;s<a;s++){const o=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}}const gl=new b,_l=new b;class ho extends l0{constructor(t,e){super(t,e),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const t=this.geometry;if(t.index===null){const e=t.attributes.position,n=[];for(let i=0,s=e.count;i<s;i+=2)gl.fromBufferAttribute(e,i),_l.fromBufferAttribute(e,i+1),n[i]=i===0?0:n[i-1],n[i+1]=n[i]+gl.distanceTo(_l);t.setAttribute("lineDistance",new Kt(n,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class Ci extends un{constructor(t){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new wt(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.alphaMap=t.alphaMap,this.size=t.size,this.sizeAttenuation=t.sizeAttenuation,this.fog=t.fog,this}}const vl=new ne,uo=new To,Bs=new dn,zs=new b;class Js extends ee{constructor(t=new _e,e=new Ci){super(),this.isPoints=!0,this.type="Points",this.geometry=t,this.material=e,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}raycast(t,e){const n=this.geometry,i=this.matrixWorld,s=t.params.Points.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Bs.copy(n.boundingSphere),Bs.applyMatrix4(i),Bs.radius+=s,t.ray.intersectsSphere(Bs)===!1)return;vl.copy(i).invert(),uo.copy(t.ray).applyMatrix4(vl);const o=s/((this.scale.x+this.scale.y+this.scale.z)/3),l=o*o,c=n.index,d=n.attributes.position;if(c!==null){const u=Math.max(0,a.start),f=Math.min(c.count,a.start+a.count);for(let g=u,_=f;g<_;g++){const m=c.getX(g);zs.fromBufferAttribute(d,m),xl(zs,m,l,i,t,e,this)}}else{const u=Math.max(0,a.start),f=Math.min(d.count,a.start+a.count);for(let g=u,_=f;g<_;g++)zs.fromBufferAttribute(d,g),xl(zs,g,l,i,t,e,this)}}updateMorphTargets(){const e=this.geometry.morphAttributes,n=Object.keys(e);if(n.length>0){const i=e[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=i.length;s<a;s++){const o=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}}function xl(r,t,e,n,i,s,a){const o=uo.distanceSqToPoint(r);if(o<e){const l=new b;uo.closestPointToPoint(r,l),l.applyMatrix4(n);const c=i.ray.origin.distanceTo(l);if(c<i.near||c>i.far)return;s.push({distance:c,distanceToRay:Math.sqrt(o),point:l,index:t,face:null,object:a})}}class c0 extends Fe{constructor(t,e,n,i,s,a,o,l,c){super(t,e,n,i,s,a,o,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}}class fn{constructor(){this.type="Curve",this.arcLengthDivisions=200}getPoint(){return console.warn("THREE.Curve: .getPoint() not implemented."),null}getPointAt(t,e){const n=this.getUtoTmapping(t);return this.getPoint(n,e)}getPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return e}getSpacedPoints(t=5){const e=[];for(let n=0;n<=t;n++)e.push(this.getPointAt(n/t));return e}getLength(){const t=this.getLengths();return t[t.length-1]}getLengths(t=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===t+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;const e=[];let n,i=this.getPoint(0),s=0;e.push(0);for(let a=1;a<=t;a++)n=this.getPoint(a/t),s+=n.distanceTo(i),e.push(s),i=n;return this.cacheArcLengths=e,e}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(t,e){const n=this.getLengths();let i=0;const s=n.length;let a;e?a=e:a=t*n[s-1];let o=0,l=s-1,c;for(;o<=l;)if(i=Math.floor(o+(l-o)/2),c=n[i]-a,c<0)o=i+1;else if(c>0)l=i-1;else{l=i;break}if(i=l,n[i]===a)return i/(s-1);const h=n[i],u=n[i+1]-h,f=(a-h)/u;return(i+f)/(s-1)}getTangent(t,e){let i=t-1e-4,s=t+1e-4;i<0&&(i=0),s>1&&(s=1);const a=this.getPoint(i),o=this.getPoint(s),l=e||(a.isVector2?new ot:new b);return l.copy(o).sub(a).normalize(),l}getTangentAt(t,e){const n=this.getUtoTmapping(t);return this.getTangent(n,e)}computeFrenetFrames(t,e){const n=new b,i=[],s=[],a=[],o=new b,l=new ne;for(let f=0;f<=t;f++){const g=f/t;i[f]=this.getTangentAt(g,new b)}s[0]=new b,a[0]=new b;let c=Number.MAX_VALUE;const h=Math.abs(i[0].x),d=Math.abs(i[0].y),u=Math.abs(i[0].z);h<=c&&(c=h,n.set(1,0,0)),d<=c&&(c=d,n.set(0,1,0)),u<=c&&n.set(0,0,1),o.crossVectors(i[0],n).normalize(),s[0].crossVectors(i[0],o),a[0].crossVectors(i[0],s[0]);for(let f=1;f<=t;f++){if(s[f]=s[f-1].clone(),a[f]=a[f-1].clone(),o.crossVectors(i[f-1],i[f]),o.length()>Number.EPSILON){o.normalize();const g=Math.acos(ve(i[f-1].dot(i[f]),-1,1));s[f].applyMatrix4(l.makeRotationAxis(o,g))}a[f].crossVectors(i[f],s[f])}if(e===!0){let f=Math.acos(ve(s[0].dot(s[t]),-1,1));f/=t,i[0].dot(o.crossVectors(s[0],s[t]))>0&&(f=-f);for(let g=1;g<=t;g++)s[g].applyMatrix4(l.makeRotationAxis(i[g],f*g)),a[g].crossVectors(i[g],s[g])}return{tangents:i,normals:s,binormals:a}}clone(){return new this.constructor().copy(this)}copy(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}toJSON(){const t={metadata:{version:4.6,type:"Curve",generator:"Curve.toJSON"}};return t.arcLengthDivisions=this.arcLengthDivisions,t.type=this.type,t}fromJSON(t){return this.arcLengthDivisions=t.arcLengthDivisions,this}}class Po extends fn{constructor(t=0,e=0,n=1,i=1,s=0,a=Math.PI*2,o=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=t,this.aY=e,this.xRadius=n,this.yRadius=i,this.aStartAngle=s,this.aEndAngle=a,this.aClockwise=o,this.aRotation=l}getPoint(t,e){const n=e||new ot,i=Math.PI*2;let s=this.aEndAngle-this.aStartAngle;const a=Math.abs(s)<Number.EPSILON;for(;s<0;)s+=i;for(;s>i;)s-=i;s<Number.EPSILON&&(a?s=0:s=i),this.aClockwise===!0&&!a&&(s===i?s=-i:s=s-i);const o=this.aStartAngle+t*s;let l=this.aX+this.xRadius*Math.cos(o),c=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){const h=Math.cos(this.aRotation),d=Math.sin(this.aRotation),u=l-this.aX,f=c-this.aY;l=u*h-f*d+this.aX,c=u*d+f*h+this.aY}return n.set(l,c)}copy(t){return super.copy(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}toJSON(){const t=super.toJSON();return t.aX=this.aX,t.aY=this.aY,t.xRadius=this.xRadius,t.yRadius=this.yRadius,t.aStartAngle=this.aStartAngle,t.aEndAngle=this.aEndAngle,t.aClockwise=this.aClockwise,t.aRotation=this.aRotation,t}fromJSON(t){return super.fromJSON(t),this.aX=t.aX,this.aY=t.aY,this.xRadius=t.xRadius,this.yRadius=t.yRadius,this.aStartAngle=t.aStartAngle,this.aEndAngle=t.aEndAngle,this.aClockwise=t.aClockwise,this.aRotation=t.aRotation,this}}class h0 extends Po{constructor(t,e,n,i,s,a){super(t,e,n,n,i,s,a),this.isArcCurve=!0,this.type="ArcCurve"}}function Co(){let r=0,t=0,e=0,n=0;function i(s,a,o,l){r=s,t=o,e=-3*s+3*a-2*o-l,n=2*s-2*a+o+l}return{initCatmullRom:function(s,a,o,l,c){i(a,o,c*(o-s),c*(l-a))},initNonuniformCatmullRom:function(s,a,o,l,c,h,d){let u=(a-s)/c-(o-s)/(c+h)+(o-a)/h,f=(o-a)/h-(l-a)/(h+d)+(l-o)/d;u*=h,f*=h,i(a,o,u,f)},calc:function(s){const a=s*s,o=a*s;return r+t*s+e*a+n*o}}}const ks=new b,Wr=new Co,Xr=new Co,Yr=new Co;class u0 extends fn{constructor(t=[],e=!1,n="centripetal",i=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=t,this.closed=e,this.curveType=n,this.tension=i}getPoint(t,e=new b){const n=e,i=this.points,s=i.length,a=(s-(this.closed?0:1))*t;let o=Math.floor(a),l=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/s)+1)*s:l===0&&o===s-1&&(o=s-2,l=1);let c,h;this.closed||o>0?c=i[(o-1)%s]:(ks.subVectors(i[0],i[1]).add(i[0]),c=ks);const d=i[o%s],u=i[(o+1)%s];if(this.closed||o+2<s?h=i[(o+2)%s]:(ks.subVectors(i[s-1],i[s-2]).add(i[s-1]),h=ks),this.curveType==="centripetal"||this.curveType==="chordal"){const f=this.curveType==="chordal"?.5:.25;let g=Math.pow(c.distanceToSquared(d),f),_=Math.pow(d.distanceToSquared(u),f),m=Math.pow(u.distanceToSquared(h),f);_<1e-4&&(_=1),g<1e-4&&(g=_),m<1e-4&&(m=_),Wr.initNonuniformCatmullRom(c.x,d.x,u.x,h.x,g,_,m),Xr.initNonuniformCatmullRom(c.y,d.y,u.y,h.y,g,_,m),Yr.initNonuniformCatmullRom(c.z,d.z,u.z,h.z,g,_,m)}else this.curveType==="catmullrom"&&(Wr.initCatmullRom(c.x,d.x,u.x,h.x,this.tension),Xr.initCatmullRom(c.y,d.y,u.y,h.y,this.tension),Yr.initCatmullRom(c.z,d.z,u.z,h.z,this.tension));return n.set(Wr.calc(l),Xr.calc(l),Yr.calc(l)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(i.clone())}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const i=this.points[e];t.points.push(i.toArray())}return t.closed=this.closed,t.curveType=this.curveType,t.tension=this.tension,t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(new b().fromArray(i))}return this.closed=t.closed,this.curveType=t.curveType,this.tension=t.tension,this}}function yl(r,t,e,n,i){const s=(n-t)*.5,a=(i-e)*.5,o=r*r,l=r*o;return(2*e-2*n+s+a)*l+(-3*e+3*n-2*s-a)*o+s*r+e}function d0(r,t){const e=1-r;return e*e*t}function f0(r,t){return 2*(1-r)*r*t}function p0(r,t){return r*r*t}function es(r,t,e,n){return d0(r,t)+f0(r,e)+p0(r,n)}function m0(r,t){const e=1-r;return e*e*e*t}function g0(r,t){const e=1-r;return 3*e*e*r*t}function _0(r,t){return 3*(1-r)*r*r*t}function v0(r,t){return r*r*r*t}function ns(r,t,e,n,i){return m0(r,t)+g0(r,e)+_0(r,n)+v0(r,i)}class yc extends fn{constructor(t=new ot,e=new ot,n=new ot,i=new ot){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=t,this.v1=e,this.v2=n,this.v3=i}getPoint(t,e=new ot){const n=e,i=this.v0,s=this.v1,a=this.v2,o=this.v3;return n.set(ns(t,i.x,s.x,a.x,o.x),ns(t,i.y,s.y,a.y,o.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class x0 extends fn{constructor(t=new b,e=new b,n=new b,i=new b){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=t,this.v1=e,this.v2=n,this.v3=i}getPoint(t,e=new b){const n=e,i=this.v0,s=this.v1,a=this.v2,o=this.v3;return n.set(ns(t,i.x,s.x,a.x,o.x),ns(t,i.y,s.y,a.y,o.y),ns(t,i.z,s.z,a.z,o.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this.v3.copy(t.v3),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t.v3=this.v3.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this.v3.fromArray(t.v3),this}}class Sc extends fn{constructor(t=new ot,e=new ot){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=t,this.v2=e}getPoint(t,e=new ot){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new ot){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class y0 extends fn{constructor(t=new b,e=new b){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=t,this.v2=e}getPoint(t,e=new b){const n=e;return t===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(t).add(this.v1)),n}getPointAt(t,e){return this.getPoint(t,e)}getTangent(t,e=new b){return e.subVectors(this.v2,this.v1).normalize()}getTangentAt(t,e){return this.getTangent(t,e)}copy(t){return super.copy(t),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Mc extends fn{constructor(t=new ot,e=new ot,n=new ot){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new ot){const n=e,i=this.v0,s=this.v1,a=this.v2;return n.set(es(t,i.x,s.x,a.x),es(t,i.y,s.y,a.y)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class S0 extends fn{constructor(t=new b,e=new b,n=new b){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=t,this.v1=e,this.v2=n}getPoint(t,e=new b){const n=e,i=this.v0,s=this.v1,a=this.v2;return n.set(es(t,i.x,s.x,a.x),es(t,i.y,s.y,a.y),es(t,i.z,s.z,a.z)),n}copy(t){return super.copy(t),this.v0.copy(t.v0),this.v1.copy(t.v1),this.v2.copy(t.v2),this}toJSON(){const t=super.toJSON();return t.v0=this.v0.toArray(),t.v1=this.v1.toArray(),t.v2=this.v2.toArray(),t}fromJSON(t){return super.fromJSON(t),this.v0.fromArray(t.v0),this.v1.fromArray(t.v1),this.v2.fromArray(t.v2),this}}class Ec extends fn{constructor(t=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=t}getPoint(t,e=new ot){const n=e,i=this.points,s=(i.length-1)*t,a=Math.floor(s),o=s-a,l=i[a===0?a:a-1],c=i[a],h=i[a>i.length-2?i.length-1:a+1],d=i[a>i.length-3?i.length-1:a+2];return n.set(yl(o,l.x,c.x,h.x,d.x),yl(o,l.y,c.y,h.y,d.y)),n}copy(t){super.copy(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(i.clone())}return this}toJSON(){const t=super.toJSON();t.points=[];for(let e=0,n=this.points.length;e<n;e++){const i=this.points[e];t.points.push(i.toArray())}return t}fromJSON(t){super.fromJSON(t),this.points=[];for(let e=0,n=t.points.length;e<n;e++){const i=t.points[e];this.points.push(new ot().fromArray(i))}return this}}var fo=Object.freeze({__proto__:null,ArcCurve:h0,CatmullRomCurve3:u0,CubicBezierCurve:yc,CubicBezierCurve3:x0,EllipseCurve:Po,LineCurve:Sc,LineCurve3:y0,QuadraticBezierCurve:Mc,QuadraticBezierCurve3:S0,SplineCurve:Ec});class M0 extends fn{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(t){this.curves.push(t)}closePath(){const t=this.curves[0].getPoint(0),e=this.curves[this.curves.length-1].getPoint(1);if(!t.equals(e)){const n=t.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new fo[n](e,t))}return this}getPoint(t,e){const n=t*this.getLength(),i=this.getCurveLengths();let s=0;for(;s<i.length;){if(i[s]>=n){const a=i[s]-n,o=this.curves[s],l=o.getLength(),c=l===0?0:1-a/l;return o.getPointAt(c,e)}s++}return null}getLength(){const t=this.getCurveLengths();return t[t.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;const t=[];let e=0;for(let n=0,i=this.curves.length;n<i;n++)e+=this.curves[n].getLength(),t.push(e);return this.cacheLengths=t,t}getSpacedPoints(t=40){const e=[];for(let n=0;n<=t;n++)e.push(this.getPoint(n/t));return this.autoClose&&e.push(e[0]),e}getPoints(t=12){const e=[];let n;for(let i=0,s=this.curves;i<s.length;i++){const a=s[i],o=a.isEllipseCurve?t*2:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?t*a.points.length:t,l=a.getPoints(o);for(let c=0;c<l.length;c++){const h=l[c];n&&n.equals(h)||(e.push(h),n=h)}}return this.autoClose&&e.length>1&&!e[e.length-1].equals(e[0])&&e.push(e[0]),e}copy(t){super.copy(t),this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){const i=t.curves[e];this.curves.push(i.clone())}return this.autoClose=t.autoClose,this}toJSON(){const t=super.toJSON();t.autoClose=this.autoClose,t.curves=[];for(let e=0,n=this.curves.length;e<n;e++){const i=this.curves[e];t.curves.push(i.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.autoClose=t.autoClose,this.curves=[];for(let e=0,n=t.curves.length;e<n;e++){const i=t.curves[e];this.curves.push(new fo[i.type]().fromJSON(i))}return this}}class po extends M0{constructor(t){super(),this.type="Path",this.currentPoint=new ot,t&&this.setFromPoints(t)}setFromPoints(t){this.moveTo(t[0].x,t[0].y);for(let e=1,n=t.length;e<n;e++)this.lineTo(t[e].x,t[e].y);return this}moveTo(t,e){return this.currentPoint.set(t,e),this}lineTo(t,e){const n=new Sc(this.currentPoint.clone(),new ot(t,e));return this.curves.push(n),this.currentPoint.set(t,e),this}quadraticCurveTo(t,e,n,i){const s=new Mc(this.currentPoint.clone(),new ot(t,e),new ot(n,i));return this.curves.push(s),this.currentPoint.set(n,i),this}bezierCurveTo(t,e,n,i,s,a){const o=new yc(this.currentPoint.clone(),new ot(t,e),new ot(n,i),new ot(s,a));return this.curves.push(o),this.currentPoint.set(s,a),this}splineThru(t){const e=[this.currentPoint.clone()].concat(t),n=new Ec(e);return this.curves.push(n),this.currentPoint.copy(t[t.length-1]),this}arc(t,e,n,i,s,a){const o=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(t+o,e+l,n,i,s,a),this}absarc(t,e,n,i,s,a){return this.absellipse(t,e,n,n,i,s,a),this}ellipse(t,e,n,i,s,a,o,l){const c=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(t+c,e+h,n,i,s,a,o,l),this}absellipse(t,e,n,i,s,a,o,l){const c=new Po(t,e,n,i,s,a,o,l);if(this.curves.length>0){const d=c.getPoint(0);d.equals(this.currentPoint)||this.lineTo(d.x,d.y)}this.curves.push(c);const h=c.getPoint(1);return this.currentPoint.copy(h),this}copy(t){return super.copy(t),this.currentPoint.copy(t.currentPoint),this}toJSON(){const t=super.toJSON();return t.currentPoint=this.currentPoint.toArray(),t}fromJSON(t){return super.fromJSON(t),this.currentPoint.fromArray(t.currentPoint),this}}class Lo extends _e{constructor(t=[new ot(0,-.5),new ot(.5,0),new ot(0,.5)],e=12,n=0,i=Math.PI*2){super(),this.type="LatheGeometry",this.parameters={points:t,segments:e,phiStart:n,phiLength:i},e=Math.floor(e),i=ve(i,0,Math.PI*2);const s=[],a=[],o=[],l=[],c=[],h=1/e,d=new b,u=new ot,f=new b,g=new b,_=new b;let m=0,p=0;for(let x=0;x<=t.length-1;x++)switch(x){case 0:m=t[x+1].x-t[x].x,p=t[x+1].y-t[x].y,f.x=p*1,f.y=-m,f.z=p*0,_.copy(f),f.normalize(),l.push(f.x,f.y,f.z);break;case t.length-1:l.push(_.x,_.y,_.z);break;default:m=t[x+1].x-t[x].x,p=t[x+1].y-t[x].y,f.x=p*1,f.y=-m,f.z=p*0,g.copy(f),f.x+=_.x,f.y+=_.y,f.z+=_.z,f.normalize(),l.push(f.x,f.y,f.z),_.copy(g)}for(let x=0;x<=e;x++){const v=n+x*h*i,y=Math.sin(v),P=Math.cos(v);for(let A=0;A<=t.length-1;A++){d.x=t[A].x*y,d.y=t[A].y,d.z=t[A].x*P,a.push(d.x,d.y,d.z),u.x=x/e,u.y=A/(t.length-1),o.push(u.x,u.y);const R=l[3*A+0]*y,N=l[3*A+1],M=l[3*A+0]*P;c.push(R,N,M)}}for(let x=0;x<e;x++)for(let v=0;v<t.length-1;v++){const y=v+x*t.length,P=y,A=y+t.length,R=y+t.length+1,N=y+1;s.push(P,A,N),s.push(R,N,A)}this.setIndex(s),this.setAttribute("position",new Kt(a,3)),this.setAttribute("uv",new Kt(o,2)),this.setAttribute("normal",new Kt(c,3))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Lo(t.points,t.segments,t.phiStart,t.phiLength)}}class Io extends Lo{constructor(t=1,e=1,n=4,i=8){const s=new po;s.absarc(0,-e/2,t,Math.PI*1.5,0),s.absarc(0,e/2,t,0,Math.PI*.5),super(s.getPoints(n),i),this.type="CapsuleGeometry",this.parameters={radius:t,length:e,capSegments:n,radialSegments:i}}static fromJSON(t){return new Io(t.radius,t.length,t.capSegments,t.radialSegments)}}class Do extends _e{constructor(t=1,e=32,n=0,i=Math.PI*2){super(),this.type="CircleGeometry",this.parameters={radius:t,segments:e,thetaStart:n,thetaLength:i},e=Math.max(3,e);const s=[],a=[],o=[],l=[],c=new b,h=new ot;a.push(0,0,0),o.push(0,0,1),l.push(.5,.5);for(let d=0,u=3;d<=e;d++,u+=3){const f=n+d/e*i;c.x=t*Math.cos(f),c.y=t*Math.sin(f),a.push(c.x,c.y,c.z),o.push(0,0,1),h.x=(a[u]/t+1)/2,h.y=(a[u+1]/t+1)/2,l.push(h.x,h.y)}for(let d=1;d<=e;d++)s.push(d,d+1,0);this.setIndex(s),this.setAttribute("position",new Kt(a,3)),this.setAttribute("normal",new Kt(o,3)),this.setAttribute("uv",new Kt(l,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Do(t.radius,t.segments,t.thetaStart,t.thetaLength)}}class qt extends _e{constructor(t=1,e=1,n=1,i=32,s=1,a=!1,o=0,l=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:t,radiusBottom:e,height:n,radialSegments:i,heightSegments:s,openEnded:a,thetaStart:o,thetaLength:l};const c=this;i=Math.floor(i),s=Math.floor(s);const h=[],d=[],u=[],f=[];let g=0;const _=[],m=n/2;let p=0;x(),a===!1&&(t>0&&v(!0),e>0&&v(!1)),this.setIndex(h),this.setAttribute("position",new Kt(d,3)),this.setAttribute("normal",new Kt(u,3)),this.setAttribute("uv",new Kt(f,2));function x(){const y=new b,P=new b;let A=0;const R=(e-t)/n;for(let N=0;N<=s;N++){const M=[],w=N/s,U=w*(e-t)+t;for(let V=0;V<=i;V++){const J=V/i,L=J*l+o,B=Math.sin(L),k=Math.cos(L);P.x=U*B,P.y=-w*n+m,P.z=U*k,d.push(P.x,P.y,P.z),y.set(B,R,k).normalize(),u.push(y.x,y.y,y.z),f.push(J,1-w),M.push(g++)}_.push(M)}for(let N=0;N<i;N++)for(let M=0;M<s;M++){const w=_[M][N],U=_[M+1][N],V=_[M+1][N+1],J=_[M][N+1];h.push(w,U,J),h.push(U,V,J),A+=6}c.addGroup(p,A,0),p+=A}function v(y){const P=g,A=new ot,R=new b;let N=0;const M=y===!0?t:e,w=y===!0?1:-1;for(let V=1;V<=i;V++)d.push(0,m*w,0),u.push(0,w,0),f.push(.5,.5),g++;const U=g;for(let V=0;V<=i;V++){const L=V/i*l+o,B=Math.cos(L),k=Math.sin(L);R.x=M*k,R.y=m*w,R.z=M*B,d.push(R.x,R.y,R.z),u.push(0,w,0),A.x=B*.5+.5,A.y=k*.5*w+.5,f.push(A.x,A.y),g++}for(let V=0;V<i;V++){const J=P+V,L=U+V;y===!0?h.push(L,L+1,J):h.push(L+1,L,J),N+=3}c.addGroup(p,N,y===!0?1:2),p+=N}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new qt(t.radiusTop,t.radiusBottom,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class Qe extends qt{constructor(t=1,e=1,n=32,i=1,s=!1,a=0,o=Math.PI*2){super(0,t,e,n,i,s,a,o),this.type="ConeGeometry",this.parameters={radius:t,height:e,radialSegments:n,heightSegments:i,openEnded:s,thetaStart:a,thetaLength:o}}static fromJSON(t){return new Qe(t.radius,t.height,t.radialSegments,t.heightSegments,t.openEnded,t.thetaStart,t.thetaLength)}}class No extends _e{constructor(t=[],e=[],n=1,i=0){super(),this.type="PolyhedronGeometry",this.parameters={vertices:t,indices:e,radius:n,detail:i};const s=[],a=[];o(i),c(n),h(),this.setAttribute("position",new Kt(s,3)),this.setAttribute("normal",new Kt(s.slice(),3)),this.setAttribute("uv",new Kt(a,2)),i===0?this.computeVertexNormals():this.normalizeNormals();function o(x){const v=new b,y=new b,P=new b;for(let A=0;A<e.length;A+=3)f(e[A+0],v),f(e[A+1],y),f(e[A+2],P),l(v,y,P,x)}function l(x,v,y,P){const A=P+1,R=[];for(let N=0;N<=A;N++){R[N]=[];const M=x.clone().lerp(y,N/A),w=v.clone().lerp(y,N/A),U=A-N;for(let V=0;V<=U;V++)V===0&&N===A?R[N][V]=M:R[N][V]=M.clone().lerp(w,V/U)}for(let N=0;N<A;N++)for(let M=0;M<2*(A-N)-1;M++){const w=Math.floor(M/2);M%2===0?(u(R[N][w+1]),u(R[N+1][w]),u(R[N][w])):(u(R[N][w+1]),u(R[N+1][w+1]),u(R[N+1][w]))}}function c(x){const v=new b;for(let y=0;y<s.length;y+=3)v.x=s[y+0],v.y=s[y+1],v.z=s[y+2],v.normalize().multiplyScalar(x),s[y+0]=v.x,s[y+1]=v.y,s[y+2]=v.z}function h(){const x=new b;for(let v=0;v<s.length;v+=3){x.x=s[v+0],x.y=s[v+1],x.z=s[v+2];const y=m(x)/2/Math.PI+.5,P=p(x)/Math.PI+.5;a.push(y,1-P)}g(),d()}function d(){for(let x=0;x<a.length;x+=6){const v=a[x+0],y=a[x+2],P=a[x+4],A=Math.max(v,y,P),R=Math.min(v,y,P);A>.9&&R<.1&&(v<.2&&(a[x+0]+=1),y<.2&&(a[x+2]+=1),P<.2&&(a[x+4]+=1))}}function u(x){s.push(x.x,x.y,x.z)}function f(x,v){const y=x*3;v.x=t[y+0],v.y=t[y+1],v.z=t[y+2]}function g(){const x=new b,v=new b,y=new b,P=new b,A=new ot,R=new ot,N=new ot;for(let M=0,w=0;M<s.length;M+=9,w+=6){x.set(s[M+0],s[M+1],s[M+2]),v.set(s[M+3],s[M+4],s[M+5]),y.set(s[M+6],s[M+7],s[M+8]),A.set(a[w+0],a[w+1]),R.set(a[w+2],a[w+3]),N.set(a[w+4],a[w+5]),P.copy(x).add(v).add(y).divideScalar(3);const U=m(P);_(A,w+0,x,U),_(R,w+2,v,U),_(N,w+4,y,U)}}function _(x,v,y,P){P<0&&x.x===1&&(a[v]=x.x-1),y.x===0&&y.z===0&&(a[v]=P/2/Math.PI+.5)}function m(x){return Math.atan2(x.z,-x.x)}function p(x){return Math.atan2(-x.y,Math.sqrt(x.x*x.x+x.z*x.z))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new No(t.vertices,t.indices,t.radius,t.details)}}const Gs=new b,Vs=new b,qr=new b,Hs=new $e;class E0 extends _e{constructor(t=null,e=1){if(super(),this.type="EdgesGeometry",this.parameters={geometry:t,thresholdAngle:e},t!==null){const i=Math.pow(10,4),s=Math.cos(Di*e),a=t.getIndex(),o=t.getAttribute("position"),l=a?a.count:o.count,c=[0,0,0],h=["a","b","c"],d=new Array(3),u={},f=[];for(let g=0;g<l;g+=3){a?(c[0]=a.getX(g),c[1]=a.getX(g+1),c[2]=a.getX(g+2)):(c[0]=g,c[1]=g+1,c[2]=g+2);const{a:_,b:m,c:p}=Hs;if(_.fromBufferAttribute(o,c[0]),m.fromBufferAttribute(o,c[1]),p.fromBufferAttribute(o,c[2]),Hs.getNormal(qr),d[0]=`${Math.round(_.x*i)},${Math.round(_.y*i)},${Math.round(_.z*i)}`,d[1]=`${Math.round(m.x*i)},${Math.round(m.y*i)},${Math.round(m.z*i)}`,d[2]=`${Math.round(p.x*i)},${Math.round(p.y*i)},${Math.round(p.z*i)}`,!(d[0]===d[1]||d[1]===d[2]||d[2]===d[0]))for(let x=0;x<3;x++){const v=(x+1)%3,y=d[x],P=d[v],A=Hs[h[x]],R=Hs[h[v]],N=`${y}_${P}`,M=`${P}_${y}`;M in u&&u[M]?(qr.dot(u[M].normal)<=s&&(f.push(A.x,A.y,A.z),f.push(R.x,R.y,R.z)),u[M]=null):N in u||(u[N]={index0:c[x],index1:c[v],normal:qr.clone()})}}for(const g in u)if(u[g]){const{index0:_,index1:m}=u[g];Gs.fromBufferAttribute(o,_),Vs.fromBufferAttribute(o,m),f.push(Gs.x,Gs.y,Gs.z),f.push(Vs.x,Vs.y,Vs.z)}this.setAttribute("position",new Kt(f,3))}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}}class He extends po{constructor(t){super(t),this.uuid=ai(),this.type="Shape",this.holes=[]}getPointsHoles(t){const e=[];for(let n=0,i=this.holes.length;n<i;n++)e[n]=this.holes[n].getPoints(t);return e}extractPoints(t){return{shape:this.getPoints(t),holes:this.getPointsHoles(t)}}copy(t){super.copy(t),this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){const i=t.holes[e];this.holes.push(i.clone())}return this}toJSON(){const t=super.toJSON();t.uuid=this.uuid,t.holes=[];for(let e=0,n=this.holes.length;e<n;e++){const i=this.holes[e];t.holes.push(i.toJSON())}return t}fromJSON(t){super.fromJSON(t),this.uuid=t.uuid,this.holes=[];for(let e=0,n=t.holes.length;e<n;e++){const i=t.holes[e];this.holes.push(new po().fromJSON(i))}return this}}const A0={triangulate:function(r,t,e=2){const n=t&&t.length,i=n?t[0]*e:r.length;let s=Ac(r,0,i,e,!0);const a=[];if(!s||s.next===s.prev)return a;let o,l,c,h,d,u,f;if(n&&(s=P0(r,t,s,e)),r.length>80*e){o=c=r[0],l=h=r[1];for(let g=e;g<i;g+=e)d=r[g],u=r[g+1],d<o&&(o=d),u<l&&(l=u),d>c&&(c=d),u>h&&(h=u);f=Math.max(c-o,h-l),f=f!==0?32767/f:0}return cs(s,a,e,o,l,f,0),a}};function Ac(r,t,e,n,i){let s,a;if(i===k0(r,t,e,n)>0)for(s=t;s<e;s+=n)a=Sl(s,r[s],r[s+1],a);else for(s=e-n;s>=t;s-=n)a=Sl(s,r[s],r[s+1],a);return a&&hr(a,a.next)&&(us(a),a=a.next),a}function si(r,t){if(!r)return r;t||(t=r);let e=r,n;do if(n=!1,!e.steiner&&(hr(e,e.next)||he(e.prev,e,e.next)===0)){if(us(e),e=t=e.prev,e===e.next)break;n=!0}else e=e.next;while(n||e!==t);return t}function cs(r,t,e,n,i,s,a){if(!r)return;!a&&s&&N0(r,n,i,s);let o=r,l,c;for(;r.prev!==r.next;){if(l=r.prev,c=r.next,s?w0(r,n,i,s):T0(r)){t.push(l.i/e|0),t.push(r.i/e|0),t.push(c.i/e|0),us(r),r=c.next,o=c.next;continue}if(r=c,r===o){a?a===1?(r=b0(si(r),t,e),cs(r,t,e,n,i,s,2)):a===2&&R0(r,t,e,n,i,s):cs(si(r),t,e,n,i,s,1);break}}}function T0(r){const t=r.prev,e=r,n=r.next;if(he(t,e,n)>=0)return!1;const i=t.x,s=e.x,a=n.x,o=t.y,l=e.y,c=n.y,h=i<s?i<a?i:a:s<a?s:a,d=o<l?o<c?o:c:l<c?l:c,u=i>s?i>a?i:a:s>a?s:a,f=o>l?o>c?o:c:l>c?l:c;let g=n.next;for(;g!==t;){if(g.x>=h&&g.x<=u&&g.y>=d&&g.y<=f&&Li(i,o,s,l,a,c,g.x,g.y)&&he(g.prev,g,g.next)>=0)return!1;g=g.next}return!0}function w0(r,t,e,n){const i=r.prev,s=r,a=r.next;if(he(i,s,a)>=0)return!1;const o=i.x,l=s.x,c=a.x,h=i.y,d=s.y,u=a.y,f=o<l?o<c?o:c:l<c?l:c,g=h<d?h<u?h:u:d<u?d:u,_=o>l?o>c?o:c:l>c?l:c,m=h>d?h>u?h:u:d>u?d:u,p=mo(f,g,t,e,n),x=mo(_,m,t,e,n);let v=r.prevZ,y=r.nextZ;for(;v&&v.z>=p&&y&&y.z<=x;){if(v.x>=f&&v.x<=_&&v.y>=g&&v.y<=m&&v!==i&&v!==a&&Li(o,h,l,d,c,u,v.x,v.y)&&he(v.prev,v,v.next)>=0||(v=v.prevZ,y.x>=f&&y.x<=_&&y.y>=g&&y.y<=m&&y!==i&&y!==a&&Li(o,h,l,d,c,u,y.x,y.y)&&he(y.prev,y,y.next)>=0))return!1;y=y.nextZ}for(;v&&v.z>=p;){if(v.x>=f&&v.x<=_&&v.y>=g&&v.y<=m&&v!==i&&v!==a&&Li(o,h,l,d,c,u,v.x,v.y)&&he(v.prev,v,v.next)>=0)return!1;v=v.prevZ}for(;y&&y.z<=x;){if(y.x>=f&&y.x<=_&&y.y>=g&&y.y<=m&&y!==i&&y!==a&&Li(o,h,l,d,c,u,y.x,y.y)&&he(y.prev,y,y.next)>=0)return!1;y=y.nextZ}return!0}function b0(r,t,e){let n=r;do{const i=n.prev,s=n.next.next;!hr(i,s)&&Tc(i,n,n.next,s)&&hs(i,s)&&hs(s,i)&&(t.push(i.i/e|0),t.push(n.i/e|0),t.push(s.i/e|0),us(n),us(n.next),n=r=s),n=n.next}while(n!==r);return si(n)}function R0(r,t,e,n,i,s){let a=r;do{let o=a.next.next;for(;o!==a.prev;){if(a.i!==o.i&&F0(a,o)){let l=wc(a,o);a=si(a,a.next),l=si(l,l.next),cs(a,t,e,n,i,s,0),cs(l,t,e,n,i,s,0);return}o=o.next}a=a.next}while(a!==r)}function P0(r,t,e,n){const i=[];let s,a,o,l,c;for(s=0,a=t.length;s<a;s++)o=t[s]*n,l=s<a-1?t[s+1]*n:r.length,c=Ac(r,o,l,n,!1),c===c.next&&(c.steiner=!0),i.push(U0(c));for(i.sort(C0),s=0;s<i.length;s++)e=L0(i[s],e);return e}function C0(r,t){return r.x-t.x}function L0(r,t){const e=I0(r,t);if(!e)return t;const n=wc(e,r);return si(n,n.next),si(e,e.next)}function I0(r,t){let e=t,n=-1/0,i;const s=r.x,a=r.y;do{if(a<=e.y&&a>=e.next.y&&e.next.y!==e.y){const u=e.x+(a-e.y)*(e.next.x-e.x)/(e.next.y-e.y);if(u<=s&&u>n&&(n=u,i=e.x<e.next.x?e:e.next,u===s))return i}e=e.next}while(e!==t);if(!i)return null;const o=i,l=i.x,c=i.y;let h=1/0,d;e=i;do s>=e.x&&e.x>=l&&s!==e.x&&Li(a<c?s:n,a,l,c,a<c?n:s,a,e.x,e.y)&&(d=Math.abs(a-e.y)/(s-e.x),hs(e,r)&&(d<h||d===h&&(e.x>i.x||e.x===i.x&&D0(i,e)))&&(i=e,h=d)),e=e.next;while(e!==o);return i}function D0(r,t){return he(r.prev,r,t.prev)<0&&he(t.next,r,r.next)<0}function N0(r,t,e,n){let i=r;do i.z===0&&(i.z=mo(i.x,i.y,t,e,n)),i.prevZ=i.prev,i.nextZ=i.next,i=i.next;while(i!==r);i.prevZ.nextZ=null,i.prevZ=null,O0(i)}function O0(r){let t,e,n,i,s,a,o,l,c=1;do{for(e=r,r=null,s=null,a=0;e;){for(a++,n=e,o=0,t=0;t<c&&(o++,n=n.nextZ,!!n);t++);for(l=c;o>0||l>0&&n;)o!==0&&(l===0||!n||e.z<=n.z)?(i=e,e=e.nextZ,o--):(i=n,n=n.nextZ,l--),s?s.nextZ=i:r=i,i.prevZ=s,s=i;e=n}s.nextZ=null,c*=2}while(a>1);return r}function mo(r,t,e,n,i){return r=(r-e)*i|0,t=(t-n)*i|0,r=(r|r<<8)&16711935,r=(r|r<<4)&252645135,r=(r|r<<2)&858993459,r=(r|r<<1)&1431655765,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,r|t<<1}function U0(r){let t=r,e=r;do(t.x<e.x||t.x===e.x&&t.y<e.y)&&(e=t),t=t.next;while(t!==r);return e}function Li(r,t,e,n,i,s,a,o){return(i-a)*(t-o)>=(r-a)*(s-o)&&(r-a)*(n-o)>=(e-a)*(t-o)&&(e-a)*(s-o)>=(i-a)*(n-o)}function F0(r,t){return r.next.i!==t.i&&r.prev.i!==t.i&&!B0(r,t)&&(hs(r,t)&&hs(t,r)&&z0(r,t)&&(he(r.prev,r,t.prev)||he(r,t.prev,t))||hr(r,t)&&he(r.prev,r,r.next)>0&&he(t.prev,t,t.next)>0)}function he(r,t,e){return(t.y-r.y)*(e.x-t.x)-(t.x-r.x)*(e.y-t.y)}function hr(r,t){return r.x===t.x&&r.y===t.y}function Tc(r,t,e,n){const i=Xs(he(r,t,e)),s=Xs(he(r,t,n)),a=Xs(he(e,n,r)),o=Xs(he(e,n,t));return!!(i!==s&&a!==o||i===0&&Ws(r,e,t)||s===0&&Ws(r,n,t)||a===0&&Ws(e,r,n)||o===0&&Ws(e,t,n))}function Ws(r,t,e){return t.x<=Math.max(r.x,e.x)&&t.x>=Math.min(r.x,e.x)&&t.y<=Math.max(r.y,e.y)&&t.y>=Math.min(r.y,e.y)}function Xs(r){return r>0?1:r<0?-1:0}function B0(r,t){let e=r;do{if(e.i!==r.i&&e.next.i!==r.i&&e.i!==t.i&&e.next.i!==t.i&&Tc(e,e.next,r,t))return!0;e=e.next}while(e!==r);return!1}function hs(r,t){return he(r.prev,r,r.next)<0?he(r,t,r.next)>=0&&he(r,r.prev,t)>=0:he(r,t,r.prev)<0||he(r,r.next,t)<0}function z0(r,t){let e=r,n=!1;const i=(r.x+t.x)/2,s=(r.y+t.y)/2;do e.y>s!=e.next.y>s&&e.next.y!==e.y&&i<(e.next.x-e.x)*(s-e.y)/(e.next.y-e.y)+e.x&&(n=!n),e=e.next;while(e!==r);return n}function wc(r,t){const e=new go(r.i,r.x,r.y),n=new go(t.i,t.x,t.y),i=r.next,s=t.prev;return r.next=t,t.prev=r,e.next=i,i.prev=e,n.next=e,e.prev=n,s.next=n,n.prev=s,n}function Sl(r,t,e,n){const i=new go(r,t,e);return n?(i.next=n.next,i.prev=n,n.next.prev=i,n.next=i):(i.prev=i,i.next=i),i}function us(r){r.next.prev=r.prev,r.prev.next=r.next,r.prevZ&&(r.prevZ.nextZ=r.nextZ),r.nextZ&&(r.nextZ.prevZ=r.prevZ)}function go(r,t,e){this.i=r,this.x=t,this.y=e,this.prev=null,this.next=null,this.z=0,this.prevZ=null,this.nextZ=null,this.steiner=!1}function k0(r,t,e,n){let i=0;for(let s=t,a=e-n;s<e;s+=n)i+=(r[a]-r[s])*(r[s+1]+r[a+1]),a=s;return i}class is{static area(t){const e=t.length;let n=0;for(let i=e-1,s=0;s<e;i=s++)n+=t[i].x*t[s].y-t[s].x*t[i].y;return n*.5}static isClockWise(t){return is.area(t)<0}static triangulateShape(t,e){const n=[],i=[],s=[];Ml(t),El(n,t);let a=t.length;e.forEach(Ml);for(let l=0;l<e.length;l++)i.push(a),a+=e[l].length,El(n,e[l]);const o=A0.triangulate(n,i);for(let l=0;l<o.length;l+=3)s.push(o.slice(l,l+3));return s}}function Ml(r){const t=r.length;t>2&&r[t-1].equals(r[0])&&r.pop()}function El(r,t){for(let e=0;e<t.length;e++)r.push(t[e].x),r.push(t[e].y)}class ze extends _e{constructor(t=new He([new ot(.5,.5),new ot(-.5,.5),new ot(-.5,-.5),new ot(.5,-.5)]),e={}){super(),this.type="ExtrudeGeometry",this.parameters={shapes:t,options:e},t=Array.isArray(t)?t:[t];const n=this,i=[],s=[];for(let o=0,l=t.length;o<l;o++){const c=t[o];a(c)}this.setAttribute("position",new Kt(i,3)),this.setAttribute("uv",new Kt(s,2)),this.computeVertexNormals();function a(o){const l=[],c=e.curveSegments!==void 0?e.curveSegments:12,h=e.steps!==void 0?e.steps:1,d=e.depth!==void 0?e.depth:1;let u=e.bevelEnabled!==void 0?e.bevelEnabled:!0,f=e.bevelThickness!==void 0?e.bevelThickness:.2,g=e.bevelSize!==void 0?e.bevelSize:f-.1,_=e.bevelOffset!==void 0?e.bevelOffset:0,m=e.bevelSegments!==void 0?e.bevelSegments:3;const p=e.extrudePath,x=e.UVGenerator!==void 0?e.UVGenerator:G0;let v,y=!1,P,A,R,N;p&&(v=p.getSpacedPoints(h),y=!0,u=!1,P=p.computeFrenetFrames(h,!1),A=new b,R=new b,N=new b),u||(m=0,f=0,g=0,_=0);const M=o.extractPoints(c);let w=M.shape;const U=M.holes;if(!is.isClockWise(w)){w=w.reverse();for(let C=0,lt=U.length;C<lt;C++){const K=U[C];is.isClockWise(K)&&(U[C]=K.reverse())}}const J=is.triangulateShape(w,U),L=w;for(let C=0,lt=U.length;C<lt;C++){const K=U[C];w=w.concat(K)}function B(C,lt,K){return lt||console.error("THREE.ExtrudeGeometry: vec does not exist"),C.clone().addScaledVector(lt,K)}const k=w.length,j=J.length;function q(C,lt,K){let rt,Y,Tt;const mt=C.x-lt.x,E=C.y-lt.y,S=K.x-C.x,F=K.y-C.y,it=mt*mt+E*E,et=mt*F-E*S;if(Math.abs(et)>Number.EPSILON){const Q=Math.sqrt(it),yt=Math.sqrt(S*S+F*F),ut=lt.x-E/Q,vt=lt.y+mt/Q,Rt=K.x-F/yt,Bt=K.y+S/yt,nt=((Rt-ut)*F-(Bt-vt)*S)/(mt*F-E*S);rt=ut+mt*nt-C.x,Y=vt+E*nt-C.y;const jt=rt*rt+Y*Y;if(jt<=2)return new ot(rt,Y);Tt=Math.sqrt(jt/2)}else{let Q=!1;mt>Number.EPSILON?S>Number.EPSILON&&(Q=!0):mt<-Number.EPSILON?S<-Number.EPSILON&&(Q=!0):Math.sign(E)===Math.sign(F)&&(Q=!0),Q?(rt=-E,Y=mt,Tt=Math.sqrt(it)):(rt=mt,Y=E,Tt=Math.sqrt(it/2))}return new ot(rt/Tt,Y/Tt)}const $=[];for(let C=0,lt=L.length,K=lt-1,rt=C+1;C<lt;C++,K++,rt++)K===lt&&(K=0),rt===lt&&(rt=0),$[C]=q(L[C],L[K],L[rt]);const Z=[];let st,at=$.concat();for(let C=0,lt=U.length;C<lt;C++){const K=U[C];st=[];for(let rt=0,Y=K.length,Tt=Y-1,mt=rt+1;rt<Y;rt++,Tt++,mt++)Tt===Y&&(Tt=0),mt===Y&&(mt=0),st[rt]=q(K[rt],K[Tt],K[mt]);Z.push(st),at=at.concat(st)}for(let C=0;C<m;C++){const lt=C/m,K=f*Math.cos(lt*Math.PI/2),rt=g*Math.sin(lt*Math.PI/2)+_;for(let Y=0,Tt=L.length;Y<Tt;Y++){const mt=B(L[Y],$[Y],rt);_t(mt.x,mt.y,-K)}for(let Y=0,Tt=U.length;Y<Tt;Y++){const mt=U[Y];st=Z[Y];for(let E=0,S=mt.length;E<S;E++){const F=B(mt[E],st[E],rt);_t(F.x,F.y,-K)}}}const W=g+_;for(let C=0;C<k;C++){const lt=u?B(w[C],at[C],W):w[C];y?(R.copy(P.normals[0]).multiplyScalar(lt.x),A.copy(P.binormals[0]).multiplyScalar(lt.y),N.copy(v[0]).add(R).add(A),_t(N.x,N.y,N.z)):_t(lt.x,lt.y,0)}for(let C=1;C<=h;C++)for(let lt=0;lt<k;lt++){const K=u?B(w[lt],at[lt],W):w[lt];y?(R.copy(P.normals[C]).multiplyScalar(K.x),A.copy(P.binormals[C]).multiplyScalar(K.y),N.copy(v[C]).add(R).add(A),_t(N.x,N.y,N.z)):_t(K.x,K.y,d/h*C)}for(let C=m-1;C>=0;C--){const lt=C/m,K=f*Math.cos(lt*Math.PI/2),rt=g*Math.sin(lt*Math.PI/2)+_;for(let Y=0,Tt=L.length;Y<Tt;Y++){const mt=B(L[Y],$[Y],rt);_t(mt.x,mt.y,d+K)}for(let Y=0,Tt=U.length;Y<Tt;Y++){const mt=U[Y];st=Z[Y];for(let E=0,S=mt.length;E<S;E++){const F=B(mt[E],st[E],rt);y?_t(F.x,F.y+v[h-1].y,v[h-1].x+K):_t(F.x,F.y,d+K)}}}tt(),pt();function tt(){const C=i.length/3;if(u){let lt=0,K=k*lt;for(let rt=0;rt<j;rt++){const Y=J[rt];Lt(Y[2]+K,Y[1]+K,Y[0]+K)}lt=h+m*2,K=k*lt;for(let rt=0;rt<j;rt++){const Y=J[rt];Lt(Y[0]+K,Y[1]+K,Y[2]+K)}}else{for(let lt=0;lt<j;lt++){const K=J[lt];Lt(K[2],K[1],K[0])}for(let lt=0;lt<j;lt++){const K=J[lt];Lt(K[0]+k*h,K[1]+k*h,K[2]+k*h)}}n.addGroup(C,i.length/3-C,0)}function pt(){const C=i.length/3;let lt=0;Mt(L,lt),lt+=L.length;for(let K=0,rt=U.length;K<rt;K++){const Y=U[K];Mt(Y,lt),lt+=Y.length}n.addGroup(C,i.length/3-C,1)}function Mt(C,lt){let K=C.length;for(;--K>=0;){const rt=K;let Y=K-1;Y<0&&(Y=C.length-1);for(let Tt=0,mt=h+m*2;Tt<mt;Tt++){const E=k*Tt,S=k*(Tt+1),F=lt+rt+E,it=lt+Y+E,et=lt+Y+S,Q=lt+rt+S;Ut(F,it,et,Q)}}}function _t(C,lt,K){l.push(C),l.push(lt),l.push(K)}function Lt(C,lt,K){Et(C),Et(lt),Et(K);const rt=i.length/3,Y=x.generateTopUV(n,i,rt-3,rt-2,rt-1);Nt(Y[0]),Nt(Y[1]),Nt(Y[2])}function Ut(C,lt,K,rt){Et(C),Et(lt),Et(rt),Et(lt),Et(K),Et(rt);const Y=i.length/3,Tt=x.generateSideWallUV(n,i,Y-6,Y-3,Y-2,Y-1);Nt(Tt[0]),Nt(Tt[1]),Nt(Tt[3]),Nt(Tt[1]),Nt(Tt[2]),Nt(Tt[3])}function Et(C){i.push(l[C*3+0]),i.push(l[C*3+1]),i.push(l[C*3+2])}function Nt(C){s.push(C.x),s.push(C.y)}}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}toJSON(){const t=super.toJSON(),e=this.parameters.shapes,n=this.parameters.options;return V0(e,n,t)}static fromJSON(t,e){const n=[];for(let s=0,a=t.shapes.length;s<a;s++){const o=e[t.shapes[s]];n.push(o)}const i=t.options.extrudePath;return i!==void 0&&(t.options.extrudePath=new fo[i.type]().fromJSON(i)),new ze(n,t.options)}}const G0={generateTopUV:function(r,t,e,n,i){const s=t[e*3],a=t[e*3+1],o=t[n*3],l=t[n*3+1],c=t[i*3],h=t[i*3+1];return[new ot(s,a),new ot(o,l),new ot(c,h)]},generateSideWallUV:function(r,t,e,n,i,s){const a=t[e*3],o=t[e*3+1],l=t[e*3+2],c=t[n*3],h=t[n*3+1],d=t[n*3+2],u=t[i*3],f=t[i*3+1],g=t[i*3+2],_=t[s*3],m=t[s*3+1],p=t[s*3+2];return Math.abs(o-h)<Math.abs(a-c)?[new ot(a,1-l),new ot(c,1-d),new ot(u,1-g),new ot(_,1-p)]:[new ot(o,1-l),new ot(h,1-d),new ot(f,1-g),new ot(m,1-p)]}};function V0(r,t,e){if(e.shapes=[],Array.isArray(r))for(let n=0,i=r.length;n<i;n++){const s=r[n];e.shapes.push(s.uuid)}else e.shapes.push(r.uuid);return e.options=Object.assign({},t),t.extrudePath!==void 0&&(e.options.extrudePath=t.extrudePath.toJSON()),e}class Oo extends No{constructor(t=1,e=0){const n=(1+Math.sqrt(5))/2,i=[-1,n,0,1,n,0,-1,-n,0,1,-n,0,0,-1,n,0,1,n,0,-1,-n,0,1,-n,n,0,-1,n,0,1,-n,0,-1,-n,0,1],s=[0,11,5,0,5,1,0,1,7,0,7,10,0,10,11,1,5,9,5,11,4,11,10,2,10,7,6,7,1,8,3,9,4,3,4,2,3,2,6,3,6,8,3,8,9,4,9,5,2,4,11,6,2,10,8,6,7,9,8,1];super(i,s,t,e),this.type="IcosahedronGeometry",this.parameters={radius:t,detail:e}}static fromJSON(t){return new Oo(t.radius,t.detail)}}class xe extends _e{constructor(t=1,e=32,n=16,i=0,s=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:t,widthSegments:e,heightSegments:n,phiStart:i,phiLength:s,thetaStart:a,thetaLength:o},e=Math.max(3,Math.floor(e)),n=Math.max(2,Math.floor(n));const l=Math.min(a+o,Math.PI);let c=0;const h=[],d=new b,u=new b,f=[],g=[],_=[],m=[];for(let p=0;p<=n;p++){const x=[],v=p/n;let y=0;p===0&&a===0?y=.5/e:p===n&&l===Math.PI&&(y=-.5/e);for(let P=0;P<=e;P++){const A=P/e;d.x=-t*Math.cos(i+A*s)*Math.sin(a+v*o),d.y=t*Math.cos(a+v*o),d.z=t*Math.sin(i+A*s)*Math.sin(a+v*o),g.push(d.x,d.y,d.z),u.copy(d).normalize(),_.push(u.x,u.y,u.z),m.push(A+y,1-v),x.push(c++)}h.push(x)}for(let p=0;p<n;p++)for(let x=0;x<e;x++){const v=h[p][x+1],y=h[p][x],P=h[p+1][x],A=h[p+1][x+1];(p!==0||a>0)&&f.push(v,y,A),(p!==n-1||l<Math.PI)&&f.push(y,P,A)}this.setIndex(f),this.setAttribute("position",new Kt(g,3)),this.setAttribute("normal",new Kt(_,3)),this.setAttribute("uv",new Kt(m,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new xe(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}}class ri extends _e{constructor(t=1,e=.4,n=12,i=48,s=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:t,tube:e,radialSegments:n,tubularSegments:i,arc:s},n=Math.floor(n),i=Math.floor(i);const a=[],o=[],l=[],c=[],h=new b,d=new b,u=new b;for(let f=0;f<=n;f++)for(let g=0;g<=i;g++){const _=g/i*s,m=f/n*Math.PI*2;d.x=(t+e*Math.cos(m))*Math.cos(_),d.y=(t+e*Math.cos(m))*Math.sin(_),d.z=e*Math.sin(m),o.push(d.x,d.y,d.z),h.x=t*Math.cos(_),h.y=t*Math.sin(_),u.subVectors(d,h).normalize(),l.push(u.x,u.y,u.z),c.push(g/i),c.push(f/n)}for(let f=1;f<=n;f++)for(let g=1;g<=i;g++){const _=(i+1)*f+g-1,m=(i+1)*(f-1)+g-1,p=(i+1)*(f-1)+g,x=(i+1)*f+g;a.push(_,m,x),a.push(m,p,x)}this.setIndex(a),this.setAttribute("position",new Kt(o,3)),this.setAttribute("normal",new Kt(l,3)),this.setAttribute("uv",new Kt(c,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new ri(t.radius,t.tube,t.radialSegments,t.tubularSegments,t.arc)}}class St extends un{constructor(t){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.type="MeshStandardMaterial",this.color=new wt(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new wt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Mo,this.normalScale=new ot(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class Uo extends St{constructor(t){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new ot(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return ve(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new wt(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new wt(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new wt(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(t)}get anisotropy(){return this._anisotropy}set anisotropy(t){this._anisotropy>0!=t>0&&this.version++,this._anisotropy=t}get clearcoat(){return this._clearcoat}set clearcoat(t){this._clearcoat>0!=t>0&&this.version++,this._clearcoat=t}get iridescence(){return this._iridescence}set iridescence(t){this._iridescence>0!=t>0&&this.version++,this._iridescence=t}get sheen(){return this._sheen}set sheen(t){this._sheen>0!=t>0&&this.version++,this._sheen=t}get transmission(){return this._transmission}set transmission(t){this._transmission>0!=t>0&&this.version++,this._transmission=t}copy(t){return super.copy(t),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=t.anisotropy,this.anisotropyRotation=t.anisotropyRotation,this.anisotropyMap=t.anisotropyMap,this.clearcoat=t.clearcoat,this.clearcoatMap=t.clearcoatMap,this.clearcoatRoughness=t.clearcoatRoughness,this.clearcoatRoughnessMap=t.clearcoatRoughnessMap,this.clearcoatNormalMap=t.clearcoatNormalMap,this.clearcoatNormalScale.copy(t.clearcoatNormalScale),this.ior=t.ior,this.iridescence=t.iridescence,this.iridescenceMap=t.iridescenceMap,this.iridescenceIOR=t.iridescenceIOR,this.iridescenceThicknessRange=[...t.iridescenceThicknessRange],this.iridescenceThicknessMap=t.iridescenceThicknessMap,this.sheen=t.sheen,this.sheenColor.copy(t.sheenColor),this.sheenColorMap=t.sheenColorMap,this.sheenRoughness=t.sheenRoughness,this.sheenRoughnessMap=t.sheenRoughnessMap,this.transmission=t.transmission,this.transmissionMap=t.transmissionMap,this.thickness=t.thickness,this.thicknessMap=t.thicknessMap,this.attenuationDistance=t.attenuationDistance,this.attenuationColor.copy(t.attenuationColor),this.specularIntensity=t.specularIntensity,this.specularIntensityMap=t.specularIntensityMap,this.specularColor.copy(t.specularColor),this.specularColorMap=t.specularColorMap,this}}class bc extends un{constructor(t){super(),this.isMeshPhongMaterial=!0,this.type="MeshPhongMaterial",this.color=new wt(16777215),this.specular=new wt(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new wt(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Mo,this.normalScale=new ot(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.combine=yo,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.specular.copy(t.specular),this.shininess=t.shininess,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}const rr={enabled:!1,files:{},add:function(r,t){this.enabled!==!1&&(this.files[r]=t)},get:function(r){if(this.enabled!==!1)return this.files[r]},remove:function(r){delete this.files[r]},clear:function(){this.files={}}};class H0{constructor(t,e,n){const i=this;let s=!1,a=0,o=0,l;const c=[];this.onStart=void 0,this.onLoad=t,this.onProgress=e,this.onError=n,this.itemStart=function(h){o++,s===!1&&i.onStart!==void 0&&i.onStart(h,a,o),s=!0},this.itemEnd=function(h){a++,i.onProgress!==void 0&&i.onProgress(h,a,o),a===o&&(s=!1,i.onLoad!==void 0&&i.onLoad())},this.itemError=function(h){i.onError!==void 0&&i.onError(h)},this.resolveURL=function(h){return l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,d){return c.push(h,d),this},this.removeHandler=function(h){const d=c.indexOf(h);return d!==-1&&c.splice(d,2),this},this.getHandler=function(h){for(let d=0,u=c.length;d<u;d+=2){const f=c[d],g=c[d+1];if(f.global&&(f.lastIndex=0),f.test(h))return g}return null}}}const Rc=new H0;class Hi{constructor(t){this.manager=t!==void 0?t:Rc,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(t,e){const n=this;return new Promise(function(i,s){n.load(t,i,e,s)})}parse(){}setCrossOrigin(t){return this.crossOrigin=t,this}setWithCredentials(t){return this.withCredentials=t,this}setPath(t){return this.path=t,this}setResourcePath(t){return this.resourcePath=t,this}setRequestHeader(t){return this.requestHeader=t,this}}Hi.DEFAULT_MATERIAL_NAME="__DEFAULT";const yn={};class W0 extends Error{constructor(t,e){super(t),this.response=e}}class Pc extends Hi{constructor(t){super(t)}load(t,e,n,i){t===void 0&&(t=""),this.path!==void 0&&(t=this.path+t),t=this.manager.resolveURL(t);const s=rr.get(t);if(s!==void 0)return this.manager.itemStart(t),setTimeout(()=>{e&&e(s),this.manager.itemEnd(t)},0),s;if(yn[t]!==void 0){yn[t].push({onLoad:e,onProgress:n,onError:i});return}yn[t]=[],yn[t].push({onLoad:e,onProgress:n,onError:i});const a=new Request(t,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin"}),o=this.mimeType,l=this.responseType;fetch(a).then(c=>{if(c.status===200||c.status===0){if(c.status===0&&console.warn("THREE.FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||c.body===void 0||c.body.getReader===void 0)return c;const h=yn[t],d=c.body.getReader(),u=c.headers.get("Content-Length")||c.headers.get("X-File-Size"),f=u?parseInt(u):0,g=f!==0;let _=0;const m=new ReadableStream({start(p){x();function x(){d.read().then(({done:v,value:y})=>{if(v)p.close();else{_+=y.byteLength;const P=new ProgressEvent("progress",{lengthComputable:g,loaded:_,total:f});for(let A=0,R=h.length;A<R;A++){const N=h[A];N.onProgress&&N.onProgress(P)}p.enqueue(y),x()}})}}});return new Response(m)}else throw new W0(`fetch for "${c.url}" responded with ${c.status}: ${c.statusText}`,c)}).then(c=>{switch(l){case"arraybuffer":return c.arrayBuffer();case"blob":return c.blob();case"document":return c.text().then(h=>new DOMParser().parseFromString(h,o));case"json":return c.json();default:if(o===void 0)return c.text();{const d=/charset="?([^;"\s]*)"?/i.exec(o),u=d&&d[1]?d[1].toLowerCase():void 0,f=new TextDecoder(u);return c.arrayBuffer().then(g=>f.decode(g))}}}).then(c=>{rr.add(t,c);const h=yn[t];delete yn[t];for(let d=0,u=h.length;d<u;d++){const f=h[d];f.onLoad&&f.onLoad(c)}}).catch(c=>{const h=yn[t];if(h===void 0)throw this.manager.itemError(t),c;delete yn[t];for(let d=0,u=h.length;d<u;d++){const f=h[d];f.onError&&f.onError(c)}this.manager.itemError(t)}).finally(()=>{this.manager.itemEnd(t)}),this.manager.itemStart(t)}setResponseType(t){return this.responseType=t,this}setMimeType(t){return this.mimeType=t,this}}class X0 extends Hi{constructor(t){super(t)}load(t,e,n,i){this.path!==void 0&&(t=this.path+t),t=this.manager.resolveURL(t);const s=this,a=rr.get(t);if(a!==void 0)return s.manager.itemStart(t),setTimeout(function(){e&&e(a),s.manager.itemEnd(t)},0),a;const o=ls("img");function l(){h(),rr.add(t,this),e&&e(this),s.manager.itemEnd(t)}function c(d){h(),i&&i(d),s.manager.itemError(t),s.manager.itemEnd(t)}function h(){o.removeEventListener("load",l,!1),o.removeEventListener("error",c,!1)}return o.addEventListener("load",l,!1),o.addEventListener("error",c,!1),t.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),s.manager.itemStart(t),o.src=t,o}}class Y0 extends Hi{constructor(t){super(t)}load(t,e,n,i){const s=new Fe,a=new X0(this.manager);return a.setCrossOrigin(this.crossOrigin),a.setPath(this.path),a.load(t,function(o){s.image=o,s.needsUpdate=!0,e!==void 0&&e(s)},n,i),s}}class Cc extends ee{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new wt(t),this.intensity=e}dispose(){}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){const e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,this.groundColor!==void 0&&(e.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(e.object.distance=this.distance),this.angle!==void 0&&(e.object.angle=this.angle),this.decay!==void 0&&(e.object.decay=this.decay),this.penumbra!==void 0&&(e.object.penumbra=this.penumbra),this.shadow!==void 0&&(e.object.shadow=this.shadow.toJSON()),e}}const Kr=new ne,Al=new b,Tl=new b;class q0{constructor(t){this.camera=t,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new ot(512,512),this.map=null,this.mapPass=null,this.matrix=new ne,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new wo,this._frameExtents=new ot(1,1),this._viewportCount=1,this._viewports=[new we(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){const e=this.camera,n=this.matrix;Al.setFromMatrixPosition(t.matrixWorld),e.position.copy(Al),Tl.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(Tl),e.updateMatrixWorld(),Kr.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Kr),n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(Kr)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.bias=t.bias,this.radius=t.radius,this.mapSize.copy(t.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const t={};return this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}}class K0 extends q0{constructor(){super(new uc(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class wl extends Cc{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(ee.DEFAULT_UP),this.updateMatrix(),this.target=new ee,this.shadow=new K0}dispose(){this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}}class j0 extends Cc{constructor(t,e){super(t,e),this.isAmbientLight=!0,this.type="AmbientLight"}}class $0{static decodeText(t){if(typeof TextDecoder<"u")return new TextDecoder().decode(t);let e="";for(let n=0,i=t.length;n<i;n++)e+=String.fromCharCode(t[n]);try{return decodeURIComponent(escape(e))}catch{return e}}static extractUrlBase(t){const e=t.lastIndexOf("/");return e===-1?"./":t.slice(0,e+1)}static resolveURL(t,e){return typeof t!="string"||t===""?"":(/^https?:\/\//i.test(e)&&/^\//.test(t)&&(e=e.replace(/(^https?:\/\/[^\/]+).*/i,"$1")),/^(https?:)?\/\//i.test(t)||/^data:.*,.*$/i.test(t)||/^blob:.*$/i.test(t)?t:e+t)}}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:xo}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=xo);const D={ARENA:{WALL_THICKNESS:2,MAP_SCALE:3,CHECKER_LIGHT_COLOR:14277081,CHECKER_DARK_COLOR:5921370,CHECKER_WORLD_SIZE:18},PLAYER:{SPEED:18,TURN_SPEED:2.2,ROLL_SPEED:2,BOOST_MULTIPLIER:1.8,BOOST_DURATION:2,BOOST_COOLDOWN:5,SPAWN_PROTECTION:1,HITBOX_RADIUS:.8,MODEL_SCALE:1,NOSE_CAMERA_LOCAL_Y:.05,NOSE_CAMERA_LOCAL_Z:-1.95,START_Y:10,AUTO_ROLL:!0,AUTO_ROLL_SPEED:1.5,DEFAULT_VEHICLE_ID:"ship5"},GAMEPLAY:{PLANAR_MODE:!1,PORTAL_COUNT:0,PLANAR_LEVEL_COUNT:5,PORTAL_BEAMS:!1,PLANAR_AIM_INPUT_SPEED:1.5},TRAIL:{WIDTH:.6,UPDATE_INTERVAL:.07,GAP_CHANCE:.02,GAP_DURATION:.3,MAX_SEGMENTS:5e3},RENDER:{MAX_PIXEL_RATIO:1.35,SHADOW_MAP_SIZE:512},POWERUP:{SPAWN_INTERVAL:3,MAX_ON_FIELD:8,PICKUP_RADIUS:2.5,SIZE:1.5,ROTATION_SPEED:2,BOUNCE_SPEED:1.5,BOUNCE_HEIGHT:.5,MAX_INVENTORY:5,TYPES:{SPEED_UP:{name:"Schneller",color:65382,icon:"⚡",duration:4,multiplier:1.6},SLOW_DOWN:{name:"Langsamer",color:16724787,icon:"🐢",duration:4,multiplier:.5},THICK:{name:"Dick",color:16763904,icon:"🧱",duration:5,trailWidth:1.8},THIN:{name:"Dünn",color:11158783,icon:"✂",duration:5,trailWidth:.2},SHIELD:{name:"Schild",color:4491519,icon:"🛡",duration:3},SLOW_TIME:{name:"Zeitlupe",color:4521864,icon:"🕙",duration:4,timeScale:.4},GHOST:{name:"Geist",color:16737996,icon:"👻",duration:3},INVERT:{name:"Invertieren",color:16711935,icon:"🔀",duration:4}}},BOT:{DEFAULT_DIFFICULTY:"NORMAL",ACTIVE_DIFFICULTY:"NORMAL",REACTION_TIME:.13,LOOK_AHEAD:13,AGGRESSION:.58,DIFFICULTY_PROFILES:{EASY:{reactionTime:.24,lookAhead:11,aggression:.36,errorRate:.24,probeSpread:.62,probeStep:2.3,turnCommitTime:.14,stuckCheckInterval:.45,stuckTriggerTime:1.7,minProgressDistance:.85,minForwardProgress:.35,recoveryDuration:.95,recoveryCooldown:1.9,itemUseCooldown:1.25,itemShootCooldown:.8,targetRefreshInterval:.28,portalInterest:.35,portalSeekDistance:60,portalEntryDotMin:.22,portalIntentThreshold:.25,portalIntentDuration:.9,boostChance:.0025,probeCount:7,projectileAwareness:0,pursuitEnabled:!1,pursuitRadius:0,pursuitAimTolerance:.95,heightBias:0,spacingWeight:0,itemContextWeight:.2},NORMAL:{reactionTime:.14,lookAhead:13,aggression:.58,errorRate:.11,probeSpread:.74,probeStep:1.6,turnCommitTime:.18,stuckCheckInterval:.4,stuckTriggerTime:1.2,minProgressDistance:.9,minForwardProgress:.45,recoveryDuration:1.3,recoveryCooldown:1.55,itemUseCooldown:.95,itemShootCooldown:.62,targetRefreshInterval:.2,portalInterest:.56,portalSeekDistance:72,portalEntryDotMin:.28,portalIntentThreshold:.2,portalIntentDuration:1.15,boostChance:.0045,probeCount:10,projectileAwareness:.6,pursuitEnabled:!0,pursuitRadius:35,pursuitAimTolerance:.85,heightBias:.15,spacingWeight:.3,itemContextWeight:.7},HARD:{reactionTime:.08,lookAhead:16,aggression:.74,errorRate:.04,probeSpread:.9,probeStep:1.4,turnCommitTime:.24,stuckCheckInterval:.35,stuckTriggerTime:1,minProgressDistance:1,minForwardProgress:.5,recoveryDuration:1.25,recoveryCooldown:1.2,itemUseCooldown:.78,itemShootCooldown:.48,targetRefreshInterval:.12,portalInterest:.74,portalSeekDistance:84,portalEntryDotMin:.35,portalIntentThreshold:.14,portalIntentDuration:1.35,boostChance:.0065,probeCount:12,projectileAwareness:.95,pursuitEnabled:!0,pursuitRadius:50,pursuitAimTolerance:.75,heightBias:.25,spacingWeight:.5,itemContextWeight:1}}},PROJECTILE:{SPEED:45,RADIUS:.7,LIFE_TIME:3,MAX_DISTANCE:140,COOLDOWN:.45,PLANAR_AIM_MAX_ANGLE_DEG:18},PORTAL:{RADIUS:3.5,COOLDOWN:1.2,RING_SIZE:4,ROTATION_SPEED:2,MIN_PAIR_DISTANCE:15,MIN_PAIR_DISTANCE_PLANAR:4},HOMING:{LOCK_ON_ANGLE:15,TURN_RATE:3,MAX_LOCK_RANGE:100},COLORS:{PLAYER_1:43775,PLAYER_2:16746496,BOT_COLORS:[16729156,4521796,16777028,16729343,4521983],BACKGROUND:526354,AMBIENT_LIGHT:3359846},CAMERA:{FOV:75,NEAR:.1,FAR:200,FOLLOW_DISTANCE:12,FOLLOW_HEIGHT:6,LOOK_AHEAD:5,SMOOTHING:.08,MODES:["THIRD_PERSON","FIRST_PERSON","TOP_DOWN"],FIRST_PERSON_NOSE_CLEARANCE:.3,FIRST_PERSON_OFFSET:4,FIRST_PERSON_BOOST_OFFSET:1.45,FIRST_PERSON_BOOST_BLEND_SPEED:8.5,COLLISION_RADIUS:.45,COLLISION_BACKOFF:.04,COLLISION_STEPS:8},MAPS:{standard:{name:"Standard Arena",size:[80,30,80],obstacles:[{pos:[0,5,0],size:[4,10,4]},{pos:[20,5,20],size:[3,10,3]},{pos:[-20,5,-20],size:[3,10,3]},{pos:[20,5,-20],size:[3,10,3]},{pos:[-20,5,20],size:[3,10,3]}],portals:[{a:[-30,12,0],b:[30,12,0],color:65484}]},custom:{name:"Editor Playtest",size:[80,30,80],obstacles:[],portals:[]},empty:{name:"Leer",size:[50,25,50],obstacles:[],portals:[]},maze:{name:"Labyrinth",size:[80,25,80],obstacles:[{pos:[-20,5,-20],size:[20,10,2]},{pos:[20,5,-20],size:[20,10,2]},{pos:[0,5,0],size:[30,10,2]},{pos:[-20,5,20],size:[20,10,2]},{pos:[20,5,20],size:[20,10,2]},{pos:[-20,5,0],size:[2,10,20]},{pos:[20,5,0],size:[2,10,20]},{pos:[0,5,-20],size:[2,10,15]},{pos:[0,5,20],size:[2,10,15]}],portals:[{a:[-30,10,-30],b:[30,10,30],color:16738047},{a:[30,10,-30],b:[-30,10,30],color:6737151}]},complex:{name:"Komplex",size:[90,30,90],obstacles:[{pos:[0,5,0],size:[6,12,6]},{pos:[-25,5,-25],size:[10,8,2]},{pos:[25,5,-25],size:[2,8,10]},{pos:[-25,5,25],size:[2,8,10]},{pos:[25,5,25],size:[10,8,2]},{pos:[-15,5,0],size:[2,15,15]},{pos:[15,5,0],size:[2,15,15]},{pos:[0,5,-15],size:[15,15,2]},{pos:[0,5,15],size:[15,15,2]},{pos:[-30,3,0],size:[5,6,5]},{pos:[30,3,0],size:[5,6,5]}],portals:[{a:[-35,12,-35],b:[35,12,35],color:16755200},{a:[35,12,-35],b:[-35,12,35],color:43775}]},pyramid:{name:"Pyramide",size:[80,35,80],obstacles:[{pos:[0,2,0],size:[20,4,20]},{pos:[0,6,0],size:[15,4,15]},{pos:[0,10,0],size:[10,4,10]},{pos:[0,14,0],size:[5,4,5]},{pos:[-30,5,-30],size:[3,10,3]},{pos:[30,5,-30],size:[3,10,3]},{pos:[-30,5,30],size:[3,10,3]},{pos:[30,5,30],size:[3,10,3]}],portals:[{a:[0,25,-30],b:[0,25,30],color:16729343}]}},KEYS:{PLAYER_1:{UP:"KeyW",DOWN:"KeyS",LEFT:"KeyA",RIGHT:"KeyD",ROLL_LEFT:"KeyQ",ROLL_RIGHT:"KeyE",BOOST:"ShiftLeft",SHOOT:"KeyF",NEXT_ITEM:"KeyR",DROP:"KeyG",CAMERA:"KeyC"},PLAYER_2:{UP:"ArrowUp",DOWN:"ArrowDown",LEFT:"ArrowLeft",RIGHT:"ArrowRight",ROLL_LEFT:"KeyN",ROLL_RIGHT:"KeyM",BOOST:"ShiftRight",SHOOT:"KeyJ",NEXT_ITEM:"KeyL",DROP:"KeyH",CAMERA:"KeyV"}}};function Ys(r,t){!r||!r.isTexture||t.has(r)||(t.add(r),r.dispose())}function Lc(r,t={}){const e=t.seenMaterials||new Set,n=t.seenTextures||new Set,i=typeof t.skipMaterial=="function"?t.skipMaterial:()=>!1;if(r){if(Array.isArray(r)){for(const s of r)Lc(s,{seenMaterials:e,seenTextures:n,skipMaterial:i});return}if(!(i(r)||e.has(r))){e.add(r);for(const s of Object.keys(r)){const a=r[s];if(a){if(a.isTexture){Ys(a,n);continue}if(Array.isArray(a))for(const o of a)Ys(o,n)}}if(r.uniforms&&typeof r.uniforms=="object")for(const s of Object.values(r.uniforms)){const a=s==null?void 0:s.value;if(a){if(a.isTexture){Ys(a,n);continue}if(Array.isArray(a))for(const o of a)Ys(o,n)}}r.dispose()}}}function Fo(r,t={}){if(!r||typeof r.traverse!="function")return;const e=new Set,n=new Set,i=new Set,s=typeof t.skipGeometry=="function"?t.skipGeometry:o=>{var l;return((l=o==null?void 0:o.userData)==null?void 0:l.__sharedNoDispose)===!0},a=typeof t.skipMaterial=="function"?t.skipMaterial:()=>!1;r.traverse(o=>{o!=null&&o.isInstancedMesh&&typeof o.dispose=="function"&&o.dispose();const l=o==null?void 0:o.geometry;l&&typeof l.dispose=="function"&&!s(l)&&!e.has(l)&&(e.add(l),l.dispose()),o!=null&&o.material&&Lc(o.material,{seenMaterials:n,seenTextures:i,skipMaterial:a})})}class Z0{constructor(t){this.canvas=t,this.renderer=new vc({canvas:this.canvas,antialias:window.devicePixelRatio<=1,alpha:!1}),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,D.RENDER.MAX_PIXEL_RATIO)),this.renderer.setSize(window.innerWidth,window.innerHeight),this._width=window.innerWidth,this._height=window.innerHeight,this.renderer.shadowMap.enabled=!0,this.renderer.shadowMap.type=Vc,this.renderer.toneMapping=io,this.renderer.toneMappingExposure=1.2,this.renderer.setClearColor(D.COLORS.BACKGROUND),this.scene=new o0,this.scene.fog=new Ro(D.COLORS.BACKGROUND,50,200),this._setupLights(),this._setupSceneRoots(),this.cameras=[],this.cameraTargets=[],this.cameraModes=[],this.cameraBoostBlend=[],this.splitScreen=!1,window.addEventListener("resize",()=>this._onResize()),this._tmpVec=new b,this._tmpVec2=new b,this._tmpLookAt=new b,this._tmpCamDir=new b,this._tmpCamProbe=new b}_setupLights(){const t=new j0(D.COLORS.AMBIENT_LIGHT,.8);this.scene.add(t);const e=new wl(16777215,.8);e.position.set(30,50,30),e.castShadow=!0,e.shadow.mapSize.set(D.RENDER.SHADOW_MAP_SIZE,D.RENDER.SHADOW_MAP_SIZE),e.shadow.camera.near=1,e.shadow.camera.far=150,e.shadow.camera.left=-60,e.shadow.camera.right=60,e.shadow.camera.top=60,e.shadow.camera.bottom=-60,this.scene.add(e);const n=new wl(4482730,.3);n.position.set(-20,30,-10),this.scene.add(n)}_setupSceneRoots(){this.persistentRoot=new ae,this.persistentRoot.name="persistentRoot",this.scene.add(this.persistentRoot),this.matchRoot=new ae,this.matchRoot.name="matchRoot",this.scene.add(this.matchRoot),this.debugRoot=new ae,this.debugRoot.name="debugRoot",this.scene.add(this.debugRoot)}createCamera(t){const e=new Ze(D.CAMERA.FOV,this._getAspect(),D.CAMERA.NEAR,D.CAMERA.FAR);return e.position.set(0,15,20),this.cameras.push(e),this.cameraTargets.push({position:new b,lookAt:new b}),this.cameraModes.push(0),this.cameraBoostBlend.push(0),e}setSplitScreen(t){this.splitScreen=t,this._updateCameraAspects()}cycleCamera(t){t<this.cameraModes.length&&(this.cameraModes[t]=(this.cameraModes[t]+1)%D.CAMERA.MODES.length)}getCameraMode(t){return D.CAMERA.MODES[this.cameraModes[t]||0]}updateCamera(t,e,n,i,s=null,a=!1,o=!1,l=null,c=null){if(t>=this.cameras.length)return;const h=this.cameras[t],d=this.cameraTargets[t],u=this.getCameraMode(t),f=D.CAMERA.SMOOTHING,g=u==="FIRST_PERSON"&&!0&&!!c,_=D.CAMERA.FIRST_PERSON_NOSE_CLEARANCE,m=g&&u==="FIRST_PERSON",p=u==="FIRST_PERSON"&&o?1:0,x=Math.max(.001,D.CAMERA.FIRST_PERSON_BOOST_BLEND_SPEED),v=1-Math.exp(-x*Math.max(0,i)),y=this.cameraBoostBlend[t]||0,P=zn.clamp(zn.lerp(y,p,v),0,1);this.cameraBoostBlend[t]=P;const A=zn.lerp(D.CAMERA.FIRST_PERSON_OFFSET,D.CAMERA.FIRST_PERSON_BOOST_OFFSET,P);if(a&&s){u==="THIRD_PERSON"?(this._tmpVec.set(0,D.CAMERA.FOLLOW_HEIGHT,D.CAMERA.FOLLOW_DISTANCE),this._tmpVec.applyQuaternion(s),d.position.copy(e).add(this._tmpVec)):u==="FIRST_PERSON"?g?(d.position.copy(c),d.position.addScaledVector(n,_)):(this._tmpVec.set(0,0,-A),this._tmpVec.applyQuaternion(s),d.position.copy(e).add(this._tmpVec),this._resolveCameraCollision(e,d.position,l)):u==="TOP_DOWN"&&(this._tmpVec.set(0,40,5),this._tmpVec.applyQuaternion(s),d.position.copy(e).add(this._tmpVec));const R=m?1:1-Math.pow(1-f,i*60);h.position.lerp(d.position,R),m?h.quaternion.copy(s):h.quaternion.slerp(s,R)}else{if(u==="THIRD_PERSON"?(this._tmpVec.copy(n).multiplyScalar(-12),this._tmpVec.y+=D.CAMERA.FOLLOW_HEIGHT,d.position.copy(e).add(this._tmpVec),this._tmpVec2.copy(n).multiplyScalar(D.CAMERA.LOOK_AHEAD),d.lookAt.copy(e).add(this._tmpVec2)):u==="FIRST_PERSON"?g?(d.position.copy(c),d.position.addScaledVector(n,_),this._tmpVec2.copy(n).multiplyScalar(20),d.lookAt.copy(d.position).add(this._tmpVec2)):(this._tmpVec.copy(n).multiplyScalar(A),d.position.copy(e).add(this._tmpVec),this._resolveCameraCollision(e,d.position,l),this._tmpVec2.copy(n).multiplyScalar(20),d.lookAt.copy(e).add(this._tmpVec2)):u==="TOP_DOWN"&&(d.position.set(e.x,e.y+40,e.z+5),d.lookAt.copy(e)),m){h.position.copy(d.position),h.lookAt(d.lookAt);return}const R=1-Math.pow(1-f,i*60);h.position.lerp(d.position,R),h.getWorldDirection(this._tmpLookAt),this._tmpLookAt.multiplyScalar(10).add(h.position),this._tmpLookAt.lerp(d.lookAt,R),h.lookAt(this._tmpLookAt)}}_resolveCameraCollision(t,e,n){if(!n||typeof n.checkCollision!="function")return;const i=Math.max(.05,D.CAMERA.COLLISION_RADIUS);if(!n.checkCollision(e,i)||(this._tmpCamDir.copy(e).sub(t),this._tmpCamDir.lengthSq()<1e-6))return;let s=0,a=1,o=0;const l=Math.max(4,Math.floor(D.CAMERA.COLLISION_STEPS));for(let d=0;d<l;d++){const u=(s+a)*.5;this._tmpCamProbe.copy(t).addScaledVector(this._tmpCamDir,u),n.checkCollision(this._tmpCamProbe,i)?a=u:(o=u,s=u)}const c=Math.max(0,D.CAMERA.COLLISION_BACKOFF),h=Math.max(0,o-c);e.copy(t).addScaledVector(this._tmpCamDir,h)}render(){const t=this._width,e=this._height;this.splitScreen&&this.cameras.length>=2?(this.renderer.setViewport(0,0,t/2,e),this.renderer.setScissor(0,0,t/2,e),this.renderer.setScissorTest(!0),this.renderer.render(this.scene,this.cameras[0]),this.renderer.setViewport(t/2,0,t/2,e),this.renderer.setScissor(t/2,0,t/2,e),this.renderer.render(this.scene,this.cameras[1]),this.renderer.setScissorTest(!1)):this.cameras.length>0&&(this.renderer.setViewport(0,0,t,e),this.renderer.render(this.scene,this.cameras[0]))}_getAspect(){return this.splitScreen?this._width/2/this._height:this._width/this._height}_updateCameraAspects(){const t=this._getAspect();for(const e of this.cameras)e.aspect=t,e.updateProjectionMatrix()}_onResize(){this._width=window.innerWidth,this._height=window.innerHeight,this.renderer.setSize(this._width,this._height),this._updateCameraAspects()}addToScene(t){this.matchRoot.add(t)}addToPersistentScene(t){this.persistentRoot.add(t)}addToDebugScene(t){this.debugRoot.add(t)}removeFromScene(t){t!=null&&t.parent&&t.parent.remove(t)}_clearRoot(t){if(t)for(Fo(t);t.children.length>0;)t.remove(t.children[t.children.length-1])}_resetCameras(){this.cameras=[],this.cameraTargets=[],this.cameraModes=[],this.cameraBoostBlend=[]}clearMatchScene(){this._clearRoot(this.matchRoot),this._resetCameras()}clearScene(){this._clearRoot(this.matchRoot),this._clearRoot(this.debugRoot),this._resetCameras()}setQuality(t){t==="LOW"?(this.renderer.shadowMap.enabled=!1,this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,.8)),this.renderer.toneMapping=wn,this.scene.fog.near=30,this.scene.fog.far=120):(this.renderer.shadowMap.enabled=!0,this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,D.RENDER.MAX_PIXEL_RATIO)),this.renderer.toneMapping=io,this.scene.fog.near=50,this.scene.fog.far=200),this.scene.traverse(e=>{e.isMesh&&e.material&&(e.material.needsUpdate=!0)})}}class J0{constructor(t,e){this.updateFn=t,this.renderFn=e,this.running=!1,this.lastTime=0,this.timeScale=1,this._boundLoop=this._loop.bind(this),this.frameId=null,this._errorShown=!1,this.accumulator=0,this.fixedStep=1/60}start(){this.running=!0,this.lastTime=performance.now(),this._errorShown=!1,this.frameId=requestAnimationFrame(this._boundLoop)}stop(){this.running=!1,this.frameId&&(cancelAnimationFrame(this.frameId),this.frameId=null)}setTimeScale(t){this.timeScale=t}_loop(t){if(!this.running)return;const e=(t-this.lastTime)/1e3;this.lastTime=t;const n=Math.min(e,.05);this.accumulator+=n*this.timeScale;const i=this.fixedStep*3;this.accumulator>i&&(this.accumulator=i);try{let s=!1;for(;this.accumulator>=this.fixedStep;)this.updateFn(this.fixedStep),this.accumulator-=this.fixedStep,s=!0;!s&&n>0&&this.updateFn(n*this.timeScale),this.renderFn()}catch(s){if(!this._errorShown){this._errorShown=!0,console.error("GameLoop error:",s);const a=document.createElement("div");a.style.cssText="position:fixed;top:0;left:0;width:100%;padding:20px;background:#c00;color:#fff;font:16px monospace;z-index:99999;white-space:pre-wrap;",a.textContent="FEHLER: "+s.message+`

`+s.stack,document.body.appendChild(a)}}this.frameId=requestAnimationFrame(this._boundLoop)}}const bl=["UP","DOWN","LEFT","RIGHT","ROLL_LEFT","ROLL_RIGHT","BOOST","SHOOT","NEXT_ITEM","DROP","CAMERA"];function Rl(r){return JSON.parse(JSON.stringify(r))}class Q0{constructor(){this.keys={},this.justPressed={},this.bindings=Rl(D.KEYS),this._preventDefaultCodes=new Set,this._reuseInput={pitchUp:!1,pitchDown:!1,yawLeft:!1,yawRight:!1,rollLeft:!1,rollRight:!1,boost:!1,cameraSwitch:!1,dropItem:!1,shootItem:!1,nextItem:!1},this._rebuildPreventDefaultCodes(),window.addEventListener("keydown",t=>{this.keys[t.code]||(this.justPressed[t.code]=!0),this.keys[t.code]=!0,this._shouldPreventDefault(t.code)&&t.preventDefault()}),window.addEventListener("keyup",t=>{this.keys[t.code]=!1,this._shouldPreventDefault(t.code)&&t.preventDefault()})}setBindings(t){this.bindings={PLAYER_1:this._normalizePlayerBindings(t==null?void 0:t.PLAYER_1,D.KEYS.PLAYER_1),PLAYER_2:this._normalizePlayerBindings(t==null?void 0:t.PLAYER_2,D.KEYS.PLAYER_2)},this._rebuildPreventDefaultCodes()}getBindings(){return Rl(this.bindings)}_normalizePlayerBindings(t,e){const n=t||{},i={};for(const s of bl)i[s]=n[s]||e[s];return i}_rebuildPreventDefaultCodes(){var n,i;const t=new Set(["Escape","Enter"]),e=s=>{if(s)for(const a of bl){const o=s[a];typeof o=="string"&&o.length>0&&t.add(o)}};e((n=this.bindings)==null?void 0:n.PLAYER_1),e((i=this.bindings)==null?void 0:i.PLAYER_2),this._preventDefaultCodes=t}_shouldPreventDefault(t){return this._preventDefaultCodes.has(t)}isDown(t){return!!this.keys[t]}wasPressed(t){return this.justPressed[t]?(this.justPressed[t]=!1,!0):!1}clearJustPressed(){this.justPressed={}}_resetInput(t){t.pitchUp=!1,t.pitchDown=!1,t.yawLeft=!1,t.yawRight=!1,t.rollLeft=!1,t.rollRight=!1,t.boost=!1,t.cameraSwitch=!1,t.dropItem=!1,t.shootItem=!1,t.nextItem=!1}_isActionDown(t,e=""){return this.isDown(t)?!0:!!e&&this.isDown(e)}_wasActionPressed(t,e=""){let n=this.wasPressed(t);return e&&e!==t&&(n=this.wasPressed(e)||n),n}getPlayerInput(t,e={}){const n=!!e.includeSecondaryBindings&&t===0,i=t===0?this.bindings.PLAYER_1:this.bindings.PLAYER_2,s=n?this.bindings.PLAYER_2:null;return this._resetInput(this._reuseInput),this._reuseInput.pitchUp=this._isActionDown(i.UP,(s==null?void 0:s.UP)||""),this._reuseInput.pitchDown=this._isActionDown(i.DOWN,(s==null?void 0:s.DOWN)||""),this._reuseInput.yawLeft=this._isActionDown(i.LEFT,(s==null?void 0:s.LEFT)||""),this._reuseInput.yawRight=this._isActionDown(i.RIGHT,(s==null?void 0:s.RIGHT)||""),this._reuseInput.rollLeft=this._isActionDown(i.ROLL_LEFT,(s==null?void 0:s.ROLL_LEFT)||""),this._reuseInput.rollRight=this._isActionDown(i.ROLL_RIGHT,(s==null?void 0:s.ROLL_RIGHT)||""),this._reuseInput.boost=this._isActionDown(i.BOOST,(s==null?void 0:s.BOOST)||""),this._reuseInput.cameraSwitch=this._wasActionPressed(i.CAMERA,(s==null?void 0:s.CAMERA)||""),this._reuseInput.dropItem=this._wasActionPressed(i.DROP,(s==null?void 0:s.DROP)||""),this._reuseInput.shootItem=this._wasActionPressed(i.SHOOT,(s==null?void 0:s.SHOOT)||""),this._reuseInput.nextItem=this._wasActionPressed(i.NEXT_ITEM,(s==null?void 0:s.NEXT_ITEM)||""),this._reuseInput}}class tg{constructor(t){this.renderer=t,this.obstacles=[],this.portals=[],this.portalsEnabled=!0,this.bounds={minX:0,maxX:0,minY:0,maxY:0,minZ:0,maxZ:0},this._tmpSphere=new dn}build(t){const e=D.MAPS.standard||Object.values(D.MAPS||{})[0]||{name:"Fallback Map",size:[80,30,80],obstacles:[],portals:[]},n=typeof t=="string"&&!!D.MAPS[t],i=n?D.MAPS[t]:e;this.currentMapKey=n?t:"standard";const s=D.ARENA.MAP_SCALE,a=Array.isArray(e.size)?e.size:[80,30,80],o=Array.isArray(i.size)?i.size:a,l=Number.isFinite(o[0])&&o[0]>0?o[0]:a[0],c=Number.isFinite(o[1])&&o[1]>0?o[1]:a[1],h=Number.isFinite(o[2])&&o[2]>0?o[2]:a[2],d=l*s,u=c*s,f=h*s,g=d/2,_=u/2,m=f/2;this.bounds={minX:-g,maxX:g,minY:0,maxY:u,minZ:-m,maxZ:m};const p=this._createCheckerTexture(D.ARENA.CHECKER_LIGHT_COLOR,D.ARENA.CHECKER_DARK_COLOR),x=Math.max(1,D.ARENA.CHECKER_WORLD_SIZE),v=p;v.needsUpdate=!0,v.repeat.set(Math.max(1,d/x),Math.max(1,f/x));const y=p.clone();y.needsUpdate=!0,y.repeat.set(Math.max(1,d/x),Math.max(1,u/x));const P=new St({color:16777215,map:y,transparent:!0,opacity:.9,roughness:.75,metalness:.1,side:ge}),A=new St({color:16777215,map:v,roughness:.9,metalness:.05}),R=new St({color:2763338,roughness:.4,metalness:.5,transparent:!0,opacity:.6}),N=new X(new lr(d,f),A);N.rotation.x=-Math.PI/2,N.receiveShadow=!0,N.matrixAutoUpdate=!1,N.updateMatrix(),this.renderer.addToScene(N);const M=D.ARENA.WALL_THICKNESS*s;this._addWall(0,_,m+M/2,d+2*M,u,M,P),this._addWall(0,_,-m-M/2,d+2*M,u,M,P),this._addWall(-g-M/2,_,0,M,u,f,P),this._addWall(g+M/2,_,0,M,u,f,P),this._addWall(0,u,0,d,M,f,P);const w=Array.isArray(i.obstacles)?i.obstacles:[];for(const U of w){if(!U||!Array.isArray(U.pos)||!Array.isArray(U.size))continue;const V=Number(U.pos[0]),J=Number(U.pos[1]),L=Number(U.pos[2]),B=Number(U.size[0]),k=Number(U.size[1]),j=Number(U.size[2]);[V,J,L,B,k,j].every(Number.isFinite)&&(B<=0||k<=0||j<=0||this._addObstacle(V*s,J*s,L*s,B*s,k*s,j*s,R))}this._buildPortals(i,s),this._addParticles(d,u,f)}_buildPortals(t,e){if(this.portals=[],!this.portalsEnabled)return;const n=Math.max(0,Math.floor(D.GAMEPLAY.PORTAL_COUNT||0));if(n>0){this._buildFixedDynamicPortals(n);return}if(Array.isArray(t.portals))for(const i of t.portals)this._createPortalFromDef(i,e);this._validatePortalPlacements()}_createPortalFromDef(t,e){if(!t||!Array.isArray(t.a)||!Array.isArray(t.b))return;const n=Number(t.a[0]),i=Number(t.a[1]),s=Number(t.a[2]),a=Number(t.b[0]),o=Number(t.b[1]),l=Number(t.b[2]);if(![n,i,s,a,o,l].every(Number.isFinite))return;const c=this._resolvePortalPosition(new b(n*e,i*e,s*e),11),h=this._resolvePortalPosition(new b(a*e,o*e,l*e),29),d=Number.isFinite(t.color)?t.color:65484;this._addPortalInstance(c,h,d,"NEUTRAL","NEUTRAL")}_buildFixedDynamicPortals(t){D.GAMEPLAY.PLANAR_MODE?this._buildFixedPlanarPortals(t):this._buildFixed3DPortals(t)}_buildFixed3DPortals(t){const e=[65484,16711884,16776960,52479,16746564,6750020],n=this._getMapPortalSlots3D();if(!(n.length<2))for(let i=0;i<t;i++){const s=n[i*2%n.length],a=n[(i*2+5)%n.length],o=n[(i*2+7)%n.length],l=this._portalPositionFromSlot(s,i*13+5);let c=this._portalPositionFromSlot(a,i*17+9);l.distanceToSquared(c)<64&&(c=this._portalPositionFromSlot(o,i*23+3)),this._addPortalInstance(l,c,e[i%e.length],"NEUTRAL","NEUTRAL")}}_buildFixedPlanarPortals(t){const e=[65484,16711884,16776960,52479,16746564,6750020],n=this._getMapPlanarAnchors(),i=this.getPortalLevelsFallback();if(n.length===0||i.length<2)return;const s=i.length-1;for(let a=0;a<t;a++){const o=n[a%n.length],l=(a+Math.floor(a/Math.max(1,n.length)))%s,c=i[l],h=i[l+1],d=this._resolvePlanarElevatorPair(o[0],o[1],c,h,a*29+7);d&&this._addPortalInstance(d.low,d.high,e[a%e.length],"UP","DOWN")}}_getMapPortalSlots3D(){const t={standard:[[-.75,.18,-.75],[.75,.18,.75],[.75,.35,-.75],[-.75,.35,.75],[-.2,.52,-.82],[.2,.52,.82],[-.82,.62,.2],[.82,.62,-.2],[0,.26,-.35],[0,.58,.35],[-.45,.72,0],[.45,.72,0]],empty:[[-.78,.2,-.78],[.78,.2,.78],[.78,.2,-.78],[-.78,.2,.78],[0,.45,-.82],[0,.45,.82],[-.82,.45,0],[.82,.45,0],[-.35,.72,-.35],[.35,.72,.35],[.35,.72,-.35],[-.35,.72,.35]],maze:[[-.8,.22,-.6],[.8,.22,.6],[-.8,.22,.6],[.8,.22,-.6],[-.25,.5,-.8],[.25,.5,.8],[-.6,.62,0],[.6,.62,0],[0,.35,-.2],[0,.35,.2],[-.4,.75,-.35],[.4,.75,.35]],complex:[[-.82,.2,-.82],[.82,.2,.82],[.82,.2,-.82],[-.82,.2,.82],[-.5,.42,-.1],[.5,.42,.1],[-.1,.55,.5],[.1,.55,-.5],[0,.72,-.72],[0,.72,.72],[-.72,.72,0],[.72,.72,0]],pyramid:[[-.78,.18,-.78],[.78,.18,.78],[.78,.18,-.78],[-.78,.18,.78],[-.45,.38,-.45],[.45,.38,.45],[0,.58,-.78],[0,.58,.78],[-.78,.58,0],[.78,.58,0],[-.2,.78,0],[.2,.78,0]]};return t[this.currentMapKey]||t.standard}_getMapPlanarAnchors(){const t={standard:[[-.7,-.7],[.7,-.7],[.7,.7],[-.7,.7],[0,-.45],[0,.45],[-.45,0],[.45,0]],empty:[[-.75,-.75],[.75,-.75],[.75,.75],[-.75,.75],[0,-.55],[0,.55],[-.55,0],[.55,0]],maze:[[-.78,-.62],[.78,-.62],[.78,.62],[-.78,.62],[0,-.72],[0,.72],[-.52,0],[.52,0]],complex:[[-.82,-.82],[.82,-.82],[.82,.82],[-.82,.82],[-.55,0],[.55,0],[0,-.55],[0,.55]],pyramid:[[-.78,-.78],[.78,-.78],[.78,.78],[-.78,.78],[-.48,0],[.48,0],[0,-.48],[0,.48]]};return t[this.currentMapKey]||t.standard}_portalPositionFromSlot(t,e){const n=this.bounds,i=D.PORTAL.RING_SIZE+2.5,s=(t[0]+1)*.5,a=t[1],o=(t[2]+1)*.5,l=new b(n.minX+i+s*(n.maxX-n.minX-2*i),n.minY+i+a*(n.maxY-n.minY-2*i),n.minZ+i+o*(n.maxZ-n.minZ-2*i));return this._resolvePortalPosition(l,e)}_portalPositionFromXZLevel(t,e,n,i){const s=this.bounds,a=D.PORTAL.RING_SIZE+2.5,o=new b(s.minX+a+(t+1)*.5*(s.maxX-s.minX-2*a),n,s.minZ+a+(e+1)*.5*(s.maxZ-s.minZ-2*a));return this._resolvePortalPosition(o,i)}_resolvePlanarElevatorPair(t,e,n,i,s=0){const a=Math.min(n,i),o=Math.max(n,i),l=this.bounds,c=D.PORTAL.RING_SIZE+2.5,h=D.PORTAL.RADIUS*.75,d=l.minX+c+(t+1)*.5*(l.maxX-l.minX-2*c),u=l.minZ+c+(e+1)*.5*(l.maxZ-l.minZ-2*c),f=new b,g=new b;for(let v=0;v<28;v++){const y=(s+v*41)%360*Math.PI/180,P=v===0?0:2.2+(v-1)*1.2,A=Math.max(l.minX+c,Math.min(l.maxX-c,d+Math.cos(y)*P)),R=Math.max(l.minZ+c,Math.min(l.maxZ-c,u+Math.sin(y)*P));if(f.set(A,a,R),g.set(A,o,R),!this.checkCollision(f,h)&&!this.checkCollision(g,h))return{low:f.clone(),high:g.clone()}}const _=this._resolvePortalPosition(new b(d,a,u),s),m=new b(_.x,o,_.z);if(!this.checkCollision(m,h))return{low:_,high:m};const p=this._resolvePortalPosition(new b(d,o,u),s+17),x=new b(p.x,a,p.z);return this.checkCollision(x,h)?null:{low:x,high:p}}_resolvePortalPosition(t,e=0){const n=this.bounds,i=D.PORTAL.RING_SIZE+2.5,s=D.PORTAL.RADIUS*.75;if(!this.checkCollision(t,s))return t;const a=new b;for(let o=0;o<20;o++){const l=(e+o*37)%360*Math.PI/180,c=2.5+o*1.3,h=(o%5-2)*1.1;if(a.set(t.x+Math.cos(l)*c,t.y+h,t.z+Math.sin(l)*c),a.x=Math.max(n.minX+i,Math.min(n.maxX-i,a.x)),a.y=Math.max(n.minY+i,Math.min(n.maxY-i,a.y)),a.z=Math.max(n.minZ+i,Math.min(n.maxZ-i,a.z)),!this.checkCollision(a,s))return a.clone()}return t}_addPortalInstance(t,e,n,i="NEUTRAL",s="NEUTRAL"){const a=this._createPortalMesh(t,n,i),o=this._createPortalMesh(e,n,s);this.portals.push({posA:t,posB:e,meshA:a,meshB:o,color:n,cooldowns:new Map})}_createPortalMesh(t,e,n="NEUTRAL"){const i=new ae,s=D.PORTAL.RING_SIZE;let a=e;n==="UP"&&(a=65280),n==="DOWN"&&(a=16711680);const o=new ri(s,.3,16,32),l=new St({color:a,emissive:a,emissiveIntensity:1.2,roughness:.2,metalness:.8}),c=new X(o,l);i.add(c);const h=new Do(s*.85,32),d=new Qt({color:a,transparent:!0,opacity:.15,side:ge}),u=new X(h,d);i.add(u);const f=new ri(s*.6,.15,12,24),g=new St({color:16777215,emissive:a,emissiveIntensity:.5,transparent:!0,opacity:.6}),_=new X(f,g);if(i.add(_),n!=="NEUTRAL"){const m=new Qe(.8,2.5,8),p=new Qt({color:a,transparent:!0,opacity:.8}),x=new X(m,p);n==="UP"?x.position.y=0:n==="DOWN"&&(x.rotation.x=Math.PI,x.position.y=0),i.add(x),i.userData.arrow=x,i.userData.direction=n}return i.position.copy(t),this.renderer.addToScene(i),i}toggleBeams(){}checkPortal(t,e,n){if(!this.portalsEnabled)return null;const i=D.PORTAL.RADIUS,s=(i+e)*(i+e);for(const a of this.portals){if(a.cooldowns.has(n)&&a.cooldowns.get(n)>0)continue;const o=t.distanceToSquared(a.posA),l=t.distanceToSquared(a.posB);if(o<s){const c=a.posA.distanceTo(a.posB),h=Math.max(D.PORTAL.COOLDOWN,c/80);return a.cooldowns.set(n,h),{target:a.posB,portal:a}}if(l<s){const c=a.posA.distanceTo(a.posB),h=Math.max(D.PORTAL.COOLDOWN,c/80);return a.cooldowns.set(n,h),{target:a.posA,portal:a}}}return null}_createCheckerTexture(t,e){const s=document.createElement("canvas");s.width=128,s.height=128;const a=s.getContext("2d"),o=`#${t.toString(16).padStart(6,"0")}`,l=`#${e.toString(16).padStart(6,"0")}`;a.fillStyle=o,a.fillRect(0,0,64,64),a.fillRect(64,64,64,64),a.fillStyle=l,a.fillRect(64,0,64,64),a.fillRect(0,64,64,64);const c=new c0(s);return c.wrapS=Bi,c.wrapT=Bi,c.magFilter=Ce,c.minFilter=$s,c}_addWall(t,e,n,i,s,a,o){const l=new Jt(i,s,a),c=new X(l,o);c.position.set(t,e,n),c.matrixAutoUpdate=!1,c.updateMatrix(),this.renderer.addToScene(c);const h=new We().setFromObject(c);this.obstacles.push({mesh:c,box:h,isWall:!0})}_addObstacle(t,e,n,i,s,a,o){const l=new Jt(i,s,a),c=new E0(l),h=new ts({color:4482730,transparent:!0,opacity:.5}),d=new X(l,o.clone());d.position.set(t,e,n),d.castShadow=!1,d.receiveShadow=!1,d.matrixAutoUpdate=!1,d.updateMatrix(),this.renderer.addToScene(d);const u=new ho(c,h);u.position.copy(d.position),u.matrixAutoUpdate=!1,u.updateMatrix(),this.renderer.addToScene(u);const f=new We().setFromObject(d);this.obstacles.push({mesh:d,box:f,isWall:!1})}_addParticles(t,e,n){const s=new _e,a=new Float32Array(200*3);for(let l=0;l<200;l++)a[l*3]=(Math.random()-.5)*t,a[l*3+1]=Math.random()*e,a[l*3+2]=(Math.random()-.5)*n;s.setAttribute("position",new tn(a,3));const o=new Ci({color:4491519,size:.15,transparent:!0,opacity:.4,sizeAttenuation:!0,sizeAttenuation:!0});this.particles=new Js(s,o),this.renderer.addToScene(this.particles)}checkCollision(t,e){const n=this.bounds;if(t.x-e<n.minX||t.x+e>n.maxX||t.y-e<n.minY||t.y+e>n.maxY||t.z-e<n.minZ||t.z+e>n.maxZ)return!0;this._tmpSphere.center.copy(t),this._tmpSphere.radius=e;for(const i of this.obstacles)if(i.box.intersectsSphere(this._tmpSphere))return!0;return!1}getRandomPosition(t=5){const e=this.bounds;for(let n=0;n<50;n++){const i=e.minX+t+Math.random()*(e.maxX-e.minX-2*t),s=3+Math.random()*(e.maxY-6),a=e.minZ+t+Math.random()*(e.maxZ-e.minZ-2*t),o=new b(i,s,a);if(!this.checkCollision(o,3))return o}return new b(0,D.PLAYER.START_Y,0)}getRandomPositionOnLevel(t,e=5){const n=this.bounds,i=Math.max(n.minY+3,Math.min(n.maxY-3,t));for(let s=0;s<50;s++){const a=n.minX+e+Math.random()*(n.maxX-n.minX-2*e),o=n.minZ+e+Math.random()*(n.maxZ-n.minZ-2*e),l=new b(a,i,o);if(!this.checkCollision(l,3))return l}return new b(0,i,0)}getPortalLevelsFallback(){const t=this.bounds,e=Math.max(1,t.maxY-t.minY),n=Math.max(2,Math.floor(D.GAMEPLAY.PLANAR_LEVEL_COUNT||5)),i=.18,s=.82,a=[];for(let o=0;o<n;o++){const l=n<=1?.5:o/(n-1),c=i+(s-i)*l;a.push(t.minY+e*c)}return a}getPortalLevels(){const t=[];for(const n of this.portals)for(const i of[n.posA.y,n.posB.y]){let s=!1;for(const a of t)if(Math.abs(a-i)<=.35){s=!0;break}s||t.push(i)}return t.length===0?this.getPortalLevelsFallback():(t.sort((n,i)=>n-i),t)}update(t){this.particles&&(this.particles.rotation.y+=t*.02);const e=D.PORTAL.ROTATION_SPEED;for(const n of this.portals){n.meshA&&(n.meshA.rotation.z+=t*e,n.meshA.rotation.y+=t*e*.3),n.meshB&&(n.meshB.rotation.z-=t*e,n.meshB.rotation.y-=t*e*.3);const i=[];for(const[s,a]of n.cooldowns){const o=a-t;o<=0?i.push(s):n.cooldowns.set(s,o)}for(let s=0;s<i.length;s++)n.cooldowns.delete(i[s])}}_validatePortalPlacements(){if(!this.portals||this.portals.length===0)return;const t=D.GAMEPLAY.PLANAR_MODE?D.PORTAL.MIN_PAIR_DISTANCE_PLANAR:D.PORTAL.MIN_PAIR_DISTANCE,e=t*t;for(let n=this.portals.length-1;n>=0;n--){const i=this.portals[n];i.posA.distanceToSquared(i.posB)<e&&(console.warn(`[Arena] Portal pair ${n} too close together! Removing.`),this.portals.splice(n,1))}}}const eg=new qt(1,1,1,4),ng=new b(0,1,0),rn=new ee;class ig{constructor(t,e,n,i=null){this.renderer=t,this.color=e,this.playerIndex=n,this.entityManager=i,this.maxSegments=D.TRAIL.MAX_SEGMENTS,this.writeIndex=0,this.segmentCount=0,this._dirty=!1,this.timeSinceUpdate=0,this.hasLastPosition=!1,this.lastX=0,this.lastY=0,this.lastZ=0,this.inGap=!1,this.gapTimer=0,this.width=D.TRAIL.WIDTH,this._tmpDir=new b,this.material=new St({color:e,emissive:e,emissiveIntensity:.3,roughness:.3,metalness:.6}),this.mesh=new xc(eg,this.material,this.maxSegments),this.mesh.instanceMatrix.setUsage(Jl),this.mesh.castShadow=!1,this.mesh.receiveShadow=!1,this.mesh.frustumCulled=!1,rn.scale.set(0,0,0),rn.updateMatrix();for(let s=0;s<this.maxSegments;s++)this.mesh.setMatrixAt(s,rn.matrix);this.renderer.addToScene(this.mesh),this.segmentRefs=new Array(this.maxSegments).fill(null)}setWidth(t){this.width=t}resetWidth(){this.width=D.TRAIL.WIDTH}forceGap(t=.5){this.inGap=!0,this.gapTimer=t,this.hasLastPosition=!1}update(t,e,n){if(this.inGap){this.gapTimer-=t,this.gapTimer<=0&&(this.inGap=!1),this._setLastPosition(e);return}if(this.timeSinceUpdate+=t,this.timeSinceUpdate>=D.TRAIL.UPDATE_INTERVAL){if(this.timeSinceUpdate-=D.TRAIL.UPDATE_INTERVAL,Math.random()<D.TRAIL.GAP_CHANCE){this.inGap=!0,this.gapTimer=D.TRAIL.GAP_DURATION,this._setLastPosition(e);return}this.hasLastPosition&&this._addSegment(this.lastX,this.lastY,this.lastZ,e.x,e.y,e.z),this._setLastPosition(e)}this._dirty&&(this.mesh.count=Math.min(this.segmentCount,this.maxSegments),this.mesh.instanceMatrix.needsUpdate=!0,this._dirty=!1)}_setLastPosition(t){this.hasLastPosition=!0,this.lastX=t.x,this.lastY=t.y,this.lastZ=t.z}_addSegment(t,e,n,i,s,a){const o=i-t,l=s-e,c=a-n,h=Math.sqrt(o*o+l*l+c*c);if(h<.01)return;if(this.segmentCount>=this.maxSegments){const _=this.segmentRefs[this.writeIndex];_&&this.entityManager&&this.entityManager.unregisterTrailSegment(_.key,_.entry)}const d=this.width*.5,u=(t+i)*.5,f=(e+s)*.5,g=(n+a)*.5;rn.position.set(u,f,g),this._tmpDir.set(o/h,l/h,c/h),rn.quaternion.setFromUnitVectors(ng,this._tmpDir),rn.scale.set(d,h,d),rn.updateMatrix(),this.mesh.setMatrixAt(this.writeIndex,rn.matrix),this._dirty=!0,this.entityManager&&(this.segmentRefs[this.writeIndex]=this.entityManager.registerTrailSegment(this.playerIndex,this.writeIndex,{midX:u,midZ:g,fromX:t,fromY:e,fromZ:n,toX:i,toY:s,toZ:a,radius:d})),this.writeIndex=(this.writeIndex+1)%this.maxSegments,this.segmentCount<this.maxSegments&&this.segmentCount++}clear(){rn.scale.set(0,0,0),rn.updateMatrix();for(let t=0;t<this.maxSegments;t++)this.segmentRefs[t]&&this.entityManager&&this.entityManager.unregisterTrailSegment(this.segmentRefs[t].key,this.segmentRefs[t].entry),this.mesh.setMatrixAt(t,rn.matrix),this.segmentRefs[t]=null;this.mesh.instanceMatrix.needsUpdate=!0,this.mesh.count=0,this.writeIndex=0,this.segmentCount=0,this.hasLastPosition=!1,this.timeSinceUpdate=0,this.inGap=!1}dispose(){this.renderer.removeFromScene(this.mesh),this.mesh.dispose(),this.material.dispose()}}class sg extends ae{constructor(t){super(),this.playerColor=t,this.primaryMat=new St({color:t,roughness:.3,metalness:.6,emissive:new wt(t).multiplyScalar(.2),emissiveIntensity:.2}),this.secondaryMat=new St({color:3359061,roughness:.7,metalness:.2}),this.cockpitMat=new Uo({color:1976635,transmission:.5,opacity:.7,roughness:.2,metalness:.1,clearcoat:1,clearcoatRoughness:.1}),this.glowMat=new Qt({color:6333946,transparent:!0,opacity:.8}),this.engineCoreMat=new St({color:65535,emissive:65535,emissiveIntensity:2,metalness:1,roughness:0}),this.forceFieldMat=new St({color:65535,transparent:!0,opacity:.25,side:ge,wireframe:!1,emissive:65535,emissiveIntensity:.5}),this._time=0,this.forceFields=[],this.createBody(),this.createWings(),this.createTail(),this.createCockpit(),this.createEngines(),this.createCannon()}createBody(){const t=new qt(.5,.7,5,12);t.rotateX(Math.PI/2);const e=new X(t,this.primaryMat);e.position.z=-.4,this.add(e);const n=new Qe(.5,1.6,12);n.rotateX(-Math.PI/2);const i=new X(n,this.primaryMat);i.position.z=-3.7,this.add(i)}createWings(){const t=new He;t.moveTo(0,0),t.lineTo(2.4,2),t.lineTo(2.4,.8),t.lineTo(0,-1.2);const e=new ze(t,{depth:.2,bevelEnabled:!0,bevelSize:.1,bevelThickness:.1});e.rotateX(Math.PI/2),e.rotateY(-Math.PI/2);const n=new X(e,this.primaryMat);n.position.set(-.4,0,.8),n.rotation.x=Math.PI,this.add(n);const i=new X(e,this.primaryMat);i.position.set(.4,0,.8),this.add(i);const s=new He;s.moveTo(0,0),s.lineTo(.8,.6),s.lineTo(.8,.2),s.lineTo(0,-.4);const a=new ze(s,{depth:.1,bevelEnabled:!1});a.rotateX(Math.PI/2),a.rotateY(-Math.PI/2);const o=new X(a,this.secondaryMat);o.position.set(-.4,-.1,-1.6),o.rotation.x=Math.PI,this.add(o);const l=new X(a,this.secondaryMat);l.position.set(.4,-.1,-1.6),this.add(l)}createTail(){const t=new He;t.moveTo(0,0),t.lineTo(1,1.2),t.lineTo(.6,1.2),t.lineTo(-.4,0);const e=new ze(t,{depth:.16,bevelEnabled:!0,bevelSize:.04,bevelThickness:.04});e.translate(-.3,0,0);const n=new X(e,this.primaryMat);n.position.set(0,.4,1.6),n.rotation.y=Math.PI/2,this.add(n)}createCockpit(){const t=new Io(.28,.8,4,8),e=new X(t,this.cockpitMat);e.rotation.x=Math.PI/2,e.position.set(0,.36,-.8),this.add(e)}createEngines(){const t=new qt(.28,.24,1,12);t.rotateX(Math.PI/2);const e=new qt(.16,.2,.3,12,1,!0);e.rotateX(Math.PI/2);const n=new xe(.12,12,8),i=(h,d)=>{const u=new ae;u.position.set(h,.1,d);const f=new X(t,this.secondaryMat);u.add(f);const g=new X(e,new St({color:1118481,metalness:1,roughness:.2}));g.position.z=.5,u.add(g);const _=new X(n,this.engineCoreMat);_.position.z=.36,u.add(_);const m=new Jt(.08,.08,.24);for(let p=0;p<4;p++){const x=new X(m,this.secondaryMat),v=p/4*Math.PI*2;x.position.set(Math.cos(v)*.26,Math.sin(v)*.26,0),u.add(x)}return this.add(u),u},s=i(-2.6,4.4),a=i(2.6,4.4),o=(h,d,u,f)=>{const g=Math.sqrt(Math.pow(u-h,2)+Math.pow(f-d,2)),_=new qt(.06,.06,g,8,1,!0);_.rotateZ(Math.PI/2);const m=new X(_,this.forceFieldMat.clone());m.position.set((h+u)/2,.1,(d+f)/2),this.add(m),this.forceFields.push(m);const p=new X(_,new Qt({color:65535,wireframe:!0,transparent:!0,opacity:.2}));m.add(p)};o(-2.4,2,-2.6,4.4),o(2.4,2,2.6,4.4);const l=new qt(.16,.002,.6,8);l.rotateX(-Math.PI/2);const c=h=>{const d=new X(l,this.glowMat.clone());d.name="flame",d.position.set(0,0,.7),h.add(d)};c(s),c(a)}tick(t){this._time+=t,this.forceFields.forEach((e,n)=>{const i=.2+.1*Math.sin(this._time*10+n);e.material.opacity=i})}createCannon(){const t=new qt(.06,.06,1.6,6);t.rotateX(Math.PI/2);const e=new St({color:1118481,metalness:.9,roughness:.4}),n=new X(t,e);n.position.set(0,-.36,-1.6),this.add(n),this.muzzle=new ee,this.muzzle.position.set(0,-.36,-2.4),this.add(this.muzzle)}}class rg extends ae{constructor(t){super(),this.playerColor=t,this.primaryMat=new St({color:t,roughness:.2,metalness:.8,emissive:new wt(t).multiplyScalar(.15),emissiveIntensity:.3}),this.darkMat=new St({color:657946,roughness:.5,metalness:.9}),this.glowMat=new Qt({color:65535,transparent:!0,opacity:.9}),this.engineGlowMat=new Qt({color:16737792,transparent:!0,opacity:.85}),this.engineCoreMat=new St({color:65535,emissive:65535,emissiveIntensity:1.5}),this.forceFieldMat=new St({color:65535,transparent:!0,opacity:.3,side:ge,emissive:65535,emissiveIntensity:.5}),this._time=0,this.forceFields=[],this.muzzle=new ee,this.add(this.muzzle),this.muzzle.position.set(0,0,-2.5),this.createSaucer(),this.createCockpitDome(),this.createEngines(),this.createWinglets(),this.createCannon()}createSaucer(){const t=new qt(1,1.2,.25,16),e=new X(t,this.primaryMat);this.add(e);const n=new ri(1.2,.08,8,32);n.rotateX(Math.PI/2);const i=new X(n,this.darkMat);this.add(i);const s=new xe(1.2,12,8,0,Math.PI*2,Math.PI/2,Math.PI/2),a=new X(s,this.darkMat);a.position.y=-.2,this.add(a)}createCockpitDome(){const t=new xe(.625,12,8,0,Math.PI*2,0,Math.PI/2),e=new Uo({color:8965375,transmission:.6,opacity:.75,roughness:.05,metalness:0,clearcoat:1,clearcoatRoughness:.05}),n=new X(t,e);n.position.set(0,.25,-.5),this.add(n)}createEngines(){const t=new qt(.2,.18,.5,12);t.rotateX(Math.PI/2);const e=new qt(.12,.15,.15,12,1,!0);e.rotateX(Math.PI/2);const n=new xe(.1,8,8),i=d=>{const u=new ae;u.position.set(d*2.5,0,1.2);const f=new X(t,this.darkMat);u.add(f);const g=new X(e,new St({color:1118481,metalness:1,roughness:.2}));g.position.z=.25,u.add(g);const _=new X(n,this.engineCoreMat);return _.position.z=.18,u.add(_),this.add(u),u},s=i(-1),a=i(1),o=new qt(.06,.06,1.2,8,1,!0);o.rotateZ(Math.PI/2);const l=d=>{const u=new X(o,this.forceFieldMat.clone());u.position.set(d*2.5,0,.6),u.rotation.x=Math.PI/2,this.add(u),this.forceFields.push(u);const f=new X(o,new Qt({color:65535,wireframe:!0,transparent:!0,opacity:.2}));u.add(f)};l(-1),l(1);const c=new xe(.15,8,8),h=d=>{const u=new X(c,this.engineGlowMat.clone());u.name="flame",u.position.set(0,0,.35),d.add(u)};h(s),h(a)}tick(t){this._time+=t,this.forceFields.forEach((e,n)=>{const i=.2+.1*Math.sin(this._time*10+n);e.material.opacity=i})}createWinglets(){const t=new Jt(.8,.1,2.5),e=new St({color:this.playerColor}),n=new X(t,e);n.position.set(-1.4,0,-1.5),this.add(n);const i=new X(t,e);i.position.set(1.4,0,-1.5),this.add(i)}createCannon(){const t=new qt(.05,.05,1.25,6);t.rotateX(Math.PI/2);const e=new St({color:3359846,metalness:.95,roughness:.2}),n=new X(t,e);n.position.set(-.5,0,-2),this.add(n);const i=new X(t,e);i.position.set(.5,0,-2),this.add(i)}}class og extends ae{constructor(t){super(),this.playerColor=t,this.primaryMat=new St({color:t,roughness:.15,metalness:.85,emissive:new wt(t).multiplyScalar(.25),emissiveIntensity:.4}),this.accentMat=new St({color:16777215,roughness:.1,metalness:.95,emissive:16777215,emissiveIntensity:.1}),this.thrusterMat=new Qt({color:16729088,transparent:!0,opacity:.9}),this.engineCoreMat=new St({color:65535,emissive:65535,emissiveIntensity:2}),this.forceFieldMat=new St({color:65535,transparent:!0,opacity:.25,side:ge,emissive:65535,emissiveIntensity:.5}),this._time=0,this.forceFields=[],this.createBody(),this.createFins(),this.createEngines()}createBody(){const t=new qt(.1,.25,4,8);t.rotateX(Math.PI/2);const e=new X(t,this.primaryMat);e.position.z=1,this.add(e);const n=new Qe(.4,1.2,8);n.rotateX(-Math.PI/2);const i=new X(n,this.primaryMat);i.position.z=-1.6,this.add(i),this.muzzle=new ee,this.muzzle.position.set(i.position.x,i.position.y,-2.2),this.add(this.muzzle)}createArrowhead(){const t=new Qe(1.2,12,8);t.rotateX(-Math.PI/2);const e=new X(t,this.primaryMat);e.position.z=-15,this.add(e);const n=new He;n.moveTo(0,0),n.lineTo(6,5),n.lineTo(8,0),n.lineTo(6,-1);const i=new ze(n,{depth:.6,bevelEnabled:!1});i.rotateX(Math.PI/2),i.rotateY(-Math.PI/2);const s=new X(i,this.primaryMat);s.position.set(-2,0,-7),s.rotation.x=Math.PI,this.add(s);const a=new X(i,this.primaryMat);a.position.set(2,0,-7),this.add(a)}createFins(){const t=new He;t.moveTo(0,0),t.lineTo(0,7/4),t.lineTo(5/4,10/4),t.lineTo(5/4,3/4);const e=new ze(t,{depth:.5/4,bevelEnabled:!1});e.rotateX(Math.PI/2),e.rotateY(-Math.PI/2),[0,Math.PI/2,Math.PI,-Math.PI/2].forEach(i=>{const s=new X(e,this.primaryMat);s.position.z=10/4,s.rotation.z=i,s.position.x=Math.cos(i+Math.PI/2)*(1.5/4),s.position.y=Math.sin(i+Math.PI/2)*(1.5/4),this.add(s)})}createEngines(){const t=new qt(.25,.2,.8,12);t.rotateX(Math.PI/2);const e=new qt(.15,.2,.25,12,1,!0);e.rotateX(Math.PI/2);const n=new xe(.1,8,8),i=d=>{const u=new ae;u.position.set(d*1.6,0,4);const f=new X(t,this.accentMat);u.add(f);const g=new X(e,new St({color:1118481,metalness:1,roughness:.2}));g.position.z=.4,u.add(g);const _=new X(n,this.engineCoreMat);return _.position.z=.3,u.add(_),this.add(u),u},s=i(-1),a=i(1),o=new qt(.05,.05,1.5,8,1,!0);o.rotateZ(Math.PI/2);const l=d=>{const u=new X(o,this.forceFieldMat.clone());u.position.set(d*1.6,0,3.25),u.rotation.x=Math.PI/2,this.add(u),this.forceFields.push(u);const f=new X(o,new Qt({color:65535,wireframe:!0,transparent:!0,opacity:.2}));u.add(f)};l(-1),l(1);const c=new qt(.15,.01,.5,8);c.rotateX(-Math.PI/2);const h=d=>{const u=new X(c,this.thrusterMat.clone());u.name="flame",u.position.set(0,0,.55),d.add(u)};h(s),h(a)}tick(t){this._time+=t,this.forceFields.forEach((e,n)=>{const i=.2+.1*Math.sin(this._time*10+n);e.material.opacity=i})}}class ag extends ae{constructor(t){super(),this.playerColor=t,this.primaryMat=new St({color:t,roughness:.25,metalness:.6,emissive:new wt(t).multiplyScalar(.2),emissiveIntensity:.35,side:ge}),this.darkMat=new St({color:1710638,roughness:.6,metalness:.4}),this.glowMat=new Qt({color:61183,transparent:!0,opacity:.8}),this.engineCoreMat=new St({color:65535,emissive:65535,emissiveIntensity:2}),this.forceFieldMat=new St({color:65535,transparent:!0,opacity:.25,side:ge,emissive:65535,emissiveIntensity:.5}),this._time=0,this.forceFields=[],this.muzzle=new ee,this.add(this.muzzle),this.muzzle.position.set(0,-.2,-2.1),this.createBody(),this.createWings(),this.createTail(),this.createEngines(),this.createEyes(),this.createCannon()}createBody(){const t=new He;t.moveTo(0,-20),t.bezierCurveTo(4,-12,6,-4,5,4),t.bezierCurveTo(4,8,2,10,0,11),t.bezierCurveTo(-2,10,-4,8,-5,4),t.bezierCurveTo(-6,-4,-4,-12,0,-20),this.wingTipZ=1;const e=new ze(t,{depth:2.5,bevelEnabled:!0,bevelSize:1.2,bevelThickness:1,bevelSegments:3});e.rotateX(-Math.PI/2),e.translate(0,0,0);const n=new X(e,this.primaryMat);n.position.y=-1,this.add(n)}createWings(){const t=new He;t.moveTo(0,0),t.bezierCurveTo(-5,-3,-14,-8,-22,-4),t.bezierCurveTo(-26,-2,-26,4,-22,6),t.bezierCurveTo(-14,8,-5,4,0,2);const e=new ze(t,{depth:1,bevelEnabled:!0,bevelSize:.4,bevelThickness:.3});e.rotateX(-Math.PI/2);const n=new X(e,this.primaryMat);n.position.set(-5,-.5,-6),this.add(n);const i=new He;i.moveTo(0,0),i.bezierCurveTo(5,-3,14,-8,22,-4),i.bezierCurveTo(26,-2,26,4,22,6),i.bezierCurveTo(14,8,5,4,0,2);const s=new ze(i,{depth:1,bevelEnabled:!0,bevelSize:.4,bevelThickness:.3});s.rotateX(-Math.PI/2);const a=new X(s,this.primaryMat);a.position.set(5,-.5,-6),this.add(a);const o=new qt(.03,.03,1.8,6);o.rotateZ(Math.PI/2);const l=new X(o,this.glowMat);l.position.set(-1.3,-.1,-.3),this.add(l);const c=new X(o,this.glowMat);c.position.set(1.3,-.1,-.3),this.add(c)}createTail(){const t=new qt(.05,.15,1.2,6);t.rotateX(Math.PI/2);const e=new X(t,this.darkMat);e.position.z=1.2,this.add(e);const n=new He;n.moveTo(0,0),n.lineTo(0,.55),n.lineTo(.36,.27),n.lineTo(.27,0);const i=new ze(n,{depth:.036,bevelEnabled:!1});i.rotateX(Math.PI/2),i.rotateY(Math.PI/2);const s=new X(i,this.primaryMat);s.position.set(0,.18,1.3),this.add(s)}createEngines(){const t=new qt(.12,.1,.35,12);t.rotateX(Math.PI/2);const e=new qt(.08,.09,.1,12,1,!0);e.rotateX(Math.PI/2);const n=new xe(.05,8,8),i=d=>{const u=new ae;u.position.set(d*2.8,-.05,2.5);const f=new X(t,this.darkMat);u.add(f);const g=new X(e,new St({color:1118481,metalness:1,roughness:.2}));g.position.z=.18,u.add(g);const _=new X(n,this.engineCoreMat);return _.position.z=.13,u.add(_),this.add(u),u},s=i(-1),a=i(1),o=new qt(.03,.03,1.5,8,1,!0);o.rotateZ(Math.PI/2);const l=d=>{const u=new X(o,this.forceFieldMat.clone());u.position.set(d*2.8,-.05,1.5),u.rotation.x=Math.PI/2,this.add(u),this.forceFields.push(u);const f=new X(o,new Qt({color:65535,wireframe:!0,transparent:!0,opacity:.2}));u.add(f)};l(-1),l(1);const c=new xe(.1,8,8),h=d=>{const u=new X(c,this.glowMat.clone());u.name="flame",u.position.set(0,0,.25),d.add(u)};h(s),h(a)}tick(t){this._time+=t,this.forceFields.forEach((e,n)=>{const i=.2+.1*Math.sin(this._time*10+n);e.material.opacity=i})}createEyes(){const t=new xe(.11,8,6),e=new Qt({color:16711782,transparent:!0,opacity:.9}),n=new X(t,e);n.position.set(-.27,.09,-1.6),this.add(n);const i=new X(t,e);i.position.set(.27,.09,-1.6),this.add(i)}createCannon(){const t=new qt(.04,.04,1.2,6);t.rotateX(Math.PI/2);const e=new St({color:2236979,metalness:.9,roughness:.3}),n=new X(t,e);n.position.set(0,-.2,-1.8),this.add(n)}}class lg extends ae{constructor(t){super(),this.playerColor=t,this.primaryMat=new St({color:t,roughness:.3,metalness:.75,emissive:new wt(t).multiplyScalar(.2),emissiveIntensity:.3}),this.darkMat=new St({color:1118498,roughness:.7,metalness:.5}),this.rotorMat=new St({color:3359829,roughness:.4,metalness:.8,transparent:!0,opacity:.6}),this.ledMat=new Qt({color:65416,transparent:!0,opacity:1}),this.thrusterMat=new Qt({color:4491519,transparent:!0,opacity:.8}),this.engineCoreMat=new St({color:65535,emissive:65535,emissiveIntensity:2}),this.forceFieldMat=new St({color:65535,transparent:!0,opacity:.25,side:ge,emissive:65535,emissiveIntensity:.5}),this._time=0,this.forceFields=[],this.muzzle=new ee,this.add(this.muzzle),this.muzzle.position.set(0,-3,-12),this.createCore(),this.createArms(),this.createEngines(),this.createSensors(),this.createCannon()}createCore(){const t=new Jt(1.6,.8,2.4),e=new X(t,this.primaryMat);this.add(e);const n=new Jt(1.2,.3,2),i=new X(n,this.darkMat);i.position.y=.55,this.add(i);const s=new Jt(.8,.16,1.2),a=new St({color:4403,roughness:.2,metalness:.9}),o=new X(s,a);o.position.y=-.48,this.add(o);const l=new Jt(1,.08,.08),c=new X(l,this.ledMat);c.position.set(0,.42,-.8),this.add(c);const h=new X(l,this.ledMat);h.position.set(0,.42,.8),this.add(h)}createArms(){const t=new Jt(3.2,.24,.4),e=new X(t,this.primaryMat);e.rotation.y=Math.PI/4,e.position.y=.1,this.add(e);const n=new X(t,this.primaryMat);n.rotation.y=-Math.PI/4,n.position.y=.1,this.add(n);const i=new Jt(.5,.4,.5);[{x:1.6,z:1.6},{x:-1.6,z:1.6},{x:1.6,z:-1.6},{x:-1.6,z:-1.6}].forEach(a=>{const o=new X(i,this.darkMat);o.position.set(a.x,.1,a.z),this.add(o)})}createEngines(){const t=new Jt(.4,.4,.8),e=new Jt(.28,.28,.2),n=new Jt(.16,.16,.16),i=d=>{const u=new ae;u.position.set(d*2,.1,2.5);const f=new X(t,this.darkMat);u.add(f);const g=new X(e,new St({color:1118481,metalness:1,roughness:.2}));g.position.z=.4,u.add(g);const _=new X(n,this.engineCoreMat);return _.position.z=.3,u.add(_),this.add(u),u},s=i(-1),a=i(1),o=new Jt(.08,.08,2.5),l=d=>{const u=new X(o,this.forceFieldMat.clone());u.position.set(d*2,.1,1.25),u.rotation.x=Math.PI/2,this.add(u),this.forceFields.push(u);const f=new X(o,new Qt({color:65535,wireframe:!0,transparent:!0,opacity:.2}));u.add(f)};l(-1),l(1);const c=new Jt(.3,.3,.1),h=d=>{const u=new X(c,this.thrusterMat.clone());u.name="flame",u.position.set(0,0,.5),d.add(u)};h(s),h(a)}tick(t){this._time+=t,this.forceFields.forEach((e,n)=>{const i=.2+.1*Math.sin(this._time*10+n);e.material.opacity=i})}createSensors(){const t=new Jt(.6,.4,.3),e=new St({color:17,roughness:.1,metalness:.9}),n=new X(t,e);n.position.set(0,-.1,-1.4),this.add(n);const i=new qt(.14,.14,.16,10);i.rotateX(Math.PI/2);const s=new Uo({color:4607,transmission:.4,roughness:0,metalness:0}),a=new X(i,s);a.position.set(0,-.1,-1.56),this.add(a);const o=new Jt(.2,.2,.16),l=new Qt({color:16711680}),c=new X(o,l);c.position.set(0,.2,-1.4),this.add(c)}createCannon(){const t=new qt(.1,.1,2,6);t.rotateX(Math.PI/2);const e=new St({color:2236979,metalness:.95,roughness:.2}),n=new X(t,e);n.position.set(0,-.6,-1.4),this.add(n);const i=new Jt(.4,.4,1.6),s=new X(i,this.darkMat);s.position.set(0,-.4,-.8),this.add(s)}}class cg extends ae{constructor(t){super(),this.playerColor=t,this._time=0,this.coreMat=new St({color:t,roughness:.05,metalness:.2,emissive:new wt(t),emissiveIntensity:.6,transparent:!0,opacity:.9}),this.shellMat=new St({color:t,roughness:.1,metalness:.9,emissive:new wt(t).multiplyScalar(.3),emissiveIntensity:.5,transparent:!0,opacity:.4,side:ge}),this.ringMat=new St({color:16777215,roughness:.05,metalness:1,emissive:new wt(t).multiplyScalar(.5),emissiveIntensity:.7}),this.innerGlowMat=new Qt({color:t,transparent:!0,opacity:.5,side:Le}),this.cannonMat=new St({color:1118498,roughness:.2,metalness:.95}),this.engineCoreMat=new St({color:65535,emissive:65535,emissiveIntensity:2}),this.forceFieldMat=new St({color:65535,transparent:!0,opacity:.25,side:ge,emissive:65535,emissiveIntensity:.5}),this._time=0,this.forceFields=[],this.muzzle=new ee,this.add(this.muzzle),this.muzzle.position.set(0,0,-2.4),this.createCore(),this.createShell(),this.createRings(),this.createEngines()}createCore(){const t=new xe(1,16,16);this.coreMesh=new X(t,this.coreMat),this.add(this.coreMesh);const e=new xe(1.2,16,16),n=new X(e,new Qt({color:this.playerColor,transparent:!0,opacity:.15}));this.add(n)}createShell(){const t=new Oo(1.4,1),e=new St({color:this.playerColor,wireframe:!0,transparent:!0,opacity:.4}),n=new X(t,e);this.add(n);const i=new St({color:3359846,roughness:.3,metalness:.9,transparent:!0,opacity:.6,wireframe:!1});for(let s=0;s<6;s++){const a=s/6*Math.PI*2,o=new Jt(.5,.5,.16),l=new X(o,i);l.position.set(Math.cos(a)*1.3,0,Math.sin(a)*1.3),l.lookAt(0,0,0),this.add(l)}}createRings(){const t=new ri(2,.04,8,48);this.ring1=new X(t,this.ringMat),this.add(this.ring1),this.ring2=new X(t,this.ringMat),this.ring2.rotation.x=Math.PI/2,this.add(this.ring2);const e=new ri(2.4,.03,8,48);this.ring3=new X(e,this.ringMat),this.ring3.rotation.y=Math.PI/4,this.add(this.ring3);const n=new xe(.13,6,6),i=new Qt({color:65535});for(let s=0;s<4;s++){const a=s/4*Math.PI*2,o=new X(n,i);o.position.set(Math.cos(a)*2,0,Math.sin(a)*2),this.ring1.add(o)}}createEngines(){const t=new qt(.35,.3,.8,12);t.rotateX(Math.PI/2);const e=new qt(.25,.3,.2,12,1,!0);e.rotateX(Math.PI/2);const n=new xe(.12,8,8),i=d=>{const u=new ae;u.position.set(d*2.5,0,1.2),u.rotation.y=d*Math.PI/2;const f=new X(t,this.shellMat);u.add(f);const g=new X(e,new St({color:1118481,metalness:1,roughness:.2}));g.position.z=.4,u.add(g);const _=new X(n,this.engineCoreMat);return _.position.z=.3,u.add(_),this.add(u),u},s=i(-1),a=i(1),o=new qt(.08,.08,1.2,8,1,!0);o.rotateZ(Math.PI/2);const l=d=>{const u=new X(o,this.forceFieldMat.clone());u.position.set(d*2.5,0,.6),u.rotation.x=Math.PI/2,this.add(u),this.forceFields.push(u);const f=new X(o,new Qt({color:65535,wireframe:!0,transparent:!0,opacity:.2}));u.add(f)};l(-1),l(1);const c=new xe(.25,8,8),h=d=>{const u=new X(c,this.ringMat.clone());u.name="flame",u.position.set(0,0,.45),d.add(u)};h(s),h(a)}tick(t){if(this._time+=t,this.ring1&&(this.ring1.rotation.y+=t*1.2),this.ring2&&(this.ring2.rotation.z+=t*.8),this.ring3&&(this.ring3.rotation.y+=t*.5,this.ring3.rotation.x+=t*.3),this.coreMesh){const e=.9+.1*Math.sin(this._time*3);this.coreMesh.scale.setScalar(e)}this.forceFields.forEach((e,n)=>{const i=.2+.1*Math.sin(this._time*10+n);e.material.opacity=i})}}const hg=/^[og]\s*(.+)?/,ug=/^mtllib /,dg=/^usemtl /,fg=/^usemap /,Pl=/\s+/,Cl=new b,jr=new b,Ll=new b,Il=new b,qe=new b,qs=new wt;function pg(){const r={objects:[],object:{},vertices:[],normals:[],colors:[],uvs:[],materials:{},materialLibraries:[],startObject:function(t,e){if(this.object&&this.object.fromDeclaration===!1){this.object.name=t,this.object.fromDeclaration=e!==!1;return}const n=this.object&&typeof this.object.currentMaterial=="function"?this.object.currentMaterial():void 0;if(this.object&&typeof this.object._finalize=="function"&&this.object._finalize(!0),this.object={name:t||"",fromDeclaration:e!==!1,geometry:{vertices:[],normals:[],colors:[],uvs:[],hasUVIndices:!1},materials:[],smooth:!0,startMaterial:function(i,s){const a=this._finalize(!1);a&&(a.inherited||a.groupCount<=0)&&this.materials.splice(a.index,1);const o={index:this.materials.length,name:i||"",mtllib:Array.isArray(s)&&s.length>0?s[s.length-1]:"",smooth:a!==void 0?a.smooth:this.smooth,groupStart:a!==void 0?a.groupEnd:0,groupEnd:-1,groupCount:-1,inherited:!1,clone:function(l){const c={index:typeof l=="number"?l:this.index,name:this.name,mtllib:this.mtllib,smooth:this.smooth,groupStart:0,groupEnd:-1,groupCount:-1,inherited:!1};return c.clone=this.clone.bind(c),c}};return this.materials.push(o),o},currentMaterial:function(){if(this.materials.length>0)return this.materials[this.materials.length-1]},_finalize:function(i){const s=this.currentMaterial();if(s&&s.groupEnd===-1&&(s.groupEnd=this.geometry.vertices.length/3,s.groupCount=s.groupEnd-s.groupStart,s.inherited=!1),i&&this.materials.length>1)for(let a=this.materials.length-1;a>=0;a--)this.materials[a].groupCount<=0&&this.materials.splice(a,1);return i&&this.materials.length===0&&this.materials.push({name:"",smooth:this.smooth}),s}},n&&n.name&&typeof n.clone=="function"){const i=n.clone(0);i.inherited=!0,this.object.materials.push(i)}this.objects.push(this.object)},finalize:function(){this.object&&typeof this.object._finalize=="function"&&this.object._finalize(!0)},parseVertexIndex:function(t,e){const n=parseInt(t,10);return(n>=0?n-1:n+e/3)*3},parseNormalIndex:function(t,e){const n=parseInt(t,10);return(n>=0?n-1:n+e/3)*3},parseUVIndex:function(t,e){const n=parseInt(t,10);return(n>=0?n-1:n+e/2)*2},addVertex:function(t,e,n){const i=this.vertices,s=this.object.geometry.vertices;s.push(i[t+0],i[t+1],i[t+2]),s.push(i[e+0],i[e+1],i[e+2]),s.push(i[n+0],i[n+1],i[n+2])},addVertexPoint:function(t){const e=this.vertices;this.object.geometry.vertices.push(e[t+0],e[t+1],e[t+2])},addVertexLine:function(t){const e=this.vertices;this.object.geometry.vertices.push(e[t+0],e[t+1],e[t+2])},addNormal:function(t,e,n){const i=this.normals,s=this.object.geometry.normals;s.push(i[t+0],i[t+1],i[t+2]),s.push(i[e+0],i[e+1],i[e+2]),s.push(i[n+0],i[n+1],i[n+2])},addFaceNormal:function(t,e,n){const i=this.vertices,s=this.object.geometry.normals;Cl.fromArray(i,t),jr.fromArray(i,e),Ll.fromArray(i,n),qe.subVectors(Ll,jr),Il.subVectors(Cl,jr),qe.cross(Il),qe.normalize(),s.push(qe.x,qe.y,qe.z),s.push(qe.x,qe.y,qe.z),s.push(qe.x,qe.y,qe.z)},addColor:function(t,e,n){const i=this.colors,s=this.object.geometry.colors;i[t]!==void 0&&s.push(i[t+0],i[t+1],i[t+2]),i[e]!==void 0&&s.push(i[e+0],i[e+1],i[e+2]),i[n]!==void 0&&s.push(i[n+0],i[n+1],i[n+2])},addUV:function(t,e,n){const i=this.uvs,s=this.object.geometry.uvs;s.push(i[t+0],i[t+1]),s.push(i[e+0],i[e+1]),s.push(i[n+0],i[n+1])},addDefaultUV:function(){const t=this.object.geometry.uvs;t.push(0,0),t.push(0,0),t.push(0,0)},addUVLine:function(t){const e=this.uvs;this.object.geometry.uvs.push(e[t+0],e[t+1])},addFace:function(t,e,n,i,s,a,o,l,c){const h=this.vertices.length;let d=this.parseVertexIndex(t,h),u=this.parseVertexIndex(e,h),f=this.parseVertexIndex(n,h);if(this.addVertex(d,u,f),this.addColor(d,u,f),o!==void 0&&o!==""){const g=this.normals.length;d=this.parseNormalIndex(o,g),u=this.parseNormalIndex(l,g),f=this.parseNormalIndex(c,g),this.addNormal(d,u,f)}else this.addFaceNormal(d,u,f);if(i!==void 0&&i!==""){const g=this.uvs.length;d=this.parseUVIndex(i,g),u=this.parseUVIndex(s,g),f=this.parseUVIndex(a,g),this.addUV(d,u,f),this.object.geometry.hasUVIndices=!0}else this.addDefaultUV()},addPointGeometry:function(t){this.object.geometry.type="Points";const e=this.vertices.length;for(let n=0,i=t.length;n<i;n++){const s=this.parseVertexIndex(t[n],e);this.addVertexPoint(s),this.addColor(s)}},addLineGeometry:function(t,e){this.object.geometry.type="Line";const n=this.vertices.length,i=this.uvs.length;for(let s=0,a=t.length;s<a;s++)this.addVertexLine(this.parseVertexIndex(t[s],n));for(let s=0,a=e.length;s<a;s++)this.addUVLine(this.parseUVIndex(e[s],i))}};return r.startObject("",!1),r}class mg extends Hi{constructor(t){super(t),this.materials=null}load(t,e,n,i){const s=this,a=new Pc(this.manager);a.setPath(this.path),a.setRequestHeader(this.requestHeader),a.setWithCredentials(this.withCredentials),a.load(t,function(o){try{e(s.parse(o))}catch(l){i?i(l):console.error(l),s.manager.itemError(t)}},n,i)}setMaterials(t){return this.materials=t,this}parse(t){const e=new pg;t.indexOf(`\r
`)!==-1&&(t=t.replace(/\r\n/g,`
`)),t.indexOf(`\\
`)!==-1&&(t=t.replace(/\\\n/g,""));const n=t.split(`
`);let i=[];for(let o=0,l=n.length;o<l;o++){const c=n[o].trimStart();if(c.length===0)continue;const h=c.charAt(0);if(h!=="#")if(h==="v"){const d=c.split(Pl);switch(d[0]){case"v":e.vertices.push(parseFloat(d[1]),parseFloat(d[2]),parseFloat(d[3])),d.length>=7?(qs.setRGB(parseFloat(d[4]),parseFloat(d[5]),parseFloat(d[6])).convertSRGBToLinear(),e.colors.push(qs.r,qs.g,qs.b)):e.colors.push(void 0,void 0,void 0);break;case"vn":e.normals.push(parseFloat(d[1]),parseFloat(d[2]),parseFloat(d[3]));break;case"vt":e.uvs.push(parseFloat(d[1]),parseFloat(d[2]));break}}else if(h==="f"){const u=c.slice(1).trim().split(Pl),f=[];for(let _=0,m=u.length;_<m;_++){const p=u[_];if(p.length>0){const x=p.split("/");f.push(x)}}const g=f[0];for(let _=1,m=f.length-1;_<m;_++){const p=f[_],x=f[_+1];e.addFace(g[0],p[0],x[0],g[1],p[1],x[1],g[2],p[2],x[2])}}else if(h==="l"){const d=c.substring(1).trim().split(" ");let u=[];const f=[];if(c.indexOf("/")===-1)u=d;else for(let g=0,_=d.length;g<_;g++){const m=d[g].split("/");m[0]!==""&&u.push(m[0]),m[1]!==""&&f.push(m[1])}e.addLineGeometry(u,f)}else if(h==="p"){const u=c.slice(1).trim().split(" ");e.addPointGeometry(u)}else if((i=hg.exec(c))!==null){const d=(" "+i[0].slice(1).trim()).slice(1);e.startObject(d)}else if(dg.test(c))e.object.startMaterial(c.substring(7).trim(),e.materialLibraries);else if(ug.test(c))e.materialLibraries.push(c.substring(7).trim());else if(fg.test(c))console.warn('THREE.OBJLoader: Rendering identifier "usemap" not supported. Textures must be defined in MTL files.');else if(h==="s"){if(i=c.split(" "),i.length>1){const u=i[1].trim().toLowerCase();e.object.smooth=u!=="0"&&u!=="off"}else e.object.smooth=!0;const d=e.object.currentMaterial();d&&(d.smooth=e.object.smooth)}else{if(c==="\0")continue;console.warn('THREE.OBJLoader: Unexpected line: "'+c+'"')}}e.finalize();const s=new ae;if(s.materialLibraries=[].concat(e.materialLibraries),!(e.objects.length===1&&e.objects[0].geometry.vertices.length===0)===!0)for(let o=0,l=e.objects.length;o<l;o++){const c=e.objects[o],h=c.geometry,d=c.materials,u=h.type==="Line",f=h.type==="Points";let g=!1;if(h.vertices.length===0)continue;const _=new _e;_.setAttribute("position",new Kt(h.vertices,3)),h.normals.length>0&&_.setAttribute("normal",new Kt(h.normals,3)),h.colors.length>0&&(g=!0,_.setAttribute("color",new Kt(h.colors,3))),h.hasUVIndices===!0&&_.setAttribute("uv",new Kt(h.uvs,2));const m=[];for(let x=0,v=d.length;x<v;x++){const y=d[x],P=y.name+"_"+y.smooth+"_"+g;let A=e.materials[P];if(this.materials!==null){if(A=this.materials.create(y.name),u&&A&&!(A instanceof ts)){const R=new ts;un.prototype.copy.call(R,A),R.color.copy(A.color),A=R}else if(f&&A&&!(A instanceof Ci)){const R=new Ci({size:10,sizeAttenuation:!1});un.prototype.copy.call(R,A),R.color.copy(A.color),R.map=A.map,A=R}}A===void 0&&(u?A=new ts:f?A=new Ci({size:1,sizeAttenuation:!1}):A=new bc,A.name=y.name,A.flatShading=!y.smooth,A.vertexColors=g,e.materials[P]=A),m.push(A)}let p;if(m.length>1){for(let x=0,v=d.length;x<v;x++){const y=d[x];_.addGroup(y.groupStart,y.groupCount,x)}u?p=new ho(_,m):f?p=new Js(_,m):p=new X(_,m)}else u?p=new ho(_,m[0]):f?p=new Js(_,m[0]):p=new X(_,m[0]);p.name=c.name,s.add(p)}else if(e.vertices.length>0){const o=new Ci({size:1,sizeAttenuation:!1}),l=new _e;l.setAttribute("position",new Kt(e.vertices,3)),e.colors.length>0&&e.colors[0]!==void 0&&(l.setAttribute("color",new Kt(e.colors,3)),o.vertexColors=!0);const c=new Js(l,o);s.add(c)}return s}}class gg extends Hi{constructor(t){super(t)}load(t,e,n,i){const s=this,a=this.path===""?$0.extractUrlBase(t):this.path,o=new Pc(this.manager);o.setPath(this.path),o.setRequestHeader(this.requestHeader),o.setWithCredentials(this.withCredentials),o.load(t,function(l){try{e(s.parse(l,a))}catch(c){i?i(c):console.error(c),s.manager.itemError(t)}},n,i)}setMaterialOptions(t){return this.materialOptions=t,this}parse(t,e){const n=t.split(`
`);let i={};const s=/\s+/,a={};for(let l=0;l<n.length;l++){let c=n[l];if(c=c.trim(),c.length===0||c.charAt(0)==="#")continue;const h=c.indexOf(" ");let d=h>=0?c.substring(0,h):c;d=d.toLowerCase();let u=h>=0?c.substring(h+1):"";if(u=u.trim(),d==="newmtl")i={name:u},a[u]=i;else if(d==="ka"||d==="kd"||d==="ks"||d==="ke"){const f=u.split(s,3);i[d]=[parseFloat(f[0]),parseFloat(f[1]),parseFloat(f[2])]}else i[d]=u}const o=new _g(this.resourcePath||e,this.materialOptions);return o.setCrossOrigin(this.crossOrigin),o.setManager(this.manager),o.setMaterials(a),o}}class _g{constructor(t="",e={}){this.baseUrl=t,this.options=e,this.materialsInfo={},this.materials={},this.materialsArray=[],this.nameLookup={},this.crossOrigin="anonymous",this.side=this.options.side!==void 0?this.options.side:bn,this.wrap=this.options.wrap!==void 0?this.options.wrap:Bi}setCrossOrigin(t){return this.crossOrigin=t,this}setManager(t){this.manager=t}setMaterials(t){this.materialsInfo=this.convert(t),this.materials={},this.materialsArray=[],this.nameLookup={}}convert(t){if(!this.options)return t;const e={};for(const n in t){const i=t[n],s={};e[n]=s;for(const a in i){let o=!0,l=i[a];const c=a.toLowerCase();switch(c){case"kd":case"ka":case"ks":this.options&&this.options.normalizeRGB&&(l=[l[0]/255,l[1]/255,l[2]/255]),this.options&&this.options.ignoreZeroRGBs&&l[0]===0&&l[1]===0&&l[2]===0&&(o=!1);break}o&&(s[c]=l)}}return e}preload(){for(const t in this.materialsInfo)this.create(t)}getIndex(t){return this.nameLookup[t]}getAsArray(){let t=0;for(const e in this.materialsInfo)this.materialsArray[t]=this.create(e),this.nameLookup[e]=t,t++;return this.materialsArray}create(t){return this.materials[t]===void 0&&this.createMaterial_(t),this.materials[t]}createMaterial_(t){const e=this,n=this.materialsInfo[t],i={name:t,side:this.side};function s(o,l){return typeof l!="string"||l===""?"":/^https?:\/\//i.test(l)?l:o+l}function a(o,l){if(i[o])return;const c=e.getTextureParams(l,i),h=e.loadTexture(s(e.baseUrl,c.url));h.repeat.copy(c.scale),h.offset.copy(c.offset),h.wrapS=e.wrap,h.wrapT=e.wrap,(o==="map"||o==="emissiveMap")&&(h.colorSpace=Te),i[o]=h}for(const o in n){const l=n[o];let c;if(l!=="")switch(o.toLowerCase()){case"kd":i.color=new wt().fromArray(l).convertSRGBToLinear();break;case"ks":i.specular=new wt().fromArray(l).convertSRGBToLinear();break;case"ke":i.emissive=new wt().fromArray(l).convertSRGBToLinear();break;case"map_kd":a("map",l);break;case"map_ks":a("specularMap",l);break;case"map_ke":a("emissiveMap",l);break;case"norm":a("normalMap",l);break;case"map_bump":case"bump":a("bumpMap",l);break;case"map_d":a("alphaMap",l),i.transparent=!0;break;case"ns":i.shininess=parseFloat(l);break;case"d":c=parseFloat(l),c<1&&(i.opacity=c,i.transparent=!0);break;case"tr":c=parseFloat(l),this.options&&this.options.invertTrProperty&&(c=1-c),c>0&&(i.opacity=1-c,i.transparent=!0);break}}return this.materials[t]=new bc(i),this.materials[t]}getTextureParams(t,e){const n={scale:new ot(1,1),offset:new ot(0,0)},i=t.split(/\s+/);let s;return s=i.indexOf("-bm"),s>=0&&(e.bumpScale=parseFloat(i[s+1]),i.splice(s,2)),s=i.indexOf("-s"),s>=0&&(n.scale.set(parseFloat(i[s+1]),parseFloat(i[s+2])),i.splice(s,4)),s=i.indexOf("-o"),s>=0&&(n.offset.set(parseFloat(i[s+1]),parseFloat(i[s+2])),i.splice(s,4)),n.url=i.join(" ").trim(),n}loadTexture(t,e,n,i,s){const a=this.manager!==void 0?this.manager:Rc;let o=a.getHandler(t);o===null&&(o=new Y0(a)),o.setCrossOrigin&&o.setCrossOrigin(this.crossOrigin);const l=o.load(t,n,i,s);return e!==void 0&&(l.mapping=e),l}}class Sn extends ae{constructor(t,e="ship5"){super(),this.playerColor=t,this.shipId=e,this._loaded=!1,this.glowMat=new Qt({color:4491519,transparent:!0,opacity:.6}),this.forceFieldMat=new St({color:65535,transparent:!0,opacity:.25,side:ge,emissive:65535,emissiveIntensity:.5}),this._time=0,this.forceFields=[],this.muzzle=new ee,this.add(this.muzzle),this.loadModel()}loadModel(){const t=new gg,e="assets/models/jets/cc0/spaceship_pack/dist/obj_mtl/";t.setPath(e),t.load(`${this.shipId}.mtl`,n=>{n.preload();const i=new mg;i.setMaterials(n),i.setPath(e),i.load(`${this.shipId}.obj`,s=>{const a=new We().setFromObject(s),o=a.getSize(new b),l=a.getCenter(new b);s.position.sub(l);const h=4.5/Math.max(o.x,o.y,o.z);s.scale.setScalar(h),this.localBox=new We().setFromObject(s),s.traverse(d=>{d.isMesh&&(d.castShadow=!0,d.receiveShadow=!0)}),this.add(s),this.model=s,this.createWingEngines(o.x*h*.45,o.z*h,o.x*h*.5,o.z*h*.4),this.muzzle.position.set(0,0,-o.z*h*.6),this._loaded=!0,this.dispatchEvent({type:"loaded"})})})}createWingEngines(t,e,n,i){const s=new qt(.4,.35,1.5,12);s.rotateX(Math.PI/2);const a=new qt(.25,.3,.5,12,1,!0);a.rotateX(Math.PI/2);const o=new xe(.2,8,8),l=new St({color:65535,emissive:65535,emissiveIntensity:2}),c=g=>{const _=new ae;_.position.set(g*(t+.8),0,e*1.2+1.5);const m=new X(s,new St({color:2236962,metalness:.9,roughness:.3}));_.add(m);const p=new X(a,new St({color:1118481,metalness:1,roughness:.2}));p.position.z=.75,_.add(p);const x=new X(o,l);return x.position.z=.5,_.add(x),this.add(_),_},h=c(-1),d=c(1);this.createForceField(n,i,1.5,-1),this.createForceField(n,i,1.5,1);const u=new qt(.3,.01,1.5,8);u.rotateX(-Math.PI/2);const f=g=>{const _=new X(u,this.glowMat.clone());_.name="flame",_.position.z=1.6,g.add(_)};f(h),f(d)}createForceField(t,e,n,i){const s=new qt(.15,.15,n,8,1,!0);s.rotateX(Math.PI/2);const a=new X(s,this.forceFieldMat.clone());a.position.set(i*t,0,e+n/2),this.add(a),this.forceFields.push(a);const o=new X(s,new Qt({color:65535,wireframe:!0,transparent:!0,opacity:.2}));a.add(o)}tick(t){this._time+=t,this.forceFields.forEach((e,n)=>{const i=.2+.1*Math.sin(this._time*10+n);e.material.opacity=i})}}const oi=[{id:"ship5",label:"Star-Cruiser (Ship 5)",MeshClass:Sn,isObj:!0,hitbox:{radius:1.2}},{id:"aircraft",label:"Jet-Fighter",MeshClass:sg,hitbox:{radius:1.1}},{id:"spaceship",label:"Raumschiff",MeshClass:rg,hitbox:{radius:1.3}},{id:"arrow",label:"Pfeil",MeshClass:og,hitbox:{radius:.9}},{id:"manta",label:"Manta-Gleiter",MeshClass:ag,hitbox:{radius:1.4}},{id:"drone",label:"Kampfdrohne",MeshClass:lg,hitbox:{radius:.8}},{id:"orb",label:"Energie-Orb",MeshClass:cg,hitbox:{radius:1}},{id:"ship1",label:"Interceptor (Ship 1)",MeshClass:Sn,isObj:!0,hitbox:{radius:1}},{id:"ship2",label:"Heavy Fighter (Ship 2)",MeshClass:Sn,isObj:!0,hitbox:{radius:1.4}},{id:"ship3",label:"Scout (Ship 3)",MeshClass:Sn,isObj:!0,hitbox:{radius:.9}},{id:"ship4",label:"Bomber (Ship 4)",MeshClass:Sn,isObj:!0,hitbox:{radius:1.6}},{id:"ship6",label:"Vanguard (Ship 6)",MeshClass:Sn,isObj:!0,hitbox:{radius:1.2}},{id:"ship7",label:"Defender (Ship 7)",MeshClass:Sn,isObj:!0,hitbox:{radius:1.3}},{id:"ship8",label:"Striker (Ship 8)",MeshClass:Sn,isObj:!0,hitbox:{radius:1.1}},{id:"ship9",label:"Recon (Ship 9)",MeshClass:Sn,isObj:!0,hitbox:{radius:1}}],Ic=new Map(oi.map(r=>[r.id,r]));function vg(){return oi.map(r=>r.id)}function Dc(r){return Ic.has(String(r||"").trim())}function xg(r,t){const e=String(r||"").trim(),n=Ic.get(e)||oi[0];return n.isObj?new n.MeshClass(t,n.id):new n.MeshClass(t)}const me={};function yg(r){r&&(r.userData=r.userData||{},r.userData.__sharedNoDispose=!0)}function Sg(){if(me.body)return;me.body=new Qe(.35,3.2,8),me.body.rotateX(Math.PI/2),me.cockpit=new xe(.28,10,10,0,Math.PI*2,0,Math.PI/2),me.nozzle=new qt(.2,.25,.4,8),me.nozzle.rotateX(Math.PI/2),me.flameInner=new Qe(.15,1,8),me.flameInner.rotateX(-Math.PI/2),me.flameMid=new Qe(.22,1.4,8),me.flameMid.rotateX(-Math.PI/2),me.flameOuter=new Qe(.28,1.8,8),me.flameOuter.rotateX(-Math.PI/2),me.shield=new xe(1.5,8,8),me.shieldBox=new Jt(1,1,1);const r=new He;r.moveTo(0,0),r.lineTo(-1.8,.6),r.lineTo(-.3,.8),r.lineTo(0,0),me.wingL=new ze(r,{depth:.06,bevelEnabled:!1});const t=new He;t.moveTo(0,0),t.lineTo(1.8,.6),t.lineTo(.3,.8),t.lineTo(0,0),me.wingR=new ze(t,{depth:.06,bevelEnabled:!1});const e=new He;e.moveTo(0,0),e.lineTo(0,.8),e.lineTo(.4,.1),e.lineTo(0,0),me.fin=new ze(e,{depth:.04,bevelEnabled:!1});for(const n of Object.values(me))yg(n)}class Dl{constructor(t,e,n,i=!1,s={}){var c;this.renderer=t,this.index=e,this.color=n,this.isBot=i,this.alive=!0,this.score=0,this.position=new b,this.velocity=new b(0,0,-1),this.quaternion=new ni,this.speed=D.PLAYER.SPEED,this.baseSpeed=D.PLAYER.SPEED,this._tmpEuler=new kn(0,0,0,"YXZ"),this._tmpEuler2=new kn(0,0,0,"YXZ"),this._tmpQuat=new ni,this._tmpVec=new b,this._tmpDir=new b,this._tmpAimRight=new b,this._tmpAimUp=new b,this.boostTimer=0,this.boostCooldown=0,this.isBoosting=!1,this.activeEffects=[],this.inventory=[],this.selectedItemIndex=0,this.hasShield=!1,this.isGhost=!1,this.invertControls=!1,this.invertPitchBase=!1,this.modelScale=D.PLAYER.MODEL_SCALE||1,this.cockpitCamera=!1,this.spawnProtectionTimer=0,this.planarAimOffset=0;const a=String((s==null?void 0:s.vehicleId)||"").trim();this.vehicleId=Dc(a)?a:String(D.PLAYER.DEFAULT_VEHICLE_ID);const o=oi.find(h=>h.id===this.vehicleId)||oi[0];this.hitboxRadius=(((c=o.hitbox)==null?void 0:c.radius)||D.PLAYER.HITBOX_RADIUS)*this.modelScale,this.hitboxBox=new We;const l=this.hitboxRadius;this.hitboxBox.set(new b(-l,-l*.7,-l),new b(l,l*.7,l)),this._tmpWorldToLocal=new ne,this._tmpLocalPoint=new b,this._tmpLocalSphere=new dn,this.vehicleMesh=null,this._vehicleBounds={minZ:-1.95,maxZ:1.9,sizeY:1},this.cameraMode=0,this._createModel(),this.trail=new ig(t,n,this.index,s.entityManager)}_createModel(){this.group=new ae,this.vehicleMesh=xg(this.vehicleId,this.color),this.group.add(this.vehicleMesh);const t=()=>{if(this.vehicleMesh.localBox)this.hitboxBox.copy(this.vehicleMesh.localBox);else{this.vehicleMesh.updateMatrixWorld(!0);const i=new ne().copy(this.vehicleMesh.matrixWorld).invert();this.hitboxBox.setFromObject(this.vehicleMesh).applyMatrix4(i)}if(this.shieldMesh){const i=new b,s=new b;this.hitboxBox.getSize(i),this.hitboxBox.getCenter(s),this.shieldMesh.scale.set(i.x*1.15,i.y*1.15,i.z*1.15),this.shieldMesh.position.copy(s)}};this.vehicleMesh.addEventListener&&this.vehicleMesh.addEventListener("loaded",t),t(),this.firstPersonAnchor=new ee,this.vehicleMesh.firstPersonAnchor?this.firstPersonAnchor=this.vehicleMesh.firstPersonAnchor:(this.firstPersonAnchor.position.set(0,D.PLAYER.NOSE_CAMERA_LOCAL_Y,D.PLAYER.NOSE_CAMERA_LOCAL_Z),this.group.add(this.firstPersonAnchor)),Sg();const e=new Qt({color:4491519,transparent:!0,opacity:0,wireframe:!0,side:Le,depthWrite:!1});this.shieldMesh=new X(me.shieldBox,e);const n=new X(me.shieldBox,new Qt({color:65535,transparent:!0,opacity:0,wireframe:!1,depthWrite:!1}));n.name="innerShield",this.shieldMesh.add(n),n.scale.set(.98,.98,.98),this.group.add(this.shieldMesh),this.renderer.addToScene(this.group),this._applyModelScale(),this.flames=[],this.vehicleMesh.traverse(i=>{(i.name==="flame"||i.material&&i.material.name==="flame")&&this.flames.push(i)})}spawn(t,e=null){this.position.copy(t),this.alive=!0,this.speed=this.baseSpeed,this.boostTimer=0,this.boostCooldown=0,this.isBoosting=!1,this.activeEffects=[],this.hasShield=!1,this.isGhost=!1,this.invertControls=!1,this.spawnProtectionTimer=D.PLAYER.SPAWN_PROTECTION,this.planarAimOffset=0;const n=D.PLAYER.START_Y,i=Number.isFinite(t==null?void 0:t.y)?t.y:n;if(this.currentPlanarY=D.GAMEPLAY.PLANAR_MODE?i:n,this.trail.clear(),this.trail.resetWidth(),this.group.visible=!0,e&&e.lengthSq()>1e-4)this._tmpVec.copy(e).normalize(),this.quaternion.setFromUnitVectors(this._tmpDir.set(0,0,-1),this._tmpVec);else{const s=Math.random()*Math.PI*2;this._tmpEuler.set(0,s,0,"YXZ"),this.quaternion.setFromEuler(this._tmpEuler)}this._updateModel()}update(t,e){if(!this.alive)return;this.spawnProtectionTimer=Math.max(0,this.spawnProtectionTimer-t),this._updateEffects(t);const n=D.PLAYER.TURN_SPEED*t,i=D.PLAYER.ROLL_SPEED*t;let s=0,a=0,o=0;e&&(s=(e.pitchUp?1:0)-(e.pitchDown?1:0),a=(e.yawLeft?1:0)-(e.yawRight?1:0),o=(e.rollLeft?1:0)-(e.rollRight?1:0),this.invertPitchBase&&(s*=-1),this.invertControls&&(s*=-1,a*=-1),D.GAMEPLAY.PLANAR_MODE&&(s=0),e.boost&&this.boostCooldown<=0&&!this.isBoosting&&(this.isBoosting=!0,this.boostTimer=D.PLAYER.BOOST_DURATION)),this._tmpEuler.set(s*n,a*n,o*i,"YXZ"),this._tmpQuat.setFromEuler(this._tmpEuler),this.quaternion.multiply(this._tmpQuat),D.PLAYER.AUTO_ROLL&&o===0?(this._tmpEuler2.setFromQuaternion(this.quaternion,"YXZ"),this._tmpEuler2.z*=1-D.PLAYER.AUTO_ROLL_SPEED*t,D.GAMEPLAY.PLANAR_MODE&&(this._tmpEuler2.x=0),this.quaternion.setFromEuler(this._tmpEuler2)):D.GAMEPLAY.PLANAR_MODE&&(this._tmpEuler2.setFromQuaternion(this.quaternion,"YXZ"),this._tmpEuler2.x=0,this.quaternion.setFromEuler(this._tmpEuler2)),this.isBoosting&&(this.boostTimer-=t,this.speed=this.baseSpeed*D.PLAYER.BOOST_MULTIPLIER,this.boostTimer<=0&&(this.isBoosting=!1,this.boostCooldown=D.PLAYER.BOOST_COOLDOWN,this.speed=this.baseSpeed)),this.boostCooldown>0&&(this.boostCooldown-=t),this._tmpVec.set(0,0,-1).applyQuaternion(this.quaternion),this.velocity.copy(this._tmpVec).multiplyScalar(this.speed),D.GAMEPLAY.PLANAR_MODE&&(this.velocity.y=0,this.position.y=this.currentPlanarY),this.position.x+=this.velocity.x*t,D.GAMEPLAY.PLANAR_MODE||(this.position.y+=this.velocity.y*t),this.position.z+=this.velocity.z*t,this.trail.update(t,this.position,this._tmpVec),this.vehicleMesh&&typeof this.vehicleMesh.tick=="function"&&this.vehicleMesh.tick(t),this._updateModel(),this.group.updateMatrixWorld(!0)}_updateModel(){this.group.position.copy(this.position),this.group.quaternion.copy(this.quaternion);const t=performance.now()*.001;if(this.flames&&this.flames.length>0){const e=this.isBoosting?3:1,n=Math.sin(t*25)*.15+Math.sin(t*37)*.1;for(let i=0;i<this.flames.length;i++){const s=this.flames[i];if(!s)continue;const a=i*.05,o=(.4-a+n*(.3-a))*e;s.scale.set(1,1,Math.max(.1,o)),s.material&&(s.material.opacity=this.isBoosting?1:.7,this.isBoosting?s.material.color.setHex(i%2===0?16777215:16755251):s.material.color.setHex(i%2===0?16777130:16746496))}}if(this.shieldMesh&&(this.shieldMesh.visible=this.hasShield,this.hasShield)){const e=.3+Math.sin(t*6)*.15;this.shieldMesh.material.opacity=e;const n=this.shieldMesh.getObjectByName("innerShield");n&&(n.material.opacity=.1+Math.sin(t*6+1)*.05)}}_updateEffects(t){for(let e=this.activeEffects.length-1;e>=0;e--){const n=this.activeEffects[e];n.remaining-=t,n.remaining<=0&&(this._removeEffect(n),this.activeEffects.splice(e,1))}}_applyModelScale(){this.group&&this.group.scale.setScalar(this.modelScale)}setControlOptions(t={}){typeof t.invertPitch=="boolean"&&(this.invertPitchBase=t.invertPitch),typeof t.modelScale=="number"&&(this.modelScale=t.modelScale,this._applyModelScale()),typeof t.cockpitCamera=="boolean"&&(this.cockpitCamera=t.cockpitCamera)}applyPowerup(t){const e=D.POWERUP.TYPES[t];if(!e)return;this.activeEffects=this.activeEffects.filter(i=>i.type===t?(this._removeEffect(i),!1):!0);const n={type:t,remaining:e.duration};switch(this.activeEffects.push(n),t){case"SPEED_UP":this.baseSpeed=D.PLAYER.SPEED*e.multiplier,this.speed=this.baseSpeed;break;case"SLOW_DOWN":this.baseSpeed=D.PLAYER.SPEED*e.multiplier,this.speed=this.baseSpeed;break;case"THICK":this.trail.setWidth(e.trailWidth);break;case"THIN":this.trail.setWidth(e.trailWidth);break;case"SHIELD":this.hasShield=!0;break;case"GHOST":this.isGhost=!0;break;case"INVERT":this.invertControls=!0;break}}_removeEffect(t){switch(t.type){case"SPEED_UP":case"SLOW_DOWN":this.baseSpeed=D.PLAYER.SPEED,this.speed=this.baseSpeed;break;case"THICK":case"THIN":this.trail.resetWidth();break;case"SHIELD":this.hasShield=!1;break;case"GHOST":this.isGhost=!1;break;case"INVERT":this.invertControls=!1;break}}addToInventory(t){return this.inventory.length<D.POWERUP.MAX_INVENTORY?(this.inventory.push(t),!0):!1}cycleItem(){this.inventory.length>0?this.selectedItemIndex=(this.selectedItemIndex+1)%this.inventory.length:this.selectedItemIndex=0}useItem(){if(this.inventory.length>0&&this.selectedItemIndex<this.inventory.length){const t=this.inventory.splice(this.selectedItemIndex,1)[0];return this.selectedItemIndex>=this.inventory.length&&this.inventory.length>0&&(this.selectedItemIndex=0),this.applyPowerup(t),t}return null}dropItem(){return this.inventory.length>0?this.inventory.pop():null}kill(){this.alive=!1,this.group.visible=!1}getDirection(t=null){return t?t.set(0,0,-1).applyQuaternion(this.quaternion):new b(0,0,-1).applyQuaternion(this.quaternion)}getFirstPersonCameraAnchor(t=null){const e=t||new b;return this.firstPersonAnchor?(this.firstPersonAnchor.getWorldPosition(e),e):(this.getDirection(this._tmpDir),e.copy(this.position).add(this._tmpDir))}getAimDirection(t=null){const e=t||new b;if(this.getDirection(e).normalize(),!D.GAMEPLAY.PLANAR_MODE)return e;const n=Math.min(1,Math.max(-1,this.planarAimOffset||0));if(Math.abs(n)<1e-4)return e;this._tmpAimRight.crossVectors(this._tmpDir.set(0,1,0),e),this._tmpAimRight.lengthSq()<1e-6?this._tmpAimRight.set(1,0,0):this._tmpAimRight.normalize(),this._tmpAimUp.crossVectors(e,this._tmpAimRight).normalize();const i=zn.degToRad(D.PROJECTILE.PLANAR_AIM_MAX_ANGLE_DEG)*n,s=Math.cos(i),a=Math.sin(i);return e.multiplyScalar(s).addScaledVector(this._tmpAimUp,a).normalize(),e}dispose(){this.trail.dispose(),this.group&&(this.renderer.removeFromScene(this.group),Fo(this.group)),this.vehicleMesh=null,this.shieldMesh=null,this.firstPersonAnchor=null,this.flames=[],this.group=null}isSphereInOBB(t,e){return this.alive?(this._tmpWorldToLocal.copy(this.group.matrixWorld).invert(),this._tmpLocalSphere.center.copy(t).applyMatrix4(this._tmpWorldToLocal),this._tmpLocalSphere.radius=e,this.hitboxBox.intersectsSphere(this._tmpLocalSphere)):!1}}const Nl=new b(0,1,0),Ol={standard:{caution:0,portalBias:0,aggressionBias:0},empty:{caution:-.12,portalBias:-.08,aggressionBias:.16},maze:{caution:.22,portalBias:.06,aggressionBias:-.1},complex:{caution:.16,portalBias:.08,aggressionBias:-.04},pyramid:{caution:.08,portalBias:.12,aggressionBias:.03}},$r=[{x:1,y:0,z:0},{x:-1,y:0,z:0},{x:0,y:0,z:1},{x:0,y:0,z:-1}],Mg={SPEED_UP:{self:.8,offense:.2,defensiveScale:.5,emergencyScale:.1,combatSelf:.2},SLOW_DOWN:{self:-.8,offense:.9,defensiveScale:.1,emergencyScale:0,combatSelf:-.3},THICK:{self:.9,offense:.1,defensiveScale:.8,emergencyScale:.2,combatSelf:.4},THIN:{self:-.6,offense:.7,defensiveScale:.2,emergencyScale:0,combatSelf:-.2},SHIELD:{self:.5,offense:0,defensiveScale:1.2,emergencyScale:2.5,combatSelf:.8},SLOW_TIME:{self:.7,offense:.35,defensiveScale:.6,emergencyScale:.4,combatSelf:.3},GHOST:{self:.95,offense:.1,defensiveScale:1,emergencyScale:2,combatSelf:.5},INVERT:{self:-.7,offense:.85,defensiveScale:.15,emergencyScale:0,combatSelf:-.4}};function Ke(r,t,e,n=0){return{name:r,yaw:t,pitch:e,weight:n,dir:new b,risk:999,wallDist:0,trailDist:0,clearance:0,immediateDanger:!1}}class Eg{constructor(t={}){this.recorder=t.recorder||null,this.currentInput={pitchUp:!1,pitchDown:!1,yawLeft:!1,yawRight:!1,rollLeft:!1,rollRight:!1,boost:!1,cameraSwitch:!1,dropItem:!1,shootItem:!1,shootItemIndex:-1,nextItem:!1,useItem:-1},this.reactionTimer=0,this._profileName="NORMAL",this.profile=null,this._decision={yaw:0,pitch:0,boost:!1,useItem:-1,shootItem:!1,shootItemIndex:-1},this.state={turnCommitTimer:0,committedYaw:0,committedPitch:0,recoveryActive:!1,recoveryTimer:0,recoveryCooldown:0,recoveryYaw:0,recoveryPitch:0,targetPlayer:null,targetRefreshTimer:0,itemUseCooldown:0,itemShootCooldown:0,portalIntentActive:!1,portalIntentTimer:0,portalIntentScore:0,portalEntryDistanceSq:1/0},this.sense={lookAhead:0,forwardRisk:1,bestProbe:null,targetDistanceSq:1/0,targetInFront:!1,immediateDanger:!1,pressure:0,localOpenness:0,mapCaution:0,mapPortalBias:0,mapAggressionBias:0,projectileThreat:!1,projectileEvadeYaw:0,projectileEvadePitch:0,heightBias:0,botRepulsionYaw:0,botRepulsionPitch:0,pursuitActive:!1,pursuitYaw:0,pursuitPitch:0,pursuitAimDot:0},this._checkStuckTimer=0,this._stuckScore=0,this._recentBouncePressure=0,this._hasPositionSample=!1,this._lastPos=new b,this._lastCollisionNormal=new b,this._hasCollisionNormal=!1,this._portalEntry=new b,this._portalExit=new b,this._portalTarget=null,this._tmpForward=new b,this._tmpRight=new b,this._tmpUp=new b,this._tmpVec=new b,this._tmpVec2=new b,this._tmpVec3=new b,this._probes=[Ke("forward",0,0,0),Ke("left",-1,0,.02),Ke("right",1,0,.02),Ke("leftWide",-1.8,0,.07),Ke("rightWide",1.8,0,.07),Ke("up",0,.9,.08),Ke("down",0,-.9,.08),Ke("upLeft",-.7,.7,.1),Ke("upRight",.7,.7,.1),Ke("downLeft",-.7,-.7,.1),Ke("downRight",.7,-.7,.1),Ke("backward",3.14,0,.25)],this._collisionCache=new Map,this._lastSensePos=new b,this._setDifficulty(t.difficulty||D.BOT.ACTIVE_DIFFICULTY||D.BOT.DEFAULT_DIFFICULTY),this._checkStuckTimer=this.profile.stuckCheckInterval}_setDifficulty(t){const e=D.BOT.DIFFICULTY_PROFILES||{},n=typeof t=="string"?t.toUpperCase():"NORMAL";this._profileName=e[n]?n:"NORMAL";const i={reactionTime:D.BOT.REACTION_TIME,lookAhead:D.BOT.LOOK_AHEAD,aggression:D.BOT.AGGRESSION,errorRate:0,probeSpread:.7,probeStep:2,turnCommitTime:.25,stuckCheckInterval:.4,stuckTriggerTime:1.6,minProgressDistance:.9,minForwardProgress:.45,recoveryDuration:1,recoveryCooldown:1.5,itemUseCooldown:1,itemShootCooldown:.6,targetRefreshInterval:.2,portalInterest:.5,portalSeekDistance:70,portalEntryDotMin:.3,portalIntentThreshold:.2,portalIntentDuration:1,boostChance:.004};this.profile={...i,...e[this._profileName]||{}}}setDifficulty(t){this._setDifficulty(t),this.reactionTimer=0,this.state.turnCommitTimer=0,this.state.recoveryActive=!1}onBounce(t,e=null){const n=t==="TRAIL"?1.3:.9;this._recentBouncePressure=Math.min(4,this._recentBouncePressure+n),e&&(this._lastCollisionNormal.copy(e).normalize(),this._hasCollisionNormal=!0)}_resetInput(t){t.pitchUp=!1,t.pitchDown=!1,t.yawLeft=!1,t.yawRight=!1,t.rollLeft=!1,t.rollRight=!1,t.boost=!1,t.cameraSwitch=!1,t.dropItem=!1,t.shootItem=!1,t.shootItemIndex=-1,t.nextItem=!1,t.useItem=-1}_resetDecision(){this._decision.yaw=0,this._decision.pitch=0,this._decision.boost=!1,this._decision.useItem=-1,this._decision.shootItem=!1,this._decision.shootItemIndex=-1}_buildBasis(t){this._tmpRight.crossVectors(Nl,t),this._tmpRight.lengthSq()<1e-6?this._tmpRight.set(1,0,0):this._tmpRight.normalize(),this._tmpUp.crossVectors(t,this._tmpRight).normalize()}_updateTimers(t){this.reactionTimer-=t,this._checkStuckTimer-=t,this._recentBouncePressure=Math.max(0,this._recentBouncePressure-t*1.35),this.state.turnCommitTimer=Math.max(0,this.state.turnCommitTimer-t),this.state.recoveryCooldown=Math.max(0,this.state.recoveryCooldown-t),this.state.targetRefreshTimer=Math.max(0,this.state.targetRefreshTimer-t),this.state.itemUseCooldown=Math.max(0,this.state.itemUseCooldown-t),this.state.itemShootCooldown=Math.max(0,this.state.itemShootCooldown-t),this.state.portalIntentTimer=Math.max(0,this.state.portalIntentTimer-t),this.state.portalIntentTimer===0&&(this.state.portalIntentActive=!1,this.state.portalIntentScore=0,this._portalTarget=null)}_updateStuckState(t,e,n){if(!this._hasPositionSample){this._lastPos.copy(t.position),this._hasPositionSample=!0;return}if(this._checkStuckTimer>0)return;this._checkStuckTimer=this.profile.stuckCheckInterval,t.getDirection(this._tmpForward).normalize(),this._tmpVec.subVectors(t.position,this._lastPos);const i=this._tmpVec.length(),s=this._tmpVec.dot(this._tmpForward),a=i<this.profile.minProgressDistance,o=s<this.profile.minForwardProgress;a||o?this._stuckScore+=this.profile.stuckCheckInterval:this._stuckScore=Math.max(0,this._stuckScore-this.profile.stuckCheckInterval*.8),this._stuckScore+=this._recentBouncePressure*.06,this._lastPos.copy(t.position),!this.state.recoveryActive&&this.state.recoveryCooldown<=0&&this._stuckScore>=this.profile.stuckTriggerTime&&this._enterRecovery(t,e,n,"low-progress")}_selectRecoveryManeuver(t,e,n){t.getDirection(this._tmpForward).normalize(),this._buildBasis(this._tmpForward);const i=D.GAMEPLAY.PLANAR_MODE?[{yaw:-1,pitch:0,weight:.02},{yaw:1,pitch:0,weight:.02},{yaw:-1,pitch:0,weight:.12,biasAwayFromNormal:!0},{yaw:1,pitch:0,weight:.12,biasAwayFromNormal:!0}]:[{yaw:-1,pitch:0,weight:.02},{yaw:1,pitch:0,weight:.02},{yaw:-1,pitch:1,weight:.1},{yaw:1,pitch:1,weight:.1},{yaw:-1,pitch:-1,weight:.1},{yaw:1,pitch:-1,weight:.1},{yaw:-1,pitch:0,weight:.14,biasAwayFromNormal:!0},{yaw:1,pitch:0,weight:.14,biasAwayFromNormal:!0}],s=[3,5.5,8.5,12];let a=null,o=1/0;for(let l=0;l<i.length;l++){const c=i[l];this._tmpVec.copy(this._tmpForward).addScaledVector(this._tmpRight,c.yaw*.95),!D.GAMEPLAY.PLANAR_MODE&&c.pitch!==0&&this._tmpVec.addScaledVector(this._tmpUp,c.pitch*.75),this._tmpVec.normalize();let h=c.weight;if(c.biasAwayFromNormal&&this._hasCollisionNormal){const d=this._tmpRight.dot(this._lastCollisionNormal);(c.yaw>0&&d>0||c.yaw<0&&d<0)&&(h+=.65)}for(let d=0;d<s.length;d++){const u=s[d];this._tmpVec2.copy(t.position).addScaledVector(this._tmpVec,u);const f=e.checkCollision(this._tmpVec2,t.hitboxRadius*1.6),g=this._checkTrailHit(this._tmpVec2,t,n);if(f||g){h+=3.2+d*.8+(g?.9:.5);break}h+=this._estimateEnemyPressure(this._tmpVec2,t,n)*.35}if(this._hasCollisionNormal){const d=this._tmpVec.dot(this._lastCollisionNormal);h-=d*.65}if(!D.GAMEPLAY.PLANAR_MODE){const u=t.position.y+this._tmpVec.y*9;(u<e.bounds.minY+7||u>e.bounds.maxY-7)&&(h+=.85)}h<o&&(o=h,a=c)}return a}_enterRecovery(t,e,n,i){this.state.recoveryActive=!0,this.state.recoveryTimer=this.profile.recoveryDuration,this.state.recoveryCooldown=this.profile.recoveryCooldown,this._stuckScore=0;const s=this._selectRecoveryManeuver(t,e,n);this.state.recoveryYaw=(s==null?void 0:s.yaw)||(Math.random()>.5?1:-1),this.state.recoveryPitch=D.GAMEPLAY.PLANAR_MODE?0:(s==null?void 0:s.pitch)||0,D.GAMEPLAY.PLANAR_MODE||(t.position.y<e.bounds.minY+8?this.state.recoveryPitch=1:t.position.y>e.bounds.maxY-8&&(this.state.recoveryPitch=-1)),this.recorder&&this.recorder.logEvent("STUCK",t.index,`reason=${i} yaw=${this.state.recoveryYaw} pitch=${this.state.recoveryPitch}`)}_shouldBoostRecovery(t,e,n){if(this._recentBouncePressure>1.2||this.sense.forwardRisk>.62)return!1;t.getDirection(this._tmpForward).normalize(),this._buildBasis(this._tmpForward),this._tmpVec.copy(this._tmpForward),this._tmpVec.addScaledVector(this._tmpRight,this.state.recoveryYaw*.22),D.GAMEPLAY.PLANAR_MODE||this._tmpVec.addScaledVector(this._tmpUp,this.state.recoveryPitch*.2),this._tmpVec.normalize();const i=[3,5,7];for(let s=0;s<i.length;s++)if(this._tmpVec2.copy(t.position).addScaledVector(this._tmpVec,i[s]),e.checkCollision(this._tmpVec2,t.hitboxRadius*1.6)||this._checkTrailHit(this._tmpVec2,t,n))return!1;return!0}_updateRecovery(t,e,n,i){return this.state.recoveryTimer-=t,this.state.recoveryTimer<=0?(this.state.recoveryActive=!1,this.state.recoveryYaw=0,this.state.recoveryPitch=0,!1):(this._resetInput(this.currentInput),this.currentInput.boost=this._shouldBoostRecovery(e,n,i),this.state.recoveryYaw>0?this.currentInput.yawRight=!0:this.state.recoveryYaw<0&&(this.currentInput.yawLeft=!0),D.GAMEPLAY.PLANAR_MODE||(this.state.recoveryPitch>0?this.currentInput.pitchUp=!0:this.state.recoveryPitch<0&&(this.currentInput.pitchDown=!0)),!0)}_computeDynamicLookAhead(t){const e=this.profile.lookAhead,n=t.baseSpeed>0?t.speed/t.baseSpeed:1;let i=e*(1+(n-1)*.75);return t.isBoosting&&(i*=1.2),Math.max(8,i)}_mapBehavior(t){const e=t.currentMapKey||"standard";return Ol[e]||Ol.standard}_composeProbeDirection(t,e,n,i){const s=i.yaw*this.profile.probeSpread,a=i.pitch*this.profile.probeSpread;i.dir.copy(t),s!==0&&i.dir.addScaledVector(e,s),!D.GAMEPLAY.PLANAR_MODE&&a!==0&&i.dir.addScaledVector(n,a),i.dir.normalize()}_checkTrailHit(t,e,n){const i=e.trail.entityManager.checkGlobalCollision(t,e.hitboxRadius*1.6,e.index,20);return!!(i&&i.hit)}_scoreProbe(t,e,n,i,s){const a=this.profile.probeStep;let o=s;const l=Math.abs(i.yaw);l>2.5?o=s*.4:l>1.2&&(o=s*.7);let c=o,h=o,d=!1;for(let p=a;p<=o;p+=a){if(this._tmpVec.copy(t.position).addScaledVector(i.dir,p),e.checkCollision(this._tmpVec,t.hitboxRadius*1.6)){c=p,p<=a*1.5&&(d=!0);break}if(this._checkTrailHit(this._tmpVec,t,n)){h=p,p<=a*1.5&&(d=!0);break}}const u=t.baseSpeed>0?t.speed/t.baseSpeed:1,f=Math.max(0,u-1)*.3,g=1-Math.min(1,c/o),_=1-Math.min(1,h/o);let m=g*(1.1+this.sense.mapCaution+f)+_*(1.45+this.sense.mapCaution*.5+f*.7);m+=i.weight,d&&(m+=2.2),this.profile.errorRate>0&&Math.random()<this.profile.errorRate&&(m+=(Math.random()-.2)*.65),i.wallDist=c,i.trailDist=h,i.clearance=Math.min(c,h),i.immediateDanger=d,i.risk=m}_selectTarget(t,e){let n=null,i=-1/0,s=1/0;t.getDirection(this._tmpForward).normalize();for(let a=0;a<e.length;a++){const o=e[a];if(!o||o===t||!o.alive)continue;this._tmpVec.subVectors(o.position,t.position);const l=this._tmpVec.lengthSq();if(l<1e-4)continue;const c=1/Math.max(4,Math.sqrt(l)),h=this._tmpVec.normalize().dot(this._tmpForward);o.getDirection(this._tmpVec2).normalize(),this._tmpVec3.subVectors(t.position,o.position).normalize();const d=this._tmpVec2.dot(this._tmpVec3),u=c*.9+h*.55+d*.35;u>i&&(i=u,n=o,s=l)}this.state.targetPlayer=n,this.sense.targetDistanceSq=n?s:1/0,n?(this._tmpVec.subVectors(n.position,t.position).normalize(),this.sense.targetInFront=this._tmpVec.dot(this._tmpForward)>.52):this.sense.targetInFront=!1}_estimateEnemyPressure(t,e,n){let i=1/0;for(let a=0;a<n.length;a++){const o=n[a];if(!o||o===e||!o.alive)continue;const l=o.position.distanceToSquared(t);l<i&&(i=l)}if(!isFinite(i))return 0;const s=Math.sqrt(i);return s>=40?0:1-s/40}_estimatePointRisk(t,e,n,i){const s=n.checkCollision(t,e.hitboxRadius*2)?1:0,a=this._checkTrailHit(t,e,i)?1:0,o=this._estimateEnemyPressure(t,e,i);return s*1.2+a*1.5+o*.6}_estimateExitSafety(t,e,n,i){let a=0;for(let o=0;o<$r.length;o++){const l=$r[o];this._tmpVec3.set(t.x+l.x*5,t.y+l.y*5,t.z+l.z*5),(e.checkCollision(this._tmpVec3,n.hitboxRadius*2)||this._checkTrailHit(this._tmpVec3,n,i))&&a++}return a/$r.length}_senseProjectiles(t,e){this.sense.projectileThreat=!1,this.sense.projectileEvadeYaw=0,this.sense.projectileEvadePitch=0;const n=this.profile.projectileAwareness||0;if(n<=0||!e||e.length===0)return;t.getDirection(this._tmpForward).normalize(),this._buildBasis(this._tmpForward);let i=1/0,s=0,a=0;for(let o=0;o<e.length;o++){const l=e[o];if(l.owner===t)continue;this._tmpVec.subVectors(l.position,t.position);const c=this._tmpVec.length();if(c>25||c<.5||(this._tmpVec.normalize(),this._tmpVec2.copy(l.velocity).normalize(),-this._tmpVec2.dot(this._tmpVec)<.4))continue;const d=l.velocity.length(),u=d>1?c/d:999;if(!(u>.8)&&!(Math.random()>n)&&u<i&&(i=u,this._tmpVec3.crossVectors(this._tmpVec2,Nl).normalize(),s=this._tmpRight.dot(this._tmpVec3)>0?-1:1,!D.GAMEPLAY.PLANAR_MODE)){const g=this._tmpVec.y;a=g>.2?-1:g<-.2?1:0}}i<1/0&&(this.sense.projectileThreat=!0,this.sense.projectileEvadeYaw=s,this.sense.projectileEvadePitch=a)}_senseHeight(t,e){if(this.sense.heightBias=0,D.GAMEPLAY.PLANAR_MODE)return;const n=this.profile.heightBias||0;if(n<=0)return;const i=e.bounds,s=(i.minY+i.maxY)*.5,a=t.position.y-s,o=(i.maxY-i.minY)*.5;if(o<=0)return;const l=a/o;this.sense.heightBias=-l*n}_senseBotSpacing(t,e){this.sense.botRepulsionYaw=0,this.sense.botRepulsionPitch=0;const n=this.profile.spacingWeight||0;if(n<=0)return;const i=12;t.getDirection(this._tmpForward).normalize(),this._buildBasis(this._tmpForward);let s=0,a=0;for(let o=0;o<e.length;o++){const l=e[o];if(!l||l===t||!l.alive||!l.isBot)continue;this._tmpVec.subVectors(t.position,l.position);const c=this._tmpVec.length();if(c>=i||c<.1)continue;const h=n*(1-c/i);this._tmpVec.normalize(),s+=this._tmpRight.dot(this._tmpVec)*h,a+=this._tmpUp.dot(this._tmpVec)*h}Math.abs(s)>.05&&(this.sense.botRepulsionYaw=s>0?1:-1),!D.GAMEPLAY.PLANAR_MODE&&Math.abs(a)>.05&&(this.sense.botRepulsionPitch=a>0?1:-1)}_evaluatePursuit(t){if(this.sense.pursuitActive=!1,this.sense.pursuitYaw=0,this.sense.pursuitPitch=0,this.sense.pursuitAimDot=0,!this.profile.pursuitEnabled||this.sense.immediateDanger||this.sense.forwardRisk>.3)return;const e=this.state.targetPlayer;if(!e||!e.alive)return;const n=this.profile.pursuitRadius||35;if(this.sense.targetDistanceSq>n*n||!this.sense.targetInFront)return;t.getDirection(this._tmpForward).normalize(),this._buildBasis(this._tmpForward),this._tmpVec.subVectors(e.position,t.position).normalize();const i=this._tmpVec.dot(this._tmpForward),s=this._tmpRight.dot(this._tmpVec),a=this._tmpUp.dot(this._tmpVec);this.sense.pursuitActive=!0,this.sense.pursuitAimDot=i,this.sense.pursuitYaw=Math.abs(s)>.05?s>0?1:-1:0,D.GAMEPLAY.PLANAR_MODE||(this.sense.pursuitPitch=Math.abs(a)>.08?a>0?1:-1:0)}_evaluatePortalIntent(t,e,n){if(!e.portalsEnabled||!e.portals||e.portals.length===0){this.state.portalIntentActive=!1,this._portalTarget=null;return}if(this.profile.portalInterest<=0){this.state.portalIntentActive=!1,this._portalTarget=null;return}const i=this.profile.portalSeekDistance,s=i*i;t.getDirection(this._tmpForward).normalize();let a=-1/0,o=null,l=null,c=1/0;for(let h=0;h<e.portals.length;h++){const d=e.portals[h],u=[{entry:d.posA,exit:d.posB},{entry:d.posB,exit:d.posA}];for(let f=0;f<u.length;f++){const{entry:g,exit:_}=u[f],m=t.position.distanceToSquared(g);if(m>s||(this._tmpVec.subVectors(g,t.position).normalize(),this._tmpVec.dot(this._tmpForward)<this.profile.portalEntryDotMin))continue;const x=this._estimatePointRisk(g,t,e,n),v=this._estimateExitSafety(_,e,t,n),y=v;if(v>=.75)continue;const P=this.sense.forwardRisk-y,A=m/s,R=P*(.8+this.profile.portalInterest)+this.sense.mapPortalBias*.5-x*.6-A*.4;R>a&&(a=R,o=g,l=_,c=m)}}if(o&&a>=this.profile.portalIntentThreshold){this.state.portalIntentActive=!0,this.state.portalIntentTimer=this.profile.portalIntentDuration,this.state.portalIntentScore=a,this.state.portalEntryDistanceSq=c,this._portalEntry.copy(o),this._portalExit.copy(l),this._portalTarget=this._portalEntry;return}this.state.portalIntentActive=!1,this.state.portalIntentScore=0,this._portalTarget=null}_senseEnvironment(t,e,n,i){const s=this._mapBehavior(e);this.sense.mapCaution=s.caution,this.sense.mapPortalBias=s.portalBias,this.sense.mapAggressionBias=s.aggressionBias,this.sense.lookAhead=this._computeDynamicLookAhead(t),t.getDirection(this._tmpForward).normalize(),this._buildBasis(this._tmpForward);const a=this._probes.length,l=!this.sense.immediateDanger&&(this.sense.forwardRisk||0)<.25&&(this.sense.localOpenness||0)>this.sense.lookAhead*.7?Math.min(6,a):a;let c=0,h=0,d=1/0,u=null,f=null;for(let m=0;m<a&&!(m>=l);m++){const p=this._probes[m],x=Math.abs(p.pitch)>.001;D.GAMEPLAY.PLANAR_MODE&&x||(this._composeProbeDirection(this._tmpForward,this._tmpRight,this._tmpUp,p),this._scoreProbe(t,e,n,p,this.sense.lookAhead),c+=p.clearance,h++,p.name==="forward"&&(f=p),p.risk<d&&(d=p.risk,u=p))}this.sense.bestProbe=u,this.sense.forwardRisk=f?f.risk:1,this.sense.immediateDanger=!!(f&&f.immediateDanger),this.sense.localOpenness=h>0?c/h:this.sense.lookAhead*.4;const g=this._estimateEnemyPressure(t.position,t,n),_=1-Math.min(1,this.sense.localOpenness/this.sense.lookAhead);this.sense.pressure=Math.min(1.6,g*.8+_*.9+this._recentBouncePressure*.2),(this.state.targetRefreshTimer<=0||!this.state.targetPlayer||!this.state.targetPlayer.alive)&&(this._selectTarget(t,n),this.state.targetRefreshTimer=this.profile.targetRefreshInterval),this._senseProjectiles(t,i),this._evaluatePursuit(t),this._senseHeight(t,e),this._senseBotSpacing(t,n),this._evaluatePortalIntent(t,e,n)}_applyPortalSteering(t){if(!this.state.portalIntentActive||!this._portalTarget)return!1;this._tmpVec.subVectors(this._portalTarget,t.position);const e=this._tmpVec.lengthSq();if(e<9)return this.state.portalIntentActive=!1,this._portalTarget=null,!1;this._tmpVec.normalize(),t.getDirection(this._tmpForward).normalize(),this._buildBasis(this._tmpForward);const n=this._tmpRight.dot(this._tmpVec),i=this._tmpUp.dot(this._tmpVec);return this._decision.yaw=Math.abs(n)>.08?n>0?1:-1:0,D.GAMEPLAY.PLANAR_MODE||(this._decision.pitch=Math.abs(i)>.08?i>0?1:-1:0),e<196&&this.sense.forwardRisk<.75&&(this._decision.boost=!0),!0}_decideSteering(t){const e=this.sense.bestProbe;if(!e){this._decision.yaw=Math.random()>.5?1:-1,this._decision.pitch=0;return}t.getDirection(this._tmpForward).normalize(),this._buildBasis(this._tmpForward);const n=this._tmpRight.dot(e.dir),i=this._tmpUp.dot(e.dir);let s=Math.abs(n)>.06?n>0?1:-1:0,a=0;!D.GAMEPLAY.PLANAR_MODE&&Math.abs(i)>.08&&(a=i>0?1:-1),!D.GAMEPLAY.PLANAR_MODE&&a===0&&Math.abs(this.sense.heightBias)>.15&&(a=this.sense.heightBias>0?1:-1),s===0&&this.sense.botRepulsionYaw!==0&&(s=this.sense.botRepulsionYaw),!D.GAMEPLAY.PLANAR_MODE&&a===0&&this.sense.botRepulsionPitch!==0&&(a=this.sense.botRepulsionPitch);const o=this.sense.lookAhead>0?this.sense.localOpenness/this.sense.lookAhead:.5,l=this.sense.immediateDanger?.45:this.sense.forwardRisk>.72||o<.55||this._recentBouncePressure>1.2?.65:1,c=Math.max(.08,this.profile.turnCommitTime*l);(this.state.turnCommitTimer<=0||this.sense.immediateDanger)&&(this.state.committedYaw=s,this.state.committedPitch=a,(s!==0||a!==0)&&(this.state.turnCommitTimer=c)),this.state.turnCommitTimer>0&&(s=this.state.committedYaw,a=this.state.committedPitch),this._decision.yaw=s,this._decision.pitch=a;const h=this.profile.aggression+this.sense.mapAggressionBias;!this.sense.immediateDanger&&this.sense.forwardRisk<.45&&Math.random()<this.profile.boostChance*(.8+Math.max(0,h))&&(this._decision.boost=!0),this._profileName==="EASY"&&Math.random()<.08&&(this._decision.yaw=Math.random()>.5?1:-1)}_decideItemUsage(t){if(!t.inventory||t.inventory.length===0)return;let e=-1/0,n=-1,i=-1/0,s=-1;const a=this.sense.pressure,o=Math.max(0,this.profile.aggression+this.sense.mapAggressionBias),l=this.sense.targetInFront?1.1:.5,c=this.sense.immediateDanger?1:this.sense.forwardRisk>.6?.5:0,h=this.sense.targetDistanceSq<100,d=this.profile.itemContextWeight||.5;for(let u=0;u<t.inventory.length;u++){const f=t.inventory[u],g=Mg[f]||{self:0,offense:0,defensiveScale:0,emergencyScale:0,combatSelf:0},_=g.self+a*g.defensiveScale+c*(g.emergencyScale||0)*d+(h?(g.combatSelf||0)*d:0),m=g.offense*(.55+o)*l;_>e&&(e=_,n=u),m>i&&(i=m,s=u)}if(n>=0&&e>.72&&this.state.itemUseCooldown<=0){this._decision.useItem=n,this.state.itemUseCooldown=this.profile.itemUseCooldown;return}s>=0&&i>.45&&this.state.itemShootCooldown<=0&&(this._decision.shootItem=!0,this._decision.shootItemIndex=s,this.state.itemShootCooldown=this.profile.itemShootCooldown)}_applyDecisionToInput(){const t=this.currentInput;return this._resetInput(t),this._decision.yaw>0?t.yawRight=!0:this._decision.yaw<0&&(t.yawLeft=!0),this._decision.pitch>0?t.pitchUp=!0:this._decision.pitch<0&&(t.pitchDown=!0),t.boost=this._decision.boost,t.useItem=this._decision.useItem,t.shootItem=this._decision.shootItem,t.shootItemIndex=this._decision.shootItemIndex,t}update(t,e,n,i,s){const a=D.BOT.ACTIVE_DIFFICULTY||this._profileName;if(a!==this._profileName&&this._setDifficulty(a),this._updateTimers(t),this._updateStuckState(e,n,i),this.state.recoveryActive&&this._updateRecovery(t,e,n,i))return this.currentInput;if(this.reactionTimer>0)return this.currentInput;const o=1+(Math.random()*2-1)*this.profile.errorRate*.2;if(this.reactionTimer=Math.max(.02,this.profile.reactionTime*o),this._resetDecision(),this._senseEnvironment(e,n,i,s),this.sense.immediateDanger&&this.state.recoveryCooldown<=0&&this._recentBouncePressure>2.3&&(this._enterRecovery(e,n,i,"collision-pressure"),this._updateRecovery(t,e,n,i)))return this.currentInput;if(this.sense.projectileThreat&&this.sense.forwardRisk<.6)this._decision.yaw=this.sense.projectileEvadeYaw,this._decision.pitch=this.sense.projectileEvadePitch,this._decision.boost=!0;else if(!this._applyPortalSteering(e))if(this.sense.pursuitActive){this._decision.yaw=this.sense.pursuitYaw,this._decision.pitch=this.sense.pursuitPitch,this.sense.targetDistanceSq>400&&(this._decision.boost=!0);const c=this.profile.pursuitAimTolerance||.85;this.sense.pursuitAimDot>c&&e.inventory&&e.inventory.length>0&&(this._decision.shootItem=!0,this._decision.shootItemIndex=0,this.state.itemShootCooldown=this.profile.itemShootCooldown)}else this._decideSteering(e);return this._decideItemUsage(e),this._applyDecisionToInput()}}const Be={pitchUp:!1,pitchDown:!1,yawLeft:!1,yawRight:!1,rollLeft:!1,rollRight:!1,boost:!1,cameraSwitch:!1,dropItem:!1,shootItem:!1,shootItemIndex:-1,nextItem:!1,useItem:-1};function Ag(){return Be.pitchUp=!1,Be.pitchDown=!1,Be.yawLeft=!1,Be.yawRight=!1,Be.rollLeft=!1,Be.rollRight=!1,Be.boost=!1,Be.cameraSwitch=!1,Be.dropItem=!1,Be.shootItem=!1,Be.shootItemIndex=-1,Be.nextItem=!1,Be.useItem=-1,Be}class Tg{constructor(t,e,n,i,s,a){this.renderer=t,this.arena=e,this.powerupManager=n,this.particles=i,this.audio=s,this.recorder=a,this.players=[],this.humanPlayers=[],this.bots=[],this.botByPlayer=new Map,this.projectiles=[],this._projectileAssets=new Map,this._projectilePools=new Map,this.onPlayerDied=null,this.onRoundEnd=null,this.onPlayerFeedback=null,this._tmpVec=new b,this._tmpVec2=new b,this._tmpDir=new b,this._tmpDir2=new b,this._tmpCamAnchor=new b,this._tmpCollisionNormal=new b,this._lockOnCache=new Map,this.botDifficulty=D.BOT.ACTIVE_DIFFICULTY||D.BOT.DEFAULT_DIFFICULTY,this.gridSize=10,this.spatialGrid=new Map}setup(t,e,n={}){var u,f,g;console.log(`[EntityManager] Setup: Humans=${t}, Bots=${e}`),this.clear();const i=Array.isArray(n.humanConfigs)?n.humanConfigs:[],s=typeof n.modelScale=="number"?n.modelScale:D.PLAYER.MODEL_SCALE||1;this.botDifficulty=n.botDifficulty||D.BOT.ACTIVE_DIFFICULTY||this.botDifficulty;const a=vg(),o=String(D.PLAYER.DEFAULT_VEHICLE_ID),l=_=>{const m=String(_||"").trim();return Dc(m)?m:o},h=(Array.isArray(n.botVehicleIds)&&n.botVehicleIds.length>0?n.botVehicleIds:a).map(_=>l(_));this.humanPlayers=[],this.botByPlayer.clear();const d=[D.COLORS.PLAYER_1,D.COLORS.PLAYER_2];for(let _=0;_<t;_++){const m=l((u=i[_])==null?void 0:u.vehicleId),p=new Dl(this.renderer,_,d[_],!1,{vehicleId:m,entityManager:this});p.setControlOptions({invertPitch:!!((f=i[_])!=null&&f.invertPitch),cockpitCamera:!!((g=i[_])!=null&&g.cockpitCamera),modelScale:s}),this.players.push(p),this.humanPlayers.push(p)}for(let _=0;_<e;_++){const m=D.COLORS.BOT_COLORS[_%D.COLORS.BOT_COLORS.length],p=h.length>0?h[_%h.length]:o,x=new Dl(this.renderer,t+_,m,!0,{vehicleId:p,entityManager:this});x.setControlOptions({modelScale:s,invertPitch:!1});const v=new Eg({difficulty:this.botDifficulty,recorder:this.recorder});this.players.push(x),this.bots.push({player:x,ai:v}),this.botByPlayer.set(x,v)}}setBotDifficulty(t){var e;this.botDifficulty=t||this.botDifficulty;for(let n=0;n<this.bots.length;n++){const i=this.bots[n];(e=i==null?void 0:i.ai)!=null&&e.setDifficulty&&i.ai.setDifficulty(this.botDifficulty)}}spawnAll(){this._roundEnded=!1;const e=!!D.GAMEPLAY.PLANAR_MODE?this._getPlanarSpawnLevel():null;for(const n of this.players){const i=this._findSpawnPosition(12,12,e),s=this._findSafeSpawnDirection(i,n.hitboxRadius);n.spawn(i,s),n.shootCooldown=0,this.recorder&&(this.recorder.markPlayerSpawn(n),this.recorder.logEvent("SPAWN",n.index,n.isBot?"bot=1":"bot=0"))}}_getPlanarSpawnLevel(){var o,l,c;const t=((o=this.arena)==null?void 0:o.bounds)||null,e=t?(t.minY+t.maxY)*.5:D.PLAYER.START_Y;if(!(Array.isArray((l=this.arena)==null?void 0:l.portals)&&this.arena.portals.length>0)||!((c=this.arena)!=null&&c.getPortalLevels))return e;const i=this.arena.getPortalLevels();if(!Array.isArray(i)||i.length===0)return e;let s=e,a=1/0;for(let h=0;h<i.length;h++){const d=i[h];if(!Number.isFinite(d))continue;const u=Math.abs(d-e);u<a&&(a=u,s=d)}return s}_findSpawnPosition(t=12,e=12,n=null){var a;const i=Number.isFinite(n)&&!!((a=this.arena)!=null&&a.getRandomPositionOnLevel),s=()=>i?this.arena.getRandomPositionOnLevel(n,e):this.arena.getRandomPosition(e);for(let o=0;o<100;o++){const l=s();let c=!1;for(const h of this.players)if(h.alive&&h.position.distanceToSquared(l)<t*t){c=!0;break}if(!c)return l}return s()}_findSafeSpawnDirection(t,e=.8){let i=new b(0,0,-1),s=-1;for(let a=0;a<20;a++){const o=Math.PI*2*a/20;this._tmpDir.set(Math.sin(o),0,-Math.cos(o));const l=this._traceFreeDistance(t,this._tmpDir,36,2.2,e);l>s&&(s=l,i.copy(this._tmpDir))}return i}_traceFreeDistance(t,e,n,i,s=.8){const a=Math.max(.5,i);let o=0;for(;o<n;)if(o+=a,this._tmpVec.set(t.x+e.x*o,t.y+e.y*o,t.z+e.z*o),this.arena.checkCollision(this._tmpVec,s))return o-a;return n}update(t,e){this._lockOnCache.clear(),this._updateProjectiles(t);for(const o of this.players){if(!o.alive)continue;o.shootCooldown=Math.max(0,(o.shootCooldown||0)-t);let l=Ag();if(o.isBot){const u=this.botByPlayer.get(o);u&&(l=u.update(t,o,this.arena,this.players,this.projectiles))}else{const u=this.humanPlayers.length===1&&o.index===0;l=e.getPlayerInput(o.index,{includeSecondaryBindings:u}),l.cameraSwitch&&(this.renderer.cycleCamera(o.index),o.cameraMode=this.renderer.cameraModes[o.index]||0)}if(l.nextItem&&o.cycleItem(),l.dropItem&&o.dropItem(),l.useItem>=0){const u=this._useInventoryItem(o,l.useItem);u.ok?this.recorder&&this.recorder.logEvent("ITEM_USE",o.index,`mode=use type=${u.type}`):o.isBot||this._notifyPlayerFeedback(o,u.reason)}if(l.shootItem){const u=this._shootItemProjectile(o,l.shootItemIndex);!u.ok&&!o.isBot?this._notifyPlayerFeedback(o,u.reason):u.ok&&this.recorder&&this.recorder.logEvent("ITEM_USE",o.index,`mode=shoot type=${u.type}`)}o.update(t,l);const c=(o.spawnProtectionTimer||0)>0;if(!o.isGhost&&!c){const u=o.hitboxRadius;let f=!1;if(this.arena.checkCollision(o.position,.4)&&(f=!0),f||(o.getAimDirection(this._tmpDir).multiplyScalar(4).add(o.position),this.arena.checkCollision(this._tmpDir,.4)&&(f=!0)),f||(o.getDirection(this._tmpVec).multiplyScalar(-1.5).add(o.position),this.arena.checkCollision(this._tmpVec,.4)&&(f=!0)),f||(this._tmpVec.set(0,1,0).applyQuaternion(o.group.quaternion),this._tmpDir.crossVectors(this._tmpVec,o.getDirection(this._tmpVec2)).normalize(),this._tmpVec2.copy(this._tmpDir).multiplyScalar(2).add(o.position),this.arena.checkCollision(this._tmpVec2,.4)&&(f=!0),f||(this._tmpVec2.copy(this._tmpDir).multiplyScalar(-2).add(o.position),this.arena.checkCollision(this._tmpVec2,.4)&&(f=!0))),f)if(o.hasShield)o.hasShield=!1,o.getDirection(this._tmpDir).multiplyScalar(2.2),o.position.sub(this._tmpDir);else{this.audio&&this.audio.play("HIT"),this.particles&&this.particles.spawnHit(o.position,o.color),this._killPlayer(o,"WALL");continue}const g=this.checkGlobalCollision(o.position,u*2,o.index,25,o);if(g&&g.hit)if(o.hasShield)o.hasShield=!1;else{this.audio&&this.audio.play("HIT"),this.particles&&this.particles.spawnHit(o.position,o.color),this._killPlayer(o,g.playerIndex===o.index?"TRAIL_SELF":"TRAIL_OTHER");continue}}if(!o.alive)continue;const h=this.arena.checkPortal(o.position,o.hitboxRadius,o.index);h&&(o.position.copy(h.target),o.getDirection(this._tmpVec).normalize().multiplyScalar(2),o.position.add(this._tmpVec),D.GAMEPLAY.PLANAR_MODE&&(o.currentPlanarY=h.target.y),o.trail.forceGap(.5));const d=this.powerupManager.checkPickup(o.position,o.hitboxRadius);d&&(o.addToInventory(d),this.audio&&this.audio.play("POWERUP"),this.particles&&this.particles.spawnHit(o.position,65280))}if(this._roundEnded)return;let n=0,i=null;for(const o of this.humanPlayers)o.alive&&(n++,i=o);let s=!1,a=null;if(this.humanPlayers.length===1){if(n===0){s=!0;for(let o=0;o<this.bots.length;o++){const l=this.bots[o].player;if(l&&l.alive){a=l;break}}}}else this.humanPlayers.length>=2&&n<=1&&(s=!0,a=i);s&&(this._roundEnded=!0,this.onRoundEnd&&this.onRoundEnd(a))}_takeInventoryItem(t,e=-1){if(!t.inventory||t.inventory.length===0)return{ok:!1,reason:"Kein Item verfuegbar",type:null};const n=Number.isInteger(e)&&e>=0?Math.min(e,t.inventory.length-1):Math.min(t.selectedItemIndex||0,t.inventory.length-1),i=t.inventory.splice(n,1)[0];return(t.inventory.length===0||t.selectedItemIndex>=t.inventory.length)&&(t.selectedItemIndex=0),{ok:!0,type:i}}_useInventoryItem(t,e=-1){const n=this._takeInventoryItem(t,e);return n.ok?(t.applyPowerup(n.type),{ok:!0,type:n.type}):{ok:!1,reason:n.reason}}_shootItemProjectile(t,e=-1){if((t.shootCooldown||0)>0)return{ok:!1,reason:`Schuss bereit in ${t.shootCooldown.toFixed(1)}s`};const n=this._takeInventoryItem(t,e);if(!n.ok)return{ok:!1,reason:n.reason,type:null};const i=n.type,s=D.POWERUP.TYPES[i];if(!s)return{ok:!1,reason:"Item ungueltig"};t.getAimDirection(this._tmpDir).normalize(),this._tmpVec.copy(t.position).addScaledVector(this._tmpDir,2.2);const a=D.PROJECTILE.SPEED,o=D.PROJECTILE.RADIUS,l=this._acquireProjectileMesh(i,s.color);return l.position.copy(this._tmpVec),this._tmpVec2.copy(this._tmpVec).add(this._tmpDir),l.lookAt(this._tmpVec2),this.projectiles.push({mesh:l,flame:l.userData.flame||null,poolKey:i,owner:t,type:i,position:this._tmpVec.clone(),velocity:this._tmpDir.clone().multiplyScalar(a),radius:o,ttl:D.PROJECTILE.LIFE_TIME,traveled:0,target:this._checkLockOn(t)}),t.shootCooldown=D.PROJECTILE.COOLDOWN,this.audio&&this.audio.play("SHOOT"),{ok:!0,type:i}}_acquireProjectileMesh(t,e){let i=this._getProjectilePool(t).pop();if(!i){const s=this._getProjectileAssets(t,e);i=new ae;const a=new X(s.bodyGeo,s.bodyMat);i.add(a);const o=new X(s.tipGeo,s.tipMat);o.position.z=-.8,i.add(o);for(let c=0;c<4;c++){const h=new X(s.finGeo,s.finMat);h.position.z=.5;const d=Math.PI/2*c;c%2===0?h.position.x=Math.cos(d)*.2:(h.position.y=Math.sin(d)*.2,h.rotation.z=Math.PI/2),i.add(h)}const l=new X(s.flameGeo,s.flameMat);l.position.z=.85,i.add(l),i.userData.flame=l}return i.visible=!0,i.userData.flame&&i.userData.flame.scale.set(1,1,1),this.renderer.addToScene(i),i}_getProjectilePool(t){return this._projectilePools.has(t)||this._projectilePools.set(t,[]),this._projectilePools.get(t)}_getProjectileAssets(t,e){if(this._projectileAssets.has(t))return this._projectileAssets.get(t);const n=new qt(.15,.15,1.2,8);n.rotateX(Math.PI/2);const i=new Qe(.15,.4,8);i.rotateX(Math.PI/2);const s=new Jt(.02,.25,.3),a=new Qe(.1,.5,6);a.rotateX(-Math.PI/2);const o=new St({color:e,emissive:e,emissiveIntensity:.4,roughness:.3,metalness:.6}),l=new St({color:13421772,emissive:e,emissiveIntensity:.2,roughness:.2,metalness:.8}),c=new St({color:e,emissive:e,emissiveIntensity:.3,roughness:.4,metalness:.5}),h=new Qt({color:16737792,transparent:!0,opacity:.8}),d={bodyGeo:n,tipGeo:i,finGeo:s,flameGeo:a,bodyMat:o,tipMat:l,finMat:c,flameMat:h};return this._projectileAssets.set(t,d),d}_checkLockOn(t){if(this._lockOnCache.has(t.index))return this._lockOnCache.get(t.index);t.getDirection(this._tmpDir).normalize();const e=D.HOMING.LOCK_ON_ANGLE*Math.PI/180,n=D.HOMING.MAX_LOCK_RANGE*D.HOMING.MAX_LOCK_RANGE;let i=null,s=1/0;for(const a of this.players){if(a===t||!a.alive)continue;this._tmpVec.subVectors(a.position,t.position);const o=this._tmpVec.lengthSq();if(o>n||o<1)continue;this._tmpDir.angleTo(this._tmpVec.normalize())<=e&&o<s&&(i=a,s=o)}return this._lockOnCache.set(t.index,i),i}getLockOnTarget(t){if(this._lockOnCache.has(t))return this._lockOnCache.get(t);const e=this.players[t];return!e||!e.alive?null:this._checkLockOn(e)}_updateProjectiles(t){const e=performance.now()*.001;for(let n=this.projectiles.length-1;n>=0;n--){const i=this.projectiles[n],s=i.velocity.x*t,a=i.velocity.y*t,o=i.velocity.z*t;i.position.x+=s,i.position.y+=a,i.position.z+=o,i.traveled+=Math.sqrt(s*s+a*a+o*o),i.ttl-=t,i.mesh.position.copy(i.position),this._tmpVec.addVectors(i.position,i.velocity),i.mesh.lookAt(this._tmpVec);const l=this.arena.checkPortal(i.position,i.radius,1e3+n);if(l&&(i.position.copy(l.target),this._tmpVec.copy(i.velocity).normalize().multiplyScalar(1.5),i.position.add(this._tmpVec),i.mesh.position.copy(i.position)),i.target&&i.target.alive){this._tmpVec.subVectors(i.target.position,i.position).normalize(),this._tmpVec2.copy(i.velocity);const h=this._tmpVec2.length();this._tmpVec2.normalize().lerp(this._tmpVec,Math.min(D.HOMING.TURN_RATE*t,1)).normalize(),i.velocity.copy(this._tmpVec2.multiplyScalar(h)),this._tmpVec.addVectors(i.position,i.velocity),i.mesh.lookAt(this._tmpVec)}if(i.flame){const h=.7+Math.sin(e*30+n*7)*.3;i.flame.scale.set(1,1,h)}if(i.ttl<=0||i.traveled>=D.PROJECTILE.MAX_DISTANCE||this.arena.checkCollision(i.position,i.radius)){this.particles&&this.particles.spawnHit(i.position,16776960),this.audio&&!i.owner.isBot&&this.audio.play("HIT"),this._removeProjectileAt(n);continue}let c=!1;for(const h of this.players)if(!(!h.alive||h===i.owner)){if(h.isPointInOBB&&h.isPointInOBB(i.position))c=!0;else{const d=h.hitboxRadius+i.radius;h.position.distanceToSquared(i.position)<=d*d&&(c=!0)}if(c){h.hasShield?h.hasShield=!1:(h.applyPowerup(i.type),this.particles&&this.particles.spawnExplosion(h.position,16711680),this.audio&&this.audio.play("POWERUP"));break}}c&&this._removeProjectileAt(n)}}_removeProjectileAt(t){const e=this.projectiles[t];e&&(this._releaseProjectileMesh(e),this.projectiles.splice(t,1))}_releaseProjectileMesh(t){this.renderer.removeFromScene(t.mesh),t.mesh.visible=!1,this._getProjectilePool(t.poolKey||t.type).push(t.mesh)}_notifyPlayerFeedback(t,e){this.onPlayerFeedback&&this.onPlayerFeedback(t,e)}_killPlayer(t,e="UNKNOWN"){t.kill(),this.particles&&this.particles.spawnExplosion(t.position,t.color),this.audio&&this.audio.play("EXPLOSION"),this.recorder&&(this.recorder.markPlayerDeath(t,e),this.recorder.logEvent("KILL",t.index,`cause=${e}`)),this.onPlayerDied&&this.onPlayerDied(t,e)}_isBotPositionSafe(t,e){return this.arena.checkCollision(e,t.hitboxRadius)?!1:!this.checkGlobalCollision(e,t.hitboxRadius,t.index,20)}_clampBotPosition(t){const e=this.arena.bounds;t.x=Math.max(e.minX+2,Math.min(e.maxX-2,t.x)),t.y=Math.max(e.minY+2,Math.min(e.maxY-2,t.y)),t.z=Math.max(e.minZ+2,Math.min(e.maxZ-2,t.z))}_findSafeBouncePosition(t,e,n=null){const i=t.position,s=[1.5,3,5,.5];for(const o of s)if(this._tmpVec2.copy(i).addScaledVector(e,o),this._isBotPositionSafe(t,this._tmpVec2)){i.copy(this._tmpVec2);return}if(n&&(i.addScaledVector(n,2),this._isBotPositionSafe(t,i)))return;const a=this.arena.bounds;i.set((a.minX+a.maxX)*.5,(a.minY+a.maxY)*.5,(a.minZ+a.maxZ)*.5)}_bounceBot(t,e=null,n="WALL"){const i=t.position;let s=e;if(!s){const c=this.arena.bounds,h=i.x-c.minX,d=c.maxX-i.x,u=i.y-c.minY,f=c.maxY-i.y,g=i.z-c.minZ,_=c.maxZ-i.z;let m=h;this._tmpVec2.set(1,0,0),d<m&&(m=d,this._tmpVec2.set(-1,0,0)),u<m&&(m=u,this._tmpVec2.set(0,1,0)),f<m&&(m=f,this._tmpVec2.set(0,-1,0)),_<m&&(m=_,this._tmpVec2.set(0,0,1)),g<m&&(m=g,this._tmpVec2.set(0,0,-1)),s=this._tmpVec2}t.getDirection(this._tmpDir).normalize();const a=this._tmpDir.dot(s);this._tmpDir.x-=2*a*s.x,this._tmpDir.y-=2*a*s.y,this._tmpDir.z-=2*a*s.z,this._tmpDir.normalize(),this._tmpDir.addScaledVector(s,.25);const o=n==="TRAIL"?.35:.24;this._tmpDir.x+=(Math.random()-.5)*o,this._tmpDir.y+=(Math.random()-.5)*o,this._tmpDir.z+=(Math.random()-.5)*o,D.GAMEPLAY.PLANAR_MODE&&(this._tmpDir.y=0),this._tmpDir.normalize(),this._tmpDir.addScaledVector(this._tmpDir,1),this._tmpVec.copy(i).add(this._tmpDir),t.group.lookAt(this._tmpVec),t.quaternion.copy(t.group.quaternion),this._findSafeBouncePosition(t,this._tmpDir,s),t.trail.forceGap(.3);const l=this.botByPlayer.get(t);l!=null&&l.onBounce&&l.onBounce(n,s),this.recorder&&this.recorder.logEvent(n==="TRAIL"?"BOUNCE_TRAIL":"BOUNCE_WALL",t.index)}updateCameras(t){for(const e of this.players)if(!e.isBot&&e.index<this.renderer.cameras.length){const n=e.position,i=e.alive?e.getDirection(this._tmpDir2):this._tmpDir2.set(0,0,-1),s=e.getFirstPersonCameraAnchor(this._tmpCamAnchor);this.renderer.updateCamera(e.index,n,i,t,e.quaternion,e.cockpitCamera,e.isBoosting,this.arena,s)}}getHumanPlayers(){return this.humanPlayers}clear(){for(const t of this.players)t.dispose();this.players=[],this.humanPlayers=[],this.bots=[],this.botByPlayer.clear(),this._lockOnCache.clear(),this.spatialGrid.clear();for(const t of this.projectiles)this._releaseProjectileMesh(t);this.projectiles=[]}_getGridKey(t,e){const n=Math.floor(t/this.gridSize),i=Math.floor(e/this.gridSize);return(n+1e3)*2e3+(i+1e3)}registerTrailSegment(t,e,n){const i=this._getGridKey(n.midX,n.midZ);this.spatialGrid.has(i)||this.spatialGrid.set(i,new Set);const s={playerIndex:t,segmentIdx:e,fromX:n.fromX,fromY:n.fromY,fromZ:n.fromZ,toX:n.toX,toY:n.toY,toZ:n.toZ,radius:n.radius};return this.spatialGrid.get(i).add(s),{key:i,entry:s}}unregisterTrailSegment(t,e){const n=this.spatialGrid.get(t);n&&(n.delete(e),n.size===0&&this.spatialGrid.delete(t))}checkGlobalCollision(t,e,n=-1,i=0,s=null){const a=Math.floor(t.x/this.gridSize),o=Math.floor(t.z/this.gridSize);for(let l=-1;l<=1;l++)for(let c=-1;c<=1;c++){const h=(a+l+1e3)*2e3+(o+c+1e3),d=this.spatialGrid.get(h);if(d)for(const u of d){if(u.playerIndex===n){const q=this.players[u.playerIndex];if(q&&q.trail&&(q.trail.writeIndex-1-u.segmentIdx+q.trail.maxSegments)%q.trail.maxSegments<i)continue}const f=e+u.radius,g=Math.min(u.fromX,u.toX)-u.radius,_=Math.max(u.fromX,u.toX)+u.radius;if(t.x<g-e||t.x>_+e)continue;const m=Math.min(u.fromY,u.toY)-u.radius,p=Math.max(u.fromY,u.toY)+u.radius;if(t.y<m-e||t.y>p+e)continue;const x=Math.min(u.fromZ,u.toZ)-u.radius,v=Math.max(u.fromZ,u.toZ)+u.radius;if(t.z<x-e||t.z>v+e)continue;const y=u.toX-u.fromX,P=u.toY-u.fromY,A=u.toZ-u.fromZ,R=t.x-u.fromX,N=t.y-u.fromY,M=t.z-u.fromZ,w=y*y+P*P+A*A;let U=0;w>1e-6&&(U=Math.max(0,Math.min(1,(R*y+N*P+M*A)/w)));const V=u.fromX+U*y,J=u.fromY+U*P,L=u.fromZ+U*A,B=t.x-V,k=t.y-J,j=t.z-L;if(B*B+k*k+j*j<=f*f)if(s&&s.isSphereInOBB){if(this._tmpVec.set(V,J,L),s.isSphereInOBB(this._tmpVec,u.radius))return{hit:!0,playerIndex:u.playerIndex}}else return{hit:!0,playerIndex:u.playerIndex}}}return null}dispose(){this.clear();for(const t of this._projectileAssets.values())t.bodyGeo&&t.bodyGeo.dispose(),t.tipGeo&&t.tipGeo.dispose(),t.finGeo&&t.finGeo.dispose(),t.flameGeo&&t.flameGeo.dispose(),t.bodyMat&&t.bodyMat.dispose(),t.tipMat&&t.tipMat.dispose(),t.finMat&&t.finMat.dispose(),t.flameMat&&t.flameMat.dispose();this._projectileAssets.clear(),this._projectilePools.clear()}}class wg{constructor(t,e){this.renderer=t,this.arena=e,this.items=[],this.spawnTimer=0,this.typeKeys=Object.keys(D.POWERUP.TYPES),this._pickupBoxSize=new b,this._pickupSphere=new dn;const n=D.POWERUP.SIZE;this._sharedGeo=new Jt(n,n,n),this._sharedWireGeo=new Jt(n*1.15,n*1.15,n*1.15)}update(t){this.spawnTimer+=t,this.spawnTimer>=D.POWERUP.SPAWN_INTERVAL&&this.items.length<D.POWERUP.MAX_ON_FIELD&&(this.spawnTimer=0,this._spawnRandom());const e=performance.now()*.001,n=D.POWERUP.PICKUP_RADIUS*2;this._pickupBoxSize.set(n,n,n);for(const i of this.items)i.mesh.rotation.y+=D.POWERUP.ROTATION_SPEED*t,i.mesh.position.y=i.baseY+Math.sin(e*D.POWERUP.BOUNCE_SPEED+i.phase)*D.POWERUP.BOUNCE_HEIGHT,i.box.setFromCenterAndSize(i.mesh.position,this._pickupBoxSize)}_spawnRandom(){var d;const t=this.typeKeys[Math.floor(Math.random()*this.typeKeys.length)],e=D.POWERUP.TYPES[t];let n=null;if(D.GAMEPLAY.PLANAR_MODE&&((d=this.arena)!=null&&d.getPortalLevels)){const u=this.arena.getPortalLevels();if(u.length>0){const f=u[Math.floor(Math.random()*u.length)];n=this.arena.getRandomPositionOnLevel(f,8)}}n||(n=this.arena.getRandomPosition(8));const i=this._sharedGeo,s=new St({color:e.color,emissive:e.color,emissiveIntensity:.5,roughness:.2,metalness:.8,transparent:!0,opacity:.85}),a=new X(i,s);a.position.copy(n),a.castShadow=!1;const o=this._sharedWireGeo,l=new Qt({color:e.color,wireframe:!0,transparent:!0,opacity:.3}),c=new X(o,l);a.add(c),this.renderer.addToScene(a);const h=new We().setFromCenterAndSize(n,new b(D.POWERUP.PICKUP_RADIUS*2,D.POWERUP.PICKUP_RADIUS*2,D.POWERUP.PICKUP_RADIUS*2));this.items.push({mesh:a,type:t,box:h,baseY:n.y,phase:Math.random()*Math.PI*2})}checkPickup(t,e){this._pickupSphere.center.copy(t),this._pickupSphere.radius=e+D.POWERUP.PICKUP_RADIUS;for(let n=this.items.length-1;n>=0;n--)if(this.items[n].box.intersectsSphere(this._pickupSphere)){const i=this.items.splice(n,1)[0];return this.renderer.removeFromScene(i.mesh),i.mesh.traverse(s=>{s.material&&(Array.isArray(s.material)?s.material.forEach(a=>a.dispose()):s.material.dispose())}),i.type}return null}clear(){for(const t of this.items)this.renderer.removeFromScene(t.mesh),t.mesh.traverse(e=>{e.material&&(Array.isArray(e.material)?e.material.forEach(n=>n.dispose()):e.material.dispose())});this.items=[],this.spawnTimer=0}dispose(){this.clear(),this._sharedGeo&&(this._sharedGeo.dispose(),this._sharedGeo=null),this._sharedWireGeo&&(this._sharedWireGeo.dispose(),this._sharedWireGeo=null)}}const Mn=1e3,cn=new ee;class Ul{constructor(t){this.renderer=t,this.count=0,this.positions=new Float32Array(Mn*3),this.velocities=new Float32Array(Mn*3),this.lifetimes=new Float32Array(Mn),this.maxLifetimes=new Float32Array(Mn),this.gravities=new Float32Array(Mn),this.scales=new Float32Array(Mn),this.colors=new Float32Array(Mn*3);const e=new Jt(.8,.8,.8),n=new Qt({color:16777215,transparent:!0,opacity:1});this.mesh=new xc(e,n,Mn),this.mesh.instanceMatrix.setUsage(Jl),this.mesh.count=0,this.renderer.addToScene(this.mesh),this._tmpColor=new wt}spawn(t,e,n,i=1,s=.5,a=1){if(this.mesh){this._tmpColor.setHex(n);for(let o=0;o<e;o++){if(this.count>=Mn)return;const l=this.count;this.count++,this.positions[l*3]=t.x,this.positions[l*3+1]=t.y,this.positions[l*3+2]=t.z;const c=Math.random()*Math.PI*2,h=Math.acos(2*Math.random()-1),d=i*(.5+Math.random()*.5);this.velocities[l*3]=d*Math.sin(h)*Math.cos(c),this.velocities[l*3+1]=d*Math.sin(h)*Math.sin(c),this.velocities[l*3+2]=d*Math.cos(h),this.lifetimes[l]=a*(.8+Math.random()*.4),this.maxLifetimes[l]=this.lifetimes[l],this.gravities[l]=-5,this.scales[l]=s*(.5+Math.random()*.5),this.colors[l*3]=this._tmpColor.r,this.colors[l*3+1]=this._tmpColor.g,this.colors[l*3+2]=this._tmpColor.b,this.mesh.setColorAt(l,this._tmpColor),cn.position.set(this.positions[l*3],this.positions[l*3+1],this.positions[l*3+2]),cn.scale.setScalar(this.scales[l]),cn.updateMatrix(),this.mesh.setMatrixAt(l,cn.matrix)}this.mesh.instanceMatrix.needsUpdate=!0,this.mesh.instanceColor&&(this.mesh.instanceColor.needsUpdate=!0)}}spawnExplosion(t,e){this.spawn(t,30,e,12,.7,.6)}spawnHit(t,e){this.spawn(t,10,e,6,.4,.3)}update(t){if(!this.mesh)return;if(this.count===0){this.mesh.count=0;return}let e=0,n=!1;for(let i=0;i<this.count;i++)if(this.lifetimes[i]-=t,this.lifetimes[i]>0){const s=i*3,a=e*3;this.velocities[s+1]+=this.gravities[i]*t,this.positions[s]+=this.velocities[s]*t,this.positions[s+1]+=this.velocities[s+1]*t,this.positions[s+2]+=this.velocities[s+2]*t,i!==e&&(this.positions[a]=this.positions[s],this.positions[a+1]=this.positions[s+1],this.positions[a+2]=this.positions[s+2],this.velocities[a]=this.velocities[s],this.velocities[a+1]=this.velocities[s+1],this.velocities[a+2]=this.velocities[s+2],this.lifetimes[e]=this.lifetimes[i],this.maxLifetimes[e]=this.maxLifetimes[i],this.gravities[e]=this.gravities[i],this.scales[e]=this.scales[i],this.colors[a]=this.colors[s],this.colors[a+1]=this.colors[s+1],this.colors[a+2]=this.colors[s+2],this._tmpColor.setRGB(this.colors[a],this.colors[a+1],this.colors[a+2]),this.mesh.setColorAt(e,this._tmpColor),n=!0),cn.position.set(this.positions[a],this.positions[a+1],this.positions[a+2]),cn.rotation.x+=this.velocities[a+2]*t,cn.rotation.y+=this.velocities[a]*t;const o=this.scales[e]*(this.lifetimes[e]/this.maxLifetimes[e]);cn.scale.setScalar(o),cn.updateMatrix(),this.mesh.setMatrixAt(e,cn.matrix),e++}this.count=e,this.mesh.count=e,this.mesh.instanceMatrix.needsUpdate=!0,n&&this.mesh.instanceColor&&(this.mesh.instanceColor.needsUpdate=!0)}clear(){this.count=0,this.mesh&&(this.mesh.count=0)}dispose(){var t;this.clear(),this.mesh&&((t=this.renderer)==null||t.removeFromScene(this.mesh),Fo(this.mesh),this.mesh=null),this.renderer=null,this.positions=null,this.velocities=null,this.lifetimes=null,this.maxLifetimes=null,this.gravities=null,this.scales=null,this.colors=null,this._tmpColor=null}}class bg{constructor(){this.ctx=null,this.enabled=!0,this.volume=.15,this.buffers={},this.lastPlayTime={},this.cooldowns={SHOOT:100,EXPLOSION:200,HIT:100,POWERUP:500,BOOST:200};const t=()=>this._init();window.addEventListener("keydown",t,{once:!0}),window.addEventListener("mousedown",t,{once:!0}),window.addEventListener("keydown",e=>{e.code==="KeyM"&&(this.enabled=!this.enabled,console.log(`Audio ${this.enabled?"ENABLED":"DISABLED"}`))})}_init(){if(this.ctx)return;const t=window.AudioContext||window.webkitAudioContext;t&&(this.ctx=new t,this._generateBuffers())}_generateBuffers(){const e=this.ctx.sampleRate*.3,n=this.ctx.createBuffer(1,e,this.ctx.sampleRate),i=n.getChannelData(0);for(let s=0;s<e;s++)i[s]=Math.random()*2-1;this.buffers.explosion=n}play(t){if(!this.enabled||!this.ctx)return;this.ctx.state==="suspended"&&this.ctx.resume();const e=performance.now(),n=this.lastPlayTime[t]||0,i=this.cooldowns[t]||50;if(!(e-n<i))switch(this.lastPlayTime[t]=e,t){case"SHOOT":this._playShoot();break;case"EXPLOSION":this._playExplosion();break;case"HIT":this._playHit();break;case"POWERUP":this._playPowerup();break;case"BOOST":this._playBoost();break}}_playShoot(){const t=this.ctx.createOscillator(),e=this.ctx.createGain();t.type="square",t.frequency.setValueAtTime(800,this.ctx.currentTime),t.frequency.exponentialRampToValueAtTime(100,this.ctx.currentTime+.1),e.gain.setValueAtTime(this.volume*.5,this.ctx.currentTime),e.gain.exponentialRampToValueAtTime(.01,this.ctx.currentTime+.1),t.connect(e),e.connect(this.ctx.destination),t.start(),t.stop(this.ctx.currentTime+.1)}_playExplosion(){if(!this.buffers.explosion)return;const t=this.ctx.createBufferSource();t.buffer=this.buffers.explosion;const e=this.ctx.createBiquadFilter();e.type="lowpass",e.frequency.setValueAtTime(1e3,this.ctx.currentTime),e.frequency.linearRampToValueAtTime(100,this.ctx.currentTime+.3);const n=this.ctx.createGain();n.gain.setValueAtTime(this.volume,this.ctx.currentTime),n.gain.exponentialRampToValueAtTime(.01,this.ctx.currentTime+.3),t.connect(e),e.connect(n),n.connect(this.ctx.destination),t.start()}_playHit(){const t=this.ctx.createOscillator(),e=this.ctx.createGain();t.type="sawtooth",t.frequency.setValueAtTime(200,this.ctx.currentTime),t.frequency.exponentialRampToValueAtTime(50,this.ctx.currentTime+.1),e.gain.setValueAtTime(this.volume*.8,this.ctx.currentTime),e.gain.exponentialRampToValueAtTime(.01,this.ctx.currentTime+.1),t.connect(e),e.connect(this.ctx.destination),t.start(),t.stop(this.ctx.currentTime+.1)}_playPowerup(){const t=this.ctx.createOscillator(),e=this.ctx.createGain();t.type="sine",t.frequency.setValueAtTime(400,this.ctx.currentTime),t.frequency.linearRampToValueAtTime(1200,this.ctx.currentTime+.2),e.gain.setValueAtTime(this.volume*.6,this.ctx.currentTime),e.gain.linearRampToValueAtTime(.01,this.ctx.currentTime+.2),t.connect(e),e.connect(this.ctx.destination),t.start(),t.stop(this.ctx.currentTime+.2)}_playBoost(){const t=this.ctx.createOscillator(),e=this.ctx.createGain();t.type="triangle",t.frequency.setValueAtTime(100,this.ctx.currentTime),t.frequency.linearRampToValueAtTime(300,this.ctx.currentTime+.3),e.gain.setValueAtTime(this.volume*.4,this.ctx.currentTime),e.gain.linearRampToValueAtTime(.01,this.ctx.currentTime+.3),t.connect(e),e.connect(this.ctx.destination),t.start(),t.stop(this.ctx.currentTime+.3)}}class Fl{constructor(t,e){this.container=document.getElementById(t),this.playerIndex=e,this.horizon=this.container.querySelector(".hud-horizon"),this.pitchLadder=this.container.querySelector(".hud-pitch-ladder"),this.centerCrosshair=this.container.querySelector(".hud-center-crosshair"),this.bankLine=this.container.querySelector(".hud-bank-line"),this.bankAngle=this.container.querySelector(".hud-bank-angle"),this.speedValue=this.container.querySelector("#"+(e===0?"p1":"p2")+"-hud-speed"),this.altValue=this.container.querySelector("#"+(e===0?"p1":"p2")+"-hud-alt"),this.headingValue=this.container.querySelector("#"+(e===0?"p1":"p2")+"-hud-heading"),this.lockReticle=this.container.querySelector(".hud-lock-reticle"),this.lockDist=this.lockReticle.querySelector(".lock-dist"),this.speedScale=this.container.querySelector("#"+(e===0?"p1":"p2")+"-hud-speed-scale"),this.altScale=this.container.querySelector("#"+(e===0?"p1":"p2")+"-hud-alt-scale"),this.headingScale=this.container.querySelector("#"+(e===0?"p1":"p2")+"-hud-heading-scale"),this._createPitchLadder(),this._createTapeScales(),this.visible=!1,this._vec=new b,this._euler=new kn}_createPitchLadder(){for(let t=-18;t<=18;t++){if(t===0)continue;const e=t*5,n=document.createElement("div");n.className="pitch-line",n.dataset.deg=e,n.style.top=`${-e*8}px`,n.style.width=`${120-Math.abs(e)*.5}px`,e<0&&(n.style.borderTopStyle="dashed"),this.pitchLadder.appendChild(n)}}_createTapeScales(){this._fillScale(this.speedScale,0,100,10,"px",20),this._fillScale(this.altScale,0,200,10,"px",20);const t=["N","NE","E","SE","S","SW","W","NW"];for(let e=0;e<=360;e+=15){const n=document.createElement("div");if(n.style.position="absolute",n.style.left=`${e*4}px`,n.style.height=e%90===0?"10px":"5px",n.style.borderLeft="1px solid #0f0",n.style.bottom="0",e%45===0){const i=document.createElement("div");i.textContent=t[e/45%8],i.style.position="absolute",i.style.left="-10px",i.style.top="-15px",i.style.fontSize="10px",n.appendChild(i)}this.headingScale.appendChild(n)}}_fillScale(t,e,n,i,s,a){for(let o=e;o<=n;o+=i){const l=document.createElement("div");if(l.style.position="absolute",l.style.top=`${-(o*(a/i))}px`,l.style.right="0",l.style.width="8px",l.style.borderTop="1px solid #0f0",o%(i*2)===0){const c=document.createElement("div");c.textContent=o,c.style.position="absolute",c.style.right="12px",c.style.top="-6px",c.style.fontSize="9px",l.appendChild(c)}t.appendChild(l)}}setVisibility(t){this.visible!==t&&(this.visible=t,t?this.container.classList.remove("hidden"):this.container.classList.add("hidden"))}update(t,e,n){if(!t||!t.alive){this.setVisibility(!1);return}if(D.CAMERA.MODES[t.cameraMode]!=="FIRST_PERSON"){this.setVisibility(!1);return}this.setVisibility(!0),this._euler.setFromQuaternion(t.quaternion,"YXZ");const s=zn.radToDeg(this._euler.x),a=zn.radToDeg(this._euler.y),o=zn.radToDeg(this._euler.z),l=!!D.GAMEPLAY.PLANAR_MODE;if(this.horizon.style.transform="translate(-50%, -50%)",this.pitchLadder.style.transform=`translate(-50%, -50%) translateY(${s*8}px)`,this.bankLine&&(this.bankLine.style.transform=`translate(-50%, -50%) rotate(${o}deg)`),this.bankAngle){const g=Math.round(o),_=g>0?"+":"";this.bankAngle.textContent=`${_}${g}°`}this.centerCrosshair&&this.centerCrosshair.classList.toggle("hidden",l);const c=Math.round(t.speed*10),h=Math.round(t.position.y);this.speedValue.textContent=c,this.altValue.textContent=h,this.speedScale.style.transform=`translateY(0) translateY(${c*2}px)`,this.altScale.style.transform=`translateY(0) translateY(${h*2}px)`;let d=-a;d<0&&(d+=360),d=d%360;const u=Math.round(d);this.headingValue.textContent=u.toString().padStart(3,"0"),this.headingScale.style.transform=`translateX(-50%) translateX(${-d*4}px)`;const f=n.getLockOnTarget(t.index);if(f&&f.alive){this.lockReticle.classList.remove("hidden");const g=Math.round(t.position.distanceTo(f.position));this.lockDist.textContent=g+"m";const _=n.renderer.cameras[t.index];if(_){this._vec.copy(f.position),this._vec.project(_);const m=(this._vec.x*.5+.5)*this.container.clientWidth,p=(-(this._vec.y*.5)+.5)*this.container.clientHeight;this._vec.z<1?(this.lockReticle.style.left=`${m}px`,this.lockReticle.style.top=`${p}px`):this.lockReticle.classList.add("hidden")}}else this.lockReticle.classList.add("hidden")}}const Ti=800,wi=900,Ks=120,Nn=16;function Rg(){return{roundId:0,duration:0,winnerIndex:-1,winnerIsBot:!1,botCount:0,humanCount:0,botSurvivalAverage:0,selfCollisions:0,stuckEvents:0,bounceWallEvents:0,bounceTrailEvents:0,itemUseEvents:0,stuckPerMinute:0}}function Pg(){return{rounds:0,totalDuration:0,totalBotLives:0,totalBotSurvival:0,totalSelfCollisions:0,totalStuckEvents:0,totalBounceWallEvents:0,totalBounceTrailEvents:0,totalItemUseEvents:0,botWins:0}}class Cg{constructor(){this.events=new Array(Ti);for(let t=0;t<Ti;t++)this.events[t]={time:0,type:"",player:-1,data:""};this.eventIndex=0,this.eventCount=0,this.snapshots=new Array(wi);for(let t=0;t<wi;t++)this.snapshots[t]={time:0,players:[]};this.snapshotIndex=0,this.snapshotCount=0,this.roundSummaries=new Array(Ks);for(let t=0;t<Ks;t++)this.roundSummaries[t]=Rg();this.roundSummaryIndex=0,this.roundSummaryCount=0,this._roundIdCounter=0,this.playerSpawnTime=new Float32Array(Nn),this.playerDeathTime=new Float32Array(Nn),this.playerIsBot=new Uint8Array(Nn),this.playerSeen=new Uint8Array(Nn),this._frameCounter=0,this._snapshotInterval=10,this.roundStartTime=0,this._enabled=!0,this._aggregate=Pg(),this._baselines=new Map,this._lastRoundSummary=null,this._resetRoundState()}_resetRoundState(){this._roundSelfCollisions=0,this._roundStuckEvents=0,this._roundBounceWallEvents=0,this._roundBounceTrailEvents=0,this._roundItemUseEvents=0;for(let t=0;t<Nn;t++)this.playerSpawnTime[t]=-1,this.playerDeathTime[t]=-1,this.playerIsBot[t]=0,this.playerSeen[t]=0}_elapsedSeconds(){return this.roundStartTime>0?(performance.now()-this.roundStartTime)/1e3:0}_trackPlayer(t,e=!1){if(!t||t.index<0||t.index>=Nn)return;const n=t.index;this.playerSeen[n]=1,this.playerIsBot[n]=t.isBot?1:0,this.playerSpawnTime[n]<0&&(this.playerSpawnTime[n]=this._elapsedSeconds()),e&&(this.playerDeathTime[n]=-1)}startRound(t=[]){if(this.eventIndex=0,this.eventCount=0,this.snapshotIndex=0,this.snapshotCount=0,this._frameCounter=0,this.roundStartTime=performance.now(),this._resetRoundState(),this._lastRoundSummary=null,Array.isArray(t))for(let e=0;e<t.length;e++)this._trackPlayer(t[e],!0)}logEvent(t,e,n=""){if(!this._enabled)return;const i=this.events[this.eventIndex];i.time=this._elapsedSeconds(),i.type=t,i.player=e,i.data=n,this.eventIndex=(this.eventIndex+1)%Ti,this.eventCount<Ti&&this.eventCount++,t==="STUCK"&&this._roundStuckEvents++,t==="BOUNCE_WALL"&&this._roundBounceWallEvents++,t==="BOUNCE_TRAIL"&&this._roundBounceTrailEvents++,t==="ITEM_USE"&&this._roundItemUseEvents++}markPlayerSpawn(t){this._enabled&&this._trackPlayer(t,!0)}markPlayerDeath(t,e=""){if(!this._enabled||!t||t.index<0||t.index>=Nn)return;const n=t.index;this.playerSpawnTime[n]<0&&(this.playerSpawnTime[n]=0),this.playerDeathTime[n]<0&&(this.playerDeathTime[n]=this._elapsedSeconds()),e==="TRAIL_SELF"&&this._roundSelfCollisions++}finalizeRound(t,e=[]){if(!this._enabled)return null;const n=Math.max(0,this._elapsedSeconds());let i=0,s=0,a=0;if(Array.isArray(e))for(let l=0;l<e.length;l++){const c=e[l];if(!c||c.index<0||c.index>=Nn)continue;this._trackPlayer(c,!1);const h=c.index;this.playerDeathTime[h]<0&&(this.playerDeathTime[h]=n);const d=this.playerSpawnTime[h]>=0?this.playerSpawnTime[h]:0,u=Math.max(0,this.playerDeathTime[h]-d);c.isBot?(i++,a+=u):s++}const o=this.roundSummaries[this.roundSummaryIndex];return this._roundIdCounter++,o.roundId=this._roundIdCounter,o.duration=n,o.winnerIndex=t?t.index:-1,o.winnerIsBot=!!(t!=null&&t.isBot),o.botCount=i,o.humanCount=s,o.botSurvivalAverage=i>0?a/i:0,o.selfCollisions=this._roundSelfCollisions,o.stuckEvents=this._roundStuckEvents,o.bounceWallEvents=this._roundBounceWallEvents,o.bounceTrailEvents=this._roundBounceTrailEvents,o.itemUseEvents=this._roundItemUseEvents,o.stuckPerMinute=n>0?this._roundStuckEvents/(n/60):0,this.roundSummaryIndex=(this.roundSummaryIndex+1)%Ks,this.roundSummaryCount<Ks&&this.roundSummaryCount++,this._aggregate.rounds+=1,this._aggregate.totalDuration+=n,this._aggregate.totalBotLives+=i,this._aggregate.totalBotSurvival+=a,this._aggregate.totalSelfCollisions+=this._roundSelfCollisions,this._aggregate.totalStuckEvents+=this._roundStuckEvents,this._aggregate.totalBounceWallEvents+=this._roundBounceWallEvents,this._aggregate.totalBounceTrailEvents+=this._roundBounceTrailEvents,this._aggregate.totalItemUseEvents+=this._roundItemUseEvents,t!=null&&t.isBot&&(this._aggregate.botWins+=1),this._lastRoundSummary={roundId:o.roundId,duration:o.duration,winnerIndex:o.winnerIndex,winnerIsBot:o.winnerIsBot,botCount:o.botCount,humanCount:o.humanCount,botSurvivalAverage:o.botSurvivalAverage,selfCollisions:o.selfCollisions,stuckEvents:o.stuckEvents,bounceWallEvents:o.bounceWallEvents,bounceTrailEvents:o.bounceTrailEvents,itemUseEvents:o.itemUseEvents,stuckPerMinute:o.stuckPerMinute},this.logEvent("ROUND_END",o.winnerIndex,`duration=${o.duration.toFixed(2)}`),this._lastRoundSummary}getLastRoundMetrics(){return this._lastRoundSummary?{...this._lastRoundSummary}:null}getAggregateMetrics(){const t=this._aggregate.rounds,e=this._aggregate.totalDuration;return{rounds:t,botWinRate:t>0?this._aggregate.botWins/t:0,averageBotSurvival:this._aggregate.totalBotLives>0?this._aggregate.totalBotSurvival/this._aggregate.totalBotLives:0,selfCollisionsPerRound:t>0?this._aggregate.totalSelfCollisions/t:0,stuckEventsPerMinute:e>0?this._aggregate.totalStuckEvents/(e/60):0,bounceWallPerRound:t>0?this._aggregate.totalBounceWallEvents/t:0,bounceTrailPerRound:t>0?this._aggregate.totalBounceTrailEvents/t:0,itemUsePerRound:t>0?this._aggregate.totalItemUseEvents/t:0}}captureBaseline(t="BASELINE"){const e=this.getAggregateMetrics();return this._baselines.set(t,e),{label:t,...e}}compareWithBaseline(t="BASELINE"){if(!this._baselines.has(t))return null;const e=this._baselines.get(t),n=this.getAggregateMetrics();return{label:t,baseline:e,current:n,delta:{botWinRate:n.botWinRate-e.botWinRate,averageBotSurvival:n.averageBotSurvival-e.averageBotSurvival,selfCollisionsPerRound:n.selfCollisionsPerRound-e.selfCollisionsPerRound,stuckEventsPerMinute:n.stuckEventsPerMinute-e.stuckEventsPerMinute,bounceWallPerRound:n.bounceWallPerRound-e.bounceWallPerRound,bounceTrailPerRound:n.bounceTrailPerRound-e.bounceTrailPerRound,itemUsePerRound:n.itemUsePerRound-e.itemUsePerRound}}}getValidationMatrix(){return[{id:"V1",mode:"1p",bots:1,mapKey:"standard",planarMode:!1,portalCount:0,rounds:10},{id:"V2",mode:"1p",bots:3,mapKey:"maze",planarMode:!1,portalCount:0,rounds:10},{id:"V3",mode:"1p",bots:3,mapKey:"complex",planarMode:!0,portalCount:4,rounds:10},{id:"V4",mode:"2p",bots:2,mapKey:"standard",planarMode:!0,portalCount:6,rounds:10}]}recordFrame(t){if(!this._enabled||(this._frameCounter++,this._frameCounter%this._snapshotInterval!==0))return;const e=this.snapshots[this.snapshotIndex];for(e.time=this._elapsedSeconds();e.players.length<t.length;)e.players.push({idx:0,alive:!1,x:0,y:0,z:0,bot:!1});for(let n=0;n<t.length;n++){const i=t[n],s=e.players[n];s.idx=i.index,s.alive=i.alive,s.x=+i.position.x.toFixed(1),s.y=+i.position.y.toFixed(1),s.z=+i.position.z.toFixed(1),s.bot=i.isBot}this.snapshotIndex=(this.snapshotIndex+1)%wi,this.snapshotCount<wi&&this.snapshotCount++}dump(){const t=[],e=this.eventCount>=Ti?this.eventIndex:0;for(let h=0;h<this.eventCount;h++){const d=(e+h)%Ti,u=this.events[d];t.push(`[${u.time.toFixed(2)}s] ${u.type} P${u.player} ${u.data}`)}const n=this.getLastRoundMetrics(),i=this.getAggregateMetrics(),s=this.compareWithBaseline("BASELINE");console.group("%cROUND LOG","color: #0af; font-size: 14px; font-weight: bold;"),console.log(`Duration: ${this._elapsedSeconds().toFixed(1)}s`),console.log(`Events: ${this.eventCount}`),console.table(t.map(h=>({log:h}))),n&&console.log("Round KPI:",n),console.log("Aggregate KPI:",i),s&&console.log("Baseline delta (BASELINE):",s.delta);const a=[],o=this.snapshotCount>=wi?this.snapshotIndex:0,l=Math.min(this.snapshotCount,20),c=Math.max(0,this.snapshotCount-l);for(let h=0;h<l;h++){const d=(o+c+h)%wi,u=this.snapshots[d],f=u.players.filter(g=>g.idx!==void 0).map(g=>`${g.bot?"Bot":"P"}${g.idx}:${g.alive?"alive":"dead"}(${g.x},${g.y},${g.z})`).join(" | ");a.push({time:u.time.toFixed(2)+"s",players:f})}return a.length>0&&(console.log("Recent positions:"),console.table(a)),console.groupEnd(),{events:t,snapshots:a,lastRound:n,aggregate:i,baselineDelta:s?s.delta:null}}}const ss=1,Zn="custom",Zr="custom_map_test",Oi=Object.freeze({width:2800,height:950,depth:2400}),Bl=[65484,16738047,6737151,16755200,4521898,16737928];function le(r,t=0){const e=Number(r);return Number.isFinite(e)?e:t}function Ue(r,t,e=.001){const n=Number(r);return!Number.isFinite(n)||n<=0?t:Math.max(e,n)}function An(r){return Array.isArray(r)?r:[]}function Lg(r){if(typeof r!="string")return;const t=r.trim();return t.length>0?t:void 0}function Wi(r,t){const e=Lg(t);return e&&(r.id=e),r}function Ig(r){const t=r&&typeof r=="object"?r:{};return{width:Ue(t.width,Oi.width,1),height:Ue(t.height,Oi.height,1),depth:Ue(t.depth,Oi.depth,1)}}function zl(r,t){const e=r&&typeof r=="object"?r:{};return Wi({x:le(e.x,t.x),y:le(e.y,t.y),z:le(e.z,t.z)},e.id)}function _o(r){const t=r&&typeof r=="object"?r:{},e=Ue(t.size,140,1),n=Ue(t.width,e*2,1),i=Ue(t.depth,e*2,1),s=Ue(t.height,e*2,1);return Wi({x:le(t.x,0),y:le(t.y,0),z:le(t.z,0),width:n,depth:i,height:s,size:Ue(t.size,Math.max(n,i,s)*.5,1),rotateY:le(t.rotateY,0)},t.id)}function Dg(r){const t=r&&typeof r=="object"?r:{};return Wi({ax:le(t.ax,0),ay:le(t.ay,0),az:le(t.az,0),bx:le(t.bx,0),by:le(t.by,0),bz:le(t.bz,0),radius:Ue(t.radius,160,1)},t.id)}function vo(r){const t=r&&typeof r=="object"?r:{};return Wi({x:le(t.x,0),y:le(t.y,0),z:le(t.z,0),radius:Ue(t.radius,80,1)},t.id)}function Ng(r){const t=r&&typeof r=="object"?r:{};return Wi({type:String(t.type||"item_crystal"),x:le(t.x,0),y:le(t.y,0),z:le(t.z,0),rotateY:le(t.rotateY,0)},t.id)}function Og(r){const t=r&&typeof r=="object"?r:{};return Wi({jetId:String(t.jetId||"jet_ship5"),x:le(t.x,0),y:le(t.y,0),z:le(t.z,0),scale:Ue(t.scale,50,.1),rotateY:le(t.rotateY,0)},t.id)}function Ug(r,t){const e=Array.isArray(r==null?void 0:r.size)?r.size:[],n=Ue(e[0],Oi.width,1),i=Ue(e[1],Oi.height,1),s=Ue(e[2],Oi.depth,1),a=[];for(const l of An(r==null?void 0:r.obstacles)){const c=Array.isArray(l==null?void 0:l.pos)?l.pos:[0,0,0],h=Array.isArray(l==null?void 0:l.size)?l.size:[2,2,2],d=_o({x:c[0],y:c[1],z:c[2],width:h[0],height:h[1],depth:h[2]});a.push(d)}const o=[];for(const l of An(r==null?void 0:r.portals))!Array.isArray(l==null?void 0:l.a)||!Array.isArray(l==null?void 0:l.b)||(o.push(vo({x:l.a[0],y:l.a[1],z:l.a[2],radius:80})),o.push(vo({x:l.b[0],y:l.b[1],z:l.b[2],radius:80})));return t.push("Legacy runtime map format detected. Converted to editor schema v1."),{schemaVersion:ss,arenaSize:{width:n,height:i,depth:s},tunnels:[],hardBlocks:a,foamBlocks:[],portals:o,items:[],aircraft:[],botSpawns:[],playerSpawn:{x:-800,y:i*.55,z:0}}}function Nc(r){if(!r||typeof r!="object")throw new Error("Map root must be an object.");const t=Ig(r.arenaSize),e={x:-800,y:t.height*.55,z:0};return{schemaVersion:ss,arenaSize:t,tunnels:An(r.tunnels).map(n=>Dg(n)),hardBlocks:An(r.hardBlocks).map(n=>_o(n)),foamBlocks:An(r.foamBlocks).map(n=>_o(n)),portals:An(r.portals).map(n=>vo(n)),items:An(r.items).map(n=>Ng(n)),aircraft:An(r.aircraft).map(n=>Og(n)),botSpawns:An(r.botSpawns).map(n=>zl(n,{x:0,y:e.y,z:0})),playerSpawn:zl(r.playerSpawn,e)}}function Fg(r){if(!r||typeof r!="object")throw new Error("Map data must be a JSON object.");const t=[],e=r.schemaVersion,i=Number.isFinite(Number(e))?Math.trunc(Number(e)):0;if(i>ss)throw new Error(`Unsupported schemaVersion ${i}. Supported: ${ss}.`);let s=r;return i<=0&&(Array.isArray(r.size)&&Array.isArray(r.obstacles)?s=Ug(r,t):(t.push("Legacy map format detected. Migrated to schema v1."),s={...r,schemaVersion:ss})),{map:Nc(s),warnings:t}}function Bg(r){if(typeof r!="string")throw new Error("Map JSON must be a string.");let t;try{t=JSON.parse(r)}catch(e){throw new Error(`Invalid JSON: ${e.message}`)}return Fg(t)}function zg(r={}){return Nc({...r})}function kg(r,t={}){const e=zg(r),i=1/Ue(t.mapScale,1,1e-4),s=[],a=[],o=c=>{a.push({pos:[c.x*i,c.y*i,c.z*i],size:[c.width*i,c.height*i,c.depth*i]})};e.hardBlocks.forEach(o),e.foamBlocks.forEach(o),e.tunnels.length>0&&s.push("Tunnels are currently ignored by the game runtime.");const l=[];for(let c=0;c<e.portals.length;c+=2){const h=e.portals[c],d=e.portals[c+1];if(!h||!d){s.push("Odd number of portal nodes found; the last portal node was ignored.");break}const u=Math.floor(c/2);l.push({a:[h.x*i,h.y*i,h.z*i],b:[d.x*i,d.y*i,d.z*i],color:Bl[u%Bl.length]})}return{map:{name:String(t.name||"Custom Map"),size:[e.arenaSize.width*i,e.arenaSize.height*i,e.arenaSize.depth*i],obstacles:a,portals:l},warnings:s,mapDocument:e}}const Jr="standard";function Gg(r){try{return window.localStorage}catch{return null}}function Vg(){var t;const r=Number((t=D==null?void 0:D.ARENA)==null?void 0:t.MAP_SCALE);return!Number.isFinite(r)||r<=0?1:r}function Hg(){if(D.MAPS[Jr])return Jr;const r=Object.keys(D.MAPS||{});return r.length>0?r[0]:Jr}function Wg(r){const t=Gg();if(!t)return{ok:!1,error:"localStorage is not available.",warnings:[]};let e=null;try{e=t.getItem(Zr)}catch(n){return{ok:!1,error:`Unable to read localStorage key "${Zr}": ${n.message}`,warnings:[]}}if(!e)return{ok:!1,error:`No custom map found in localStorage key "${Zr}".`,warnings:[]};try{const n=Bg(e),i=kg(n.map,{mapScale:Vg(),name:"Editor Playtest"});return{ok:!0,mapDocument:i.mapDocument,mapDefinition:i.map,warnings:[...n.warnings,...i.warnings]}}catch(n){return{ok:!1,error:n.message||"Unknown custom map parsing error.",warnings:[]}}}function Xg(r,t){const e=String(r||""),n=Hg();if(e!==Zn){const s=D.MAPS[e];return s?{requestedMapKey:e,effectiveMapKey:e,mapDefinition:s,warnings:[],isFallback:!1,isCustom:!1,error:null}:{requestedMapKey:e,effectiveMapKey:n,mapDefinition:D.MAPS[n],warnings:[`Unknown map key "${e}". Falling back to "${n}".`],isFallback:!0,isCustom:!1,error:`Unknown map key "${e}".`}}const i=Wg();return i.ok?{requestedMapKey:e,effectiveMapKey:Zn,mapDefinition:i.mapDefinition,mapDocument:i.mapDocument,warnings:i.warnings,isFallback:!1,isCustom:!0,error:null}:{requestedMapKey:e,effectiveMapKey:n,mapDefinition:D.MAPS[n],warnings:i.warnings,isFallback:!0,isCustom:!0,error:i.error}}class Yg{constructor(t){this.game=t,this.ui=t.ui,this.settings=t.settings,this._navButtons=t._navButtons||[],this._menuButtonByPanel=t._menuButtonByPanel||new Map,this._lastMenuTrigger=t._lastMenuTrigger||null}init(){this._setupVehicleSelects(),this._setupMenuNavigation(),this.syncAll(),this.updateContext()}_setupVehicleSelects(){const t=e=>{e&&(e.innerHTML="",oi.forEach(n=>{const i=document.createElement("option");i.value=n.id,i.textContent=n.label,e.appendChild(i)}))};t(this.ui.vehicleSelectP1),t(this.ui.vehicleSelectP2)}_setupMenuNavigation(){this._navButtons=Array.from(document.querySelectorAll(".nav-btn"));const t=Array.from(document.querySelectorAll(".submenu-panel"));this._navButtons.forEach(e=>{const n=e.dataset.submenu;n&&this._menuButtonByPanel.set(n,e),e.addEventListener("click",()=>{const i=document.getElementById(n);i&&(t.forEach(s=>s.classList.add("hidden")),this._navButtons.forEach(s=>s.classList.remove("active")),i.classList.remove("hidden"),e.classList.add("active"),this.game._activeSubmenu=n,this.updateContext())})})}showMainNav(){Array.from(document.querySelectorAll(".submenu-panel")).forEach(e=>e.classList.add("hidden")),this._navButtons.forEach(e=>e.classList.remove("active")),this.game._activeSubmenu=null,this.updateContext()}syncAll(){const t=this.game.settings,e=this.ui;e.modeButtons.forEach(s=>{s.classList.toggle("active",s.dataset.mode===t.mode)}),e.vehicleP2Container&&e.vehicleP2Container.classList.toggle("hidden",t.mode!=="2p"),e.mapSelect.value=t.mapKey,e.botSlider.value=t.numBots,e.botLabel.textContent=t.numBots,e.botDifficultySelect&&(e.botDifficultySelect.value=t.botDifficulty),e.winSlider.value=t.winsNeeded,e.winLabel.textContent=t.winsNeeded,e.autoRollToggle.checked=!!t.autoRoll,e.invertP1.checked=!!t.invertPitch.PLAYER_1,e.invertP2.checked=!!t.invertPitch.PLAYER_2,e.cockpitCamP1.checked=!!t.cockpitCamera.PLAYER_1,e.cockpitCamP2.checked=!!t.cockpitCamera.PLAYER_2,e.portalsToggle.checked=!!t.portalsEnabled;const n=t.gameplay;e.speedSlider.value=n.speed,e.speedLabel.textContent=`${n.speed} m/s`,e.turnSlider.value=n.turnSensitivity,e.turnLabel.textContent=n.turnSensitivity.toFixed(1),e.planeSizeSlider.value=n.planeScale,e.planeSizeLabel.textContent=n.planeScale.toFixed(1),e.trailWidthSlider.value=n.trailWidth,e.trailWidthLabel.textContent=n.trailWidth.toFixed(1),e.gapSizeSlider.value=n.gapSize,e.gapSizeLabel.textContent=n.gapSize.toFixed(2),e.gapFrequencySlider.value=n.gapFrequency,e.gapFrequencyLabel.textContent=(n.gapFrequency*100).toFixed(0)+"%",e.itemAmountSlider.value=n.itemAmount,e.itemAmountLabel.textContent=n.itemAmount,e.fireRateSlider.value=n.fireRate,e.fireRateLabel.textContent=n.fireRate.toFixed(2)+"s",e.lockOnSlider.value=n.lockOnAngle,e.lockOnLabel.textContent=n.lockOnAngle+"°";const i=document.getElementById("planar-mode-toggle");i&&(i.checked=!!n.planarMode),e.vehicleSelectP1&&(e.vehicleSelectP1.value=t.vehicles.PLAYER_1),e.vehicleSelectP2&&(e.vehicleSelectP2.value=t.vehicles.PLAYER_2)}updateContext(){if(!this.ui.menuContext)return;const t=this._getMenuSectionLabel(this.game._activeSubmenu),e=this.game.activeProfileName||"Ungespeichert";this.ui.menuContext.textContent=`${t} · Profil: ${e}`}_getMenuSectionLabel(t){if(!t)return"Hauptmenue";const e=this._menuButtonByPanel.get(t);return e?(e.textContent||"").trim():"Untermenue"}showToast(t,e="info"){const n=this.ui.statusToast;n&&(n.textContent=t,n.className=`status-toast toast-${e} show`,this._toastTimer&&clearTimeout(this._toastTimer),this._toastTimer=setTimeout(()=>n.classList.remove("show"),1500))}}const qg="aero-arena-3d.settings.v1",Kg=["mini-curve-fever-3d.settings.v4","mini-curve-fever-3d.settings.v3"],jg="aero-arena-3d.settings-profiles.v1";function $g(){try{return typeof localStorage<"u"?localStorage:null}catch{return null}}class Zg{constructor(t={}){this.storage=t.storage??$g(),this.sanitizeSettings=typeof t.sanitizeSettings=="function"?t.sanitizeSettings:e=>e,this.createDefaultSettings=typeof t.createDefaultSettings=="function"?t.createDefaultSettings:()=>({}),this.settingsStorageKey=t.settingsStorageKey||qg,this.settingsStorageLegacyKeys=Array.isArray(t.settingsStorageLegacyKeys)?[...t.settingsStorageLegacyKeys]:[...Kg],this.settingsProfilesStorageKey=t.settingsProfilesStorageKey||jg}loadSettings(){if(!this.storage||typeof this.storage.getItem!="function")return this.createDefaultSettings();try{const t=[this.settingsStorageKey,...this.settingsStorageLegacyKeys];for(const e of t){const n=this.storage.getItem(e);if(!n)continue;const i=JSON.parse(n);return this.sanitizeSettings(i)}}catch{}return this.createDefaultSettings()}saveSettings(t){if(!this.storage||typeof this.storage.setItem!="function")return!1;try{return this.storage.setItem(this.settingsStorageKey,JSON.stringify(t)),!0}catch{return!1}}loadProfiles(){if(!this.storage||typeof this.storage.getItem!="function")return[];try{const t=this.storage.getItem(this.settingsProfilesStorageKey);if(!t)return[];const e=JSON.parse(t);if(!Array.isArray(e))return[];const n=[],i=new Set;for(const s of e){const a=this.normalizeProfileName((s==null?void 0:s.name)||""),o=this.getProfileNameKey(a);!a||i.has(o)||(i.add(o),n.push({name:a,updatedAt:Number((s==null?void 0:s.updatedAt)||Date.now()),settings:this.sanitizeSettings((s==null?void 0:s.settings)||{})}))}return n.sort((s,a)=>a.updatedAt-s.updatedAt),n}catch{return[]}}saveProfiles(t){if(!this.storage||typeof this.storage.setItem!="function")return!1;try{return this.storage.setItem(this.settingsProfilesStorageKey,JSON.stringify(t)),!0}catch{return!1}}normalizeProfileName(t){return String(t||"").trim().replace(/\s+/g," ").slice(0,32)}getProfileNameKey(t){return this.normalizeProfileName(t).toLocaleLowerCase()}findProfileIndexByName(t,e){const n=this.getProfileNameKey(e);return!n||!Array.isArray(t)?-1:t.findIndex(i=>this.getProfileNameKey(i.name)===n)}findProfileByName(t,e){const n=this.findProfileIndexByName(t,e);return n>=0?t[n]:null}}const Qr="0.9.0",Jg="2026-02-22T18:42:02.334Z",js="MLY3H0WW";function Zt(r,t,e){return Math.min(Math.max(r,t),e)}function to(r){return JSON.parse(JSON.stringify(r))}const kl=[{label:"Pitch Hoch",key:"UP"},{label:"Pitch Runter",key:"DOWN"},{label:"Links (Gier)",key:"LEFT"},{label:"Rechts (Gier)",key:"RIGHT"},{label:"Rollen Links",key:"ROLL_LEFT"},{label:"Rollen Rechts",key:"ROLL_RIGHT"},{label:"Boost",key:"BOOST"},{label:"Schiessen",key:"SHOOT"},{label:"Item Abwerfen",key:"DROP"},{label:"Item Wechseln",key:"NEXT_ITEM"},{label:"Kamera",key:"CAMERA"}];class Qg{constructor(){this.settingsStore=new Zg({sanitizeSettings:e=>this._sanitizeSettings(e),createDefaultSettings:()=>this._createDefaultSettings()}),this.settings=this._loadSettings(),this.settingsProfiles=this._loadProfiles(),this.activeProfileName="",this.settingsDirty=!1,this.state="MENU",this.roundPause=0,this._hudTimer=0,this._adaptiveTimer=0,this._statsTimer=0,this.keyCapture=null,this.isLowQuality=!1,this._tmpAimVec=new b,this._tmpAimDir=new b,this._tmpRollEuler=new kn(0,0,0,"YXZ");const t=document.getElementById("game-canvas");this.renderer=new Z0(t),this.input=new Q0,this.audio=new bg,this.hudP1=new Fl("p1-fighter-hud",0),this.hudP2=new Fl("p2-fighter-hud",1),this.recorder=new Cg,this._applySettingsToRuntime(),this.input.setBindings(this.settings.controls),this.arena=null,this.entityManager=null,this.powerupManager=null,this.particles=new Ul(this.renderer),this.gameLoop=new J0(e=>this.update(e),()=>this.render()),this.ui={mainMenu:document.getElementById("main-menu"),hud:document.getElementById("hud"),p2Hud:document.getElementById("p2-hud"),p1Score:document.querySelector("#p1-hud .player-score"),p2Score:document.querySelector("#p2-hud .player-score"),p1Items:document.getElementById("p1-items"),p2Items:document.getElementById("p2-items"),messageOverlay:document.getElementById("message-overlay"),messageText:document.getElementById("message-text"),messageSub:document.getElementById("message-sub"),statusToast:document.getElementById("status-toast"),keybindWarning:document.getElementById("keybind-warning"),menuContext:document.getElementById("menu-context"),buildInfo:document.getElementById("build-info"),buildInfoDetail:document.getElementById("build-info-detail"),copyBuildButton:document.getElementById("btn-copy-build"),modeButtons:Array.from(document.querySelectorAll(".mode-btn")),mapSelect:document.getElementById("map-select"),botSlider:document.getElementById("bot-count"),botLabel:document.getElementById("bot-count-label"),botDifficultySelect:document.getElementById("bot-difficulty"),winSlider:document.getElementById("win-count"),winLabel:document.getElementById("win-count-label"),autoRollToggle:document.getElementById("auto-roll-toggle"),invertP1:document.getElementById("invert-p1"),invertP2:document.getElementById("invert-p2"),cockpitCamP1:document.getElementById("cockpit-cam-p1"),cockpitCamP2:document.getElementById("cockpit-cam-p2"),portalsToggle:document.getElementById("portals-toggle"),speedSlider:document.getElementById("speed-slider"),speedLabel:document.getElementById("speed-label"),turnSlider:document.getElementById("turn-slider"),turnLabel:document.getElementById("turn-label"),planeSizeSlider:document.getElementById("plane-size-slider"),planeSizeLabel:document.getElementById("plane-size-label"),trailWidthSlider:document.getElementById("trail-width-slider"),trailWidthLabel:document.getElementById("trail-width-label"),gapSizeSlider:document.getElementById("gap-size-slider"),gapSizeLabel:document.getElementById("gap-size-label"),gapFrequencySlider:document.getElementById("gap-frequency-slider"),gapFrequencyLabel:document.getElementById("gap-frequency-label"),itemAmountSlider:document.getElementById("item-amount-slider"),itemAmountLabel:document.getElementById("item-amount-label"),fireRateSlider:document.getElementById("fire-rate-slider"),fireRateLabel:document.getElementById("fire-rate-label"),lockOnSlider:document.getElementById("lockon-slider"),lockOnLabel:document.getElementById("lockon-label"),crosshairP1:document.getElementById("crosshair-p1"),crosshairP2:document.getElementById("crosshair-p2"),keybindP1:document.getElementById("keybind-p1"),keybindP2:document.getElementById("keybind-p2"),resetKeysButton:document.getElementById("btn-reset-keys"),saveKeysButton:document.getElementById("btn-save-keys"),profileNameInput:document.getElementById("profile-name"),profileSelect:document.getElementById("profile-select"),profileSaveButton:document.getElementById("btn-profile-save"),profileLoadButton:document.getElementById("btn-profile-load"),profileDeleteButton:document.getElementById("btn-profile-delete"),vehicleSelectP1:document.getElementById("vehicle-select-p1"),vehicleSelectP2:document.getElementById("vehicle-select-p2"),vehicleP2Container:document.getElementById("vehicle-p2-container"),startButton:document.getElementById("btn-start")},this._navButtons=[],this._menuButtonByPanel=new Map,this._activeSubmenu=null,this._lastMenuTrigger=null,this._buildInfoClipboardText="",this.uiManager=new Yg(this),this.uiManager.init(),this._setupMenuListeners(),this._markSettingsDirty(!1),this._renderBuildInfo(),this.gameLoop.start(),window.addEventListener("keydown",e=>this._handleKeyCapture(e),!0),this._fpsTracker={samples:[],avg:60,update(e){e>0&&this.samples.push(1/e),this.samples.length>60&&this.samples.shift(),this.avg=this.samples.length>0?this.samples.reduce((n,i)=>n+i,0)/this.samples.length:60}},window.addEventListener("keydown",e=>{if(e.code==="KeyP"&&!this.keyCapture){this.isLowQuality=!this.isLowQuality;const n=this.isLowQuality?"LOW":"HIGH";this.renderer.setQuality(n),this._showStatusToast(`Grafik: ${n==="LOW"?"Niedrig (Schnell)":"Hoch (Schön)"}`)}e.code==="KeyF"&&!this.keyCapture&&(this.stats?(this.stats.remove(),this.stats=null):(this.stats=document.createElement("div"),this.stats.style.cssText="position:fixed;top:10px;left:10px;color:#0f0;font:13px/1.5 monospace;z-index:1000;pointer-events:none;background:rgba(0,0,0,0.6);padding:8px 12px;border-radius:6px;min-width:200px;white-space:pre-wrap;",document.body.appendChild(this.stats),this._statsTimer=0))}),this._autoStartPlaytestIfRequested()}_isPlaytestLaunchRequested(){try{const t=new URLSearchParams(window.location.search),e=String(t.get("playtest")||"").toLowerCase();return e==="1"||e==="true"||e==="yes"}catch{return!1}}_autoStartPlaytestIfRequested(){this._isPlaytestLaunchRequested()&&(this.settings.mapKey=Zn,this._onSettingsChanged(),window.setTimeout(()=>{this.state==="MENU"&&this.startMatch()},0))}_formatBuildTime(){try{const t=new Date(Jg);return{short:t.toLocaleDateString(),iso:t.toISOString(),local:t.toLocaleString()}}catch{return{short:"dev",iso:"dev",local:"Build-ID: "+js}}}_showMainNav(){this.uiManager&&this.uiManager.showMainNav()}_renderBuildInfo(){const t=this._formatBuildTime(),e=`v${Qr} · Build ${js} · ${t.short}`,n=[`Version: v${Qr}`,`Build-ID: ${js}`,`Zeit (UTC): ${t.iso}`,`Zeit (lokal): ${t.local}`].join(`
`);this.ui.buildInfo&&(this.ui.buildInfo.textContent=e),this.ui.buildInfoDetail&&(this.ui.buildInfoDetail.textContent=n),this._buildInfoClipboardText=n}_copyBuildInfoToClipboard(){const t=this._buildInfoClipboardText||`v${Qr} · Build ${js}`,e=()=>{const n=document.createElement("textarea");n.value=t,n.setAttribute("readonly","readonly"),n.style.position="fixed",n.style.top="-9999px",document.body.appendChild(n),n.select();const i=document.execCommand("copy");document.body.removeChild(n),this._showStatusToast(i?"Build-Info kopiert":"Kopieren nicht moeglich",1400,i?"success":"error")};if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(()=>this._showStatusToast("Build-Info kopiert",1400,"success")).catch(()=>e());return}e()}_getMenuSectionLabel(t){if(!t)return"Hauptmenue";const e=this._menuButtonByPanel.get(t);if(e)return(e.textContent||"").replace(/\s+/g," ").trim();const n=document.querySelector(`#${t} .submenu-title`);return((n==null?void 0:n.textContent)||"Untermenue").replace(/\s+/g," ").trim()}_updateMenuContext(){var i;if(!this.ui.menuContext)return;const t=this._getMenuSectionLabel(this._activeSubmenu),e=this.activeProfileName||this._normalizeProfileName(((i=this.ui.profileNameInput)==null?void 0:i.value)||"")||"kein Profil",n=this.settingsDirty?"ungespeicherte Aenderungen":"alles gespeichert";this.ui.menuContext.textContent=`${t} · Profil: ${e} · ${n}`}_createDefaultSettings(){return{mode:"1p",mapKey:"standard",numBots:1,botDifficulty:"NORMAL",winsNeeded:5,autoRoll:!0,invertPitch:{PLAYER_1:!1,PLAYER_2:!1},cockpitCamera:{PLAYER_1:!1,PLAYER_2:!1},vehicles:{PLAYER_1:"ship5",PLAYER_2:"ship5"},portalsEnabled:!0,gameplay:{speed:18,turnSensitivity:2.2,planeScale:1,trailWidth:.6,gapSize:.3,gapFrequency:.02,itemAmount:8,fireRate:.45,lockOnAngle:15,planarMode:!1,portalCount:0,planarLevelCount:5,portalBeams:!1},controls:this._cloneDefaultControls()}}_cloneDefaultControls(){const t=to(D.KEYS);return{PLAYER_1:{...t.PLAYER_1},PLAYER_2:{...t.PLAYER_2}}}_normalizePlayerControls(t,e){const n=t||{};return{UP:n.UP||e.UP,DOWN:n.DOWN||e.DOWN,LEFT:n.LEFT||e.LEFT,RIGHT:n.RIGHT||e.RIGHT,ROLL_LEFT:n.ROLL_LEFT||e.ROLL_LEFT,ROLL_RIGHT:n.ROLL_RIGHT||e.ROLL_RIGHT,BOOST:n.BOOST||e.BOOST,SHOOT:n.SHOOT||e.SHOOT,NEXT_ITEM:n.NEXT_ITEM||e.NEXT_ITEM,DROP:n.DROP||e.DROP,CAMERA:n.CAMERA||e.CAMERA}}_sanitizeSettings(t){var a,o,l,c,h,d,u,f,g,_,m,p,x,v,y,P,A,R,N,M;const e=this._createDefaultSettings(),n=t&&typeof t=="object"?t:{},i=to(e);i.mode=n.mode==="2p"?"2p":"1p";const s=String(n.mapKey||"");return i.mapKey=s===Zn||D.MAPS[s]?s:e.mapKey,i.numBots=Zt(parseInt(n.numBots??e.numBots,10),0,8),i.botDifficulty=["EASY","NORMAL","HARD"].includes(n.botDifficulty)?n.botDifficulty:e.botDifficulty,i.winsNeeded=Zt(parseInt(n.winsNeeded??e.winsNeeded,10),1,15),i.autoRoll=typeof n.autoRoll=="boolean"?n.autoRoll:e.autoRoll,i.invertPitch.PLAYER_1=!!((a=n==null?void 0:n.invertPitch)!=null&&a.PLAYER_1),i.invertPitch.PLAYER_2=!!((o=n==null?void 0:n.invertPitch)!=null&&o.PLAYER_2),i.cockpitCamera.PLAYER_1=!!((l=n==null?void 0:n.cockpitCamera)!=null&&l.PLAYER_1),i.cockpitCamera.PLAYER_2=!!((c=n==null?void 0:n.cockpitCamera)!=null&&c.PLAYER_2),i.vehicles||(i.vehicles={PLAYER_1:"ship5",PLAYER_2:"ship5"}),i.vehicles.PLAYER_1=((h=n==null?void 0:n.vehicles)==null?void 0:h.PLAYER_1)||"ship5",i.vehicles.PLAYER_2=((d=n==null?void 0:n.vehicles)==null?void 0:d.PLAYER_2)||"ship5",i.portalsEnabled=(n==null?void 0:n.portalsEnabled)!==void 0?!!n.portalsEnabled:e.portalsEnabled,i.gameplay.speed=Zt(parseFloat(((u=n==null?void 0:n.gameplay)==null?void 0:u.speed)??e.gameplay.speed),8,40),i.gameplay.turnSensitivity=Zt(parseFloat(((f=n==null?void 0:n.gameplay)==null?void 0:f.turnSensitivity)??e.gameplay.turnSensitivity),.8,5),i.gameplay.planeScale=Zt(parseFloat(((g=n==null?void 0:n.gameplay)==null?void 0:g.planeScale)??e.gameplay.planeScale),.6,2),i.gameplay.trailWidth=Zt(parseFloat(((_=n==null?void 0:n.gameplay)==null?void 0:_.trailWidth)??e.gameplay.trailWidth),.2,2.5),i.gameplay.gapSize=Zt(parseFloat(((m=n==null?void 0:n.gameplay)==null?void 0:m.gapSize)??e.gameplay.gapSize),.05,1.5),i.gameplay.gapFrequency=Zt(parseFloat(((p=n==null?void 0:n.gameplay)==null?void 0:p.gapFrequency)??e.gameplay.gapFrequency),0,.25),i.gameplay.itemAmount=Zt(parseInt(((x=n==null?void 0:n.gameplay)==null?void 0:x.itemAmount)??e.gameplay.itemAmount,10),1,20),i.gameplay.fireRate=Zt(parseFloat(((v=n==null?void 0:n.gameplay)==null?void 0:v.fireRate)??e.gameplay.fireRate),.1,2),i.gameplay.lockOnAngle=Zt(parseInt(((y=n==null?void 0:n.gameplay)==null?void 0:y.lockOnAngle)??e.gameplay.lockOnAngle,10),5,45),i.gameplay.planarMode=!!(((P=n==null?void 0:n.gameplay)==null?void 0:P.planarMode)??e.gameplay.planarMode),i.gameplay.portalCount=Zt(parseInt(((A=n==null?void 0:n.gameplay)==null?void 0:A.portalCount)??e.gameplay.portalCount,10),0,20),i.gameplay.planarLevelCount=Zt(parseInt(((R=n==null?void 0:n.gameplay)==null?void 0:R.planarLevelCount)??e.gameplay.planarLevelCount,10),2,10),i.gameplay.portalBeams=!1,i.controls.PLAYER_1=this._normalizePlayerControls((N=n==null?void 0:n.controls)==null?void 0:N.PLAYER_1,e.controls.PLAYER_1),i.controls.PLAYER_2=this._normalizePlayerControls((M=n==null?void 0:n.controls)==null?void 0:M.PLAYER_2,e.controls.PLAYER_2),i}_loadSettings(){return this.settingsStore.loadSettings()}_saveSettings(){this.settingsStore.saveSettings(this.settings)&&this._markSettingsDirty(!1)}_loadProfiles(){return this.settingsStore.loadProfiles()}_saveProfiles(){return this.settingsStore.saveProfiles(this.settingsProfiles)}_normalizeProfileName(t){return this.settingsStore.normalizeProfileName(t)}_findProfileIndexByName(t){return this.settingsStore.findProfileIndexByName(this.settingsProfiles,t)}_findProfileByName(t){return this.settingsStore.findProfileByName(this.settingsProfiles,t)}_applySettingsToRuntime(){var t,e;this.numHumans=this.settings.mode==="2p"?2:1,this.numBots=this.settings.numBots,this.mapKey=this.settings.mapKey,this.winsNeeded=this.settings.winsNeeded,D.PLAYER.SPEED=this.settings.gameplay.speed,D.PLAYER.TURN_SPEED=this.settings.gameplay.turnSensitivity,D.PLAYER.MODEL_SCALE=this.settings.gameplay.planeScale,D.PLAYER.AUTO_ROLL=this.settings.autoRoll,this.settings.gameplay&&(D.GAMEPLAY.PLANAR_MODE=!!this.settings.gameplay.planarMode,D.GAMEPLAY.PORTAL_COUNT=this.settings.gameplay.portalCount||0,D.GAMEPLAY.PLANAR_LEVEL_COUNT=Zt(parseInt(this.settings.gameplay.planarLevelCount??5,10),2,10)),D.TRAIL.WIDTH=this.settings.gameplay.trailWidth,D.TRAIL.GAP_DURATION=this.settings.gameplay.gapSize,D.TRAIL.GAP_CHANCE=this.settings.gameplay.gapFrequency,D.POWERUP.MAX_ON_FIELD=Math.round(this.settings.gameplay.itemAmount),D.PROJECTILE.COOLDOWN=this.settings.gameplay.fireRate,this.settings.gameplay&&(D.GAMEPLAY.PORTAL_BEAMS=!1),D.BOT.ACTIVE_DIFFICULTY=this.settings.botDifficulty||D.BOT.DEFAULT_DIFFICULTY,this.arena&&this.arena.toggleBeams&&this.arena.toggleBeams(D.GAMEPLAY.PORTAL_BEAMS),this.entityManager&&this.entityManager.setBotDifficulty&&this.entityManager.setBotDifficulty(D.BOT.ACTIVE_DIFFICULTY),this.input.setBindings(this.settings.controls),D.PLAYER.VEHICLES={PLAYER_1:((t=this.settings.vehicles)==null?void 0:t.PLAYER_1)||"ship5",PLAYER_2:((e=this.settings.vehicles)==null?void 0:e.PLAYER_2)||"ship5"},D.HOMING.LOCK_ON_ANGLE=this.settings.gameplay.lockOnAngle}_setupMenuListeners(){this.ui.modeButtons.forEach(o=>{o.addEventListener("click",()=>{this.settings.mode=o.dataset.mode==="2p"?"2p":"1p",this._onSettingsChanged()})});const t=o=>{o&&(o.innerHTML="",oi.forEach(l=>{const c=document.createElement("option");c.value=l.id,c.textContent=l.label,o.appendChild(c)}))};t(this.ui.vehicleSelectP1),t(this.ui.vehicleSelectP2),this.ui.vehicleSelectP1&&this.ui.vehicleSelectP1.addEventListener("change",o=>{this.settings.vehicles.PLAYER_1=o.target.value,this._onSettingsChanged()}),this.ui.vehicleSelectP2&&this.ui.vehicleSelectP2.addEventListener("change",o=>{this.settings.vehicles.PLAYER_2=o.target.value,this._onSettingsChanged()}),this.ui.mapSelect.addEventListener("change",o=>{const l=String(o.target.value||"");this.settings.mapKey=l===Zn||D.MAPS[l]?l:"standard",this._onSettingsChanged()}),this.ui.botSlider.addEventListener("input",()=>{this.settings.numBots=Zt(parseInt(this.ui.botSlider.value,10),0,8),this._onSettingsChanged()}),this.ui.botDifficultySelect&&this.ui.botDifficultySelect.addEventListener("change",()=>{const o=String(this.ui.botDifficultySelect.value||"").toUpperCase();this.settings.botDifficulty=["EASY","NORMAL","HARD"].includes(o)?o:"NORMAL",this._onSettingsChanged()}),this.ui.winSlider.addEventListener("input",()=>{this.settings.winsNeeded=Zt(parseInt(this.ui.winSlider.value,10),1,15),this._onSettingsChanged()}),this.ui.autoRollToggle.addEventListener("change",()=>{this.settings.autoRoll=!!this.ui.autoRollToggle.checked,this._onSettingsChanged()}),this.ui.invertP1.addEventListener("change",()=>{this.settings.invertPitch.PLAYER_1=!!this.ui.invertP1.checked,this._onSettingsChanged()}),this.ui.invertP2.addEventListener("change",()=>{this.settings.invertPitch.PLAYER_2=!!this.ui.invertP2.checked,this._onSettingsChanged()}),this.ui.cockpitCamP1.addEventListener("change",()=>{this.settings.cockpitCamera.PLAYER_1=!!this.ui.cockpitCamP1.checked,this._onSettingsChanged()}),this.ui.cockpitCamP2.addEventListener("change",()=>{this.settings.cockpitCamera.PLAYER_2=!!this.ui.cockpitCamP2.checked,this._onSettingsChanged()});const e=document.getElementById("planar-mode-toggle");e&&e.addEventListener("change",o=>{this.settings.gameplay||(this.settings.gameplay={}),this.settings.gameplay.planarMode=o.target.checked,this.settings.gameplay.planarMode&&(this.settings.gameplay.portalCount||0)===0&&(this.settings.gameplay.portalCount=4,this._showStatusToast("Ebenen-Modus: 4 Portale aktiviert")),this._onSettingsChanged()}),this.ui.portalsToggle.addEventListener("change",()=>{this.settings.portalsEnabled=!!this.ui.portalsToggle.checked,this._onSettingsChanged()}),this.ui.speedSlider.addEventListener("input",()=>{this.settings.gameplay.speed=Zt(parseFloat(this.ui.speedSlider.value),8,40),this._onSettingsChanged()}),this.ui.turnSlider.addEventListener("input",()=>{this.settings.gameplay.turnSensitivity=Zt(parseFloat(this.ui.turnSlider.value),.8,5),this._onSettingsChanged()}),this.ui.planeSizeSlider.addEventListener("input",()=>{this.settings.gameplay.planeScale=Zt(parseFloat(this.ui.planeSizeSlider.value),.6,2),this._onSettingsChanged()}),this.ui.trailWidthSlider.addEventListener("input",()=>{this.settings.gameplay.trailWidth=Zt(parseFloat(this.ui.trailWidthSlider.value),.2,2.5),this._onSettingsChanged()}),this.ui.gapSizeSlider.addEventListener("input",()=>{this.settings.gameplay.gapSize=Zt(parseFloat(this.ui.gapSizeSlider.value),.05,1.5),this._onSettingsChanged()}),this.ui.gapFrequencySlider.addEventListener("input",()=>{this.settings.gameplay.gapFrequency=Zt(parseFloat(this.ui.gapFrequencySlider.value),0,.25),this._onSettingsChanged()}),this.ui.itemAmountSlider.addEventListener("input",()=>{this.settings.gameplay.itemAmount=Zt(parseInt(this.ui.itemAmountSlider.value,10),1,20),this._onSettingsChanged()}),this.ui.fireRateSlider.addEventListener("input",()=>{this.settings.gameplay.fireRate=Zt(parseFloat(this.ui.fireRateSlider.value),.1,2),this._onSettingsChanged()}),this.ui.lockOnSlider.addEventListener("input",()=>{this.settings.gameplay.lockOnAngle=Zt(parseInt(this.ui.lockOnSlider.value,10),5,45),this._onSettingsChanged()}),this.ui.keybindP1.addEventListener("click",o=>{const l=o.target.closest("button.keybind-btn");l&&this._startKeyCapture("PLAYER_1",l.dataset.action)}),this.ui.keybindP2.addEventListener("click",o=>{const l=o.target.closest("button.keybind-btn");l&&this._startKeyCapture("PLAYER_2",l.dataset.action)}),this.ui.resetKeysButton.addEventListener("click",()=>{this.settings.controls=this._cloneDefaultControls(),this._onSettingsChanged(),this._showStatusToast("✅ Standard-Tasten wiederhergestellt")}),this.ui.saveKeysButton.addEventListener("click",()=>{this._saveSettings(),this._showStatusToast("Einstellungen gespeichert")}),this.ui.startButton.addEventListener("click",()=>{this.startMatch()}),this.ui.profileSaveButton&&this.ui.profileSaveButton.addEventListener("click",()=>{var o;this._saveProfile(((o=this.ui.profileNameInput)==null?void 0:o.value)||"")}),this.ui.profileLoadButton&&this.ui.profileLoadButton.addEventListener("click",()=>{var l;const o=this._normalizeProfileName(((l=this.ui.profileSelect)==null?void 0:l.value)||"");if(!o){this._showStatusToast("Profil auswaehlen",1400,"error");return}this._loadProfile(o)}),this.ui.profileDeleteButton&&this.ui.profileDeleteButton.addEventListener("click",()=>{var l;const o=this._normalizeProfileName(((l=this.ui.profileSelect)==null?void 0:l.value)||"");if(!o){this._showStatusToast("Profil auswaehlen",1400,"error");return}this._deleteProfile(o)}),this.ui.profileSelect&&this.ui.profileSelect.addEventListener("change",()=>{const o=this._normalizeProfileName(this.ui.profileSelect.value||""),l=this._findProfileByName(o);this.activeProfileName=l?l.name:"",this.ui.profileNameInput&&(this.ui.profileNameInput.value=this.activeProfileName),this._syncProfileActionState()}),this.ui.profileNameInput&&(this.ui.profileNameInput.addEventListener("input",()=>{this._syncProfileActionState()}),this.ui.profileNameInput.addEventListener("keydown",o=>{o.key==="Enter"&&(o.preventDefault(),this._saveProfile(this.ui.profileNameInput.value||""))}));const n=document.getElementById("portal-count-slider"),i=document.getElementById("portal-count-label");n&&i&&n.addEventListener("input",o=>{const l=parseInt(o.target.value,10);i.textContent=l,this.settings.gameplay||(this.settings.gameplay={}),this.settings.gameplay.portalCount=l,this._onSettingsChanged()});const s=document.getElementById("planar-level-count-slider"),a=document.getElementById("planar-level-count-label");s&&a&&s.addEventListener("input",o=>{const l=Zt(parseInt(o.target.value,10),2,10);a.textContent=l,this.settings.gameplay||(this.settings.gameplay={}),this.settings.gameplay.planarLevelCount=l,this._onSettingsChanged()}),this.ui.copyBuildButton&&this.ui.copyBuildButton.addEventListener("click",()=>{this._copyBuildInfoToClipboard()})}_onSettingsChanged(){this._markSettingsDirty(!0),this.uiManager&&(this.uiManager.syncAll(),this.uiManager.updateContext()),this._renderKeybindEditor(),this._syncProfileControls(),this._updateSaveButtonState()}_markSettingsDirty(t){this.settingsDirty=!!t,this._updateSaveButtonState()}_updateSaveButtonState(){var t;(t=this.ui)!=null&&t.saveKeysButton&&(this.ui.saveKeysButton.classList.toggle("unsaved",this.settingsDirty),this.ui.saveKeysButton.textContent=this.settingsDirty?"💾 Einstellungen explizit speichern *":"💾 Einstellungen explizit speichern",this._updateMenuContext())}_syncProfileControls(){var a;if(!this.ui.profileSelect)return;const t=this._normalizeProfileName(this.activeProfileName||this.ui.profileSelect.value||""),e=[...this.settingsProfiles].sort((o,l)=>l.updatedAt-o.updatedAt);this.ui.profileSelect.innerHTML="";const n=document.createElement("option");n.value="",n.textContent="Kein Profil gewaehlt",this.ui.profileSelect.appendChild(n);for(const o of e){const l=document.createElement("option");l.value=o.name,l.textContent=o.name,this.ui.profileSelect.appendChild(l)}const i=this._findProfileByName(t),s=i?i.name:"";this.activeProfileName=s,this.ui.profileSelect.value=s,this.ui.profileNameInput&&!((a=document.activeElement)!=null&&a.isSameNode(this.ui.profileNameInput))&&(this.ui.profileNameInput.value=s),this._syncProfileActionState()}_syncProfileActionState(){var a,o;const t=this._findProfileByName(((a=this.ui.profileSelect)==null?void 0:a.value)||this.activeProfileName||""),e=this._normalizeProfileName(((o=this.ui.profileNameInput)==null?void 0:o.value)||""),n=this._findProfileIndexByName(e),i=this._findProfileIndexByName(this.activeProfileName),s=e&&n>=0&&n===i;this.ui.profileLoadButton&&(this.ui.profileLoadButton.disabled=!t),this.ui.profileDeleteButton&&(this.ui.profileDeleteButton.disabled=!t),this.ui.profileSaveButton&&(this.ui.profileSaveButton.disabled=!e,e?s?this.ui.profileSaveButton.textContent="Aktives Profil aktualisieren":n>=0?this.ui.profileSaveButton.textContent="Name bereits vergeben":this.ui.profileSaveButton.textContent="Neues Profil speichern":this.ui.profileSaveButton.textContent="Profil unter Namen speichern"),this._updateMenuContext()}_saveProfile(t){const e=this._normalizeProfileName(t);if(!e)return this._showStatusToast("Profilname fehlt",1400,"error"),!1;const n=this._findProfileIndexByName(e),i=this._findProfileIndexByName(this.activeProfileName),s=n>=0&&n===i;if(n>=0&&!s)return this._showStatusToast("Name existiert bereits",1500,"error"),!1;const a=n>=0,o={name:e,updatedAt:Date.now(),settings:to(this.settings)};n>=0?this.settingsProfiles[n]=o:this.settingsProfiles.push(o),this.activeProfileName=e;const l=this._saveProfiles();return this._syncProfileControls(),l?(this._showStatusToast(a?`Profil aktualisiert: ${e}`:`Profil gespeichert: ${e}`,1500,"success"),!0):(this._showStatusToast("Profil konnte nicht gespeichert werden",1700,"error"),!1)}_loadProfile(t){const e=this._normalizeProfileName(t),n=this._findProfileByName(e);return n?(this.settings=this._sanitizeSettings(n.settings),this.activeProfileName=n.name,this._onSettingsChanged(),this._markSettingsDirty(!1),this._showStatusToast(`Profil geladen: ${n.name}`,1400,"success"),!0):(this._showStatusToast("Profil nicht gefunden",1500,"error"),!1)}_deleteProfile(t){const e=this._normalizeProfileName(t),n=this._findProfileIndexByName(e);if(n<0)return this._showStatusToast("Profil nicht gefunden",1500,"error"),!1;const i=this.settingsProfiles[n].name;this.settingsProfiles.splice(n,1),this._findProfileIndexByName(this.activeProfileName)<0&&(this.activeProfileName="");const s=this._saveProfiles();return this._syncProfileControls(),s?(this._showStatusToast(`Profil geloescht: ${i}`,1400,"success"),!0):(this._showStatusToast("Profil konnte nicht geloescht werden",1700,"error"),!1)}_renderKeybindEditor(){const t=this._collectKeyConflicts();this._renderKeybindRows("PLAYER_1",this.ui.keybindP1,t),this._renderKeybindRows("PLAYER_2",this.ui.keybindP2,t),this._updateKeyConflictWarning(t)}_renderKeybindRows(t,e,n){e.innerHTML="";for(const i of kl){const s=document.createElement("div");s.className="key-row";const a=document.createElement("div");a.className="key-action",a.textContent=i.label;const o=this._getControlValue(t,i.key),l=document.createElement("button");l.type="button",l.className="keybind-btn",l.dataset.action=i.key;const c=!!o&&(n.get(o)||0)>1;l.textContent=this._formatKeyCode(o)+(c?"  (Konflikt)":""),c&&(s.classList.add("conflict"),l.classList.add("conflict")),this.keyCapture&&this.keyCapture.playerKey===t&&this.keyCapture.actionKey===i.key&&(l.classList.add("listening"),l.textContent="Taste druecken..."),s.appendChild(a),s.appendChild(l),e.appendChild(s)}}_startKeyCapture(t,e){this.keyCapture={playerKey:t,actionKey:e},this._renderKeybindEditor()}_handleKeyCapture(t){if(!(!this.keyCapture||this.ui.mainMenu.classList.contains("hidden"))){if(t.preventDefault(),t.stopPropagation(),t.code==="Escape"){this.keyCapture=null,this._renderKeybindEditor();return}this._setControlValue(this.keyCapture.playerKey,this.keyCapture.actionKey,t.code),this.keyCapture=null,this._onSettingsChanged(),this._showStatusToast("✅ Taste gespeichert!")}}_getControlValue(t,e){return this.settings.controls[t][e]||""}_setControlValue(t,e,n){this.settings.controls[t][e]=n}_collectKeyConflicts(){const t=new Map;for(const e of["PLAYER_1","PLAYER_2"])for(const n of kl){const i=this._getControlValue(e,n.key);i&&t.set(i,(t.get(i)||0)+1)}return t}_updateKeyConflictWarning(t){const e=Array.from(t.entries()).filter(([,n])=>n>1).map(([n])=>this._formatKeyCode(n));if(e.length===0){this.ui.keybindWarning.classList.add("hidden"),this.ui.keybindWarning.textContent="";return}this.ui.keybindWarning.classList.remove("hidden"),this.ui.keybindWarning.textContent=`Achtung: Mehrfachbelegte Tasten: ${e.join(", ")}`}_formatKeyCode(t){if(!t)return"-";const e={ArrowUp:"Arrow Up",ArrowDown:"Arrow Down",ArrowLeft:"Arrow Left",ArrowRight:"Arrow Right",ShiftLeft:"Shift Left",ShiftRight:"Shift Right",Space:"Space",Enter:"Enter",Escape:"Escape",ControlLeft:"Ctrl Left",ControlRight:"Ctrl Right",AltLeft:"Alt Left",AltRight:"Alt Right"};return e[t]?e[t]:t.startsWith("Key")?t.slice(3):t.startsWith("Digit")?t.slice(5):t.startsWith("Numpad")?`Num ${t.slice(6)}`:t}_showStatusToast(t,e=1200,n="info"){if(!this.ui.statusToast)return;const i=n==="success"||n==="error"?n:"info";this.ui.statusToast.textContent=t,this.ui.statusToast.classList.remove("hidden","show","toast-info","toast-success","toast-error"),this.ui.statusToast.classList.add(`toast-${i}`),this.ui.statusToast.offsetWidth,this.ui.statusToast.classList.add("show"),this.toastTimeout&&clearTimeout(this.toastTimeout),this.toastTimeout=setTimeout(()=>{this.ui.statusToast.classList.remove("show"),this.ui.statusToast.classList.add("hidden")},e)}_showPlayerFeedback(t,e){if(!t)return;const n=t.isBot?`Bot ${t.index+1}`:`P${t.index+1}`;this._showStatusToast(`${n}: ${e}`)}_getDeathMessage(t){const e={WALL:"Kollision mit der Wand!",TRAIL_SELF:"Eigener Schweif getroffen!",TRAIL_OTHER:"Gegnerischer Schweif getroffen!",PROJECTILE:"Abgeschossen!",OUT_OF_BOUNDS:"Arena verlassen!",UNKNOWN:"Unbekannte Todesursache"};return e[t]||e.UNKNOWN}_syncP2HudVisibility(){this.ui.p2Hud.classList.toggle("hidden",this.numHumans!==2)}startMatch(){var e;this.keyCapture=null,this._applySettingsToRuntime(),this.ui.mainMenu.classList.add("hidden"),this.ui.hud.classList.remove("hidden"),this.ui.messageOverlay.classList.add("hidden"),this.ui.statusToast.classList.add("hidden"),this.renderer.setSplitScreen(this.numHumans===2),this._syncP2HudVisibility(),this.entityManager&&this.entityManager.dispose(),this.powerupManager&&this.powerupManager.dispose(),(e=this.particles)!=null&&e.dispose&&(this.particles.dispose(),this.particles=null),this.renderer.clearMatchScene(),this.particles=new Ul(this.renderer),this.arena=new tg(this.renderer),this.arena.portalsEnabled=this.settings.portalsEnabled;const t=Xg(this.mapKey);t.isCustom&&t.mapDefinition&&(D.MAPS[Zn]=t.mapDefinition),this.mapKey=t.effectiveMapKey,this.arena.build(this.mapKey),t.error&&console.warn("[Game] Map loading fallback:",t.error),Array.isArray(t.warnings)&&t.warnings.length>0&&console.warn("[Game] Map loading warnings:",t.warnings),t.isFallback&&t.requestedMapKey===Zn?this._showStatusToast("Custom-Map ungueltig, Standard-Map geladen",2600,"error"):t.isFallback&&this._showStatusToast(`Map-Fallback aktiv: ${t.effectiveMapKey}`,2200,"error"),this.powerupManager=new wg(this.renderer,this.arena),this.entityManager=new Tg(this.renderer,this.arena,this.powerupManager,this.particles,this.audio,this.recorder),this.numHumans=this.settings.mode==="2p"?2:1,this.numBots=this.settings.numBots,this.winsNeeded=this.settings.winsNeeded||5,this.entityManager.setup(this.numHumans,this.numBots,{modelScale:this.settings.gameplay.planeScale,botDifficulty:this.settings.botDifficulty||"NORMAL",humanConfigs:[{invertPitch:this.settings.invertPitch.PLAYER_1,cockpitCamera:this.settings.cockpitCamera.PLAYER_1,vehicleId:this.settings.vehicles.PLAYER_1},{invertPitch:this.settings.invertPitch.PLAYER_2,cockpitCamera:this.settings.cockpitCamera.PLAYER_2,vehicleId:this.settings.vehicles.PLAYER_2}]}),this.entityManager.onPlayerFeedback=(n,i)=>{this._showPlayerFeedback(n,i)};for(let n=0;n<this.numHumans;n++)this.renderer.createCamera(n);for(const n of this.entityManager.players)n.score=0;this.entityManager.onPlayerDied=(n,i)=>{if(!n.isBot){const s=this._getDeathMessage(i);this._showStatusToast(s,2500,"error")}},this.entityManager.onRoundEnd=n=>{this._onRoundEnd(n)},this._startRound()}_startRound(){this.state="PLAYING",this._hudTimer=0,this.ui.crosshairP1&&(this.ui.crosshairP1.style.display="none"),this.ui.crosshairP2&&(this.ui.crosshairP2.style.display="none"),this.roundPause=0;for(const t of this.entityManager.players)t.trail.clear();this.powerupManager.clear(),this.recorder.startRound(this.entityManager.players),this.entityManager.spawnAll();for(const t of this.entityManager.getHumanPlayers())t.planarAimOffset=0;this.gameLoop.setTimeScale(1),this.ui.messageOverlay.classList.add("hidden"),this.ui.statusToast.classList.add("hidden"),this._updateHUD()}_onRoundEnd(t){this.state="ROUND_END",this.roundPause=3,console.log("--- ROUND END ---");try{const a=this.recorder.finalizeRound(t,this.entityManager.players);a&&console.log("[Recorder] Round KPI:",a),this.recorder.dump()}catch(a){console.error("Recorder Dump Failed:",a)}t&&t.score++,this._updateHUD();const e=parseInt(this.numBots)||0,n=this.entityManager.getHumanPlayers().length>1||e>0,i=Math.max(1,parseInt(this.winsNeeded,10)||1),s=n?this.entityManager.players.find(a=>a.score>=i):null;if(s){this.state="MATCH_END";const a=s.isBot?`Bot ${s.index+1}`:`Spieler ${s.index+1}`;this.ui.messageText.textContent=`Sieg: ${a} (Score: ${s.score})`,this.ui.messageSub.textContent="ENTER fuer neues Match oder ESC fuer Menue",this.ui.messageOverlay.classList.remove("hidden")}else if(t){const a=t.isBot?`Bot ${t.index+1}`:`Spieler ${t.index+1}`;this.ui.messageText.textContent=`${a} gewinnt die Runde`,this.ui.messageSub.textContent="Naechste Runde in 3...",this.ui.messageOverlay.classList.remove("hidden")}else this.ui.messageText.textContent="Unentschieden",this.ui.messageSub.textContent="Naechste Runde in 3...",this.ui.messageOverlay.classList.remove("hidden")}_updateHUD(){const t=this.entityManager.getHumanPlayers();if(t.length>0){const e=String(t[0].score);this.ui.p1Score.textContent!==e&&(this.ui.p1Score.textContent=e),this._updateItemBar(this.ui.p1Items,t[0])}if(t.length>1){const e=String(t[1].score);this.ui.p2Score.textContent!==e&&(this.ui.p2Score.textContent=e),this._updateItemBar(this.ui.p2Items,t[1])}}_updateItemBar(t,e){this._ensureItemSlots(t);for(let n=0;n<D.POWERUP.MAX_INVENTORY;n++){const i=t.children[n],s=n<e.inventory.length?e.inventory[n]:"";if(i.dataset.type!==s)if(i.dataset.type=s,s){const a=D.POWERUP.TYPES[s];i.textContent=a.icon,i.classList.add("active"),i.style.borderColor="#"+a.color.toString(16).padStart(6,"0")}else i.textContent="",i.classList.remove("active"),i.style.borderColor=""}}_ensureItemSlots(t){const e=D.POWERUP.MAX_INVENTORY;for(;t.children.length<e;){const n=document.createElement("div");n.className="item-slot",n.dataset.type="",t.appendChild(n)}for(;t.children.length>e;)t.removeChild(t.lastChild)}_getPlanarAimAxis(t){const e=this.settings.controls,n=e.PLAYER_1,i=e.PLAYER_2;let s=!1,a=!1;if(this.numHumans===1&&t===0)s=this.input.isDown(n.UP)||this.input.isDown(i.UP),a=this.input.isDown(n.DOWN)||this.input.isDown(i.DOWN);else{const o=t===0?n:i;s=this.input.isDown(o.UP),a=this.input.isDown(o.DOWN)}return(a?1:0)-(s?1:0)}_updatePlanarAimAssist(t){if(!this.entityManager)return;const e=D.GAMEPLAY.PLANAR_AIM_INPUT_SPEED,n=!!D.GAMEPLAY.PLANAR_MODE;for(const i of this.entityManager.getHumanPlayers()){const s=n?this._getPlanarAimAxis(i.index):0;let a=i.planarAimOffset||0;if(s!==0)a+=s*e*t;else{const o=1-Math.exp(-.6*t);a+=(0-a)*o}i.planarAimOffset=Zt(a,-1,1)}}_updateCrosshairPosition(t,e){if(!t||!t.alive||!e){e&&(e.style.display="none");return}const n=this.renderer.cameras[t.index];if(!n){e.style.display="none";return}e.style.display="block";const i=window.innerWidth,s=window.innerHeight,a=this.numHumans===2,o=a?i*.5:i,l=a?t.index===0?0:o:0;t.getAimDirection(this._tmpAimDir),this._tmpAimVec.copy(t.position).addScaledVector(this._tmpAimDir,80).project(n);const c=Zt(this._tmpAimVec.x,-1.05,1.05),h=Zt(this._tmpAimVec.y,-1.05,1.05),d=l+(c*.5+.5)*o,u=(-(h*.5)+.5)*s;this._tmpRollEuler.setFromQuaternion(t.quaternion,"YXZ");const f=zn.radToDeg(this._tmpRollEuler.z);e.style.left=`${d}px`,e.style.top=`${u}px`,e.style.transform=`translate(-50%, -50%) rotate(${f.toFixed(2)}deg)`}_updateCrosshairs(){if(!this.entityManager)return;const t=this.entityManager.players[0],e=this.entityManager.players[1],n=!!D.GAMEPLAY.PLANAR_MODE,i=s=>s?n?!0:(D.CAMERA.MODES[s.cameraMode]||"THIRD_PERSON")!=="FIRST_PERSON":!1;this.ui.crosshairP1&&(i(t)?this._updateCrosshairPosition(t,this.ui.crosshairP1):this.ui.crosshairP1.style.display="none"),this.ui.crosshairP2&&(this.numHumans===2?i(e)?this._updateCrosshairPosition(e,this.ui.crosshairP2):this.ui.crosshairP2.style.display="none":this.ui.crosshairP2.style.display="none")}update(t){if(this._fpsTracker.update(t),this.state==="PLAYING"&&this.entityManager&&this.recorder.recordFrame(this.entityManager.players),this.stats&&(this._statsTimer=(this._statsTimer||0)+t,this._statsTimer>=.25)){this._statsTimer=0;const e=this.renderer.renderer.info,n=Math.round(this._fpsTracker.avg),i=e.render.calls||0,s=e.render.triangles||0,a=e.memory.geometries||0,o=e.memory.textures||0,l=this.entityManager?this.entityManager.players.filter(h=>h.alive).length:0,c=this.isLowQuality?"LOW":"HIGH";this.stats.innerHTML=`<b style="color:${n<30?"#f44":n<50?"#fa0":"#0f0"}">FPS: ${n}</b>
Draw Calls: ${i}
Dreiecke: ${(s/1e3).toFixed(1)}k
Geometrien: ${a}
Texturen: ${o}
Spieler: ${l}
Qualität: ${c}`}if(this._adaptiveTimer=(this._adaptiveTimer||0)+t,this._adaptiveTimer>=3&&(this._adaptiveTimer=0,this._fpsTracker.avg<30&&!this.isLowQuality&&this.state==="PLAYING"&&(this.isLowQuality=!0,this.renderer.setQuality("LOW"),this._showStatusToast("⚡ Grafik automatisch reduziert"))),this.state==="PLAYING"){if(this.input.wasPressed("Escape")){this._returnToMenu();return}this._updatePlanarAimAssist(t),this.entityManager.update(t,this.input),this.powerupManager.update(t),this.particles.update(t),this.arena.update(t),this.entityManager.updateCameras(t),this._updateCrosshairs(),this._hudTimer+=t,this._hudTimer>=.2&&(this._hudTimer=0,this._updateHUD());const e=this.entityManager.players[0];if(e&&this.hudP1.update(e,t,this.entityManager),this.ui.crosshairP1&&(this.entityManager.getLockOnTarget(0)?this.ui.crosshairP1.classList.add("locked"):this.ui.crosshairP1.classList.remove("locked")),this.ui.crosshairP2&&this.numHumans===2){this.entityManager.getLockOnTarget(1)?this.ui.crosshairP2.classList.add("locked"):this.ui.crosshairP2.classList.remove("locked");const i=this.entityManager.players[1];i&&this.hudP2.update(i,t,this.entityManager)}else this.hudP2.setVisibility(!1);this.gameLoop.setTimeScale(1);for(const n of this.entityManager.players)for(const i of n.activeEffects)i.type==="SLOW_TIME"&&this.gameLoop.setTimeScale(D.POWERUP.TYPES.SLOW_TIME.timeScale)}else if(this.state==="ROUND_END"){if(this.input.wasPressed("Escape")){this._returnToMenu();return}this.input.wasPressed("Enter")&&(this.roundPause=0),this.roundPause-=t;const e=Math.ceil(this.roundPause);e>0&&(this.ui.messageSub.textContent=`Naechste Runde in ${e}...`),this.entityManager.updateCameras(t),this.roundPause<=0&&this._startRound()}else this.state==="MATCH_END"&&(this.input.wasPressed("Enter")?this.startMatch():this.input.wasPressed("Escape")&&this._returnToMenu(),this.entityManager.updateCameras(t))}render(){this.renderer.render()}_returnToMenu(){var t;this.state="MENU",this.entityManager&&this.entityManager.dispose(),this.powerupManager&&this.powerupManager.dispose(),(t=this.particles)!=null&&t.dispose&&(this.particles.dispose(),this.particles=null),this.renderer.clearMatchScene(),this.arena=null,this.entityManager=null,this.powerupManager=null,this.ui.mainMenu.classList.remove("hidden"),this._showMainNav(),this.ui.hud.classList.add("hidden"),this.ui.messageOverlay.classList.add("hidden"),this.ui.statusToast.classList.add("hidden"),this.ui.crosshairP1&&(this.ui.crosshairP1.style.display="none",this.ui.crosshairP1.style.left="50%",this.ui.crosshairP1.style.top="50%",this.ui.crosshairP1.style.transform="translate(-50%, -50%) rotate(0deg)"),this.ui.crosshairP2&&(this.ui.crosshairP2.style.display="none",this.ui.crosshairP2.style.left="50%",this.ui.crosshairP2.style.top="50%",this.ui.crosshairP2.style.transform="translate(-50%, -50%) rotate(0deg)"),this.uiManager.syncAll()}_showDebugLog(t){}captureBotBaseline(t="BASELINE"){const e=String(t||"BASELINE").toUpperCase(),n=this.recorder.captureBaseline(e);return this._showStatusToast(`Bot-Baseline gespeichert: ${e}`),console.log(`[Recorder] Baseline gespeichert (${e}):`,n),n}printBotValidationReport(t="BASELINE"){const e=String(t||"BASELINE").toUpperCase(),n=this.recorder.getAggregateMetrics(),i=this.recorder.compareWithBaseline(e),s=this.recorder.getValidationMatrix(),a={label:e,aggregate:n,comparison:i,matrix:s};return console.log("[Recorder] Validation report:",a),a}getBotValidationMatrix(){return this.recorder.getValidationMatrix()}printBotTestProtocol(){const t=this.getBotValidationMatrix(),e={steps:["1) applyBotValidationScenario(0) und 10 Runden spielen.",'2) captureBotBaseline("BASELINE") ausfuehren.',"3) Weitere Szenarien aus der Matrix durchspielen.",'4) printBotValidationReport("BASELINE") fuer KPI-Vergleich ausfuehren.'],matrix:t};return console.log("[Recorder] Bot-Testprotokoll:",e),e}applyBotValidationScenario(t=0){const e=this.getBotValidationMatrix();if(!e||e.length===0)return null;let n=null;return typeof t=="number"?n=e[Math.max(0,Math.min(e.length-1,t))]:n=e.find(i=>i.id===t)||e[0],n?(this.settings.mode=n.mode==="2p"?"2p":"1p",this.settings.numBots=n.bots,this.settings.mapKey=n.mapKey,this.settings.gameplay.planarMode=!!n.planarMode,this.settings.gameplay.portalCount=n.portalCount,this.settings.portalsEnabled=n.portalCount>0||this.settings.portalsEnabled,this.settings.winsNeeded=Math.max(1,this.settings.winsNeeded),this._onSettingsChanged(),this._showStatusToast(`Szenario ${n.id} geladen`),console.log("[Recorder] Validation scenario loaded:",n),n):null}}window.onerror=function(r,t,e,n,i){const s=document.createElement("div");return s.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(50,0,0,0.9);color:#fff;padding:20px;z-index:99999;font-family:monospace;overflow:auto;",s.innerHTML=`<h1>CRITICAL ERROR</h1><p>${r}</p><p>${t}:${e}:${n}</p><pre>${i?i.stack:"No stack trace"}</pre>`,document.body.appendChild(s),!1};window.addEventListener("DOMContentLoaded",()=>{try{console.log("DOM ready, initializing Game...");const r=new Qg;window.GAME_INSTANCE=r}catch(r){console.error("Fatal Game Init Error:",r);const t=document.createElement("div");t.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(50,0,0,0.9);color:#fff;padding:20px;z-index:99999;font-family:monospace;overflow:auto;",t.innerHTML=`<h1>INIT ERROR</h1><p>${r.message}</p><pre>${r.stack}</pre>`,document.body.appendChild(t)}});
