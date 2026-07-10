
// ====== API ======
var API = 'http://127.0.0.1:8000';

// ====== State ======
var S = {
  tok:null, user:null, sid:null, sub:'数学', sess:[],
  ssid:null, isStream:false, fl:80, mood:'neutral',
  cam:{st:null, face:'user', on:false},
  tm:{m:25,s:0,im:25,run:false,pause:false,int:null,ph:'focus'}
};

// Pet state
var petMuted = false;
var petDrag = {active:false, sx:0, sy:0, ox:0, oy:0};
var lastMood = 'neutral';
var lastSpeechTime = 0;
var speechCooldown = 8000;
var petInitialized = false;

// Detection state
var detector = null;
var detectorReady = false;
var faceapiReady = false;
var detectTimer = null;
var noPersonCount = 0;
var weakPersonCount = 0;
var studyStatus = '离开';
var backendVisionFailCount = 0;
var statusVotes = [];

// ====== Init local fallback detector ======
(function initDetector() {
  if(typeof tf!=='undefined'&&typeof cocoSsd!=='undefined'){
    tf.ready().then(function(){return cocoSsd.load({base:'mobilenet_v2'});}).then(function(model){detector=model;detectorReady=true;console.log('[OWL] COCO-SSD loaded');}).catch(function(e){console.log('[OWL] COCO-SSD failed:',e);detectorReady=false;});
  }
  if(typeof faceapi!=='undefined'){faceapiReady=true;}
})();

// ====== Helpers ======
function api(path,opts) {
  var h = {'Content-Type':'application/json'};
  if(opts&&opts.headers) Object.assign(h,opts.headers);
  if(S.tok) h['Authorization'] = 'Bearer '+S.tok;
  var o = Object.assign({}, opts, {headers:h});
  return fetch(API+path, o).then(function(r){
    if(r.status===401){lo();throw new Error('expired');}
    return r;
  });
}
function se(el,msg){el.textContent=msg;el.classList.add('show');}
function sp(p){
  document.getElementById('loginPage').classList.toggle('active',p==='login');
  document.getElementById('regPage').classList.toggle('active',p==='register');
  document.getElementById('loginErr').classList.remove('show');
  document.getElementById('regErr').classList.remove('show');
}
function tp(id,btn){
  var el=document.getElementById(id);
  el.type=el.type==='password'?'text':'password';
}

// ====== Auth ======
document.getElementById('loginForm').addEventListener('submit',function(e){
  e.preventDefault();
  var btn=document.getElementById('loginBtn'),err=document.getElementById('loginErr');
  err.classList.remove('show');
  var u=document.getElementById('loginU').value.trim(),p=document.getElementById('loginP').value;
  if(!u||!p){se(err,'请填写用户名和密码');return;}
  btn.disabled=true;btn.innerHTML='<div class="spin"></div>';
  fetch(API+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})})
  .then(function(r){return r.json().then(function(d){if(!r.ok){se(err,d.detail||'登录失败');throw new Error(d.detail);}return d;});})
  .then(function(d){S.tok=d.access_token;S.user=d.user;localStorage.setItem('oa',JSON.stringify({tok:S.tok,user:S.user}));ea();})
  .catch(function(e){if(e.message==='Failed to fetch')se(err,'网络错误：无法连接后端 '+API);else if(!err.classList.contains('show'))se(err,'登录失败');})
  .finally(function(){btn.disabled=false;btn.textContent='登录';});
});

document.getElementById('regForm').addEventListener('submit',function(e){
  e.preventDefault();
  var btn=document.getElementById('regBtn'),err=document.getElementById('regErr');
  err.classList.remove('show');
  var u=document.getElementById('regU').value.trim(),em=document.getElementById('regE').value.trim();
  var p=document.getElementById('regP').value,c=document.getElementById('regC').value;
  if(!u||!em||!p){se(err,'请填写所有字段');return;}
  if(p!==c){se(err,'两次密码不一致');return;}
  if(p.length<6){se(err,'密码至少6位');return;}
  btn.disabled=true;btn.innerHTML='<div class="spin"></div>';
  fetch(API+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,email:em,password:p})})
  .then(function(r){return r.json().then(function(d){if(!r.ok){se(err,d.detail||'注册失败');throw new Error(d.detail);}return d;});})
  .then(function(d){S.tok=d.access_token;S.user=d.user;localStorage.setItem('oa',JSON.stringify({tok:S.tok,user:S.user}));ea();})
  .catch(function(e){if(e.message==='Failed to fetch')se(err,'网络错误：无法连接后端 '+API);else if(!err.classList.contains('show'))se(err,'注册失败');})
  .finally(function(){btn.disabled=false;btn.textContent='创建账号';});
});

function lo(){
  stopCam();
  S.tok=null;S.user=null;localStorage.removeItem('oa');
  document.getElementById('app').classList.remove('active');
  document.getElementById('loginPage').classList.add('active');
  document.getElementById('regPage').classList.remove('active');
  hidePet();
  if(S.tm.int)clearInterval(S.tm.int);S.tm.run=false;
}

function ea(){
  document.getElementById('loginPage').classList.remove('active');
  document.getElementById('regPage').classList.remove('active');
  document.getElementById('app').classList.add('active');
  if(S.user){
    document.getElementById('un').textContent=S.user.username;
    document.getElementById('ua').textContent=S.user.username.charAt(0).toUpperCase();
  }
  rc();ls();lr();sss();iq();
  showPet();
}

// ====== Camera ======
function tc(){
  var btn=document.getElementById('cto');
  if(S.cam.on){stopCam();return;}
  var v=document.getElementById('vf');
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){alert('浏览器不支持摄像头访问');return;}
  btn.disabled=true;btn.textContent='请求摄像头...';
  navigator.mediaDevices.getUserMedia({
    video:{facingMode:S.cam.face,width:{ideal:640},height:{ideal:480}},audio:false
  }).then(function(st){
    S.cam.st=st;S.cam.on=true;
    v.srcObject=st;
    v.play().catch(function(){});
    document.getElementById('cph').classList.add('hide');
    btn.disabled=false;btn.textContent='关闭摄像头';
    document.getElementById('cf').disabled=false;
    document.getElementById('fi').className='fi y';
    document.getElementById('fi').textContent='● 开小差';
    startDetection();
  }).catch(function(e){
    btn.disabled=false;btn.textContent='开启摄像头';
    var msg='无法访问摄像头';
    if(e.name=='NotAllowedError'||e.name=='PermissionDeniedError')msg+='\n权限被拒绝，请在浏览器地址栏左侧点击锁定图标设置';
    else if(e.name=='NotFoundError')msg+='\n未检测到摄像头设备';
    else msg+='\n'+e.message;
    alert(msg);
  });
}

function stopCam(){
  if(detectTimer){clearInterval(detectTimer);detectTimer=null;}
  if(S.cam.st){S.cam.st.getTracks().forEach(function(t){t.stop();});S.cam.st=null;}
  S.cam.on=false;
  var v=document.getElementById('vf');v.srcObject=null;
  document.getElementById('cph').classList.remove('hide');
  document.getElementById('cto').disabled=false;document.getElementById('cto').textContent='开启摄像头';
  document.getElementById('cf').disabled=true;
  document.getElementById('fi').className='fi r';document.getElementById('fi').textContent='● 离开';
  var cv=document.getElementById('fc');var ctx=cv.getContext('2d');ctx.clearRect(0,0,cv.width,cv.height);
}

function fc(){
  stopCam();
  S.cam.face=S.cam.face==='user'?'environment':'user';
  tc();
}

// ====== STUDY STATUS DETECTION (YOLOv8 face first) ======
function startDetection(){
  if(detectTimer)clearInterval(detectTimer);
  var v=document.getElementById('vf');
  var cv=document.getElementById('fc');
  noPersonCount=0;
  weakPersonCount=0;

  detectTimer=setInterval(function(){
    if(!S.cam.on||!v.videoWidth)return;
    cv.width=v.videoWidth;cv.height=v.videoHeight;
    var ctx=cv.getContext('2d');
    ctx.clearRect(0,0,cv.width,cv.height);

    detectByBackend(v,cv,ctx).catch(function(){
      backendVisionFailCount++;
      detectByLocalFallback(v,cv,ctx);
    });
  },1200);
}

function detectByBackend(v,cv,ctx){
  var snap=document.createElement('canvas');
  var maxW=416;
  var scale=Math.min(1,maxW/v.videoWidth);
  snap.width=Math.max(1,Math.round(v.videoWidth*scale));
  snap.height=Math.max(1,Math.round(v.videoHeight*scale));
  snap.getContext('2d').drawImage(v,0,0,snap.width,snap.height);
  return fetch(API+'/api/vision/detect',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({image:snap.toDataURL('image/jpeg',0.72)})
  }).then(function(r){
    if(!r.ok)throw new Error('vision http '+r.status);
    return r.json();
  }).then(function(d){
    backendVisionFailCount=0;
    drawVisionResult(ctx,d,cv);
  });
}

function detectByLocalFallback(v,cv,ctx){
  if(faceapiReady&&typeof faceapi!=='undefined'){
    try{
      faceapi.detectAllFaces(v,new faceapi.TinyFaceDetectorOptions({scoreThreshold:0.45}))
        .then(function(detections){
          var mapped=detections.map(function(d){
            var b=d.detection.box;
            return {bbox:[b.x,b.y,b.width,b.height],score:d.detection.score,source:'face-api'};
          });
          var result=analyzeLocalFaces(mapped,cv);
          drawVisionResult(ctx,result,cv);
        }).catch(function(){drawVisionResult(ctx,{status:'离开',focus_score:8,faces:[],model:'local'},cv);});
    }catch(e){drawVisionResult(ctx,{status:'离开',focus_score:8,faces:[],model:'local'},cv);}
  }else{
    ctx.drawImage(v,0,0,cv.width,cv.height);
    setStudyStatus('离开',0);
  }
}

function analyzeLocalFaces(faces,cv){
  if(!faces||!faces.length)return {status:'离开',focus_score:8,faces:[],model:'face-api',reason:'未检测到人脸'};
  faces.sort(function(a,b){return b.score*b.bbox[2]*b.bbox[3]-a.score*a.bbox[2]*a.bbox[3];});
  var f=faces[0],b=f.bbox;
  var cx=b[0]+b[2]/2,cy=b[1]+b[3]/2;
  var dx=Math.abs(cx-cv.width/2)/(cv.width/2);
  var dy=Math.abs(cy-cv.height/2)/(cv.height/2);
  var area=b[2]*b[3]/(cv.width*cv.height);
  var focus=Math.round(Math.min(100,Math.max(0,f.score*55+(1-dx)*25+Math.min(area/0.16,1)*20)));
  var status='分心';
  if(area<0.025)status='离开';
  else if(dx>0.55||dy>0.55)status='开小差';
  else if(dx<0.38&&dy<0.45&&area>=0.035&&f.score>=0.55)status='专注';
  return {status:status,focus_score:focus,faces:[f],model:'face-api'};
}

function drawVisionResult(ctx,d,cv){
  var faces=d.faces||[];
  if(faces.length){
    var f=faces[0];
    var b=f.bbox;
    var sx=cv.width/((d.frame&&d.frame.width)||cv.width);
    var sy=cv.height/((d.frame&&d.frame.height)||cv.height);
    var x=b[0]*sx,y=b[1]*sy,w=b[2]*sx,h=b[3]*sy;
    ctx.strokeStyle='#10b981';
    ctx.lineWidth=3;
    ctx.strokeRect(x,y,w,h);
    var label=(d.status||'人脸')+' '+Math.round((f.score||0)*100)+'%';
    ctx.fillStyle='#10b981';
    ctx.font='bold 14px sans-serif';
    var tw=ctx.measureText(label).width;
    ctx.fillRect(x,Math.max(0,y-28),tw+12,28);
    ctx.fillStyle='#fff';
    ctx.fillText(label,x+6,Math.max(16,y-8));
    (f.eyes||[]).slice(0,2).forEach(function(e){
      var eb=e.bbox;
      ctx.strokeStyle='#38bdf8';
      ctx.lineWidth=2;
      ctx.strokeRect(eb[0]*sx,eb[1]*sy,eb[2]*sx,eb[3]*sy);
      if(e.state){
        ctx.fillStyle='#0ea5e9';
        ctx.font='bold 12px sans-serif';
        ctx.fillText(e.state,eb[0]*sx,Math.max(12,eb[1]*sy-4));
      }
    });
  }else{
    ctx.fillStyle=d.status==='开小差'?'rgba(245,158,11,0.08)':'rgba(239,68,68,0.08)';
    ctx.fillRect(0,0,cv.width,cv.height);
    ctx.fillStyle=d.status==='开小差'?'#f59e0b':'#ef4444';
    ctx.font='bold 16px sans-serif';
    ctx.textAlign='center';
    ctx.fillText(d.status||'离开',cv.width/2,cv.height/2);
    ctx.textAlign='start';
  }
  setStudyStatus(d.status||'离开',d.focus_score);
}

function isValidStudyPerson(p,cv){
  if(!p||p.class!=='person'||p.score<0.72||!p.bbox)return false;
  var b=p.bbox,w=b[2],h=b[3];
  if(w<=0||h<=0)return false;
  var area=(w*h)/(cv.width*cv.height);
  var ratio=w/h;
  // 过滤屏幕、椅背、书本等常见误检：人像通常有足够面积且偏竖向。
  if(area<0.10||area>0.85)return false;
  if(ratio<0.25||ratio>0.85)return false;
  // 画面边缘只露出一点的框不作为稳定学习状态依据。
  if(b[0]<-cv.width*0.05||b[1]<-cv.height*0.08)return false;
  if(b[0]+w>cv.width*1.05||b[1]+h>cv.height*1.08)return false;
  return true;
}

function setStudyStatus(status,score){
  statusVotes.push(status);
  if(statusVotes.length>5)statusVotes.shift();
  var counts={};
  statusVotes.forEach(function(s){counts[s]=(counts[s]||0)+1;});
  var stable=statusVotes.slice().sort(function(a,b){return (counts[b]||0)-(counts[a]||0);})[0]||status;
  // 离开必须连续出现，避免用户低头看书时被单帧误判。
  if(status==='离开'&&counts['离开']<3&&studyStatus!=='离开')stable=studyStatus;
  studyStatus=stable;
  var fi=document.getElementById('fi');
  var cls=stable==='专注'?'g':(stable==='分心'||stable==='开小差'?'y':'r');
  fi.className='fi '+cls;
  fi.textContent='● '+stable;
  var target=score;
  if(typeof target!=='number'){
    target=stable==='专注'?85:(stable==='分心'?55:(stable==='开小差'?30:8));
  }
  if(stable==='专注')target=Math.max(75,target);
  if(stable==='分心')target=Math.max(40,Math.min(60,target));
  if(stable==='开小差')target=Math.max(20,Math.min(35,target));
  if(stable==='离开')target=Math.max(5,Math.min(15,target));
  S.fl=Math.max(5,Math.min(100,target));
  updatePet();
}

function drawAndFocus(ctx,persons,cv){
  if(persons&&persons.length>0){
    noPersonCount=0;
    weakPersonCount=0;
    var maxP=persons[0];
    persons.forEach(function(p){
      var box=p.bbox;
      ctx.strokeStyle=p===maxP?'#10b981':'#f59e0b';
      ctx.lineWidth=3;
      ctx.strokeRect(box[0],box[1],box[2],box[3]);
      var label=(p===maxP?'专注':'分心')+' '+Math.round(p.score*100)+'%';
      ctx.fillStyle=p===maxP?'#10b981':'#f59e0b';
      ctx.font='bold 14px sans-serif';
      var tw=ctx.measureText(label).width;
      ctx.fillRect(box[0],box[1]-28,tw+12,28);
      ctx.fillStyle='#fff';
      ctx.fillText(label,box[0]+6,box[1]-8);
    });
    var p=maxP;
    var box=p.bbox;
    var cx=cv.width/2;
    var personCx=box[0]+box[2]/2;
    var centerDist=Math.abs(personCx-cx)/cx;
    var sizeScore=Math.min(1,(box[2]*box[3])/(cv.width*cv.height)/0.28);
    var focusScore=Math.round((p.score*0.65+(1-centerDist)*0.25+sizeScore*0.10)*100);
    if(centerDist<0.36&&p.score>=0.82){
      setStudyStatus('专注',focusScore);
    }else{
      setStudyStatus('分心',focusScore);
    }
    var pb=maxP.bbox;
    ctx.strokeStyle='rgba(16,185,129,0.3)';
    ctx.lineWidth=2;
    ctx.setLineDash([6,4]);
    ctx.strokeRect(pb[0]-4,pb[1]-4,pb[2]+8,pb[3]+8);
    ctx.setLineDash([]);
  }else{
    noPersonCount++;
    weakPersonCount++;
    if(noPersonCount>5){
      var decay=noPersonCount>10?8:5;
      setStudyStatus('离开',Math.max(5,S.fl-decay));
      ctx.fillStyle='rgba(239,68,68,0.08)';
      ctx.fillRect(0,0,cv.width,cv.height);
      ctx.fillStyle='#ef4444';
      ctx.font='bold 16px sans-serif';
      ctx.textAlign='center';
      ctx.fillText('离开',cv.width/2,cv.height/2);
      ctx.textAlign='start';
    }else{
      setStudyStatus('开小差',Math.max(20,S.fl-6));
      ctx.fillStyle='rgba(245,158,11,0.08)';
      ctx.fillRect(0,0,cv.width,cv.height);
      ctx.fillStyle='#f59e0b';
      ctx.font='bold 16px sans-serif';
      ctx.textAlign='center';
      ctx.fillText('开小差',cv.width/2,cv.height/2);
      ctx.textAlign='start';
    }
  }
}

// ====== PET SYSTEM ======
function showPet(){
  var po=document.getElementById('pet-overlay');
  po.classList.add('show');
  if(!petInitialized){
    var rp=document.querySelector('.rp');
    if(rp&&rp.offsetWidth>0){po.style.right=(rp.offsetWidth+40)+'px';}else{po.style.right='360px';}
    po.style.bottom='120px';
    petInitialized=true;
    initDrag();
  }
}

function hidePet(){
  document.getElementById('pet-overlay').classList.remove('show');
  document.getElementById('pet-overlay').classList.remove('dragging');
}

function initDrag(){
  var po=document.getElementById('pet-overlay');
  po.addEventListener('mousedown',function(e){
    if(e.target.closest('.pet-mute'))return;
    petDrag.active=true;petDrag.sx=e.clientX;petDrag.sy=e.clientY;
    var rect=po.getBoundingClientRect();petDrag.ox=rect.left;petDrag.oy=rect.top;
    po.classList.add('dragging');po.style.bottom='auto';po.style.right='auto';po.style.left=rect.left+'px';po.style.top=rect.top+'px';
    e.preventDefault();
  });
  document.addEventListener('mousemove',function(e){if(!petDrag.active)return;po.style.left=(petDrag.ox+e.clientX-petDrag.sx)+'px';po.style.top=(petDrag.oy+e.clientY-petDrag.sy)+'px';});
  document.addEventListener('mouseup',function(){if(!petDrag.active)return;petDrag.active=false;po.classList.remove('dragging');});
  po.addEventListener('touchstart',function(e){
    if(e.target.closest('.pet-mute'))return;
    var t=e.touches[0];petDrag.active=true;petDrag.sx=t.clientX;petDrag.sy=t.clientY;
    var rect=po.getBoundingClientRect();petDrag.ox=rect.left;petDrag.oy=rect.top;
    po.classList.add('dragging');po.style.bottom='auto';po.style.right='auto';po.style.left=rect.left+'px';po.style.top=rect.top+'px';
  },{passive:true});
  document.addEventListener('touchmove',function(e){if(!petDrag.active)return;var t=e.touches[0];po.style.left=(petDrag.ox+t.clientX-petDrag.sx)+'px';po.style.top=(petDrag.oy+t.clientY-petDrag.sy)+'px';},{passive:true});
  document.addEventListener('touchend',function(){if(!petDrag.active)return;petDrag.active=false;po.classList.remove('dragging');});
}

var PETS={
  celebrate:{e:'&#129433;&#127881;',t:'专注',dot:'g'},
  happy:{e:'&#129433;&#10024;',t:'专注',dot:'g'},
  neutral:{e:'&#129433;',t:'分心',dot:'y'},
  worried:{e:'&#129433;&#128560;',t:'开小差',dot:'y'},
  sleepy:{e:'&#129433;&#128164;',t:'离开',dot:'s'}
};
var MOODS=['sleepy','worried','neutral','happy','celebrate'];
var VOICES={
  celebrate:['专注'],
  happy:['专注'],
  neutral:['分心'],
  worried:['开小差'],
  sleepy:['离开']
};

function updatePet(){
  var mood;
  if(S.fl>=90) mood='celebrate';
  else if(S.fl>=70) mood='happy';
  else if(S.fl>=40) mood='neutral';
  else if(S.fl>=20) mood='worried';
  else mood='sleepy';
  S.mood=mood;

  // Sidebar pet
  var pe=document.getElementById('pe'),ps=document.getElementById('ps'),pf=document.getElementById('pf');
  if(pe)pe.innerHTML=PETS[mood].e;
  if(ps)ps.textContent=PETS[mood].t;
  if(pf)pf.style.width=S.fl+'%';

  // Floating pet
  var petEmoji=document.getElementById('petEmoji'),petBody=document.getElementById('petBody');
  var petDot=document.getElementById('petDot'),petSpeech=document.getElementById('petSpeech');
  var petSpeechText=document.getElementById('petSpeechText');
  if(petEmoji)petEmoji.innerHTML=PETS[mood].e;
  if(petBody){petBody.className='pet-body';petBody.classList.add('mood-'+mood);}
  if(petDot)petDot.className='pet-dot '+PETS[mood].dot;
  if(petSpeechText)petSpeechText.textContent=PETS[mood].t;
  if(petSpeech){
    petSpeech.classList.remove('hide');
    clearTimeout(petSpeech._hideTimer);
    petSpeech._hideTimer=setTimeout(function(){petSpeech.classList.add('hide');},4000);
  }

  if(mood!==lastMood){
    lastMood=mood;
    var now=Date.now();
    if(!petMuted&&window.speechSynthesis&&now-lastSpeechTime>speechCooldown){
      lastSpeechTime=now;
      var phrases=VOICES[mood]||VOICES.neutral;
      var phrase=phrases[Math.floor(Math.random()*phrases.length)];
      window.speechSynthesis.cancel();
      var utter=new SpeechSynthesisUtterance(phrase);
      utter.lang='zh-CN';utter.rate=1.1;utter.pitch=1.0+Math.random()*0.2;utter.volume=0.9;
      window.speechSynthesis.speak(utter);
      showSnack('🔊 '+phrase);
    }
  }
}

function showSnack(msg){
  var el=document.getElementById('pet-snack');
  el.textContent=msg;el.classList.add('show');
  clearTimeout(el._t);el._t=setTimeout(function(){el.classList.remove('show');},3000);
}

function toggleMute(){
  petMuted=!petMuted;
  document.getElementById('petMute').textContent=petMuted?'&#128263;':'&#128266;';
  showSnack(petMuted?'语音已关闭':'语音已开启');
}

// Periodic pet heartbeat
(function petHeartbeat(){
  setInterval(function(){
    if(!document.getElementById('app').classList.contains('active'))return;
    if(!S.cam.on){setStudyStatus('离开',8);}
  },5000);
})();

// Distraction tracking
var lfc=0;
setInterval(function(){
  if(!document.getElementById('app').classList.contains('active'))return;
  if(S.fl<30){lfc++;if(lfc>=3){lfc=0;if(S.ssid)api('/api/study/distraction',{method:'POST',body:JSON.stringify({session_id:S.ssid})}).catch(function(){});S.fl=Math.max(0,S.fl-10);updatePet();lr();}}else{lfc=0;}
},10000);

// ====== QR ======
function iq(){
  var url=window.location.href,inp=document.getElementById('qri');
  if(url.startsWith('file://')){
    inp.value='请用 HTTP 服务打开';
    QRCode.toCanvas(document.getElementById('qr'),'http://127.0.0.1:8080/owlstudy-app.html',{width:160,margin:1});
  }else{
    var du=url.replace('localhost','127.0.0.1').replace(/\[::\]/,'127.0.0.1');
    inp.value=du;QRCode.toCanvas(document.getElementById('qr'),du,{width:160,margin:1});
  }
}

// ====== Sessions ======
function ls(){
  api('/api/chat/sessions').then(function(r){return r.json();}).then(function(d){S.sess=d.sessions||[];rs();}).catch(function(){});
}
function rs(){
  var el=document.getElementById('sl');
  if(!S.sess.length){el.innerHTML='<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px">暂无对话</div>';return;}
  el.innerHTML=S.sess.map(function(s){
    var lm=s.messages&&s.messages.filter(function(m){return m.role==='user';}).slice(-1)[0];
    var p=lm?lm.content.slice(0,40)+(lm.content.length>40?'...':''):'空对话';
    var on=s.session_id===S.sid?' on':'';
    return '<div class="si'+on+'" onclick="lss(\''+s.session_id+'\')"><div class="sub">'+s.subject+'</div><div class="pr">'+eh(p)+'</div><button class="sd" onclick="event.stopPropagation();ds(\''+s.session_id+'\')">✕</button></div>';
  }).join('');
}
function lss(id){
  api('/api/chat/history/'+id).then(function(r){return r.json();}).then(function(d){
    S.sid=id;S.sub=d.subject;
    document.querySelectorAll('.sub-b').forEach(function(b){b.classList.toggle('on',b.dataset.s===d.subject);});
    document.getElementById('cst').textContent=d.subject;
    document.getElementById('ct').textContent='对话 · '+d.subject;
    rm(d.messages||[]);rs();
  }).catch(function(){});
}
function ds(id){
  if(!confirm('确定删除吗？'))return;
  api('/api/chat/history/'+id,{method:'DELETE'}).then(function(){if(S.sid===id)rc();ls();}).catch(function(){});
}
function nc(){rc();document.querySelectorAll('.sub-b').forEach(function(b){b.classList.toggle('on',b.dataset.s===S.sub);});cs();}
function rc(){
  S.sid=null;
  document.getElementById('ct').textContent='新对话';
  document.getElementById('cst').textContent=S.sub;
  document.getElementById('ms').innerHTML='<div class="wlc" id="wl"><div class="i">&#129433;</div><h3>你好！我是 AI 考研助手</h3><p>选择科目，开始提问</p></div>';
  rs();
}

// ====== Subject ======
document.getElementById('ss').addEventListener('click',function(e){
  var b=e.target.closest('.sub-b');if(!b)return;
  document.querySelectorAll('.sub-b').forEach(function(x){x.classList.remove('on');});
  b.classList.add('on');S.sub=b.dataset.s;
  document.getElementById('cst').textContent=S.sub;
  if(!S.sid)document.getElementById('ct').textContent='新对话';
});

// ====== Messages ======
function rm(msgs){
  var el=document.getElementById('ms'),wl=el.querySelector('.wlc');
  if(wl)wl.remove();
  el.innerHTML=msgs.map(function(m){return rm2(m);}).join('');
  renderMathInElement(el,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false});
  el.querySelectorAll('pre code').forEach(function(b){hljs.highlightElement(b);});
  el.scrollTop=el.scrollHeight;
}
function rm2(msg){
  var role=msg.role==='user'?'u':'a';
  var c=role==='u'?eh(msg.content):marked.parse(msg.content,{breaks:true});
  return '<div class="msg '+role+'"><div class="ma">'+(role==='u'?'你':'&#129302;')+'</div><div class="mb">'+c+'</div></div>';
}
function eh(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}

// ====== Send ======
function sm(){
  var inp=document.getElementById('ci'),txt=inp.value.trim();
  if(!txt||S.isStream)return;
  var el=document.getElementById('ms'),wl=el.querySelector('.wlc');
  if(wl)wl.remove();
  el.insertAdjacentHTML('beforeend','<div class="msg u"><div class="ma">你</div><div class="mb">'+eh(txt)+'</div></div>');
  el.insertAdjacentHTML('beforeend','<div class="msg a" id="ti"><div class="ma">&#129302;</div><div class="mb"><div class="ti"><span></span><span></span><span></span></div></div></div>');
  el.scrollTop=el.scrollHeight;
  inp.value='';inp.style.height='auto';
  S.isStream=true;document.getElementById('snd').disabled=true;

  fetch(API+'/api/chat/stream',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+S.tok},body:JSON.stringify({question:txt,subject:S.sub,session_id:S.sid})})
  .then(function(res){
    if(!res.ok){throw new Error('HTTP '+res.status);}
    document.getElementById('ti').remove();
    el.insertAdjacentHTML('beforeend','<div class="msg a"><div class="ma">&#129302;</div><div class="mb" id="sc"></div></div>');
    var reader=res.body.getReader(),decoder=new TextDecoder(),buf='',full='',sc=document.getElementById('sc');
    function readChunk(){reader.read().then(function(r){if(r.done)return;buf+=decoder.decode(r.value,{stream:true});
      var lines=buf.split('\n');buf=lines.pop()||'';
      for(var i=0;i<lines.length;i++){var l=lines[i];if(!l.startsWith('data: '))continue;
        try{var d=JSON.parse(l.slice(6));
          if(d.type==='text'){full+=d.content;sc.innerHTML=marked.parse(full,{breaks:true});
            try{renderMathInElement(sc,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false});}catch(e){}
            el.scrollTop=el.scrollHeight;}
          else if(d.type==='done'){S.sid=d.session_id;try{renderMathInElement(sc,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false}],throwOnError:false});}catch(e){}sc.querySelectorAll('pre code').forEach(function(b){try{hljs.highlightElement(b);}catch(e){}});ls();}
          else if(d.type==='error'){full+='\n\n**错误**: '+d.content;sc.innerHTML=marked.parse(full,{breaks:true});}
        }catch(e){}}
      readChunk();});}
    readChunk();
  })
  .catch(function(e){
    var ti=document.getElementById('ti');if(ti)ti.remove();
    el.insertAdjacentHTML('beforeend','<div class="msg a"><div class="ma">&#129302;</div><div class="mb" style="color:#dc2626">网络错误：'+e.message+'</div></div>');
  })
  .finally(function(){S.isStream=false;document.getElementById('snd').disabled=false;});
}

function hk(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sm();}
  setTimeout(function(){var el=document.getElementById('ci');el.style.height='auto';el.style.height=Math.min(el.scrollHeight,120)+'px';},0);}
document.getElementById('ci').addEventListener('input',function(){this.style.height='auto';this.style.height=Math.min(this.scrollHeight,120)+'px';});

// ====== Study ======
function sss(){api('/api/study/session/start',{method:'POST'}).then(function(r){return r.json();}).then(function(d){S.ssid=d.id;}).catch(function(){});}

function lr(){
  var today=new Date().toISOString().slice(0,10);
  api('/api/study/report?report_date='+today).then(function(r){return r.json();}).then(function(d){
    document.getElementById('rd').textContent=d.total_focus_minutes+' 分钟';
    document.getElementById('rds').textContent=d.distraction_count;
    if(d.total_focus_minutes>0){var p=Math.min(100,Math.round((1-d.distraction_count/Math.max(1,d.total_focus_minutes/5))*100));document.getElementById('rf').textContent=p+'%';S.fl=p;updatePet();}else{document.getElementById('rf').textContent='--';}
  }).catch(function(){});
}

// ====== Settings (API Key) ======
function openSettings(){
  var o=document.getElementById('settingsOverlay');o.classList.add('show');
  document.getElementById('skDeepSeekStatus').textContent='';document.getElementById('skOpenAIStatus').textContent='';
  document.getElementById('settingsMsg').className='err-msg';
  api('/api/settings/apikey/DEEPSEEK_API_KEY').then(function(r){return r.json();}).then(function(d){
    document.getElementById('skDeepSeekStatus').textContent=d.configured?'✓ 已配置':'未配置';
    document.getElementById('skDeepSeekStatus').className='settings-status'+(d.configured?' ok':' err');
  }).catch(function(){});
  api('/api/settings/apikey/OPENAI_API_KEY').then(function(r){return r.json();}).then(function(d){
    document.getElementById('skOpenAIStatus').textContent=d.configured?'✓ 已配置':'未配置';
    document.getElementById('skOpenAIStatus').className='settings-status'+(d.configured?' ok':' err');
  }).catch(function(){});
}
function closeSettings(ev){
  if(ev&&ev.target!==document.getElementById('settingsOverlay')&&ev.target.closest('#settingsModal'))return;
  document.getElementById('settingsOverlay').classList.remove('show');
}
function tpsk(id,btn){
  var el=document.getElementById(id);
  el.type=el.type==='password'?'text':'password';
}
function saveSettings(){
  var msg=document.getElementById('settingsMsg');
  msg.classList.remove('show');msg.className='err-msg';
  var ds=document.getElementById('skDeepSeek').value.trim();
  var oai=document.getElementById('skOpenAI').value.trim();
  if(!ds&&!oai){msg.textContent='请至少输入一个 API Key';msg.classList.add('show');return;}
  var promises=[];
  if(ds) promises.push(api('/api/settings/apikey',{method:'POST',body:JSON.stringify({key:'DEEPSEEK_API_KEY',value:ds})}).then(function(r){return r.json();}));
  if(oai) promises.push(api('/api/settings/apikey',{method:'POST',body:JSON.stringify({key:'OPENAI_API_KEY',value:oai})}).then(function(r){return r.json();}));
  Promise.all(promises).then(function(){
    msg.style.color='#10b981';msg.textContent='✓ 配置已保存';msg.className='err-msg show';
    openSettings();
  }).catch(function(e){
    msg.style.color='#ef4444';msg.textContent='保存失败: '+e.message;msg.className='err-msg show';
  });
}
function testApiConnection(){
  var btn=document.getElementById('stb');
  btn.disabled=true;btn.textContent='测试中...';
  var msg=document.getElementById('settingsMsg');
  msg.classList.remove('show');msg.className='err-msg';
  api('/api/chat/send',{method:'POST',body:JSON.stringify({question:'你好，这是一条测试消息，请回复"连接成功"',subject:'数学'})}).then(function(r){return r.json();}).then(function(d){
    if(d.reply){
      msg.style.color='#10b981';msg.textContent='&#10003; AI 连接成功！已收到回复';msg.className='err-msg show';
    }else{
      msg.style.color='#ef4444';msg.textContent='连接失败：未收到回复';msg.className='err-msg show';
    }
  }).catch(function(e){
    msg.style.color='#ef4444';msg.textContent='连接失败: '+e.message;msg.className='err-msg show';
  }).finally(function(){btn.disabled=false;btn.textContent='测试连接';});
}

// ====== Timer ======
function ts(){
  if(S.tm.run)return;S.tm.run=true;S.tm.pause=false;
  document.getElementById('tsb').disabled=true;document.getElementById('tpb').disabled=false;document.getElementById('tpb').textContent='暂停';
  document.getElementById('tph').textContent=S.tm.ph==='focus'?'专注中...':'休息中...';
  S.tm.int=setInterval(tick,1000);
}
function tp_(){if(!S.tm.run)return;S.tm.pause=!S.tm.pause;document.getElementById('tpb').textContent=S.tm.pause?'继续':'暂停';document.getElementById('tph').textContent=S.tm.pause?'已暂停':(S.tm.ph==='focus'?'专注中...':'休息中...');}
function tr(){
  if(S.tm.int)clearInterval(S.tm.int);S.tm.run=false;S.tm.pause=false;S.tm.ph='focus';S.tm.m=S.tm.im;S.tm.s=0;utd();
  document.getElementById('tsb').disabled=false;document.getElementById('tpb').disabled=true;document.getElementById('tpb').textContent='暂停';document.getElementById('tph').textContent='等待开始';
}
function tick(){
  if(S.tm.pause)return;
  if(S.tm.s===0){if(S.tm.m===0){if(S.tm.ph==='focus'){S.tm.ph='break';S.tm.m=5;document.getElementById('tph').textContent='休息时间！';document.getElementById('tsb').disabled=false;S.fl=Math.min(100,S.fl+10);updatePet();}else{S.tm.ph='focus';S.tm.m=S.tm.im;document.getElementById('tph').textContent='专注中...';document.getElementById('tsb').disabled=false;}S.tm.s=0;utd();return;}S.tm.m--;S.tm.s=59;}else{S.tm.s--;}utd();}
function utd(){document.getElementById('td').textContent=(S.tm.m<10?'0':'')+S.tm.m+':'+(S.tm.s<10?'0':'')+S.tm.s;}

// ====== Mobile ======
function os(){document.getElementById('sb').classList.add('m','open');document.getElementById('so').classList.add('on');}
function cs(){document.getElementById('sb').classList.remove('open');document.getElementById('so').classList.remove('on');}

// ====== Init ======
marked.setOptions({breaks:true,gfm:true});

(function init(){
  if(window.location.protocol==='file:'){
    document.getElementById('proto-warn').classList.add('show');
  }
  var saved=localStorage.getItem('oa');
  if(saved){try{var d=JSON.parse(saved);S.tok=d.tok;S.user=d.user;
    fetch(API+'/api/auth/me',{headers:{'Authorization':'Bearer '+S.tok}}).then(function(r){if(r.ok){ea();return;}localStorage.removeItem('oa');document.getElementById('loginPage').classList.add('active');}).catch(function(){document.getElementById('loginPage').classList.add('active');});
  }catch(e){localStorage.removeItem('oa');document.getElementById('loginPage').classList.add('active');}
  }else{
    document.getElementById('loginPage').classList.add('active');
  }
})();

document.addEventListener('keydown',function(e){if(e.ctrlKey&&e.key==='Enter'){var inp=document.getElementById('ci');if(inp&&document.getElementById('app').classList.contains('active'))sm();}});
