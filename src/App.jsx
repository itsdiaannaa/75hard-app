import { useState, useEffect, useRef, useCallback, memo } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://etiawaxyofraaqtpjypp.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0aWF3YXh5b2ZyYWFxdHBqeXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwMjYwMjMsImV4cCI6MjA5NTYwMjAyM30.NQVAlA1yUlL1xyjdmLPKZ5iOgOuA0X5XWFhmXT2gMfo";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const DEFAULT_HABITS = [
  { id: 1, label: "45 min workout", icon: "🏋️‍♀️" },
  { id: 2, label: "Read 10 pages", icon: "📖" },
  { id: 3, label: "No alcohol", icon: "🚫🍷" },
  { id: 4, label: "Drink 1 gallon water", icon: "💧" },
  { id: 5, label: "Follow my diet", icon: "🥗" },
  { id: 6, label: "Cold shower", icon: "🧊" },
  { id: 7, label: "Skincare routine", icon: "✨" },
];

const DEFAULT_MISSION = "I am becoming the most disciplined, powerful version of myself. Every single day I choose growth over comfort, clarity over chaos, and strength over excuses. This is my era. 💫";

const PRESETS = [
  { name: "Girly Pink 🌸", accent: "#ec4899", secondary: "#c084fc", bg: "#0d0010" },
  { name: "Rose Gold 🌹", accent: "#f43f5e", secondary: "#fb923c", bg: "#120008" },
  { name: "Ocean Dream 🌊", accent: "#38bdf8", secondary: "#818cf8", bg: "#020c1b" },
  { name: "Sage Green 🌿", accent: "#4ade80", secondary: "#a3e635", bg: "#051205" },
  { name: "Sunset ☀️", accent: "#fb923c", secondary: "#f472b6", bg: "#100500" },
  { name: "Lavender ☁️", accent: "#a78bfa", secondary: "#e879f9", bg: "#07030f" },
  { name: "Clean White 🤍", accent: "#ec4899", secondary: "#8b5cf6", bg: "#fafafa" },
  { name: "Blush 🩷", accent: "#f472b6", secondary: "#fb7185", bg: "#fff0f5" },
];

const MOODS = [
  { emoji: "🔥", label: "Crushed it" }, { emoji: "💪", label: "Strong" },
  { emoji: "🌸", label: "Good day" }, { emoji: "😊", label: "Happy" },
  { emoji: "😐", label: "Okay" }, { emoji: "😴", label: "Tired" },
  { emoji: "😤", label: "Pushed" }, { emoji: "💔", label: "Tough day" },
];

// ── COLOR UTILS ──
function hexToHsl(hex) {
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

function getDayKey(d){return`day_${d}`;}
function getWeekKey(d){return`week_${Math.ceil(d/7)}`;}
function getInitialDay(habits){return{habits:habits.reduce((a,h)=>({...a,[h.id]:false}),{}),journal:"",journalCanvas:"",trading:"",mood:"",restDay:false,photos:[]};}
function fileToBase64(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});}
function checkBingoRows(card){const rows=[];for(let r=0;r<5;r++){if(card.slice(r*5,(r+1)*5).every(c=>c.done))rows.push(r);}return rows;}

// ── STABLE CHILD COMPONENTS (defined outside App to prevent re-mount on each keystroke) ──

const ColorPicker = memo(({ label, hint, value, onChange, c }) => {
  const[h,sat,l]=hexToHsl(value);
  return(
    <div style={{marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div>
          <div style={{fontSize:13,fontWeight:700,color:c.offwhite}}>{label}</div>
          <div style={{fontSize:10,color:c.muted,marginTop:1}}>{hint}</div>
        </div>
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
          <div style={{cursor:"pointer",borderRadius:12,overflow:"hidden",position:"relative",height:type==="hue"?26:22}}
            onClick={e=>{
              const r=e.currentTarget.getBoundingClientRect();const pct=(e.clientX-r.left)/r.width;
              if(type==="hue")onChange(hslToHex(Math.round(pct*360),Math.max(sat,55),Math.max(Math.min(l,70),35)));
              else if(type==="light")onChange(hslToHex(h,sat,Math.round(pct*100)));
              else onChange(hslToHex(h,Math.round(pct*100),l));
            }}>
            <div style={{position:"absolute",inset:0,borderRadius:12,background:
              type==="hue"?"linear-gradient(90deg,hsl(0,80%,55%),hsl(45,80%,55%),hsl(90,80%,55%),hsl(135,80%,55%),hsl(180,80%,55%),hsl(225,80%,55%),hsl(270,80%,55%),hsl(315,80%,55%),hsl(360,80%,55%))":
              type==="light"?`linear-gradient(90deg,#000,${hslToHex(h,80,50)},#fff)`:
              `linear-gradient(90deg,${hslToHex(h,0,l)},${hslToHex(h,100,l)})`}}/>
            <div style={{position:"absolute",top:"50%",left:`${type==="hue"?(h/360)*100:type==="light"?l:sat}%`,transform:"translate(-50%,-50%)",
              width:type==="hue"?20:18,height:type==="hue"?20:18,borderRadius:"50%",border:"2.5px solid #fff",background:value,boxShadow:"0 0 6px rgba(0,0,0,.5)",pointerEvents:"none"}}/>
          </div>
        </div>
      ))}
    </div>
  );
});

const JournalCanvas = memo(({ day, getDayData, updateDayData, c, s }) => {
  const canvasRef=useRef(null);
  const isDrawing=useRef(false);
  const lastPos=useRef(null);
  const[tool,setTool]=useState("pen");
  const[inkColor,setInkColor]=useState(c.pink);
  const[lineWidth,setLineWidth]=useState(2);
  const[showTyped,setShowTyped]=useState(false);
  const data=getDayData(day);
  const[typed,setTyped]=useState(data.journal||"");

  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext("2d");
    canvas.width=canvas.offsetWidth*window.devicePixelRatio;
    canvas.height=canvas.offsetHeight*window.devicePixelRatio;
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
  function endDraw(){if(!isDrawing.current)return;isDrawing.current=false;updateDayData(day,{journalCanvas:canvasRef.current.toDataURL("image/png")});}
  function clearCanvas(){
    const canvas=canvasRef.current;const ctx=canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle=c.surface;ctx.fillRect(0,0,canvas.offsetWidth,canvas.offsetHeight);
    for(let y=32;y<canvas.offsetHeight;y+=32){ctx.beginPath();ctx.strokeStyle=c.border;ctx.lineWidth=0.5;ctx.moveTo(16,y);ctx.lineTo(canvas.offsetWidth-16,y);ctx.stroke();}
    updateDayData(day,{journalCanvas:""});
  }
  const tools=[{id:"pen",icon:"✒️",lw:2},{id:"marker",icon:"🖊️",lw:5},{id:"highlighter",icon:"🌟",lw:14},{id:"eraser",icon:"⬜",lw:20}];
  const colors=[c.pink,c.purple,"#ffffff","#000000","#fbbf24","#4ade80","#60a5fa","#f87171"];
  return(
    <div style={s.card()}>
      <div style={s.bigTitle}>📓 Journal</div>
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        <button style={s.tab(!showTyped)} onClick={()=>setShowTyped(false)}>✏️ Handwrite</button>
        <button style={s.tab(showTyped)} onClick={()=>setShowTyped(true)}>⌨️ Type</button>
      </div>
      {!showTyped?(
        <>
          <div style={{display:"flex",gap:5,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
            {tools.map(t=>(<button key={t.id} onClick={()=>{setTool(t.id);setLineWidth(t.lw);}}
              style={{padding:"5px 8px",borderRadius:10,border:`1px solid ${tool===t.id?c.pink:c.border}`,background:tool===t.id?`${c.pink}22`:c.surface,fontSize:15,cursor:"pointer"}}>{t.icon}</button>))}
            <div style={{display:"flex",gap:3,marginLeft:"auto",flexWrap:"wrap"}}>
              {colors.map(col=>(<div key={col} onClick={()=>{setInkColor(col);if(tool==="eraser")setTool("pen");}}
                style={{width:20,height:20,borderRadius:"50%",background:col,cursor:"pointer",border:`2px solid ${inkColor===col?c.white:c.border}`,boxShadow:inkColor===col?`0 0 8px ${col}88`:"none",transition:"all .15s"}}/>))}
            </div>
            <button onClick={clearCanvas} style={{padding:"5px 8px",borderRadius:10,border:`1px solid ${c.danger}`,background:"transparent",color:c.danger,fontSize:11,cursor:"pointer",fontFamily:"'Nunito',sans-serif"}}>Clear</button>
          </div>
          <div style={{position:"relative",borderRadius:12,overflow:"hidden",border:`1px solid ${c.border}`}}>
            <canvas ref={canvasRef} style={{width:"100%",height:300,display:"block",touchAction:"none",cursor:tool==="eraser"?"cell":"crosshair"}}
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
              onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}/>
            <div style={{position:"absolute",top:6,right:6,fontSize:9,color:c.muted,background:`${c.bg}aa`,padding:"2px 6px",borderRadius:6}}>🍎 Apple Pencil ready</div>
          </div>
        </>
      ):(
        <>
          <textarea style={{...s.textarea,minHeight:280}} placeholder={"Dear diary... 🌸\n\nToday I felt...\n\nI'm proud of myself for...\n\nTomorrow I will..."}
            value={typed} onChange={e=>setTyped(e.target.value)} onBlur={()=>updateDayData(day,{journal:typed})}/>
          <button style={{...s.pinkBtn,marginTop:10}} onClick={()=>updateDayData(day,{journal:typed})}>Save 💾</button>
        </>
      )}
    </div>
  );
});

const DayPhotos = memo(({ day, dailyPhotos, setDailyPhotosS, c, s }) => {
  const photos=dailyPhotos[`day_${day}`]||[];
  async function addPhoto(e){
    const files=Array.from(e.target.files);
    const b64s=await Promise.all(files.map(fileToBase64));
    const updated={...dailyPhotos,[`day_${day}`]:[...photos,...b64s]};
    setDailyPhotosS(updated);
  }
  function removePhoto(i){
    const updated={...dailyPhotos,[`day_${day}`]:photos.filter((_,j)=>j!==i)};
    setDailyPhotosS(updated);
  }
  return(
    <div style={s.card()}>
      <div style={s.bigTitle}>📷 Day Photos</div>
      <div style={{position:"relative",border:`2px dashed ${c.border}`,borderRadius:12,padding:14,textAlign:"center",marginBottom:12,cursor:"pointer"}}>
        <div style={{fontSize:13,color:c.muted}}>📷 Add photo(s) for today</div>
        <input type="file" accept="image/*" multiple onChange={addPhoto} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%",height:"100%"}}/>
      </div>
      {photos.length===0&&<div style={{textAlign:"center",color:c.muted,fontSize:12,padding:"12px 0"}}>No photos yet 📷</div>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
        {photos.map((src,i)=>(
          <div key={i} style={{position:"relative",borderRadius:10,overflow:"hidden",aspectRatio:"1"}}>
            <img src={src} style={{width:"100%",height:"100%",objectFit:"cover"}} alt={`photo-${i}`}/>
            <button onClick={()=>removePhoto(i)} style={{position:"absolute",top:2,right:2,background:`${c.bg}cc`,border:"none",color:c.danger,cursor:"pointer",fontSize:12,borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
});

// ── FREEFORM VISION BOARD ──
const VisionBoard = memo(({ wishlist, setWishlistS, c, s, grad }) => {
  const [items, setItems] = useState(() => wishlist.filter(w=>w.category==="Vision Board").map(w=>({...w, x:w.x||50, y:w.y||50, width:w.width||150, fontSize:w.fontSize||18, color:w.color||"#ffffff"})));
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [newText, setNewText] = useState("");
  const [editingText, setEditingText] = useState(null);
  const [editTextVal, setEditTextVal] = useState("");
  const boardRef = useRef(null);
  const dragOffset = useRef({x:0,y:0});

  function saveItems(updated){
    setItems(updated);
    const others = wishlist.filter(w=>w.category!=="Vision Board");
    setWishlistS([...others, ...updated]);
  }

  async function addImage(e){
    const file=e.target.files[0];if(!file)return;
    const b64=await fileToBase64(file);
    const newItem={id:Date.now(),type:"image",src:b64,category:"Vision Board",x:80,y:80,width:150};
    saveItems([...items,newItem]);
  }

  function addText(){
    if(!newText.trim())return;
    const newItem={id:Date.now(),type:"text",text:newText.trim(),category:"Vision Board",x:100,y:100,width:160,fontSize:18,color:c.pink};
    saveItems([...items,newItem]);
    setNewText("");
  }

  function getEventPos(e){
    const board=boardRef.current.getBoundingClientRect();
    const touch=e.touches?e.touches[0]:e;
    return{x:touch.clientX-board.left, y:touch.clientY-board.top};
  }

  function startDrag(e, id){
    e.preventDefault();e.stopPropagation();
    setSelected(id);setDragging(id);
    const item=items.find(i=>i.id===id);
    const pos=getEventPos(e);
    dragOffset.current={x:pos.x-item.x, y:pos.y-item.y};
  }

  function onMove(e){
    if(!dragging&&!resizing)return;
    e.preventDefault();
    const pos=getEventPos(e);
    if(dragging){
      setItems(prev=>prev.map(i=>i.id===dragging?{...i,x:Math.max(0,pos.x-dragOffset.current.x),y:Math.max(0,pos.y-dragOffset.current.y)}:i));
    }
    if(resizing){
      setItems(prev=>prev.map(i=>i.id===resizing.id?{...i,width:Math.max(60,resizing.startW+(pos.x-resizing.startX))}:i));
    }
  }

  function endMove(){
    if(dragging||resizing){
      const others=wishlist.filter(w=>w.category!=="Vision Board");
      setWishlistS([...others,...items]);
    }
    setDragging(null);setResizing(null);
  }

  function startResize(e,id){
    e.preventDefault();e.stopPropagation();
    setResizing({id,startX:getEventPos(e).x,startW:items.find(i=>i.id===id).width});
  }

  function deleteItem(id){saveItems(items.filter(i=>i.id!==id));setSelected(null);}

  function updateItem(id,update){
    const updated=items.map(i=>i.id===id?{...i,...update}:i);
    saveItems(updated);
  }

  const selectedItem=items.find(i=>i.id===selected);

  return(
    <div>
      {/* Toolbar */}
      <div style={{...s.card(),marginBottom:8}}>
        <div style={s.bigTitle}>🎯 Vision Board</div>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <input style={{...s.input,flex:1}} placeholder="Add text..." value={newText}
            onChange={e=>setNewText(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter")addText();}}/>
          <button style={s.pinkBtn} onClick={addText}>Add</button>
        </div>
        <div style={{position:"relative",border:`2px dashed ${c.border}`,borderRadius:10,padding:"10px",textAlign:"center",cursor:"pointer"}}>
          <span style={{fontSize:12,color:c.muted}}>📷 Add image to board</span>
          <input type="file" accept="image/*" onChange={addImage} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%",height:"100%"}}/>
        </div>
        <div style={{fontSize:10,color:c.muted,marginTop:8,textAlign:"center"}}>Drag to move • Pull corner to resize • Tap to select</div>
      </div>

      {/* Selected item controls */}
      {selectedItem&&(
        <div style={{...s.card(),marginBottom:8,padding:"12px"}}>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            {selectedItem.type==="text"&&(
              <>
                <input style={{...s.input,flex:1,fontSize:12,padding:"6px 10px"}} value={selectedItem.text}
                  onChange={e=>updateItem(selected,{text:e.target.value})}/>
                <input type="color" value={selectedItem.color||"#ffffff"}
                  onChange={e=>updateItem(selected,{color:e.target.value})}
                  style={{width:32,height:32,borderRadius:"50%",border:`2px solid ${c.border}`,overflow:"hidden",cursor:"pointer",background:"transparent"}}/>
                <select value={selectedItem.fontSize||18} onChange={e=>updateItem(selected,{fontSize:Number(e.target.value)})}
                  style={{background:c.surface,border:`1px solid ${c.border}`,borderRadius:8,padding:"6px",color:c.offwhite,fontSize:12}}>
                  {[12,14,16,18,22,28,36,48].map(sz=>(<option key={sz} value={sz}>{sz}px</option>))}
                </select>
              </>
            )}
            <button style={{...s.ghostBtn,padding:"6px 12px",fontSize:12,color:c.danger,borderColor:c.danger}} onClick={()=>deleteItem(selected)}>Delete</button>
            <button style={{...s.ghostBtn,padding:"6px 12px",fontSize:12}} onClick={()=>setSelected(null)}>Done</button>
          </div>
        </div>
      )}

      {/* Freeform canvas */}
      <div ref={boardRef}
        style={{position:"relative",width:"100%",minHeight:500,background:`linear-gradient(145deg,${c.card},${c.cardAlt})`,border:`1px solid ${c.border}`,borderRadius:16,overflow:"hidden",touchAction:"none"}}
        onMouseMove={onMove} onMouseUp={endMove} onTouchMove={onMove} onTouchEnd={endMove}
        onClick={()=>setSelected(null)}>
        {items.length===0&&(
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8,color:c.muted}}>
            <div style={{fontSize:32}}>🎯</div>
            <div style={{fontSize:12}}>Add images and text above to build your vision board</div>
          </div>
        )}
        {items.map(item=>(
          <div key={item.id}
            style={{position:"absolute",left:item.x,top:item.y,width:item.width,
              border:selected===item.id?`2px solid ${c.pink}`:"2px solid transparent",
              borderRadius:10,userSelect:"none",cursor:dragging===item.id?"grabbing":"grab",
              boxShadow:selected===item.id?`0 0 12px ${c.pink}55`:"none",transition:"box-shadow .15s"}}
            onMouseDown={e=>{e.stopPropagation();startDrag(e,item.id);}}
            onTouchStart={e=>{e.stopPropagation();startDrag(e,item.id);}}>
            {item.type==="image"?(
              <img src={item.src} style={{width:"100%",borderRadius:8,display:"block",pointerEvents:"none"}} alt="vision" draggable={false}/>
            ):(
              <div style={{padding:"8px 10px",fontFamily:"'Playfair Display',serif",fontStyle:"italic",
                fontSize:item.fontSize||18,color:item.color||c.pink,lineHeight:1.3,
                background:`${c.bg}88`,borderRadius:8,wordBreak:"break-word",pointerEvents:"none"}}>
                {item.text}
              </div>
            )}
            {/* Resize handle */}
            <div style={{position:"absolute",bottom:-4,right:-4,width:16,height:16,borderRadius:"50%",
              background:c.pink,cursor:"se-resize",zIndex:10,border:`2px solid ${c.bg}`,
              display:selected===item.id?"flex":"none",alignItems:"center",justifyContent:"center"}}
              onMouseDown={e=>startResize(e,item.id)}
              onTouchStart={e=>startResize(e,item.id)}>
              <div style={{width:6,height:6,background:"#fff",borderRadius:1,transform:"rotate(45deg)"}}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// ── MAIN APP ──
export default function App() {
  const [view, setView] = useState("overview");
  const [totalDays, setTotalDays] = useState(75);
  const [startDate, setStartDate] = useState(()=>new Date().toISOString().split("T")[0]);
  const [mission, setMission] = useState(DEFAULT_MISSION);
  const [habits, setHabits] = useState(DEFAULT_HABITS);
  const [dayData, setDayData] = useState({});
  const [editingMission, setEditingMission] = useState(false);
  const [newHabit, setNewHabit] = useState("");
  const [accent, setAccent] = useState("#ec4899");
  const [secondary, setSecondary] = useState("#c084fc");
  const [bgColor, setBgColor] = useState("#0d0010");
  const [syncStatus, setSyncStatus] = useState("loading");
  const [affirmations, setAffirmations] = useState([]);
  const [weeklyIntentions, setWeeklyIntentions] = useState({});
  const [goals, setGoals] = useState([]);
  const [bingoCard, setBingoCard] = useState(Array(25).fill({text:"",done:false}));
  const [wishlist, setWishlist] = useState([]);
  const [progressPhotos, setProgressPhotos] = useState({before:null,after:null,beforeAnswers:{},afterAnswers:{}});
  const [photoQuestions, setPhotoQuestions] = useState(["How do you feel right now?","What is your main goal?","Current weight/measurements?","What are you most proud of?","What will you change?"]);
  const [dailyPhotos, setDailyPhotos] = useState({});
  const saveTimer = useRef(null);
  const isLoaded = useRef(false);
  const latestState = useRef({});

  const c = buildColors(accent, secondary, bgColor);
  const grad = `linear-gradient(135deg,${c.pink},${c.purple})`;
  const gradBtn = `linear-gradient(135deg,${c.pinkHot},${c.purpleDark})`;

  useEffect(()=>{
    latestState.current={mission,habits,dayData,totalDays,startDate,accent,secondary,bgColor,affirmations,weeklyIntentions,goals,bingoCard,wishlist,progressPhotos,photoQuestions,dailyPhotos};
  },[mission,habits,dayData,totalDays,startDate,accent,secondary,bgColor,affirmations,weeklyIntentions,goals,bingoCard,wishlist,progressPhotos,photoQuestions,dailyPhotos]);

  useEffect(()=>{
    async function load(){
      try{
        const{data,error}=await supabase.from("tracker_data").select("*").eq("id","main").single();
        if(error)throw error;
        if(data){
          if(data.mission)setMission(data.mission);
          if(data.habits)setHabits(data.habits);
          if(data.day_data)setDayData(data.day_data);
          if(data.total_days)setTotalDays(data.total_days);
          if(data.start_date)setStartDate(data.start_date);
          if(data.accent)setAccent(data.accent);
          if(data.secondary_color)setSecondary(data.secondary_color);
          if(data.bg_color)setBgColor(data.bg_color);
          if(data.affirmations)setAffirmations(data.affirmations);
          if(data.weekly_intentions)setWeeklyIntentions(data.weekly_intentions);
          if(data.goals)setGoals(data.goals);
          if(data.bingo_card&&data.bingo_card.length===25)setBingoCard(data.bingo_card);
          if(data.wishlist)setWishlist(data.wishlist);
          if(data.progress_photos)setProgressPhotos(data.progress_photos);
          if(data.photo_questions&&data.photo_questions.length)setPhotoQuestions(data.photo_questions);
          if(data.daily_photos)setDailyPhotos(data.daily_photos);
        }
        setSyncStatus("synced");
      }catch{setSyncStatus("error");}
      isLoaded.current=true;
    }
    load();
  },[]);

  useEffect(()=>{
    const ch=supabase.channel("rt_main")
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"tracker_data"},(payload)=>{
        const d=payload.new;if(!d)return;
        if(d.mission!==undefined)setMission(d.mission);
        if(d.habits)setHabits(d.habits);
        if(d.day_data)setDayData(d.day_data);
        if(d.total_days)setTotalDays(d.total_days);
        if(d.start_date)setStartDate(d.start_date);
        if(d.accent)setAccent(d.accent);
        if(d.secondary_color)setSecondary(d.secondary_color);
        if(d.bg_color)setBgColor(d.bg_color);
        if(d.affirmations)setAffirmations(d.affirmations);
        if(d.weekly_intentions)setWeeklyIntentions(d.weekly_intentions);
        if(d.goals)setGoals(d.goals);
        if(d.bingo_card)setBingoCard(d.bingo_card);
        if(d.wishlist)setWishlist(d.wishlist);
        if(d.progress_photos)setProgressPhotos(d.progress_photos);
        if(d.photo_questions)setPhotoQuestions(d.photo_questions);
        if(d.daily_photos)setDailyPhotos(d.daily_photos);
        setSyncStatus("synced");
      }).subscribe();
    return()=>supabase.removeChannel(ch);
  },[]);

  function scheduleSave(overrides={}){
    if(!isLoaded.current)return;
    setSyncStatus("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(async()=>{
      const st={...latestState.current,...overrides};
      try{
        const{error}=await supabase.from("tracker_data").upsert({
          id:"main",mission:st.mission,habits:st.habits,day_data:st.dayData,
          total_days:st.totalDays,start_date:st.startDate,
          accent:st.accent,secondary_color:st.secondary,bg_color:st.bgColor,
          affirmations:st.affirmations,weekly_intentions:st.weeklyIntentions,
          goals:st.goals,bingo_card:st.bingoCard,wishlist:st.wishlist,
          progress_photos:st.progressPhotos,photo_questions:st.photoQuestions,
          daily_photos:st.dailyPhotos,
          updated_at:new Date().toISOString(),
        });
        if(error)throw error;
        setSyncStatus("synced");
      }catch{setSyncStatus("error");}
    },700);
  }

  const getDayData=useCallback((day)=>dayData[getDayKey(day)]||getInitialDay(habits),[dayData,habits]);
  const updateDayData=useCallback((day,update)=>{
    setDayData(prev=>{const nd={...prev,[getDayKey(day)]:{...(prev[getDayKey(day)]||getInitialDay(habits)),...update}};scheduleSave({dayData:nd});return nd;});
  },[habits]);
  const toggleHabit=useCallback((day,hid)=>{
    setDayData(prev=>{const cur=prev[getDayKey(day)]||getInitialDay(habits);const nd={...prev,[getDayKey(day)]:{...cur,habits:{...cur.habits,[hid]:!cur.habits[hid]}}};scheduleSave({dayData:nd});return nd;});
  },[habits]);
  const toggleRestDay=useCallback((day)=>{
    setDayData(prev=>{const cur=prev[getDayKey(day)]||getInitialDay(habits);const nd={...prev,[getDayKey(day)]:{...cur,restDay:!cur.restDay}};scheduleSave({dayData:nd});return nd;});
  },[habits]);

  const save=(key,setter)=>(v)=>{const val=typeof v==="function"?v(latestState.current[key]):v;setter(val);scheduleSave({[key]:val});};
  const setMissionS=save("mission",setMission);
  const setHabitsS=save("habits",setHabits);
  const setTotalDaysS=save("totalDays",setTotalDays);
  const setStartDateS=save("startDate",setStartDate);
  const setAccentS=save("accent",setAccent);
  const setSecondaryS=save("secondary",setSecondary);
  const setBgColorS=save("bgColor",setBgColor);
  const setAffirmationsS=save("affirmations",setAffirmations);
  const setWeeklyIntentionsS=save("weeklyIntentions",setWeeklyIntentions);
  const setGoalsS=save("goals",setGoals);
  const setBingoCardS=save("bingoCard",setBingoCard);
  const setWishlistS=useCallback(save("wishlist",setWishlist),[]);
  const setProgressPhotosS=save("progressPhotos",setProgressPhotos);
  const setPhotoQuestionsS=save("photoQuestions",setPhotoQuestions);
  const setDailyPhotosS=useCallback(save("dailyPhotos",setDailyPhotos),[]);

  function getDayPct(day){const d=getDayData(day);if(d.restDay)return -1;if(!habits.length)return 0;return Math.round((habits.filter(h=>d.habits[h.id]).length/habits.length)*100);}
  function getCurrentDay(){const diff=Math.floor((new Date()-new Date(startDate))/86400000)+1;return Math.min(Math.max(diff,1),totalDays);}
  function getStreak(){let s=0;for(let i=1;i<=totalDays;i++){const p=getDayPct(i);if(p===100||p===-1)s++;else break;}return s;}
  function getHabitStreak(hid){let s=0;for(let i=getCurrentDay();i>=1;i--){const d=getDayData(i);if(d.restDay){s++;continue;}if(d.habits[hid])s++;else break;}return s;}
  function getWeekReport(weekNum){
    const start=(weekNum-1)*7+1,end=Math.min(weekNum*7,totalDays);
    const days=Array.from({length:end-start+1},(_,i)=>start+i);
    const pcts=days.map(d=>{const p=getDayPct(d);return p===-1?null:p;}).filter(p=>p!==null);
    if(!pcts.length)return null;
    const avg=Math.round(pcts.reduce((a,b)=>a+b,0)/pcts.length);
    const best=days.reduce((b,d)=>{const p=getDayPct(d);return(p!==-1&&p>(getDayPct(b)||0))?d:b;},start);
    const worst=days.filter(d=>getDayPct(d)!==-1).reduce((b,d)=>{const p=getDayPct(d);return p<(getDayPct(b)||101)?d:b;},start);
    return{weekNum,start,end,avg,best,worst,days};
  }

  const currentDay=getCurrentDay(),streak=getStreak();
  const completedDays=Array.from({length:totalDays},(_,i)=>i+1).filter(d=>getDayPct(d)===100).length;
  const isDayView=view.startsWith("day-"),dayNum=isDayView?parseInt(view.split("-")[1]):null;

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
    canvas{touch-action:none;}
    select{font-family:'Nunito',sans-serif;}
  `;

  const s={
    root:{fontFamily:"'Nunito',sans-serif",background:c.bg,color:c.white,minHeight:"100vh",maxWidth:520,margin:"0 auto",
      backgroundImage:`radial-gradient(ellipse at 15% 0%,${c.pink}15 0%,transparent 55%),radial-gradient(ellipse at 85% 100%,${c.purple}10 0%,transparent 55%)`},
    header:{background:c.dark?`linear-gradient(180deg,${adj(c.bg,10)} 0%,${c.bg} 100%)`:`linear-gradient(180deg,${adj(c.bg,-8)} 0%,${c.bg} 100%)`,
      borderBottom:`1px solid ${c.border}`,padding:"14px 16px 10px",position:"sticky",top:0,zIndex:100},
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
    dayDot:(day,pct)=>{const isA=isDayView&&day===dayNum,isCur=day===currentDay,done=pct===100,partial=pct>0&&pct<100,rest=pct===-1;
      return{width:"100%",aspectRatio:"1",borderRadius:6,background:rest?`${c.rest}44`:done?grad:partial?`${c.pink}55`:isCur?`${c.pink}12`:c.surface,border:isA?`2px solid ${c.pink}`:rest?`1px solid ${c.rest}`:isCur&&!done?`1px solid ${c.pinkHot}`:`1px solid ${c.borderSoft}`,cursor:"pointer",fontSize:6.5,color:rest?c.rest:done?"#fff":c.dim,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,transition:"all .15s",boxShadow:done?`0 0 6px ${c.pink}44`:rest?`0 0 6px ${c.rest}44`:"none"};},
    tab:(active)=>({flex:1,padding:"8px 4px",borderRadius:12,border:`1px solid ${active?c.pink:c.border}`,background:active?`${c.pink}22`:"transparent",color:active?c.pink:c.muted,fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer",textAlign:"center"}),
    bottomNav:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:520,background:c.dark?`linear-gradient(180deg,transparent 0%,${c.bg}ee 20%,${c.bg} 100%)`:`${c.bg}f8`,borderTop:`1px solid ${c.border}`,display:"flex",padding:"8px 8px 24px",gap:4,zIndex:200,overflowX:"auto"},
    bottomBtn:(active)=>({flexShrink:0,padding:"6px 4px",borderRadius:10,border:`1px solid ${active?c.pink:c.border}`,background:active?`${c.pink}22`:"transparent",color:active?c.pink:c.muted,fontSize:9,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer",textAlign:"center",minWidth:44}),
    todayBtn:{flexShrink:0,padding:"6px 8px",borderRadius:10,border:"none",background:gradBtn,color:"#fff",fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer",boxShadow:`0 4px 18px ${c.pink}44`,minWidth:60},
  };

  function SyncBadge(){
    const map={loading:["⏳","Loading",c.muted],saving:["🔄","Saving",c.purple],synced:["☁️","Synced","#4ade80"],error:["⚠️","Offline",c.danger]};
    const[icon,label,color]=map[syncStatus];
    return(<div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color,background:`${color}18`,border:`1px solid ${color}44`,padding:"3px 8px",borderRadius:10}}>
      <span className={syncStatus==="saving"?"pulse":""}>{icon}</span><span style={{fontWeight:700}}>{label}</span>
    </div>);
  }

  // ── OVERVIEW ──
  function OverviewView(){
    const pct=Math.round((completedDays/totalDays)*100);
    const todayMood=getDayData(currentDay).mood;
    const [localMission, setLocalMission] = useState(mission);
    return(
      <div className="fade">
        <div style={s.card(true)}>
          <div style={s.sectionLabel}>💌 My Mission</div>
          {editingMission?(<>
            <textarea style={{...s.textarea,minHeight:100}} value={localMission} onChange={e=>setLocalMission(e.target.value)} autoFocus/>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <button style={s.pinkBtn} onClick={()=>{setEditingMission(false);setMissionS(localMission);}}>Save ✓</button>
              <button style={s.ghostBtn} onClick={()=>setEditingMission(false)}>Cancel</button>
            </div>
          </>):(
            <div onClick={()=>setEditingMission(true)} style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:14,lineHeight:1.8,color:c.offwhite,cursor:"pointer",opacity:.9}}>
              "{mission}" <span style={{fontSize:10,color:c.pink,marginLeft:6}}>✏️</span>
            </div>
          )}
        </div>
        <div style={s.statRow}>
          {[{n:currentDay,l:"Today"},{n:streak,l:"Streak 🔥"},{n:completedDays,l:"Done ✨"}].map(({n,l})=>(
            <div key={l} style={s.statBox}><div style={s.statNum}>{n}</div><div style={s.statLabel}>{l}</div></div>
          ))}
        </div>
        <div style={s.card()}>
          <div style={s.sectionLabel}>😊 Today's Mood</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {MOODS.map(m=>(<button key={m.emoji} onClick={()=>updateDayData(currentDay,{mood:todayMood===m.emoji?"":m.emoji})}
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
          <div style={{fontSize:11,color:c.muted,marginTop:6,textAlign:"right"}}>{completedDays}/{totalDays} days 🌸</div>
        </div>
        <div style={s.card()}>
          <div style={s.sectionLabel}>Day Map 🗺️</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:4,marginBottom:8}}>
            {Array.from({length:totalDays},(_,i)=>i+1).map(day=>(<div key={day} style={s.dayDot(day,getDayPct(day))} onClick={()=>setView(`day-${day}`)}>{day}</div>))}
          </div>
        </div>
        <div style={s.card()}>
          <div style={s.sectionLabel}>🔥 Habit Streaks</div>
          {habits.map(h=>{const hs=getHabitStreak(h.id);return(
            <div key={h.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${c.borderSoft}`}}>
              <span style={{fontSize:16}}>{h.icon}</span><span style={{flex:1,fontSize:12,color:c.offwhite}}>{h.label}</span>
              <div style={{display:"flex",alignItems:"center",gap:3,background:`${c.pink}18`,border:`1px solid ${c.pink}33`,borderRadius:8,padding:"2px 8px"}}><span style={{fontSize:12}}>🔥</span><span style={{fontSize:12,fontWeight:700,color:c.pink}}>{hs}</span></div>
            </div>
          );})}
        </div>
        <div style={s.card()}>
          <div style={s.sectionLabel}>Today's Habits — Day {currentDay}</div>
          {habits.map((h,i)=>{const checked=getDayData(currentDay).habits[h.id];const isRest=getDayData(currentDay).restDay;return(
            <div key={h.id} style={{...s.habitRow,borderBottom:i===habits.length-1?"none":`1px solid ${c.borderSoft}`,opacity:isRest?.5:1}} onClick={()=>!isRest&&toggleHabit(currentDay,h.id)}>
              <div style={s.checkbox(checked)}>{checked&&<span style={{fontSize:12,color:"#fff",fontWeight:900}}>✓</span>}</div>
              <span style={{fontSize:13,color:checked?c.dim:c.offwhite,textDecoration:checked?"line-through":"none",transition:"all .2s"}}>{h.icon} {h.label}</span>
            </div>
          );})}
          <div style={{marginTop:10}}><div style={s.progressTrack}><div style={s.progressFill(getDayPct(currentDay)===-1?0:getDayPct(currentDay))}/></div></div>
          <button style={{...s.pinkBtn,marginTop:12,width:"100%"}} onClick={()=>setView(`day-${currentDay}`)}>Open Day {currentDay} →</button>
        </div>
      </div>
    );
  }

  // ── DAY VIEW ──
  function DayView({day}){
    const data=getDayData(day);const pct=getDayPct(day);
    const[tab,setTab]=useState("habits");
    const[trading,setTrading]=useState(data.trading||"");
    const isRest=data.restDay;
    return(
      <div className="fade">
        <div style={{...s.card(true),background:`linear-gradient(145deg,${adj(c.bg,12)},${adj(c.bg,6)})`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:12,color:c.muted,marginBottom:2}}>{isRest?"😴 Rest Day":day===currentDay?"✨ Today":day<currentDay?"Past day":"Upcoming"}</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:40,background:isRest?`linear-gradient(135deg,${c.rest},#93c5fd)`:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1}}>Day {day}</div>
            </div>
            <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:38,color:isRest?c.rest:c.pink,lineHeight:1}}>{isRest?"😴":pct+"%"}</div>
              <button onClick={()=>toggleRestDay(day)} style={{padding:"4px 10px",borderRadius:10,border:`1px solid ${isRest?c.rest:c.border}`,background:isRest?`${c.rest}22`:"transparent",color:isRest?c.rest:c.muted,fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer"}}>{isRest?"✅ Rest Day":"😴 Mark Rest"}</button>
            </div>
          </div>
          {!isRest&&<div style={{...s.progressTrack,marginTop:12}}><div style={s.progressFill(pct)}/></div>}
          <div style={{marginTop:10}}>
            <div style={{fontSize:9,color:c.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>Mood</div>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {MOODS.map(m=>(<button key={m.emoji} onClick={()=>updateDayData(day,{mood:data.mood===m.emoji?"":m.emoji})}
                style={{padding:"4px 6px",borderRadius:8,border:`1px solid ${data.mood===m.emoji?c.pink:c.border}`,background:data.mood===m.emoji?`${c.pink}22`:c.surface,cursor:"pointer",fontSize:16}}>{m.emoji}</button>))}
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:4,marginBottom:12,overflowX:"auto"}}>
          {[["habits","✅ Habits"],["journal","📓 Journal"],["photos","📷 Photos"],["trading","📈 Trading"]].map(([key,label])=>(
            <button key={key} style={{...s.tab(tab===key),flexShrink:0,fontSize:10}} onClick={()=>setTab(key)}>{label}</button>
          ))}
        </div>
        {tab==="habits"&&(
          <div style={s.card()}>
            <div style={s.bigTitle}>Daily Habits</div>
            {isRest&&<div style={{padding:12,background:`${c.rest}18`,border:`1px solid ${c.rest}44`,borderRadius:10,marginBottom:10,textAlign:"center",color:c.rest,fontSize:12}}>😴 Rest day — habits paused</div>}
            {habits.map((h,i)=>{const checked=data.habits[h.id];const hs=getHabitStreak(h.id);return(
              <div key={h.id} style={{...s.habitRow,borderBottom:i===habits.length-1?"none":`1px solid ${c.borderSoft}`,opacity:isRest?.4:1}} onClick={()=>!isRest&&toggleHabit(day,h.id)}>
                <div style={s.checkbox(checked&&!isRest)}>{checked&&!isRest&&<span style={{fontSize:13,color:"#fff",fontWeight:900}}>✓</span>}</div>
                <span style={{fontSize:13,color:checked&&!isRest?c.dim:c.offwhite,textDecoration:checked&&!isRest?"line-through":"none",transition:"all .2s",flex:1}}>{h.icon} {h.label}</span>
                {hs>0&&<div style={{fontSize:10,color:c.pink,background:`${c.pink}18`,borderRadius:6,padding:"1px 6px"}}>🔥{hs}</div>}
              </div>
            );})}
            {pct===100&&!isRest&&(<div style={{marginTop:14,padding:14,background:`${c.pink}18`,border:`1px solid ${c.pink}55`,borderRadius:14,textAlign:"center"}}>
              <div style={{fontSize:26}}>🎉</div>
              <div style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:16,background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginTop:4}}>Day {day} Conquered, Queen!</div>
            </div>)}
          </div>
        )}
        {tab==="journal"&&<JournalCanvas day={day} getDayData={getDayData} updateDayData={updateDayData} c={c} s={s}/>}
        {tab==="photos"&&<DayPhotos day={day} dailyPhotos={dailyPhotos} setDailyPhotosS={setDailyPhotosS} c={c} s={s}/>}
        {tab==="trading"&&(
          <div style={s.card()}>
            <div style={s.bigTitle}>Trading Analysis</div>
            <textarea style={{...s.textarea,minHeight:230}}
              placeholder={"📊 Market conditions:\n\n📈 Trades taken:\n\n👀 Setups watched:\n\n💡 Lessons learned:\n\n🎯 Tomorrow's plan:"}
              value={trading} onChange={e=>setTrading(e.target.value)} onBlur={()=>updateDayData(day,{trading})}/>
            <button style={{...s.pinkBtn,marginTop:10}} onClick={()=>updateDayData(day,{trading})}>Save 💾</button>
          </div>
        )}
        <div style={{display:"flex",gap:8,marginTop:6}}>
          {day>1&&<button style={{...s.ghostBtn,flex:1}} onClick={()=>setView(`day-${day-1}`)}>← Day {day-1}</button>}
          {day<totalDays&&<button style={{...s.ghostBtn,flex:1}} onClick={()=>setView(`day-${day+1}`)}>Day {day+1} →</button>}
        </div>
      </div>
    );
  }

  // ── AFFIRMATIONS ──
  function AffirmationsView(){
    const[newAff,setNewAff]=useState("");
    const[editIdx,setEditIdx]=useState(null);
    const[editText,setEditText]=useState("");
    return(
      <div className="fade">
        <div style={s.card(true)}>
          <div style={s.bigTitle}>💭 My Affirmations</div>
          {affirmations.length===0&&<div style={{textAlign:"center",padding:"20px 0",color:c.muted,fontSize:13}}>Add your first affirmation ✨</div>}
          {affirmations.map((aff,i)=>(
            <div key={i} style={{padding:"12px",background:c.surface,borderRadius:12,marginBottom:8,border:`1px solid ${c.border}`,position:"relative"}}>
              {editIdx===i?(<>
                <textarea style={{...s.textarea,minHeight:60}} value={editText} onChange={e=>setEditText(e.target.value)}/>
                <div style={{display:"flex",gap:6,marginTop:8}}>
                  <button style={{...s.pinkBtn,padding:"6px 14px",fontSize:12}} onClick={()=>{const u=[...affirmations];u[i]=editText;setAffirmationsS(u);setEditIdx(null);}}>Save</button>
                  <button style={{...s.ghostBtn,padding:"6px 14px",fontSize:12}} onClick={()=>setEditIdx(null)}>Cancel</button>
                </div>
              </>):(
                <>
                  <div style={{fontSize:14,color:c.offwhite,lineHeight:1.6,paddingRight:50,fontStyle:"italic"}}>"{aff}"</div>
                  <div style={{position:"absolute",top:8,right:8,display:"flex",gap:4}}>
                    <button onClick={()=>{setEditIdx(i);setEditText(aff);}} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:14,color:c.muted}}>✏️</button>
                    <button onClick={()=>setAffirmationsS(affirmations.filter((_,j)=>j!==i))} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:14,color:c.danger}}>×</button>
                  </div>
                </>
              )}
            </div>
          ))}
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <input style={{...s.input,flex:1}} placeholder="I am strong, I am capable..." value={newAff}
              onChange={e=>setNewAff(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&newAff.trim()){setAffirmationsS([...affirmations,newAff.trim()]);setNewAff("");}}}/>
            <button style={s.pinkBtn} onClick={()=>{if(newAff.trim()){setAffirmationsS([...affirmations,newAff.trim()]);setNewAff("");}}}>Add</button>
          </div>
        </div>
        {affirmations.length>0&&(
          <div style={{...s.card(true),textAlign:"center"}}>
            <div style={s.sectionLabel}>✨ Today's Affirmation</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:18,color:c.offwhite,lineHeight:1.8,padding:"8px 0"}}>"{affirmations[new Date().getDate()%affirmations.length]}"</div>
          </div>
        )}
      </div>
    );
  }

  // ── WEEKLY INTENTION ──
  function WeeklyIntentionView(){
    const weekNum=Math.ceil(currentDay/7);
    const key=getWeekKey(currentDay);
    const intention=weeklyIntentions[key]||{focus:"",goals:[],word:""};
    const[focus,setFocus]=useState(intention.focus);
    const[word,setWord]=useState(intention.word);
    const[localGoals,setLocalGoals]=useState(intention.goals||[]);
    const[newGoal,setNewGoal]=useState("");
    function saveInt(overrides={}){const u={...weeklyIntentions,[key]:{focus,goals:localGoals,word,...overrides}};setWeeklyIntentionsS(u);}
    return(
      <div className="fade">
        <div style={s.card(true)}>
          <div style={s.bigTitle}>🗓️ Week {weekNum} Intentions</div>
          <div style={{fontSize:11,color:c.muted,marginBottom:14}}>Days {(weekNum-1)*7+1}–{Math.min(weekNum*7,totalDays)}</div>
          <div style={s.sectionLabel}>🌟 Word of the Week</div>
          <input style={{...s.input,marginBottom:14}} placeholder="e.g. Discipline, Focus..." value={word} onChange={e=>setWord(e.target.value)} onBlur={()=>saveInt({word})}/>
          <div style={s.sectionLabel}>🎯 Main Focus</div>
          <textarea style={{...s.textarea,minHeight:80,marginBottom:14}} placeholder="Your main focus this week..." value={focus} onChange={e=>setFocus(e.target.value)} onBlur={()=>saveInt({focus})}/>
          <div style={s.sectionLabel}>✅ Weekly Goals</div>
          {localGoals.map((g,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:`1px solid ${c.borderSoft}`}}>
              <div style={s.checkbox(g.done)} onClick={()=>{const u=localGoals.map((x,j)=>j===i?{...x,done:!x.done}:x);setLocalGoals(u);saveInt({goals:u});}}>
                {g.done&&<span style={{fontSize:12,color:"#fff",fontWeight:900}}>✓</span>}
              </div>
              <span style={{flex:1,fontSize:13,color:g.done?c.dim:c.offwhite,textDecoration:g.done?"line-through":"none"}}>{g.text}</span>
              <button onClick={()=>{const u=localGoals.filter((_,j)=>j!==i);setLocalGoals(u);saveInt({goals:u});}} style={{background:"transparent",border:"none",color:c.muted,cursor:"pointer",fontSize:16}}>×</button>
            </div>
          ))}
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <input style={{...s.input,flex:1}} placeholder="Add a weekly goal..." value={newGoal} onChange={e=>setNewGoal(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&newGoal.trim()){const u=[...localGoals,{text:newGoal.trim(),done:false}];setLocalGoals(u);setNewGoal("");saveInt({goals:u});}}}/>
            <button style={s.pinkBtn} onClick={()=>{if(newGoal.trim()){const u=[...localGoals,{text:newGoal.trim(),done:false}];setLocalGoals(u);setNewGoal("");saveInt({goals:u});}}}>Add</button>
          </div>
        </div>
      </div>
    );
  }

  // ── WEEKLY REPORT ──
  function WeeklyReportView(){
    const weeks=Math.ceil(totalDays/7);
    const[selectedWeek,setSelectedWeek]=useState(Math.ceil(currentDay/7));
    const report=getWeekReport(selectedWeek);
    const intention=weeklyIntentions[getWeekKey((selectedWeek-1)*7+1)]||{};
    return(
      <div className="fade">
        <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:12,paddingBottom:4}}>
          {Array.from({length:weeks},(_,i)=>i+1).map(w=>(<button key={w} style={{...s.navBtn(w===selectedWeek),flexShrink:0,padding:"6px 12px"}} onClick={()=>setSelectedWeek(w)}>W{w}</button>))}
        </div>
        {!report?(<div style={{...s.card(),textAlign:"center",padding:32,color:c.muted}}>No data yet 🌸</div>):(
          <>
            <div style={s.card(true)}>
              <div style={s.bigTitle}>📊 Week {selectedWeek} Report</div>
              <div style={s.statRow}>
                <div style={s.statBox}><div style={s.statNum}>{report.avg}%</div><div style={s.statLabel}>Avg</div></div>
                <div style={s.statBox}><div style={{...s.statNum,color:"#4ade80"}}>D{report.best}</div><div style={s.statLabel}>Best 🔥</div></div>
                <div style={s.statBox}><div style={{...s.statNum,color:c.danger}}>D{report.worst}</div><div style={s.statLabel}>Tough 💪</div></div>
              </div>
              {report.days.map(d=>{const pct=getDayPct(d);const rest=pct===-1;const mood=getDayData(d).mood;
                return(<div key={d} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <span style={{fontSize:11,color:c.muted,width:28,flexShrink:0}}>D{d}</span>
                  {rest?(<div style={{flex:1,height:20,borderRadius:4,background:`${c.rest}33`,display:"flex",alignItems:"center",paddingLeft:8}}><span style={{fontSize:10,color:c.rest}}>😴 Rest</span></div>):(
                    <><div style={{...s.progressTrack,flex:1,height:20,borderRadius:6}}><div style={{...s.progressFill(pct),height:"100%",borderRadius:6,display:"flex",alignItems:"center",paddingLeft:6}}>{pct>20&&<span style={{fontSize:10,color:"#fff",fontWeight:700}}>{pct}%</span>}</div></div>{mood&&<span style={{fontSize:16}}>{mood}</span>}</>
                  )}
                </div>);})}
            </div>
            {intention.word&&(<div style={{...s.card(),textAlign:"center"}}><div style={s.sectionLabel}>🌟 Word of the Week</div><div style={{fontFamily:"'Playfair Display',serif",fontSize:28,background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{intention.word}</div></div>)}
          </>
        )}
      </div>
    );
  }

  // ── GOALS ──
  function GoalsView(){
    const[showAdd,setShowAdd]=useState(false);
    const[newGoal,setNewGoal]=useState({title:"",type:"bar",target:100,current:0,unit:"",isMoney:false});
    const[selectedId,setSelectedId]=useState(null);
    const[editCurrent,setEditCurrent]=useState("");

    function CircleProgress({pct,size=80,color}){
      const r=size/2-6;const circ=2*Math.PI*r;const offset=circ-(pct/100)*circ;
      return(<svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c.border} strokeWidth={5}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color||c.pink} strokeWidth={5} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{transition:"stroke-dashoffset .6s"}}/>
        <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="middle" style={{transform:`rotate(90deg) translate(0,-${size/2}px)`,transformOrigin:`${size/2}px ${size/2}px`}} fill={color||c.pink} fontSize={size*0.18} fontFamily="'Nunito',sans-serif" fontWeight="700">{pct}%</text>
      </svg>);
    }

    return(
      <div className="fade">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:22,background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>My Goals 🎯</div>
          <button style={s.pinkBtn} onClick={()=>setShowAdd(!showAdd)}>+ Add Goal</button>
        </div>

        {showAdd&&(
          <div style={s.card(true)}>
            <div style={s.sectionLabel}>New Goal ✨</div>
            <input style={{...s.input,marginBottom:10}} placeholder="Goal title..." value={newGoal.title} onChange={e=>setNewGoal({...newGoal,title:e.target.value})}/>
            <div style={{fontSize:11,color:c.muted,marginBottom:6}}>Tracker type:</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:12}}>
              {[["bar","📊 Bar"],["circle","⭕ Circle"],["none","✅ Simple"]].map(([type,label])=>(
                <button key={type} style={{...s.tab(newGoal.type===type),fontSize:11}} onClick={()=>setNewGoal({...newGoal,type})}>{label}</button>
              ))}
            </div>
            {newGoal.type!=="none"&&(
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                <div style={{flex:1}}><div style={{fontSize:10,color:c.muted,marginBottom:4}}>Current</div><input type="number" style={s.input} value={newGoal.current} onChange={e=>setNewGoal({...newGoal,current:e.target.value})}/></div>
                <div style={{flex:1}}><div style={{fontSize:10,color:c.muted,marginBottom:4}}>Target</div><input type="number" style={s.input} value={newGoal.target} onChange={e=>setNewGoal({...newGoal,target:e.target.value})}/></div>
                <div style={{flex:1}}><div style={{fontSize:10,color:c.muted,marginBottom:4}}>Unit</div><input style={s.input} placeholder="$, lbs..." value={newGoal.unit} onChange={e=>setNewGoal({...newGoal,unit:e.target.value})}/></div>
              </div>
            )}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <div style={{...s.checkbox(newGoal.isMoney),cursor:"pointer"}} onClick={()=>setNewGoal({...newGoal,isMoney:!newGoal.isMoney})}>{newGoal.isMoney&&<span style={{fontSize:12,color:"#fff",fontWeight:900}}>✓</span>}</div>
              <span style={{fontSize:13,color:c.offwhite}}>💰 Money goal</span>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button style={s.pinkBtn} onClick={()=>{if(!newGoal.title.trim())return;const g={...newGoal,id:Date.now(),current:Number(newGoal.current)||0,target:Number(newGoal.target)||100};setGoalsS([...goals,g]);setNewGoal({title:"",type:"bar",target:100,current:0,unit:"",isMoney:false});setShowAdd(false);}}>Save 🎯</button>
              <button style={s.ghostBtn} onClick={()=>setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        )}

        {goals.length===0&&!showAdd&&(<div style={{...s.card(),textAlign:"center",padding:32,color:c.muted}}>No goals yet — tap + Add Goal! 🎯</div>)}

        {goals.map(g=>{
          const pct=g.type==="none"?0:Math.min(100,Math.round((g.current/g.target)*100))||0;
          const isSelected=selectedId===g.id;
          const moneyFmt=(n)=>g.isMoney?`$${Number(n).toLocaleString()}`:n+(g.unit||"");
          return(
            <div key={g.id} style={{...s.card(g.isMoney),marginBottom:10,cursor:"pointer"}} onClick={()=>{setSelectedId(isSelected?null:g.id);setEditCurrent(String(g.current));}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1,paddingRight:8}}>
                  <div style={{fontSize:15,fontWeight:700,color:g.done?c.dim:c.offwhite,marginBottom:2,textDecoration:g.done?"line-through":"none"}}>{g.isMoney?"💰":""} {g.title}</div>
                  {g.type!=="none"&&<div style={{fontSize:11,color:c.muted}}>{moneyFmt(g.current)} / {moneyFmt(g.target)}</div>}
                </div>
                {g.type==="none"?(
                  <div style={s.checkbox(g.done)} onClick={e=>{e.stopPropagation();setGoalsS(goals.map(x=>x.id===g.id?{...x,done:!x.done}:x));}}>
                    {g.done&&<span style={{fontSize:13,color:"#fff",fontWeight:900}}>✓</span>}
                  </div>
                ):g.type==="circle"?(
                  <CircleProgress pct={pct} size={70} color={g.isMoney?"#fbbf24":c.pink}/>
                ):(
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:g.isMoney?"#fbbf24":c.pink}}>{pct}%</div>
                )}
              </div>
              {g.type==="bar"&&(<div style={{...s.progressTrack,marginTop:10}}><div style={{...s.progressFill(pct),background:g.isMoney?`linear-gradient(90deg,#fbbf24,#f59e0b)`:undefined}}/></div>)}
              {isSelected&&(
                <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${c.border}`}} onClick={e=>e.stopPropagation()}>
                  {g.type!=="none"&&(
                    <>
                      <div style={{fontSize:11,color:c.muted,marginBottom:6}}>Update progress</div>
                      <input type="number" style={{...s.input,marginBottom:8}} value={editCurrent} onChange={e=>setEditCurrent(e.target.value)}
                        onBlur={()=>setGoalsS(goals.map(x=>x.id===g.id?{...x,current:Number(editCurrent)}:x))}/>
                    </>
                  )}
                  <button style={{...s.ghostBtn,color:c.danger,borderColor:c.danger,fontSize:12,padding:"6px 14px"}}
                    onClick={()=>{setGoalsS(goals.filter(x=>x.id!==g.id));setSelectedId(null);}}>Delete Goal</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ── VISION + BINGO ──
  function VisionBoardView(){
    const[tab,setTab]=useState("board");
    const completedRows=checkBingoRows(bingoCard);
    function toggleBingo(i){const updated=bingoCard.map((cell,idx)=>idx===i?{...cell,done:!cell.done}:cell);setBingoCardS(updated);}
    function setBingoText(i,text){const updated=bingoCard.map((cell,idx)=>idx===i?{...cell,text}:cell);setBingoCardS(updated);}
    return(
      <div className="fade">
        <div style={{display:"flex",gap:6,marginBottom:12}}>
          <button style={s.tab(tab==="board")} onClick={()=>setTab("board")}>🎯 Vision Board</button>
          <button style={s.tab(tab==="bingo")} onClick={()=>setTab("bingo")}>⭐️ Bingo</button>
        </div>
        {tab==="board"&&<VisionBoard wishlist={wishlist} setWishlistS={setWishlistS} c={c} s={s} grad={grad}/>}
        {tab==="bingo"&&(
          <div style={s.card(true)}>
            <div style={s.bigTitle}>⭐️ Bingo Card</div>
            {completedRows.length>0&&(<div style={{padding:"8px 12px",background:`${c.pink}22`,border:`1px solid ${c.pink}44`,borderRadius:10,marginBottom:12,textAlign:"center",fontSize:13,color:c.pink,fontWeight:700}}>🎉 {completedRows.length} Bingo{completedRows.length>1?"s":""} Completed! ⭐️</div>)}
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4}}>
              {bingoCard.map((cell,i)=>{const row=Math.floor(i/5);const isRowComplete=completedRows.includes(row);return(
                <div key={i} style={{position:"relative",aspectRatio:"1",borderRadius:8,background:isRowComplete?`linear-gradient(135deg,${c.pink}33,${c.purple}33)`:cell.done?`${c.pink}22`:c.surface,border:`1px solid ${isRowComplete?c.pink:cell.done?c.pink:c.border}`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",boxShadow:isRowComplete?`0 0 8px ${c.pink}44`:"none",cursor:"pointer"}} onClick={()=>toggleBingo(i)}>
                  {isRowComplete?(<span className="star-pop" style={{fontSize:22,position:"absolute",zIndex:2}}>⭐️</span>):cell.done?(<span style={{fontSize:18,position:"absolute",zIndex:2}}>✅</span>):null}
                  <span style={{fontSize:7,color:c.muted,textAlign:"center",padding:2,lineHeight:1.2,opacity:isRowComplete||cell.done?0.3:1,zIndex:1,overflow:"hidden",wordBreak:"break-word"}}>{cell.text||`#${i+1}`}</span>
                </div>
              );})}
            </div>
            <div style={{marginTop:14}}>
              <div style={s.sectionLabel}>✏️ Edit Squares</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {bingoCard.map((cell,i)=>(<div key={i} style={{display:"flex",gap:4,alignItems:"center"}}>
                  <span style={{fontSize:10,color:c.muted,width:16,flexShrink:0}}>#{i+1}</span>
                  <input style={{...s.input,fontSize:11,padding:"5px 8px"}} placeholder={`Square ${i+1}`} value={cell.text} onChange={e=>setBingoText(i,e.target.value)}/>
                </div>))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── WISHLIST ──
  function WishlistView(){
    const[showAdd,setShowAdd]=useState(false);
    const[selectedItem,setSelectedItem]=useState(null);
    const[editingItem,setEditingItem]=useState(null);
    const[newItem,setNewItem]=useState({title:"",category:"Fashion",link:"",social:"",notes:"",imgSrc:""});
    const[newCategory,setNewCategory]=useState("");
    const[filterCat,setFilterCat]=useState("All");
    const wishItems=wishlist.filter(w=>w.category!=="Vision Board");
    const categories=["All",...new Set(wishItems.map(w=>w.category))];

    async function handleImg(e,isEdit=false){
      const file=e.target.files[0];if(!file)return;
      const b64=await fileToBase64(file);
      if(isEdit)setEditingItem(p=>({...p,imgSrc:b64}));
      else setNewItem(p=>({...p,imgSrc:b64}));
    }

    function addItem(){
      if(!newItem.title.trim())return;
      setWishlistS([...wishlist,{...newItem,id:Date.now(),type:"wish"}]);
      setNewItem({title:"",category:newItem.category,link:"",social:"",notes:"",imgSrc:""});
      setShowAdd(false);
    }

    function saveEdit(){
      setWishlistS(wishlist.map(w=>w.id===editingItem.id?editingItem:w));
      setEditingItem(null);setSelectedItem(null);
    }

    const filtered=filterCat==="All"?wishItems:wishItems.filter(w=>w.category===filterCat);

    return(
      <div className="fade">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:22,background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Wishlist 🛍️</div>
          <button style={s.pinkBtn} onClick={()=>setShowAdd(!showAdd)}>+ Add</button>
        </div>

        {showAdd&&(
          <div style={s.card(true)}>
            <div style={s.sectionLabel}>New Item ✨</div>
            <div style={{position:"relative",borderRadius:12,overflow:"hidden",marginBottom:10,background:c.surface,border:`2px dashed ${c.border}`,height:120,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
              {newItem.imgSrc?(<img src={newItem.imgSrc} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="item"/>):(<div style={{textAlign:"center"}}><div style={{fontSize:24}}>📷</div><div style={{fontSize:11,color:c.muted,marginTop:4}}>Add photo</div></div>)}
              <input type="file" accept="image/*" onChange={e=>handleImg(e,false)} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%",height:"100%"}}/>
            </div>
            <input style={{...s.input,marginBottom:8}} placeholder="Item name..." value={newItem.title} onChange={e=>setNewItem({...newItem,title:e.target.value})}/>
            <div style={{display:"flex",gap:5,marginBottom:8,flexWrap:"wrap"}}>
              {["Fashion","Beauty","Home","Tech","Travel","Food","Other"].map(cat=>(<button key={cat} style={{...s.navBtn(newItem.category===cat),padding:"4px 10px",fontSize:11}} onClick={()=>setNewItem({...newItem,category:cat})}>{cat}</button>))}
            </div>
            <div style={{display:"flex",gap:6,marginBottom:8}}>
              <input style={{...s.input,flex:1,fontSize:12}} placeholder="Custom category..." value={newCategory} onChange={e=>setNewCategory(e.target.value)}/>
              <button style={{...s.ghostBtn,padding:"8px 12px",fontSize:12}} onClick={()=>{if(newCategory.trim()){setNewItem({...newItem,category:newCategory.trim()});setNewCategory("");}}}>Set</button>
            </div>
            <input style={{...s.input,marginBottom:8}} placeholder="Website URL (optional)" value={newItem.link} onChange={e=>setNewItem({...newItem,link:e.target.value})}/>
            <input style={{...s.input,marginBottom:8}} placeholder="Social media @ (optional)" value={newItem.social} onChange={e=>setNewItem({...newItem,social:e.target.value})}/>
            <textarea style={{...s.textarea,minHeight:60,marginBottom:10}} placeholder="Notes..." value={newItem.notes} onChange={e=>setNewItem({...newItem,notes:e.target.value})}/>
            <div style={{display:"flex",gap:8}}>
              <button style={s.pinkBtn} onClick={addItem}>Save 🛍️</button>
              <button style={s.ghostBtn} onClick={()=>setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        )}

        {categories.length>1&&(
          <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:12,paddingBottom:4}}>
            {categories.map(cat=>(<button key={cat} style={{...s.navBtn(filterCat===cat),flexShrink:0,fontSize:11,padding:"5px 12px"}} onClick={()=>setFilterCat(cat)}>{cat}</button>))}
          </div>
        )}

        {filtered.length===0&&(<div style={{...s.card(),textAlign:"center",padding:32,color:c.muted}}>No items yet 🛍️</div>)}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {filtered.map(item=>(
            <div key={item.id} style={{position:"relative",borderRadius:14,overflow:"hidden",cursor:"pointer",background:c.surface,border:`1px solid ${c.border}`,transition:"transform .15s"}}
              onClick={()=>setSelectedItem(selectedItem?.id===item.id?null:item)}>
              {item.imgSrc?(<img src={item.imgSrc} style={{width:"100%",aspectRatio:"1",objectFit:"cover",display:"block"}} alt={item.title}/>):(<div style={{aspectRatio:"1",background:`linear-gradient(135deg,${c.pink}22,${c.purple}22)`,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:32}}>🛍️</span></div>)}
              <div style={{padding:"8px 10px"}}><div style={{fontSize:12,fontWeight:700,color:c.offwhite,marginBottom:2}}>{item.title}</div><div style={{fontSize:10,color:c.pink}}>{item.category}</div></div>
            </div>
          ))}
        </div>

        {/* Item detail / edit modal */}
        {selectedItem&&!editingItem&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:300,display:"flex",alignItems:"flex-end"}} onClick={()=>setSelectedItem(null)}>
            <div style={{...s.card(),width:"100%",maxWidth:520,margin:"0 auto",borderRadius:"20px 20px 0 0",maxHeight:"85vh",overflowY:"auto",paddingBottom:32}} onClick={e=>e.stopPropagation()}>
              {selectedItem.imgSrc&&<img src={selectedItem.imgSrc} style={{width:"100%",borderRadius:12,marginBottom:12}} alt={selectedItem.title}/>}
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:c.offwhite,marginBottom:4}}>{selectedItem.title}</div>
              <div style={{fontSize:11,color:c.pink,marginBottom:12}}>{selectedItem.category}</div>
              {selectedItem.link&&(<a href={selectedItem.link} target="_blank" rel="noreferrer" style={{display:"block",padding:"10px 14px",background:`${c.pink}22`,border:`1px solid ${c.pink}44`,borderRadius:10,color:c.pink,fontSize:12,marginBottom:8,textDecoration:"none"}}>🔗 Visit Website</a>)}
              {selectedItem.social&&(<div style={{padding:"10px 14px",background:`${c.purple}22`,border:`1px solid ${c.purple}44`,borderRadius:10,color:c.purple,fontSize:12,marginBottom:8}}>📱 {selectedItem.social}</div>)}
              {selectedItem.notes&&<div style={{fontSize:12,color:c.muted,lineHeight:1.6,marginBottom:12}}>{selectedItem.notes}</div>}
              <div style={{display:"flex",gap:8}}>
                <button style={{...s.pinkBtn,flex:1}} onClick={()=>setEditingItem({...selectedItem})}>✏️ Edit</button>
                <button style={{...s.ghostBtn,flex:1}} onClick={()=>setSelectedItem(null)}>Close</button>
                <button style={{...s.ghostBtn,color:c.danger,borderColor:c.danger}} onClick={()=>{setWishlistS(wishlist.filter(w=>w.id!==selectedItem.id));setSelectedItem(null);}}>🗑️</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit modal */}
        {editingItem&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:300,display:"flex",alignItems:"flex-end"}} onClick={()=>setEditingItem(null)}>
            <div style={{...s.card(),width:"100%",maxWidth:520,margin:"0 auto",borderRadius:"20px 20px 0 0",maxHeight:"90vh",overflowY:"auto",paddingBottom:32}} onClick={e=>e.stopPropagation()}>
              <div style={s.bigTitle}>✏️ Edit Item</div>
              <div style={{position:"relative",borderRadius:12,overflow:"hidden",marginBottom:10,background:c.surface,border:`2px dashed ${c.border}`,height:120,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                {editingItem.imgSrc?(<img src={editingItem.imgSrc} style={{width:"100%",height:"100%",objectFit:"cover"}} alt="edit"/>):(<div style={{textAlign:"center"}}><div style={{fontSize:24}}>📷</div><div style={{fontSize:11,color:c.muted}}>Change photo</div></div>)}
                <input type="file" accept="image/*" onChange={e=>handleImg(e,true)} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%",height:"100%"}}/>
              </div>
              <input style={{...s.input,marginBottom:8}} value={editingItem.title} onChange={e=>setEditingItem({...editingItem,title:e.target.value})}/>
              <input style={{...s.input,marginBottom:8}} placeholder="Website URL" value={editingItem.link||""} onChange={e=>setEditingItem({...editingItem,link:e.target.value})}/>
              <input style={{...s.input,marginBottom:8}} placeholder="Social @" value={editingItem.social||""} onChange={e=>setEditingItem({...editingItem,social:e.target.value})}/>
              <textarea style={{...s.textarea,minHeight:60,marginBottom:10}} value={editingItem.notes||""} onChange={e=>setEditingItem({...editingItem,notes:e.target.value})}/>
              <div style={{display:"flex",gap:8}}>
                <button style={s.pinkBtn} onClick={saveEdit}>Save Changes ✓</button>
                <button style={s.ghostBtn} onClick={()=>setEditingItem(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── PROGRESS PHOTOS ──
  function ProgressPhotosView(){
    const[phase,setPhase]=useState("before");
    const[editingQ,setEditingQ]=useState(false);
    const[localQ,setLocalQ]=useState([...photoQuestions]);
    const photos=progressPhotos||{before:null,after:null,beforeAnswers:{},afterAnswers:{}};
    const answers=phase==="before"?(photos.beforeAnswers||{}):(photos.afterAnswers||{});
    async function handlePhoto(e){const file=e.target.files[0];if(!file)return;const b64=await fileToBase64(file);setProgressPhotosS({...photos,[phase]:b64});}
    function setAnswer(i,val){const key=phase==="before"?"beforeAnswers":"afterAnswers";setProgressPhotosS({...photos,[key]:{...answers,[i]:val}});}
    return(
      <div className="fade">
        <div style={s.card(true)}>
          <div style={s.bigTitle}>📸 Progress Photos</div>
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <button style={{...s.tab(phase==="before"),flex:1}} onClick={()=>setPhase("before")}>Before 🌱</button>
            <button style={{...s.tab(phase==="after"),flex:1}} onClick={()=>setPhase("after")}>After 🦋</button>
          </div>
          <div style={{position:"relative",borderRadius:16,overflow:"hidden",marginBottom:14,background:c.surface,border:`2px dashed ${c.border}`,minHeight:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {photos[phase]?(<img src={photos[phase]} style={{width:"100%",borderRadius:14,display:"block"}} alt={phase}/>):(<div style={{textAlign:"center",padding:24}}><div style={{fontSize:36,marginBottom:8}}>📷</div><div style={{fontSize:13,color:c.muted}}>Tap to add your {phase} photo</div></div>)}
            <input type="file" accept="image/*" onChange={handlePhoto} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%",height:"100%"}}/>
          </div>
          <div style={s.sectionLabel}>✍️ {phase==="before"?"Before":"After"} Questions</div>
          {photoQuestions.map((q,i)=>(<div key={i} style={{marginBottom:12}}>
            <div style={{fontSize:12,color:c.pink,fontWeight:700,marginBottom:4}}>{q}</div>
            <textarea style={{...s.textarea,minHeight:60,fontSize:12}} placeholder="Write your answer..." value={answers[i]||""} onChange={e=>setAnswer(i,e.target.value)}/>
          </div>))}
          {editingQ?(<div style={{marginTop:8}}>
            {localQ.map((q,i)=>(<div key={i} style={{display:"flex",gap:6,marginBottom:8}}>
              <input style={{...s.input,flex:1}} value={q} onChange={e=>{const u=[...localQ];u[i]=e.target.value;setLocalQ(u);}}/>
              <button onClick={()=>setLocalQ(localQ.filter((_,j)=>j!==i))} style={{background:"transparent",border:"none",color:c.danger,cursor:"pointer",fontSize:18}}>×</button>
            </div>))}
            <div style={{display:"flex",gap:8,marginTop:8}}>
              <button style={s.pinkBtn} onClick={()=>{setPhotoQuestionsS(localQ);setEditingQ(false);}}>Save</button>
              <button style={s.ghostBtn} onClick={()=>setEditingQ(false)}>Cancel</button>
            </div>
            <button style={{...s.ghostBtn,marginTop:8,width:"100%"}} onClick={()=>setLocalQ([...localQ,""])}>+ Add Question</button>
          </div>):(<button style={{...s.ghostBtn,marginTop:8,width:"100%",fontSize:12}} onClick={()=>setEditingQ(true)}>✏️ Edit Questions</button>)}
        </div>
        {photos.before&&photos.after&&(<div style={s.card()}>
          <div style={s.sectionLabel}>✨ Your Transformation</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div><div style={{fontSize:10,color:c.muted,textAlign:"center",marginBottom:4}}>BEFORE 🌱</div><img src={photos.before} style={{width:"100%",borderRadius:12}} alt="before"/></div>
            <div><div style={{fontSize:10,color:c.muted,textAlign:"center",marginBottom:4}}>AFTER 🦋</div><img src={photos.after} style={{width:"100%",borderRadius:12}} alt="after"/></div>
          </div>
        </div>)}
      </div>
    );
  }

  // ── SETTINGS ──
  function SettingsView(){
    const[localDays,setLocalDays]=useState(totalDays);
    const[localStart,setLocalStart]=useState(startDate);
    return(
      <div className="fade">
        <div style={s.card()}>
          <div style={s.bigTitle}>🎨 Color Studio</div>
          <div style={{height:12,borderRadius:10,marginBottom:20,overflow:"hidden",background:`linear-gradient(90deg,${c.pink},${c.purple},${adj(c.pink,15)},${c.purple})`,boxShadow:`0 0 20px ${c.pink}55`}}/>
          <ColorPicker label="✨ Accent" hint="buttons & highlights" value={accent} onChange={setAccentS} c={c}/>
          <ColorPicker label="💜 Secondary" hint="gradients" value={secondary} onChange={setSecondaryS} c={c}/>
          <ColorPicker label="🌙 Background" hint="app background" value={bgColor} onChange={setBgColorS} c={c}/>
          <div style={{...s.sectionLabel,marginTop:4}}>Quick Presets</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {PRESETS.map(p=>{const active=accent===p.accent&&secondary===p.secondary;return(
              <button key={p.name} onClick={()=>{setAccentS(p.accent);setSecondaryS(p.secondary);setBgColorS(p.bg);}}
                style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:12,border:`1px solid ${active?p.accent:c.border}`,background:active?`${p.accent}22`:c.surface,cursor:"pointer",fontFamily:"'Nunito',sans-serif",transition:"all .2s"}}>
                <div style={{display:"flex",gap:3}}>{[p.accent,p.secondary,p.bg].map((col,i)=>(<div key={i} style={{width:13,height:13,borderRadius:"50%",background:col,border:i===2?`1px solid ${c.border}`:"none"}}/>))}</div>
                <span style={{fontSize:11,color:c.offwhite,fontWeight:600}}>{p.name}</span>
              </button>
            );})}
          </div>
        </div>
        <div style={s.card()}>
          <div style={s.bigTitle}>My Habits 🌸</div>
          {habits.map((h,i)=>(<div key={h.id} style={{...s.habitRow,cursor:"default",borderBottom:i===habits.length-1?"none":`1px solid ${c.borderSoft}`}}>
            <span style={{flex:1,fontSize:13,color:c.offwhite}}>{h.icon} {h.label}</span>
            <button style={{background:"transparent",border:"none",color:c.muted,cursor:"pointer",fontSize:18}} onClick={()=>setHabitsS(p=>p.filter(x=>x.id!==h.id))}>×</button>
          </div>))}
          <div style={{display:"flex",gap:8,marginTop:14}}>
            <input style={{...s.input,flex:1}} placeholder="Add a new habit..." value={newHabit} onChange={e=>setNewHabit(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&newHabit.trim()){setHabitsS(p=>[...p,{id:Date.now(),label:newHabit.trim(),icon:"✨"}]);setNewHabit("");}}}/>
            <button style={s.pinkBtn} onClick={()=>{if(newHabit.trim()){setHabitsS(p=>[...p,{id:Date.now(),label:newHabit.trim(),icon:"✨"}]);setNewHabit("");}}}>Add</button>
          </div>
        </div>
        <div style={s.card()}>
          <div style={s.bigTitle}>Challenge Setup ⚙️</div>
          <div style={{marginBottom:14}}><div style={{...s.sectionLabel,marginBottom:6}}>Total Days</div><input type="number" style={s.input} value={localDays} min={1} max={365} onChange={e=>setLocalDays(Number(e.target.value))} onBlur={()=>setTotalDaysS(localDays)}/></div>
          <div><div style={{...s.sectionLabel,marginBottom:6}}>Start Date</div><input type="date" style={s.input} value={localStart} onChange={e=>setLocalStart(e.target.value)} onBlur={()=>setStartDateS(localStart)}/></div>
        </div>
        <div style={s.card()}>
          <div style={s.bigTitle}>🔔 Notifications</div>
          {["Open your iPhone Reminders app","Tap + to create a new reminder","Name it '75 Hard Check-in 🌸'","Set time to 8pm daily","Set repeat to Every Day","Bookmark your Vercel URL for quick access"].map((step,i)=>(
            <div key={i} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start"}}>
              <div style={{width:20,height:20,borderRadius:"50%",background:gradBtn,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,color:"#fff",fontWeight:700}}>{i+1}</div>
              <span style={{fontSize:12,color:c.offwhite,lineHeight:1.6}}>{step}</span>
            </div>
          ))}
        </div>
        <div style={s.card()}>
          <div style={s.bigTitle}>Data 🗂️</div>
          <button style={{...s.ghostBtn,color:c.danger,borderColor:c.danger,width:"100%"}} onClick={()=>{if(window.confirm("Reset all progress? 💔")){const e={};setDayData(e);scheduleSave({dayData:e});}}}>Reset All Progress 🗑️</button>
        </div>
      </div>
    );
  }

  if(syncStatus==="loading"){
    return(<><style>{css}</style>
      <div style={{...s.root,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
        <div style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:34,background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:16}}>75 Hard ✨</div>
        <div className="pulse" style={{fontSize:30}}>🌸</div>
        <div style={{fontSize:11,color:c.muted,marginTop:14,letterSpacing:2}}>LOADING YOUR JOURNEY...</div>
      </div>
    </>);
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

  return(
    <><style>{css}</style>
      <div style={s.root}>
        <div style={s.header}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:isDayView?10:0}}>
            <div><div style={s.logo}>75 Hard ✨</div><div style={s.logoSub}>your rules · your glow up</div></div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}><SyncBadge/><button style={s.navBtn(view==="settings")} onClick={()=>setView("settings")}>🎨</button></div>
          </div>
          {isDayView&&(<div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:2}}>
            {[-2,-1,0,1,2].map(offset=>{const d=dayNum+offset;if(d<1||d>totalDays)return null;const isA=d===dayNum;
              return(<button key={d} style={{padding:"4px 10px",borderRadius:10,border:`1px solid ${isA?c.pink:c.border}`,background:isA?`${c.pink}22`:"transparent",color:isA?c.pink:c.muted,fontSize:11,cursor:"pointer",flexShrink:0,fontWeight:700}} onClick={()=>setView(`day-${d}`)}>D{d}</button>);})}
          </div>)}
        </div>
        <div style={s.content}>
          {view==="overview"&&<OverviewView/>}
          {isDayView&&<DayView key={dayNum} day={dayNum}/>}
          {view==="affirmations"&&<AffirmationsView/>}
          {view==="intentions"&&<WeeklyIntentionView/>}
          {view==="report"&&<WeeklyReportView/>}
          {view==="goals"&&<GoalsView/>}
          {view==="vision"&&<VisionBoardView/>}
          {view==="wishlist"&&<WishlistView/>}
          {view==="photos"&&<ProgressPhotosView/>}
          {view==="settings"&&<SettingsView/>}
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
    </>
  );
}
