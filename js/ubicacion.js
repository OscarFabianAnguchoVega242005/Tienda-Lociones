/* ============================================================
   LA VICTORIA · PERFUMERÍA — ubicación (ubicacion.html)
   Dirección, horario y enlace de Google Maps desde la tabla
   settings (editables en /admin.html).
   ============================================================ */
(function(){
'use strict';
var $=function(i){return document.getElementById(i)};

var sb=null;
try{if(window.supabase&&CFG.SUPABASE_URL&&CFG.SUPABASE_URL.indexOf('TU-PROYECTO')<0)sb=window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})}catch(e){}

if(!sb){$('lAddr').textContent='No se pudo conectar con la base de datos.';return}

sb.from('settings').select('key,value').then(function(r){
  if(r.error||!r.data){$('lAddr').textContent='No se pudo cargar la información.';return}
  var s={};r.data.forEach(function(x){s[x.key]=x.value});

  $('lAddr').textContent=s.addr||'Dirección no configurada';
  $('lHrs').textContent=s.hrs||'';
  if(s.map&&/^https?:\/\//.test(s.map)){
    var m=$('lMap');
    m.href=s.map;
    m.setAttribute('aria-disabled','false');
  }
  if(s.footer_year||s.footer_text){
    $('pie').textContent='© '+(s.footer_year||new Date().getFullYear())+' '+(s.footer_text||'La Victoria · Todos los derechos reservados');
  }
});
})();
