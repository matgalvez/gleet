'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Dashboard() {
  const [citas, setCitas] = useState<any[]>([])
  const [ventas, setVentas] = useState<any[]>([])
  const [inventario, setInventario] = useState<any[]>([])
  const [grupos, setGrupos] = useState<any[]>([])
  const [tab, setTab] = useState('inicio')

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    const { data: c } = await supabase.from('citas').select('*').order('fecha').order('hora')
    const { data: v } = await supabase.from('ventas').select('*').order('created_at', { ascending: false })
    const { data: i } = await supabase.from('inventario').select('*')
    const { data: g } = await supabase.from('grupos_venta').select('*').order('fecha', { ascending: false })
    if (c) setCitas(c)
    if (v) setVentas(v)
    if (i) setInventario(i)
    if (g) setGrupos(g)
  }

  const hoy = new Date().toISOString().split('T')[0]
  const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CL')

  const semana = () => {
    const d = new Date()
    const dia = d.getDay()
    const lun = new Date(d)
    lun.setDate(d.getDate() - dia + (dia === 0 ? -6 : 1))
    const dom = new Date(lun)
    dom.setDate(lun.getDate() + 6)
    return {
      lun: lun.toISOString().split('T')[0],
      dom: dom.toISOString().split('T')[0]
    }
  }

  const sem = semana()
  const ventasSem = ventas.filter(v => v.fecha >= sem.lun && v.fecha <= sem.dom)
  const totalServSem = ventasSem.filter(v => v.tipo === 'servicio').reduce((a, v) => a + v.monto, 0)
  const totalProdSem = ventasSem.filter(v => v.tipo === 'producto').reduce((a, v) => a + v.monto, 0)
  const stockBajo = inventario.filter(p => p.stock <= p.stock_minimo)
  const deudas = grupos.filter(g => g.estado !== 'pagado')
  const diasDesde = (ds: string) => Math.floor((new Date().getTime() - new Date(ds + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24))
  const deudasViejas = deudas.filter(g => diasDesde(g.fecha) > 30)

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const anoActual = new Date().getFullYear()
  const dataAnual = MESES.map((_, i) => {
    const vMes = ventas.filter(v => {
      const d = new Date(v.fecha + 'T12:00:00')
      return d.getMonth() === i && d.getFullYear() === anoActual
    })
    return {
      mes: MESES[i],
      serv: vMes.filter(v => v.tipo === 'servicio').reduce((a, v) => a + v.monto, 0),
      prod: vMes.filter(v => v.tipo === 'producto').reduce((a, v) => a + v.monto, 0)
    }
  })

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f9f9f9' }}>
      {/* HEADER */}
      <div style={{ background: '#1a1a1a', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <div style={{ color: 'white', fontSize: 20, fontWeight: 500, letterSpacing: 3 }}>GLEET</div>
          <div style={{ width: 28, height: 2, background: '#c8a96e', margin: '3px 0 2px' }}></div>
          <div style={{ color: '#c8a96e', fontSize: 9, letterSpacing: 3 }}>CENTRO DE ESTÉTICA</div>
        </div>
        <div style={{ marginLeft: 'auto', color: '#888', fontSize: 11 }}>
          {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* NAV */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 16px', background: '#f0f0f0', borderBottom: '1px solid #e0e0e0', overflowX: 'auto' }}>
        {[['inicio','Inicio'],['agenda','Agenda'],['ventas','Ventas'],['historial','Historial'],['inventario','Inventario'],['proveedores','Proveedores'],['reportes','Reportes'],['topclientes','Top Clientas']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: '6px 14px', borderRadius: 8, border: tab === id ? '1px solid #ccc' : '1px solid transparent', background: tab === id ? 'white' : 'transparent', cursor: 'pointer', fontSize: 12, fontWeight: tab === id ? 500 : 400, whiteSpace: 'nowrap' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        {tab === 'inicio' && (
          <div>
            {deudasViejas.length > 0 && (
              <div style={{ background: '#FAEEDA', border: '1px solid #EF9F27', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#633806' }}>
                ⚠ {deudasViejas.length} deuda{deudasViejas.length > 1 ? 's' : ''} lleva{deudasViejas.length > 1 ? 'n' : ''} más de 30 días: {deudasViejas.map(g => `${g.cliente} — ${fmt(g.total - g.pagado)}`).join(', ')}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
              {[
                { label: 'Servicios semana', val: fmt(totalServSem) },
                { label: 'Productos semana', val: fmt(totalProdSem) },
                { label: 'Total semana', val: fmt(totalServSem + totalProdSem) },
              ].map(m => (
                <div key={m.label} style={{ background: '#f0f0f0', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: '#666' }}>{m.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 500 }}>{m.val}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div style={{ background: '#f0f0f0', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: '#666' }}>Stock bajo</div>
                <div style={{ fontSize: 20, fontWeight: 500 }}>{stockBajo.length}</div>
              </div>
              <div style={{ background: '#f0f0f0', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 11, color: '#666' }}>Deudas +30 días</div>
                <div style={{ fontSize: 20, fontWeight: 500, color: deudasViejas.length > 0 ? '#A32D2D' : 'inherit' }}>{deudasViejas.length}</div>
              </div>
            </div>
            <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Resumen año {anoActual}</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 700 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #eee' }}>Concepto</th>
                      {MESES.map((m, i) => <th key={m} style={{ textAlign: 'right', padding: '6px 4px', borderBottom: '1px solid #eee', color: i === new Date().getMonth() ? '#1a1a1a' : '#666', fontWeight: i === new Date().getMonth() ? 700 : 400 }}>{m.slice(0,3)}</th>)}
                      <th style={{ textAlign: 'right', padding: '6px 8px', borderBottom: '1px solid #eee' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '6px 8px', fontWeight: 500 }}>Servicios</td>
                      {dataAnual.map(d => <td key={d.mes} style={{ textAlign: 'right', padding: '6px 4px', color: '#444' }}>{fmt(d.serv)}</td>)}
                      <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 500 }}>{fmt(dataAnual.reduce((a,d) => a+d.serv, 0))}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 8px', fontWeight: 500, color: '#c8a96e' }}>Productos</td>
                      {dataAnual.map(d => <td key={d.mes} style={{ textAlign: 'right', padding: '6px 4px', color: '#c8a96e' }}>{fmt(d.prod)}</td>)}
                      <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 500, color: '#c8a96e' }}>{fmt(dataAnual.reduce((a,d) => a+d.prod, 0))}</td>
                    </tr>
                    <tr style={{ borderTop: '1px solid #eee' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 500 }}>Total</td>
                      {dataAnual.map(d => <td key={d.mes} style={{ textAlign: 'right', padding: '6px 4px', fontWeight: 500 }}>{fmt(d.serv+d.prod)}</td>)}
                      <td style={{ textAlign: 'right', padding: '6px 8px', fontWeight: 500 }}>{fmt(dataAnual.reduce((a,d) => a+d.serv+d.prod, 0))}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Próximas citas</div>
                {citas.filter(c => c.fecha >= hoy).slice(0,5).length ? citas.filter(c => c.fecha >= hoy).slice(0,5).map(c => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f0ede6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500 }}>{c.cliente?.[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{c.cliente}</div>
                      <div style={{ fontSize: 11, color: '#666' }}>{c.servicio}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: '#666' }}>{new Date(c.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}</div>
                      <div style={{ fontSize: 11, fontWeight: 500 }}>{c.hora}</div>
                    </div>
                  </div>
                )) : <p style={{ fontSize: 12, color: '#666' }}>Sin citas próximas</p>}
              </div>
              <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Inventario crítico</div>
                {stockBajo.length ? stockBajo.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ fontSize: 12 }}>{p.nombre}</span>
                    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: p.stock === 0 ? '#FCEBEB' : '#FAEEDA', color: p.stock === 0 ? '#A32D2D' : '#854F0B' }}>{p.stock === 0 ? 'Sin stock' : '↓ ' + p.stock}</span>
                  </div>
                )) : <p style={{ fontSize: 12, color: '#666' }}>Todo en orden</p>}
              </div>
            </div>
          </div>
        )}

        {tab === 'agenda' && <AgendaTab citas={citas} onReload={cargarDatos} hoy={hoy} />}
        {tab === 'ventas' && <VentasTab ventas={ventas} grupos={grupos} inventario={inventario} onReload={cargarDatos} hoy={hoy} />}
        {tab === 'historial' && <HistorialTab ventas={ventas} grupos={grupos} />}
        {tab === 'inventario' && <InventarioTab inventario={inventario} onReload={cargarDatos} />}
        {tab === 'proveedores' && <ProveedoresTab inventario={inventario} onReload={cargarDatos} />}
        {tab === 'reportes' && <ReportesTab ventas={ventas} />}
{tab === 'topclientes' && <TopClientasTab ventas={ventas} grupos={grupos} />}
      </div>
    </div>
  )
}

// ---- PLACEHOLDERS (los rellenamos en el siguiente paso) ----
function AgendaTab({ citas, onReload, hoy }: any) {
  const [semOffset, setSemOffset] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [cliente, setCliente] = useState('')
  const [servicio, setServicio] = useState('Corte de cabello')
  const [fecha, setFecha] = useState(hoy)
  const [hora, setHora] = useState('09:00')
  const [duracion, setDuracion] = useState(60)
  const [nota, setNota] = useState('')
  const [detalle, setDetalle] = useState<any>(null)

  const SERVICIOS = [
    {nombre:'Corte de cabello',cat:'corte',dur:60},{nombre:'Corte + lavado',cat:'corte',dur:90},
    {nombre:'Baño de color',cat:'color',dur:90},{nombre:'Coloración raíz',cat:'color',dur:90},
    {nombre:'Coloración completa',cat:'color',dur:120},{nombre:'Balayage',cat:'decoloracion',dur:180},
    {nombre:'Mechas',cat:'decoloracion',dur:150},{nombre:'Babylights',cat:'decoloracion',dur:180},
    {nombre:'Decoloración completa',cat:'decoloracion',dur:180},{nombre:'Keratina',cat:'alisado',dur:180},
    {nombre:'Alisado brasileño',cat:'alisado',dur:180},{nombre:'Alisado japonés',cat:'alisado',dur:240},
    {nombre:'Lavado y secado',cat:'otro',dur:60},{nombre:'Peinado',cat:'otro',dur:60},{nombre:'Otro',cat:'otro',dur:60}
  ]
  const CAT_COLOR:any = {corte:'#534AB7',color:'#D4537E',decoloracion:'#BA7517',alisado:'#0F6E56',otro:'#888780'}
  const CAT_BG:any = {corte:'#EEEDFE',color:'#FBEAF0',decoloracion:'#FAEEDA',alisado:'#E1F5EE',otro:'#F1EFE8'}
  const srvCat = (n:string) => SERVICIOS.find(s=>s.nombre===n)?.cat||'otro'
  const durFmt = (m:number) => m<60?m+'min':m%60===0?(m/60)+'h':Math.floor(m/60)+'h'+m%60
  const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const HORAS:string[] = []
  for(let h=8;h<=23;h++){HORAS.push(String(h).padStart(2,'0')+':00');if(h<23)HORAS.push(String(h).padStart(2,'0')+':30')}
  const dateStr = (d:Date) => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')
  const getLunes = (off:number) => { const d=new Date();const dia=d.getDay();d.setDate(d.getDate()-dia+(dia===0?-6:1)+off*7);d.setHours(0,0,0,0);return d }
  const lunes = getLunes(semOffset)
  const dias = Array.from({length:7},(_,i)=>{const d=new Date(lunes);d.setDate(lunes.getDate()+i);return d})
  const hoyReal = new Date().toISOString().split('T')[0]
  const ahora = new Date().getHours()*60+new Date().getMinutes()
  const citasHoy = citas.filter((c:any)=>c.fecha===hoyReal).sort((a:any,b:any)=>a.hora.localeCompare(b.hora))

  async function agregar() {
    if(!cliente||!fecha){alert('Completa cliente y fecha');return}
    await supabase.from('citas').insert({cliente,servicio,fecha,hora,duracion,nota})
    setCliente('');setNota('');setShowForm(false);onReload()
  }
  async function eliminar(id:string) {
    await supabase.from('citas').delete().eq('id',id)
    setDetalle(null);onReload()
  }

  return (
    <div>
      {/* Panel hoy */}
      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14,marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <span style={{fontSize:13,fontWeight:500}}>Hoy — {new Date().toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})}</span>
          <span style={{fontSize:12,color:'#666'}}>{citasHoy.length} cita{citasHoy.length!==1?'s':''}</span>
        </div>
        {citasHoy.length ? citasHoy.map((c:any)=>(
          <div key={c.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid #f0f0f0'}}>
            <div style={{width:4,height:36,borderRadius:2,background:CAT_COLOR[srvCat(c.servicio)],flexShrink:0}}></div>
            <div style={{width:28,height:28,borderRadius:'50%',background:'#f0ede6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:500}}>{c.cliente?.[0]}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:500}}>{c.cliente}</div>
              <div style={{fontSize:11,color:'#666'}}>{c.servicio}{c.nota?` · ${c.nota}`:''}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:13,fontWeight:500}}>{c.hora}</div>
              <div style={{fontSize:10,color:'#888',background:'#f0f0f0',borderRadius:4,padding:'1px 5px'}}>{durFmt(c.duracion||60)}</div>
            </div>
            <button onClick={()=>eliminar(c.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#ccc',fontSize:16}}>×</button>
          </div>
        )) : <p style={{fontSize:12,color:'#666'}}>No hay citas para hoy</p>}
      </div>

      {/* Calendario semanal */}
      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14,marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,flexWrap:'wrap'}}>
          <button onClick={()=>setSemOffset(s=>s-1)} style={{padding:'4px 10px',borderRadius:8,border:'1px solid #e0e0e0',background:'white',cursor:'pointer'}}>←</button>
          <span style={{flex:1,textAlign:'center',fontSize:13,fontWeight:500}}>{dias[0].toLocaleDateString('es-CL',{day:'numeric',month:'short'})} — {dias[6].toLocaleDateString('es-CL',{day:'numeric',month:'short',year:'numeric'})}</span>
          <button onClick={()=>setSemOffset(0)} style={{padding:'4px 10px',borderRadius:8,border:'1px solid #e0e0e0',background:'white',cursor:'pointer'}}>Hoy</button>
          <button onClick={()=>setSemOffset(s=>s+1)} style={{padding:'4px 10px',borderRadius:8,border:'1px solid #e0e0e0',background:'white',cursor:'pointer'}}>→</button>
          <button onClick={()=>setShowForm(f=>!f)} style={{padding:'6px 14px',borderRadius:8,border:'none',background:'#1a1a1a',color:'white',cursor:'pointer',fontSize:12}}>+ Nueva cita</button>
        </div>

        {/* Leyenda */}
        <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:8,fontSize:11,color:'#666'}}>
          {[['#534AB7','Corte'],['#D4537E','Color/Raíz'],['#BA7517','Deco/Mechas'],['#0F6E56','Alisado'],['#888780','Otro']].map(([c,l])=>(
            <span key={l} style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:10,borderRadius:2,background:c,display:'inline-block'}}></span>{l}</span>
          ))}
        </div>

        <div style={{overflowY:'auto',maxHeight:600,border:'1px solid #e0e0e0',borderRadius:8}}>
          {/* Header sticky */}
          <div style={{position:'sticky',top:0,zIndex:10,display:'grid',gridTemplateColumns:'48px repeat(7,1fr)',background:'white',borderBottom:'1px solid #e0e0e0'}}>
            <div style={{background:'#f9f9f9',borderRight:'1px solid #e0e0e0'}}></div>
            {dias.map(d=>{const ds=dateStr(d);const isH=ds===hoyReal;return(
              <div key={ds} style={{borderRight:'1px solid #e0e0e0',padding:'8px 4px',textAlign:'center',background:isH?'#f9f7f2':'white'}}>
                <div style={{fontSize:11,color:'#666'}}>{DIAS[d.getDay()]}</div>
                <div style={{fontSize:17,fontWeight:500,width:30,height:30,borderRadius:'50%',background:isH?'#1a1a1a':'transparent',color:isH?'white':'inherit',display:'flex',alignItems:'center',justifyContent:'center',margin:'1px auto 0'}}>{d.getDate()}</div>
              </div>
            )})}
          </div>
          {/* Filas horas */}
          <div style={{display:'grid',gridTemplateColumns:'48px repeat(7,1fr)'}}>
            {HORAS.map((hora,hi)=>[
              <div key={'h'+hi} style={{borderRight:'1px solid #e0e0e0',borderBottom:'1px solid #f0f0f0',padding:'0 5px',fontSize:10,color:'#999',height:48,display:'flex',alignItems:'flex-start',paddingTop:4,background:'#f9f9f9'}}>{hora}</div>,
              ...dias.map(d=>{
                const ds=dateStr(d);const isH=ds===hoyReal
                const cx=citas.filter((c:any)=>c.fecha===ds&&c.hora===hora)
                const slotMin=parseInt(hora)*60+(hora.includes(':30')?30:0)
                const showLine=isH&&ahora>=slotMin&&ahora<slotMin+30
                const pct=showLine?Math.round(((ahora-slotMin)/30)*100):0
                return(
                  <div key={ds+hora} onClick={()=>{setFecha(ds);setHora(hora);setShowForm(true);setDetalle(null)}}
                    style={{borderRight:'1px solid #e0e0e0',borderBottom:'1px solid #f0f0f0',padding:2,minHeight:48,height:48,cursor:'pointer',background:isH?'#fdfcfa':'white',position:'relative'}}
                    onMouseEnter={e=>(e.currentTarget.style.background=isH?'#f5f2ec':'#f9f9f9')}
                    onMouseLeave={e=>(e.currentTarget.style.background=isH?'#fdfcfa':'white')}>
                    {cx.map((c:any)=>{const cat=srvCat(c.servicio);return(
                      <div key={c.id} onClick={e=>{e.stopPropagation();setDetalle(c);setShowForm(false)}}
                        style={{borderLeft:`3px solid ${CAT_COLOR[cat]}`,background:CAT_BG[cat],borderRadius:0,padding:'2px 4px',marginBottom:2,fontSize:10,cursor:'pointer',overflow:'hidden'}}>
                        <div style={{fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',color:CAT_COLOR[cat]}}>{c.cliente}</div>
                        <div style={{fontSize:9,color:CAT_COLOR[cat],opacity:.8}}>{c.servicio}</div>
                      </div>
                    )})}
                    {showLine&&<div style={{position:'absolute',left:0,right:0,height:2,background:'#E24B4A',top:`${pct}%`,zIndex:5}}><div style={{position:'absolute',left:-2,width:8,height:8,borderRadius:'50%',background:'#E24B4A',top:-3}}></div></div>}
                  </div>
                )
              })
            ])}
          </div>
        </div>
      </div>

      {/* Detalle cita */}
      {detalle && (
        <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14,marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
            <span style={{fontSize:13,fontWeight:500}}>{detalle.cliente} · {detalle.hora}</span>
            <button onClick={()=>setDetalle(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#999'}}>×</button>
          </div>
          <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:12}}>
            <div style={{width:4,height:52,borderRadius:2,background:CAT_COLOR[srvCat(detalle.servicio)]}}></div>
            <div>
              <div style={{fontSize:14,fontWeight:500}}>{detalle.cliente}</div>
              <div style={{fontSize:12,color:'#666'}}>{detalle.servicio} · {durFmt(detalle.duracion||60)}</div>
              <div style={{fontSize:11,color:'#888'}}>{new Date(detalle.fecha+'T12:00:00').toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})} a las {detalle.hora}</div>
              {detalle.nota&&<div style={{fontSize:11,color:'#888',fontStyle:'italic',marginTop:3}}>{detalle.nota}</div>}
            </div>
          </div>
          <button onClick={()=>eliminar(detalle.id)} style={{padding:'5px 12px',borderRadius:8,border:'1px solid #ffcccc',background:'#fff5f5',color:'#A32D2D',cursor:'pointer',fontSize:12}}>Eliminar cita</button>
        </div>
      )}

      {/* Formulario nueva cita */}
      {showForm && (
        <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
            <span style={{fontSize:13,fontWeight:500}}>Nueva cita</span>
            <button onClick={()=>setShowForm(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#999'}}>×</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div>
              {[['Cliente','text',cliente,setCliente,'Nombre del cliente'],['Fecha','date',fecha,setFecha,'']].map(([l,t,v,s,p]:any)=>(
                <div key={l} style={{marginBottom:9}}>
                  <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>{l}</label>
                  <input type={t} value={v} onChange={e=>s(e.target.value)} placeholder={p} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
                </div>
              ))}
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Servicio</label>
                <select value={servicio} onChange={e=>{setServicio(e.target.value);setDuracion(SERVICIOS.find(s=>s.nombre===e.target.value)?.dur||60)}} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}>
                  {SERVICIOS.map(s=><option key={s.nombre}>{s.nombre}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Hora</label>
                <select value={hora} onChange={e=>setHora(e.target.value)} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}>
                  {HORAS.map(h=><option key={h}>{h}</option>)}
                </select>
              </div>
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Duración</label>
                <select value={duracion} onChange={e=>setDuracion(Number(e.target.value))} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}>
                  {[30,60,90,120,150,180,240].map(m=><option key={m} value={m}>{durFmt(m)}</option>)}
                </select>
              </div>
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Notas previas</label>
                <input value={nota} onChange={e=>setNota(e.target.value)} placeholder="Ej: traer fotos de referencia" style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
              </div>
            </div>
          </div>
          <button onClick={agregar} style={{padding:'7px 16px',borderRadius:8,border:'none',background:'#1a1a1a',color:'white',cursor:'pointer',fontSize:12}}>+ Agregar cita</button>
        </div>
      )}
    </div>
  )
}
function VentasTab({ ventas, grupos, inventario, onReload, hoy }: any) {
  const [cliente, setCliente] = useState('')
  const [fecha, setFecha] = useState(hoy)
  const [pagoEstado, setPagoEstado] = useState('pagado')
  const [montoPagado, setMontoPagado] = useState('')
  const [servRows, setServRows] = useState([{id:1,servicio:'Corte de cabello',monto:'',nota:''}])
  const [prodRows, setProdRows] = useState<any[]>([])
  const [filtro, setFiltro] = useState('')

  const SERVICIOS = ['Corte de cabello','Corte + lavado','Baño de color','Coloración raíz','Coloración completa','Balayage','Mechas','Babylights','Decoloración completa','Keratina','Alisado brasileño','Alisado japonés','Lavado y secado','Peinado','Otro']
  const fmt = (n:number) => '$'+Math.round(n).toLocaleString('es-CL')
  const fmtFecha = (ds:string) => new Date(ds+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'short',year:'numeric'})
  const diasDesde = (ds:string) => Math.floor((new Date().getTime()-new Date(ds+'T12:00:00').getTime())/(1000*60*60*24))

  const totalServ = servRows.reduce((a,r)=>a+(parseFloat(r.monto)||0),0)
  const totalProd = prodRows.reduce((a,r)=>a+(parseFloat(r.precio||0))*(parseInt(r.cant||1)),0)
  const total = totalServ+totalProd

  async function registrar() {
    if(total===0){alert('Agrega al menos un ítem con monto');return}
    const hora = new Date().getHours().toString().padStart(2,'0')+':'+new Date().getMinutes().toString().padStart(2,'0')
    let pagado = total
    if(pagoEstado==='debe') pagado=0
    else if(pagoEstado==='parcial') pagado=parseFloat(montoPagado)||0
    const {data:g} = await supabase.from('grupos_venta').insert({fecha,cliente,total,pagado,estado:pagoEstado}).select().single()
    if(!g) return
    for(const r of servRows){
      if(parseFloat(r.monto)>0) await supabase.from('ventas').insert({fecha,hora,tipo:'servicio',descripcion:r.servicio,cliente,monto:parseFloat(r.monto),nota:r.nota,cantidad:1,grupo_id:g.id,estado:pagoEstado})
    }
    for(const r of prodRows){
      const m=parseFloat(r.precio||0),c=parseInt(r.cant||1)
      if(m>0){
        const prod=inventario.find((p:any)=>p.id===r.prodId)
        if(prod&&prod.stock>=c) await supabase.from('inventario').update({stock:prod.stock-c}).eq('id',prod.id)
        await supabase.from('ventas').insert({fecha,hora,tipo:'producto',descripcion:prod?.nombre||'Producto',cliente,monto:m*c,nota:'',cantidad:c,grupo_id:g.id,estado:pagoEstado})
      }
    }
    setCliente('');setServRows([{id:1,servicio:'Corte de cabello',monto:'',nota:''}]);setProdRows([]);setMontoPagado('');setPagoEstado('pagado')
    onReload()
  }

  async function saldar(id:string) {
    const g=grupos.find((x:any)=>x.id===id)
    if(!g) return
    await supabase.from('grupos_venta').update({pagado:g.total,estado:'pagado'}).eq('id',id)
    await supabase.from('ventas').update({estado:'pagado'}).eq('grupo_id',id)
    onReload()
  }

  async function eliminarVenta(id:string) {
    await supabase.from('ventas').delete().eq('id',id)
    onReload()
  }

  const listaVentas = filtro ? ventas.filter((v:any)=>v.tipo===filtro) : ventas

  return (
    <div>
      {/* Formulario */}
      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Registrar atención</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:10}}>
          <div>
            <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Cliente</label>
            <input value={cliente} onChange={e=>setCliente(e.target.value)} placeholder="Nombre del cliente" style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
          </div>
          <div>
            <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Fecha</label>
            <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
          </div>
        </div>

        {/* Servicios */}
        <div style={{background:'#f9f9f9',borderRadius:8,padding:12,marginBottom:10}}>
          <div style={{fontSize:12,fontWeight:500,marginBottom:8}}>✂ Servicios realizados</div>
          {servRows.map((r,i)=>(
            <div key={r.id} style={{display:'flex',gap:8,marginBottom:8,flexWrap:'wrap',alignItems:'flex-end'}}>
              <div style={{flex:2,minWidth:120}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Servicio</label>
                <select value={r.servicio} onChange={e=>setServRows(rows=>rows.map((x,j)=>j===i?{...x,servicio:e.target.value}:x))} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}>
                  {SERVICIOS.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div style={{flex:1,minWidth:80}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Monto ($)</label>
                <input type="number" value={r.monto} onChange={e=>setServRows(rows=>rows.map((x,j)=>j===i?{...x,monto:e.target.value}:x))} placeholder="0" style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
              </div>
              <div style={{flex:2,minWidth:120}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Notas (tinte, detalles...)</label>
                <input value={r.nota} onChange={e=>setServRows(rows=>rows.map((x,j)=>j===i?{...x,nota:e.target.value}:x))} placeholder="Ej: Tinte N°7 Rubio" style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
              </div>
              {servRows.length>1&&<button onClick={()=>setServRows(rows=>rows.filter((_,j)=>j!==i))} style={{background:'none',border:'none',cursor:'pointer',color:'#ccc',fontSize:18}}>×</button>}
            </div>
          ))}
          <button onClick={()=>setServRows(r=>[...r,{id:Date.now(),servicio:'Corte de cabello',monto:'',nota:''}])} style={{fontSize:11,color:'#1a1a1a',background:'none',border:'1px dashed #888',borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>+ Agregar servicio</button>
        </div>

        {/* Productos */}
        <div style={{background:'#f9f9f9',borderRadius:8,padding:12,marginBottom:10}}>
          <div style={{fontSize:12,fontWeight:500,marginBottom:8}}>🛍 Productos vendidos</div>
          {prodRows.map((r,i)=>(
            <div key={r.id} style={{display:'flex',gap:8,marginBottom:8,flexWrap:'wrap',alignItems:'flex-end'}}>
              <div style={{flex:2,minWidth:120}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Producto</label>
                <select value={r.prodId||''} onChange={e=>{const p=inventario.find((x:any)=>x.id===e.target.value);setProdRows(rows=>rows.map((x,j)=>j===i?{...x,prodId:e.target.value,precio:p?.precio_venta||''}:x))}} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}>
                  <option value="">-- selecciona --</option>
                  {inventario.map((p:any)=><option key={p.id} value={p.id}>{p.nombre} — ${p.precio_venta?.toLocaleString('es-CL')}</option>)}
                </select>
              </div>
              <div style={{flex:1,minWidth:80}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Precio ($)</label>
                <input type="number" value={r.precio||''} onChange={e=>setProdRows(rows=>rows.map((x,j)=>j===i?{...x,precio:e.target.value}:x))} placeholder="0" style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
              </div>
              <div style={{flex:'0 0 60px'}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Cant.</label>
                <input type="number" value={r.cant||1} min={1} onChange={e=>setProdRows(rows=>rows.map((x,j)=>j===i?{...x,cant:e.target.value}:x))} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
              </div>
              <button onClick={()=>setProdRows(rows=>rows.filter((_,j)=>j!==i))} style={{background:'none',border:'none',cursor:'pointer',color:'#ccc',fontSize:18}}>×</button>
            </div>
          ))}
          <button onClick={()=>setProdRows(r=>[...r,{id:Date.now(),prodId:'',precio:'',cant:1}])} style={{fontSize:11,color:'#1a1a1a',background:'none',border:'1px dashed #888',borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>+ Agregar producto</button>
        </div>

        {/* Pago */}
        <div style={{background:'#f9f9f9',borderRadius:8,padding:10,marginBottom:10}}>
          <div style={{fontSize:11,color:'#666',marginBottom:6}}>Estado de pago</div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
            {[['pagado','✓ Pagado'],['parcial','Pago parcial'],['debe','Queda debiendo']].map(([v,l])=>(
              <button key={v} onClick={()=>setPagoEstado(v)} style={{padding:'5px 12px',borderRadius:20,fontSize:12,cursor:'pointer',border:'1px solid',borderColor:pagoEstado===v?'#1a1a1a':'#ddd',background:pagoEstado===v?'#1a1a1a':'white',color:pagoEstado===v?'white':'#666'}}>{l}</button>
            ))}
          </div>
          {pagoEstado==='parcial'&&(
            <div style={{maxWidth:200}}>
              <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Monto pagado ahora ($)</label>
              <input type="number" value={montoPagado} onChange={e=>setMontoPagado(e.target.value)} placeholder="0" style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
            </div>
          )}
        </div>

        {/* Resumen */}
        {total>0&&(
          <div style={{background:'#f0ede6',borderRadius:8,padding:'10px 14px',marginBottom:10,fontSize:12}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}><span style={{color:'#5a4a2a'}}>Subtotal servicios</span><span style={{fontWeight:500,color:'#5a4a2a'}}>{fmt(totalServ)}</span></div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{color:'#5a4a2a'}}>Subtotal productos</span><span style={{fontWeight:500,color:'#5a4a2a'}}>{fmt(totalProd)}</span></div>
            <div style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid #c8a96e',paddingTop:6}}><span style={{fontWeight:500}}>Total</span><span style={{fontWeight:500,fontSize:15}}>{fmt(total)}</span></div>
            {pagoEstado==='debe'&&<div style={{display:'flex',justifyContent:'space-between',marginTop:3}}><span style={{color:'#854F0B'}}>Queda debiendo</span><span style={{fontWeight:500,color:'#854F0B'}}>{fmt(total)}</span></div>}
            {pagoEstado==='parcial'&&montoPagado&&<div style={{display:'flex',justifyContent:'space-between',marginTop:3}}><span style={{color:'#854F0B'}}>Queda debiendo</span><span style={{fontWeight:500,color:'#854F0B'}}>{fmt(Math.max(0,total-(parseFloat(montoPagado)||0)))}</span></div>}
          </div>
        )}
        <button onClick={registrar} style={{padding:'7px 16px',borderRadius:8,border:'none',background:'#1a1a1a',color:'white',cursor:'pointer',fontSize:12}}>✓ Registrar atención</button>
      </div>

      {/* Tabla ventas */}
      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14,marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <span style={{fontSize:13,fontWeight:500}}>Historial de ventas</span>
          <select value={filtro} onChange={e=>setFiltro(e.target.value)} style={{padding:'4px 8px',border:'1px solid #ddd',borderRadius:8,fontSize:11}}>
            <option value="">Todo</option><option value="servicio">Servicios</option><option value="producto">Productos</option>
          </select>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr>{['Fecha','Tipo','Detalle','Cliente','Pago','Monto',''].map(h=><th key={h} style={{textAlign:'left',padding:'7px 10px',borderBottom:'1px solid #eee',color:'#666',fontSize:11}}>{h}</th>)}</tr></thead>
            <tbody>
              {[...listaVentas].reverse().map((v:any)=>(
                <tr key={v.id} style={{borderBottom:'1px solid #f5f5f5'}}>
                  <td style={{padding:'8px 10px',color:'#666'}}>{fmtFecha(v.fecha)}</td>
                  <td style={{padding:'8px 10px'}}><span style={{padding:'2px 7px',borderRadius:20,fontSize:11,background:v.tipo==='servicio'?'#EEEDFE':'#E1F5EE',color:v.tipo==='servicio'?'#3C3489':'#0F6E56'}}>{v.tipo==='servicio'?'Servicio':'Producto'}</span></td>
                  <td style={{padding:'8px 10px'}}><div style={{fontWeight:500}}>{v.descripcion}</div>{v.nota&&<div style={{fontSize:10,color:'#888'}}>{v.nota}</div>}</td>
                  <td style={{padding:'8px 10px'}}>{v.cliente||'—'}</td>
                  <td style={{padding:'8px 10px'}}><span style={{padding:'2px 7px',borderRadius:20,fontSize:11,background:v.estado==='pagado'?'#EAF3DE':v.estado==='parcial'?'#FAEEDA':'#FCEBEB',color:v.estado==='pagado'?'#3B6D11':v.estado==='parcial'?'#854F0B':'#A32D2D'}}>{v.estado==='pagado'?'Pagado':v.estado==='parcial'?'Parcial':'Debe'}</span></td>
                  <td style={{padding:'8px 10px',fontWeight:500}}>{fmt(v.monto)}</td>
                  <td style={{padding:'8px 10px'}}><button onClick={()=>eliminarVenta(v.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#ccc',fontSize:16}}>×</button></td>
                </tr>
              ))}
              {listaVentas.length===0&&<tr><td colSpan={7} style={{textAlign:'center',color:'#666',padding:16}}>Sin ventas registradas</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deudas */}
      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:10,color:'#A32D2D'}}>Deudas pendientes</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr>{['Fecha','Cliente','Total','Pagado','Debe','Días',''].map(h=><th key={h} style={{textAlign:'left',padding:'7px 10px',borderBottom:'1px solid #eee',color:'#666',fontSize:11}}>{h}</th>)}</tr></thead>
            <tbody>
              {grupos.filter((g:any)=>g.estado!=='pagado').map((g:any)=>{
                const dias=diasDesde(g.fecha);const vieja=dias>30
                return(
                  <tr key={g.id} style={{background:vieja?'#fff8f0':'white'}}>
                    <td style={{padding:'8px 10px',color:'#666'}}>{fmtFecha(g.fecha)}</td>
                    <td style={{padding:'8px 10px',fontWeight:500}}>{g.cliente||'—'}</td>
                    <td style={{padding:'8px 10px'}}>{fmt(g.total)}</td>
                    <td style={{padding:'8px 10px',color:'#3B6D11'}}>{fmt(g.pagado)}</td>
                    <td style={{padding:'8px 10px',color:'#A32D2D',fontWeight:500}}>{fmt(g.total-g.pagado)}</td>
                    <td style={{padding:'8px 10px'}}><span style={{padding:'2px 7px',borderRadius:20,fontSize:11,background:vieja?'#FCEBEB':'#FAEEDA',color:vieja?'#A32D2D':'#854F0B'}}>{dias}d</span></td>
                    <td style={{padding:'8px 10px'}}><button onClick={()=>saldar(g.id)} style={{padding:'4px 10px',borderRadius:8,border:'1px solid #cce8cc',background:'#EAF3DE',color:'#3B6D11',cursor:'pointer',fontSize:11}}>✓ Saldar</button></td>
                  </tr>
                )
              })}
              {grupos.filter((g:any)=>g.estado!=='pagado').length===0&&<tr><td colSpan={7} style={{textAlign:'center',color:'#666',padding:16}}>Sin deudas pendientes</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
function HistorialTab({ ventas, grupos }: any) {
  const [buscar, setBuscar] = useState('')
  const fmt = (n:number) => '$'+Math.round(n).toLocaleString('es-CL')
  const fmtFecha = (ds:string) => new Date(ds+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'short',year:'numeric'})

  const clientes = buscar ? [...new Set(ventas.map((v:any)=>v.cliente).filter((c:any)=>c&&c.toLowerCase().includes(buscar.toLowerCase())))] : []

  return (
    <div>
      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Historial por clienta</div>
        <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Escribe el nombre de la clienta..." style={{width:'100%',padding:'8px 12px',border:'1px solid #ddd',borderRadius:8,fontSize:12,marginBottom:14}}/>

        {!buscar && <p style={{fontSize:12,color:'#666'}}>Escribe el nombre de una clienta para ver su historial.</p>}
        {buscar && clientes.length===0 && <p style={{fontSize:12,color:'#666'}}>No se encontraron registros.</p>}

        {(clientes as string[]).map(cli=>{
          const vCli = ventas.filter((v:any)=>v.cliente===cli).sort((a:any,b:any)=>b.fecha.localeCompare(a.fecha))
          const grps:{[k:string]:{fecha:string,hora:string,srv:any[],prd:any[],gid:string}} = {}
          vCli.forEach((v:any)=>{
            const k=v.grupo_id||v.fecha+'_'+v.hora
            if(!grps[k]) grps[k]={fecha:v.fecha,hora:v.hora,srv:[],prd:[],gid:v.grupo_id}
            if(v.tipo==='servicio') grps[k].srv.push(v)
            else grps[k].prd.push(v)
          })
          const tot = vCli.reduce((a:number,v:any)=>a+v.monto,0)

          return(
            <div key={cli} style={{border:'1px solid #e0e0e0',borderRadius:10,marginBottom:12,overflow:'hidden'}}>
              <div style={{padding:'10px 14px',display:'flex',alignItems:'center',gap:10,borderBottom:'1px solid #eee'}}>
                <div style={{width:36,height:36,borderRadius:'50%',background:'#f0ede6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:500}}>{cli[0]}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500}}>{cli}</div>
                  <div style={{fontSize:11,color:'#666'}}>{Object.keys(grps).length} visitas registradas</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:13,fontWeight:500}}>{fmt(tot)}</div>
                  <div style={{fontSize:10,color:'#666'}}>total histórico</div>
                </div>
              </div>
              <div style={{padding:'10px 14px'}}>
                {Object.values(grps).sort((a,b)=>b.fecha.localeCompare(a.fecha)).map((g,gi)=>{
                  const totG=[...g.srv,...g.prd].reduce((a,v)=>a+v.monto,0)
                  const gObj=grupos.find((x:any)=>x.id===g.gid)
                  const debe=gObj?gObj.total-gObj.pagado:0
                  return(
                    <div key={gi} style={{padding:'8px 0',borderBottom:'1px solid #f5f5f5'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                        <span style={{fontSize:12,fontWeight:500}}>{fmtFecha(g.fecha)} {g.hora}</span>
                        <div style={{display:'flex',gap:6,alignItems:'center'}}>
                          {debe>0&&<span style={{padding:'2px 7px',borderRadius:20,fontSize:11,background:'#FAEEDA',color:'#854F0B'}}>Debe {fmt(debe)}</span>}
                          <span style={{fontWeight:500,fontSize:13}}>{fmt(totG)}</span>
                        </div>
                      </div>
                      <div>
                        {g.srv.map((v:any,i:number)=>(
                          <span key={i} style={{display:'inline-flex',alignItems:'center',gap:4,background:'#f0ede6',color:'#1a1a1a',padding:'2px 8px',borderRadius:12,fontSize:11,margin:'2px 2px 2px 0'}}>
                            ✂ {v.descripcion} {fmt(v.monto)}
                          </span>
                        ))}
                      </div>
                      {g.srv.filter((v:any)=>v.nota).map((v:any,i:number)=>(
                        <div key={i} style={{background:'#f9f9f9',borderRadius:6,padding:'5px 8px',fontSize:11,color:'#666',marginTop:4,fontStyle:'italic'}}>
                          📝 {v.nota}
                        </div>
                      ))}
                      {g.prd.length>0&&(
                        <div style={{marginTop:4}}>
                          {g.prd.map((v:any,i:number)=>(
                            <span key={i} style={{display:'inline-flex',alignItems:'center',gap:4,background:'#E1F5EE',color:'#0F6E56',padding:'2px 8px',borderRadius:12,fontSize:11,margin:'2px 2px 2px 0'}}>
                              🛍 {v.descripcion}{v.cantidad>1?` x${v.cantidad}`:''} {fmt(v.monto)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
function InventarioTab({ inventario, onReload }: any) {
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('Shampoo')
  const [stock, setStock] = useState('')
  const [stockMin, setStockMin] = useState('2')
  const [precioVenta, setPrecioVenta] = useState('')
  const [precioCosto, setPrecioCosto] = useState('')
  const [proveedores, setProveedores] = useState<any[]>([])
  const [provId, setProvId] = useState('')

  useEffect(()=>{
    supabase.from('proveedores').select('*').then(({data})=>{if(data)setProveedores(data)})
  },[])

  const fmt = (n:number) => '$'+Math.round(n).toLocaleString('es-CL')

  async function agregar() {
    if(!nombre){alert('Ingresa el nombre');return}
    await supabase.from('inventario').insert({nombre,categoria,stock:parseInt(stock)||0,stock_minimo:parseInt(stockMin)||2,precio_venta:parseInt(precioVenta)||0,precio_costo:parseInt(precioCosto)||0,proveedor_id:provId||null})
    setNombre('');setStock('');setPrecioVenta('');setPrecioCosto('');onReload()
  }

  async function ajustar(id:string, delta:number, actual:number) {
    await supabase.from('inventario').update({stock:Math.max(0,actual+delta)}).eq('id',id)
    onReload()
  }

  async function eliminar(id:string) {
    await supabase.from('inventario').delete().eq('id',id)
    onReload()
  }

  const CATS = ['Shampoo','Acondicionador','Tinte','Cera / Gel','Aceite','Pinche / Accesorio','Otro']

  return (
    <div>
      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Agregar producto</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
          <div>
            <div style={{marginBottom:9}}>
              <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Nombre del producto</label>
              <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej: Shampoo Argan 500ml" style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
            </div>
            <div style={{marginBottom:9}}>
              <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Categoría</label>
              <select value={categoria} onChange={e=>setCategoria(e.target.value)} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}>
                {CATS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{marginBottom:9}}>
              <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Proveedor</label>
              <select value={provId} onChange={e=>setProvId(e.target.value)} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}>
                <option value="">Sin proveedor</option>
                {proveedores.map((p:any)=><option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div style={{marginBottom:9}}>
              <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Stock actual</label>
              <input type="number" value={stock} onChange={e=>setStock(e.target.value)} placeholder="0" style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
            </div>
            <div style={{marginBottom:9}}>
              <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Stock mínimo (alerta)</label>
              <input type="number" value={stockMin} onChange={e=>setStockMin(e.target.value)} placeholder="2" style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
            </div>
          </div>
          <div>
            <div style={{marginBottom:9}}>
              <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Precio de venta ($)</label>
              <input type="number" value={precioVenta} onChange={e=>setPrecioVenta(e.target.value)} placeholder="0" style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
            </div>
            <div style={{marginBottom:9}}>
              <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Precio de costo ($)</label>
              <input type="number" value={precioCosto} onChange={e=>setPrecioCosto(e.target.value)} placeholder="0" style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
            </div>
          </div>
        </div>
        <button onClick={agregar} style={{padding:'7px 16px',borderRadius:8,border:'none',background:'#1a1a1a',color:'white',cursor:'pointer',fontSize:12}}>+ Agregar</button>
      </div>

      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Mis productos</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead>
              <tr>{['Producto','Cat.','Proveedor','Stock','P. Venta','P. Costo','Margen','Estado',''].map(h=><th key={h} style={{textAlign:'left',padding:'7px 10px',borderBottom:'1px solid #eee',color:'#666',fontSize:11}}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {inventario.map((p:any)=>{
                const prov = proveedores.find((x:any)=>x.id===p.proveedor_id)
                const pct = Math.min(100,Math.round((p.stock/Math.max(p.stock_minimo*2,1))*100))
                const col = p.stock===0?'#E24B4A':p.stock<=p.stock_minimo?'#EF9F27':'#639922'
                const est = p.stock===0?['#FCEBEB','#A32D2D','Sin stock']:p.stock<=p.stock_minimo?['#FAEEDA','#854F0B','Bajo']:['#EAF3DE','#3B6D11','OK']
                const mg = p.precio_costo>0?Math.round(((p.precio_venta-p.precio_costo)/p.precio_venta)*100)+'%':'—'
                return(
                  <tr key={p.id} style={{borderBottom:'1px solid #f5f5f5'}}>
                    <td style={{padding:'8px 10px',fontWeight:500}}>{p.nombre}</td>
                    <td style={{padding:'8px 10px'}}><span style={{padding:'2px 7px',borderRadius:20,fontSize:11,background:'#E6F1FB',color:'#185FA5'}}>{p.categoria}</span></td>
                    <td style={{padding:'8px 10px',fontSize:11,color:'#666'}}>{prov?prov.nombre:'—'}</td>
                    <td style={{padding:'8px 10px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:5}}>
                        <span style={{fontWeight:500,minWidth:18}}>{p.stock}</span>
                        <div style={{flex:1,minWidth:40,height:5,background:'#f0f0f0',borderRadius:3,overflow:'hidden'}}>
                          <div style={{width:pct+'%',height:'100%',background:col,borderRadius:3}}></div>
                        </div>
                        <button onClick={()=>ajustar(p.id,1,p.stock)} style={{padding:'2px 6px',borderRadius:6,border:'1px solid #ddd',background:'white',cursor:'pointer',fontSize:11}}>+</button>
                        <button onClick={()=>ajustar(p.id,-1,p.stock)} style={{padding:'2px 6px',borderRadius:6,border:'1px solid #ddd',background:'white',cursor:'pointer',fontSize:11}}>-</button>
                      </div>
                    </td>
                    <td style={{padding:'8px 10px',color:'#3B6D11',fontWeight:500}}>{fmt(p.precio_venta)}</td>
                    <td style={{padding:'8px 10px',color:'#666'}}>{fmt(p.precio_costo)}</td>
                    <td style={{padding:'8px 10px'}}><span style={{padding:'2px 7px',borderRadius:20,fontSize:11,background:'#EEEDFE',color:'#3C3489'}}>{mg}</span></td>
                    <td style={{padding:'8px 10px'}}><span style={{padding:'2px 7px',borderRadius:20,fontSize:11,background:est[0],color:est[1]}}>{est[2]}</span></td>
                    <td style={{padding:'8px 10px'}}><button onClick={()=>eliminar(p.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#ccc',fontSize:16}}>×</button></td>
                  </tr>
                )
              })}
              {inventario.length===0&&<tr><td colSpan={9} style={{textAlign:'center',color:'#666',padding:16}}>Sin productos registrados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
function ProveedoresTab({ inventario, onReload }: any) {
  const [proveedores, setProveedores] = useState<any[]>([])
  const [nombre, setNombre] = useState('')
  const [contacto, setContacto] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [direccion, setDireccion] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [categorias, setCategorias] = useState('')
  const [notas, setNotas] = useState('')

  useEffect(()=>{ cargar() },[])

  async function cargar() {
    const {data} = await supabase.from('proveedores').select('*')
    if(data) setProveedores(data)
  }

  async function agregar() {
    if(!nombre){alert('Ingresa el nombre');return}
    await supabase.from('proveedores').insert({nombre,contacto,telefono,email,direccion,ciudad,categorias,notas})
    setNombre('');setContacto('');setTelefono('');setEmail('');setDireccion('');setCiudad('');setCategorias('');setNotas('')
    cargar();onReload()
  }

  async function eliminar(id:string) {
    await supabase.from('proveedores').delete().eq('id',id)
    cargar();onReload()
  }

  return (
    <div>
      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Nuevo proveedor</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div>
            {[['Nombre del proveedor',nombre,setNombre,'Ej: Distribuidora Belleza Pro'],
              ['Contacto / vendedor',contacto,setContacto,'Nombre del vendedor'],
              ['Teléfono',telefono,setTelefono,'+56 9 1234 5678'],
              ['Email',email,setEmail,'ventas@proveedor.cl']
            ].map(([l,v,s,p]:any)=>(
              <div key={l} style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>{l}</label>
                <input value={v} onChange={e=>s(e.target.value)} placeholder={p} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
              </div>
            ))}
          </div>
          <div>
            {[['Dirección',direccion,setDireccion,'Calle, número, comuna'],
              ['Ciudad',ciudad,setCiudad,'Ej: Santiago'],
              ['Categorías que vende',categorias,setCategorias,'Ej: Tintes, Shampoos']
            ].map(([l,v,s,p]:any)=>(
              <div key={l} style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>{l}</label>
                <input value={v} onChange={e=>s(e.target.value)} placeholder={p} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
              </div>
            ))}
            <div style={{marginBottom:9}}>
              <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Notas</label>
              <textarea value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Días de despacho, condiciones..." style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12,resize:'vertical',minHeight:52,fontFamily:'system-ui'}}/>
            </div>
          </div>
        </div>
        <button onClick={agregar} style={{padding:'7px 16px',borderRadius:8,border:'none',background:'#1a1a1a',color:'white',cursor:'pointer',fontSize:12}}>+ Guardar proveedor</button>
      </div>

      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Mis proveedores</div>
        {proveedores.length===0 && <p style={{fontSize:12,color:'#666'}}>Sin proveedores registrados.</p>}
        {proveedores.map((p:any)=>{
          const prods = inventario.filter((i:any)=>i.proveedor_id===p.id)
          return(
            <div key={p.id} style={{border:'1px solid #e0e0e0',borderRadius:10,padding:14,marginBottom:10}}>
              <div style={{display:'flex',gap:12,alignItems:'flex-start',marginBottom:10}}>
                <div style={{width:40,height:40,borderRadius:8,background:'#E1F5EE',display:'flex',alignItems:'center',justifyContent:'center',color:'#0F6E56',fontSize:18,flexShrink:0}}>🚚</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500}}>{p.nombre}</div>
                  <div style={{fontSize:11,color:'#666'}}>{p.categorias}</div>
                </div>
                <button onClick={()=>eliminar(p.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#ccc',fontSize:18}}>×</button>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,fontSize:12,marginBottom:8}}>
                <div><span style={{color:'#666'}}>Contacto:</span> {p.contacto||'—'}</div>
                <div><span style={{color:'#666'}}>Tel:</span> {p.telefono||'—'}</div>
                <div><span style={{color:'#666'}}>Email:</span> {p.email||'—'}</div>
                <div><span style={{color:'#666'}}>Dir:</span> {p.direccion?p.direccion+(p.ciudad?', '+p.ciudad:''):'—'}</div>
              </div>
              {p.notas&&<div style={{background:'#f9f9f9',borderRadius:6,padding:'6px 8px',fontSize:11,color:'#666',fontStyle:'italic',marginBottom:8}}>{p.notas}</div>}
              {prods.length>0&&<div style={{fontSize:11,color:'#666'}}>Productos: {prods.map((x:any)=>(
                <span key={x.id} style={{padding:'2px 7px',borderRadius:20,fontSize:11,background:'#E6F1FB',color:'#185FA5',margin:'1px'}}>{x.nombre}</span>
              ))}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
function ReportesTab({ ventas }: any) {
  const [mes, setMes] = useState(new Date().getMonth())
  const [ano, setAno] = useState(new Date().getFullYear())

  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const fmt = (n:number) => '$'+Math.round(n).toLocaleString('es-CL')

  const vMes = ventas.filter((v:any)=>{
    const d = new Date(v.fecha+'T12:00:00')
    return d.getMonth()===mes && d.getFullYear()===ano
  })

  const totalServ = vMes.filter((v:any)=>v.tipo==='servicio').reduce((a:number,v:any)=>a+v.monto,0)
  const totalProd = vMes.filter((v:any)=>v.tipo==='producto').reduce((a:number,v:any)=>a+v.monto,0)

  const aggServ:{[k:string]:{n:number,t:number}} = {}
  const aggProd:{[k:string]:{n:number,t:number}} = {}
  vMes.forEach((v:any)=>{
    if(v.tipo==='servicio'){
      if(!aggServ[v.descripcion]) aggServ[v.descripcion]={n:0,t:0}
      aggServ[v.descripcion].n++
      aggServ[v.descripcion].t+=v.monto
    } else {
      if(!aggProd[v.descripcion]) aggProd[v.descripcion]={n:0,t:0}
      aggProd[v.descripcion].n+=v.cantidad||1
      aggProd[v.descripcion].t+=v.monto
    }
  })

  const dataAnual = MESES.map((_,i)=>{
    const vA = ventas.filter((v:any)=>{
      const d = new Date(v.fecha+'T12:00:00')
      return d.getMonth()===i && d.getFullYear()===ano
    })
    return {
      mes: MESES[i].slice(0,3),
      serv: vA.filter((v:any)=>v.tipo==='servicio').reduce((a:number,v:any)=>a+v.monto,0),
      prod: vA.filter((v:any)=>v.tipo==='producto').reduce((a:number,v:any)=>a+v.monto,0)
    }
  })

  return (
    <div>
      {/* Selector mes/año */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
        <label style={{fontSize:12,color:'#666'}}>Mes:</label>
        <select value={mes} onChange={e=>setMes(Number(e.target.value))} style={{padding:'5px 8px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}>
          {MESES.map((m,i)=><option key={m} value={i}>{m}</option>)}
        </select>
        <select value={ano} onChange={e=>setAno(Number(e.target.value))} style={{padding:'5px 8px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}>
          {[2024,2025,2026,2027].map(a=><option key={a}>{a}</option>)}
        </select>
      </div>

      {/* Métricas mes */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
        {[['Subtotal servicios',fmt(totalServ)],['Subtotal productos',fmt(totalProd)],['Total mes',fmt(totalServ+totalProd)]].map(([l,v])=>(
          <div key={l} style={{background:'#f0f0f0',borderRadius:8,padding:12}}>
            <div style={{fontSize:11,color:'#666'}}>{l}</div>
            <div style={{fontSize:20,fontWeight:500}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Tablas detalle */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
        <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14}}>
          <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>✂ Servicios del mes</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr>{['Servicio','Veces','Total'].map(h=><th key={h} style={{textAlign:'left',padding:'6px 8px',borderBottom:'1px solid #eee',color:'#666',fontSize:11}}>{h}</th>)}</tr></thead>
            <tbody>
              {Object.entries(aggServ).sort((a,b)=>b[1].t-a[1].t).map(([k,v])=>(
                <tr key={k}><td style={{padding:'7px 8px'}}>{k}</td><td style={{padding:'7px 8px'}}>{v.n}</td><td style={{padding:'7px 8px',fontWeight:500}}>{fmt(v.t)}</td></tr>
              ))}
              {Object.keys(aggServ).length===0&&<tr><td colSpan={3} style={{textAlign:'center',color:'#666',padding:12}}>Sin datos</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14}}>
          <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>🛍 Productos del mes</div>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr>{['Producto','Uds.','Total'].map(h=><th key={h} style={{textAlign:'left',padding:'6px 8px',borderBottom:'1px solid #eee',color:'#666',fontSize:11}}>{h}</th>)}</tr></thead>
            <tbody>
              {Object.entries(aggProd).sort((a,b)=>b[1].t-a[1].t).map(([k,v])=>(
                <tr key={k}><td style={{padding:'7px 8px'}}>{k}</td><td style={{padding:'7px 8px'}}>{v.n}</td><td style={{padding:'7px 8px',fontWeight:500,color:'#c8a96e'}}>{fmt(v.t)}</td></tr>
              ))}
              {Object.keys(aggProd).length===0&&<tr><td colSpan={3} style={{textAlign:'center',color:'#666',padding:12}}>Sin datos</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla anual */}
      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Resumen anual {ano}</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:700}}>
            <thead>
              <tr>
                <th style={{textAlign:'left',padding:'6px 8px',borderBottom:'1px solid #eee'}}>Concepto</th>
                {dataAnual.map((d,i)=><th key={d.mes} style={{textAlign:'right',padding:'6px 4px',borderBottom:'1px solid #eee',color:i===mes?'#1a1a1a':'#666',fontWeight:i===mes?700:400}}>{d.mes}</th>)}
                <th style={{textAlign:'right',padding:'6px 8px',borderBottom:'1px solid #eee'}}>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{padding:'6px 8px',fontWeight:500}}>Servicios</td>
                {dataAnual.map(d=><td key={d.mes} style={{textAlign:'right',padding:'6px 4px',color:'#444'}}>{fmt(d.serv)}</td>)}
                <td style={{textAlign:'right',padding:'6px 8px',fontWeight:500}}>{fmt(dataAnual.reduce((a,d)=>a+d.serv,0))}</td>
              </tr>
              <tr>
                <td style={{padding:'6px 8px',fontWeight:500,color:'#c8a96e'}}>Productos</td>
                {dataAnual.map(d=><td key={d.mes} style={{textAlign:'right',padding:'6px 4px',color:'#c8a96e'}}>{fmt(d.prod)}</td>)}
                <td style={{textAlign:'right',padding:'6px 8px',fontWeight:500,color:'#c8a96e'}}>{fmt(dataAnual.reduce((a,d)=>a+d.prod,0))}</td>
              </tr>
              <tr style={{borderTop:'1px solid #eee'}}>
                <td style={{padding:'6px 8px',fontWeight:500}}>Total</td>
                {dataAnual.map(d=><td key={d.mes} style={{textAlign:'right',padding:'6px 4px',fontWeight:500}}>{fmt(d.serv+d.prod)}</td>)}
                <td style={{textAlign:'right',padding:'6px 8px',fontWeight:500,fontSize:13}}>{fmt(dataAnual.reduce((a,d)=>a+d.serv+d.prod,0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
function TopClientasTab({ ventas, grupos }: any) {
  const fmt = (n:number) => n>0?'$'+Math.round(n).toLocaleString('es-CL'):'—'
  const anoActual = new Date().getFullYear()

  // Obtener todos los años con ventas
  const anos = [...new Set(ventas.map((v:any)=>new Date(v.fecha+'T12:00:00').getFullYear()))].sort((a,b)=>b-a)
  if(!anos.includes(anoActual)) anos.unshift(anoActual)

  // Agrupar por clienta y año
  const resumen:{[cli:string]:{[ano:number]:number, debe:number, visitas:number}} = {}
  ventas.forEach((v:any)=>{
    if(!v.cliente) return
    const ano = new Date(v.fecha+'T12:00:00').getFullYear()
    if(!resumen[v.cliente]) resumen[v.cliente]={debe:0,visitas:0}
    resumen[v.cliente][ano] = (resumen[v.cliente][ano]||0) + v.monto
  })
  grupos.forEach((g:any)=>{
    if(!g.cliente||g.estado==='pagado') return
    if(!resumen[g.cliente]) resumen[g.cliente]={debe:0,visitas:0}
    resumen[g.cliente].debe += g.total-g.pagado
  })
  const visitasPorCliente:{[k:string]:Set<string>}={}
  ventas.forEach((v:any)=>{
    if(!v.cliente||!v.grupo_id) return
    if(!visitasPorCliente[v.cliente]) visitasPorCliente[v.cliente]=new Set()
    visitasPorCliente[v.cliente].add(v.grupo_id)
  })
  Object.entries(visitasPorCliente).forEach(([cli,set])=>{
    if(resumen[cli]) resumen[cli].visitas=set.size
  })

  // Ordenar por año actual de mayor a menor
  const lista = Object.entries(resumen).sort((a,b)=>(b[1][anoActual]||0)-(a[1][anoActual]||0))

  return (
    <div>
      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>⭐ Top Clientas</div>
        <div style={{fontSize:11,color:'#666',marginBottom:12}}>Ordenadas por gasto en {anoActual}</div>
        {lista.length===0&&<p style={{fontSize:12,color:'#666'}}>Sin datos aún. Agrega ventas para ver el ranking.</p>}
        {lista.length>0&&(
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead>
                <tr>
                  <th style={{textAlign:'left',padding:'8px 10px',borderBottom:'1px solid #eee',color:'#666',fontSize:11}}>#</th>
                  <th style={{textAlign:'left',padding:'8px 10px',borderBottom:'1px solid #eee',color:'#666',fontSize:11}}>Clienta</th>
                  <th style={{textAlign:'center',padding:'8px 10px',borderBottom:'1px solid #eee',color:'#666',fontSize:11}}>Visitas</th>
                  {anos.map(a=>(
                    <th key={a} style={{textAlign:'right',padding:'8px 10px',borderBottom:'1px solid #eee',color:a===anoActual?'#1a1a1a':'#666',fontWeight:a===anoActual?700:400,fontSize:11}}>{a}</th>
                  ))}
                  <th style={{textAlign:'right',padding:'8px 10px',borderBottom:'1px solid #eee',color:'#666',fontSize:11}}>Deuda</th>
                </tr>
              </thead>
              <tbody>
                {lista.map(([cli,d],i)=>(
                  <tr key={cli} style={{borderBottom:'1px solid #f5f5f5',background:i%2===0?'white':'#fafafa'}}>
                    <td style={{padding:'10px 10px'}}>
                      <div style={{width:24,height:24,borderRadius:'50%',background:i===0?'#c8a96e':i===1?'#b0b0b0':i===2?'#d4a57a':'#f0ede6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:i<3?'white':'#888'}}>
                        {i+1}
                      </div>
                    </td>
                    <td style={{padding:'10px 10px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:32,height:32,borderRadius:'50%',background:'#f0ede6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:500,flexShrink:0}}>{cli[0]}</div>
                        <span style={{fontWeight:500}}>{cli}</span>
                      </div>
                    </td>
                    <td style={{padding:'10px 10px',textAlign:'center',color:'#666'}}>{d.visitas}</td>
                    {anos.map(a=>(
                      <td key={a} style={{padding:'10px 10px',textAlign:'right',fontWeight:a===anoActual?500:400,color:a===anoActual?(d[a]>0?'#1a1a1a':'#ccc'):'#888'}}>
                        {fmt(d[a]||0)}
                      </td>
                    ))}
                    <td style={{padding:'10px 10px',textAlign:'right'}}>
                      {d.debe>0
                        ?<span style={{color:'#A32D2D',fontWeight:500,fontSize:11}}>{fmt(d.debe)}</span>
                        :<span style={{color:'#3B6D11',fontSize:11}}>✓</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}