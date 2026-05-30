import { useState, useEffect, useRef } from "react";
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

const DEFAULT_MISSION =
  "I am becoming the most disciplined, powerful version of myself. Every single day I choose growth over comfort, clarity over chaos, and strength over excuses. This is my era. 💫";

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
    danger:"#f43f5e",dark};
}

function getDayKey(d){return`day_${d}`;}
function getInitialDay(habits){return{habits:habits.reduce((a,h)=>({...a,[h.id]:false}),{}),journal:"",trading:""};}

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
  const saveTimer = useRef(null);
  const isLoaded = useRef(false);
  const latestState = useRef({});

  const c = buildColors(accent, secondary, bgColor);
  const grad = `linear-gradient(135deg,${c.pink},${c.purple})`;
  const gradBtn = `linear-gradient(135deg,${c.pinkHot},${c.purpleDark})`;

  // keep ref in sync for use inside debounced save
  useEffect(() => {
    latestState.current = { mission, habits, dayData, totalDays, startDate, accent, secondary, bgColor };
  }, [mission, habits, dayData, totalDays, startDate, accent, secondary, bgColor]);

  // ── LOAD ──
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
        }
        setSyncStatus("synced");
      } catch { setSyncStatus("error"); }
      isLoaded.current = true;
    }
    load();
  }, []);

  // ── REAL-TIME ──
  useEffect(() => {
    const ch = supabase.channel("rt_tracker")
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"tracker_data"},(payload) => {
        const d = payload.new;
        if (!d) return;
        if (d.mission !== undefined) setMission(d.mission);
        if (d.habits) setHabits(d.habits);
        if (d.day_data) setDayData(d.day_data);
        if (d.total_days) setTotalDays(d.total_days);
        if (d.start_date) setStartDate(d.start_date);
        if (d.accent) setAccent(d.accent);
        if (d.secondary_color) setSecondary(d.secondary_color);
        if (d.bg_color) setBgColor(d.bg_color);
        setSyncStatus("synced");
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  // ── SAVE ──
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

  const save = (key,setter) => (v) => {
    const val = typeof v==="function" ? v(latestState.current[key]) : v;
    setter(val); scheduleSave({[key]:val});
  };
  const setMissionS=save("mission",setMission);
  const setHabitsS=save("habits",setHabits);
  const setTotalDaysS=save("totalDays",setTotalDays);
  const setStartDateS=save("startDate",setStartDate);
  const setAccentS=save("accent",setAccent);
  const setSecondaryS=save("secondary",setSecondary);
  const setBgColorS=save("bgColor",setBgColor);

  function getDayPct(day){if(!habits.length)return 0;const d=getDayData(day);return Math.round((habits.filter(h=>d.habits[h.id]).length/habits.length)*100);}
  function getCurrentDay(){const diff=Math.floor((new Date()-new Date(startDate))/86400000)+1;return Math.min(Math.max(diff,1),totalDays);}
  function getStreak(){let s=0;for(let i=1;i<=totalDays;i++){if(getDayPct(i)===100)s++;else break;}return s;}

  const currentDay=getCurrentDay(),streak=getStreak();
  const completedDays=Array.from({length:totalDays},(_,i)=>i+1).filter(d=>getDayPct(d)===100).length;
  const isDayView=view.startsWith("day-"),dayNum=isDayView?parseInt(view.split("-")[1]):null;

  const css=`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Nunito:wght@300;400;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    html,body{background:${c.bg};-webkit-tap-highlight-color:transparent;}
    ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:${c.pink};border-radius:2px;}
    .fade{animation:fu .3s cubic-bezier(.22,.68,0,1.2) both;}
    @keyframes fu{from{opacity:0;transform:translateY(12px) scale(.98);}to{opacity:1;transform:none;}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
    .pulse{animation:pulse 1.4s ease infinite;}
    textarea,input[type=text],input[type=number]{font-family:'Nunito',sans-serif;color:${c.offwhite};}
    input[type=date]{font-family:'Nunito',sans-serif;color:${c.offwhite};}
    input[type=date]::-webkit-calendar-picker-indicator{filter:${c.dark?"invert(1) sepia(1) saturate(3) hue-rotate(280deg)":"none"};opacity:.7;}
    input[type=color]{-webkit-appearance:none;appearance:none;border:none;padding:0;cursor:pointer;border-radius:50%;overflow:hidden;width:100%;height:100%;}
    input[type=color]::-webkit-color-swatch-wrapper{padding:0;}
    input[type=color]::-webkit-color-swatch{border:none;border-radius:50%;}
    .slider-track{cursor:pointer;border-radius:12px;overflow:hidden;position:relative;}
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
    dayDot:(day,pct)=>{const isA=isDayView&&day===dayNum,isCur=day===currentDay,done=pct===100,partial=pct>0&&pct<100;
      return{width:"100%",aspectRatio:"1",borderRadius:6,
        background:done?grad:partial?`${c.pink}55`:isCur?`${c.pink}12`:c.surface,
        border:isA?`2px solid ${c.pink}`:isCur&&!done?`1px solid ${c.pinkHot}`:`1px solid ${c.borderSoft}`,
        cursor:"pointer",fontSize:6.5,color:done?"#fff":c.dim,display:"flex",alignItems:"center",justifyContent:"center",
        fontWeight:700,transition:"all .15s",boxShadow:done?`0 0 6px ${c.pink}44`:"none"};},
    tab:(active)=>({flex:1,padding:"8px 4px",borderRadius:12,border:`1px solid ${active?c.pink:c.border}`,
      background:active?`${c.pink}22`:"transparent",color:active?c.pink:c.muted,
      fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer",textAlign:"center"}),
    bottomNav:{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:520,
      background:c.dark?`linear-gradient(180deg,transparent 0%,${c.bg}ee 20%,${c.bg} 100%)`:`${c.bg}f8`,
      borderTop:`1px solid ${c.border}`,display:"flex",padding:"10px 14px 28px",gap:8,zIndex:200},
    bottomBtn:(active)=>({flex:1,padding:"10px 6px",borderRadius:14,border:`1px solid ${active?c.pink:c.border}`,
      background:active?`${c.pink}22`:"transparent",color:active?c.pink:c.muted,
      fontSize:11,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer",textAlign:"center"}),
    todayBtn:{flex:2,padding:"10px",borderRadius:14,border:"none",background:gradBtn,color:"#fff",
      fontSize:12,fontFamily:"'Nunito',sans-serif",fontWeight:700,cursor:"pointer",boxShadow:`0 4px 18px ${c.pink}44`},
  };

  function SyncBadge(){
    const map={loading:["⏳","Loading",c.muted],saving:["🔄","Saving",c.purple],synced:["☁️","Synced","#4ade80"],error:["⚠️","Offline",c.danger]};
    const[icon,label,color]=map[syncStatus];
    return(
      <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color,background:`${color}18`,border:`1px solid ${color}44`,padding:"3px 8px",borderRadius:10}}>
        <span className={syncStatus==="saving"?"pulse":""}>{icon}</span>
        <span style={{fontWeight:700,letterSpacing:.5}}>{label}</span>
      </div>
    );
  }

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
          <div style={{position:"absolute",inset:0,borderRadius:12,background:"linear-gradient(90deg,hsl(0,80%,55%),hsl(30,80%,55%),hsl(60,80%,55%),hsl(90,80%,55%),hsl(120,80%,55%),hsl(150,80%,55%),hsl(180,80%,55%),hsl(210,80%,55%),hsl(240,80%,55%),hsl(270,80%,55%),hsl(300,80%,55%),hsl(330,80%,55%),hsl(360,80%,55%));"}}/>
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

  function ColorSection(){
    return(
      <div style={s.card()}>
        <div style={s.bigTitle}>🎨 Color Studio</div>
        <div style={{height:12,borderRadius:10,marginBottom:20,overflow:"hidden",background:`linear-gradient(90deg,${c.pink},${c.purple},${adj(c.pink,15)},${c.purple})`,boxShadow:`0 0 20px ${c.pink}55`}}/>
        <ColorPicker label="✨ Accent Color" hint="buttons, checkboxes, glows" value={accent} onChange={setAccentS}/>
        <ColorPicker label="💜 Secondary Color" hint="gradients & highlights" value={secondary} onChange={setSecondaryS}/>
        <ColorPicker label="🌙 Background Color" hint="app background" value={bgColor} onChange={setBgColorS}/>
        <div style={{...s.sectionLabel,marginTop:4}}>Quick Presets ✨</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {PRESETS.map(p=>{
            const active=accent===p.accent&&secondary===p.secondary;
            return(
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
            );
          })}
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

  function OverviewView(){
    const pct=Math.round((completedDays/totalDays)*100);
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
          <div style={{display:"flex",gap:12,fontSize:10,color:c.muted,flexWrap:"wrap"}}>
            {[{bg:grad,label:"Complete"},{bg:`${c.pink}55`,label:"Partial"},{bg:c.surface,brd:c.borderSoft,label:"Empty"}].map(({bg,brd,label})=>(
              <span key={label} style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{width:10,height:10,borderRadius:3,background:bg,border:brd?`1px solid ${brd}`:"none",display:"inline-block"}}/>
                {label}
              </span>
            ))}
          </div>
        </div>
        <div style={s.card()}>
          <div style={s.sectionLabel}>Today's Habits — Day {currentDay}</div>
          {habits.map((h,i)=>{
            const checked=getDayData(currentDay).habits[h.id];
            return(
              <div key={h.id} style={{...s.habitRow,borderBottom:i===habits.length-1?"none":`1px solid ${c.borderSoft}`}}
                onClick={()=>toggleHabit(currentDay,h.id)}>
                <div style={s.checkbox(checked)}>{checked&&<span style={{fontSize:12,color:"#fff",fontWeight:900}}>✓</span>}</div>
                <span style={{fontSize:13,color:checked?c.dim:c.offwhite,textDecoration:checked?"line-through":"none",transition:"all .2s"}}>{h.icon} {h.label}</span>
              </div>
            );
          })}
          <div style={{marginTop:12}}>
            <div style={s.progressTrack}><div style={s.progressFill(getDayPct(currentDay))}/></div>
            <div style={{fontSize:11,color:c.muted,marginTop:5}}>{habits.filter(h=>getDayData(currentDay).habits[h.id]).length}/{habits.length} habits ✨</div>
          </div>
          <button style={{...s.pinkBtn,marginTop:14,width:"100%"}} onClick={()=>setView(`day-${currentDay}`)}>Open Day {currentDay} →</button>
        </div>
      </div>
    );
  }

  function DayView({day}){
    const data=getDayData(day),pct=getDayPct(day);
    const[tab,setTab]=useState("habits");
    const[journal,setJournal]=useState(data.journal);
    const[trading,setTrading]=useState(data.trading);
    return(
      <div className="fade">
        <div style={{...s.card(true),background:`linear-gradient(145deg,${adj(c.bg,12)},${adj(c.bg,6)})`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:12,color:c.muted,marginBottom:2}}>
                {day===currentDay?"✨ Today":day<currentDay?"Past day":"Upcoming"}
              </div>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:42,background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1}}>Day {day}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:42,color:c.pink,lineHeight:1,textShadow:`0 0 20px ${c.pink}66`}}>{pct}%</div>
              <div style={{fontSize:9,color:c.muted,letterSpacing:2}}>COMPLETE</div>
            </div>
          </div>
          <div style={{...s.progressTrack,marginTop:14}}><div style={s.progressFill(pct)}/></div>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:14}}>
          {[["habits","✅ Habits"],["journal","📓 Journal"],["trading","📈 Trading"]].map(([key,label])=>(
            <button key={key} style={s.tab(tab===key)} onClick={()=>setTab(key)}>{label}</button>
          ))}
        </div>
        {tab==="habits"&&(
          <div style={s.card()}>
            <div style={s.bigTitle}>Daily Habits</div>
            {habits.map((h,i)=>{
              const checked=data.habits[h.id];
              return(
                <div key={h.id} style={{...s.habitRow,borderBottom:i===habits.length-1?"none":`1px solid ${c.borderSoft}`}}
                  onClick={()=>toggleHabit(day,h.id)}>
                  <div style={s.checkbox(checked)}>{checked&&<span style={{fontSize:13,color:"#fff",fontWeight:900}}>✓</span>}</div>
                  <span style={{fontSize:14,color:checked?c.dim:c.offwhite,textDecoration:checked?"line-through":"none",transition:"all .2s",flex:1}}>{h.icon} {h.label}</span>
                  {checked&&<span style={{fontSize:15}}>💜</span>}
                </div>
              );
            })}
            {pct===100&&(
              <div style={{marginTop:16,padding:16,background:`${c.pink}18`,border:`1px solid ${c.pink}55`,borderRadius:14,textAlign:"center"}}>
                <div style={{fontSize:26}}>🎉</div>
                <div style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:17,background:grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginTop:6}}>
                  Day {day} Conquered, Queen!
                </div>
              </div>
            )}
          </div>
        )}
        {tab==="journal"&&(
          <div style={s.card()}>
            <div style={s.bigTitle}>Daily Journal</div>
            <div style={{fontSize:12,color:c.muted,marginBottom:12,lineHeight:1.6}}>Reflect, release, and rise ✨</div>
            <textarea style={{...s.textarea,minHeight:230}}
              placeholder={"Dear diary... 🌸\n\nToday I felt...\n\nI'm proud of myself for...\n\nTomorrow I will..."}
              value={journal} onChange={e=>setJournal(e.target.value)} onBlur={()=>updateDayData(day,{journal})}/>
            <button style={{...s.pinkBtn,marginTop:12}} onClick={()=>updateDayData(day,{journal})}>Save Journal 💾</button>
          </div>
        )}
        {tab==="trading"&&(
          <div style={s.card()}>
            <div style={s.bigTitle}>Trading Analysis</div>
            <div style={{fontSize:12,color:c.muted,marginBottom:12,lineHeight:1.6}}>Log your market analysis & insights 📊</div>
            <textarea style={{...s.textarea,minHeight:230}}
              placeholder={"📊 Market conditions:\n\n📈 Trades taken:\n\n👀 Setups watched:\n\n💡 Lessons learned:\n\n🎯 Tomorrow's plan:"}
              value={trading} onChange={e=>setTrading(e.target.value)} onBlur={()=>updateDayData(day,{trading})}/>
            <button style={{...s.pinkBtn,marginTop:12}} onClick={()=>updateDayData(day,{trading})}>Save Analysis 💾</button>
          </div>
        )}
        <div style={{display:"flex",gap:8,marginTop:6}}>
          {day>1&&<button style={{...s.ghostBtn,flex:1}} onClick={()=>setView(`day-${day-1}`)}>← Day {day-1}</button>}
          {day<totalDays&&<button style={{...s.ghostBtn,flex:1}} onClick={()=>setView(`day-${day+1}`)}>Day {day+1} →</button>}
        </div>
      </div>
    );
  }

  function SettingsView(){
    const[localDays,setLocalDays]=useState(totalDays);
    const[localStart,setLocalStart]=useState(startDate);
    return(
      <div className="fade">
        <ColorSection/>
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
            <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
              <SyncBadge/>
              <button style={s.navBtn(view==="overview")} onClick={()=>setView("overview")}>Home</button>
              <button style={s.navBtn(view==="settings")} onClick={()=>setView("settings")}>🎨</button>
            </div>
          </div>
          {isDayView&&(
            <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:2}}>
              {[-2,-1,0,1,2].map(offset=>{
                const d=dayNum+offset;if(d<1||d>totalDays)return null;const isA=d===dayNum;
                return(
                  <button key={d} style={{padding:"4px 10px",borderRadius:10,border:`1px solid ${isA?c.pink:c.border}`,
                    background:isA?`${c.pink}22`:"transparent",color:isA?c.pink:c.muted,fontSize:11,cursor:"pointer",flexShrink:0,fontWeight:700}}
                    onClick={()=>setView(`day-${d}`)}>D{d}</button>
                );
              })}
            </div>
          )}
        </div>
        <div style={s.content}>
          {view==="overview"&&<OverviewView/>}
          {isDayView&&<DayView key={dayNum} day={dayNum}/>}
          {view==="settings"&&<SettingsView/>}
        </div>
        <div style={s.bottomNav}>
          <button style={s.bottomBtn(view==="overview")} onClick={()=>setView("overview")}>🏠 Home</button>
          <button style={s.todayBtn} onClick={()=>setView(`day-${currentDay}`)}>🌸 Day {currentDay}</button>
          <button style={s.bottomBtn(view==="settings")} onClick={()=>setView("settings")}>🎨 Setup</button>
        </div>
      </div>
    </>
  );
}
