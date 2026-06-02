import { useState, useEffect, useRef, useCallback } from "react";
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
  { emoji: "🔥", label: "Crushed it" },
  { emoji: "💪", label: "Strong" },
  { emoji: "🌸", label: "Good day" },
  { emoji: "😊", label: "Happy" },
  { emoji: "😐", label: "Okay" },
  { emoji: "😴", label: "Tired" },
  { emoji: "😤", label: "Pushed through" },
  { emoji: "💔", label: "Tough day" },
];

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
function getInitialDay(habits){return{habits:habits.reduce((a,h)=>({...a,[h.id]:false}),{}),journal:"",journalCanvas:"",trading:"",mood:"",restDay:false};}

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
  const saveTimer = useRef(null);
  const isLoaded = useRef(false);
  const latestState = useRef({});

  const c = buildColors(accent, secondary, bgColor);
  const grad = `linear-gradient(135deg,${c.pink},${c.purple})`;
  const gradBtn = `linear-gradient(135deg,${c.pinkHot},${c.purpleDark})`;

  useEffect(() => {
    latestState.current = { mission, habits, dayData, totalDays, startDate, accent, secondary, bgColor, affirmations, weeklyIntentions };
  }, [mission, habits, dayData, totalDays, startDate, accent, secondary, bgColor, affirmations, weeklyIntentions]);

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase.from("tracker_data").select("*").eq("id","main").single();
        if (error) throw error;
        if (data) {
          if (data.mission) setMission(data.mission);
          if (data.habits) setHabits(data.habits);
          if (data.day_data) setDayData(data.day_data);
          if (data.total_days) setTotalDays(data.total_days);
          if (data.start_date) setStartDate(data.start_date);
          if (data.accent) setAccent(data.accent);
          if (data.secondary_color) setSecondary(data.secondary_color);
          if (data.bg_color) setBgColor(data.bg_color);
          if (data.affirmations) setAffirmations(data.affirmations);
          if (data.weekly_intentions) setWeeklyIntentions(data.weekly_intentions);
        }
        setSyncStatus("synced");
      } catch { setSyncStatus("error"); }
      isLoaded.current = true;
    }
    load();
  }, []);

  useEffect(() => {
    const ch = supabase.channel("rt_tracker")
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"tracker_data"},(payload) => {
        const d = payload.new; if (!d) return;
        if (d.mission!==undefined) setMission(d.mission);
        if (d.habits) setHabits(d.habits);
        if (d.day_data) setDayData(d.day_data);
        if (d.total_days) setTotalDays(d.total_days);
        if (d.start_date) setStartDate(d.start_date);
        if (d.accent) setAccent(d.accent);
        if (d.secondary_color) setSecondary(d.secondary_color);
        if (d.bg_color) setBgColor(d.bg_color);
        if (d.affirmations) setAffirmations(d.affirmations);
        if (d.weekly_intentions) setWeeklyIntentions(d.weekly_intentions);
        setSyncStatus("synced");
      }).subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  function scheduleSave(overrides={}) {
    if (!isLoaded.current) return;
    setSyncStatus("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const st = { ...latestState.current, ...overrides };
      try {
        const { error } = await supabase.from("tracker_data").upsert({
          id:"main", mission:st.mission, habits:st.habits, day_data:st.dayData,
          total_days:st.totalDays, start_date:st.startDate,
          accent:st.accent, secondary_color:st.secondary, bg_color:st.bgColor,
          affirmations:st.affirmations, weekly_intentions:st.weeklyIntentions,
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
        setSyncStatus("synced");
      } catch { setSyncStatus("error"); }
    }, 700);
  }

  function getDayData(day){return dayData[getDayKey(day)]||getInitialDay(habits);}
  function updateDayData(day,update){
    const nd={...dayData,[getDayKey(day)]:{...getDayData(day),...update}};
    setDayData(nd); scheduleSave({dayData:nd});
  }
  function toggleHabit(day,hid){
    const cur=getDayData(day);
    const nd={...dayData,[getDayKey(day)]:{...cur,habits:{...cur.habits,[hid]:!cur.habits[hid]}}};
    setDayData(nd); scheduleSave({dayData:nd});
  }
  function toggleRestDay(day){
    const cur=getDayData(day);
    const nd={...dayData,[getDayKey(day)]:{...cur,restDay:!cur.restDay}};
    setDayData(nd); scheduleSave({dayData:nd});
  }

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

  function getDayPct(day){
    const d=getDayData(day);
    if(d.restDay) return -1; // rest day marker
    if(!habits.length)return 0;
    return Math.round((habits.filter(h=>d.habits[h.id]).length/habits.length)*100);
  }
  function getCurrentDay(){const diff=Math.floor((new Date()-new Date(startDate))/86400000)+1;return Math.min(Math.max(diff,1),totalDays);}
  function getStreak(){let s=0;for(let i=1;i<=totalDays;i++){const p=getDayPct(i);if(p===100||p===-1)s++;else break;}return s;}
  function getHabitStreak(hid){
    let s=0;
    for(let i=getCurrentDay();i>=1;i--){
      const d=getDayData(i);
      if(d.restDay){s++;continue;}
      if(d.habits[hid])s++;else break;
    }
    return s;
  }

  const currentDay=getCurrentDay(),streak=getStreak();
  const completedDays=Array.from({length:totalDays},(_,i)=>i+1).filter(d=>getDayPct(d)===100).length;
  const isDayView=view.startsWith("day-"),dayNum=isDayView?parseInt(view.split("-")[1]):null;

  // Weekly report
  function getWeekReport(weekNum){
    const start=(weekNum-1)*7+1,end=Math.min(weekNum*7,totalDays);
    const days=Array.from({length:end-start+1},(_,i)=>start+i);
    const pcts=days.map(d=>{const p=getDayPct(d);return p===-1?null:p;}).filter(p=>p!==null);
    if(!pcts.length)return null;
    const avg=Math.round(pcts.reduce((a,b)=>a+b,0)/pcts.length);
    const best=days.reduce((b,d)=>{const p=getDayPct(d);return(p!==-1&&p>(getDayPct(b)||0))?d:b;},start);
    const worst=days.filter(d=>getDayPct(d)!==-1).reduce((b,d)=>{const p=getDayPct(d);return p<(getDayPct(b)||101)?d:b;},start);
    return{weekNum,start,end,avg,best,worst,days,pcts};
  }

  const css=`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Nunito:wght@300;400;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    html,body{background:${c.bg};-webkit-tap-highlight-color:transparent;overscroll-behavior:none;}
    ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:${c.pink};border-radius:2px;}
    .fade{animation:fu .3s cubic-bezier(.22,.68,0,1.2) both;}
    @keyframes fu{from{opacity:0;transform:translateY(12px) scale(.98);}to{opacity:1;transform:none;}}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
    .pulse{animation:pulse 1.4s ease infinite;}
    textarea,input[type=text],input[type=number]{font-family:'Nunito',sans-serif;color:${c.offwhite};}
    input[type=date]{font-family:'Nunito',sans-serif;color:${c.offwhite};}
    input[type=date]::-webkit-calendar-picker-indicator{filter:${c.dark?"invert(1) sepia(1) saturate(3) hue-rotate(280deg)":"none"};opacity:.7;}
    input[type=color]{-webkit-appearance:none;appearance:none;border:none;padding:0;cursor:pointer;border-radius:50%;overflow:hidden;width:100%;height:100%;}
    input[type=color]::-webkit-color-swatch-wrapper{padding:0;}
    input[type=color]::-webkit-color-swatch{border:none;border-radius:50%;}
    .slider-track{cursor:pointer;border-radius:12px;overflow:hidden;position:relative;}
    canvas{touch-action:none;}
  `;

  const s={
    root:{fontFamily:"'Nunito',sans-serif",background:c.bg,color:c.white,minHeight:"100vh",maxWidth:520,margin:"0 auto",
      backgroundImage:`radial-gradient(ellipse at 15% 0%,${c.pink}15 0%,transparent 55%),radial-gradient(ellipse at 85% 100%,${c.purple}10 0%,transparent 55%)`},
    header:{background:c.dark?`linear-gradient(180deg,${adj(c.bg,10)} 0%,${c.bg} 100%)`:`linear-gradient(180deg,${adj(c.bg,-8)} 0%,${c.bg} 100%)`,
      borderBottom:`1px solid ${c.border}`,padding:"14px 16px 10px",position:"sticky",top:0,zIndex:100},
    logo:{fontFamily:"'Playfair Display',serif",fontSize:24,fontStyle:"italic",background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1.1},
    logoSub:{fontSize:9,color:c.muted,letterSpacing:3,textTransform:"uppercase",marginTop:1},
    navBtn:(active)=>({padding:"5px 11px",borderRadius:20,border:`1px solid ${active?c.pink:c.border}`,
      background:active?`${c.pink}22`:"transparent",color:active?c.pink:c.muted,
      fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer"}),
    content:{padding:"16px 14px 100px"},
    card:(glow)=>({background:`linear-gradient(145deg,${c.card} 0%,${c.cardAlt} 100%)`,border:`1px solid ${c.border}`,
      borderRadius:18,padding:"16px",marginBottom:10,
      boxShadow:glow?`0 0 28px ${c.pink}18,inset 0 1px 0 ${c.border}`:`inset 0 1px 0 ${c.borderSoft}`}),
    sectionLabel:{fontSize:9,fontWeight:700,letterSpacing:3,textTransform:"uppercase",color:c.muted,marginBottom:10},
    bigTitle:{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:22,background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:8},
    statRow:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10},
    statBox:{background:`linear-gradient(145deg,${c.card},${c.cardAlt})`,border:`1px solid ${c.border}`,borderRadius:14,padding:"12px 8px",textAlign:"center"},
    statNum:{fontFamily:"'Playfair Display',serif",fontSize:34,background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1},
    statLabel:{fontSize:9,color:c.muted,letterSpacing:2,marginTop:3,textTransform:"uppercase"},
    progressTrack:{height:8,borderRadius:4,background:c.border,overflow:"hidden"},
    progressFill:(pct)=>({height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${c.pinkHot},${c.purple})`,borderRadius:4,transition:"width .5s cubic-bezier(.22,.68,0,1.2)",boxShadow:`0 0 8px ${c.pink}55`}),
    habitRow:{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:`1px solid ${c.borderSoft}`,cursor:"pointer"},
    checkbox:(checked)=>({width:24,height:24,borderRadius:8,border:`2px solid ${checked?c.pink:c.border}`,
      background:checked?gradBtn:"transparent",display:"flex",alignItems:"center",justifyContent:"center",
      flexShrink:0,transition:"all .25s",boxShadow:checked?`0 0 10px ${c.pink}55`:"none"}),
    textarea:{width:"100%",background:c.surface,border:`1px solid ${c.border}`,borderRadius:12,padding:"12px 14px",
      fontSize:13,lineHeight:1.7,resize:"vertical",minHeight:90,outline:"none"},
    input:{width:"100%",background:c.surface,border:`1px solid ${c.border}`,borderRadius:10,padding:"9px 13px",fontSize:13,outline:"none"},
    pinkBtn:{background:gradBtn,color:"#fff",border:"none",borderRadius:12,padding:"10px 20px",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:13,cursor:"pointer",boxShadow:`0 4px 18px ${c.pink}44`},
    ghostBtn:{background:"transparent",color:c.muted,border:`1px solid ${c.border}`,borderRadius:12,padding:"10px 20px",fontFamily:"'Nunito',sans-serif",fontSize:13,cursor:"pointer"},
    dayDot:(day,pct)=>{
      const isA=isDayView&&day===dayNum,isCur=day===currentDay,done=pct===100,partial=pct>0&&pct<100,rest=pct===-1;
      return{width:"100%",aspectRatio:"1",borderRadius:6,
        background:rest?`${c.rest}44`:done?grad:partial?`${c.pink}55`:isCur?`${c.pink}12`:c.surface,
        border:isA?`2px solid ${c.pink}`:rest?`1px solid ${c.rest}`:isCur&&!done?`1px solid ${c.pinkHot}`:`1px solid ${c.borderSoft}`,
        cursor:"pointer",fontSize:6.5,color:rest?c.rest:done?"#fff":c.dim,display:"flex",alignItems:"center",justifyContent:"center",
        fontWeight:700,transition:"all .15s",boxShadow:done?`0 0 6px ${c.pink}44`:rest?`0 0 6px ${c.rest}44`:"none"};},
    tab:(active)=>({flex:1,padding:"8px 4px",borderRadius:12,border:`1px solid ${active?c.pink:c.border}`,
      background:active?`${c.pink}22`:"transparent",color:active?c.pink:c.muted,
      fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer",textAlign:"center"}),
    bottomNav:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:520,
      background:c.dark?`linear-gradient(180deg,transparent 0%,${c.bg}ee 20%,${c.bg} 100%)`:`${c.bg}f8`,
      borderTop:`1px solid ${c.border}`,display:"flex",padding:"10px 14px 28px",gap:6,zIndex:200,overflowX:"auto"},
    bottomBtn:(active)=>({flexShrink:0,padding:"8px 6px",borderRadius:12,border:`1px solid ${active?c.pink:c.border}`,
      background:active?`${c.pink}22`:"transparent",color:active?c.pink:c.muted,
      fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer",textAlign:"center",minWidth:52}),
    todayBtn:{flexShrink:0,padding:"8px 10px",borderRadius:12,border:"none",background:gradBtn,color:"#fff",
      fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer",boxShadow:`0 4px 18px ${c.pink}44`,minWidth:80},
  };

  function SyncBadge(){
    const map={loading:["⏳","Loading",c.muted],saving:["🔄","Saving",c.purple],synced:["☁️","Synced","#4ade80"],error:["⚠️","Offline",c.danger]};
    const[icon,label,color]=map[syncStatus];
    return(<div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color,background:`${color}18`,border:`1px solid ${color}44`,padding:"3px 8px",borderRadius:10}}>
      <span className={syncStatus==="saving"?"pulse":""}>{icon}</span>
      <span style={{fontWeight:700,letterSpacing:.5}}>{label}</span>
    </div>);
  }

  // ── JOURNAL CANVAS (GoodNotes style) ──
  function JournalCanvas({day}){
    const canvasRef=useRef(null);
    const isDrawing=useRef(false);
    const lastPos=useRef(null);
    const [tool,setTool]=useState("pen");
    const [inkColor,setInkColor]=useState(c.pink);
    const [lineWidth,setLineWidth]=useState(2);
    const [showTyped,setShowTyped]=useState(false);
    const data=getDayData(day);
    const [typed,setTyped]=useState(data.journal||"");

    useEffect(()=>{
      const canvas=canvasRef.current; if(!canvas)return;
      const ctx=canvas.getContext("2d");
      canvas.width=canvas.offsetWidth*window.devicePixelRatio;
      canvas.height=canvas.offsetHeight*window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio,window.devicePixelRatio);
      // Draw lines background
      ctx.fillStyle=c.surface;ctx.fillRect(0,0,canvas.offsetWidth,canvas.offsetHeight);
      for(let y=32;y<canvas.offsetHeight;y+=32){
        ctx.beginPath();ctx.strokeStyle=`${c.border}`;ctx.lineWidth=0.5;
        ctx.moveTo(16,y);ctx.lineTo(canvas.offsetWidth-16,y);ctx.stroke();
      }
      // Restore saved drawing
      if(data.journalCanvas){
        const img=new Image();
        img.onload=()=>ctx.drawImage(img,0,0,canvas.offsetWidth,canvas.offsetHeight);
        img.src=data.journalCanvas;
      }
    },[day]);

    function getPos(e,canvas){
      const rect=canvas.getBoundingClientRect();
      const touch=e.touches?e.touches[0]:e;
      return{x:(touch.clientX-rect.left),y:(touch.clientY-rect.top)};
    }

    function startDraw(e){
      e.preventDefault();
      const canvas=canvasRef.current;
      isDrawing.current=true;
      lastPos.current=getPos(e,canvas);
    }

    function draw(e){
      e.preventDefault();
      if(!isDrawing.current)return;
      const canvas=canvasRef.current;
      const ctx=canvas.getContext("2d");
      const pos=getPos(e,canvas);
      ctx.beginPath();
      if(tool==="eraser"){ctx.globalCompositeOperation="destination-out";ctx.lineWidth=20;}
      else{ctx.globalCompositeOperation="source-over";ctx.strokeStyle=inkColor;ctx.lineWidth=lineWidth;}
      ctx.lineCap="round";ctx.lineJoin="round";
      ctx.moveTo(lastPos.current.x,lastPos.current.y);
      ctx.lineTo(pos.x,pos.y);ctx.stroke();
      lastPos.current=pos;
    }

    function endDraw(){
      if(!isDrawing.current)return;
      isDrawing.current=false;
      const canvas=canvasRef.current;
      const dataUrl=canvas.toDataURL("image/png");
      updateDayData(day,{journalCanvas:dataUrl});
    }

    function clearCanvas(){
      const canvas=canvasRef.current;
      const ctx=canvas.getContext("2d");
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle=c.surface;ctx.fillRect(0,0,canvas.offsetWidth,canvas.offsetHeight);
      for(let y=32;y<canvas.offsetHeight;y+=32){
        ctx.beginPath();ctx.strokeStyle=c.border;ctx.lineWidth=0.5;
        ctx.moveTo(16,y);ctx.lineTo(canvas.offsetWidth-16,y);ctx.stroke();
      }
      updateDayData(day,{journalCanvas:""});
    }

    const tools=[
      {id:"pen",icon:"✒️",lw:2},
      {id:"marker",icon:"🖊️",lw:6},
      {id:"highlighter",icon:"🌟",lw:14},
      {id:"eraser",icon:"⬜",lw:20},
    ];
    const colors=[c.pink,c.purple,"#ffffff","#000000","#fbbf24","#4ade80","#60a5fa","#f87171"];

    return(
      <div style={s.card()}>
        <div style={s.bigTitle}>📓 Journal</div>

        {/* Mode toggle */}
        <div style={{display:"flex",gap:6,marginBottom:12}}>
          <button style={s.tab(!showTyped)} onClick={()=>setShowTyped(false)}>✏️ Handwrite</button>
          <button style={s.tab(showTyped)} onClick={()=>setShowTyped(true)}>⌨️ Type</button>
        </div>

        {!showTyped?(
          <>
            {/* Toolbar */}
            <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
              {tools.map(t=>(
                <button key={t.id} onClick={()=>{setTool(t.id);setLineWidth(t.lw);}}
                  style={{padding:"6px 10px",borderRadius:10,border:`1px solid ${tool===t.id?c.pink:c.border}`,
                    background:tool===t.id?`${c.pink}22`:c.surface,fontSize:16,cursor:"pointer"}}>
                  {t.icon}
                </button>
              ))}
              <div style={{display:"flex",gap:4,marginLeft:"auto"}}>
                {colors.map(col=>(
                  <div key={col} onClick={()=>{setInkColor(col);setTool("pen");}}
                    style={{width:22,height:22,borderRadius:"50%",background:col,cursor:"pointer",
                      border:`2px solid ${inkColor===col?c.white:c.border}`,
                      boxShadow:inkColor===col?`0 0 8px ${col}88`:"none",transition:"all .15s"}}/>
                ))}
              </div>
              <button onClick={clearCanvas}
                style={{padding:"6px 10px",borderRadius:10,border:`1px solid ${c.danger}`,background:"transparent",color:c.danger,fontSize:11,cursor:"pointer",fontFamily:"'Nunito',sans-serif"}}>
                Clear
              </button>
            </div>

            {/* Canvas */}
            <div style={{position:"relative",borderRadius:12,overflow:"hidden",border:`1px solid ${c.border}`}}>
              <canvas ref={canvasRef}
                style={{width:"100%",height:320,display:"block",touchAction:"none",cursor:tool==="eraser"?"cell":"crosshair"}}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}/>
              <div style={{position:"absolute",top:8,right:8,fontSize:10,color:c.muted,background:`${c.bg}aa`,padding:"2px 6px",borderRadius:6}}>
                🍎 Apple Pencil ready
              </div>
            </div>
            <div style={{fontSize:11,color:c.muted,marginTop:6,textAlign:"center"}}>
              Write with your Apple Pencil or finger ✨
            </div>
          </>
        ):(
          <>
            <div style={{fontSize:12,color:c.muted,marginBottom:10}}>Type your journal entry below 🌸</div>
            <textarea style={{...s.textarea,minHeight:280}}
              placeholder={"Dear diary... 🌸\n\nToday I felt...\n\nI'm proud of myself for...\n\nTomorrow I will..."}
              value={typed} onChange={e=>setTyped(e.target.value)}
              onBlur={()=>updateDayData(day,{journal:typed})}/>
            <button style={{...s.pinkBtn,marginTop:10}} onClick={()=>updateDayData(day,{journal:typed})}>Save 💾</button>
          </>
        )}
      </div>
    );
  }

  // ── COLOR PICKER ──
  function ColorPicker({label,hint,value,onChange}){
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
              <input type="color" value={value} onChange={e=>onChange(e.target.value)}
                style={{position:"absolute",inset:"-8px",width:"calc(100% + 16px)",height:"calc(100% + 16px)",opacity:0,cursor:"pointer"}}/>
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",fontSize:16}}>🎨</div>
            </div>
          </div>
        </div>
        <div style={{marginBottom:2,fontSize:9,color:c.muted,letterSpacing:1,textTransform:"uppercase"}}>Hue</div>
        <div className="slider-track" style={{height:26,marginBottom:8}}
          onClick={e=>{const r=e.currentTarget.getBoundingClientRect();const nH=Math.round(((e.clientX-r.left)/r.width)*360);onChange(hslToHex(nH,Math.max(sat,55),Math.max(Math.min(l,70),35)));}}>
          <div style={{position:"absolute",inset:0,borderRadius:12,background:"linear-gradient(90deg,hsl(0,80%,55%),hsl(30,80%,55%),hsl(60,80%,55%),hsl(90,80%,55%),hsl(120,80%,55%),hsl(150,80%,55%),hsl(180,80%,55%),hsl(210,80%,55%),hsl(240,80%,55%),hsl(270,80%,55%),hsl(300,80%,55%),hsl(330,80%,55%),hsl(360,80%,55%))"}}/>
          <div style={{position:"absolute",top:"50%",left:`${(h/360)*100}%`,transform:"translate(-50%,-50%)",width:20,height:20,borderRadius:"50%",border:"3px solid #fff",background:value,boxShadow:"0 0 8px rgba(0,0,0,.5)",pointerEvents:"none"}}/>
        </div>
        <div style={{marginBottom:2,fontSize:9,color:c.muted,letterSpacing:1,textTransform:"uppercase"}}>Brightness</div>
        <div className="slider-track" style={{height:22,marginBottom:8}}
          onClick={e=>{const r=e.currentTarget.getBoundingClientRect();const nL=Math.round(((e.clientX-r.left)/r.width)*100);onChange(hslToHex(h,sat,nL));}}>
          <div style={{position:"absolute",inset:0,borderRadius:10,background:`linear-gradient(90deg,#000,${hslToHex(h,80,50)},#fff)`}}/>
          <div style={{position:"absolute",top:"50%",left:`${l}%`,transform:"translate(-50%,-50%)",width:18,height:18,borderRadius:"50%",border:"2.5px solid #fff",background:value,boxShadow:"0 0 6px rgba(0,0,0,.5)",pointerEvents:"none"}}/>
        </div>
        <div style={{marginBottom:2,fontSize:9,color:c.muted,letterSpacing:1,textTransform:"uppercase"}}>Saturation</div>
        <div className="slider-track" style={{height:22}}
          onClick={e=>{const r=e.currentTarget.getBoundingClientRect();const nS=Math.round(((e.clientX-r.left)/r.width)*100);onChange(hslToHex(h,nS,l));}}>
          <div style={{position:"absolute",inset:0,borderRadius:10,background:`linear-gradient(90deg,${hslToHex(h,0,l)},${hslToHex(h,100,l)})`}}/>
          <div style={{position:"absolute",top:"50%",left:`${sat}%`,transform:"translate(-50%,-50%)",width:18,height:18,borderRadius:"50%",border:"2.5px solid #fff",background:value,boxShadow:"0 0 6px rgba(0,0,0,.5)",pointerEvents:"none"}}/>
        </div>
      </div>
    );
  }

  // ── AFFIRMATIONS VIEW ──
  function AffirmationsView(){
    const [newAff,setNewAff]=useState("");
    const [editIdx,setEditIdx]=useState(null);
    const [editText,setEditText]=useState("");
    return(
      <div className="fade">
        <div style={s.card(true)}>
          <div style={s.bigTitle}>💭 My Affirmations</div>
          <div style={{fontSize:12,color:c.muted,marginBottom:16,lineHeight:1.6}}>
            Speak it into existence. Read these every day. 🌸
          </div>
          {affirmations.length===0&&(
            <div style={{textAlign:"center",padding:"24px 0",color:c.muted,fontSize:13}}>
              No affirmations yet — add your first one below ✨
            </div>
          )}
          {affirmations.map((aff,i)=>(
            <div key={i} style={{padding:"14px",background:c.surface,borderRadius:12,marginBottom:8,border:`1px solid ${c.border}`,position:"relative"}}>
              {editIdx===i?(
                <>
                  <textarea style={{...s.textarea,minHeight:60}} value={editText} onChange={e=>setEditText(e.target.value)}/>
                  <div style={{display:"flex",gap:6,marginTop:8}}>
                    <button style={{...s.pinkBtn,padding:"6px 14px",fontSize:12}} onClick={()=>{
                      const updated=[...affirmations];updated[i]=editText;
                      setAffirmationsS(updated);setEditIdx(null);
                    }}>Save</button>
                    <button style={{...s.ghostBtn,padding:"6px 14px",fontSize:12}} onClick={()=>setEditIdx(null)}>Cancel</button>
                  </div>
                </>
              ):(
                <>
                  <div style={{fontSize:14,color:c.offwhite,lineHeight:1.6,paddingRight:50,fontStyle:"italic"}}>"{aff}"</div>
                  <div style={{position:"absolute",top:10,right:10,display:"flex",gap:4}}>
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

        {/* Daily affirmation spotlight */}
        {affirmations.length>0&&(
          <div style={{...s.card(true),background:`linear-gradient(145deg,${adj(c.bg,12)},${adj(c.bg,6)})`,textAlign:"center"}}>
            <div style={s.sectionLabel}>✨ Today's Affirmation</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:18,color:c.offwhite,lineHeight:1.8,padding:"8px 0"}}>
              "{affirmations[new Date().getDate()%affirmations.length]}"
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── WEEKLY INTENTION VIEW ──
  function WeeklyIntentionView(){
    const weekNum=Math.ceil(currentDay/7);
    const key=getWeekKey(currentDay);
    const intention=weeklyIntentions[key]||{focus:"",goals:[],word:""};
    const [focus,setFocus]=useState(intention.focus);
    const [word,setWord]=useState(intention.word);
    const [goals,setGoals]=useState(intention.goals||[]);
    const [newGoal,setNewGoal]=useState("");

    function saveIntention(){
      const updated={...weeklyIntentions,[key]:{focus,goals,word}};
      setWeeklyIntentionsS(updated);
    }

    const weeks=Math.ceil(totalDays/7);
    return(
      <div className="fade">
        {/* Week selector */}
        <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:12,paddingBottom:4}}>
          {Array.from({length:weeks},(_,i)=>i+1).map(w=>(
            <button key={w} style={{...s.navBtn(w===weekNum),flexShrink:0,padding:"6px 12px"}}
              onClick={()=>{}}>W{w}</button>
          ))}
        </div>

        <div style={s.card(true)}>
          <div style={s.bigTitle}>🗓️ Week {weekNum} Intentions</div>
          <div style={{fontSize:11,color:c.muted,marginBottom:14}}>Days {(weekNum-1)*7+1}–{Math.min(weekNum*7,totalDays)}</div>

          <div style={{...s.sectionLabel}}>🌟 Word of the Week</div>
          <input style={{...s.input,marginBottom:14}} placeholder="e.g. Discipline, Focus, Growth..."
            value={word} onChange={e=>setWord(e.target.value)} onBlur={saveIntention}/>

          <div style={s.sectionLabel}>🎯 Main Focus</div>
          <textarea style={{...s.textarea,minHeight:80,marginBottom:14}}
            placeholder="What is your main focus this week?"
            value={focus} onChange={e=>setFocus(e.target.value)} onBlur={saveIntention}/>

          <div style={s.sectionLabel}>✅ Weekly Goals</div>
          {goals.map((g,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:`1px solid ${c.borderSoft}`}}>
              <div style={s.checkbox(g.done)} onClick={()=>{
                const updated=goals.map((x,j)=>j===i?{...x,done:!x.done}:x);
                setGoals(updated);
                const wi={...weeklyIntentions,[key]:{focus,goals:updated,word}};
                setWeeklyIntentionsS(wi);
              }}>
                {g.done&&<span style={{fontSize:12,color:"#fff",fontWeight:900}}>✓</span>}
              </div>
              <span style={{flex:1,fontSize:13,color:g.done?c.dim:c.offwhite,textDecoration:g.done?"line-through":"none"}}>{g.text}</span>
              <button onClick={()=>{const updated=goals.filter((_,j)=>j!==i);setGoals(updated);saveIntention();}}
                style={{background:"transparent",border:"none",color:c.muted,cursor:"pointer",fontSize:16}}>×</button>
            </div>
          ))}
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <input style={{...s.input,flex:1}} placeholder="Add a weekly goal..." value={newGoal}
              onChange={e=>setNewGoal(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&newGoal.trim()){const updated=[...goals,{text:newGoal.trim(),done:false}];setGoals(updated);setNewGoal("");const wi={...weeklyIntentions,[key]:{focus,goals:updated,word}};setWeeklyIntentionsS(wi);}}}/>
            <button style={s.pinkBtn} onClick={()=>{if(newGoal.trim()){const updated=[...goals,{text:newGoal.trim(),done:false}];setGoals(updated);setNewGoal("");const wi={...weeklyIntentions,[key]:{focus,goals:updated,word}};setWeeklyIntentionsS(wi);}}}>Add</button>
          </div>
        </div>
      </div>
    );
  }

  // ── WEEKLY REPORT VIEW ──
  function WeeklyReportView(){
    const weeks=Math.ceil(totalDays/7);
    const [selectedWeek,setSelectedWeek]=useState(Math.ceil(currentDay/7));
    const report=getWeekReport(selectedWeek);
    const intention=weeklyIntentions[getWeekKey((selectedWeek-1)*7+1)]||{};

    return(
      <div className="fade">
        <div style={{display:"flex",gap:6,overflowX:"auto",marginBottom:12,paddingBottom:4}}>
          {Array.from({length:weeks},(_,i)=>i+1).map(w=>(
            <button key={w} style={{...s.navBtn(w===selectedWeek),flexShrink:0,padding:"6px 12px"}}
              onClick={()=>setSelectedWeek(w)}>W{w}</button>
          ))}
        </div>

        {!report?(
          <div style={{...s.card(),textAlign:"center",padding:32,color:c.muted}}>No data yet for this week 🌸</div>
        ):(
          <>
            <div style={s.card(true)}>
              <div style={s.bigTitle}>📊 Week {selectedWeek} Report</div>
              <div style={{fontSize:11,color:c.muted,marginBottom:16}}>Days {report.start}–{report.end}</div>

              <div style={s.statRow}>
                <div style={s.statBox}>
                  <div style={s.statNum}>{report.avg}%</div>
                  <div style={s.statLabel}>Avg</div>
                </div>
                <div style={s.statBox}>
                  <div style={{...s.statNum,color:"#4ade80"}}>D{report.best}</div>
                  <div style={s.statLabel}>Best 🔥</div>
                </div>
                <div style={s.statBox}>
                  <div style={{...s.statNum,color:c.danger}}>D{report.worst}</div>
                  <div style={s.statLabel}>Tough 💪</div>
                </div>
              </div>

              {/* Day bars */}
              <div style={s.sectionLabel}>Daily Breakdown</div>
              {report.days.map(d=>{
                const pct=getDayPct(d);const rest=pct===-1;const mood=getDayData(d).mood;
                return(
                  <div key={d} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                    <span style={{fontSize:11,color:c.muted,width:28,flexShrink:0}}>D{d}</span>
                    {rest?(
                      <div style={{flex:1,height:20,borderRadius:4,background:`${c.rest}33`,display:"flex",alignItems:"center",paddingLeft:8}}>
                        <span style={{fontSize:10,color:c.rest}}>😴 Rest Day</span>
                      </div>
                    ):(
                      <>
                        <div style={{...s.progressTrack,flex:1,height:20,borderRadius:6}}>
                          <div style={{...s.progressFill(pct),height:"100%",borderRadius:6,display:"flex",alignItems:"center",paddingLeft:6}}>
                            {pct>20&&<span style={{fontSize:10,color:"#fff",fontWeight:700}}>{pct}%</span>}
                          </div>
                        </div>
                        {mood&&<span style={{fontSize:16}}>{mood}</span>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mood summary */}
            <div style={s.card()}>
              <div style={s.sectionLabel}>😊 Mood This Week</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {report.days.map(d=>{const mood=getDayData(d).mood;return mood?(
                  <div key={d} style={{textAlign:"center",background:c.surface,borderRadius:10,padding:"8px 10px",border:`1px solid ${c.border}`}}>
                    <div style={{fontSize:22}}>{mood}</div>
                    <div style={{fontSize:9,color:c.muted,marginTop:2}}>Day {d}</div>
                  </div>
                ):null;})}
                {report.days.every(d=>!getDayData(d).mood)&&(
                  <div style={{color:c.muted,fontSize:12}}>No moods logged this week yet 🌸</div>
                )}
              </div>
            </div>

            {/* Habit streaks this week */}
            <div style={s.card()}>
              <div style={s.sectionLabel}>🔥 Habit Performance</div>
              {habits.map(h=>{
                const streak=getHabitStreak(h.id);
                const weekDone=report.days.filter(d=>!getDayData(d).restDay&&getDayData(d).habits[h.id]).length;
                const weekTotal=report.days.filter(d=>!getDayData(d).restDay).length;
                const pct=weekTotal?Math.round((weekDone/weekTotal)*100):0;
                return(
                  <div key={h.id} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:12,color:c.offwhite}}>{h.icon} {h.label}</span>
                      <span style={{fontSize:11,color:c.pink,fontWeight:700}}>🔥 {streak} day streak</span>
                    </div>
                    <div style={s.progressTrack}><div style={s.progressFill(pct)}/></div>
                    <div style={{fontSize:10,color:c.muted,marginTop:3}}>{weekDone}/{weekTotal} days this week</div>
                  </div>
                );
              })}
            </div>

            {intention.word&&(
              <div style={{...s.card(),textAlign:"center"}}>
                <div style={s.sectionLabel}>🌟 Word of the Week</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{intention.word}</div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ── OVERVIEW ──
  function OverviewView(){
    const pct=Math.round((completedDays/totalDays)*100);
    const todayMood=getDayData(currentDay).mood;
    return(
      <div className="fade">
        <div style={s.card(true)}>
          <div style={s.sectionLabel}>💌 My Mission</div>
          {editingMission?(
            <>
              <textarea style={{...s.textarea,minHeight:100}} value={mission} onChange={e=>setMission(e.target.value)} autoFocus/>
              <div style={{display:"flex",gap:8,marginTop:10}}>
                <button style={s.pinkBtn} onClick={()=>{setEditingMission(false);setMissionS(mission);}}>Save ✓</button>
                <button style={s.ghostBtn} onClick={()=>setEditingMission(false)}>Cancel</button>
              </div>
            </>
          ):(
            <div onClick={()=>setEditingMission(true)} title="Tap to edit"
              style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:14,lineHeight:1.8,color:c.offwhite,cursor:"pointer",opacity:.9}}>
              "{mission}" <span style={{fontSize:10,color:c.pink,marginLeft:6}}>✏️</span>
            </div>
          )}
        </div>

        <div style={s.statRow}>
          {[{n:currentDay,l:"Today"},{n:streak,l:"Streak 🔥"},{n:completedDays,l:"Done ✨"}].map(({n,l})=>(
            <div key={l} style={s.statBox}><div style={s.statNum}>{n}</div><div style={s.statLabel}>{l}</div></div>
          ))}
        </div>

        {/* Mood quick pick */}
        <div style={s.card()}>
          <div style={s.sectionLabel}>😊 Today's Mood — Day {currentDay}</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {MOODS.map(m=>(
              <button key={m.emoji} onClick={()=>updateDayData(currentDay,{mood:todayMood===m.emoji?"":m.emoji})}
                style={{padding:"8px 10px",borderRadius:12,border:`1px solid ${todayMood===m.emoji?c.pink:c.border}`,
                  background:todayMood===m.emoji?`${c.pink}22`:c.surface,cursor:"pointer",transition:"all .15s",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                <span style={{fontSize:22}}>{m.emoji}</span>
                <span style={{fontSize:8,color:todayMood===m.emoji?c.pink:c.muted,letterSpacing:.5}}>{m.label}</span>
              </button>
            ))}
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
          <div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:4,marginBottom:10}}>
            {Array.from({length:totalDays},(_,i)=>i+1).map(day=>(
              <div key={day} style={s.dayDot(day,getDayPct(day))} onClick={()=>setView(`day-${day}`)} title={`Day ${day}`}>{day}</div>
            ))}
          </div>
          <div style={{display:"flex",gap:10,fontSize:10,color:c.muted,flexWrap:"wrap"}}>
            {[{bg:grad,label:"Complete"},{bg:`${c.pink}55`,label:"Partial"},{bg:`${c.rest}44`,brd:c.rest,label:"Rest"},{bg:c.surface,brd:c.borderSoft,label:"Empty"}]
              .map(({bg,brd,label})=>(
                <span key={label} style={{display:"flex",alignItems:"center",gap:4}}>
                  <span style={{width:10,height:10,borderRadius:3,background:bg,border:brd?`1px solid ${brd}`:"none",display:"inline-block"}}/>
                  {label}
                </span>
              ))}
          </div>
        </div>

        {/* Individual habit streaks */}
        <div style={s.card()}>
          <div style={s.sectionLabel}>🔥 Habit Streaks</div>
          {habits.map(h=>{
            const streak=getHabitStreak(h.id);
            return(
              <div key={h.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${c.borderSoft}`}}>
                <span style={{fontSize:18}}>{h.icon}</span>
                <span style={{flex:1,fontSize:13,color:c.offwhite}}>{h.label}</span>
                <div style={{display:"flex",alignItems:"center",gap:4,background:`${c.pink}18`,border:`1px solid ${c.pink}33`,borderRadius:10,padding:"3px 10px"}}>
                  <span style={{fontSize:14}}>🔥</span>
                  <span style={{fontSize:13,fontWeight:700,color:c.pink}}>{streak}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div style={s.card()}>
          <div style={s.sectionLabel}>Today's Habits — Day {currentDay}</div>
          {habits.map((h,i)=>{
            const checked=getDayData(currentDay).habits[h.id];
            const isRest=getDayData(currentDay).restDay;
            return(
              <div key={h.id} style={{...s.habitRow,borderBottom:i===habits.length-1?"none":`1px solid ${c.borderSoft}`,opacity:isRest?.5:1}}
                onClick={()=>!isRest&&toggleHabit(currentDay,h.id)}>
                <div style={s.checkbox(checked)}>{checked&&<span style={{fontSize:12,color:"#fff",fontWeight:900}}>✓</span>}</div>
                <span style={{fontSize:13,color:checked?c.dim:c.offwhite,textDecoration:checked?"line-through":"none",transition:"all .2s"}}>{h.icon} {h.label}</span>
              </div>
            );
          })}
          <div style={{marginTop:12}}>
            <div style={s.progressTrack}><div style={s.progressFill(getDayPct(currentDay)===-1?0:getDayPct(currentDay))}/></div>
            <div style={{fontSize:11,color:c.muted,marginTop:5}}>{habits.filter(h=>getDayData(currentDay).habits[h.id]).length}/{habits.length} habits ✨</div>
          </div>
          <button style={{...s.pinkBtn,marginTop:14,width:"100%"}} onClick={()=>setView(`day-${currentDay}`)}>Open Day {currentDay} →</button>
        </div>
      </div>
    );
  }

  // ── DAY VIEW ──
  function DayView({day}){
    const data=getDayData(day);const pct=getDayPct(day);
    const [tab,setTab]=useState("habits");
    const [trading,setTrading]=useState(data.trading||"");
    const isRest=data.restDay;

    return(
      <div className="fade">
        <div style={{...s.card(true),background:`linear-gradient(145deg,${adj(c.bg,12)},${adj(c.bg,6)})`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:12,color:c.muted,marginBottom:2}}>
                {isRest?"😴 Rest Day":day===currentDay?"✨ Today":day<currentDay?"Past day":"Upcoming"}
              </div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:42,background:isRest?`linear-gradient(135deg,${c.rest},#93c5fd)`:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1}}>Day {day}</div>
            </div>
            <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:38,color:isRest?c.rest:c.pink,lineHeight:1,textShadow:`0 0 20px ${isRest?c.rest:c.pink}66`}}>
                {isRest?"😴":pct+"%"}
              </div>
              {/* Rest toggle */}
              <button onClick={()=>toggleRestDay(day)}
                style={{padding:"4px 10px",borderRadius:10,border:`1px solid ${isRest?c.rest:c.border}`,
                  background:isRest?`${c.rest}22`:"transparent",color:isRest?c.rest:c.muted,
                  fontSize:10,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer"}}>
                {isRest?"✅ Rest Day":"😴 Mark Rest"}
              </button>
            </div>
          </div>
          {!isRest&&<div style={{...s.progressTrack,marginTop:12}}><div style={s.progressFill(pct)}/></div>}

          {/* Mood for this day */}
          <div style={{marginTop:12}}>
            <div style={{fontSize:9,color:c.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Today's Mood</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {MOODS.map(m=>(
                <button key={m.emoji} onClick={()=>updateDayData(day,{mood:data.mood===m.emoji?"":m.emoji})}
                  style={{padding:"5px 7px",borderRadius:10,border:`1px solid ${data.mood===m.emoji?c.pink:c.border}`,
                    background:data.mood===m.emoji?`${c.pink}22`:c.surface,cursor:"pointer",fontSize:18}}>
                  {m.emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{display:"flex",gap:5,marginBottom:12,overflowX:"auto"}}>
          {[["habits","✅ Habits"],["journal","📓 Journal"],["trading","📈 Trading"]].map(([key,label])=>(
            <button key={key} style={{...s.tab(tab===key),flexShrink:0}} onClick={()=>setTab(key)}>{label}</button>
          ))}
        </div>

        {tab==="habits"&&(
          <div style={s.card()}>
            <div style={s.bigTitle}>Daily Habits</div>
            {isRest&&(
              <div style={{padding:14,background:`${c.rest}18`,border:`1px solid ${c.rest}44`,borderRadius:12,marginBottom:12,textAlign:"center",color:c.rest,fontSize:13}}>
                😴 Rest day — habits paused, not counted against your %
              </div>
            )}
            {habits.map((h,i)=>{
              const checked=data.habits[h.id];
              const hStreak=getHabitStreak(h.id);
              return(
                <div key={h.id} style={{...s.habitRow,borderBottom:i===habits.length-1?"none":`1px solid ${c.borderSoft}`,opacity:isRest?.4:1}}
                  onClick={()=>!isRest&&toggleHabit(day,h.id)}>
                  <div style={s.checkbox(checked&&!isRest)}>{checked&&!isRest&&<span style={{fontSize:13,color:"#fff",fontWeight:900}}>✓</span>}</div>
                  <span style={{fontSize:14,color:checked&&!isRest?c.dim:c.offwhite,textDecoration:checked&&!isRest?"line-through":"none",transition:"all .2s",flex:1}}>{h.icon} {h.label}</span>
                  {hStreak>0&&<div style={{fontSize:10,color:c.pink,background:`${c.pink}18`,borderRadius:8,padding:"2px 6px"}}>🔥{hStreak}</div>}
                </div>
              );
            })}
            {pct===100&&!isRest&&(
              <div style={{marginTop:16,padding:16,background:`${c.pink}18`,border:`1px solid ${c.pink}55`,borderRadius:14,textAlign:"center"}}>
                <div style={{fontSize:26}}>🎉</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:17,background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginTop:6}}>
                  Day {day} Conquered, Queen!
                </div>
              </div>
            )}
          </div>
        )}

        {tab==="journal"&&<JournalCanvas day={day}/>}

        {tab==="trading"&&(
          <div style={s.card()}>
            <div style={s.bigTitle}>Trading Analysis</div>
            <div style={{fontSize:12,color:c.muted,marginBottom:12,lineHeight:1.6}}>Log your market analysis & insights 📊</div>
            <textarea style={{...s.textarea,minHeight:230}}
              placeholder={"📊 Market conditions:\n\n📈 Trades taken:\n\n👀 Setups watched:\n\n💡 Lessons learned:\n\n🎯 Tomorrow's plan:"}
              value={trading} onChange={e=>setTrading(e.target.value)} onBlur={()=>updateDayData(day,{trading})}/>
            <button style={{...s.pinkBtn,marginTop:12}} onClick={()=>updateDayData(day,{trading})}>Save 💾</button>
          </div>
        )}

        <div style={{display:"flex",gap:8,marginTop:6}}>
          {day>1&&<button style={{...s.ghostBtn,flex:1}} onClick={()=>setView(`day-${day-1}`)}>← Day {day-1}</button>}
          {day<totalDays&&<button style={{...s.ghostBtn,flex:1}} onClick={()=>setView(`day-${day+1}`)}>Day {day+1} →</button>}
        </div>
      </div>
    );
  }

  // ── SETTINGS ──
  function SettingsView(){
    const[localDays,setLocalDays]=useState(totalDays);
    const[localStart,setLocalStart]=useState(startDate);
    return(
      <div className="fade">
        {/* Color Studio */}
        <div style={s.card()}>
          <div style={s.bigTitle}>🎨 Color Studio</div>
          <div style={{height:12,borderRadius:10,marginBottom:20,overflow:"hidden",background:`linear-gradient(90deg,${c.pink},${c.purple},${adj(c.pink,15)},${c.purple})`,boxShadow:`0 0 20px ${c.pink}55`}}/>
          <ColorPicker label="✨ Accent Color" hint="buttons, checkboxes, glows" value={accent} onChange={setAccentS}/>
          <ColorPicker label="💜 Secondary Color" hint="gradients & highlights" value={secondary} onChange={setSecondaryS}/>
          <ColorPicker label="🌙 Background Color" hint="app background" value={bgColor} onChange={setBgColorS}/>
          <div style={{...s.sectionLabel,marginTop:4}}>Quick Presets ✨</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {PRESETS.map(p=>{const active=accent===p.accent&&secondary===p.secondary;return(
              <button key={p.name} onClick={()=>{setAccentS(p.accent);setSecondaryS(p.secondary);setBgColorS(p.bg);}}
                style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:12,
                  border:`1px solid ${active?p.accent:c.border}`,background:active?`${p.accent}22`:c.surface,
                  cursor:"pointer",textAlign:"left",fontFamily:"'Nunito',sans-serif",transition:"all .2s"}}>
                <div style={{display:"flex",gap:3,flexShrink:0}}>
                  {[p.accent,p.secondary,p.bg].map((col,i)=>(
                    <div key={i} style={{width:13,height:13,borderRadius:"50%",background:col,border:i===2?`1px solid ${c.border}`:"none"}}/>
                  ))}
                </div>
                <span style={{fontSize:11,color:c.offwhite,fontWeight:600}}>{p.name}</span>
              </button>
            );})}
          </div>
        </div>

        <div style={s.card()}>
          <div style={s.bigTitle}>My Habits 🌸</div>
          {habits.map((h,i)=>(
            <div key={h.id} style={{...s.habitRow,cursor:"default",borderBottom:i===habits.length-1?"none":`1px solid ${c.borderSoft}`}}>
              <span style={{flex:1,fontSize:13,color:c.offwhite}}>{h.icon} {h.label}</span>
              <button style={{background:"transparent",border:"none",color:c.muted,cursor:"pointer",fontSize:18,padding:"0 4px"}}
                onClick={()=>setHabitsS(p=>p.filter(x=>x.id!==h.id))}>×</button>
            </div>
          ))}
          <div style={{display:"flex",gap:8,marginTop:14}}>
            <input style={{...s.input,flex:1}} placeholder="Add a new habit..." value={newHabit}
              onChange={e=>setNewHabit(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&newHabit.trim()){setHabitsS(p=>[...p,{id:Date.now(),label:newHabit.trim(),icon:"✨"}]);setNewHabit("");}}}/>
            <button style={s.pinkBtn} onClick={()=>{if(newHabit.trim()){setHabitsS(p=>[...p,{id:Date.now(),label:newHabit.trim(),icon:"✨"}]);setNewHabit("");}}}>Add</button>
          </div>
        </div>

        <div style={s.card()}>
          <div style={s.bigTitle}>Challenge Setup ⚙️</div>
          <div style={{marginBottom:14}}>
            <div style={{...s.sectionLabel,marginBottom:6}}>Total Days</div>
            <input type="number" style={s.input} value={localDays} min={1} max={365}
              onChange={e=>setLocalDays(Number(e.target.value))} onBlur={()=>setTotalDaysS(localDays)}/>
          </div>
          <div>
            <div style={{...s.sectionLabel,marginBottom:6}}>Start Date</div>
            <input type="date" style={s.input} value={localStart}
              onChange={e=>setLocalStart(e.target.value)} onBlur={()=>setStartDateS(localStart)}/>
          </div>
        </div>

        {/* Notifications guide */}
        <div style={s.card()}>
          <div style={s.bigTitle}>🔔 Notifications Setup</div>
          <div style={{fontSize:12,color:c.muted,lineHeight:1.8,marginBottom:12}}>
            Since this is a web app, set reminders through your phone's built-in Reminders app:
          </div>
          {["Open your iPhone Reminders app","Tap + to create a new reminder","Name it '75 Hard Check-in 🌸'","Set a time (e.g. 8pm daily)","Set repeat to Every Day","Tap the link below when it goes off!"].map((step,i)=>(
            <div key={i} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start"}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:gradBtn,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,color:"#fff",fontWeight:700}}>{i+1}</div>
              <span style={{fontSize:13,color:c.offwhite,lineHeight:1.6}}>{step}</span>
            </div>
          ))}
          <div style={{marginTop:8,padding:12,background:`${c.pink}18`,border:`1px solid ${c.pink}44`,borderRadius:12,fontSize:12,color:c.pink,textAlign:"center"}}>
            💡 Tip: Bookmark your app URL in Safari for one-tap access from your reminder!
          </div>
        </div>

        <div style={s.card()}>
          <div style={s.bigTitle}>Data 🗂️</div>
          <button style={{...s.ghostBtn,color:c.danger,borderColor:c.danger,width:"100%"}}
            onClick={()=>{if(window.confirm("Reset all progress? 💔")){const e={};setDayData(e);scheduleSave({dayData:e});}}}>
            Reset All Progress 🗑️
          </button>
        </div>
      </div>
    );
  }

  if(syncStatus==="loading"){
    return(
      <>
        <style>{css}</style>
        <div style={{...s.root,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:34,background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:16}}>75 Hard ✨</div>
          <div className="pulse" style={{fontSize:30}}>🌸</div>
          <div style={{fontSize:11,color:c.muted,marginTop:14,letterSpacing:2}}>LOADING YOUR JOURNEY...</div>
        </div>
      </>
    );
  }

  const navItems=[
    {id:"overview",icon:"🏠",label:"Home"},
    {id:"affirmations",icon:"💭",label:"Affirm"},
    {id:"intentions",icon:"🗓️",label:"Intentions"},
    {id:"report",icon:"📊",label:"Report"},
    {id:"settings",icon:"🎨",label:"Setup"},
  ];

  return(
    <>
      <style>{css}</style>
      <div style={s.root}>
        <div style={s.header}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:isDayView?10:0}}>
            <div>
              <div style={s.logo}>75 Hard ✨</div>
              <div style={s.logoSub}>your rules · your glow up</div>
            </div>
            <div style={{display:"flex",gap:6,alignItems:"center"}}>
              <SyncBadge/>
              <button style={s.navBtn(view==="settings")} onClick={()=>setView("settings")}>🎨</button>
            </div>
          </div>
          {isDayView&&(
            <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:2}}>
              {[-2,-1,0,1,2].map(offset=>{
                const d=dayNum+offset;if(d<1||d>totalDays)return null;const isA=d===dayNum;
                return(<button key={d} style={{padding:"4px 10px",borderRadius:10,border:`1px solid ${isA?c.pink:c.border}`,
                  background:isA?`${c.pink}22`:"transparent",color:isA?c.pink:c.muted,fontSize:11,cursor:"pointer",flexShrink:0,fontWeight:700}}
                  onClick={()=>setView(`day-${d}`)}>D{d}</button>);
              })}
            </div>
          )}
        </div>

        <div style={s.content}>
          {view==="overview"&&<OverviewView/>}
          {isDayView&&<DayView key={dayNum} day={dayNum}/>}
          {view==="affirmations"&&<AffirmationsView/>}
          {view==="intentions"&&<WeeklyIntentionView/>}
          {view==="report"&&<WeeklyReportView/>}
          {view==="settings"&&<SettingsView/>}
        </div>

        <div style={s.bottomNav}>
          {navItems.map(n=>(
            <button key={n.id} style={s.bottomBtn(view===n.id)} onClick={()=>setView(n.id)}>
              <div>{n.icon}</div>
              <div style={{fontSize:9,marginTop:2}}>{n.label}</div>
            </button>
          ))}
          <button style={s.todayBtn} onClick={()=>setView(`day-${currentDay}`)}>
            <div>🌸</div>
            <div style={{fontSize:9,marginTop:2}}>Day {currentDay}</div>
          </button>
        </div>
      </div>
    </>
  );
}
