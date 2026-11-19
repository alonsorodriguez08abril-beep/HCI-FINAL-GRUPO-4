/**
 * NoiseGuard UX · Prototipo académico (HTML, CSS y JavaScript puro)
 * Referencia: capítulos III y IV del informe; mockups web y mobile.
 * IMPORTANTE: las lecturas de dB y las alertas son SIMULADAS. No se accede
 * al micrófono, no se almacena audio y no se realiza dosimetría acústica real.
 */
'use strict';

const STORAGE_KEY = 'noiseguard-ux-demo-v1';
const $ = (selector) => document.querySelector(selector);
const screen = $('#screen');
const defaults = {
  history: [], alerts: [],
  settings: {
    instrument: 'Guitarra', room: 'Espacio personal', breakSeconds: 60,
    notice: true, reminders: true, highContrast: false, lowPower: false
  }
};
function readStored() {
  try { const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {history: Array.isArray(s.history) ? s.history : [], alerts: Array.isArray(s.alerts) ? s.alerts : [], settings: {...defaults.settings, ...s.settings}};
  } catch { return structuredClone(defaults); }
}
const stored = readStored();
const state = {
  view: 'inicio', filter: 'todos', history: stored.history, alerts: stored.alerts,
  settings: stored.settings, active: false, paused: false, atrilLocked: false,
  sessionSeconds: 0, pauseRemaining: 0, pauseCount: 0, samples: [], peak: 72,
  currentDb: 72, dose: 0, lastSummary: null, selectedHistoryId: null,
  lastAlertAt: -100, demoStep: 0, toastTimer: null
};
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({history:state.history, alerts:state.alerts, settings:state.settings})); }
  catch { notify('El navegador no permitió guardar el historial.'); }
}
function safe(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function time(n) { n = Math.max(0, Math.floor(n)); return `${String(Math.floor(n / 60)).padStart(2,'0')}:${String(n % 60).padStart(2,'0')}`; }
function dateLabel(iso) { try {return new Date(iso).toLocaleString('es-PE', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});}catch{return 'Sin fecha';} }
function risk(db) {
  // Rangos solo ilustrativos del semáforo en el mockup, NO límites clínicos.
  if (db >= 95) return {color:'red', label:'Exposición elevada', detail:'Ejemplo de riesgo alto. Se sugiere interrumpir la práctica y descansar.'};
  if (db >= 80) return {color:'amber', label:'Atención al volumen', detail:'El ejemplo muestra una advertencia visual. Considera bajar la intensidad.'};
  return {color:'green', label:'Ensayo en curso', detail:'Estado de menor exposición en esta simulación.'};
}
function notify(message) {
  const el = $('#toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => el.classList.remove('show'), 3700);
}
function header(title, subtitle, kicker='NoiseGuard UX') {
  return `<div class="page-head"><div class="kicker">${safe(kicker)}</div><h1 tabindex="-1">${safe(title)}</h1><p>${safe(subtitle)}</p></div>`;
}
function linkButton(label, view, kind='outline') { return `<button class="btn btn-${kind}" type="button" data-view="${view}">${label}</button>`; }
function badgeForRisk(v) {const r=risk(v);return `<span class="pill ${r.color==='red'?'risk':r.color==='amber'?'warn':'good'}">${r.label}</span>`;}
function monitorCard(db = state.currentDb, extra = '') {
  const r=risk(db); const left=Math.round(Math.min(95,Math.max(8,(db-55)*2.3)));
  return `<section class="monitor-card level-${r.color}" style="--cursor:${left}%" aria-label="Nivel ilustrativo ${db} decibelios; ${r.label}">
    <div class="grid-head"><span class="eyebrow"><span class="status-dot"></span>${r.label}</span><span class="pill demo">SIMULACIÓN</span></div>
    <div class="value-large">${db} <small>dB</small></div>
    <div class="monitor-meta"><span>${extra || 'Ejemplo visual de exposición'}</span><span>Dosis simulada: ${state.dose}%</span></div>
    <div class="meter" role="img" aria-label="Escala visual de verde, amarillo y rojo"><span class="green"></span><span class="yellow"></span><span class="red"></span></div>
    <p class="tiny" style="margin:0">${r.detail}</p>
  </section>`;
}
function home() {
  return header('Ensaya. Escucha. Cuídate.', 'Explora tu práctica con una vista más visual y directa.') +
  `<section class="card light-card hero-card home-landing"><div class="home-grid">
    <div class="home-copy"><h2>A tu ritmo</h2>
      <div class="home-badges"><span>Alertas visuales</span><span>Pausas</span><span>Historial</span></div>
      <div class="home-mini-grid">
        <article class="mini-panel"><strong>${safe(state.settings.instrument)}</strong><small>Instrumento</small></article>
        <article class="mini-panel"><strong>${safe(state.settings.room)}</strong><small>Espacio</small></article>
      </div>
      <button type="button" class="btn btn-primary btn-block" data-action="${state.active ? 'return-monitor':'start'}">${state.active?'Volver al monitoreo':'Comenzar'}</button>
      <div class="button-row">${linkButton('Mi historial','historial','quiet')}${linkButton('Guía auditiva','guia','quiet')}</div>
    </div>
    <div class="visual-gallery">
      <figure class="support-figure support-figure-main">
        <img src="IMAGENES/ensayo-musical.webp" width="1280" height="853" alt="Imagen ilustrativa de un músico ensayando con guitarra y observando un indicador visual de sonido en una tableta" fetchpriority="high" decoding="async">
        <figcaption>Ensayo personal con apoyo visual.</figcaption>
      </figure>
      <figure class="support-figure support-figure-soft compact-figure">
        <img src="IMAGENES/cuidado-auditivo.svg" width="640" height="430" alt="Ilustración de cuidado auditivo" loading="lazy" decoding="async">
        <figcaption>Cuidado auditivo y prevención.</figcaption>
      </figure>
    </div></div></section>
  <section class="card activity-overview"><div class="overview-copy"><div class="grid-head"><h2>Explora NoiseGuard UX</h2><span class="pill">Vista general</span></div>
  <p class="tiny">Un espacio con guía auditiva, alertas y modo docente.</p>
  <div class="button-row">${linkButton('Ver historial','historial')}${linkButton('Revisar alertas','alertas')}</div></div>
  <figure class="support-figure support-figure-soft compact-figure">
    <img src="IMAGENES/aula-musical.svg" width="680" height="440" alt="Ilustración de una clase musical" loading="lazy" decoding="async">
    <figcaption>Modo docente para ensayos grupales.</figcaption>
  </figure></section>`;
}
function monitor() {
  return header('Monitoreo en vivo', 'Avisos discretos y datos sencillos durante el ensayo.','Práctica personal') +
  monitorCard(state.currentDb, `${time(state.sessionSeconds)} de sesión · ${safe(state.settings.instrument)}`) +
  `<section class="card"><div class="metric-grid"><div class="metric"><span>Tiempo de ensayo</span><strong>${time(state.sessionSeconds)}</strong></div><div class="metric"><span>Pico simulado</span><strong>${state.peak} dB</strong></div><div class="metric"><span>Pausas</span><strong>${state.pauseCount}</strong></div></div>
  <div class="button-row"><button class="btn btn-primary" type="button" data-action="pause">Tomar un descanso</button>${linkButton('Ir al Modo Atril','atril')}<button class="btn btn-outline" type="button" data-action="end">Finalizar sesión</button></div>
  <p class="tiny">Para probar el semáforo, usa estos valores de muestra. Ninguno procede del micrófono.</p>
  <div class="button-row"><button class="btn btn-soft" type="button" data-action="sample-72">72 dB</button><button class="btn btn-soft" type="button" data-action="sample-86">86 dB</button><button class="btn btn-soft" type="button" data-action="sample-96">96 dB</button></div></section>`;
}
function atril() {
  return `<section class="atri-mode">${header(state.atriLocked?'Pantalla bloqueada':'Modo Atril','Indicador visible · Sin ventanas emergentes que oculten tu partitura','Ensayo sin distracciones')}
  ${monitorCard(state.currentDb, `${time(state.sessionSeconds)} · ${state.atriLocked?'Pantalla protegida':'Monitoreo activo'}`)}
  ${state.atriLocked?'<div class="staff-lines" aria-label="Área de partitura protegida">La pantalla está protegida contra toques accidentales.</div>':'<div class="staff-lines" aria-label="Espacio para la partitura">Espacio para tu partitura<br>Vista simplificada de lectura</div>'}
  <div class="button-row"><button type="button" class="btn btn-outline" data-action="lock">${state.atriLocked?'Desbloquear':'Bloquear pantalla'}</button><button type="button" class="btn btn-outline" data-action="pause">Tomar una pausa</button><button type="button" class="btn btn-primary" data-view="monitor">Salir de Modo Atril</button></div></section>`;
}
function pauseScreen() {
  return header('Pausa auditiva','Un descanso guiado que puedes controlar a tu propio ritmo.','Cuidado auditivo') +
  `<section class="card"><h2>Tu pausa está activa</h2><p>El monitoreo de demostración está detenido temporalmente.</p>
  <div class="value-large" role="timer" aria-label="Tiempo restante">${time(state.pauseRemaining)}</div>
  <div class="progress" role="progressbar" aria-valuenow="${state.pauseRemaining}" aria-valuemin="0" aria-valuemax="${state.settings.breakSeconds}" aria-label="Pausa restante"><span style="width:${Math.round(state.pauseRemaining*100/state.settings.breakSeconds)}%"></span></div>
  <div class="button-row"><button class="btn btn-primary" type="button" data-action="resume">Retomar práctica</button><button class="btn btn-outline" type="button" data-action="postpone">Posponer un minuto</button></div></section>`;
}
function summary() {
  const s = state.selectedHistoryId ? state.history.find(x => x.id===state.selectedHistoryId) : state.lastSummary;
  if (!s) return header('Resumen del ensayo','Aún no tienes un resumen guardado.')+linkButton('Volver al inicio','inicio');
  return header('Resumen del ensayo','Revisa el tiempo, los descansos y los valores ilustrativos de tu sesión.') +
  `<div class="metric-grid"><div class="metric"><span>Duración</span><strong>${time(s.duration)}</strong></div><div class="metric"><span>Promedio demo</span><strong>${s.average} dB</strong></div><div class="metric"><span>Máximo demo</span><strong>${s.peak} dB</strong></div></div>
  <section class="card"><h2>Resumen y bienestar</h2><p>${safe(s.instrument)} · ${safe(s.room)} · ${dateLabel(s.date)}</p><p>Realizaste <strong>${s.pauses}</strong> pausas. ${s.pauses?'Reconocer momentos de descanso ayuda a revisar tus hábitos.':'Puedes incorporar pausas preventivas en las próximas prácticas.'}</p><div class="alert-tone">Los datos de este resumen son simulados, sin medición acústica real.</div><div class="button-row">${linkButton('Ver historial','historial')}${linkButton('Volver al inicio','inicio','primary')}<button class="btn btn-outline" type="button" data-action="print">Imprimir resumen</button></div></section>`;
}
function alertView() {
  let items=state.alerts;
  if(state.filter==='importantes') items=items.filter(x=>x.important);
  if(state.filter==='leidas') items=items.filter(x=>x.read);
  return header('Centro de alertas','Consulta avisos de exposición sin notificaciones sonoras.') +
  `<div class="tabs" role="group" aria-label="Filtrar avisos">${[['todos','Todos'],['importantes','Importantes'],['leidas','Leídas']].map(([v,t])=>`<button type="button" class="tab ${state.filter===v?'active':''}" data-filter="${v}" aria-pressed="${state.filter===v}">${t}</button>`).join('')}</div>
  ${items.length?`<section class="card list-rows">${items.map(a=>`<div class="list-row"><div><strong>${safe(a.title)} ${!a.read?'<span class="pill warn">Nueva</span>':''}</strong><small>${dateLabel(a.date)} · ${safe(a.detail)}</small></div><button type="button" class="btn btn-outline" data-action="read-alert" data-id="${a.id}">${a.read?'Leída':'Marcar leída'}</button></div>`).join('')}</section>`:
  `<div class="empty"><h3>No hay avisos en este filtro</h3><p>Durante un ensayo de demostración puedes generar una alerta de ejemplo.</p></div>`}
  <div class="button-row">${linkButton('Ir al inicio','inicio')}${state.active?linkButton('Volver al monitoreo','monitor','primary'):''}</div>`;
}
function historyView() {
  return header('Tu historial','Consulta sesiones y reconoce tus hábitos de práctica.') +
  `${state.history.length?`<section class="card"><div class="grid-head"><h2>Sesiones registradas</h2><span class="pill">${state.history.length} sesiones</span></div><div class="list-rows">${state.history.map(s=>`<button class="list-row" type="button" data-action="show-session" data-id="${s.id}"><span><strong>${dateLabel(s.date)}</strong><small>${safe(s.instrument)} · ${time(s.duration)} · ${s.pauses} pausas</small></span><span class="row-right"><strong>${s.peak} dB</strong><small>Máximo demo</small></span></button>`).join('')}</div><div class="button-row"><button type="button" class="btn btn-outline" data-action="export">Exportar CSV</button><button type="button" class="btn btn-outline" data-action="clear">Borrar historial</button></div></section>`:
  `<div class="empty"><h3>Aún no hay sesiones</h3><p>Cuando finalices una práctica de demostración, aparecerá aquí su resumen.</p><button class="btn btn-primary" type="button" data-action="quick-start">Iniciar mi primera práctica</button></div>`}
  <section class="card"><h2>Tu actividad semanal</h2><p class="tiny">Visualización ilustrativa de actividad. Se actualiza con las sesiones guardadas en este navegador.</p>${chart()}</section>`;
}
function chart() {
  const days=['L','M','M','J','V','S','D'];
  const totals=Array(7).fill(0);
  state.history.forEach(s=>{const day=(new Date(s.date).getDay()+6)%7;totals[day]+=s.duration;});
  const max=Math.max(1,...totals);
  return `<div class="chart-bars" role="img" aria-label="Duración total de sesiones por día, de lunes a domingo">${days.map((d,i)=>`<div class="chart-col"><i style="--bar-height:${Math.max(6,Math.round(totals[i]/max*120))}px"></i><span>${d}</span></div>`).join('')}</div>`;
}
function guide() {
  return header('Guía de audición','Información básica para reconocer situaciones de exposición y adoptar hábitos preventivos.') +
  `<section class="card illustrated-panel" aria-label="Cuidado auditivo durante la práctica musical">
    <figure class="support-figure support-figure-soft">
      <img src="IMAGENES/cuidado-auditivo.svg" width="640" height="430" alt="Ilustración de un oído con ondas de sonido y un escudo de protección" loading="lazy" decoding="async">
    </figure>
    <div><span class="eyebrow">CUIDADO AUDITIVO</span><h2>Reconoce señales y toma pausas</h2><p>Las ayudas visuales del prototipo buscan acompañar la práctica musical sin interrumpirla. Esta sección resume ideas preventivas y recuerda que los datos mostrados son demostrativos.</p></div>
  </section>
  <section class="card"><h2>Conoce los indicadores</h2><p>En NoiseGuard UX, el semáforo combina color, texto y cifra. Los ejemplos de 72, 86 y 96 dB sirven para probar cómo se verían tres estados.</p>
  <div class="stack"><div class="alert-tone level-green"><strong>Verde · Menor exposición</strong>Mensaje visual sencillo durante la práctica.</div><div class="alert-tone level-amber"><strong>Ámbar · Atención</strong>Revisar el volumen y considerar una pausa.</div><div class="alert-tone level-red"><strong>Rojo · Exposición elevada</strong>Reducir la exposición y descansar.</div></div></section>
  <section class="card"><h2>Aprende a cuidar tu audición</h2>
    <details class="faq"><summary>¿Qué es la exposición sonora?</summary><p>Es la combinación de intensidad y duración del sonido al que una persona está expuesta. Para valorarla de verdad se necesita medición adecuada, no solo el aspecto de una pantalla.</p></details>
    <details class="faq"><summary>¿Qué hago si siento zumbidos o molestias?</summary><p>Reduce la exposición al sonido. Si los síntomas persisten o te preocupan, busca orientación de un profesional de salud. Esta aplicación no diagnostica problemas auditivos.</p></details>
    <details class="faq"><summary>¿Por qué conviene hacer descansos?</summary><p>Los descansos ayudan a interrumpir exposiciones continuas y a prestar atención a las señales de fatiga. La duración apropiada depende de la situación y no puede determinarse aquí con datos simulados.</p></details>
    <details class="faq"><summary>¿La aplicación graba mis conversaciones?</summary><p>No. Este prototipo no solicita acceso al micrófono: sus valores son de ejemplo y solo guarda preferencias e historial de demostración en el almacenamiento local del navegador.</p></details>
  </section>`;
}
function teacher() {
  return header('Modo docente','Un vistazo al entorno de clase, sin interrumpir la enseñanza.','Aula de música')+
  `<section class="card illustrated-panel" aria-label="Ensayo grupal en el aula de música">
    <figure class="support-figure support-figure-soft">
      <img src="IMAGENES/aula-musical.svg" width="680" height="440" alt="Ilustración de una docente, estudiantes e instrumentos en un aula de música" loading="lazy" decoding="async">
    </figure>
    <div><span class="eyebrow">PRÁCTICA EN GRUPO</span><h2>Un aula que cuida la escucha</h2><p>La información visual puede ayudar a organizar los ensayos y conversar sobre pausas sin interrumpir la clase. La imagen es ilustrativa y acompaña la propuesta del modo docente.</p></div>
  </section>
  <section class="card"><div class="grid-head"><h2>Clase grupal · Demostración</h2><span class="pill demo">SIMULACIÓN</span></div><p>Los valores presentados a continuación son ejemplos para recorrer el diseño del modo docente.</p><div class="metric-grid"><div class="metric"><span>Lectura ilustrativa</span><strong>78 dB</strong></div><div class="metric"><span>Sesión de clase</span><strong>45 min</strong></div><div class="metric"><span>Pico ilustrativo</span><strong>86 dB</strong></div></div><div class="button-row">${linkButton('Ver guía auditiva','guia')}${linkButton('Volver al inicio','inicio','primary')}</div></section>
  <section class="card"><h2>Resumen del aula</h2><p>En el prototipo se contempla un resumen de dosis y picos al cerrar la clase (HU-014). Esta versión muestra la estructura visual, sin medición ni seguimiento real de estudiantes.</p></section>`;
}
function savings() {
  return header('Ahorro de batería','Una vista simplificada para sesiones largas.','Preferencias')+
  `<section class="card"><h2>Modo de bajo consumo</h2><p>Reduce los efectos visuales del prototipo. No modifica el funcionamiento del hardware ni la batería del equipo.</p>
  ${switchRow('lowPower','Activar vista de bajo consumo','Deshabilita animaciones y transiciones visuales.')}
  <div class="button-row">${state.active?linkButton('Volver al ensayo','monitor','primary'):linkButton('Ir al inicio','inicio','primary')}</div></section>`;
}
function switchRow(key,label,description) {
  return `<label class="setting-row"><span><strong>${safe(label)}</strong><small>${safe(description)}</small></span><input class="switch" type="checkbox" data-setting="${key}" aria-label="${safe(label)}" ${state.settings[key]?'checked':''}></label>`;
}
function settingsView() {
  return header('Ajustes','Adapta tu espacio de práctica y los avisos a tus preferencias.') +
  `<section class="card"><h2>Instrumentos y recinto</h2><label for="instrument">Perfil de instrumento</label>
  <select id="instrument" class="select" data-setting="instrument">${['Guitarra','Batería','Bajo','Piano','Voz','Otro'].map(v=>`<option value="${v}" ${state.settings.instrument===v?'selected':''}>${v}</option>`).join('')}</select>
  <label for="room">Lugar habitual</label><input id="room" class="input" type="text" data-setting="room" maxlength="65" value="${safe(state.settings.room)}">
  <label for="duration">Duración de pausa de demostración</label><select id="duration" class="select" data-setting="breakSeconds">${[[60,'1 minuto'],[120,'2 minutos'],[300,'5 minutos']].map(([value,label])=>`<option value="${value}" ${state.settings.breakSeconds===value?'selected':''}>${label}</option>`).join('')}</select></section>
  <section class="card"><h2>Calibración y avisos</h2><div class="alert-tone">La calibración acústica real requiere dispositivos y procedimientos específicos. Este prototipo no calibra el micrófono.</div>
  ${switchRow('notice','Alertas visuales','Mostrar avisos de atención y exposición elevada.')}
  ${switchRow('reminders','Recordatorios de descanso','Mostrar un aviso preventivo al avanzar la práctica.')}</section>
  <section class="card"><h2>Accesibilidad y pantalla</h2>${switchRow('highContrast','Alto contraste','Mejorar el contraste de textos y bordes.')}${switchRow('lowPower','Bajo consumo visual','Reducir animaciones y transiciones.')}
  <div class="button-row">${linkButton('Privacidad y datos','privacidad')}${linkButton('Guía auditiva','guia')}</div></section>`;
}
function privacy() {
  return header('Privacidad y datos','Información transparente sobre este prototipo.')+
  `<section class="card"><h2>¿Qué datos utiliza NoiseGuard UX?</h2><p>Esta implementación académica <strong>no accede al micrófono</strong>, no graba voces ni sonidos y no envía registros a un servidor. Los números que ves en las pantallas son ilustrativos.</p><p>Si realizas sesiones de prueba, se guarda su duración simulada, valores de ejemplo, pausas y preferencias en <strong>localStorage</strong> de este navegador para mostrar un historial.</p><p>Una futura medición sonora real requeriría autorización explícita, calibración, validación y avisos de privacidad específicos.</p><div class="button-row">${linkButton('Volver a Ajustes','ajustes','primary')}<button class="btn btn-outline" type="button" data-action="clear">Eliminar registros locales</button></div></section>`;
}
function render() {
  const pages={inicio:home,monitor,atril,pausa:pauseScreen,resumen:summary,alertas:alertView,historial:historyView,guia:guide,docente:teacher,ahorro:savings,ajustes:settingsView,privacidad:privacy};
  if(!pages[state.view])state.view='inicio';
  screen.innerHTML=pages[state.view]();
  const navView=['monitor','atril','pausa','resumen'].includes(state.view)?'inicio':state.view;
  document.querySelectorAll('[data-view]').forEach(button=>{
    const match=button.dataset.view===navView;
    if(button.classList.contains('nav-link')||button.classList.contains('mobile-link')){
      button.classList.toggle('is-active',match);
      if(match)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
    }
  });
  const unread=state.alerts.filter(a=>!a.read).length;
  const counter=$('#alert-count');counter.textContent=unread;counter.hidden=!unread;
  document.body.classList.toggle('high-contrast',state.settings.highContrast);
  document.body.classList.toggle('low-power',state.settings.lowPower);
}
function navigate(view) {
  state.view=view; if(view!=='resumen')state.selectedHistoryId=null;
  render(); window.scrollTo({top:0,behavior:state.settings.lowPower?'auto':'smooth'});
}
function startSession() {
  if(state.active){navigate('monitor');return;}
  Object.assign(state,{active:true,paused:false,sessionSeconds:0,pauseCount:0,pauseRemaining:0,samples:[72],peak:72,currentDb:72,dose:0,lastAlertAt:-100,demoStep:0,atriLocked:false});
  navigate('monitor');notify('Práctica de demostración iniciada. No se utiliza el micrófono.');
}
function sample(db) {
  if(!state.active || state.paused)return;
  state.currentDb=db;state.peak=Math.max(state.peak,db);state.samples.push(db);
  state.dose=Math.min(100,Math.round(state.dose+(db>=95?3:db>=80?1:0)));
  if(db>=80 && state.settings.notice && state.sessionSeconds-state.lastAlertAt>=15){
    const item={id:`a-${Date.now()}-${Math.round(Math.random()*1000)}`,date:new Date().toISOString(),title:risk(db).label,detail:`Valor ilustrativo: ${db} dB`,important:db>=95,read:false};
    state.alerts.unshift(item);state.lastAlertAt=state.sessionSeconds;save();notify(`Aviso visual: ${risk(db).label.toLowerCase()}`);
  }
  if(state.view==='monitor'||state.view==='atril')render();
}
function pauseSession() {
  if(!state.active){notify('Primero inicia un ensayo de demostración.');return;}
  if(!state.paused){state.paused=true;state.pauseRemaining=state.settings.breakSeconds;state.pauseCount++;}
  navigate('pausa');
}
function resume() {if(!state.active)return navigate('inicio');state.paused=false;state.pauseRemaining=0;navigate('monitor');notify('Práctica retomada.');}
function finish() {
  if(!state.active){notify('No hay sesión en curso.');return;}
  if(!window.confirm('¿Finalizar la sesión y guardar el resumen de demostración?'))return;
  const average=Math.round(state.samples.reduce((a,b)=>a+b,0)/(state.samples.length||1));
  const result={id:`s-${Date.now()}`,date:new Date().toISOString(),duration:state.sessionSeconds,average,peak:state.peak,pauses:state.pauseCount,instrument:state.settings.instrument,room:state.settings.room};
  state.history.unshift(result);state.lastSummary=result;state.active=false;state.paused=false;state.selectedHistoryId=null;save();navigate('resumen');notify('Resumen de demostración guardado.');
}
function downloadHistory() {
  if(!state.history.length)return notify('Todavía no hay sesiones para exportar.');
  const rows=[['fecha','duracion_segundos','promedio_demo_db','pico_demo_db','pausas','instrumento','espacio'],...state.history.map(s=>[s.date,s.duration,s.average,s.peak,s.pauses,s.instrument,s.room])];
  const csv='\uFEFF'+rows.map(row=>row.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='NoiseGuard_UX_historial_demo.csv';document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);notify('Archivo CSV generado.');
}
function actionHandler(action,id) {
  if(action==='quick-start'||action==='start')return startSession();
  if(action==='return-monitor')return navigate('monitor');
  if(action==='pause')return pauseSession();
  if(action==='resume')return resume();
  if(action==='postpone'){state.pauseRemaining+=60;render();return notify('Pausa extendida un minuto.');}
  if(action==='end')return finish();
  if(action==='lock'){state.atriLocked=!state.atriLocked;render();return;}
  if(action.startsWith('sample-'))return sample(Number(action.split('-')[1]));
  if(action==='show-session'){state.selectedHistoryId=id;return navigate('resumen');}
  if(action==='read-alert'){const a=state.alerts.find(x=>x.id===id);if(a){a.read=true;save();render();}return;}
  if(action==='print')return window.print();
  if(action==='export')return downloadHistory();
  if(action==='clear'){
    if(window.confirm('¿Eliminar el historial y las alertas de demostración de este navegador?')){
      state.history=[];state.alerts=[];save();render();notify('Datos de demostración eliminados.');
    }return;
  }
}
document.addEventListener('click',e=>{
  const target=e.target.closest('[data-action], [data-view], [data-filter]');
  if(!target)return;
  if(target.dataset.action){e.preventDefault();actionHandler(target.dataset.action,target.dataset.id);return;}
  if(target.dataset.filter){state.filter=target.dataset.filter;render();return;}
  if(target.dataset.view){navigate(target.dataset.view);}
});
document.addEventListener('change',e=>{
  const input=e.target.closest('[data-setting]');if(!input)return;
  const key=input.dataset.setting;
  if(!(key in state.settings))return;
  let value=input.type==='checkbox'?input.checked:input.value;
  if(key==='breakSeconds')value=Number(value);
  state.settings[key]=value;save();render();notify('Preferencias guardadas en este navegador.');
});
// Solo cronómetro y valores de demostración; no se solicita audio al navegador.
setInterval(()=>{
  if(!state.active)return;
  if(state.paused){state.pauseRemaining=Math.max(0,state.pauseRemaining-1);if(!state.pauseRemaining)return resume();if(state.view==='pausa')render();return;}
  state.sessionSeconds++;
  if(state.sessionSeconds%8===0){
    const sequence=[72,74,86,76,72,96,83,72];
    state.demoStep=(state.demoStep+1)%sequence.length;
    sample(sequence[state.demoStep]);
  }
  if(state.settings.reminders && state.sessionSeconds===120)notify('Recordatorio visual: considera una pausa cuando lo necesites.');
  if(state.view==='monitor'||state.view==='atril')render();
},1000);
render();
