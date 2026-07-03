'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Dashboard() {
  const [tab, setTab] = useState('inicio')
  const [clientes, setClientes] = useState<any[]>([])
  const [servicios, setServicios] = useState<any[]>([])
  const [inventario, setInventario] = useState<any[]>([])
  const [proveedores, setProveedores] = useState<any[]>([])
  const [citas, setCitas] = useState<any[]>([])
  const [ventas, setVentas] = useState<any[]>([])
  const [grupos, setGrupos] = useState<any[]>([])

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const [c,s,i,p,ci,v,g] = await Promise.all([
      supabase.from('clientes').select('*').order('nombre'),
      supabase.from('servicios').select('*').order('nombre'),
      supabase.from('inventario').select('*,proveedores(nombre)'),
      supabase.from('proveedores').select('*').order('nombre'),
      supabase.from('citas').select('*,clientes(nombre),servicios(nombre,categoria)').order('fecha').order('hora'),
      supabase.from('ventas').select('*,servicios(nombre,categoria),inventario(nombre),grupos_venta(fecha,estado,pagado,total,clientes(nombre,id))').order('created_at',{ascending:false}),
      supabase.from('grupos_venta').select('*,clientes(nombre)').order('fecha',{ascending:false}),
    ])
    if(c.data) setClientes(c.data)
    if(s.data) setServicios(s.data)
    if(i.data) setInventario(i.data)
    if(p.data) setProveedores(p.data)
    if(ci.data) setCitas(ci.data)
    if(v.data) setVentas(v.data)
    if(g.data) setGrupos(g.data)
  }

  const hoy = new Date().toISOString().split('T')[0]
  const fmt = (n:number) => '$'+Math.round(n).toLocaleString('es-CL')
  const fmtF = (ds:string) => new Date(ds+'T12:00:00').toLocaleDateString('es-CL',{day:'numeric',month:'short',year:'numeric'})
  const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const anoActual = new Date().getFullYear()
  const mesActual = new Date().getMonth()

  const semana = () => {
    const d=new Date(),dia=d.getDay()
    const lun=new Date(d);lun.setDate(d.getDate()-dia+(dia===0?-6:1))
    const dom=new Date(lun);dom.setDate(lun.getDate()+6)
    return{lun:lun.toISOString().split('T')[0],dom:dom.toISOString().split('T')[0]}
  }

  const TABS = [
    ['inicio','Inicio'],['ventas','Ventas'],['historial','Historial'],['agenda','Agenda'],
    ['clientas','Clientas'],['proveedores','Proveedores'],['servicios','Servicios'],
    ['inventario','Inventario'],['topclientes','Top Clientas'],['reportes','Reportes']
  ]

  return (
    <div style={{fontFamily:'system-ui,sans-serif',minHeight:'100vh',background:'#f9f9f9'}}>
      <div style={{background:'#1a1a1a',padding:'10px 20px',display:'flex',alignItems:'center',gap:12}}>
        <div>
          <div style={{color:'white',fontSize:20,fontWeight:500,letterSpacing:3}}>GLEET</div>
          <div style={{width:28,height:2,background:'#c8a96e',margin:'3px 0 2px'}}></div>
          <div style={{color:'#c8a96e',fontSize:9,letterSpacing:3}}>CENTRO DE ESTÉTICA</div>
        </div>
        <div style={{marginLeft:'auto',color:'#888',fontSize:11}}>
          {new Date().toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})}
        </div>
      </div>
      <div style={{display:'flex',gap:2,padding:'8px 16px',background:'#f0f0f0',borderBottom:'1px solid #e0e0e0',overflowX:'auto'}}>
        {TABS.map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:'6px 14px',borderRadius:8,border:tab===id?'1px solid #ccc':'1px solid transparent',background:tab===id?'white':'transparent',cursor:'pointer',fontSize:12,fontWeight:tab===id?500:400,whiteSpace:'nowrap'}}>
            {label}
          </button>
        ))}
      </div>
      <div style={{padding:16}}>
        {tab==='inicio' && <InicioTab ventas={ventas} grupos={grupos} citas={citas} inventario={inventario} hoy={hoy} fmt={fmt} fmtF={fmtF} MESES={MESES} anoActual={anoActual} mesActual={mesActual} semana={semana} />}
        {tab==='ventas' && <VentasTab clientes={clientes} servicios={servicios} inventario={inventario} grupos={grupos} ventas={ventas} onReload={cargar} hoy={hoy} fmt={fmt} fmtF={fmtF} />}
        {tab==='historial' && <HistorialTab ventas={ventas} grupos={grupos} clientes={clientes} fmt={fmt} fmtF={fmtF} />}
        {tab==='agenda' && <AgendaTab citas={citas} clientes={clientes} servicios={servicios} onReload={cargar} hoy={hoy} />}
        {tab==='clientas' && <ClientasTab clientes={clientes} onReload={cargar} />}
        {tab==='proveedores' && <ProveedoresTab proveedores={proveedores} inventario={inventario} onReload={cargar} />}
        {tab==='servicios' && <ServiciosTab servicios={servicios} onReload={cargar} />}
        {tab==='inventario' && <InventarioTab inventario={inventario} proveedores={proveedores} onReload={cargar} fmt={fmt} />}
        {tab==='topclientes' && <TopClientasTab ventas={ventas} grupos={grupos} anoActual={anoActual} fmt={fmt} fmtF={fmtF} />}
        {tab==='reportes' && <ReportesTab ventas={ventas} MESES={MESES} anoActual={anoActual} mesActual={mesActual} fmt={fmt} />}
      </div>
    </div>
  )
}

function InicioTab({ventas,grupos,citas,inventario,hoy,fmt,fmtF,MESES,anoActual,mesActual,semana}:any) {
  const sem=semana()
  const vSem=ventas.filter((v:any)=>{
    const f=v.grupos_venta?.fecha
    return f&&f>=sem.lun&&f<=sem.dom
  })
  const wS=vSem.filter((v:any)=>v.tipo==='servicio').reduce((a:number,v:any)=>a+v.monto,0)
  const wP=vSem.filter((v:any)=>v.tipo==='producto').reduce((a:number,v:any)=>a+v.monto,0)
  const deudas=grupos.filter((g:any)=>g.estado!=='pagado')
  const diasDesde=(ds:string)=>Math.floor((new Date().getTime()-new Date(ds+'T12:00:00').getTime())/(1000*60*60*24))
  const deudasViejas=deudas.filter((g:any)=>diasDesde(g.fecha)>30)
  const stockBajo=inventario.filter((p:any)=>p.stock<=p.stock_minimo)

  const dataAnual=MESES.map((_:any,i:number)=>{
    const vA=ventas.filter((v:any)=>{
      const f=v.grupos_venta?.fecha
      if(!f) return false
      const d=new Date(f+'T12:00:00')
      return d.getMonth()===i&&d.getFullYear()===anoActual
    })
    return{
      mes:MESES[i],
      serv:vA.filter((v:any)=>v.tipo==='servicio').reduce((a:number,v:any)=>a+v.monto,0),
      prod:vA.filter((v:any)=>v.tipo==='producto').reduce((a:number,v:any)=>a+v.monto,0)
    }
  })

  const proximas=citas.filter((c:any)=>c.fecha>=hoy).slice(0,5)

  return(
    <div>
      {deudasViejas.length>0&&(
        <div style={{background:'#FAEEDA',border:'1px solid #EF9F27',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:12,color:'#633806'}}>
          ⚠ {deudasViejas.length} deuda{deudasViejas.length>1?'s':''} con más de 30 días sin saldar: {deudasViejas.map((g:any)=>`${g.clientes?.nombre||'—'} — ${fmt(g.total-g.pagado)}`).join(', ')}
        </div>
      )}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
        {[['Servicios semana',fmt(wS)],['Productos semana',fmt(wP)],['Total semana',fmt(wS+wP)]].map(([l,v])=>(
          <div key={l} style={{background:'#f0f0f0',borderRadius:8,padding:12}}>
            <div style={{fontSize:11,color:'#666'}}>{l}</div>
            <div style={{fontSize:20,fontWeight:500}}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
        <div style={{background:'#f0f0f0',borderRadius:8,padding:12}}>
          <div style={{fontSize:11,color:'#666'}}>Stock bajo</div>
          <div style={{fontSize:20,fontWeight:500}}>{stockBajo.length}</div>
        </div>
        <div style={{background:'#f0f0f0',borderRadius:8,padding:12}}>
          <div style={{fontSize:11,color:'#666'}}>Deudas +30 días</div>
          <div style={{fontSize:20,fontWeight:500,color:deudasViejas.length>0?'#A32D2D':'inherit'}}>{deudasViejas.length}</div>
        </div>
      </div>
      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Resumen año {anoActual}</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:700}}>
            <thead><tr>
              <th style={{textAlign:'left',padding:'6px 8px',borderBottom:'1px solid #eee'}}>Concepto</th>
              {MESES.map((m:string,i:number)=><th key={m} style={{textAlign:'right',padding:'6px 4px',borderBottom:'1px solid #eee',color:i===mesActual?'#1a1a1a':'#666',fontWeight:i===mesActual?700:400}}>{m.slice(0,3)}</th>)}
              <th style={{textAlign:'right',padding:'6px 8px',borderBottom:'1px solid #eee'}}>Total</th>
            </tr></thead>
            <tbody>
              <tr>
                <td style={{padding:'6px 8px',fontWeight:500}}>Servicios</td>
                {dataAnual.map((d:any)=><td key={d.mes} style={{textAlign:'right',padding:'6px 4px',color:'#444'}}>{fmt(d.serv)}</td>)}
                <td style={{textAlign:'right',padding:'6px 8px',fontWeight:500}}>{fmt(dataAnual.reduce((a:number,d:any)=>a+d.serv,0))}</td>
              </tr>
              <tr>
                <td style={{padding:'6px 8px',fontWeight:500,color:'#c8a96e'}}>Productos</td>
                {dataAnual.map((d:any)=><td key={d.mes} style={{textAlign:'right',padding:'6px 4px',color:'#c8a96e'}}>{fmt(d.prod)}</td>)}
                <td style={{textAlign:'right',padding:'6px 8px',fontWeight:500,color:'#c8a96e'}}>{fmt(dataAnual.reduce((a:number,d:any)=>a+d.prod,0))}</td>
              </tr>
              <tr style={{borderTop:'1px solid #eee'}}>
                <td style={{padding:'6px 8px',fontWeight:500}}>Total</td>
                {dataAnual.map((d:any)=><td key={d.mes} style={{textAlign:'right',padding:'6px 4px',fontWeight:500}}>{fmt(d.serv+d.prod)}</td>)}
                <td style={{textAlign:'right',padding:'6px 8px',fontWeight:500,fontSize:13}}>{fmt(dataAnual.reduce((a:number,d:any)=>a+d.serv+d.prod,0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14}}>
          <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>Próximas citas</div>
          {proximas.length?proximas.map((c:any)=>(
            <div key={c.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid #f0f0f0'}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:'#f0ede6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:500}}>{c.clientes?.nombre?.[0]||'?'}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:500}}>{c.clientes?.nombre||'—'}</div>
                <div style={{fontSize:11,color:'#666'}}>{c.servicios?.nombre||'—'}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:11,color:'#666'}}>{fmtF(c.fecha)}</div>
                <div style={{fontSize:11,fontWeight:500}}>{c.hora}</div>
              </div>
            </div>
          )):<p style={{fontSize:12,color:'#666'}}>Sin citas próximas</p>}
        </div>
        <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14}}>
          <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>Inventario crítico</div>
          {stockBajo.length?stockBajo.map((p:any)=>(
            <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 0',borderBottom:'1px solid #f0f0f0'}}>
              <span style={{fontSize:12}}>{p.nombre}</span>
              <span style={{fontSize:11,padding:'2px 7px',borderRadius:20,background:p.stock===0?'#FCEBEB':'#FAEEDA',color:p.stock===0?'#A32D2D':'#854F0B'}}>{p.stock===0?'Sin stock':'↓ '+p.stock}</span>
            </div>
          )):<p style={{fontSize:12,color:'#666'}}>Todo en orden</p>}
        </div>
      </div>
    </div>
  )
}

function VentasTab({clientes,servicios,inventario,grupos,ventas,onReload,hoy,fmt,fmtF}:any){
  const cargarBorrador=()=>{
    if(typeof window==='undefined') return null
    try{
      const b=localStorage.getItem('gleet_borrador_venta')
      return b?JSON.parse(b):null
    }catch{return null}
  }
  const borrador=cargarBorrador()
  const [clienteId,setClienteId]=useState(borrador?.clienteId||'')
  const [clienteBusqueda,setClienteBusqueda]=useState(borrador?.clienteBusqueda||'')
  const [showSugerencias,setShowSugerencias]=useState(false)
  const [fecha,setFecha]=useState(borrador?.fecha||hoy)
  const [pagoEstado,setPagoEstado]=useState(borrador?.pagoEstado||'pagado')
  const [montoPagado,setMontoPagado]=useState(borrador?.montoPagado||'')
  const [servRows,setServRows]=useState<any[]>(borrador?.servRows||[{id:1,servicioId:'',monto:'',nota:''}])
  const [prodRows,setProdRows]=useState<any[]>(borrador?.prodRows||[])
  const [filtro,setFiltro]=useState('')
  const [editando,setEditando]=useState<any>(null)

useEffect(()=>{
    const datos={clienteId,clienteBusqueda,fecha,pagoEstado,montoPagado,servRows,prodRows}
    localStorage.setItem('gleet_borrador_venta',JSON.stringify(datos))
  },[clienteId,clienteBusqueda,fecha,pagoEstado,montoPagado,servRows,prodRows])


  const CAT_COLOR:any={corte:'#534AB7',color:'#D4537E',decoloracion:'#BA7517',alisado:'#0F6E56',otro:'#888780'}
  const durFmt=(m:number)=>m<60?m+'min':m%60===0?(m/60)+'h':Math.floor(m/60)+'h'+m%60
  const diasDesde=(ds:string)=>Math.floor((new Date().getTime()-new Date(ds+'T12:00:00').getTime())/(1000*60*60*24))

  const totalServ=servRows.reduce((a,r)=>a+(parseFloat(r.monto)||0),0)
  const totalProd=prodRows.reduce((a,r)=>a+(parseFloat(r.precio||0))*(parseInt(r.cant||1)),0)
  const total=totalServ+totalProd

  async function registrar(){
    if(!clienteId){alert('Selecciona una clienta');return}
    if(total===0){alert('Agrega al menos un ítem con monto');return}
    const hora=new Date().getHours().toString().padStart(2,'0')+':'+new Date().getMinutes().toString().padStart(2,'0')
    let pagado=total
    if(pagoEstado==='debe') pagado=0
    else if(pagoEstado==='parcial') pagado=parseFloat(montoPagado)||0
    const {data:g}=await supabase.from('grupos_venta').insert({cliente_id:clienteId,fecha,total,pagado,estado:pagoEstado}).select().single()
    if(!g) return
    for(const r of servRows){
      if(parseFloat(r.monto)>0){
        await supabase.from('ventas').insert({grupo_id:g.id,servicio_id:r.servicioId||null,tipo:'servicio',monto:parseFloat(r.monto),cantidad:1,nota:r.nota})
      }
    }
    for(const r of prodRows){
      const m=parseFloat(r.precio||0),c=parseInt(r.cant||1)
      if(m>0){
        const prod=inventario.find((p:any)=>p.id===r.prodId)
        if(prod&&prod.stock>=c) await supabase.from('inventario').update({stock:prod.stock-c}).eq('id',prod.id)
        await supabase.from('ventas').insert({grupo_id:g.id,producto_id:r.prodId||null,tipo:'producto',monto:m*c,cantidad:c,nota:''})
      }
    }
setClienteId('');setClienteBusqueda('');setServRows([{id:1,servicioId:'',monto:'',nota:''}]);setProdRows([]);setMontoPagado('');setPagoEstado('pagado')
    localStorage.removeItem('gleet_borrador_venta')
        onReload()
  }

  async function saldar(id:string){
    const g=grupos.find((x:any)=>x.id===id)
    if(!g) return
    await supabase.from('grupos_venta').update({pagado:g.total,estado:'pagado'}).eq('id',id)
    onReload()
  }

  async function eliminarVenta(id:string){
    await supabase.from('ventas').delete().eq('id',id)
    onReload()
  }

  async function guardarEdicion(){
    if(!editando) return
    await supabase.from('ventas').update({monto:parseFloat(editando.monto)||0,nota:editando.nota}).eq('id',editando.id)
    setEditando(null);onReload()
  }

  const listaVentas=filtro?ventas.filter((v:any)=>v.tipo===filtro):ventas

  return(
    <div>
      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Registrar atención</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:10}}>
          <div style={{position:'relative'}}>
            <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Clienta</label>
            <input
              value={clienteBusqueda}
              onChange={e=>{setClienteBusqueda(e.target.value);setClienteId('');setShowSugerencias(true)}}
              onFocus={()=>setShowSugerencias(true)}
              onBlur={()=>setTimeout(()=>setShowSugerencias(false),150)}
              placeholder="Escribe el nombre de la clienta..."
              style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}
            />
            {showSugerencias&&clienteBusqueda&&!clienteId&&(
              <div style={{position:'absolute',top:'100%',left:0,right:0,background:'white',border:'1px solid #e0e0e0',borderRadius:8,marginTop:4,maxHeight:220,overflowY:'auto',zIndex:20,boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
                {clientes.filter((c:any)=>c.nombre.toLowerCase().includes(clienteBusqueda.toLowerCase())||c.telefono?.includes(clienteBusqueda)).slice(0,8).map((c:any)=>(
                  <div key={c.id} onMouseDown={()=>{setClienteId(c.id);setClienteBusqueda(c.nombre);setShowSugerencias(false)}}
                    style={{padding:'7px 10px',cursor:'pointer',borderBottom:'1px solid #f0f0f0',fontSize:12}}
                    onMouseEnter={e=>(e.currentTarget.style.background='#f9f9f9')}
                    onMouseLeave={e=>(e.currentTarget.style.background='white')}>
                    <span style={{fontWeight:500}}>{c.nombre}</span>{c.telefono?<span style={{color:'#888'}}> · {c.telefono}</span>:''}
                  </div>
                ))}
                {clientes.filter((c:any)=>c.nombre.toLowerCase().includes(clienteBusqueda.toLowerCase())||c.telefono?.includes(clienteBusqueda)).length===0&&(
                  <div style={{padding:'7px 10px',fontSize:12,color:'#666'}}>Sin resultados</div>
                )}
              </div>
            )}
          </div>
          <div>
            <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Fecha</label>
            <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
          </div>
        </div>

        <div style={{background:'#f9f9f9',borderRadius:8,padding:12,marginBottom:10}}>
          <div style={{fontSize:12,fontWeight:500,marginBottom:8}}>✂ Servicios realizados</div>
          {servRows.map((r,i)=>(
            <div key={r.id} style={{display:'flex',gap:8,marginBottom:8,flexWrap:'wrap',alignItems:'flex-end'}}>
              <div style={{flex:2,minWidth:140}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Servicio</label>
                <select value={r.servicioId} onChange={e=>{
                  const srv=servicios.find((s:any)=>s.id===e.target.value)
                  setServRows(rows=>rows.map((x,j)=>j===i?{...x,servicioId:e.target.value,monto:srv?.precio_base||x.monto}:x))
                }} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}>
                  <option value="">-- selecciona --</option>
                  {servicios.map((s:any)=><option key={s.id} value={s.id}>{s.nombre}</option>)}
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
          <button onClick={()=>setServRows(r=>[...r,{id:Date.now(),servicioId:'',monto:'',nota:''}])} style={{fontSize:11,color:'#1a1a1a',background:'none',border:'1px dashed #888',borderRadius:6,padding:'4px 10px',cursor:'pointer'}}>+ Agregar servicio</button>
        </div>

        <div style={{background:'#f9f9f9',borderRadius:8,padding:12,marginBottom:10}}>
          <div style={{fontSize:12,fontWeight:500,marginBottom:8}}>🛍 Productos vendidos</div>
          {prodRows.map((r,i)=>(
            <div key={r.id} style={{display:'flex',gap:8,marginBottom:8,flexWrap:'wrap',alignItems:'flex-end'}}>
              <div style={{flex:2,minWidth:140}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Producto</label>
                <select value={r.prodId||''} onChange={e=>{
                  const p=inventario.find((x:any)=>x.id===e.target.value)
                  setProdRows(rows=>rows.map((x,j)=>j===i?{...x,prodId:e.target.value,precio:p?.precio_venta||''}:x))
                }} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}>
                  <option value="">-- selecciona --</option>
                  {inventario.map((p:any)=><option key={p.id} value={p.id}>{p.nombre} — {fmt(p.precio_venta)}</option>)}
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

      {editando&&(
        <div style={{background:'white',border:'1px solid #c8a96e',borderRadius:12,padding:14,marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
            <span style={{fontSize:13,fontWeight:500}}>✏ Editar venta</span>
            <button onClick={()=>setEditando(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#999'}}>×</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div style={{marginBottom:9}}>
              <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Monto ($)</label>
              <input type="number" value={editando.monto} onChange={e=>setEditando({...editando,monto:e.target.value})} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
            </div>
            <div style={{marginBottom:9}}>
              <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Notas</label>
              <input value={editando.nota||''} onChange={e=>setEditando({...editando,nota:e.target.value})} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
            </div>
          </div>
          <button onClick={guardarEdicion} style={{padding:'7px 16px',borderRadius:8,border:'none',background:'#1a1a1a',color:'white',cursor:'pointer',fontSize:12}}>✓ Guardar</button>
        </div>
      )}

      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14,marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <span style={{fontSize:13,fontWeight:500}}>Historial de ventas</span>
          <select value={filtro} onChange={e=>setFiltro(e.target.value)} style={{padding:'4px 8px',border:'1px solid #ddd',borderRadius:8,fontSize:11}}>
            <option value="">Todo</option><option value="servicio">Servicios</option><option value="producto">Productos</option>
          </select>
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr>{['Fecha','Clienta','Tipo','Detalle','Monto','Pago',''].map(h=><th key={h} style={{textAlign:'left',padding:'7px 10px',borderBottom:'1px solid #eee',color:'#666',fontSize:11}}>{h}</th>)}</tr></thead>

            <tbody>
              {[...listaVentas].map((v:any)=>{
                const cli=v.grupos_venta?.clientes?.nombre||'—'
                const srv=v.servicios?.nombre||v.inventario?.nombre||'—'
                const est=v.grupos_venta?.estado||'pagado'
                const eB:any={pagado:'#EAF3DE',parcial:'#FAEEDA',debe:'#FCEBEB'}
                const eC:any={pagado:'#3B6D11',parcial:'#854F0B',debe:'#A32D2D'}
                const eL:any={pagado:'Pagado',parcial:'Parcial',debe:'Debe'}
                return(
                  <tr key={v.id} style={{borderBottom:'1px solid #f5f5f5'}}>
                    <td style={{padding:'8px 10px',color:'#666'}}>{v.grupos_venta?.fecha?fmtF(v.grupos_venta.fecha):'—'}</td>
                    <td style={{padding:'8px 10px'}}>{cli}</td>
                    <td style={{padding:'8px 10px'}}><span style={{padding:'2px 7px',borderRadius:20,fontSize:11,background:v.tipo==='servicio'?'#EEEDFE':'#E1F5EE',color:v.tipo==='servicio'?'#3C3489':'#0F6E56'}}>{v.tipo==='servicio'?'Servicio':'Producto'}</span></td>
                    <td style={{padding:'8px 10px'}}><div style={{fontWeight:500}}>{srv}</div>{v.nota&&<div style={{fontSize:10,color:'#888'}}>{v.nota}</div>}</td>
                    <td style={{padding:'8px 10px',fontWeight:500}}>{fmt(v.monto)}</td>
                    <td style={{padding:'8px 10px'}}><span style={{padding:'2px 7px',borderRadius:20,fontSize:11,background:eB[est],color:eC[est]}}>{eL[est]}</span></td>
                    <td style={{padding:'8px 10px'}}>
                      <div style={{display:'flex',gap:4}}>
                        <button onClick={()=>setEditando({...v})} style={{padding:'3px 8px',borderRadius:6,border:'1px solid #ddd',background:'white',cursor:'pointer',fontSize:11}}>✏</button>
                        <button onClick={()=>eliminarVenta(v.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#ccc',fontSize:16}}>×</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {listaVentas.length===0&&<tr><td colSpan={7} style={{textAlign:'center',color:'#666',padding:16}}>Sin ventas registradas</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:10,color:'#A32D2D'}}>Deudas pendientes</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr>{['Fecha','Clienta','Total','Pagado','Debe','Días',''].map(h=><th key={h} style={{textAlign:'left',padding:'7px 10px',borderBottom:'1px solid #eee',color:'#666',fontSize:11}}>{h}</th>)}</tr></thead>
            <tbody>
              {grupos.filter((g:any)=>g.estado!=='pagado').map((g:any)=>{
                const dias=diasDesde(g.fecha);const vieja=dias>30
                return(
                  <tr key={g.id} style={{background:vieja?'#fff8f0':'white'}}>
                    <td style={{padding:'8px 10px',color:'#666'}}>{fmtF(g.fecha)}</td>
                    <td style={{padding:'8px 10px',fontWeight:500}}>{g.clientes?.nombre||'—'}</td>
                    <td style={{padding:'8px 10px'}}>{fmt(g.total)}</td>
                    <td style={{padding:'8px 10px',color:'#3B6D11'}}>{fmt(g.pagado)}</td>
                    <td style={{padding:'8px 10px',color:'#A32D2D',fontWeight:500}}>{fmt(g.total-g.pagado)}</td>
                    <td style={{padding:'8px 10px'}}><span style={{padding:'2px 7px',borderRadius:20,fontSize:11,background:vieja?'#FCEBEB':'#FAEEDA',color:vieja?'#A32D2D':'#854F0B'}}>{dias}d</span></td>
                    <td style={{padding:'8px 10px'}}><button onClick={()=>saldar(g.id)} style={{padding:'4px 10px',borderRadius:8,border:'1px solid #cce8cc',background:'#EAF3DE',color:'#3B6D11',cursor:'pointer',fontSize:11}}>✓ Saldar</button></td>
                  </tr>
                )
              })}
              {grupos.filter((g:any)=>g.estado!=='pagado').length===0&&<tr><td colSpan={7} style={{textAlign:'center',color:'#666',padding:12}}>Sin deudas pendientes</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
function HistorialTab({ventas,grupos,clientes,fmt,fmtF}:any){
  const [buscar,setBuscar]=useState('')
  const [clienteSelec,setClienteSelec]=useState<any>(null)

  const CAT_COLOR:any={corte:'#534AB7',color:'#D4537E',decoloracion:'#BA7517',alisado:'#0F6E56',otro:'#888780'}
  const CAT_BG:any={corte:'#EEEDFE',color:'#FBEAF0',decoloracion:'#FAEEDA',alisado:'#E1F5EE',otro:'#F1EFE8'}

  const clientesFiltrados=buscar?clientes.filter((c:any)=>c.nombre.toLowerCase().includes(buscar.toLowerCase())||c.telefono?.includes(buscar)):[]

  const ventasCli=clienteSelec?ventas.filter((v:any)=>v.grupos_venta?.clientes?.id===clienteSelec.id||v.grupos_venta?.cliente_id===clienteSelec.id):[]
  const gruposCli=clienteSelec?grupos.filter((g:any)=>g.cliente_id===clienteSelec.id):[]

  const grps:{[k:string]:{fecha:string,srv:any[],prd:any[],gid:string,estado:string,total:number,pagado:number}}={}
  ventasCli.forEach((v:any)=>{
    const k=v.grupo_id
    if(!k) return
    const g=gruposCli.find((x:any)=>x.id===k)
    if(!grps[k]) grps[k]={fecha:v.grupos_venta?.fecha||'',srv:[],prd:[],gid:k,estado:g?.estado||'pagado',total:g?.total||0,pagado:g?.pagado||0}
    if(v.tipo==='servicio') grps[k].srv.push(v)
    else grps[k].prd.push(v)
  })

  const totHistorico=ventasCli.reduce((a:number,v:any)=>a+v.monto,0)

  return(
    <div>
      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Historial por clienta</div>
        <input value={buscar} onChange={e=>{setBuscar(e.target.value);setClienteSelec(null)}} placeholder="Busca el nombre de la clienta..." style={{width:'100%',padding:'8px 12px',border:'1px solid #ddd',borderRadius:8,fontSize:12,marginBottom:8}}/>

        {buscar&&!clienteSelec&&clientesFiltrados.length>0&&(
          <div style={{border:'1px solid #e0e0e0',borderRadius:8,marginBottom:12,overflow:'hidden'}}>
            {clientesFiltrados.map((c:any)=>(
              <div key={c.id} onClick={()=>{setClienteSelec(c);setBuscar(c.nombre)}} style={{padding:'8px 12px',cursor:'pointer',borderBottom:'1px solid #f0f0f0',display:'flex',alignItems:'center',gap:8}}
                onMouseEnter={e=>(e.currentTarget.style.background='#f9f9f9')}
                onMouseLeave={e=>(e.currentTarget.style.background='white')}>
                <div style={{width:28,height:28,borderRadius:'50%',background:'#f0ede6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:500}}>{c.nombre[0]}</div>
                <div>
                  <div style={{fontSize:12,fontWeight:500}}>{c.nombre}</div>
                  <div style={{fontSize:11,color:'#666'}}>{c.telefono||'Sin teléfono'}{c.notas?' · '+c.notas:''}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {buscar&&!clienteSelec&&clientesFiltrados.length===0&&<p style={{fontSize:12,color:'#666',marginBottom:12}}>No se encontraron clientas.</p>}
        {!buscar&&<p style={{fontSize:12,color:'#666'}}>Escribe el nombre de una clienta para ver su historial.</p>}

        {clienteSelec&&(
          <div>
            <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 0',borderBottom:'1px solid #eee',marginBottom:12}}>
              <div style={{width:44,height:44,borderRadius:'50%',background:'#f0ede6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:500}}>{clienteSelec.nombre[0]}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:500}}>{clienteSelec.nombre}</div>
                <div style={{fontSize:12,color:'#666'}}>{clienteSelec.telefono||''}{clienteSelec.notas?' · '+clienteSelec.notas:''}</div>
                <div style={{fontSize:11,color:'#666'}}>{Object.keys(grps).length} visitas registradas</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:15,fontWeight:500}}>{fmt(totHistorico)}</div>
                <div style={{fontSize:10,color:'#666'}}>total histórico</div>
              </div>
            </div>

            {Object.values(grps).length===0&&<p style={{fontSize:12,color:'#666'}}>Sin atenciones registradas para esta clienta.</p>}

            {Object.values(grps).sort((a:any,b:any)=>b.fecha.localeCompare(a.fecha)).map((g:any,gi:number)=>{
              const totG=[...g.srv,...g.prd].reduce((a:number,v:any)=>a+v.monto,0)
              const debe=g.total-g.pagado
              return(
                <div key={gi} style={{padding:'10px 0',borderBottom:'1px solid #f5f5f5'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                    <span style={{fontSize:12,fontWeight:500}}>{g.fecha?new Date(g.fecha+'T12:00:00').toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}):''}</span>
                    <div style={{display:'flex',gap:6,alignItems:'center'}}>
                      {debe>0&&<span style={{padding:'2px 7px',borderRadius:20,fontSize:11,background:'#FAEEDA',color:'#854F0B'}}>Debe {fmt(debe)}</span>}
                      <span style={{fontWeight:500,fontSize:13}}>{fmt(totG)}</span>
                    </div>
                  </div>
                  {g.srv.length>0&&(
                    <div style={{marginBottom:4}}>
                      {g.srv.map((v:any,i:number)=>{
                        const cat=v.servicios?.categoria||'otro'
                        return(
                          <span key={i} style={{display:'inline-flex',alignItems:'center',gap:4,background:CAT_BG[cat],color:CAT_COLOR[cat],padding:'2px 8px',borderRadius:12,fontSize:11,margin:'2px 2px 2px 0'}}>
                            ✂ {v.servicios?.nombre||'Servicio'} {fmt(v.monto)}
                          </span>
                        )
                      })}
                      {g.srv.filter((v:any)=>v.nota).map((v:any,i:number)=>(
                        <div key={i} style={{background:'#f9f9f9',borderRadius:6,padding:'5px 8px',fontSize:11,color:'#666',marginTop:4,fontStyle:'italic'}}>
                          📝 {v.nota}
                        </div>
                      ))}
                    </div>
                  )}
                  {g.prd.length>0&&(
                    <div style={{marginTop:4}}>
                      {g.prd.map((v:any,i:number)=>(
                        <span key={i} style={{display:'inline-flex',alignItems:'center',gap:4,background:'#E1F5EE',color:'#0F6E56',padding:'2px 8px',borderRadius:12,fontSize:11,margin:'2px 2px 2px 0'}}>
                          🛍 {v.inventario?.nombre||'Producto'}{v.cantidad>1?` x${v.cantidad}`:''} {fmt(v.monto)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
function AgendaTab({citas,clientes,servicios,onReload,hoy}:any){
  const [semOffset,setSemOffset]=useState(0)
  const [showForm,setShowForm]=useState(false)
  const [clienteId,setClienteId]=useState('')
  const [servicioId,setServicioId]=useState('')
  const [fecha,setFecha]=useState(hoy)
  const [hora,setHora]=useState('09:00')
  const [duracion,setDuracion]=useState(60)
  const [nota,setNota]=useState('')
  const [detalle,setDetalle]=useState<any>(null)

  const CAT_COLOR:any={corte:'#534AB7',color:'#D4537E',decoloracion:'#BA7517',alisado:'#0F6E56',otro:'#888780'}
  const CAT_BG:any={corte:'#EEEDFE',color:'#FBEAF0',decoloracion:'#FAEEDA',alisado:'#E1F5EE',otro:'#F1EFE8'}
  const DIAS=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  const HORAS:string[]=[]
  for(let h=8;h<=23;h++){HORAS.push(String(h).padStart(2,'0')+':00');if(h<23)HORAS.push(String(h).padStart(2,'0')+':30')}
  const durFmt=(m:number)=>m<60?m+'min':m%60===0?(m/60)+'h':Math.floor(m/60)+'h'+m%60
  const dateStr=(d:Date)=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')
  const getLunes=(off:number)=>{const d=new Date();const dia=d.getDay();d.setDate(d.getDate()-dia+(dia===0?-6:1)+off*7);d.setHours(0,0,0,0);return d}
  const lunes=getLunes(semOffset)
  const dias=Array.from({length:7},(_,i)=>{const d=new Date(lunes);d.setDate(lunes.getDate()+i);return d})
  const hoyReal=new Date().toISOString().split('T')[0]
  const ahora=new Date().getHours()*60+new Date().getMinutes()
  const citasHoy=citas.filter((c:any)=>c.fecha===hoyReal).sort((a:any,b:any)=>a.hora.localeCompare(b.hora))

  async function agregar(){
    if(!clienteId){alert('Selecciona una clienta');return}
    if(!fecha){alert('Selecciona una fecha');return}
    const srv=servicios.find((s:any)=>s.id===servicioId)
    await supabase.from('citas').insert({cliente_id:clienteId,servicio_id:servicioId||null,fecha,hora,duracion:srv?.duracion_min||duracion,nota})
    setClienteId('');setNota('');setShowForm(false);onReload()
  }

  async function eliminar(id:string){
    await supabase.from('citas').delete().eq('id',id)
    setDetalle(null);onReload()
  }

  return(
    <div>
      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14,marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
          <span style={{fontSize:13,fontWeight:500}}>Hoy — {new Date().toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})}</span>
          <span style={{fontSize:12,color:'#666'}}>{citasHoy.length} cita{citasHoy.length!==1?'s':''}</span>
        </div>
        {citasHoy.length?citasHoy.map((c:any)=>{
          const cat=c.servicios?.categoria||'otro'
          return(
            <div key={c.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:'1px solid #f0f0f0'}}>
              <div style={{width:4,height:36,borderRadius:2,background:CAT_COLOR[cat],flexShrink:0}}></div>
              <div style={{width:28,height:28,borderRadius:'50%',background:'#f0ede6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:500}}>{c.clientes?.nombre?.[0]||'?'}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:500}}>{c.clientes?.nombre||'—'}</div>
                <div style={{fontSize:11,color:'#666'}}>{c.servicios?.nombre||'—'}{c.nota?' · '+c.nota:''}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:13,fontWeight:500}}>{c.hora}</div>
                <div style={{fontSize:10,color:'#888',background:'#f0f0f0',borderRadius:4,padding:'1px 5px'}}>{durFmt(c.duracion||60)}</div>
              </div>
              <button onClick={()=>eliminar(c.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#ccc',fontSize:16}}>×</button>
            </div>
          )
        }):<p style={{fontSize:12,color:'#666'}}>No hay citas para hoy</p>}
      </div>

      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14,marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,flexWrap:'wrap'}}>
          <button onClick={()=>setSemOffset(s=>s-1)} style={{padding:'4px 10px',borderRadius:8,border:'1px solid #e0e0e0',background:'white',cursor:'pointer'}}>←</button>
          <span style={{flex:1,textAlign:'center',fontSize:13,fontWeight:500}}>{dias[0].toLocaleDateString('es-CL',{day:'numeric',month:'short'})} — {dias[6].toLocaleDateString('es-CL',{day:'numeric',month:'short',year:'numeric'})}</span>
          <button onClick={()=>setSemOffset(0)} style={{padding:'4px 10px',borderRadius:8,border:'1px solid #e0e0e0',background:'white',cursor:'pointer'}}>Hoy</button>
          <button onClick={()=>setSemOffset(s=>s+1)} style={{padding:'4px 10px',borderRadius:8,border:'1px solid #e0e0e0',background:'white',cursor:'pointer'}}>→</button>
          <button onClick={()=>{setShowForm(f=>!f);setDetalle(null)}} style={{padding:'6px 14px',borderRadius:8,border:'none',background:'#1a1a1a',color:'white',cursor:'pointer',fontSize:12}}>+ Nueva cita</button>
        </div>
        <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:8,fontSize:11,color:'#666'}}>
          {[['#534AB7','Corte'],['#D4537E','Color/Raíz'],['#BA7517','Deco/Mechas'],['#0F6E56','Alisado'],['#888780','Otro']].map(([c,l])=>(
            <span key={l} style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:10,borderRadius:2,background:c,display:'inline-block'}}></span>{l}</span>
          ))}
        </div>
        <div style={{overflowY:'auto',maxHeight:600,border:'1px solid #e0e0e0',borderRadius:8}}>
          <div style={{position:'sticky',top:0,zIndex:10,display:'grid',gridTemplateColumns:'48px repeat(7,1fr)',background:'white',borderBottom:'1px solid #e0e0e0'}}>
            <div style={{background:'#f9f9f9',borderRight:'1px solid #e0e0e0'}}></div>
            {dias.map(d=>{const ds=dateStr(d);const isH=ds===hoyReal;return(
              <div key={ds} style={{borderRight:'1px solid #e0e0e0',padding:'8px 4px',textAlign:'center',background:isH?'#f9f7f2':'white'}}>
                <div style={{fontSize:11,color:'#666'}}>{DIAS[d.getDay()]}</div>
                <div style={{fontSize:17,fontWeight:500,width:30,height:30,borderRadius:'50%',background:isH?'#1a1a1a':'transparent',color:isH?'white':'inherit',display:'flex',alignItems:'center',justifyContent:'center',margin:'1px auto 0'}}>{d.getDate()}</div>
              </div>
            )})}
          </div>
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
                    {cx.map((c:any)=>{
                      const cat=c.servicios?.categoria||'otro'
                      return(
                        <div key={c.id} onClick={e=>{e.stopPropagation();setDetalle(c);setShowForm(false)}}
                          style={{borderLeft:`3px solid ${CAT_COLOR[cat]}`,background:CAT_BG[cat],padding:'2px 4px',marginBottom:2,fontSize:10,cursor:'pointer',overflow:'hidden'}}>
                          <div style={{fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',color:CAT_COLOR[cat]}}>{c.clientes?.nombre||'—'}</div>
                          <div style={{fontSize:9,color:CAT_COLOR[cat],opacity:.8}}>{c.servicios?.nombre||'—'}</div>
                        </div>
                      )
                    })}
                    {showLine&&<div style={{position:'absolute',left:0,right:0,height:2,background:'#E24B4A',top:`${pct}%`,zIndex:5}}><div style={{position:'absolute',left:-2,width:8,height:8,borderRadius:'50%',background:'#E24B4A',top:-3}}></div></div>}
                  </div>
                )
              })
            ])}
          </div>
        </div>
      </div>

      {detalle&&(
        <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14,marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
            <span style={{fontSize:13,fontWeight:500}}>{detalle.clientes?.nombre||'—'} · {detalle.hora}</span>
            <button onClick={()=>setDetalle(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#999'}}>×</button>
          </div>
          <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:12}}>
            <div style={{width:4,height:52,borderRadius:2,background:CAT_COLOR[detalle.servicios?.categoria||'otro']}}></div>
            <div>
              <div style={{fontSize:14,fontWeight:500}}>{detalle.clientes?.nombre||'—'}</div>
              <div style={{fontSize:12,color:'#666'}}>{detalle.servicios?.nombre||'Sin servicio'} · {durFmt(detalle.duracion||60)}</div>
              <div style={{fontSize:11,color:'#888'}}>{new Date(detalle.fecha+'T12:00:00').toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'})} a las {detalle.hora}</div>
              {detalle.nota&&<div style={{fontSize:11,color:'#888',fontStyle:'italic',marginTop:3}}>{detalle.nota}</div>}
            </div>
          </div>
          <button onClick={()=>eliminar(detalle.id)} style={{padding:'5px 12px',borderRadius:8,border:'1px solid #ffcccc',background:'#fff5f5',color:'#A32D2D',cursor:'pointer',fontSize:12}}>Eliminar cita</button>
        </div>
      )}

      {showForm&&(
        <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
            <span style={{fontSize:13,fontWeight:500}}>Nueva cita</span>
            <button onClick={()=>setShowForm(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#999'}}>×</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div>
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Clienta</label>
                <select value={clienteId} onChange={e=>setClienteId(e.target.value)} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}>
                  <option value="">-- selecciona --</option>
                  {clientes.map((c:any)=><option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Servicio</label>
                <select value={servicioId} onChange={e=>{
                  setServicioId(e.target.value)
                  const srv=servicios.find((s:any)=>s.id===e.target.value)
                  if(srv) setDuracion(srv.duracion_min||60)
                }} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}>
                  <option value="">-- selecciona --</option>
                  {servicios.map((s:any)=><option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Notas previas</label>
                <input value={nota} onChange={e=>setNota(e.target.value)} placeholder="Ej: traer fotos de referencia" style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
              </div>
            </div>
            <div>
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Fecha</label>
                <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
              </div>
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Hora</label>
                <select value={hora} onChange={e=>setHora(e.target.value)} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}>
                  {HORAS.map(h=><option key={h}>{h}</option>)}
                </select>
              </div>
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Duración</label>
                <select value={duracion} onChange={e=>setDuracion(Number(e.target.value))} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}>
                  {[30,45,60,90,120,150,180,210,240,300].map(m=><option key={m} value={m}>{durFmt(m)}</option>)}
                </select>
              </div>
            </div>
          </div>
          <button onClick={agregar} style={{padding:'7px 16px',borderRadius:8,border:'none',background:'#1a1a1a',color:'white',cursor:'pointer',fontSize:12}}>+ Agregar cita</button>
        </div>
      )}
    </div>
  )
}
function ClientasTab({clientes,onReload}:any){
  const [nombre,setNombre]=useState('')
  const [telefono,setTelefono]=useState('')
  const [email,setEmail]=useState('')
  const [notas,setNotas]=useState('')
  const [editando,setEditando]=useState<any>(null)
  const [buscar,setBuscar]=useState('')

  async function agregar(){
    if(!nombre){alert('Ingresa el nombre');return}
    await supabase.from('clientes').insert({nombre,telefono,email,notas})
    setNombre('');setTelefono('');setEmail('');setNotas('')
    onReload()
  }

  async function guardarEdicion(){
    if(!editando) return
    await supabase.from('clientes').update({nombre:editando.nombre,telefono:editando.telefono,email:editando.email,notas:editando.notas}).eq('id',editando.id)
    setEditando(null);onReload()
  }

  async function eliminar(id:string){
    if(!confirm('¿Eliminar esta clienta?')) return
    await supabase.from('clientes').delete().eq('id',id)
    onReload()
  }

  const lista=buscar?clientes.filter((c:any)=>c.nombre.toLowerCase().includes(buscar.toLowerCase())||c.telefono?.includes(buscar)):clientes

  return(
    <div>
      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Nueva clienta</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div>
            <div style={{marginBottom:9}}>
              <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Nombre completo</label>
              <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej: María González" style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
            </div>
            <div style={{marginBottom:9}}>
              <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Teléfono</label>
              <input value={telefono} onChange={e=>setTelefono(e.target.value)} placeholder="+56 9 1234 5678" style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
            </div>
          </div>
          <div>
            <div style={{marginBottom:9}}>
              <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Email</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="correo@email.com" style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
            </div>
            <div style={{marginBottom:9}}>
              <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Notas / alergias</label>
              <input value={notas} onChange={e=>setNotas(e.target.value)} placeholder="Ej: alérgica al amoniaco" style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
            </div>
          </div>
        </div>
        <button onClick={agregar} style={{padding:'7px 16px',borderRadius:8,border:'none',background:'#1a1a1a',color:'white',cursor:'pointer',fontSize:12}}>+ Agregar clienta</button>
      </div>

      {editando&&(
        <div style={{background:'white',border:'1px solid #c8a96e',borderRadius:12,padding:14,marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
            <span style={{fontSize:13,fontWeight:500}}>✏ Editar clienta</span>
            <button onClick={()=>setEditando(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#999'}}>×</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div>
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Nombre</label>
                <input value={editando.nombre} onChange={e=>setEditando({...editando,nombre:e.target.value})} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
              </div>
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Teléfono</label>
                <input value={editando.telefono||''} onChange={e=>setEditando({...editando,telefono:e.target.value})} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
              </div>
            </div>
            <div>
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Email</label>
                <input value={editando.email||''} onChange={e=>setEditando({...editando,email:e.target.value})} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
              </div>
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Notas</label>
                <input value={editando.notas||''} onChange={e=>setEditando({...editando,notas:e.target.value})} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
              </div>
            </div>
          </div>
          <button onClick={guardarEdicion} style={{padding:'7px 16px',borderRadius:8,border:'none',background:'#1a1a1a',color:'white',cursor:'pointer',fontSize:12}}>✓ Guardar cambios</button>
        </div>
      )}

      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:10}}>Mis clientas</div>
        <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar por nombre o teléfono..." style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12,marginBottom:12}}/>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr>{['Nombre','Teléfono','Email','Notas',''].map(h=><th key={h} style={{textAlign:'left',padding:'7px 10px',borderBottom:'1px solid #eee',color:'#666',fontSize:11}}>{h}</th>)}</tr></thead>
            <tbody>
              {lista.map((c:any)=>(
                <tr key={c.id} style={{borderBottom:'1px solid #f5f5f5'}}>
                  <td style={{padding:'8px 10px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:28,height:28,borderRadius:'50%',background:'#f0ede6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:500}}>{c.nombre[0]}</div>
                      <span style={{fontWeight:500}}>{c.nombre}</span>
                    </div>
                  </td>
                  <td style={{padding:'8px 10px',color:'#666'}}>{c.telefono||'—'}</td>
                  <td style={{padding:'8px 10px',color:'#666'}}>{c.email||'—'}</td>
                  <td style={{padding:'8px 10px',color:'#666',fontSize:11}}>{c.notas||'—'}</td>
                  <td style={{padding:'8px 10px'}}>
                    <div style={{display:'flex',gap:4}}>
                      <button onClick={()=>setEditando({...c})} style={{padding:'3px 8px',borderRadius:6,border:'1px solid #ddd',background:'white',cursor:'pointer',fontSize:11}}>✏</button>
                      <button onClick={()=>eliminar(c.id)} style={{padding:'3px 8px',borderRadius:6,border:'1px solid #ffcccc',background:'#fff5f5',color:'#A32D2D',cursor:'pointer',fontSize:11}}>×</button>
                    </div>
                  </td>
                </tr>
              ))}
              {lista.length===0&&<tr><td colSpan={5} style={{textAlign:'center',color:'#666',padding:16}}>Sin clientas registradas</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
function ProveedoresTab({proveedores,inventario,onReload}:any){
  const [nombre,setNombre]=useState('')
  const [contacto,setContacto]=useState('')
  const [telefono,setTelefono]=useState('')
  const [email,setEmail]=useState('')
  const [direccion,setDireccion]=useState('')
  const [ciudad,setCiudad]=useState('')
  const [categorias,setCategorias]=useState('')
  const [notas,setNotas]=useState('')
  const [editando,setEditando]=useState<any>(null)

  async function agregar(){
    if(!nombre){alert('Ingresa el nombre');return}
    await supabase.from('proveedores').insert({nombre,contacto,telefono,email,direccion,ciudad,categorias,notas})
    setNombre('');setContacto('');setTelefono('');setEmail('');setDireccion('');setCiudad('');setCategorias('');setNotas('')
    onReload()
  }

  async function guardarEdicion(){
    if(!editando) return
    await supabase.from('proveedores').update({nombre:editando.nombre,contacto:editando.contacto,telefono:editando.telefono,email:editando.email,direccion:editando.direccion,ciudad:editando.ciudad,categorias:editando.categorias,notas:editando.notas}).eq('id',editando.id)
    setEditando(null);onReload()
  }

  async function eliminar(id:string){
    if(!confirm('¿Eliminar este proveedor?')) return
    await supabase.from('proveedores').delete().eq('id',id)
    onReload()
  }

  return(
    <div>
      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Nuevo proveedor</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div>
            {[['Nombre',nombre,setNombre,'Ej: Distribuidora Belleza Pro'],['Contacto',contacto,setContacto,'Nombre del vendedor'],['Teléfono',telefono,setTelefono,'+56 9 1234 5678'],['Email',email,setEmail,'ventas@proveedor.cl']].map(([l,v,s,p]:any)=>(
              <div key={l} style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>{l}</label>
                <input value={v} onChange={e=>s(e.target.value)} placeholder={p} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
              </div>
            ))}
          </div>
          <div>
            {[['Dirección',direccion,setDireccion,'Calle, número, comuna'],['Ciudad',ciudad,setCiudad,'Ej: Santiago'],['Categorías',categorias,setCategorias,'Ej: Tintes, Shampoos']].map(([l,v,s,p]:any)=>(
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

      {editando&&(
        <div style={{background:'white',border:'1px solid #c8a96e',borderRadius:12,padding:14,marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
            <span style={{fontSize:13,fontWeight:500}}>✏ Editar proveedor</span>
            <button onClick={()=>setEditando(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#999'}}>×</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div>
              {[['Nombre','nombre'],['Contacto','contacto'],['Teléfono','telefono'],['Email','email']].map(([l,k])=>(
                <div key={k} style={{marginBottom:9}}>
                  <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>{l}</label>
                  <input value={editando[k]||''} onChange={e=>setEditando({...editando,[k]:e.target.value})} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
                </div>
              ))}
            </div>
            <div>
              {[['Dirección','direccion'],['Ciudad','ciudad'],['Categorías','categorias']].map(([l,k])=>(
                <div key={k} style={{marginBottom:9}}>
                  <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>{l}</label>
                  <input value={editando[k]||''} onChange={e=>setEditando({...editando,[k]:e.target.value})} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
                </div>
              ))}
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Notas</label>
                <textarea value={editando.notas||''} onChange={e=>setEditando({...editando,notas:e.target.value})} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12,resize:'vertical',minHeight:52,fontFamily:'system-ui'}}/>
              </div>
            </div>
          </div>
          <button onClick={guardarEdicion} style={{padding:'7px 16px',borderRadius:8,border:'none',background:'#1a1a1a',color:'white',cursor:'pointer',fontSize:12}}>✓ Guardar cambios</button>
        </div>
      )}

      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Mis proveedores</div>
        {proveedores.length===0&&<p style={{fontSize:12,color:'#666'}}>Sin proveedores registrados.</p>}
        {proveedores.map((p:any)=>{
          const prods=inventario.filter((i:any)=>i.proveedor_id===p.id)
          return(
            <div key={p.id} style={{border:'1px solid #e0e0e0',borderRadius:10,padding:14,marginBottom:10}}>
              <div style={{display:'flex',gap:12,alignItems:'flex-start',marginBottom:10}}>
                <div style={{width:40,height:40,borderRadius:8,background:'#E1F5EE',display:'flex',alignItems:'center',justifyContent:'center',color:'#0F6E56',fontSize:18,flexShrink:0}}>🚚</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500}}>{p.nombre}</div>
                  <div style={{fontSize:11,color:'#666'}}>{p.categorias||'—'}</div>
                </div>
                <div style={{display:'flex',gap:4}}>
                  <button onClick={()=>setEditando({...p})} style={{padding:'3px 8px',borderRadius:6,border:'1px solid #ddd',background:'white',cursor:'pointer',fontSize:11}}>✏</button>
                  <button onClick={()=>eliminar(p.id)} style={{padding:'3px 8px',borderRadius:6,border:'1px solid #ffcccc',background:'#fff5f5',color:'#A32D2D',cursor:'pointer',fontSize:11}}>×</button>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,fontSize:12,marginBottom:8}}>
                <div><span style={{color:'#666'}}>Contacto:</span> {p.contacto||'—'}</div>
                <div><span style={{color:'#666'}}>Tel:</span> {p.telefono||'—'}</div>
                <div><span style={{color:'#666'}}>Email:</span> {p.email||'—'}</div>
                <div><span style={{color:'#666'}}>Dir:</span> {p.direccion?p.direccion+(p.ciudad?', '+p.ciudad:''):'—'}</div>
              </div>
              {p.notas&&<div style={{background:'#f9f9f9',borderRadius:6,padding:'6px 8px',fontSize:11,color:'#666',fontStyle:'italic',marginBottom:8}}>{p.notas}</div>}
              {prods.length>0&&<div style={{fontSize:11,color:'#666'}}>Productos: {prods.map((x:any)=><span key={x.id} style={{padding:'2px 7px',borderRadius:20,fontSize:11,background:'#E6F1FB',color:'#185FA5',margin:1}}>{x.nombre}</span>)}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
function ServiciosTab({servicios,onReload}:any){
  const [nombre,setNombre]=useState('')
  const [categoria,setCategoria]=useState('corte')
  const [duracion,setDuracion]=useState(60)
  const [precio,setPrecio]=useState('')
  const [editando,setEditando]=useState<any>(null)

  const CATS=[['corte','Corte'],['color','Color / Raíz / Baño'],['decoloracion','Decoloración / Mechas / Balayage'],['alisado','Alisado / Keratina'],['otro','Otro']]
  const fmt=(n:number)=>'$'+Math.round(n).toLocaleString('es-CL')

  async function agregar(){
    if(!nombre){alert('Ingresa el nombre');return}
    await supabase.from('servicios').insert({nombre,categoria,duracion_min:duracion,precio_base:parseInt(precio)||0})
    setNombre('');setPrecio('');onReload()
  }

  async function guardarEdicion(){
    if(!editando) return
    await supabase.from('servicios').update({nombre:editando.nombre,categoria:editando.categoria,duracion_min:editando.duracion_min,precio_base:editando.precio_base}).eq('id',editando.id)
    setEditando(null);onReload()
  }

  async function eliminar(id:string){
    if(!confirm('¿Eliminar este servicio?')) return
    await supabase.from('servicios').delete().eq('id',id)
    onReload()
  }

  const CAT_COLOR:any={corte:'#534AB7',color:'#D4537E',decoloracion:'#BA7517',alisado:'#0F6E56',otro:'#888780'}
  const CAT_BG:any={corte:'#EEEDFE',color:'#FBEAF0',decoloracion:'#FAEEDA',alisado:'#E1F5EE',otro:'#F1EFE8'}
  const durFmt=(m:number)=>m<60?m+'min':m%60===0?(m/60)+'h':Math.floor(m/60)+'h'+m%60

  return(
    <div>
      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Nuevo servicio</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div>
            <div style={{marginBottom:9}}>
              <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Nombre del servicio</label>
              <input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej: Balayage completo" style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
            </div>
            <div style={{marginBottom:9}}>
              <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Categoría</label>
              <select value={categoria} onChange={e=>setCategoria(e.target.value)} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}>
                {CATS.map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div style={{marginBottom:9}}>
              <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Duración estimada (min)</label>
              <select value={duracion} onChange={e=>setDuracion(Number(e.target.value))} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}>
                {[30,45,60,90,120,150,180,210,240,300].map(m=><option key={m} value={m}>{durFmt(m)}</option>)}
              </select>
            </div>
            <div style={{marginBottom:9}}>
              <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Precio base ($)</label>
              <input type="number" value={precio} onChange={e=>setPrecio(e.target.value)} placeholder="0" style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
            </div>
          </div>
        </div>
        <button onClick={agregar} style={{padding:'7px 16px',borderRadius:8,border:'none',background:'#1a1a1a',color:'white',cursor:'pointer',fontSize:12}}>+ Agregar servicio</button>
      </div>

      {editando&&(
        <div style={{background:'white',border:'1px solid #c8a96e',borderRadius:12,padding:14,marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
            <span style={{fontSize:13,fontWeight:500}}>✏ Editar servicio</span>
            <button onClick={()=>setEditando(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#999'}}>×</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div>
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Nombre</label>
                <input value={editando.nombre} onChange={e=>setEditando({...editando,nombre:e.target.value})} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
              </div>
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Categoría</label>
                <select value={editando.categoria} onChange={e=>setEditando({...editando,categoria:e.target.value})} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}>
                  {CATS.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Duración (min)</label>
                <select value={editando.duracion_min} onChange={e=>setEditando({...editando,duracion_min:Number(e.target.value)})} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}>
                  {[30,45,60,90,120,150,180,210,240,300].map(m=><option key={m} value={m}>{durFmt(m)}</option>)}
                </select>
              </div>
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Precio base ($)</label>
                <input type="number" value={editando.precio_base} onChange={e=>setEditando({...editando,precio_base:parseInt(e.target.value)||0})} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
              </div>
            </div>
          </div>
          <button onClick={guardarEdicion} style={{padding:'7px 16px',borderRadius:8,border:'none',background:'#1a1a1a',color:'white',cursor:'pointer',fontSize:12}}>✓ Guardar cambios</button>
        </div>
      )}

      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Catálogo de servicios</div>
        {servicios.length===0&&<p style={{fontSize:12,color:'#666'}}>Sin servicios registrados. Agrega los servicios que ofreces.</p>}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:10}}>
          {servicios.map((s:any)=>(
            <div key={s.id} style={{border:'1px solid #e0e0e0',borderRadius:10,padding:12,borderLeft:`4px solid ${CAT_COLOR[s.categoria]||'#888'}`}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                <div>
                  <div style={{fontSize:13,fontWeight:500}}>{s.nombre}</div>
                  <span style={{fontSize:11,padding:'2px 7px',borderRadius:20,background:CAT_BG[s.categoria]||'#f0f0f0',color:CAT_COLOR[s.categoria]||'#666'}}>{CATS.find(([v])=>v===s.categoria)?.[1]||s.categoria}</span>
                </div>
                <div style={{display:'flex',gap:4}}>
                  <button onClick={()=>setEditando({...s})} style={{padding:'3px 8px',borderRadius:6,border:'1px solid #ddd',background:'white',cursor:'pointer',fontSize:11}}>✏</button>
                  <button onClick={()=>eliminar(s.id)} style={{padding:'3px 8px',borderRadius:6,border:'1px solid #ffcccc',background:'#fff5f5',color:'#A32D2D',cursor:'pointer',fontSize:11}}>×</button>
                </div>
              </div>
              <div style={{display:'flex',gap:12,marginTop:8,fontSize:12,color:'#666'}}>
                <span>⏱ {durFmt(s.duracion_min||60)}</span>
                <span style={{color:'#3B6D11',fontWeight:500}}>{fmt(s.precio_base||0)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function InventarioTab({inventario,proveedores,onReload,fmt}:any){
  const [nombre,setNombre]=useState('')
  const [categoria,setCategoria]=useState('Shampoo')
  const [stock,setStock]=useState('')
  const [stockMin,setStockMin]=useState('2')
  const [precioVenta,setPrecioVenta]=useState('')
  const [precioCosto,setPrecioCosto]=useState('')
  const [provId,setProvId]=useState('')
  const [editando,setEditando]=useState<any>(null)

  const CATS=['Shampoo','Acondicionador','Tinte','Cera / Gel','Aceite','Pinche / Accesorio','Otro']

  async function agregar(){
    if(!nombre){alert('Ingresa el nombre');return}
    await supabase.from('inventario').insert({nombre,categoria,stock:parseInt(stock)||0,stock_minimo:parseInt(stockMin)||2,precio_venta:parseInt(precioVenta)||0,precio_costo:parseInt(precioCosto)||0,proveedor_id:provId||null})
    setNombre('');setStock('');setPrecioVenta('');setPrecioCosto('');setProvId('')
    onReload()
  }

  async function guardarEdicion(){
    if(!editando) return
    await supabase.from('inventario').update({nombre:editando.nombre,categoria:editando.categoria,stock:editando.stock,stock_minimo:editando.stock_minimo,precio_venta:editando.precio_venta,precio_costo:editando.precio_costo,proveedor_id:editando.proveedor_id||null}).eq('id',editando.id)
    setEditando(null);onReload()
  }

  async function ajustar(id:string,delta:number,actual:number){
    await supabase.from('inventario').update({stock:Math.max(0,actual+delta)}).eq('id',id)
    onReload()
  }

  async function eliminar(id:string){
    if(!confirm('¿Eliminar este producto?')) return
    await supabase.from('inventario').delete().eq('id',id)
    onReload()
  }

  return(
    <div>
      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14,marginBottom:12}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Agregar producto</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
          <div>
            <div style={{marginBottom:9}}>
              <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Nombre</label>
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
              <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Stock mínimo</label>
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

      {editando&&(
        <div style={{background:'white',border:'1px solid #c8a96e',borderRadius:12,padding:14,marginBottom:12}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
            <span style={{fontSize:13,fontWeight:500}}>✏ Editar producto</span>
            <button onClick={()=>setEditando(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#999'}}>×</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
            <div>
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Nombre</label>
                <input value={editando.nombre} onChange={e=>setEditando({...editando,nombre:e.target.value})} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
              </div>
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Categoría</label>
                <select value={editando.categoria} onChange={e=>setEditando({...editando,categoria:e.target.value})} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}>
                  {CATS.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Proveedor</label>
                <select value={editando.proveedor_id||''} onChange={e=>setEditando({...editando,proveedor_id:e.target.value||null})} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}>
                  <option value="">Sin proveedor</option>
                  {proveedores.map((p:any)=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Stock</label>
                <input type="number" value={editando.stock} onChange={e=>setEditando({...editando,stock:parseInt(e.target.value)||0})} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
              </div>
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Stock mínimo</label>
                <input type="number" value={editando.stock_minimo} onChange={e=>setEditando({...editando,stock_minimo:parseInt(e.target.value)||0})} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
              </div>
            </div>
            <div>
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Precio venta ($)</label>
                <input type="number" value={editando.precio_venta} onChange={e=>setEditando({...editando,precio_venta:parseInt(e.target.value)||0})} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
              </div>
              <div style={{marginBottom:9}}>
                <label style={{fontSize:11,color:'#666',display:'block',marginBottom:3}}>Precio costo ($)</label>
                <input type="number" value={editando.precio_costo} onChange={e=>setEditando({...editando,precio_costo:parseInt(e.target.value)||0})} style={{width:'100%',padding:'6px 9px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}/>
              </div>
            </div>
          </div>
          <button onClick={guardarEdicion} style={{padding:'7px 16px',borderRadius:8,border:'none',background:'#1a1a1a',color:'white',cursor:'pointer',fontSize:12}}>✓ Guardar cambios</button>
        </div>
      )}

      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Mis productos</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
            <thead><tr>{['Producto','Cat.','Proveedor','Stock','P. Venta','P. Costo','Margen','Estado',''].map(h=><th key={h} style={{textAlign:'left',padding:'7px 10px',borderBottom:'1px solid #eee',color:'#666',fontSize:11}}>{h}</th>)}</tr></thead>
            <tbody>
              {inventario.map((p:any)=>{
                const prov=proveedores.find((x:any)=>x.id===p.proveedor_id)
                const pct=Math.min(100,Math.round((p.stock/Math.max(p.stock_minimo*2,1))*100))
                const col=p.stock===0?'#E24B4A':p.stock<=p.stock_minimo?'#EF9F27':'#639922'
                const est=p.stock===0?['#FCEBEB','#A32D2D','Sin stock']:p.stock<=p.stock_minimo?['#FAEEDA','#854F0B','Bajo']:['#EAF3DE','#3B6D11','OK']
                const mg=p.precio_costo>0?Math.round(((p.precio_venta-p.precio_costo)/p.precio_venta)*100)+'%':'—'
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
                    <td style={{padding:'8px 10px'}}>
                      <div style={{display:'flex',gap:4}}>
                        <button onClick={()=>setEditando({...p})} style={{padding:'3px 8px',borderRadius:6,border:'1px solid #ddd',background:'white',cursor:'pointer',fontSize:11}}>✏</button>
                        <button onClick={()=>eliminar(p.id)} style={{padding:'3px 8px',borderRadius:6,border:'1px solid #ffcccc',background:'#fff5f5',color:'#A32D2D',cursor:'pointer',fontSize:11}}>×</button>
                      </div>
                    </td>
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
function TopClientasTab({ventas,grupos,anoActual,fmt,fmtF}:any){
  const anos=[...new Set<number>(ventas.map((v:any)=>{
    const f=v.grupos_venta?.fecha
    return f?new Date(f+'T12:00:00').getFullYear():null
  }).filter(Boolean))].sort((a:number,b:number)=>b-a)
  if(!anos.includes(anoActual)) anos.unshift(anoActual)

  const resumen:{[id:string]:{nombre:string,anos:{[a:number]:number},debe:number,visitas:number}}={}

  ventas.forEach((v:any)=>{
    const cli=v.grupos_venta?.clientes
    if(!cli) return
    const f=v.grupos_venta?.fecha
    if(!f) return
    const ano=new Date(f+'T12:00:00').getFullYear()
    if(!resumen[cli.id]) resumen[cli.id]={nombre:cli.nombre,anos:{},debe:0,visitas:0}
    resumen[cli.id].anos[ano]=(resumen[cli.id].anos[ano]||0)+v.monto
  })

  grupos.forEach((g:any)=>{
    if(!g.cliente_id||g.estado==='pagado') return
    if(!resumen[g.cliente_id]) return
    resumen[g.cliente_id].debe+=g.total-g.pagado
  })

  const visitasPorCliente:{[k:string]:Set<string>}={}
  ventas.forEach((v:any)=>{
    const cliId=v.grupos_venta?.clientes?.id
    if(!cliId||!v.grupo_id) return
    if(!visitasPorCliente[cliId]) visitasPorCliente[cliId]=new Set()
    visitasPorCliente[cliId].add(v.grupo_id)
  })
  Object.entries(visitasPorCliente).forEach(([id,set])=>{
    if(resumen[id]) resumen[id].visitas=set.size
  })

  const lista=Object.entries(resumen).sort((a,b)=>(b[1].anos[anoActual]||0)-(a[1].anos[anoActual]||0))

  return(
    <div>
      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>⭐ Top Clientas</div>
        <div style={{fontSize:11,color:'#666',marginBottom:12}}>Ordenadas por gasto en {anoActual}</div>
        {lista.length===0&&<p style={{fontSize:12,color:'#666'}}>Sin datos aún. Registra ventas para ver el ranking.</p>}
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
                {lista.map(([id,d],i)=>(
                  <tr key={id} style={{borderBottom:'1px solid #f5f5f5',background:i%2===0?'white':'#fafafa'}}>
                    <td style={{padding:'10px 10px'}}>
                      <div style={{width:24,height:24,borderRadius:'50%',background:i===0?'#c8a96e':i===1?'#b0b0b0':i===2?'#d4a57a':'#f0ede6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:i<3?'white':'#888'}}>{i+1}</div>
                    </td>
                    <td style={{padding:'10px 10px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:32,height:32,borderRadius:'50%',background:'#f0ede6',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:500,flexShrink:0}}>{d.nombre[0]}</div>
                        <span style={{fontWeight:500}}>{d.nombre}</span>
                      </div>
                    </td>
                    <td style={{padding:'10px 10px',textAlign:'center',color:'#666'}}>{d.visitas}</td>
                    {anos.map(a=>(
                      <td key={a} style={{padding:'10px 10px',textAlign:'right',fontWeight:a===anoActual?500:400,color:a===anoActual?(d.anos[a]>0?'#1a1a1a':'#ccc'):'#888'}}>
                        {d.anos[a]>0?fmt(d.anos[a]):'—'}
                      </td>
                    ))}
                    <td style={{padding:'10px 10px',textAlign:'right'}}>
                      {d.debe>0?<span style={{color:'#A32D2D',fontWeight:500,fontSize:11}}>{fmt(d.debe)}</span>:<span style={{color:'#3B6D11',fontSize:11}}>✓</span>}
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
function ReportesTab({ventas,MESES,anoActual,mesActual,fmt}:any){
  const [mes,setMes]=useState(mesActual)
  const [ano,setAno]=useState(anoActual)

  const vMes=ventas.filter((v:any)=>{
    const f=v.grupos_venta?.fecha
    if(!f) return false
    const d=new Date(f+'T12:00:00')
    return d.getMonth()===mes&&d.getFullYear()===ano
  })

  const totalServ=vMes.filter((v:any)=>v.tipo==='servicio').reduce((a:number,v:any)=>a+v.monto,0)
  const totalProd=vMes.filter((v:any)=>v.tipo==='producto').reduce((a:number,v:any)=>a+v.monto,0)

  const aggServ:{[k:string]:{n:number,t:number}}={}
  const aggProd:{[k:string]:{n:number,t:number}}={}
  vMes.forEach((v:any)=>{
    const nombre=v.tipo==='servicio'?(v.servicios?.nombre||'Servicio'):(v.inventario?.nombre||'Producto')
    if(v.tipo==='servicio'){
      if(!aggServ[nombre]) aggServ[nombre]={n:0,t:0}
      aggServ[nombre].n++;aggServ[nombre].t+=v.monto
    } else {
      if(!aggProd[nombre]) aggProd[nombre]={n:0,t:0}
      aggProd[nombre].n+=v.cantidad||1;aggProd[nombre].t+=v.monto
    }
  })

  const dataAnual=MESES.map((_:any,i:number)=>{
    const vA=ventas.filter((v:any)=>{
      const f=v.grupos_venta?.fecha
      if(!f) return false
      const d=new Date(f+'T12:00:00')
      return d.getMonth()===i&&d.getFullYear()===ano
    })
    return{
      mes:MESES[i].slice(0,3),
      serv:vA.filter((v:any)=>v.tipo==='servicio').reduce((a:number,v:any)=>a+v.monto,0),
      prod:vA.filter((v:any)=>v.tipo==='producto').reduce((a:number,v:any)=>a+v.monto,0)
    }
  })

  return(
    <div>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
        <label style={{fontSize:12,color:'#666'}}>Mes:</label>
        <select value={mes} onChange={e=>setMes(Number(e.target.value))} style={{padding:'5px 8px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}>
          {MESES.map((m:string,i:number)=><option key={m} value={i}>{m}</option>)}
        </select>
        <select value={ano} onChange={e=>setAno(Number(e.target.value))} style={{padding:'5px 8px',border:'1px solid #ddd',borderRadius:8,fontSize:12}}>
          {[2024,2025,2026,2027].map(a=><option key={a}>{a}</option>)}
        </select>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
        {[['Subtotal servicios',fmt(totalServ)],['Subtotal productos',fmt(totalProd)],['Total mes',fmt(totalServ+totalProd)]].map(([l,v])=>(
          <div key={l} style={{background:'#f0f0f0',borderRadius:8,padding:12}}>
            <div style={{fontSize:11,color:'#666'}}>{l}</div>
            <div style={{fontSize:20,fontWeight:500}}>{v}</div>
          </div>
        ))}
      </div>

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

      <div style={{background:'white',border:'1px solid #e0e0e0',borderRadius:12,padding:14}}>
        <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>Resumen anual {ano}</div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:700}}>
            <thead>
              <tr>
                <th style={{textAlign:'left',padding:'6px 8px',borderBottom:'1px solid #eee'}}>Concepto</th>
                {dataAnual.map((d:any,i:number)=><th key={d.mes} style={{textAlign:'right',padding:'6px 4px',borderBottom:'1px solid #eee',color:i===mes?'#1a1a1a':'#666',fontWeight:i===mes?700:400}}>{d.mes}</th>)}
                <th style={{textAlign:'right',padding:'6px 8px',borderBottom:'1px solid #eee'}}>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{padding:'6px 8px',fontWeight:500}}>Servicios</td>
                {dataAnual.map((d:any)=><td key={d.mes} style={{textAlign:'right',padding:'6px 4px',color:'#444'}}>{fmt(d.serv)}</td>)}
                <td style={{textAlign:'right',padding:'6px 8px',fontWeight:500}}>{fmt(dataAnual.reduce((a:number,d:any)=>a+d.serv,0))}</td>
              </tr>
              <tr>
                <td style={{padding:'6px 8px',fontWeight:500,color:'#c8a96e'}}>Productos</td>
                {dataAnual.map((d:any)=><td key={d.mes} style={{textAlign:'right',padding:'6px 4px',color:'#c8a96e'}}>{fmt(d.prod)}</td>)}
                <td style={{textAlign:'right',padding:'6px 8px',fontWeight:500,color:'#c8a96e'}}>{fmt(dataAnual.reduce((a:number,d:any)=>a+d.prod,0))}</td>
              </tr>
              <tr style={{borderTop:'1px solid #eee'}}>
                <td style={{padding:'6px 8px',fontWeight:500}}>Total</td>
                {dataAnual.map((d:any)=><td key={d.mes} style={{textAlign:'right',padding:'6px 4px',fontWeight:500}}>{fmt(d.serv+d.prod)}</td>)}
                <td style={{textAlign:'right',padding:'6px 8px',fontWeight:500,fontSize:13}}>{fmt(dataAnual.reduce((a:number,d:any)=>a+d.serv+d.prod,0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}