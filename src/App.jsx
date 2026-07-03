import { useState, useEffect, useRef, useCallback, memo } from "react";

// ── STORAGE ──
const LOCAL_KEY = "75hard_v2";
function loadData(){try{const r=localStorage.getItem(LOCAL_KEY);return r?JSON.parse(r):null;}catch(e){return null;}}
function fileToBase64(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});}
function compressImage(file,maxW=900,quality=0.72){return new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>{const img=new Image();img.onload=()=>{const scale=Math.min(1,maxW/Math.max(img.width,img.height));const w=Math.round(img.width*scale),h=Math.round(img.height*scale);const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;canvas.getContext("2d").drawImage(img,0,0,w,h);res(canvas.toDataURL("image/jpeg",quality));};img.onerror=rej;img.src=e.target.result;};r.onerror=rej;r.readAsDataURL(file);});}
function checkBingoRows(card){const rows=[];for(let r=0;r<5;r++){if(card.slice(r*5,(r+1)*5).every(c=>c.done))rows.push(r);}return rows;}
function getInitialDay(habits){return{habits:habits.reduce((a,h)=>({...a,[h.id]:false}),{}),journal:"",journalCanvas:"",trading:"",mood:"",restDay:false,photos:[]};}

// ── CONSTANTS ──
const DEFAULT_HABITS=[
  {id:1,label:"45 min workout",icon:"🏋️‍♀️",daysPerWeek:7},
  {id:2,label:"Read 10 pages",icon:"📖",daysPerWeek:7},
  {id:3,label:"No alcohol",icon:"🚫🍷",daysPerWeek:7},
  {id:4,label:"Drink 1 gallon water",icon:"💧",daysPerWeek:7},
  {id:5,label:"Follow my diet",icon:"🥗",daysPerWeek:7},
  {id:6,label:"Cold shower",icon:"🧊",daysPerWeek:7},
  {id:7,label:"Skincare routine",icon:"✨",daysPerWeek:7},
];
const DEFAULT_MISSION="I am becoming the most disciplined, powerful version of myself. Every single day I choose growth over comfort, clarity over chaos, and strength over excuses. This is my era. 💫";
const PRESETS=[
  {name:"Girly Pink 🌸",accent:"#ec4899",secondary:"#c084fc",bg:"#0d0010"},
  {name:"Rose Gold 🌹",accent:"#f43f5e",secondary:"#fb923c",bg:"#120008"},
  {name:"Ocean Dream 🌊",accent:"#38bdf8",secondary:"#818cf8",bg:"#020c1b"},
  {name:"Sage Green 🌿",accent:"#4ade80",secondary:"#a3e635",bg:"#051205"},
  {name:"Sunset ☀️",accent:"#fb923c",secondary:"#f472b6",bg:"#100500"},
  {name:"Lavender ☁️",accent:"#a78bfa",secondary:"#e879f9",bg:"#07030f"},
  {name:"Clean White 🤍",accent:"#ec4899",secondary:"#8b5cf6",bg:"#fafafa"},
  {name:"Blush 🩷",accent:"#f472b6",secondary:"#fb7185",bg:"#fff0f5"},
];
const MOODS=[
  {emoji:"🔥",label:"Crushed it"},{emoji:"💪",label:"Strong"},
  {emoji:"🌸",label:"Good day"},{emoji:"😊",label:"Happy"},
  {emoji:"😐",label:"Okay"},{emoji:"😴",label:"Tired"},
  {emoji:"😤",label:"Pushed"},{emoji:"💔",label:"Tough day"},
];
const DEFAULT_STATE={
  mission:DEFAULT_MISSION,habits:DEFAULT_HABITS,dayData:{},
  totalDays:75,startDate:new Date().toISOString().split("T")[0],
  accent:"#ec4899",secondary:"#c084fc",bgColor:"#0d0010",
  affirmations:[],weeklyIntentions:{},goals:[],
  bingoCard:Array.from({length:25},()=>({text:"",done:false})),
  wishlist:[],visionBoard:[],
  progressPhotos:{before:[],after:[],beforeAnswers:{},afterAnswers:{}},
  photoQuestions:["How do you feel right now?","What is your main goal?","Current weight/measurements?","What are you most proud of?","What will you change?"],
  dailyPhotos:{},
  challengeArchives:[],
};

// ── COLOR UTILS ──
function hexToHsl(hex){
  let r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b);let h,s,l=(max+min)/2;
  if(max===min){h=s=0;}else{const d=max-min;s=l>0.5?d/(2-max-min):d/(max+min);
    switch(max){case r:h=((g-b)/d+(g<b?6:0))/6;break;case g:h=((b-r)/d+2)/6;break;default:h=((r-g)/d+4)/6;}}
  return[Math.round(h*360),Math.round(s*100),Math.round(l*100)];
}
function hslToHex(h,s,l){
  s/=100;l/=100;const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),f=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));
  return"#"+[f(0),f(8),f(4)].map(x=>Math.round(x*255).toString(16).padStart(2,"0")).join("");
}
function adj(hex,ld){const[h,s,l]=hexToHsl(hex);return hslToHex(h,s,Math.max(0,Math.min(100,l+ld)));}
function buildColors(accent,secondary,bg){
  const[,,bgL]=hexToHsl(bg);const dark=bgL<50;
  return{bg,surface:dark?adj(bg,5):adj(bg,-4),card:dark?adj(bg,9):adj(bg,-1),
    cardAlt:dark?adj(bg,13):adj(bg,-5),border:dark?adj(bg,22):adj(bg,-13),
    borderSoft:dark?adj(bg,14):adj(bg,-8),
    pink:accent,pinkHot:adj(accent,-8),purple:secondary,purpleDark:adj(secondary,-15),
    white:dark?"#fff9fe":"#18102a",offwhite:dark?"#f5e6ff":"#2d1a44",
    muted:dark?adj(bg,50):adj(secondary,-20),dim:dark?adj(bg,38):adj(bg,-30),
    danger:"#f43f5e",rest:"#60a5fa",dark};
}

// ── COLOR PICKER ──
const ColorPicker=memo(({label,hint,value,onChange,c})=>{
  const[h,sat,l]=hexToHsl(value);
  return(<div style={{marginBottom:20}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
      <div><div style={{fontSize:13,fontWeight:700,color:c.offwhite}}>{label}</div><div style={{fontSize:10,color:c.muted}}>{hint}</div></div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontFamily:"monospace",fontSize:11,color:c.muted,background:c.surface,padding:"3px 8px",borderRadius:6,border:`1px solid ${c.border}`}}>{value}</span>
        <div style={{position:"relative",width:42,height:42,borderRadius:"50%",background:value,border:`3px solid ${adj(value,20)}`,boxShadow:`0 0 16px ${value}88`,overflow:"hidden",cursor:"pointer",flexShrink:0}}>
          <input type="color" value={value} onChange={e=>onChange(e.target.value)} style={{position:"absolute",inset:"-8px",width:"calc(100% + 16px)",height:"calc(100% + 16px)",opacity:0,cursor:"pointer"}}/>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",fontSize:16}}>🎨</div>
        </div>
      </div>
    </div>
    {[["Hue","hue"],["Brightness","light"],["Saturation","sat"]].map(([lbl,type])=>(
      <div key={type} style={{marginBottom:8}}>
        <div style={{marginBottom:2,fontSize:9,color:c.muted,letterSpacing:1,textTransform:"uppercase"}}>{lbl}</div>
        <div style={{cursor:"pointer",borderRadius:12,overflow:"hidden",position:"relative",height:type==="hue"?26:22}} onClick={e=>{
          const rect=e.currentTarget.getBoundingClientRect();const pct=(e.clientX-rect.left)/rect.width;
          if(type==="hue")onChange(hslToHex(Math.round(pct*360),Math.max(sat,55),Math.max(Math.min(l,70),35)));
          else if(type==="light")onChange(hslToHex(h,sat,Math.round(pct*100)));
          else onChange(hslToHex(h,Math.round(pct*100),l));
        }}>
          <div style={{position:"absolute",inset:0,borderRadius:12,background:
            type==="hue"?"linear-gradient(90deg,hsl(0,80%,55%),hsl(60,80%,55%),hsl(120,80%,55%),hsl(180,80%,55%),hsl(240,80%,55%),hsl(300,80%,55%),hsl(360,80%,55%))":
            type==="light"?`linear-gradient(90deg,#000,${hslToHex(h,80,50)},#fff)`:
            `linear-gradient(90deg,${hslToHex(h,0,l)},${hslToHex(h,100,l)})`}}/>
          <div style={{position:"absolute",top:"50%",left:`${type==="hue"?(h/360)*100:type==="light"?l:sat}%`,transform:"translate(-50%,-50%)",width:type==="hue"?20:18,height:type==="hue"?20:18,borderRadius:"50%",border:"2.5px solid #fff",background:value,boxShadow:"0 0 6px rgba(0,0,0,.5)",pointerEvents:"none"}}/>
        </div>
      </div>
    ))}
  </div>);
});

// ── JOURNAL CANVAS ──
const JournalCanvas=memo(({day,dayData,updateDay,c,s})=>{
  const canvasRef=useRef(null);const isDrawing=useRef(false);const lastPos=useRef(null);
  const[tool,setTool]=useState("pen");const[inkColor,setInkColor]=useState(c.pink);
  const[lineWidth,setLineWidth]=useState(2);const[showTyped,setShowTyped]=useState(false);
  const data=dayData||{};const[typed,setTyped]=useState(data.journal||"");
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext("2d");
    canvas.width=canvas.offsetWidth*window.devicePixelRatio;canvas.height=canvas.offsetHeight*window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio,window.devicePixelRatio);
    ctx.fillStyle=c.surface;ctx.fillRect(0,0,canvas.offsetWidth,canvas.offsetHeight);
    for(let y=32;y<canvas.offsetHeight;y+=32){ctx.beginPath();ctx.strokeStyle=c.border;ctx.lineWidth=0.5;ctx.moveTo(16,y);ctx.lineTo(canvas.offsetWidth-16,y);ctx.stroke();}
    if(data.journalCanvas){const img=new Image();img.onload=()=>ctx.drawImage(img,0,0,canvas.offsetWidth,canvas.offsetHeight);img.src=data.journalCanvas;}
  },[day]);
  function getPos(e,canvas){const rect=canvas.getBoundingClientRect();const touch=e.touches?e.touches[0]:e;return{x:touch.clientX-rect.left,y:touch.clientY-rect.top};}
  function startDraw(e){e.preventDefault();isDrawing.current=true;lastPos.current=getPos(e,canvasRef.current);}
  function draw(e){
    e.preventDefault();if(!isDrawing.current)return;
    const canvas=canvasRef.current;const ctx=canvas.getContext("2d");const pos=getPos(e,canvas);
    ctx.beginPath();
    if(tool==="eraser"){ctx.globalCompositeOperation="destination-out";ctx.lineWidth=20;}
    else{ctx.globalCompositeOperation="source-over";ctx.strokeStyle=tool==="highlighter"?inkColor+"88":inkColor;ctx.lineWidth=lineWidth;}
    ctx.lineCap="round";ctx.lineJoin="round";ctx.moveTo(lastPos.current.x,lastPos.current.y);ctx.lineTo(pos.x,pos.y);ctx.stroke();
    lastPos.current=pos;
  }
  function endDraw(){if(!isDrawing.current)return;isDrawing.current=false;updateDay(day,{journalCanvas:canvasRef.current.toDataURL("image/png")});}
  function clearCanvas(){
    const canvas=canvasRef.current;const ctx=canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle=c.surface;ctx.fillRect(0,0,canvas.offsetWidth,canvas.offsetHeight);
    for(let y=32;y<canvas.offsetHeight;y+=32){ctx.beginPath();ctx.strokeStyle=c.border;ctx.lineWidth=0.5;ctx.moveTo(16,y);ctx.lineTo(canvas.offsetWidth-16,y);ctx.stroke();}
    updateDay(day,{journalCanvas:""});
  }
  const tools=[{id:"pen",icon:"✒️",lw:2},{id:"marker",icon:"🖊️",lw:5},{id:"highlighter",icon:"🌟",lw:14},{id:"eraser",icon:"⬜",lw:20}];
  const colors=[c.pink,c.purple,"#ffffff","#000000","#fbbf24","#4ade80","#60a5fa","#f87171"];
  return(<div style={s.card()}>
    <div style={s.bigTitle}>📓 Journal</div>
    <div style={{display:"flex",gap:6,marginBottom:12}}>
      <button style={s.tab(!showTyped)} onClick={()=>setShowTyped(false)}>✏️ Handwrite</button>
      <button style={s.tab(showTyped)} onClick={()=>setShowTyped(true)}>⌨️ Type</button>
    </div>
    {!showTyped?(<>
      <div style={{display:"flex",gap:5,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
        {tools.map(t=>(<button key={t.id} onClick={()=>{setTool(t.id);setLineWidth(t.lw);}} style={{padding:"5px 8px",borderRadius:10,border:`1px solid ${tool===t.id?c.pink:c.border}`,background:tool===t.id?`${c.pink}22`:c.surface,fontSize:15,cursor:"pointer"}}>{t.icon}</button>))}
        <div style={{display:"flex",gap:3,marginLeft:"auto",flexWrap:"wrap"}}>
          {colors.map(col=>(<div key={col} onClick={()=>{setInkColor(col);if(tool==="eraser")setTool("pen");}} style={{width:20,height:20,borderRadius:"50%",background:col,cursor:"pointer",border:`2px solid ${inkColor===col?c.white:c.border}`,boxShadow:inkColor===col?`0 0 8px ${col}88`:"none"}}/>))}
        </div>
        <button onClick={clearCanvas} style={{padding:"5px 8px",borderRadius:10,border:`1px solid ${c.danger}`,background:"transparent",color:c.danger,fontSize:11,cursor:"pointer",fontFamily:"'Nunito',sans-serif"}}>Clear</button>
      </div>
      <div style={{position:"relative",borderRadius:12,overflow:"hidden",border:`1px solid ${c.border}`}}>
        <canvas ref={canvasRef} style={{width:"100%",height:300,display:"block",touchAction:"none",cursor:tool==="eraser"?"cell":"crosshair"}}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}/>
        <div style={{position:"absolute",top:6,right:6,fontSize:9,color:c.muted,background:`${c.bg}aa`,padding:"2px 6px",borderRadius:6}}>🍎 Apple Pencil ready</div>
      </div>
    </>):(<>
      <textarea style={{...s.textarea,minHeight:280}} placeholder={"Dear diary... 🌸\n\nToday I felt...\n\nI'm proud of myself for...\n\nTomorrow I will..."} value={typed} onChange={e=>setTyped(e.target.value)} onBlur={()=>updateDay(day,{journal:typed})}/>
      <button style={{...s.pinkBtn,marginTop:10}} onClick={()=>updateDay(day,{journal:typed})}>Save 💾</button>
    </>)}
  </div>);
});

// ── DAY PHOTOS (multiple) ──
const DayPhotos=memo(({day,dailyPhotos,update,c,s})=>{
  const photos=(dailyPhotos||{})[`day_${day}`]||[];
  async function addPhotos(e){
    const files=Array.from(e.target.files);
    const b64s=await Promise.all(files.map(f=>compressImage(f)));
    update({dailyPhotos:{...dailyPhotos,[`day_${day}`]:[...photos,...b64s]}});
  }
  function removePhoto(i){update({dailyPhotos:{...dailyPhotos,[`day_${day}`]:photos.filter((_,j)=>j!==i)}});}
  return(<div style={s.card()}>
    <div style={s.bigTitle}>📷 Day Photos</div>
    <div style={{position:"relative",border:`2px dashed ${c.border}`,borderRadius:12,padding:14,textAlign:"center",marginBottom:12,cursor:"pointer"}}>
      <div style={{fontSize:13,color:c.muted}}>📷 Add photo(s) for today</div>
      <input type="file" accept="image/*" multiple onChange={addPhotos} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%",height:"100%"}}/>
    </div>
    {photos.length===0&&<div style={{textAlign:"center",color:c.muted,fontSize:12,padding:"12px 0"}}>No photos yet 📷</div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
      {photos.map((src,i)=>(<div key={i} style={{position:"relative",borderRadius:10,overflow:"hidden",aspectRatio:"1"}}>
        <img src={src} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>
        <button onClick={()=>removePhoto(i)} style={{position:"absolute",top:2,right:2,background:`${c.bg}cc`,border:"none",color:c.danger,cursor:"pointer",fontSize:14,borderRadius:"50%",width:20,height:20,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900}}>×</button>
      </div>))}
    </div>
  </div>);
});

// ── VISION BOARD ──
const VisionBoard=memo(({visionBoard,update,c,s,grad})=>{
  const[items,setItems]=useState(visionBoard||[]);
  const[dragging,setDragging]=useState(null);const[resizing,setResizing]=useState(null);
  const[selected,setSelected]=useState(null);const[newText,setNewText]=useState("");
  const boardRef=useRef(null);const dragOffset=useRef({x:0,y:0});
  function save(updated){setItems(updated);update({visionBoard:updated});}
  async function addImage(e){const file=e.target.files[0];if(!file)return;const b64=await fileToBase64(file);save([...items,{id:Date.now(),type:"image",src:b64,x:80,y:80,width:150}]);}
  function addText(){if(!newText.trim())return;save([...items,{id:Date.now(),type:"text",text:newText.trim(),x:100,y:100,width:160,fontSize:18,color:c.pink}]);setNewText("");}
  function getPos(e){const board=boardRef.current.getBoundingClientRect();const touch=e.touches?e.touches[0]:e;return{x:touch.clientX-board.left,y:touch.clientY-board.top};}
  function startDrag(e,id){e.preventDefault();e.stopPropagation();setSelected(id);setDragging(id);const item=items.find(i=>i.id===id);const pos=getPos(e);dragOffset.current={x:pos.x-item.x,y:pos.y-item.y};}
  function startResize(e,id){e.preventDefault();e.stopPropagation();const pos=getPos(e);const item=items.find(i=>i.id===id);setResizing({id,startX:pos.x,startW:item.width});setDragging(null);}
  function onMove(e){
    if(!dragging&&!resizing)return;e.preventDefault();const pos=getPos(e);
    if(dragging)setItems(prev=>prev.map(i=>i.id===dragging?{...i,x:Math.max(0,pos.x-dragOffset.current.x),y:Math.max(0,pos.y-dragOffset.current.y)}:i));
    if(resizing)setItems(prev=>prev.map(i=>i.id===resizing.id?{...i,width:Math.max(60,resizing.startW+(pos.x-resizing.startX))}:i));
  }
  function endMove(){if(dragging||resizing)update({visionBoard:items});setDragging(null);setResizing(null);}
  function deleteItem(id){save(items.filter(i=>i.id!==id));setSelected(null);}
  function updateItem(id,upd){const updated=items.map(i=>i.id===id?{...i,...upd}:i);save(updated);}
  const sel=items.find(i=>i.id===selected);
  return(<div>
    <div style={{...s.card(),marginBottom:8}}>
      <div style={s.bigTitle}>🎯 Vision Board</div>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <input style={{...s.input,flex:1}} placeholder="Add text..." value={newText} onChange={e=>setNewText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")addText();}}/>
        <button style={s.pinkBtn} onClick={addText}>Add</button>
      </div>
      <div style={{position:"relative",border:`2px dashed ${c.border}`,borderRadius:10,padding:10,textAlign:"center",cursor:"pointer"}}>
        <span style={{fontSize:12,color:c.muted}}>📷 Add image</span>
        <input type="file" accept="image/*" onChange={addImage} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%",height:"100%"}}/>
      </div>
      <div style={{fontSize:10,color:c.muted,marginTop:8,textAlign:"center"}}>Tap to select • Drag to move • ↘ corner to resize</div>
    </div>
    {sel&&(<div style={{...s.card(),marginBottom:8,padding:12}}>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        {sel.type==="text"&&(<>
          <input style={{...s.input,flex:1,fontSize:12,padding:"6px 10px"}} value={sel.text} onChange={e=>updateItem(selected,{text:e.target.value})}/>
          <input type="color" value={sel.color||"#ffffff"} onChange={e=>updateItem(selected,{color:e.target.value})} style={{width:32,height:32,borderRadius:"50%",border:`2px solid ${c.border}`,cursor:"pointer",background:"transparent"}}/>
          <select value={sel.fontSize||18} onChange={e=>updateItem(selected,{fontSize:Number(e.target.value)})} style={{background:c.surface,border:`1px solid ${c.border}`,borderRadius:8,padding:6,color:c.offwhite,fontSize:12}}>
            {[12,14,16,18,22,28,36,48].map(sz=>(<option key={sz} value={sz}>{sz}px</option>))}
          </select>
        </>)}
        <button style={{...s.ghostBtn,padding:"6px 12px",fontSize:12,color:c.danger,borderColor:c.danger}} onClick={()=>deleteItem(selected)}>Delete</button>
        <button style={{...s.ghostBtn,padding:"6px 12px",fontSize:12}} onClick={()=>setSelected(null)}>Done</button>
      </div>
    </div>)}
    <div ref={boardRef} style={{position:"relative",width:"100%",minHeight:500,background:`linear-gradient(145deg,${c.card},${c.cardAlt})`,border:`1px solid ${c.border}`,borderRadius:16,overflow:"hidden",touchAction:"none",userSelect:"none"}}
      onMouseMove={onMove} onMouseUp={endMove} onTouchMove={onMove} onTouchEnd={endMove}
      onClick={()=>{if(!dragging&&!resizing)setSelected(null);}}>
      {items.length===0&&(<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8,color:c.muted}}>
        <div style={{fontSize:32}}>🎯</div><div style={{fontSize:12}}>Add images and text to build your vision board</div>
      </div>)}
      {items.map(item=>(<div key={item.id}
        style={{position:"absolute",left:item.x,top:item.y,width:item.width,border:selected===item.id?`2px solid ${c.pink}`:"2px solid transparent",borderRadius:10,userSelect:"none",cursor:dragging===item.id?"grabbing":"grab",boxShadow:selected===item.id?`0 0 12px ${c.pink}55`:"none",transition:"box-shadow .15s"}}
        onMouseDown={e=>{e.stopPropagation();startDrag(e,item.id);}} onTouchStart={e=>{e.stopPropagation();startDrag(e,item.id);}}>
        {item.type==="image"?(<img src={item.src} style={{width:"100%",borderRadius:8,display:"block",pointerEvents:"none"}} alt="" draggable={false}/>):(<div style={{padding:"8px 10px",fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:item.fontSize||18,color:item.color||c.pink,lineHeight:1.3,background:`${c.bg}88`,borderRadius:8,wordBreak:"break-word",pointerEvents:"none"}}>{item.text}</div>)}
        <div style={{position:"absolute",bottom:-8,right:-8,width:24,height:24,borderRadius:"50%",background:c.pink,cursor:"se-resize",zIndex:20,border:`2px solid ${c.bg}`,display:"flex",alignItems:"center",justifyContent:"center",opacity:selected===item.id?1:0,pointerEvents:selected===item.id?"auto":"none",touchAction:"none",transition:"opacity .15s"}}
          onMouseDown={e=>{e.stopPropagation();e.preventDefault();startResize(e,item.id);}} onTouchStart={e=>{e.stopPropagation();e.preventDefault();startResize(e,item.id);}}>
          <svg width="10" height="10" viewBox="0 0 10 10" style={{pointerEvents:"none"}}><path d="M2 8 L8 8 L8 2" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
        </div>
      </div>))}
    </div>
  </div>);
});

// ── OVERVIEW VIEW ──
const OverviewView=memo(({st,update,updateDay,getDayPct,getHabitStreak,currentDay,streak,completedDays,setView,c,s,grad})=>{
  const pct=Math.round((completedDays/st.totalDays)*100);
  const todayMood=(st.dayData[`day_${currentDay}`]||{}).mood||"";
  const[localMission,setLocalMission]=useState(st.mission);
  const[editingMission,setEditingMission]=useState(false);
  useEffect(()=>setLocalMission(st.mission),[st.mission]);
  const todayData=st.dayData[`day_${currentDay}`]||getInitialDay(st.habits);
  return(<div className="fade">
    <div style={s.card(true)}>
      <div style={s.sectionLabel}>💌 My Mission</div>
      {editingMission?(<>
        <textarea style={{...s.textarea,minHeight:100}} value={localMission} onChange={e=>setLocalMission(e.target.value)} autoFocus/>
        <div style={{display:"flex",gap:8,marginTop:10}}>
          <button style={s.pinkBtn} onClick={()=>{setEditingMission(false);update({mission:localMission});}}>Save ✓</button>
          <button style={s.ghostBtn} onClick={()=>setEditingMission(false)}>Cancel</button>
        </div>
      </>):(<div onClick={()=>setEditingMission(true)} style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:14,lineHeight:1.8,color:c.offwhite,cursor:"pointer",opacity:.9}}>"{st.mission}" <span style={{fontSize:10,color:c.pink}}>✏️</span></div>)}
    </div>
    <div style={s.statRow}>
      {[{n:currentDay,l:"Today"},{n:streak,l:"Streak 🔥"},{n:completedDays,l:"Done ✨"}].map(({n,l})=>(<div key={l} style={s.statBox}><div style={s.statNum}>{n}</div><div style={s.statLabel}>{l}</div></div>))}
    </div>
    <div style={s.card()}>
      <div style={s.sectionLabel}>😊 Today's Mood</div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {MOODS.map(m=>(<button key={m.emoji} onClick={()=>updateDay(currentDay,{mood:todayMood===m.emoji?"":m.emoji})}
          style={{padding:"7px 8px",borderRadius:10,border:`1px solid ${todayMood===m.emoji?c.pink:c.border}`,background:todayMood===m.emoji?`${c.pink}22`:c.surface,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
          <span style={{fontSize:20}}>{m.emoji}</span><span style={{fontSize:7,color:todayMood===m.emoji?c.pink:c.muted}}>{m.label}</span>
        </button>))}
      </div>
    </div>
    <div style={s.card()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={s.sectionLabel}>Overall Progress</div>
        <span style={{fontFamily:"'Playfair Display',serif",fontSize:22,background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{pct}%</span>
      </div>
      <div style={s.progressTrack}><div style={s.progressFill(pct)}/></div>
      <div style={{fontSize:11,color:c.muted,marginTop:6,textAlign:"right"}}>{completedDays}/{st.totalDays} days 🌸</div>
    </div>
    <div style={s.card()}>
      <div style={s.sectionLabel}>Day Map 🗺️</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:4}}>
        {Array.from({length:st.totalDays},(_,i)=>i+1).map(day=>(<div key={day} style={s.dayDot(day,getDayPct(day),currentDay,null,c,grad)} onClick={()=>setView(`day-${day}`)}>{day}</div>))}
      </div>
    </div>
    <div style={s.card()}>
      <div style={s.sectionLabel}>🔥 Habit Streaks</div>
      {st.habits.map(h=>{const hs=getHabitStreak(h.id);return(<div key={h.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${c.borderSoft}`}}>
        <span style={{fontSize:16}}>{h.icon}</span><span style={{flex:1,fontSize:12,color:c.offwhite}}>{h.label}</span>
        <div style={{display:"flex",alignItems:"center",gap:3,background:`${c.pink}18`,border:`1px solid ${c.pink}33`,borderRadius:8,padding:"2px 8px"}}><span style={{fontSize:12}}>🔥</span><span style={{fontSize:12,fontWeight:700,color:c.pink}}>{hs}</span></div>
      </div>);})}
    </div>
    <div style={s.card()}>
      <div style={s.sectionLabel}>Today's Habits — Day {currentDay}</div>
      {st.habits.map((h,i)=>{const checked=todayData.habits[h.id];const isRest=todayData.restDay;return(
        <div key={h.id} style={{...s.habitRow,borderBottom:i===st.habits.length-1?"none":`1px solid ${c.borderSoft}`,opacity:isRest?.5:1}} onClick={()=>!isRest&&updateDay(currentDay,{habits:{...todayData.habits,[h.id]:!checked}})}>
          <div style={s.checkbox(checked&&!isRest)}>{checked&&!isRest&&<span style={{fontSize:12,color:"#fff",fontWeight:900}}>✓</span>}</div>
          <span style={{fontSize:13,color:checked&&!isRest?c.dim:c.offwhite,textDecoration:checked&&!isRest?"line-through":"none"}}>{h.icon} {h.label}</span>
        </div>
      );})}
      <div style={{marginTop:10}}><div style={s.progressTrack}><div style={s.progressFill(getDayPct(currentDay)===-1?0:getDayPct(currentDay))}/></div></div>
      <button style={{...s.pinkBtn,marginTop:12,width:"100%"}} onClick={()=>setView(`day-${currentDay}`)}>Open Day {currentDay} →</button>
    </div>
  </div>);
});

// ── DAY VIEW ──
const DayView=memo(({st,day,currentDay,updateDay,update,getDayPct,setView,c,s,grad})=>{
  const data=st.dayData[`day_${day}`]||getInitialDay(st.habits);
  const pct=getDayPct(day);const isRest=data.restDay;
  const[tab,setTab]=useState("habits");
  const[trading,setTrading]=useState(data.trading||"");
  return(<div className="fade">
    <div style={{...s.card(true),background:`linear-gradient(145deg,${adj(c.bg,12)},${adj(c.bg,6)})`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:12,color:c.muted,marginBottom:2}}>{isRest?"😴 Rest Day":day===currentDay?"✨ Today":day<currentDay?"Past day":"Upcoming"}</div>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:40,background:isRest?`linear-gradient(135deg,${c.rest},#93c5fd)`:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1}}>Day {day}</div>
        </div>
        <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:38,color:isRest?c.rest:c.pink,lineHeight:1}}>{isRest?"😴":pct+"%"}</div>
          <button onClick={()=>updateDay(day,{restDay:!isRest})} style={{padding:"4px 10px",borderRadius:10,border:`1px solid ${isRest?c.rest:c.border}`,background:isRest?`${c.rest}22`:"transparent",color:isRest?c.rest:c.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer"}}>{isRest?"✅ Rest Day":"😴 Mark Rest"}</button>
        </div>
      </div>
      {!isRest&&<div style={{...s.progressTrack,marginTop:12}}><div style={s.progressFill(pct)}/></div>}
      <div style={{marginTop:10}}>
        <div style={{fontSize:9,color:c.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>Mood</div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {MOODS.map(m=>(<button key={m.emoji} onClick={()=>updateDay(day,{mood:data.mood===m.emoji?"":m.emoji})} style={{padding:"4px 6px",borderRadius:8,border:`1px solid ${data.mood===m.emoji?c.pink:c.border}`,background:data.mood===m.emoji?`${c.pink}22`:c.surface,cursor:"pointer",fontSize:16}}>{m.emoji}</button>))}
        </div>
      </div>
    </div>
    <div style={{display:"flex",gap:4,marginBottom:12,overflowX:"auto"}}>
      {[["habits","✅ Habits"],["journal","📓 Journal"],["photos","📷 Photos"],["trading","📈 Trading"]].map(([key,label])=>(<button key={key} style={{...s.tab(tab===key),flexShrink:0,fontSize:10}} onClick={()=>setTab(key)}>{label}</button>))}
    </div>
    {tab==="habits"&&(<div style={s.card()}>
      <div style={s.bigTitle}>Daily Habits</div>
      {isRest&&<div style={{padding:12,background:`${c.rest}18`,border:`1px solid ${c.rest}44`,borderRadius:10,marginBottom:10,textAlign:"center",color:c.rest,fontSize:12}}>😴 Rest day — habits paused</div>}
      {st.habits.map((h,i)=>{const checked=data.habits[h.id];return(
        <div key={h.id} style={{...s.habitRow,borderBottom:i===st.habits.length-1?"none":`1px solid ${c.borderSoft}`,opacity:isRest?.4:1}} onClick={()=>!isRest&&updateDay(day,{habits:{...data.habits,[h.id]:!checked}})}>
          <div style={s.checkbox(checked&&!isRest)}>{checked&&!isRest&&<span style={{fontSize:13,color:"#fff",fontWeight:900}}>✓</span>}</div>
          <span style={{fontSize:13,color:checked&&!isRest?c.dim:c.offwhite,textDecoration:checked&&!isRest?"line-through":"none",flex:1}}>{h.icon} {h.label}</span>
          {(h.daysPerWeek||7)<7&&<span style={{fontSize:9,color:c.muted,background:c.surface,border:`1px solid ${c.border}`,borderRadius:6,padding:"1px 5px"}}>{h.daysPerWeek}×/wk</span>}
        </div>
      );})}
      {pct===100&&!isRest&&(<div style={{marginTop:14,padding:14,background:`${c.pink}18`,border:`1px solid ${c.pink}55`,borderRadius:14,textAlign:"center"}}>
        <div style={{fontSize:26}}>🎉</div>
        <div style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:16,background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginTop:4}}>Day {day} Conquered, Queen!</div>
      </div>)}
      {!isRest&&(<div style={{marginTop:16,padding:14,background:c.surface,border:`1px solid ${c.border}`,borderRadius:14}}>
        <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:"uppercase",color:c.muted,marginBottom:10}}>✍️ Override Progress %</div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <input type="range" min={0} max={100} step={5} value={data.manualPct!=null?data.manualPct:pct}
            onChange={e=>updateDay(day,{manualPct:Number(e.target.value)})}
            style={{flex:1,accentColor:c.pink}}/>
          <span style={{fontFamily:"'Playfair Display',serif",fontSize:20,background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",minWidth:42,textAlign:"right"}}>{data.manualPct!=null?data.manualPct:pct}%</span>
        </div>
        {data.manualPct!=null&&(<button onClick={()=>updateDay(day,{manualPct:null})} style={{marginTop:8,fontSize:10,color:c.muted,background:"transparent",border:`1px solid ${c.border}`,borderRadius:8,padding:"4px 10px",cursor:"pointer",fontFamily:"'Nunito',sans-serif"}}>↩ Reset to habit score</button>)}
      </div>)}
    </div>)}
    {tab==="journal"&&<JournalCanvas day={day} dayData={data} updateDay={updateDay} c={c} s={s}/>}
    {tab==="photos"&&<DayPhotos day={day} dailyPhotos={st.dailyPhotos} update={update} c={c} s={s}/>}
    {tab==="trading"&&(<div style={s.card()}>
      <div style={s.bigTitle}>📈 Trading Analysis</div>
      <textarea style={{...s.textarea,minHeight:230}} placeholder={"📊 Market conditions:\n\n📈 Trades taken:\n\n👀 Setups watched:\n\n💡 Lessons learned:\n\n🎯 Tomorrow's plan:"} value={trading} onChange={e=>setTrading(e.target.value)} onBlur={()=>updateDay(day,{trading})}/>
      <button style={{...s.pinkBtn,marginTop:10}} onClick={()=>updateDay(day,{trading})}>Save 💾</button>
    </div>)}
    <div style={{display:"flex",gap:8,marginTop:6}}>
      {day>1&&<button style={{...s.ghostBtn,flex:1}} onClick={()=>setView(`day-${day-1}`)}>← Day {day-1}</button>}
      {day<st.totalDays&&<button style={{...s.ghostBtn,flex:1}} onClick={()=>setView(`day-${day+1}`)}>Day {day+1} →</button>}
    </div>
  </div>);
});

// ── AFFIRMATIONS ──
const AffirmationsView=memo(({affirmations,update,c,s})=>{
  const[newAff,setNewAff]=useState("");const[editIdx,setEditIdx]=useState(null);const[editText,setEditText]=useState("");
  return(<div className="fade">
    <div style={s.card(true)}>
      <div style={s.bigTitle}>💭 My Affirmations</div>
      {affirmations.length===0&&<div style={{textAlign:"center",padding:"20px 0",color:c.muted,fontSize:13}}>Add your first affirmation ✨</div>}
      {affirmations.map((aff,i)=>(<div key={i} style={{padding:12,background:c.surface,borderRadius:12,marginBottom:8,border:`1px solid ${c.border}`,position:"relative"}}>
        {editIdx===i?(<>
          <textarea style={{...s.textarea,minHeight:60}} value={editText} onChange={e=>setEditText(e.target.value)}/>
          <div style={{display:"flex",gap:6,marginTop:8}}>
            <button style={{...s.pinkBtn,padding:"6px 14px",fontSize:12}} onClick={()=>{const u=[...affirmations];u[i]=editText;update({affirmations:u});setEditIdx(null);}}>Save</button>
            <button style={{...s.ghostBtn,padding:"6px 14px",fontSize:12}} onClick={()=>setEditIdx(null)}>Cancel</button>
          </div>
        </>):(<>
          <div style={{fontSize:14,color:c.offwhite,lineHeight:1.6,paddingRight:50,fontStyle:"italic"}}>"{aff}"</div>
          <div style={{position:"absolute",top:8,right:8,display:"flex",gap:4}}>
            <button onClick={()=>{setEditIdx(i);setEditText(aff);}} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:14,color:c.muted}}>✏️</button>
            <button onClick={()=>update({affirmations:affirmations.filter((_,j)=>j!==i)})} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:14,color:c.danger}}>×</button>
          </div>
        </>)}
      </div>))}
      <div style={{display:"flex",gap:8,marginTop:12}}>
        <input style={{...s.input,flex:1}} placeholder="I am strong, I am capable..." value={newAff} onChange={e=>setNewAff(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&newAff.trim()){update({affirmations:[...affirmations,newAff.trim()]});setNewAff("");}}}/>
        <button style={s.pinkBtn} onClick={()=>{if(newAff.trim()){update({affirmations:[...affirmations,newAff.trim()]});setNewAff("");}}}>Add</button>
      </div>
    </div>
    {affirmations.length>0&&(<div style={{...s.card(true),textAlign:"center"}}>
      <div style={s.sectionLabel}>✨ Today's Affirmation</div>
      <div style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:18,color:c.offwhite,lineHeight:1.8,padding:"8px 0"}}>"{affirmations[new Date().getDate()%affirmations.length]}"</div>
    </div>)}
  </div>);
});

// ── WEEKLY INTENTION ──
const WeeklyIntentionView=memo(({st,update,currentDay,c,s})=>{
  const weekNum=Math.ceil(currentDay/7);const key=`week_${weekNum}`;
  const intention=(st.weeklyIntentions||{})[key]||{focus:"",goals:[],word:""};
  const[focus,setFocus]=useState(intention.focus);const[word,setWord]=useState(intention.word);
  const[localGoals,setLocalGoals]=useState(intention.goals||[]);const[newGoal,setNewGoal]=useState("");
  function saveInt(overrides={}){update({weeklyIntentions:{...st.weeklyIntentions,[key]:{focus,goals:localGoals,word,...overrides}}});}
  return(<div className="fade"><div style={s.card(true)}>
    <div style={s.bigTitle}>🗓️ Week {weekNum} Intentions</div>
    <div style={{fontSize:11,color:c.muted,marginBottom:14}}>Days {(weekNum-1)*7+1}–{Math.min(weekNum*7,st.totalDays)}</div>
    <div style={s.sectionLabel}>🌟 Word of the Week</div>
    <input style={{...s.input,marginBottom:14}} placeholder="e.g. Discipline, Focus..." value={word} onChange={e=>setWord(e.target.value)} onBlur={()=>saveInt({word})}/>
    <div style={s.sectionLabel}>🎯 Main Focus</div>
    <textarea style={{...s.textarea,minHeight:80,marginBottom:14}} placeholder="Your main focus this week..." value={focus} onChange={e=>setFocus(e.target.value)} onBlur={()=>saveInt({focus})}/>
    <div style={s.sectionLabel}>✅ Weekly Goals</div>
    {localGoals.map((g,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:`1px solid ${c.borderSoft}`}}>
      <div style={s.checkbox(g.done)} onClick={()=>{const u=localGoals.map((x,j)=>j===i?{...x,done:!x.done}:x);setLocalGoals(u);saveInt({goals:u});}}>
        {g.done&&<span style={{fontSize:12,color:"#fff",fontWeight:900}}>✓</span>}
      </div>
      <span style={{flex:1,fontSize:13,color:g.done?c.dim:c.offwhite,textDecoration:g.done?"line-through":"none"}}>{g.text}</span>
      <button onClick={()=>{const u=localGoals.filter((_,j)=>j!==i);setLocalGoals(u);saveInt({goals:u});}} style={{background:"transparent",border:"none",color:c.muted,cursor:"pointer",fontSize:16}}>×</button>
    </div>))}
    <div style={{display:"flex",gap:8,marginTop:10}}>
      <input style={{...s.input,flex:1}} placeholder="Add a weekly goal..." value={newGoal} onChange={e=>setNewGoal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&newGoal.trim()){const u=[...localGoals,{text:newGoal.trim(),done:false}];setLocalGoals(u);setNewGoal("");saveInt({goals:u});}}}/>
      <button style={s.pinkBtn} onClick={()=>{if(newGoal.trim()){const u=[...localGoals,{text:newGoal.trim(),done:false}];setLocalGoals(u);setNewGoal("");saveInt({goals:u});}}}>Add</button>
    </div>
  </div></div>);
});

// ── WEEKLY REPORT ──
const WeeklyReportView=memo(({st,getDayPct,currentDay,c,s,grad})=>{
  const weeks=Math.ceil(st.totalDays/7);
  const[selWeek,setSelWeek]=useState(Math.ceil(currentDay/7));
  function getReport(w){
    const start=(w-1)*7+1,end=Math.min(w*7,st.totalDays);
    const days=Array.from({length:end-start+1},(_,i)=>start+i);
    const pcts=days.map(d=>{const p=getDayPct(d);return p===-1?null:p;}).filter(p=>p!==null);
    if(!pcts.length)return null;
    const avg=Math.round(pcts.reduce((a,b)=>a+b,0)/pcts.length);
    const best=days.reduce((b,d)=>{const p=getDayPct(d);return(p!==-1&&p>(getDayPct(b)||0))?d:b;},start);
    const worst=days.filter(d=>getDayPct(d)!==-1).reduce((b,d)=>{const p=getDayPct(d);return p<(getDayPct(b)||101)?d:b;},start);
    return{avg,best,worst,days};
  }
  const report=getReport(selWeek);
  const intention=(st.weeklyIntentions||{})[`week_${selWeek}`]||{};
  return(<div className="fade">
    <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:12,paddingBottom:4}}>
      {Array.from({length:weeks},(_,i)=>i+1).map(w=>(<button key={w} style={{...s.navBtn(w===selWeek),flexShrink:0,padding:"6px 12px"}} onClick={()=>setSelWeek(w)}>W{w}</button>))}
    </div>
    {!report?(<div style={{...s.card(),textAlign:"center",padding:32,color:c.muted}}>No data yet 🌸</div>):(
      <div style={s.card(true)}>
        <div style={s.bigTitle}>📊 Week {selWeek} Report</div>
        <div style={s.statRow}>
          <div style={s.statBox}><div style={s.statNum}>{report.avg}%</div><div style={s.statLabel}>Avg</div></div>
          <div style={s.statBox}><div style={{...s.statNum,color:"#4ade80"}}>D{report.best}</div><div style={s.statLabel}>Best 🔥</div></div>
          <div style={s.statBox}><div style={{...s.statNum,color:c.danger}}>D{report.worst}</div><div style={s.statLabel}>Tough 💪</div></div>
        </div>
        {report.days.map(d=>{const pct=getDayPct(d);const rest=pct===-1;const mood=(st.dayData[`day_${d}`]||{}).mood;
          return(<div key={d} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:11,color:c.muted,width:28,flexShrink:0}}>D{d}</span>
            {rest?(<div style={{flex:1,height:20,borderRadius:4,background:`${c.rest}33`,display:"flex",alignItems:"center",paddingLeft:8}}><span style={{fontSize:10,color:c.rest}}>😴 Rest</span></div>):(
              <><div style={{...s.progressTrack,flex:1,height:20,borderRadius:6}}><div style={{...s.progressFill(pct),height:"100%",borderRadius:6,display:"flex",alignItems:"center",paddingLeft:6}}>{pct>20&&<span style={{fontSize:10,color:"#fff",fontWeight:700}}>{pct}%</span>}</div></div>{mood&&<span style={{fontSize:16}}>{mood}</span>}</>
            )}
          </div>);
        })}
        {intention.word&&<div style={{marginTop:10,textAlign:"center",fontFamily:"'Playfair Display',serif",fontSize:22,background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>"{intention.word}"</div>}
      </div>
    )}
  </div>);
});

// ── GOALS ──
const GoalsView=memo(({goals,update,c,s,grad})=>{
  const[showAdd,setShowAdd]=useState(false);
  const[newGoal,setNewGoal]=useState({title:"",type:"bar",target:100,current:0,unit:"",isMoney:false});
  const[selId,setSelId]=useState(null);const[editCur,setEditCur]=useState("");
  function CircleProg({pct,size=70,color}){
    const r=size/2-6;const circ=2*Math.PI*r;const offset=circ-(pct/100)*circ;
    return(<svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c.border} strokeWidth={5}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color||c.pink} strokeWidth={5} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{transition:"stroke-dashoffset .6s"}}/>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle" style={{transform:`rotate(90deg) translate(0,-${size/2}px)`,transformOrigin:`${size/2}px ${size/2}px`}} fill={color||c.pink} fontSize={size*0.18} fontFamily="'Nunito',sans-serif" fontWeight="700">{pct}%</text>
    </svg>);
  }
  return(<div className="fade">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <div style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:22,background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>My Goals 🎯</div>
      <button style={s.pinkBtn} onClick={()=>setShowAdd(!showAdd)}>+ Add Goal</button>
    </div>
    {showAdd&&(<div style={s.card(true)}>
      <div style={s.sectionLabel}>New Goal ✨</div>
      <input style={{...s.input,marginBottom:10}} placeholder="Goal title..." value={newGoal.title} onChange={e=>setNewGoal({...newGoal,title:e.target.value})}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:12}}>
        {[["bar","📊 Bar"],["circle","⭕ Circle"],["none","✅ Simple"]].map(([type,label])=>(<button key={type} style={{...s.tab(newGoal.type===type),fontSize:11}} onClick={()=>setNewGoal({...newGoal,type})}>{label}</button>))}
      </div>
      {newGoal.type!=="none"&&(<div style={{display:"flex",gap:8,marginBottom:10}}>
        <div style={{flex:1}}><div style={{fontSize:10,color:c.muted,marginBottom:4}}>Current</div><input type="number" style={s.input} value={newGoal.current} onChange={e=>setNewGoal({...newGoal,current:e.target.value})}/></div>
        <div style={{flex:1}}><div style={{fontSize:10,color:c.muted,marginBottom:4}}>Target</div><input type="number" style={s.input} value={newGoal.target} onChange={e=>setNewGoal({...newGoal,target:e.target.value})}/></div>
        <div style={{flex:1}}><div style={{fontSize:10,color:c.muted,marginBottom:4}}>Unit</div><input style={s.input} placeholder="$, lbs..." value={newGoal.unit} onChange={e=>setNewGoal({...newGoal,unit:e.target.value})}/></div>
      </div>)}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,cursor:"pointer"}} onClick={()=>setNewGoal({...newGoal,isMoney:!newGoal.isMoney})}>
        <div style={s.checkbox(newGoal.isMoney)}>{newGoal.isMoney&&<span style={{fontSize:12,color:"#fff",fontWeight:900}}>✓</span>}</div>
        <span style={{fontSize:13,color:c.offwhite}}>💰 Money goal</span>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button style={s.pinkBtn} onClick={()=>{if(!newGoal.title.trim())return;const g={...newGoal,id:Date.now(),current:Number(newGoal.current)||0,target:Number(newGoal.target)||100};update({goals:[...goals,g]});setNewGoal({title:"",type:"bar",target:100,current:0,unit:"",isMoney:false});setShowAdd(false);}}>Save 🎯</button>
        <button style={s.ghostBtn} onClick={()=>setShowAdd(false)}>Cancel</button>
      </div>
    </div>)}
    {goals.length===0&&!showAdd&&<div style={{...s.card(),textAlign:"center",padding:32,color:c.muted}}>No goals yet — tap + Add Goal! 🎯</div>}
    {goals.map(g=>{
      const pct=g.type==="none"?0:Math.min(100,Math.round((g.current/g.target)*100))||0;
      const isSel=selId===g.id;const fmt=n=>g.isMoney?`$${Number(n).toLocaleString()}`:n+(g.unit||"");
      return(<div key={g.id} style={{...s.card(g.isMoney),marginBottom:10,cursor:"pointer"}} onClick={()=>{setSelId(isSel?null:g.id);setEditCur(String(g.current));}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div style={{flex:1,paddingRight:8}}>
            <div style={{fontSize:15,fontWeight:700,color:g.done?c.dim:c.offwhite,textDecoration:g.done?"line-through":"none"}}>{g.isMoney?"💰":""} {g.title}</div>
            {g.type!=="none"&&<div style={{fontSize:11,color:c.muted,marginTop:2}}>{fmt(g.current)} / {fmt(g.target)}</div>}
          </div>
          {g.type==="none"?(<div style={s.checkbox(g.done)} onClick={e=>{e.stopPropagation();update({goals:goals.map(x=>x.id===g.id?{...x,done:!x.done}:x)});}}>{g.done&&<span style={{fontSize:13,color:"#fff",fontWeight:900}}>✓</span>}</div>)
          :g.type==="circle"?(<CircleProg pct={pct} color={g.isMoney?"#fbbf24":c.pink}/>)
          :(<div style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:g.isMoney?"#fbbf24":c.pink}}>{pct}%</div>)}
        </div>
        {g.type==="bar"&&(<div style={{...s.progressTrack,marginTop:10}}><div style={{...s.progressFill(pct),background:g.isMoney?"linear-gradient(90deg,#fbbf24,#f59e0b)":undefined}}/></div>)}
        {isSel&&(<div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${c.border}`}} onClick={e=>e.stopPropagation()}>
          {g.type!=="none"&&(<><div style={{fontSize:11,color:c.muted,marginBottom:6}}>Update progress</div><input type="number" style={{...s.input,marginBottom:8}} value={editCur} onChange={e=>setEditCur(e.target.value)} onBlur={()=>update({goals:goals.map(x=>x.id===g.id?{...x,current:Number(editCur)}:x)})}/></>)}
          <button style={{...s.ghostBtn,color:c.danger,borderColor:c.danger,fontSize:12,padding:"6px 14px"}} onClick={()=>{update({goals:goals.filter(x=>x.id!==g.id)});setSelId(null);}}>Delete Goal</button>
        </div>)}
      </div>);
    })}
  </div>);
});

// ── VISION + BINGO ──
const VisionBoardView=memo(({st,update,c,s,grad})=>{
  const[tab,setTab]=useState("board");
  const completedRows=checkBingoRows(st.bingoCard);
  const[localBingo,setLocalBingo]=useState(st.bingoCard);
  useEffect(()=>setLocalBingo(st.bingoCard),[st.bingoCard]);
  function toggleBingo(i){const u=st.bingoCard.map((cell,idx)=>idx===i?{...cell,done:!cell.done}:cell);update({bingoCard:u});}
  function setBingoText(i,text){setLocalBingo(prev=>prev.map((cell,idx)=>idx===i?{...cell,text}:cell));}
  function saveBingo(){update({bingoCard:localBingo});}
  return(<div className="fade">
    <div style={{display:"flex",gap:6,marginBottom:12}}>
      <button style={s.tab(tab==="board")} onClick={()=>setTab("board")}>🎯 Vision Board</button>
      <button style={s.tab(tab==="bingo")} onClick={()=>setTab("bingo")}>⭐️ Bingo</button>
    </div>
    {tab==="board"&&<VisionBoard visionBoard={st.visionBoard||[]} update={update} c={c} s={s} grad={grad}/>}
    {tab==="bingo"&&(<div style={s.card(true)}>
      <div style={s.bigTitle}>⭐️ Bingo Card</div>
      {completedRows.length>0&&(<div style={{padding:"8px 12px",background:`${c.pink}22`,border:`1px solid ${c.pink}44`,borderRadius:10,marginBottom:12,textAlign:"center",fontSize:13,color:c.pink,fontWeight:700}}>🎉 {completedRows.length} Bingo{completedRows.length>1?"s":""}! ⭐️</div>)}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4}}>
        {st.bingoCard.map((cell,i)=>{const row=Math.floor(i/5);const rowDone=completedRows.includes(row);return(
          <div key={i} style={{position:"relative",aspectRatio:"1",borderRadius:8,background:rowDone?`linear-gradient(135deg,${c.pink}33,${c.purple}33)`:cell.done?`${c.pink}22`:c.surface,border:`1px solid ${rowDone?c.pink:cell.done?c.pink:c.border}`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",boxShadow:rowDone?`0 0 8px ${c.pink}44`:"none",cursor:"pointer"}} onClick={()=>toggleBingo(i)}>
            {rowDone?<span className="star-pop" style={{fontSize:22,position:"absolute",zIndex:2}}>⭐️</span>:cell.done?<span style={{fontSize:18,position:"absolute",zIndex:2}}>✅</span>:null}
            <span style={{fontSize:7,color:c.muted,textAlign:"center",padding:2,lineHeight:1.2,opacity:rowDone||cell.done?0.3:1,zIndex:1,overflow:"hidden",wordBreak:"break-word"}}>{cell.text||`#${i+1}`}</span>
          </div>
        );})}
      </div>
      <div style={{marginTop:14}}><div style={s.sectionLabel}>✏️ Edit Squares</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {localBingo.map((cell,i)=>(<div key={i} style={{display:"flex",gap:4,alignItems:"center"}}>
            <span style={{fontSize:10,color:c.muted,width:16,flexShrink:0}}>#{i+1}</span>
            <input style={{...s.input,fontSize:11,padding:"5px 8px"}} placeholder={`Square ${i+1}`} value={cell.text} onChange={e=>setBingoText(i,e.target.value)} onBlur={saveBingo}/>
          </div>))}
        </div>
      </div>
    </div>)}
  </div>);
});

// ── WISHLIST ──
const WishlistView=memo(({st,update,c,s,grad})=>{
  const[showAdd,setShowAdd]=useState(false);const[selItem,setSelItem]=useState(null);const[editItem,setEditItem]=useState(null);
  const[newItem,setNewItem]=useState({title:"",category:"Fashion",link:"",social:"",notes:"",imgSrc:""});
  const[newCat,setNewCat]=useState("");const[filterCat,setFilterCat]=useState("All");
  const wishItems=st.wishlist||[];const categories=["All",...new Set(wishItems.map(w=>w.category))];
  async function handleImg(e,isEdit){const file=e.target.files[0];if(!file)return;const b64=await fileToBase64(file);isEdit?setEditItem(p=>({...p,imgSrc:b64})):setNewItem(p=>({...p,imgSrc:b64}));}
  function addItem(){if(!newItem.title.trim())return;update({wishlist:[...wishItems,{...newItem,id:Date.now()}]});setNewItem({title:"",category:newItem.category,link:"",social:"",notes:"",imgSrc:""});setShowAdd(false);}
  function saveEdit(){update({wishlist:wishItems.map(w=>w.id===editItem.id?editItem:w)});setEditItem(null);setSelItem(null);}
  const filtered=filterCat==="All"?wishItems:wishItems.filter(w=>w.category===filterCat);
  return(<div className="fade">
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <div style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:22,background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Wishlist 🛍️</div>
      <button style={s.pinkBtn} onClick={()=>setShowAdd(!showAdd)}>+ Add</button>
    </div>
    {showAdd&&(<div style={s.card(true)}>
      <div style={s.sectionLabel}>New Item ✨</div>
      <div style={{position:"relative",borderRadius:12,overflow:"hidden",marginBottom:10,background:c.surface,border:`2px dashed ${c.border}`,height:120,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
        {newItem.imgSrc?<img src={newItem.imgSrc} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:<div style={{textAlign:"center"}}><div style={{fontSize:24}}>📷</div><div style={{fontSize:11,color:c.muted,marginTop:4}}>Add photo</div></div>}
        <input type="file" accept="image/*" onChange={e=>handleImg(e,false)} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%",height:"100%"}}/>
      </div>
      <input style={{...s.input,marginBottom:8}} placeholder="Item name..." value={newItem.title} onChange={e=>setNewItem({...newItem,title:e.target.value})}/>
      <div style={{display:"flex",gap:5,marginBottom:8,flexWrap:"wrap"}}>
        {["Fashion","Beauty","Home","Tech","Travel","Food","Other"].map(cat=>(<button key={cat} style={{...s.navBtn(newItem.category===cat),padding:"4px 10px",fontSize:11}} onClick={()=>setNewItem({...newItem,category:cat})}>{cat}</button>))}
      </div>
      <div style={{display:"flex",gap:6,marginBottom:8}}>
        <input style={{...s.input,flex:1,fontSize:12}} placeholder="Custom category..." value={newCat} onChange={e=>setNewCat(e.target.value)}/>
        <button style={{...s.ghostBtn,padding:"8px 12px",fontSize:12}} onClick={()=>{if(newCat.trim()){setNewItem({...newItem,category:newCat.trim()});setNewCat("");}}}>Set</button>
      </div>
      <input style={{...s.input,marginBottom:8}} placeholder="Website URL (optional)" value={newItem.link} onChange={e=>setNewItem({...newItem,link:e.target.value})}/>
      <input style={{...s.input,marginBottom:8}} placeholder="Social @ (optional)" value={newItem.social} onChange={e=>setNewItem({...newItem,social:e.target.value})}/>
      <textarea style={{...s.textarea,minHeight:60,marginBottom:10}} placeholder="Notes..." value={newItem.notes} onChange={e=>setNewItem({...newItem,notes:e.target.value})}/>
      <div style={{display:"flex",gap:8}}><button style={s.pinkBtn} onClick={addItem}>Save 🛍️</button><button style={s.ghostBtn} onClick={()=>setShowAdd(false)}>Cancel</button></div>
    </div>)}
    {categories.length>1&&(<div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:12,paddingBottom:4}}>{categories.map(cat=>(<button key={cat} style={{...s.navBtn(filterCat===cat),flexShrink:0,fontSize:11,padding:"5px 12px"}} onClick={()=>setFilterCat(cat)}>{cat}</button>))}</div>)}
    {filtered.length===0&&<div style={{...s.card(),textAlign:"center",padding:32,color:c.muted}}>No items yet 🛍️</div>}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {filtered.map(item=>(<div key={item.id} style={{position:"relative",borderRadius:14,overflow:"hidden",cursor:"pointer",background:c.surface,border:`1px solid ${c.border}`}} onClick={()=>setSelItem(selItem?.id===item.id?null:item)}>
        {item.imgSrc?<img src={item.imgSrc} style={{width:"100%",aspectRatio:"1",objectFit:"cover",display:"block"}} alt=""/>:<div style={{aspectRatio:"1",background:`linear-gradient(135deg,${c.pink}22,${c.purple}22)`,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:32}}>🛍️</span></div>}
        <div style={{padding:"8px 10px"}}><div style={{fontSize:12,fontWeight:700,color:c.offwhite,marginBottom:2}}>{item.title}</div><div style={{fontSize:10,color:c.pink}}>{item.category}</div></div>
      </div>))}
    </div>
    {selItem&&!editItem&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:300,display:"flex",alignItems:"flex-end"}} onClick={()=>setSelItem(null)}>
      <div style={{...s.card(),width:"100%",maxWidth:520,margin:"0 auto",borderRadius:"20px 20px 0 0",maxHeight:"85vh",overflowY:"auto",paddingBottom:32}} onClick={e=>e.stopPropagation()}>
        {selItem.imgSrc&&<img src={selItem.imgSrc} style={{width:"100%",borderRadius:12,marginBottom:12}} alt=""/>}
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:c.offwhite,marginBottom:4}}>{selItem.title}</div>
        <div style={{fontSize:11,color:c.pink,marginBottom:12}}>{selItem.category}</div>
        {selItem.link&&<a href={selItem.link} target="_blank" rel="noreferrer" style={{display:"block",padding:"10px 14px",background:`${c.pink}22`,border:`1px solid ${c.pink}44`,borderRadius:10,color:c.pink,fontSize:12,marginBottom:8,textDecoration:"none"}}>🔗 Visit Website</a>}
        {selItem.social&&<div style={{padding:"10px 14px",background:`${c.purple}22`,border:`1px solid ${c.purple}44`,borderRadius:10,color:c.purple,fontSize:12,marginBottom:8}}>📱 {selItem.social}</div>}
        {selItem.notes&&<div style={{fontSize:12,color:c.muted,lineHeight:1.6,marginBottom:12}}>{selItem.notes}</div>}
        <div style={{display:"flex",gap:8}}>
          <button style={{...s.pinkBtn,flex:1}} onClick={()=>setEditItem({...selItem})}>✏️ Edit</button>
          <button style={{...s.ghostBtn,flex:1}} onClick={()=>setSelItem(null)}>Close</button>
          <button style={{...s.ghostBtn,color:c.danger,borderColor:c.danger}} onClick={()=>{update({wishlist:wishItems.filter(w=>w.id!==selItem.id)});setSelItem(null);}}>🗑️</button>
        </div>
      </div>
    </div>)}
    {editItem&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:300,display:"flex",alignItems:"flex-end"}} onClick={()=>setEditItem(null)}>
      <div style={{...s.card(),width:"100%",maxWidth:520,margin:"0 auto",borderRadius:"20px 20px 0 0",maxHeight:"90vh",overflowY:"auto",paddingBottom:32}} onClick={e=>e.stopPropagation()}>
        <div style={s.bigTitle}>✏️ Edit Item</div>
        <div style={{position:"relative",borderRadius:12,overflow:"hidden",marginBottom:10,background:c.surface,border:`2px dashed ${c.border}`,height:120,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
          {editItem.imgSrc?<img src={editItem.imgSrc} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>:<div style={{textAlign:"center"}}><div style={{fontSize:24}}>📷</div><div style={{fontSize:11,color:c.muted}}>Change photo</div></div>}
          <input type="file" accept="image/*" onChange={e=>handleImg(e,true)} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%",height:"100%"}}/>
        </div>
        <input style={{...s.input,marginBottom:8}} value={editItem.title} onChange={e=>setEditItem({...editItem,title:e.target.value})}/>
        <input style={{...s.input,marginBottom:8}} placeholder="Website URL" value={editItem.link||""} onChange={e=>setEditItem({...editItem,link:e.target.value})}/>
        <input style={{...s.input,marginBottom:8}} placeholder="Social @" value={editItem.social||""} onChange={e=>setEditItem({...editItem,social:e.target.value})}/>
        <textarea style={{...s.textarea,minHeight:60,marginBottom:10}} value={editItem.notes||""} onChange={e=>setEditItem({...editItem,notes:e.target.value})}/>
        <div style={{display:"flex",gap:8}}><button style={s.pinkBtn} onClick={saveEdit}>Save ✓</button><button style={s.ghostBtn} onClick={()=>setEditItem(null)}>Cancel</button></div>
      </div>
    </div>)}
  </div>);
});

// ── PROGRESS PHOTOS (multiple before & after) ──
const ProgressPhotosView=memo(({st,update,c,s})=>{
  const[phase,setPhase]=useState("before");
  const[editingQ,setEditingQ]=useState(false);const[localQ,setLocalQ]=useState([...st.photoQuestions]);
  useEffect(()=>setLocalQ([...st.photoQuestions]),[st.photoQuestions]);
  const pp=st.progressPhotos||{before:[],after:[],beforeAnswers:{},afterAnswers:{}};
  const photos=Array.isArray(pp[phase])?pp[phase]:pp[phase]?[pp[phase]]:[];
  const answers=phase==="before"?(pp.beforeAnswers||{}):(pp.afterAnswers||{});
  async function addPhotos(e){
    const files=Array.from(e.target.files);
    const b64s=await Promise.all(files.map(f=>compressImage(f)));
    update({progressPhotos:{...pp,[phase]:[...photos,...b64s]}});
  }
  function removePhoto(i){update({progressPhotos:{...pp,[phase]:photos.filter((_,j)=>j!==i)}});}
  function setAnswer(i,val){const key=phase==="before"?"beforeAnswers":"afterAnswers";update({progressPhotos:{...pp,[key]:{...answers,[i]:val}}});}
  return(<div className="fade">
    <div style={s.card(true)}>
      <div style={s.bigTitle}>📸 Progress Photos</div>
      <div style={{display:"flex",gap:8,marginBottom:16}}>
        <button style={{...s.tab(phase==="before"),flex:1}} onClick={()=>setPhase("before")}>Before 🌱</button>
        <button style={{...s.tab(phase==="after"),flex:1}} onClick={()=>setPhase("after")}>After 🦋</button>
      </div>
      {/* Add photos button */}
      <div style={{position:"relative",border:`2px dashed ${c.border}`,borderRadius:12,padding:14,textAlign:"center",marginBottom:12,cursor:"pointer"}}>
        <div style={{fontSize:13,color:c.muted}}>📷 Add {phase} photo(s) — tap to select multiple</div>
        <input type="file" accept="image/*" multiple onChange={addPhotos} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%",height:"100%"}}/>
      </div>
      {/* Photo grid */}
      {photos.length===0&&(<div style={{textAlign:"center",padding:"20px 0",color:c.muted,fontSize:12}}>No {phase} photos yet — add some! 📷</div>)}
      {photos.length>0&&(<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:14}}>
        {photos.map((src,i)=>(<div key={i} style={{position:"relative",borderRadius:10,overflow:"hidden",aspectRatio:"1"}}>
          <img src={src} style={{width:"100%",height:"100%",objectFit:"cover"}} alt=""/>
          <button onClick={()=>removePhoto(i)} style={{position:"absolute",top:2,right:2,background:`${c.bg}cc`,border:"none",color:c.danger,cursor:"pointer",fontSize:14,borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900}}>×</button>
        </div>))}
      </div>)}
      {/* Q&A */}
      <div style={s.sectionLabel}>✍️ {phase==="before"?"Before":"After"} Questions</div>
      {st.photoQuestions.map((q,i)=>(<div key={i} style={{marginBottom:12}}>
        <div style={{fontSize:12,color:c.pink,fontWeight:700,marginBottom:4}}>{q}</div>
        <textarea style={{...s.textarea,minHeight:60,fontSize:12}} placeholder="Write your answer..." value={answers[i]||""} onChange={e=>setAnswer(i,e.target.value)}/>
      </div>))}
      {editingQ?(<div style={{marginTop:8}}>
        {localQ.map((q,i)=>(<div key={i} style={{display:"flex",gap:6,marginBottom:8}}>
          <input style={{...s.input,flex:1}} value={q} onChange={e=>{const u=[...localQ];u[i]=e.target.value;setLocalQ(u);}}/>
          <button onClick={()=>setLocalQ(localQ.filter((_,j)=>j!==i))} style={{background:"transparent",border:"none",color:c.danger,cursor:"pointer",fontSize:18}}>×</button>
        </div>))}
        <div style={{display:"flex",gap:8,marginTop:8}}>
          <button style={s.pinkBtn} onClick={()=>{update({photoQuestions:localQ});setEditingQ(false);}}>Save</button>
          <button style={s.ghostBtn} onClick={()=>setEditingQ(false)}>Cancel</button>
        </div>
        <button style={{...s.ghostBtn,marginTop:8,width:"100%"}} onClick={()=>setLocalQ([...localQ,""])}>+ Add Question</button>
      </div>):(<button style={{...s.ghostBtn,marginTop:8,width:"100%",fontSize:12}} onClick={()=>setEditingQ(true)}>✏️ Edit Questions</button>)}
    </div>
    {/* Side by side comparison — show first photo of each */}
    {(Array.isArray(pp.before)?pp.before.length>0:!!pp.before)&&(Array.isArray(pp.after)?pp.after.length>0:!!pp.after)&&(<div style={s.card()}>
      <div style={s.sectionLabel}>✨ Your Transformation</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div><div style={{fontSize:10,color:c.muted,textAlign:"center",marginBottom:4}}>BEFORE 🌱</div><img src={Array.isArray(pp.before)?pp.before[0]:pp.before} style={{width:"100%",borderRadius:12}} alt="before"/></div>
        <div><div style={{fontSize:10,color:c.muted,textAlign:"center",marginBottom:4}}>AFTER 🦋</div><img src={Array.isArray(pp.after)?pp.after[0]:pp.after} style={{width:"100%",borderRadius:12}} alt="after"/></div>
      </div>
    </div>)}
  </div>);
});

// ── SETTINGS ──
const SettingsView=memo(({st,update,c,s,grad,gradBtn,syncStatus})=>{
  const[localDays,setLocalDays]=useState(st.totalDays);const[localStart,setLocalStart]=useState(st.startDate);
  const[newHabit,setNewHabit]=useState("");
  const[archiveName,setArchiveName]=useState("");const[showArchive,setShowArchive]=useState(false);const[viewArchive,setViewArchive]=useState(null);
  function saveAndReset(){
    const name=archiveName.trim()||`Round ${(st.challengeArchives||[]).length+1}`;
    const snap={id:Date.now(),name,savedAt:new Date().toISOString(),startDate:st.startDate,totalDays:st.totalDays,dayData:st.dayData,dailyPhotos:st.dailyPhotos,progressPhotos:st.progressPhotos,habits:st.habits,mission:st.mission,goals:st.goals,affirmations:st.affirmations,weeklyIntentions:st.weeklyIntentions};
    const archives=[...(st.challengeArchives||[]),snap];
    const fresh={...DEFAULT_STATE,accent:st.accent,secondary:st.secondary,bgColor:st.bgColor,challengeArchives:archives};
    try{localStorage.setItem(LOCAL_KEY,JSON.stringify(fresh));window.location.reload();}
    catch(e){alert("Could not save — try exporting a backup first.");}
  }
  function updateHabitDays(id,days){update({habits:st.habits.map(h=>h.id===id?{...h,daysPerWeek:days}:h)});}
  function exportData(){
    try{const blob=new Blob([localStorage.getItem(LOCAL_KEY)||"{}"],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="75hard-backup.json";a.click();URL.revokeObjectURL(url);}
    catch(e){alert("Export failed");}
  }
  async function importData(e){
    const file=e.target.files[0];if(!file)return;
    try{const text=await file.text();const data=JSON.parse(text);localStorage.setItem(LOCAL_KEY,text);window.location.reload();}
    catch(e){alert("Invalid backup file — please use a 75 Hard backup JSON");}
  }
  return(<div className="fade">
    <div style={s.card()}>
      <div style={s.bigTitle}>🎨 Color Studio</div>
      <div style={{height:12,borderRadius:10,marginBottom:20,overflow:"hidden",background:`linear-gradient(90deg,${c.pink},${c.purple},${adj(c.pink,15)},${c.purple})`,boxShadow:`0 0 20px ${c.pink}55`}}/>
      <ColorPicker label="✨ Accent" hint="buttons & highlights" value={st.accent} onChange={v=>update({accent:v})} c={c}/>
      <ColorPicker label="💜 Secondary" hint="gradients" value={st.secondary} onChange={v=>update({secondary:v})} c={c}/>
      <ColorPicker label="🌙 Background" hint="app background" value={st.bgColor} onChange={v=>update({bgColor:v})} c={c}/>
      <div style={{...s.sectionLabel,marginTop:4}}>Quick Presets</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {PRESETS.map(p=>{const active=st.accent===p.accent&&st.secondary===p.secondary;return(
          <button key={p.name} onClick={()=>update({accent:p.accent,secondary:p.secondary,bgColor:p.bg})} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:12,border:`1px solid ${active?p.accent:c.border}`,background:active?`${p.accent}22`:c.surface,cursor:"pointer",fontFamily:"'Nunito',sans-serif",transition:"all .2s"}}>
            <div style={{display:"flex",gap:3}}>{[p.accent,p.secondary,p.bg].map((col,i)=>(<div key={i} style={{width:13,height:13,borderRadius:"50%",background:col,border:i===2?`1px solid ${c.border}`:"none"}}/>))}</div>
            <span style={{fontSize:11,color:c.offwhite,fontWeight:600}}>{p.name}</span>
          </button>
        );})}
      </div>
    </div>
    <div style={s.card()}>
      <div style={s.bigTitle}>My Habits 🌸</div>
      <div style={{fontSize:11,color:c.muted,marginBottom:10}}>Set days/week — skipped days won't affect your score.</div>
      {st.habits.map((h,i)=>(<div key={h.id} style={{...s.habitRow,cursor:"default",borderBottom:i===st.habits.length-1?"none":`1px solid ${c.borderSoft}`,flexWrap:"wrap",gap:8}}>
        <span style={{flex:1,fontSize:13,color:c.offwhite,minWidth:100}}>{h.icon} {h.label}</span>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <span style={{fontSize:10,color:c.muted}}>Days/wk:</span>
          <div style={{display:"flex",gap:2}}>
            {[1,2,3,4,5,6,7].map(d=>(<button key={d} onClick={()=>updateHabitDays(h.id,d)} style={{width:22,height:22,borderRadius:6,border:`1px solid ${(h.daysPerWeek||7)===d?c.pink:c.border}`,background:(h.daysPerWeek||7)===d?`${c.pink}33`:"transparent",color:(h.daysPerWeek||7)===d?c.pink:c.muted,fontSize:9,cursor:"pointer",fontWeight:700,fontFamily:"'Nunito',sans-serif"}}>{d}</button>))}
          </div>
          <button style={{background:"transparent",border:"none",color:c.muted,cursor:"pointer",fontSize:18,marginLeft:4}} onClick={()=>update({habits:st.habits.filter(x=>x.id!==h.id)})}>×</button>
        </div>
      </div>))}
      <div style={{display:"flex",gap:8,marginTop:14}}>
        <input style={{...s.input,flex:1}} placeholder="Add a new habit..." value={newHabit} onChange={e=>setNewHabit(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&newHabit.trim()){update({habits:[...st.habits,{id:Date.now(),label:newHabit.trim(),icon:"✨",daysPerWeek:7}]});setNewHabit("");}}}/>
        <button style={s.pinkBtn} onClick={()=>{if(newHabit.trim()){update({habits:[...st.habits,{id:Date.now(),label:newHabit.trim(),icon:"✨",daysPerWeek:7}]});setNewHabit("");}}}>Add</button>
      </div>
    </div>
    <div style={s.card()}>
      <div style={s.bigTitle}>Challenge Setup ⚙️</div>
      <div style={{marginBottom:14}}><div style={{...s.sectionLabel,marginBottom:6}}>Total Days</div><input type="number" style={s.input} value={localDays} min={1} max={365} onChange={e=>setLocalDays(Number(e.target.value))} onBlur={()=>update({totalDays:localDays})}/></div>
      <div><div style={{...s.sectionLabel,marginBottom:6}}>Start Date</div><input type="date" style={s.input} value={localStart} onChange={e=>setLocalStart(e.target.value)} onBlur={()=>update({startDate:localStart})}/></div>
      {(()=>{const end=new Date(localStart||st.startDate);end.setDate(end.getDate()+(localDays||st.totalDays)-1);return(<div style={{marginTop:12,padding:"10px 14px",background:`${c.pink}12`,border:`1px solid ${c.pink}33`,borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:11,color:c.muted}}>🏁 Challenge End Date</span><span style={{fontSize:13,fontWeight:700,color:c.pink}}>{end.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span></div>);})()}
    </div>
    <div style={s.card()}>
      <div style={s.bigTitle}>💾 Data Backup</div>
      <div style={{fontSize:12,color:c.muted,marginBottom:12,lineHeight:1.6}}>Export your data as a backup file. Use Import to restore it on a new device or browser.</div>
      <button style={{...s.pinkBtn,width:"100%",marginBottom:10}} onClick={exportData}>📤 Export Backup</button>
      <div style={{position:"relative",border:`1px solid ${c.border}`,borderRadius:12,padding:12,textAlign:"center",cursor:"pointer"}}>
        <span style={{fontSize:13,color:c.muted}}>📥 Import Backup</span>
        <input type="file" accept=".json" onChange={importData} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%",height:"100%"}}/>
      </div>
    </div>
    <div style={s.card()}>
      <div style={s.bigTitle}>🏆 Challenge Archives</div>
      <div style={{fontSize:12,color:c.muted,marginBottom:12,lineHeight:1.6}}>Finished a round? Save everything to an archive, then start fresh — your old progress is kept safe inside the app.</div>
      {!showArchive?(<button style={{...s.pinkBtn,width:"100%"}} onClick={()=>setShowArchive(true)}>🎀 Complete & Archive Challenge</button>):(
        <div style={{padding:14,background:c.surface,border:`1px solid ${c.pink}55`,borderRadius:14}}>
          <div style={{fontSize:12,color:c.offwhite,marginBottom:10,fontWeight:700}}>Name this round:</div>
          <input style={{...s.input,marginBottom:12}} placeholder={`Round ${(st.challengeArchives||[]).length+1} 🌸`} value={archiveName} onChange={e=>setArchiveName(e.target.value)}/>
          <div style={{fontSize:11,color:c.muted,marginBottom:12}}>⚠️ This will save all your current data and reset the app for a new 75 Hard. Your theme colors stay the same.</div>
          <div style={{display:"flex",gap:8}}>
            <button style={s.pinkBtn} onClick={saveAndReset}>Save & Start Fresh ✨</button>
            <button style={s.ghostBtn} onClick={()=>setShowArchive(false)}>Cancel</button>
          </div>
        </div>
      )}
      {(st.challengeArchives||[]).length>0&&(<div style={{marginTop:14}}>
        <div style={{...s.sectionLabel,marginBottom:8}}>Past Challenges</div>
        {(st.challengeArchives||[]).map((a,i)=>(<div key={a.id} style={{padding:"10px 14px",background:c.surface,border:`1px solid ${c.border}`,borderRadius:12,marginBottom:8,cursor:"pointer"}} onClick={()=>setViewArchive(viewArchive?.id===a.id?null:a)}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontSize:13,fontWeight:700,color:c.offwhite}}>{a.name}</div><div style={{fontSize:10,color:c.muted,marginTop:2}}>{new Date(a.startDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})} · {a.totalDays} days</div></div>
            <div style={{fontSize:12,color:c.pink,fontWeight:700}}>{Object.values(a.dayData||{}).filter(d=>d.manualPct===100||(!d.manualPct&&Object.values(d.habits||{}).every(Boolean))).length}/{a.totalDays} ✓</div>
          </div>
          {viewArchive?.id===a.id&&(<div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${c.border}`}}>
            <div style={{fontSize:11,color:c.muted,marginBottom:6}}>Habits tracked: {a.habits?.map(h=>h.icon).join(" ")}</div>
            <button style={{...s.ghostBtn,fontSize:11,padding:"6px 14px",color:c.danger,borderColor:c.danger}} onClick={e=>{e.stopPropagation();if(window.confirm("Delete this archive? 💔")){update({challengeArchives:(st.challengeArchives||[]).filter(x=>x.id!==a.id)});setViewArchive(null);}}}>🗑️ Delete Archive</button>
          </div>)}
        </div>))}
      </div>)}
    </div>
    <div style={s.card()}>
      <div style={s.bigTitle}>Data 🗂️</div>
      <button style={{...s.ghostBtn,color:c.danger,borderColor:c.danger,width:"100%"}} onClick={()=>{if(window.confirm("Reset all progress? 💔")){localStorage.removeItem(LOCAL_KEY);window.location.reload();}}}>Reset All Progress 🗑️</button>
    </div>
  </div>);
});

// ── MAIN APP ──
export default function App(){
  const[appState,setAppState]=useState(()=>({...DEFAULT_STATE,...(loadData()||{})}));
  const[view,setView]=useState("overview");
  const[syncStatus,setSyncStatus]=useState("synced");
  const saveTimer=useRef(null);

  // Single stable update function — saves everything to localStorage
  const update=useCallback((changes)=>{
    setAppState(prev=>{
      const next={...prev,...changes};
      clearTimeout(saveTimer.current);
      setSyncStatus("saving");
      saveTimer.current=setTimeout(()=>{
        try{localStorage.setItem(LOCAL_KEY,JSON.stringify(next));setSyncStatus("synced");}
        catch(e){console.error("Save error:",e);setSyncStatus("error");}
      },300);
      return next;
    });
  },[]);

  // Day data update helper
  const updateDay=useCallback((day,changes)=>{
    setAppState(prev=>{
      const key=`day_${day}`;
      const cur=prev.dayData[key]||getInitialDay(prev.habits);
      const next={...prev,dayData:{...prev.dayData,[key]:{...cur,...changes}}};
      clearTimeout(saveTimer.current);
      setSyncStatus("saving");
      saveTimer.current=setTimeout(()=>{
        try{localStorage.setItem(LOCAL_KEY,JSON.stringify(next));setSyncStatus("synced");}
        catch(e){setSyncStatus("error");}
      },300);
      return next;
    });
  },[]);

  const st=appState;
  const c=buildColors(st.accent,st.secondary,st.bgColor);
  const grad=`linear-gradient(135deg,${c.pink},${c.purple})`;
  const gradBtn=`linear-gradient(135deg,${c.pinkHot},${c.purpleDark})`;

  // ── Computed helpers ──
  function isHabitApplicable(habit,day){
    const dpw=habit.daysPerWeek||7;if(dpw===7)return true;
    const dow=((day-1)%7)+1;return dow<=dpw;
  }
  function getDayPct(day){
    const d=st.dayData[`day_${day}`]||getInitialDay(st.habits);
    if(d.restDay)return -1;
    if(d.manualPct!=null)return d.manualPct;
    const applicable=st.habits.filter(h=>isHabitApplicable(h,day));
    if(!applicable.length)return 0;
    return Math.round((applicable.filter(h=>d.habits[h.id]).length/applicable.length)*100);
  }
  function getCurrentDay(){const diff=Math.floor((new Date()-new Date(st.startDate))/86400000)+1;return Math.min(Math.max(diff,1),st.totalDays);}
  function getStreak(){let s=0;for(let i=1;i<=st.totalDays;i++){const p=getDayPct(i);if(p===100||p===-1)s++;else break;}return s;}
  function getHabitStreak(hid){let s=0;const cd=getCurrentDay();for(let i=cd;i>=1;i--){const d=st.dayData[`day_${i}`]||getInitialDay(st.habits);if(d.restDay){s++;continue;}if(d.habits[hid])s++;else break;}return s;}

  const currentDay=getCurrentDay(),streak=getStreak();
  const completedDays=Array.from({length:st.totalDays},(_,i)=>i+1).filter(d=>getDayPct(d)===100).length;
  const isDayView=view.startsWith("day-"),dayNum=isDayView?parseInt(view.split("-")[1]):null;

  function dayDotStyle(day,pct,cur,dn,c,grad){
    const isA=isDayView&&day===dn,isCur=day===cur,done=pct===100,partial=pct>0&&pct<100,rest=pct===-1;
    return{width:"100%",aspectRatio:"1",borderRadius:6,background:rest?`${c.rest}44`:done?grad:partial?`${c.pink}55`:isCur?`${c.pink}12`:c.surface,border:isA?`2px solid ${c.pink}`:rest?`1px solid ${c.rest}`:isCur&&!done?`1px solid ${c.pinkHot}`:`1px solid ${c.borderSoft}`,cursor:"pointer",fontSize:6.5,color:rest?c.rest:done?"#fff":c.dim,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,transition:"all .15s",boxShadow:done?`0 0 6px ${c.pink}44`:rest?`0 0 6px ${c.rest}44`:"none"};
  }

  const s={
    root:{fontFamily:"'Nunito',sans-serif",background:c.bg,color:c.white,minHeight:"100vh",maxWidth:520,margin:"0 auto",backgroundImage:`radial-gradient(ellipse at 15% 0%,${c.pink}15 0%,transparent 55%),radial-gradient(ellipse at 85% 100%,${c.purple}10 0%,transparent 55%)`},
    header:{background:c.dark?`linear-gradient(180deg,${adj(c.bg,10)} 0%,${c.bg} 100%)`:`linear-gradient(180deg,${adj(c.bg,-8)} 0%,${c.bg} 100%)`,borderBottom:`1px solid ${c.border}`,padding:"14px 16px 10px",position:"sticky",top:0,zIndex:100},
    logo:{fontFamily:"'Playfair Display',serif",fontSize:24,fontStyle:"italic",background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1.1},
    logoSub:{fontSize:9,color:c.muted,letterSpacing:3,textTransform:"uppercase",marginTop:1},
    navBtn:(active)=>({padding:"5px 11px",borderRadius:20,border:`1px solid ${active?c.pink:c.border}`,background:active?`${c.pink}22`:"transparent",color:active?c.pink:c.muted,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer"}),
    content:{padding:"16px 14px 100px"},
    card:(glow)=>({background:`linear-gradient(145deg,${c.card} 0%,${c.cardAlt} 100%)`,border:`1px solid ${c.border}`,borderRadius:18,padding:"16px",marginBottom:10,boxShadow:glow?`0 0 28px ${c.pink}18,inset 0 1px 0 ${c.border}`:`inset 0 1px 0 ${c.borderSoft}`}),
    sectionLabel:{fontSize:9,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:c.muted,marginBottom:10},
    bigTitle:{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:22,background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:8},
    statRow:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10},
    statBox:{background:`linear-gradient(145deg,${c.card},${c.cardAlt})`,border:`1px solid ${c.border}`,borderRadius:14,padding:"12px 8px",textAlign:"center"},
    statNum:{fontFamily:"'Playfair Display',serif",fontSize:34,background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1},
    statLabel:{fontSize:9,color:c.muted,letterSpacing:2,marginTop:3,textTransform:"uppercase"},
    progressTrack:{height:8,borderRadius:4,background:c.border,overflow:"hidden"},
    progressFill:(pct)=>({height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${c.pinkHot},${c.purple})`,borderRadius:4,transition:"width .5s cubic-bezier(.22,.68,0,1.2)",boxShadow:`0 0 8px ${c.pink}55`}),
    habitRow:{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:`1px solid ${c.borderSoft}`,cursor:"pointer"},
    checkbox:(checked)=>({width:24,height:24,borderRadius:8,border:`2px solid ${checked?c.pink:c.border}`,background:checked?gradBtn:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .25s",boxShadow:checked?`0 0 10px ${c.pink}55`:"none"}),
    textarea:{width:"100%",background:c.surface,border:`1px solid ${c.border}`,borderRadius:12,padding:"12px 14px",fontSize:13,lineHeight:1.7,resize:"vertical",minHeight:90,outline:"none"},
    input:{width:"100%",background:c.surface,border:`1px solid ${c.border}`,borderRadius:10,padding:"9px 13px",fontSize:13,outline:"none"},
    pinkBtn:{background:gradBtn,color:"#fff",border:"none",borderRadius:12,padding:"10px 20px",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer",boxShadow:`0 4px 18px ${c.pink}44`},
    ghostBtn:{background:"transparent",color:c.muted,border:`1px solid ${c.border}`,borderRadius:12,padding:"10px 20px",fontFamily:"'Nunito',sans-serif",fontSize:13,cursor:"pointer"},
    tab:(active)=>({flex:1,padding:"8px 4px",borderRadius:12,border:`1px solid ${active?c.pink:c.border}`,background:active?`${c.pink}22`:"transparent",color:active?c.pink:c.muted,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer",textAlign:"center"}),
    dayDot:(day,pct,cur,dn,c,grad)=>dayDotStyle(day,pct,cur,dn,c,grad),
    bottomNav:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:520,background:c.dark?`linear-gradient(180deg,transparent 0%,${c.bg}ee 20%,${c.bg} 100%)`:`${c.bg}f8`,borderTop:`1px solid ${c.border}`,display:"flex",padding:"8px 8px 24px",gap:4,zIndex:200,overflowX:"auto"},
    bottomBtn:(active)=>({flexShrink:0,padding:"6px 4px",borderRadius:10,border:`1px solid ${active?c.pink:c.border}`,background:active?`${c.pink}22`:"transparent",color:active?c.pink:c.muted,fontSize:9,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer",textAlign:"center",minWidth:44}),
    todayBtn:{flexShrink:0,padding:"6px 8px",borderRadius:10,border:"none",background:gradBtn,color:"#fff",fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer",boxShadow:`0 4px 18px ${c.pink}44`,minWidth:60},
  };

  const css=`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Nunito:wght@300;400;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    html,body{background:${c.bg};-webkit-tap-highlight-color:transparent;overscroll-behavior:none;}
    ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:${c.pink};border-radius:2px;}
    .fade{animation:fu .3s cubic-bezier(.22,.68,0,1.2) both;}
    @keyframes fu{from{opacity:0;transform:translateY(12px) scale(.98);}to{opacity:1;transform:none;}}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
    .pulse{animation:pulse 1.4s ease infinite;}
    @keyframes starPop{0%{transform:scale(0);}60%{transform:scale(1.3);}100%{transform:scale(1);}}
    .star-pop{animation:starPop .4s cubic-bezier(.22,.68,0,1.2) both;}
    textarea,input[type=text],input[type=number],input[type=date]{font-family:'Nunito',sans-serif;color:${c.offwhite};}
    input[type=date]::-webkit-calendar-picker-indicator{filter:${c.dark?"invert(1) sepia(1) saturate(3) hue-rotate(280deg)":"none"};opacity:.7;}
    canvas{touch-action:none;}select{font-family:'Nunito',sans-serif;}
  `;

  function SaveBadge(){
    const map={saving:["🔄","Saving...",c.purple],synced:["💾","Saved",c.pink],error:["⚠️","Save Error",c.danger]};
    const[icon,label,color]=map[syncStatus]||map.synced;
    return(<div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color,background:`${color}18`,border:`1px solid ${color}44`,padding:"3px 8px",borderRadius:10}}>
      <span className={syncStatus==="saving"?"pulse":""}>{icon}</span><span style={{fontWeight:700}}>{label}</span>
    </div>);
  }

  const navItems=[
    {id:"overview",icon:"🏠",label:"Home"},
    {id:"affirmations",icon:"💭",label:"Affirm"},
    {id:"intentions",icon:"🗓️",label:"Week"},
    {id:"report",icon:"📊",label:"Report"},
    {id:"goals",icon:"🎯",label:"Goals"},
    {id:"vision",icon:"✨",label:"Vision"},
    {id:"wishlist",icon:"🛍️",label:"Wish"},
    {id:"photos",icon:"📸",label:"Photos"},
    {id:"settings",icon:"🎨",label:"Setup"},
  ];

  return(<><style>{css}</style>
    <div style={s.root}>
      <div style={s.header}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:isDayView?10:0}}>
          <div><div style={s.logo}>75 Hard ✨</div><div style={s.logoSub}>your rules · your glow up</div></div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}><SaveBadge/><button style={s.navBtn(view==="settings")} onClick={()=>setView("settings")}>🎨</button></div>
        </div>
        {isDayView&&(<div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:2}}>
          {[-2,-1,0,1,2].map(offset=>{const d=dayNum+offset;if(d<1||d>st.totalDays)return null;const isA=d===dayNum;
            return(<button key={d} style={{padding:"4px 10px",borderRadius:10,border:`1px solid ${isA?c.pink:c.border}`,background:isA?`${c.pink}22`:"transparent",color:isA?c.pink:c.muted,fontSize:11,cursor:"pointer",flexShrink:0,fontWeight:700}} onClick={()=>setView(`day-${d}`)}>D{d}</button>);})}
        </div>)}
      </div>
      <div style={s.content}>
        {view==="overview"&&<OverviewView st={st} update={update} updateDay={updateDay} getDayPct={getDayPct} getHabitStreak={getHabitStreak} currentDay={currentDay} streak={streak} completedDays={completedDays} setView={setView} c={c} s={s} grad={grad}/>}
        {isDayView&&<DayView key={dayNum} st={st} day={dayNum} currentDay={currentDay} updateDay={updateDay} update={update} getDayPct={getDayPct} setView={setView} c={c} s={s} grad={grad}/>}
        {view==="affirmations"&&<AffirmationsView affirmations={st.affirmations} update={update} c={c} s={s}/>}
        {view==="intentions"&&<WeeklyIntentionView st={st} update={update} currentDay={currentDay} c={c} s={s}/>}
        {view==="report"&&<WeeklyReportView st={st} getDayPct={getDayPct} currentDay={currentDay} c={c} s={s} grad={grad}/>}
        {view==="goals"&&<GoalsView goals={st.goals} update={update} c={c} s={s} grad={grad}/>}
        {view==="vision"&&<VisionBoardView st={st} update={update} c={c} s={s} grad={grad}/>}
        {view==="wishlist"&&<WishlistView st={st} update={update} c={c} s={s} grad={grad}/>}
        {view==="photos"&&<ProgressPhotosView st={st} update={update} c={c} s={s}/>}
        {view==="settings"&&<SettingsView st={st} update={update} c={c} s={s} grad={grad} gradBtn={gradBtn} syncStatus={syncStatus}/>}
      </div>
      <div style={s.bottomNav}>
        {navItems.map(n=>(<button key={n.id} style={s.bottomBtn(view===n.id)} onClick={()=>setView(n.id)}>
          <div style={{fontSize:13}}>{n.icon}</div><div style={{fontSize:8,marginTop:1}}>{n.label}</div>
        </button>))}
        <button style={s.todayBtn} onClick={()=>setView(`day-${currentDay}`)}>
          <div style={{fontSize:13}}>🌸</div><div style={{fontSize:8,marginTop:1}}>Day {currentDay}</div>
        </button>
      </div>
    </div>
  </>);
}
