import React, { useEffect, useMemo, useState, useContext, createContext } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams, Navigate, useLocation } from "react-router-dom";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";

/* ---------- API ---------- */
const API_BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:8080";
function useApi(){ return useMemo(()=>axios.create({ baseURL: API_BASE }),[]); }

/* ---------- Icons ---------- */
const IconSearch = (p:any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className}><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>);
const IconUser   = (p:any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);
const IconDoor   = (p:any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className}><path d="M3 21h18"/><path d="M9 21V8a2 2 0 0 1 2-2h6v15"/><path d="M13 12v.01"/></svg>);
const IconAlert  = (p:any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={p.className}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>);
const LiveDot = ({className}:{className?:string}) => (<span className={`inline-block w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse ${className||""}`} />);

/* ---------- Auth ---------- */
const AuthCtx = createContext<any>(null);
function AuthProvider({children}:{children:any}){
  const [user,setUser] = useState<any>(()=>{ try{ return JSON.parse(localStorage.getItem("pdts_admin")||"null"); }catch{return null;} });
  const login = async (email:string, password:string) => {
    if(email === 'admin@botas.gov.tr' && password === 'Admin123!'){
      const next = { email, role: "ADMIN" }; setUser(next); localStorage.setItem("pdts_admin", JSON.stringify(next)); return true;
    }
    return false;
  };
  const logout = ()=>{ setUser(null); localStorage.removeItem("pdts_admin"); };
  return <AuthCtx.Provider value={{user,login,logout}}>{children}</AuthCtx.Provider>;
}
const useAuth = ()=> useContext(AuthCtx);

/* ---------- Utils ---------- */
const COLORS = { green: "#16a34a", yellow: "#f59e0b", red: "#ef4444", gray: "#6b7280" } as const;
const StatusChip = ({ text, color }:{text:string,color:string}) => (<span className="text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: color, color }}>{text}</span>);

function today(){ return new Date().toISOString().slice(0,10); }
function toMin(t?:string|null){ if(!t) return null; const [h,m] = t.split(":").map(Number); return h*60+m; }
function fmtMin(n:number){ const h = Math.floor(n/60), m = n%60; return h?`${h}h ${m}m`:`${m}m`; }
function mostRecentDate(items:any[]){ const ds = items.map(x=>x?.date).filter(Boolean) as string[]; if(!ds.length) return today(); return ds.reduce((max,cur)=>cur>max?cur:max, ds[0]); }
function activeDateUnion(att:any[], vis:any[]){ const t=today(); return (att.some(a=>a?.date===t)||vis.some(v=>v?.date===t))?t:mostRecentDate([...att,...vis]); }
function isLate(checkIn?:string|null){ const m = toMin(checkIn); if(m==null) return false; return m > (9*60+30); }
function earlyBy(checkIn?:string|null){ const m = toMin(checkIn); if(m==null) return 0; const ref=9*60+30; return Math.max(0, ref-m); }
function lateBy(checkIn?:string|null){ const m = toMin(checkIn); if(m==null) return 0; const ref=9*60+30; return Math.max(0, m-ref); }
function gateStringIN(a:any){ if(!a?.inBuilding) return '-'; return `${a.inBuilding} • Floor ${a.inFloor} • Door ${a.inDoor}`; }
function gateStringOUT(a:any){ if(!a?.outBuilding) return '-'; return `${a.outBuilding} • Floor ${a.outFloor} • Door ${a.outDoor}`; }
const hostIdOf = (v:any) => v?.hostStaffId ?? v?.hostStaff?.id ?? null;

/* ---------- Status ---------- */
function computeStatusFor(rows:any[], dateStr:string){
  const r = rows.find(x=>x.date===dateStr);
  if(!r || !r.checkIn) return { text:"Offsite", color: COLORS.gray };
  if(r.lunchOut && !r.lunchIn) return { text:"At Lunch", color: COLORS.yellow };
  if(!r.checkOut) return { text:"At Work", color: COLORS.green };
  return { text:"Offsite", color: COLORS.gray };
}

/* ---------- Hooks ---------- */
function useStaff(){
  const api = useApi(); const [staff,setStaff] = useState<any[]>([]);
  const refresh = async()=>{ try{ const r=await api.get(`/api/staff`); const data = Array.isArray(r.data)?r.data:(r.data?.content||[]); setStaff(data); }catch(e){ console.error(e);} };
  useEffect(()=>{ refresh(); },[]);
  return { staff, refresh };
}
function useAttendance(){
  const api = useApi(); const [rows,setRows] = useState<any[]>([]);
  const refresh = async(params?:{from?:string,to?:string,staffId?:number})=>{
    try{
      const q = new URLSearchParams();
      if(params?.from) q.append('from', params.from);
      if(params?.to) q.append('to', params.to);
      if(params?.staffId) q.append('staffId', String(params.staffId));
      const url = q.toString()? `/api/attendance?${q.toString()}`: `/api/attendance`;
      const r = await api.get(url);
      const data = Array.isArray(r.data)?r.data:(r.data?.content||[]);
      setRows(data);
    }catch(e){ console.error(e); }
  };
  return { attendance: rows, refresh };
}
function useVisitors(){
  const api = useApi(); const [rows,setRows] = useState<any[]>([]);
  const refresh = async()=>{ try{ const r=await api.get(`/api/visitors`); const data = Array.isArray(r.data)?r.data:(r.data?.content||[]); setRows(data); }catch(e){ console.error(e);} };
  return { visitors: rows, refresh };
}

/* ---------- Charts data ---------- */
function buildEntryTypeSeries(att:any[], visitors:any[], dateStr:string){
  const ofDayAtt = att.filter(a=>a.date===dateStr && a.checkIn);
  const ofDayVis = visitors.filter(v=>v.date===dateStr && v.checkIn);
  const hours = Array.from({length: 13}, (_,i)=> 7+i);
  const series = hours.map(h=> ({ time: `${String(h).padStart(2,'0')}:00`, OWN_CARD:0, TEMP_CARD:0, VISITOR:0 }));
  const sortedA = [...ofDayAtt].sort((a,b)=> (toMin(a.checkIn)||0)-(toMin(b.checkIn)||0));
  let cum = { OWN_CARD:0, TEMP_CARD:0 } as any; let idx = 0;
  const visTimes = ofDayVis.map(v=>toMin(v.checkIn)||0).sort((a,b)=>a-b); let vIdx=0, vCount=0;

  series.forEach(p=>{
    const cutoff = toMin((p as any).time) || 0;
    while(idx < sortedA.length && (toMin(sortedA[idx].checkIn)||0) <= cutoff){
      const t = (sortedA[idx].entryType as 'OWN_CARD'|'TEMP_CARD') || 'OWN_CARD';
      cum[t] += 1; idx++;
    }
    while(vIdx < visTimes.length && visTimes[vIdx] <= cutoff){ vCount++; vIdx++; }
    (p as any).OWN_CARD = cum.OWN_CARD; (p as any).TEMP_CARD = cum.TEMP_CARD; (p as any).VISITOR = vCount;
  });
  return series;
}
function buildStatusPie(staff:any[], att:any[], dateStr:string){
  let atWork=0, atLunch=0, offsite=0, onLeave=0;
  staff.forEach(p=>{
    const rows = att.filter(a=> a.staffId===p.id && a.date===dateStr);
    const st = computeStatusFor(rows, dateStr);
    if(st.text==='At Work') atWork++; else if(st.text==='At Lunch') atLunch++; else if(st.text==='Offsite') offsite++; else onLeave++;
  });
  const data = [
    { name: 'At Work', value: atWork, color: COLORS.green },
    { name: 'At Lunch', value: atLunch, color: COLORS.yellow },
    { name: 'Offsite', value: offsite, color: COLORS.gray },
    { name: 'On Leave', value: onLeave, color: COLORS.red },
  ];
  return data.filter(d=>d.value>0);
}

/* ---------- UI: layout ---------- */
function Header({ query, setQuery }:{query:string,setQuery:(v:string)=>void}){
  const nav = useNavigate(); const { user, logout } = useAuth();
  return (
    <div className="relative border-b border-gray-200 bg-white/90 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 pt-3 pb-2 flex items-center justify-end gap-2 text-sm">
        {user ? (<><Link to="/admin" className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200">Admin</Link><button onClick={logout} className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200">Logout</button></>) : (<Link to="/admin/login" className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200">Login</Link>)}
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <IconSearch className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e)=>setQuery(e.target.value)}
              onKeyDown={(e)=>{ if(e.key==='Enter'){ nav('/profiles'); } }}
              placeholder="Search name/email/department..."
              className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-700 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
function Sidebar(){
  const { user } = useAuth();
  return (
    <aside className="hidden md:flex md:flex-col md:w-60 border-r border-gray-200 bg-white relative">
      <div className="p-4 flex flex-col items-center gap-2">
        <img src="/botas-logo.png" alt="BOTAŞ" className="h-20 w-auto" />
      </div>
      <nav className="px-3 py-2 flex-1 space-y-1">
        <Link to="/" className="block w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100">Home</Link>
        <Link to="/profiles" className="block w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100">Profiles</Link>
        <Link to="/visitors" className="block w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100">Visitors</Link>
        <Link to="/reports" className="block w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100">Reports</Link>
        {user && <Link to="/admin" className="block w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100">Admin Panel</Link>}
      </nav>
      <div className="p-4 text-xs text-gray-500">© {new Date().getFullYear()} PDTS</div>
    </aside>
  );
}

/* ---------- Home (timeline + charts) ---------- */
function expandEventsForDay(att:any[], visitors:any[], staff:any[], day:string){
  const events:any[] = [];
  for(const a of att.filter(x=>x.date===day)){
    const person = staff.find(s=>s.id===a.staffId);
    const name = person ? `${person.firstName} ${person.lastName}` : 'Unknown';
    const entry = (a.entryType||'').replace('_',' ').toLowerCase();
    if(a.checkIn)  events.push({ id:`a-${a.id}-in`,  t:a.checkIn,  date:a.date, name, kind:'CHECK_IN',  subtitle: entry||'own card', line:`IN: ${gateStringIN(a)}`,  staffId:a.staffId, late:isLate(a.checkIn) });
    if(a.lunchOut) events.push({ id:`a-${a.id}-lo`,  t:a.lunchOut, date:a.date, name, kind:'LUNCH_OUT', subtitle:'lunch out',          line:`Went to lunch`,           staffId:a.staffId });
    if(a.lunchIn)  events.push({ id:`a-${a.id}-li`,  t:a.lunchIn,  date:a.date, name, kind:'LUNCH_IN',  subtitle:'lunch in',           line:`Returned from lunch`,    staffId:a.staffId });
    if(a.checkOut) events.push({ id:`a-${a.id}-out`, t:a.checkOut, date:a.date, name, kind:'CHECK_OUT', subtitle: entry||'own card',  line:`OUT: ${gateStringOUT(a)}`, staffId:a.staffId });
  }
  for(const v of visitors.filter(v=>v.date===day)){
    const host = staff.find(s=>s.id===hostIdOf(v)); const hostName = host ? `${host.firstName} ${host.lastName}` : '-';
    const base = `visitor • host: ${hostName}${v.company?` • ${v.company}`:''}${v.purpose?` • ${v.purpose}`:''}`;
    if(v.checkIn)  events.push({ id:`v-${v.id}-in`,  t:v.checkIn,  date:v.date, name:v.name, kind:'VISITOR_IN',  subtitle:base, line:`IN (visitor)` });
    if(v.checkOut) events.push({ id:`v-${v.id}-out`, t:v.checkOut, date:v.date, name:v.name, kind:'VISITOR_OUT', subtitle:base, line:`OUT (visitor)` });
  }
  const order:any = {CHECK_IN:1, LUNCH_OUT:2, LUNCH_IN:3, CHECK_OUT:4, VISITOR_IN:1, VISITOR_OUT:5};
  events.sort((a,b)=> (toMin(a.t)||0)-(toMin(b.t)||0) || (order[a.kind]||9)-(order[b.kind]||9));
  return events;
}
function HomePage({ staff, query, attendance, visitors }:{
  staff:any[], query:string, attendance:any[], visitors:any[]
}){
  const norm = (s:string)=> (s||"").toLocaleLowerCase("tr");
  const q = norm(query);
  const eff = activeDateUnion(attendance, visitors);
  const events = useMemo(()=>expandEventsForDay(attendance, visitors, staff, eff), [attendance, visitors, staff, eff]);
  const filtered = events.filter(e => !q || norm(`${e.name} ${e.subtitle} ${e.line}`).includes(q));
  const [page, setPage] = useState(1); const pageSize = 12;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const start = (page - 1) * pageSize; const visible = filtered.slice(start, start + pageSize);
  useEffect(()=>{ setPage(1); }, [q, eff]);

  const series = useMemo(()=>buildEntryTypeSeries(attendance, visitors, eff), [attendance, visitors, eff]);
  const pie    = useMemo(()=>buildStatusPie(staff, attendance, eff), [staff, attendance, eff]);
  const leaders = staff.filter(s=> s.role==='ADMIN' || s.role==='MANAGER');

  const Badge = ({kind}:{kind:string}) => {
    const map:any = {CHECK_IN:COLORS.green, LUNCH_OUT:COLORS.yellow, LUNCH_IN:COLORS.yellow, CHECK_OUT:COLORS.gray, VISITOR_IN:COLORS.red, VISITOR_OUT:COLORS.gray};
    const label:any = {CHECK_IN:'check-in', LUNCH_OUT:'lunch out', LUNCH_IN:'lunch in', CHECK_OUT:'check-out', VISITOR_IN:'visitor in', VISITOR_OUT:'visitor out'};
    return <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{borderColor:map[kind], color:map[kind]}}>{label[kind]||kind}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-5">
          <div className="font-semibold mb-3">Live Entry Types {eff!==today() ? `(for ${eff})` : 'Today'}</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="#6b7280"/>
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#6b7280"/>
                <Tooltip/><Legend/>
                <Line type="monotone" dataKey="OWN_CARD"  stroke="#16a34a" strokeWidth={2} dot={false}/>
                <Line type="monotone" dataKey="TEMP_CARD" stroke="#f59e0b" strokeWidth={2} dot={false}/>
                <Line type="monotone" dataKey="VISITOR"   stroke="#ef4444" strokeWidth={2} dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-5">
          <div className="font-semibold mb-3">Current Status Distribution {eff!==today() ? `(for ${eff})` : ''}</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" outerRadius={100} innerRadius={60} stroke="#fff" strokeWidth={1}>
                  {pie.map((entry, index) => (<Cell key={`c-${index}`} fill={(entry as any).color} />))}
                </Pie>
                <Tooltip/><Legend/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Leadership */}
      <div className="bg-white rounded-2xl shadow border border-gray-100 p-5">
        <div className="font-semibold mb-3">Leadership & Admin</div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {leaders.map(l=> (
            <Link to={`/profiles/${l.id}`} key={l.id} className="px-3 py-2 rounded-xl border bg-gray-50 flex items-center gap-3 hover:bg-gray-100">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center"><IconUser className="w-5 h-5 text-gray-600"/></div>
              <div className="min-w-0">
                <div className="text-base font-semibold truncate">{l.firstName} {l.lastName}</div>
                <div className="text-xs text-gray-500 truncate">{l.role==='ADMIN'? 'Admin' : 'Department Head'} • {l.department}</div>
              </div>
            </Link>
          ))}
        </ul>
      </div>

      {/* Daily timeline */}
      <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50 flex items-center gap-2">
          <IconDoor className="w-5 h-5 text-gray-500"/><div className="font-medium">Daily Timeline {eff!==today()?`(${eff})`:''}</div>
        </div>
        <ul className="divide-y">
          {visible.map(ev => (
            <li key={ev.id} className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600"><IconUser className="w-5 h-5"/></div>
                <div>
                  <div className="text-sm font-medium text-gray-800 flex items-center gap-2">
                    {ev.name} {ev.late && <IconAlert className="w-4 h-4 text-red-600"/>} <Badge kind={ev.kind}/>
                  </div>
                  <div className="text-xs text-gray-500">{ev.subtitle||'-'}</div>
                  <div className="text-xs text-gray-500">{ev.line}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">{ev.date}</div>
                <div className="text-xs text-gray-600">{ev.t}</div>
              </div>
            </li>
          ))}
          {visible.length===0 && (<li className="px-5 py-8 text-center text-sm text-gray-500">No events</li>)}
        </ul>
        <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-center gap-2">
          {Array.from({length: pages}).map((_,i)=>{ const n=i+1; return (
            <button key={n} onClick={()=>setPage(n)} className={`w-8 h-8 rounded-lg text-sm ${page===n?"bg-red-700 text-white":"bg-white border hover:bg-gray-50"}`}>{n}</button>
          );})}
        </div>
      </div>
    </div>
  );
}

/* ---------- Profiles ---------- */
function ProfilesList({ staff, query, attendance }:{staff:any[],query:string,attendance:any[]}){
  const norm = (s:string)=>(s||"").toLocaleLowerCase("tr");
  const q = norm(query);
  const eff = activeDateUnion(attendance, []);
  const todayRows = attendance.filter(a=>a.date===eff);
  const leaders = staff.filter(s=> s.role==='ADMIN' || s.role==='MANAGER');
  const normals = staff.filter(s=> !leaders.includes(s)).sort((a,b)=> (a.lastName+a.firstName).localeCompare(b.lastName+b.firstName));
  const fLeaders = leaders.filter(p => !q || norm(`${p.firstName} ${p.lastName} ${p.email} ${p.department}`).includes(q));
  const fNormals = normals.filter(p => !q || norm(`${p.firstName} ${p.lastName} ${p.email} ${p.department}`).includes(q));
  const Row = (p:any)=>{ const rowsFor = todayRows.filter(r=>r.staffId===p.id); const st = computeStatusFor(rowsFor, eff); const late = rowsFor[0] && isLate(rowsFor[0].checkIn); return (
    <Link key={p.id} to={`/profiles/${p.id}`} className="block px-5 py-3 hover:bg-gray-50">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600"><IconUser className="w-5 h-5"/></div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-800 flex items-center gap-2 truncate">{p.firstName} {p.lastName} {late && <IconAlert className="w-4 h-4 text-red-600"/>}</div>
          <div className="text-xs text-gray-500 truncate">{p.email}</div>
        </div>
        <StatusChip text={st.text} color={st.color} />
      </div>
    </Link>
  );};
  return (
    <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b bg-gray-50 font-medium">Profiles</div>
      <div className="divide-y">
        {fLeaders.length>0 && (
          <div className="bg-red-50/40">
            <div className="px-5 py-2 text-xs text-gray-500">Admin & Department Heads</div>
            {fLeaders.map(Row)}
          </div>
        )}
        <div className="px-5 py-2 text-xs text-gray-500">All Staff (A–Z)</div>
        {fNormals.map(Row)}
        {fLeaders.length===0 && fNormals.length===0 && (<div className="px-5 py-6 text-sm text-gray-500">No profiles match your search</div>)}
      </div>
    </div>
  );
}
function ProfileDetail({ staff, attendance }:{staff:any[],attendance:any[]}){
  const { id } = useParams(); const pid = Number(id);
  const p = staff.find(s=>s.id===pid);
  const rows = attendance.filter(a=>a.staffId===pid);
  const effAll = activeDateUnion(attendance, []);
  const eff = rows.length ? mostRecentDate(rows) : effAll;

  const [tab,setTab] = useState<'daily'|'monthly'|'yearly'>('daily');
  const tdy = eff; const month = tdy.slice(0,7); const year = tdy.slice(0,4);
  const filtered = rows.filter(r => tab==='daily'? r.date===tdy : tab==='monthly'? r.date.startsWith(month) : r.date.startsWith(year));

  const totalLateMin = filtered.reduce((sum,r)=> sum + lateBy(r.checkIn),0);
  const totalEarlyMin = filtered.reduce((sum,r)=> sum + earlyBy(r.checkIn),0);
  const totalLunchMin = filtered.reduce((sum,r)=>{ const lo = toMin(r.lunchOut); const li = toMin(r.lunchIn); return sum + (lo!=null && li!=null && li>lo? li-lo : 0); },0);
  const todayRow = rows.find(r=>r.date===tdy);

  return (
    <div className="space-y-4">
      {p ? (
        <div className="bg-white rounded-2xl shadow border border-gray-100 p-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-600"><IconUser className="w-7 h-7"/></div>
            <div className="flex-1">
              <div className="text-xl font-semibold flex items-center gap-2">{p.firstName} {p.lastName} {todayRow && isLate(todayRow.checkIn) && <IconAlert className="w-5 h-5 text-red-600"/>}</div>
              <div className="text-sm text-gray-500">{p.role==='ADMIN'?'Admin': (p.role==='MANAGER'?'Department Head':'Staff')} • {p.title} • {p.department} • ID {p.id}</div>
            </div>
            {(() => { const st = computeStatusFor(attendance.filter(a=>a.staffId===pid && a.date===tdy), tdy); return <StatusChip text={st.text} color={st.color}/>; })()}
          </div>
        </div>
      ):(<div className="text-sm text-gray-500">Profile not found</div>)}

      <div className="flex items-center gap-2">
        <button onClick={()=>setTab('daily')} className={`px-3 py-1.5 rounded-lg border ${tab==='daily'?"bg-red-700 text-white border-red-700":"bg-white hover:bg-gray-50"}`}>Daily</button>
        <button onClick={()=>setTab('monthly')} className={`px-3 py-1.5 rounded-lg border ${tab==='monthly'?"bg-red-700 text-white border-red-700":"bg-white hover:bg-gray-50"}`}>Monthly</button>
        <button onClick={()=>setTab('yearly')} className={`px-3 py-1.5 rounded-lg border ${tab==='yearly'?"bg-red-700 text-white border-red-700":"bg-white hover:bg-gray-50"}`}>Yearly</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow p-5 border border-gray-100"><div className="text-sm text-gray-500">Total Late</div><div className="text-2xl font-semibold mt-1">{fmtMin(totalLateMin)}</div></div>
        <div className="bg-white rounded-2xl shadow p-5 border border-gray-100"><div className="text-sm text-gray-500">Total Early</div><div className="text-2xl font-semibold mt-1">{fmtMin(totalEarlyMin)}</div></div>
        <div className="bg-white rounded-2xl shadow p-5 border border-gray-100"><div className="text-sm text-gray-500">Lunch Outside</div><div className="text-2xl font-semibold mt-1">{fmtMin(totalLunchMin)}</div></div>
        <div className="bg-white rounded-2xl shadow p-5 border border-gray-100"><div className="text-sm text-gray-500">Entries</div><div className="text-2xl font-semibold mt-1">{filtered.length}</div></div>
      </div>

      <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b bg-gray-50 text-sm font-medium">Activity Logs</div>
        <table className="w-full table-auto text-sm">
          <thead className="bg-gray-50"><tr className="text-left text-gray-600">
            <th className="px-5 py-2">Event</th><th className="px-5 py-2">Entry Type</th><th className="px-5 py-2">Gate (IN)</th><th className="px-5 py-2">Gate (OUT)</th><th className="px-5 py-2">Check-in</th><th className="px-5 py-2">Check-out</th><th className="px-5 py-2">Lunch</th><th className="px-5 py-2">Date</th></tr></thead>
          <tbody>
            {filtered.sort((a,b)=> (toMin(a.checkIn)||0)-(toMin(b.checkIn)||0)).map(r=> (
              <tr key={r.id} className="border-t">
                <td className="px-5 py-2">{r.checkIn? `Checked in` : `No check-in`}</td>
                <td className="px-5 py-2">{r.entryType?.replace('_',' ')||'-'}</td>
                <td className="px-5 py-2">{gateStringIN(r)}</td>
                <td className="px-5 py-2">{r.checkOut? gateStringOUT(r): '-'}</td>
                <td className="px-5 py-2">{r.checkIn||'-'}</td>
                <td className="px-5 py-2">{r.checkOut||'-'}</td>
                <td className="px-5 py-2">{r.lunchOut&&r.lunchIn? `${r.lunchOut} → ${r.lunchIn}` : (r.lunchOut && !r.lunchIn? `${r.lunchOut} → …` : '-') }</td>
                <td className="px-5 py-2">{r.date}</td>
              </tr>
            ))}
            {filtered.length===0 && (<tr><td className="px-5 py-6 text-gray-500" colSpan={8}>No logs</td></tr>)}
          </tbody>
        </table>
      </div>

      {tab==='daily' && todayRow && (
        <div className="bg-white rounded-2xl shadow p-5 border border-gray-100 text-sm text-gray-700">
          {isLate(todayRow.checkIn) ? (
            <div className="text-red-600 font-medium">Penalty: late by {fmtMin(lateBy(todayRow.checkIn))} (after 09:30).</div>
          ) : (
            <div className="text-green-600 font-medium">Arrived early by {fmtMin(earlyBy(todayRow.checkIn))}.</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Reports ---------- */
function ReportsPage({ staff, attendance }:{staff:any[],attendance:any[]}){
  const eff = activeDateUnion(attendance, []);
  const [tab, setTab] = useState<'daily'|'monthly'|'yearly'>('daily');
  const tdy = eff; const month = tdy.slice(0,7); const year = tdy.slice(0,4);
  const filterByTab = (l:any) => tab==="daily" ? l.date===tdy : tab==="monthly" ? l.date.startsWith(month) : l.date.startsWith(year);
  const logs = attendance.filter(filterByTab);
  const present = logs.filter((l:any)=>l.checkIn && !l.checkOut).length;
  const left    = logs.filter((l:any)=>l.checkOut).length;
  const onLeave = staff.length - new Set(logs.filter((l:any)=>l.checkIn).map((x:any)=>x.staffId)).size;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={()=>setTab('daily')}   className={`px-3 py-1.5 rounded-lg border ${tab==='daily'  ?"bg-red-700 text-white border-red-700":"bg-white hover:bg-gray-50"}`}>Daily</button>
        <button onClick={()=>setTab('monthly')} className={`px-3 py-1.5 rounded-lg border ${tab==='monthly'?"bg-red-700 text-white border-red-700":"bg-white hover:bg-gray-50"}`}>Monthly</button>
        <button onClick={()=>setTab('yearly')}  className={`px-3 py-1.5 rounded-lg border ${tab==='yearly' ?"bg-red-700 text-white border-red-700":"bg-white hover:bg-gray-50"}`}>Yearly</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow p-5 border border-gray-100"><div className="text-sm text-gray-500">Present (IN)</div><div className="text-3xl font-semibold mt-1">{present}</div></div>
        <div className="bg-white rounded-2xl shadow p-5 border border-gray-100"><div className="text-sm text-gray-500">Left (OUT)</div><div className="text-3xl font-semibold mt-1">{left}</div></div>
        <div className="bg-white rounded-2xl shadow p-5 border border-gray-100"><div className="text-sm text-gray-500">Offsite</div><div className="text-3xl font-semibold mt-1">{onLeave}</div></div>
        <div className="bg-white rounded-2xl shadow p-5 border border-gray-100"><div className="text-sm text-gray-500">Records</div><div className="text-3xl font-semibold mt-1">{logs.length}</div></div>
      </div>
      <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b bg-gray-50 text-sm font-medium">Logs</div>
        <table className="w-full table-auto text-sm">
          <thead className="bg-gray-50"><tr className="text-left text-gray-600">
            <th className="px-5 py-2">Person</th><th className="px-5 py-2">Entry Type</th><th className="px-5 py-2">Gate (IN)</th><th className="px-5 py-2">Gate (OUT)</th><th className="px-5 py-2">In</th><th className="px-5 py-2">Out</th><th className="px-5 py-2">Lunch</th><th className="px-5 py-2">Date</th></tr></thead>
          <tbody>
            {logs.sort((a,b)=> (toMin(a.checkIn)||0)-(toMin(b.checkIn)||0)).map((l:any)=>{ const p = staff.find(s=>s.id===l.staffId); return (
              <tr key={l.id} className="border-t">
                <td className="px-5 py-2">{p?`${p.firstName} ${p.lastName}`:'-'}</td>
                <td className="px-5 py-2">{l.entryType?.replace('_',' ')||'-'}</td>
                <td className="px-5 py-2">{gateStringIN(l)}</td>
                <td className="px-5 py-2">{l.checkOut? gateStringOUT(l): '-'}</td>
                <td className="px-5 py-2">{l.checkIn||'-'}</td>
                <td className="px-5 py-2">{l.checkOut||'-'}</td>
                <td className="px-5 py-2">{l.lunchOut&&l.lunchIn? `${l.lunchOut} → ${l.lunchIn}` : (l.lunchOut && !l.lunchIn? `${l.lunchOut} → …` : '-') }</td>
                <td className="px-5 py-2">{l.date}</td>
              </tr>
            );})}
            {logs.length===0 && (<tr><td className="px-5 py-6 text-gray-500" colSpan={8}>No logs</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Visitors ---------- */
function VisitorsList({ visitors, staff }:{visitors:any[],staff:any[]}){
  const eff = activeDateUnion([], visitors);
  const liveVisitors = visitors.filter(v=> v.date===eff && v.checkIn && !v.checkOut);
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow border border-gray-100 p-5">
        <div className="font-semibold mb-3 flex items-center gap-2"><LiveDot/> Visitors (Live) <span className="text-sm text-gray-500">{liveVisitors.length}</span></div>
        {liveVisitors.length? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {liveVisitors.map(v=>{ const host = staff.find(s=>s.id===hostIdOf(v)); return (
              <li key={v.id} className="border rounded-xl px-3 py-2 bg-gray-50 flex items-center justify-between">
                <div className="text-sm text-gray-800">{v.name}</div>
                <div className="text-xs text-gray-500">Host: {host? `${host.firstName} ${host.lastName}` : '-' } • since {v.checkIn}</div>
              </li>
            );})}
          </ul>
        ): (<div className="text-sm text-gray-500">No active visitors.</div>)}
      </div>

      <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b bg-gray-50 font-medium">All Visitors</div>
        <div className="divide-y">
          {visitors.sort((a,b)=> (a.date<b.date?1:-1)).map(v=> { const host = staff.find(s=>s.id===hostIdOf(v)); return (
            <div key={v.id} className="px-5 py-3">
              <div className="text-sm font-medium text-gray-800">{v.name} <span className="text-xs text-gray-500">{v.company?`• ${v.company}`:''}</span></div>
              <div className="text-xs text-gray-500">Purpose: {v.purpose||'-'} • Host: {host? `${host.firstName} ${host.lastName}` : '-' } • In: {v.checkIn||'-'} • Out: {v.checkOut||'-'} • Date: {v.date}</div>
            </div>
          );})}
          {visitors.length===0 && <div className="px-5 py-6 text-sm text-gray-500">No visitors recorded</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Admin ---------- */
function RequireAdmin({children}:{children:any}){ const { user } = useAuth(); if(!user) return <Navigate to="/admin/login" replace/>; return children; }
function AdminLogin(){
  const { user, login } = useAuth(); const nav = useNavigate();
  const [email,setEmail] = useState(""); const [password,setPassword] = useState(""); const [err,setErr] = useState("");
  useEffect(()=>{ if(user) nav('/admin'); },[user]);
  const onSubmit = async(e:any)=>{ e.preventDefault(); const ok = await login(email,password); if(!ok) setErr("Login failed"); else nav('/admin'); };
  return (
    <div className="max-w-sm mx-auto bg-white rounded-2xl shadow border border-gray-100 p-6">
      <div className="text-lg font-semibold mb-3">Admin Login</div>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="text-sm block"><div className="mb-1 text-gray-600">Email</div><input className="w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-red-700" value={email} onChange={e=>setEmail(e.target.value)} /></label>
        <label className="text-sm block"><div className="mb-1 text-gray-600">Password</div><input type="password" className="w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-red-700" value={password} onChange={e=>setPassword(e.target.value)} /></label>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button className="w-full px-4 py-2 rounded-xl bg-red-700 text-white">Login</button>
      </form>
    </div>
  );
}
function AdminHome({ staff }:{staff:any[]}){ const nav = useNavigate();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Admin Panel</div>
        <div className="space-x-2">
          <button onClick={()=>nav('/admin/staff/new')} className="px-3 py-2 rounded-xl bg-red-700 text-white">Add Staff</button>
          <button onClick={()=>nav('/admin/visitor/new')} className="px-3 py-2 rounded-xl bg-gray-800 text-white">Add Visitor</button>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow border border-gray-100 p-5">
        <div className="font-medium mb-3">Staff</div>
        <div className="overflow-auto">
          <table className="w-full table-auto text-sm">
            <thead className="bg-gray-50"><tr className="text-left text-gray-600"><th className="px-3 py-2">ID</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Dept</th><th className="px-3 py-2">Title</th><th className="px-3 py-2">Actions</th></tr></thead>
            <tbody>
              {staff.map((s:any) => (
                <tr key={s.id} className="border-t">
                  <td className="px-3 py-2">{s.id}</td>
                  <td className="px-3 py-2">{s.firstName} {s.lastName}</td>
                  <td className="px-3 py-2">{s.role||'EMPLOYEE'}</td>
                  <td className="px-3 py-2">{s.email}</td>
                  <td className="px-3 py-2">{s.department}</td>
                  <td className="px-3 py-2">{s.title}</td>
                  <td className="px-3 py-2 space-x-2">
                    <Link to={`/profiles/${s.id}`} className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200">Open</Link>
                    <Link to={`/admin/staff/${s.id}/edit`} className="px-2 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Edit</Link>
                  </td>
                </tr>
              ))}
              {staff.length===0 && (<tr><td className="px-3 py-6 text-gray-500" colSpan={7}>No staff</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
function AdminNewStaff(){
  const api = useApi(); const nav = useNavigate();
  const autoTckn = ()=> { const rand = Math.floor(1e9 + Math.random()*9e9).toString().padStart(10,'1'); return ('1' + rand).slice(0,11); };
  const [form, setForm] = useState<any>({ firstName:"", lastName:"", email:"", phoneNumber:"", department:"", title:"", tcKn: autoTckn(), role:"EMPLOYEE", active:true });
  const [err,setErr] = useState(""); const onChange = (e:any)=> setForm({ ...form, [e.target.name]: e.target.value });
  const onCreate = async()=>{ setErr(""); try{ const r=await api.post(`/api/staff`, {...form}); const created=r.data; if(created?.id){ nav(`/profiles/${created.id}`);} else setErr("Create failed (empty response)"); }catch(e:any){ setErr(e?.response?.data?.message || "Create failed"); } };
  return (
    <div className="max-w-2xl bg-white rounded-2xl shadow border border-gray-100 p-6">
      <div className="text-lg font-semibold mb-4">Add Staff</div>
      {err && <div className="mb-3 text-sm text-red-600">{err}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          ["firstName","First Name"], ["lastName","Last Name"], ["email","Email"], ["phoneNumber","Phone"],
          ["department","Department"], ["title","Title"], ["tcKn","National ID (TCKN)"], ["role","Role (ADMIN/MANAGER/EMPLOYEE)"]
        ].map(([name,label]:any)=>(
          <label key={name} className="text-sm"><div className="text-gray-600 mb-1">{label}</div>
            <input name={name} value={(form as any)[name]||""} onChange={onChange} className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-700" />
          </label>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={onCreate} className="px-4 py-2 rounded-xl bg-red-700 text-white">Create</button>
        <Link to="/admin" className="px-4 py-2 rounded-xl bg-gray-100">Cancel</Link>
      </div>
    </div>
  );
}
function AdminEditStaff(){
  const api = useApi(); const nav = useNavigate(); const { id } = useParams();
  const [form, setForm] = useState<any>(null);
  useEffect(()=>{ (async()=>{ try{ const r=await api.get(`/api/staff/${id}`); setForm(r.data); }catch{} })(); },[id]);
  const onChange = (e:any) => setForm({ ...form, [e.target.name]: e.target.value });
  const onSave = async()=>{ await api.patch(`/api/staff/${id}`, form); nav(`/profiles/${id}`); };
  if(!form) return <div className="text-sm text-gray-500">Loading…</div>;
  return (
    <div className="max-w-2xl bg-white rounded-2xl shadow border border-gray-100 p-6">
      <div className="text-lg font-semibold mb-4">Edit Staff</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          ["firstName","First Name"], ["lastName","Last Name"], ["email","Email"], ["phoneNumber","Phone"],
          ["department","Department"], ["title","Title"], ["tcKn","National ID (TCKN)"], ["role","Role"]
        ].map(([name,label]:any)=>(
          <label key={name} className="text-sm"><div className="text-gray-600 mb-1">{label}</div>
            <input name={name} value={form[name]||""} onChange={onChange} className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-700" />
          </label>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={onSave} className="px-4 py-2 rounded-xl bg-blue-600 text-white">Save</button>
        <Link to={`/profiles/${id}`} className="px-4 py-2 rounded-xl bg-gray-100">Cancel</Link>
      </div>
    </div>
  );
}
function AdminNewVisitor(){
  const api = useApi(); const nav = useNavigate();
  const [form, setForm] = useState<any>({ name:"", company:"", purpose:"", hostStaffId:"", date: today() });
  const onChange = (e:any) => setForm({ ...form, [e.target.name]: e.target.value });
  const onCreate = async()=>{ try{ await api.post(`/api/visitors`, form); }catch{} nav('/visitors'); };
  return (
    <div className="max-w-xl bg-white rounded-2xl shadow border border-gray-100 p-6">
      <div className="text-lg font-semibold mb-4">Add Visitor</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-sm"><div className="mb-1 text-gray-600">Name</div><input name="name" value={form.name} onChange={onChange} className="w-full px-3 py-2 rounded-xl border"/></label>
        <label className="text-sm"><div className="mb-1 text-gray-600">Company</div><input name="company" value={form.company} onChange={onChange} className="w-full px-3 py-2 rounded-xl border"/></label>
        <label className="text-sm md:col-span-2"><div className="mb-1 text-gray-600">Purpose</div><input name="purpose" value={form.purpose} onChange={onChange} className="w-full px-3 py-2 rounded-xl border"/></label>
        <label className="text-sm"><div className="mb-1 text-gray-600">Host Staff ID</div><input name="hostStaffId" value={form.hostStaffId} onChange={onChange} className="w-full px-3 py-2 rounded-xl border"/></label>
        <label className="text-sm"><div className="mb-1 text-gray-600">Date</div><input name="date" value={form.date} onChange={onChange} className="w-full px-3 py-2 rounded-xl border"/></label>
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={onCreate} className="px-4 py-2 rounded-xl bg-gray-800 text-white">Create</button>
        <Link to="/visitors" className="px-4 py-2 rounded-xl bg-gray-100">Cancel</Link>
      </div>
    </div>
  );
}

/* ---------- Shell ---------- */
function Shell(){
  const { staff } = useStaff();
  const { attendance, refresh: refreshAtt } = useAttendance();
  const { visitors,  refresh: refreshVisitors } = useVisitors();
  const [query,setQuery] = useState("");
  const loc = useLocation();

  useEffect(()=>{ refreshAtt(); refreshVisitors(); },[]);
  useEffect(()=>{ // refresh by route to avoid stale views
    if(loc.pathname.startsWith('/visitors')) refreshVisitors();
    if(loc.pathname.startsWith('/profiles') || loc.pathname==='/') refreshAtt();
  }, [loc.pathname]);

  return (
    <div className="relative flex min-h-screen bg-gray-100 text-gray-900">
      <Sidebar/>
      <div className="flex-1 min-w-0">
        <Header query={query} setQuery={setQuery}/>
        <div className="mx-auto max-w-6xl px-4 py-6">
          <Routes>
            <Route path="/" element={<HomePage staff={staff} query={query} attendance={attendance} visitors={visitors} />} />
            <Route path="/profiles" element={
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5"><ProfilesList staff={staff} query={query} attendance={attendance}/></div>
                <div className="lg:col-span-7"><div className="bg-white rounded-2xl shadow border border-gray-100 p-6 text-sm text-gray-500">Select a profile to view details</div></div>
              </div>
            } />
            <Route path="/profiles/:id" element={<ProfileDetail staff={staff} attendance={attendance}/>} />
            <Route path="/visitors" element={<VisitorsList visitors={visitors} staff={staff}/>} />
            <Route path="/reports" element={<ReportsPage staff={staff} attendance={attendance}/>} />

            {/* Admin */}
            <Route path="/admin/login" element={<AdminLogin/>} />
            <Route path="/admin" element={<RequireAdmin><AdminHome staff={staff}/></RequireAdmin>} />
            <Route path="/admin/staff/new" element={<RequireAdmin><AdminNewStaff/></RequireAdmin>} />
            <Route path="/admin/staff/:id/edit" element={<RequireAdmin><AdminEditStaff/></RequireAdmin>} />
            <Route path="/admin/visitor/new" element={<RequireAdmin><AdminNewVisitor/></RequireAdmin>} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

/* ---------- App ---------- */
export default function App(){
  return (
    <AuthProvider>
      <BrowserRouter>
        <Shell/>
      </BrowserRouter>
    </AuthProvider>
  );
}
