const express=require("express");
const http=require("http");
const WebSocket=require("ws");
const fs=require("fs");
const path=require("path");
const crypto=require("crypto");
const multer=require("multer");
const mammoth=require("mammoth");
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024}});

const ROOT=__dirname, DATA=path.join(ROOT,"data"), DB=path.join(DATA,"database.json");
if(!fs.existsSync(DATA)) fs.mkdirSync(DATA,{recursive:true});

const defaults=[{"id": "q1", "topic": "Molyar massa", "q": "H₂O ning nisbiy molekulyar massasi nechaga teng?", "options": ["16", "18", "20", "22"], "answer": 1, "difficulty": "Oson", "points": 100}, {"id": "q2", "topic": "Bog‘lanish", "q": "NaCl qanday kimyoviy bog‘lanishga ega?", "options": ["Ion", "Kovalent qutbsiz", "Metall", "Vodorod"], "answer": 0, "difficulty": "Oson", "points": 100}, {"id": "q3", "topic": "Molyar massa", "q": "H₂SO₄ ning molyar massasi qancha?", "options": ["96 g/mol", "98 g/mol", "100 g/mol", "102 g/mol"], "answer": 1, "difficulty": "O‘rta", "points": 100}, {"id": "q4", "topic": "Oksidlanish darajasi", "q": "O₂ molekulasida kislorodning oksidlanish darajasi nechaga teng?", "options": ["+2", "−2", "0", "+1"], "answer": 2, "difficulty": "Oson", "points": 100}, {"id": "q5", "topic": "Mol", "q": "1 mol modda taxminan nechta zarrachadan iborat?", "options": ["6.02×10²³", "3.01×10²³", "9.81×10²³", "1.00×10²³"], "answer": 0, "difficulty": "Oson", "points": 100}, {"id": "q6", "topic": "pH", "q": "pH = 7 bo‘lgan eritma qanday muhitga ega?", "options": ["Kislotali", "Neytral", "Ishqoriy", "Faqat tuzli"], "answer": 1, "difficulty": "Oson", "points": 100}, {"id": "q7", "topic": "Oksidlar", "q": "CO₂ ning nomi qaysi?", "options": ["Uglerod(II) oksid", "Uglerod(IV) oksid", "Karbonat kislota", "Kalsiy oksid"], "answer": 1, "difficulty": "Oson", "points": 100}, {"id": "q8", "topic": "Organik kimyo", "q": "Alkanlarning umumiy formulasi?", "options": ["CₙH₂ₙ", "CₙH₂ₙ₋₂", "CₙH₂ₙ₊₂", "CₙHₙ"], "answer": 2, "difficulty": "O‘rta", "points": 100}, {"id": "q9", "topic": "Noorganik kimyo", "q": "NaOH qanday modda?", "options": ["Kislota", "Asos", "Tuz", "Oksid"], "answer": 1, "difficulty": "Oson", "points": 100}, {"id": "q10", "topic": "Redoks", "q": "Elektron berish jarayoni nima deyiladi?", "options": ["Qaytarilish", "Oksidlanish", "Neytrallanish", "Gidroliz"], "answer": 1, "difficulty": "O‘rta", "points": 100}];
function uid(p){return p+"_"+crypto.randomBytes(5).toString("hex")}
function save(){fs.writeFileSync(DB,JSON.stringify(db,null,2),"utf8")}
function load(){
 try{return JSON.parse(fs.readFileSync(DB,"utf8"))}
 catch(e){
  const d={settings:{title:"CHEMISTRY RACE",school:"Kimyo fani",defaultTime:20,speedBonus:5,streakBonus:25},questions:defaults,history:[]};
  fs.writeFileSync(DB,JSON.stringify(d,null,2),"utf8"); return d;
 }
}
let db=load();
const game={id:null,title:"CHEMISTRY RACE",running:false,question:null,questionNo:0,total:0,timeLimit:20,startedAt:0,list:[],players:new Map()};

function publicState(){
 return {game:{id:game.id,title:game.title,running:game.running,
 question:game.question?{q:game.question.q,options:game.question.options}:null,
 questionNo:game.questionNo,total:game.total,timeLimit:game.timeLimit,startedAt:game.startedAt},
 players:[...game.players.values()].sort((a,b)=>b.score-a.score).map((s,i)=>({...s,rank:i+1})),settings:db.settings};
}
function broadcast(){const m=JSON.stringify({type:"state",data:publicState()});wss.clients.forEach(c=>c.readyState===1&&c.send(m))}
function send(ws,type,data){if(ws.readyState===1)ws.send(JSON.stringify({type,data}))}

const app=express(),server=http.createServer(app),wss=new WebSocket.Server({server});
app.use(express.json({limit:"5mb"}));app.use(express.static(path.join(ROOT,"public")));

wss.on("connection",ws=>{
 send(ws,"state",publicState());
 ws.on("message",raw=>{
  try{
   const m=JSON.parse(raw);
   if(m.type==="join"){
    if(m.gameId && game.id && String(m.gameId)!==String(game.id)) { send(ws,"joinError",{message:"Bu o‘yin havolasi eskirgan. O‘qituvchidan yangi QR/havola oling."}); return; }
    const name=String(m.name||"O‘quvchi").trim().slice(0,40); if(!name)return;
    const id=uid("p"); game.players.set(id,{id,name,score:0,correct:0,wrong:0,answered:false,answerTime:null,streak:0});
    ws.playerId=id; send(ws,"joined",{id,name}); broadcast();
   }
   if(m.type==="answer"&&ws.playerId){
    const s=game.players.get(ws.playerId); if(!s||!game.running||s.answered)return;
    s.answered=true;
    const elapsed=Math.max(0,(Date.now()-game.startedAt)/1000); s.answerTime=elapsed;
    const q=game.question;
    if(q&&Number(m.answer)===q.answer){
      s.correct++;s.streak++;
      const speed=Math.max(0,Math.round((game.timeLimit-elapsed)*db.settings.speedBonus));
      const streak=s.streak>=3?db.settings.streakBonus:0;
      s.score+=Number(q.points||100)+speed+streak;
    }else{s.wrong++;s.streak=0}
    broadcast();
   }
  }catch(e){}
 });
 ws.on("close",()=>{if(ws.playerId){game.players.delete(ws.playerId);broadcast()}})
});

app.get("/api/state",(req,res)=>res.json(publicState()));
app.get("/api/health",(req,res)=>res.json({ok:true,service:"Chemistry Race",time:new Date().toISOString()}));
app.get("/join",(req,res)=>res.sendFile(path.join(ROOT,"public","student.html")));
app.get("/api/share",(req,res)=>{
  if(!game.id) return res.status(400).json({error:"Avval YANGI O‘YIN yarating."});
  const configured=String(process.env.PUBLIC_URL||"").trim().replace(/\/$/,"");
  const origin=configured || (req.headers["x-forwarded-proto"]?String(req.headers["x-forwarded-proto"]).split(",")[0]+"://":"https://") + req.get("host");
  const studentUrl=origin+"/join?game="+encodeURIComponent(game.id);
  res.json({ok:true,url:origin,studentUrl,gameId:game.id});
});
app.get("/api/join-info",(req,res)=>res.json({gameId:game.id,active:!!game.id,title:game.title}));
app.get("/api/questions",(req,res)=>res.json(db.questions));
app.post("/api/questions",(req,res)=>{
 const {id,topic,q,options,answer,difficulty,points}=req.body;
 if(!q||!Array.isArray(options)||options.length!==4||!options.every(x=>String(x).trim())||![0,1,2,3].includes(Number(answer)))
  return res.status(400).json({error:"Savol va 4 ta javobni to‘liq kiriting."});
 const item={id:id||uid("q"),topic:String(topic||"Umumiy"),q:String(q),options:options.map(String),answer:Number(answer),
 difficulty:String(difficulty||"O‘rta"),points:Number(points)||100};
 const i=db.questions.findIndex(x=>x.id===item.id); if(i>=0)db.questions[i]=item;else db.questions.push(item);save();
 res.json({ok:true,item});
});
app.delete("/api/questions/:id",(req,res)=>{db.questions=db.questions.filter(x=>x.id!==req.params.id);save();res.json({ok:true})});

app.post("/api/questions/import-file",upload.single("file"),async(req,res)=>{
 try{
  if(!req.file)return res.status(400).json({error:"Fayl tanlanmagan."});
  const ext=path.extname(req.file.originalname).toLowerCase();
  let text="";
  if(ext===".docx"){
    const result=await mammoth.extractRawText({buffer:req.file.buffer});
    text=result.value;
  }else if(ext===".txt"||ext===".csv"||ext===".rtf"){
    text=req.file.buffer.toString("utf8");
    text=text.replace(/\\[a-z]+\d* ?/gi," ").replace(/[{}]/g,"");
  }else{
    return res.status(400).json({error:"Hozircha DOCX, TXT, CSV yoki RTF fayllari qo‘llanadi."});
  }

  // Supported question patterns:
  // 1) Savol matni? / A) ... / B) ... / C) ... / D) ... / Javob: B
  // 2) One question per block separated by blank lines.
  const blocks=text.replace(/\\r/g,"").split(/\\n\\s*\\n+/).map(x=>x.trim()).filter(Boolean);
  let parsed=[];
  for(const block of blocks){
    const lines=block.split("\\n").map(x=>x.trim()).filter(Boolean);
    if(lines.length<5) continue;
    let qline=lines[0].replace(/^\\d+[.)]\\s*/,"").trim();
    let opts=[null,null,null,null], answer=null, topic="Import qilingan";
    for(const line of lines.slice(1)){
      let m=line.match(/^([ABCD])\\s*[).:-]\\s*(.+)$/i);
      if(m) opts["ABCD".indexOf(m[1].toUpperCase())]=m[2].trim();
      let a=line.match(/^(?:javob|to['’`]?g['’`]?ri\\s*javob|answer)\\s*[:=-]\\s*([ABCD])\\b/i);
      if(a) answer="ABCD".indexOf(a[1].toUpperCase());
      let t=line.match(/^(?:mavzu|topic)\\s*[:=-]\\s*(.+)$/i);
      if(t) topic=t[1].trim();
    }
    if(qline && opts.every(Boolean) && answer!==null){
      parsed.push({id:uid("q"),topic,q:qline,options:opts,answer,difficulty:"O‘rta",points:100});
    }
  }
  if(!parsed.length)return res.status(400).json({error:"Savollar topilmadi. README dagi formatdan foydalaning."});
  db.questions.push(...parsed);save();
  res.json({ok:true,count:parsed.length});
 }catch(e){res.status(500).json({error:"Faylni o‘qishda xatolik: "+e.message})}
});

app.get("/api/questions/export",(req,res)=>{res.type("json");res.setHeader("Content-Disposition","attachment; filename=chemistry_questions.json");res.send(JSON.stringify(db.questions,null,2))});
app.post("/api/questions/import",(req,res)=>{
 if(!Array.isArray(req.body.questions))return res.status(400).json({error:"JSON formati noto‘g‘ri"});
 let n=0;
 for(const x of req.body.questions){
  if(x.q&&Array.isArray(x.options)&&x.options.length===4&&[0,1,2,3].includes(Number(x.answer))){
   db.questions.push({id:uid("q"),topic:String(x.topic||"Umumiy"),q:String(x.q),options:x.options.map(String),answer:Number(x.answer),difficulty:String(x.difficulty||"O‘rta"),points:Number(x.points)||100});n++;
  }
 }
 save();res.json({ok:true,count:n});
});

app.post("/api/game/start",(req,res)=>{
 const ids=Array.isArray(req.body.questionIds)?req.body.questionIds:[];
 const list=ids.length?ids.map(id=>db.questions.find(q=>q.id===id)).filter(Boolean):db.questions.slice();
 if(!list.length)return res.status(400).json({error:"Savollar bazasi bo‘sh."});
 game.id=uid("game");game.title=String(req.body.title||db.settings.title);game.list=list;
 game.questionNo=0;game.total=list.length;game.timeLimit=Math.max(5,Math.min(180,Number(req.body.timeLimit)||20));
 game.running=false;game.question=null;game.players.clear();game.startedAt=0;broadcast();res.json({ok:true,total:list.length});
});
app.post("/api/game/next",(req,res)=>{
 if(!game.list.length)return res.status(400).json({error:"Avval yangi o‘yin yarating."});
 if(game.questionNo>=game.list.length){finishGame();return res.json({done:true})}
 game.question=game.list[game.questionNo++];game.running=true;game.startedAt=Date.now();
 game.players.forEach(s=>{s.answered=false;s.answerTime=null});broadcast();res.json({ok:true});
});
app.post("/api/game/stop",(req,res)=>{game.running=false;broadcast();res.json({ok:true})});
app.post("/api/game/clear-players",(req,res)=>{game.players.clear();broadcast();res.json({ok:true})});
app.post("/api/game/reset",(req,res)=>{game.running=false;game.question=null;game.questionNo=0;game.total=0;game.list=[];game.players.clear();broadcast();res.json({ok:true})});

app.post("/api/settings",(req,res)=>{
 db.settings={...db.settings,...req.body};db.settings.defaultTime=Math.max(5,Math.min(180,Number(db.settings.defaultTime)||20));
 db.settings.speedBonus=Math.max(0,Math.min(20,Number(db.settings.speedBonus)||5));
 db.settings.streakBonus=Math.max(0,Math.min(200,Number(db.settings.streakBonus)||25));save();broadcast();res.json({ok:true});
});
app.get("/api/results/export",(req,res)=>{
 let rows=["Game,Date,Student,Score,Correct,Wrong,Accuracy"];
 for(const g of db.history)for(const s of g.students)
  rows.push([g.title,g.date,s.name,s.score,s.correct,s.wrong,((s.correct/(s.correct+s.wrong||1))*100).toFixed(1)+"%"].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(","));
 res.setHeader("Content-Type","text/csv; charset=utf-8");res.setHeader("Content-Disposition","attachment; filename=chemistry_results.csv");res.send("\ufeff"+rows.join("\n"));
});
function finishGame(){
 if(game.id){
  db.history.push({id:game.id,title:game.title,date:new Date().toISOString(),students:[...game.players.values()].map(({id,...x})=>x)});
  save();
 }
 game.running=false;game.question=null;broadcast();
}
setInterval(()=>{if(game.running&&Date.now()-game.startedAt>(game.timeLimit+1)*1000){game.running=false;broadcast()}},500);
const PORT=process.env.PORT||3000;server.listen(PORT,()=>console.log("CHEMISTRY RACE PRO: http://localhost:"+PORT));
