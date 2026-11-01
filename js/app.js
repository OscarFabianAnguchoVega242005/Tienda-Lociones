/* ============================================================
   LA VICTORIA · PERFUMERÍA — tienda (index.html)
   Catálogo desde Supabase (tabla products), carrito en
   localStorage, pedidos por WhatsApp.
   ============================================================ */
(function(){
'use strict';
var $=function(i){return document.getElementById(i)};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var fmt=function(n){return n>0?'$'+Number(n).toLocaleString('es-CO'):'Consultar'};

var CART_KEY='lv_cart_v1';
var P=[], filtroCat='todos', q='';

var S={wa:(function(w){w=String(CFG.WHATSAPP||'').replace(/\D/g,'');return /^\d{10,15}$/.test(w)?w:''})(),
        ship:0,addr:'',hrs:'',map:'#',notice:[],ft:''};

var sb=null;
try{if(window.supabase&&CFG.SUPABASE_URL&&CFG.SUPABASE_URL.indexOf('TU-PROYECTO')<0)sb=window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})}catch(e){}

/* ---------- carrito (localStorage) ---------- */
function getCart(){try{return JSON.parse(localStorage.getItem(CART_KEY))||[]}catch(e){return[]}}
function setCart(c){localStorage.setItem(CART_KEY,JSON.stringify(c));paintCount()}
function cartCount(){return getCart().reduce(function(t,x){return t+x.q},0)}
function paintCount(){var el=$('cartCount');if(el)el.textContent=cartCount()}

function addToCart(p){
  var c=getCart(), hit=c.filter(function(x){return x.id==p.id})[0];
  if(hit)hit.q++;else c.push({id:p.id,name:p.name,brand:p.brand,price:p.price,ml:p.ml,img:p.img||'',q:1});
  setCart(c);
  toast('Agregado al carrito');
}

function toast(m){
  var t=$('toast');if(!t)return;
  t.textContent=m;t.classList.add('on');
  clearTimeout(toast.h);toast.h=setTimeout(function(){t.classList.remove('on')},1800);
}

/* ---------- render ---------- */
function bottle(s){
  return '<div class="bottle" style="--s:'+s+'px" aria-hidden="true"><div class="c"></div><div class="b"></div></div>';
}

function render(){
  var box=$('contenedorProductos');
  var vis=P.filter(function(x){
    var okCat=filtroCat==='todos'||x.category===filtroCat;
    var okQ=!q||((x.name+' '+(x.brand||'')).toLowerCase().indexOf(q)>-1);
    return okCat&&okQ;
  });
  if(!vis.length){box.innerHTML='<div class="loading-container"><p>No se encontraron productos.</p></div>';return}
  box.innerHTML=vis.map(function(x,i){
    var precio=x.price>0?'<div class="item-precio">'+fmt(x.price)+'</div>':'<div class="item-precio consultar">Consultar precio</div>';
    var media=x.img
      ? '<img src="'+esc(x.img)+'" alt="'+esc(x.name)+'" loading="lazy">'
      : bottle(110);
    return '<article class="item" style="animation:up .6s '+(i*0.03)+'s both">'
      +'<div class="item-image-wrapper'+(x.img?'':' oscuro')+'">'+media+'</div>'
      +'<div class="item-content">'
        +'<div class="item-marca">'+esc(x.brand||x.category)+' · '+esc(x.ml)+'</div>'
        +'<h2>'+esc(x.name)+'</h2>'
        +precio
        +'<button class="btn-agregar" data-add="'+x.id+'">🛒 Agregar al carrito</button>'
      +'</div></article>';
  }).join('');
}

function paintFiltros(){
  var btns=document.querySelectorAll('.filtro-btn');
  Array.prototype.forEach.call(btns,function(b){
    b.classList.toggle('active',b.dataset.cat===filtroCat);
  });
}

/* ---------- settings (ticker + pie) ---------- */
function applySettings(){
  var n=S.notice, tick=$('novedades');
  if(n.length&&tick)tick.innerHTML=n.concat(n).map(function(t){return '<span>✦ '+esc(t)+'</span>'}).join('');
  var pie=$('pie');
  if(S.ft&&pie)pie.textContent=S.ft;
}

function loadSettings(){
  if(!sb)return;
  sb.from('settings').select('key,value').then(function(r){
    if(r.error||!r.data)return;
    var s={};r.data.forEach(function(x){s[x.key]=x.value});
    S.ship=parseInt(s.ship,10)||0;S.addr=s.addr||'';S.hrs=s.hrs||'';S.map=s.map||'#';
    S.notice=String(s.notice||'').split('\n').map(function(t){return t.trim()}).filter(Boolean);
    S.ft=(s.footer_year||s.footer_text)?'© '+(s.footer_year||new Date().getFullYear())+' '+(s.footer_text||'La Victoria · Todos los derechos reservados'):'';
    applySettings();
    // Guardar datos que el carrito necesita (envío / dirección)
    try{localStorage.setItem('lv_store_cfg',JSON.stringify({wa:S.wa,ship:S.ship,addr:S.addr,ft:S.ft}))}catch(e){}
  });
}

/* ---------- productos ---------- */
function loadProducts(){
  if(!sb){$('contenedorProductos').innerHTML='<div class="loading-container"><p>No se pudo conectar con la base de datos.</p></div>';return}
  sb.from('products').select('id,n:name,b:brand,i:image_url,c:category,p:price,ml').eq('active',true).order('id').then(function(r){
    if(r.error){$('contenedorProductos').innerHTML='<div class="loading-container"><p>No se pudo cargar el catálogo.</p></div>';return}
    P=(r.data||[]).map(function(x){return {id:x.id,name:x.n,brand:x.b,img:x.i,category:x.c,price:x.p||0,ml:x.ml||'100 ml'}});
    render();
  });
}

/* ---------- soporte WhatsApp ---------- */
function abrirSoporte(){$('modalSoporte').classList.add('active')}
function cerrarSoporte(){$('modalSoporte').classList.remove('active')}
function enviarSoporte(){
  var msg=$('mensajeSoporte').value.trim();
  if(!msg){toast('Escribe tu pregunta');return}
  if(!S.wa){toast('WhatsApp no configurado');return}
  var texto=encodeURIComponent('¡Hola! Tengo una consulta desde la web de La Victoria Perfumería:\n\n"'+msg+'"');
  window.open('https://wa.me/'+S.wa+'?text='+texto,'_blank');
  $('mensajeSoporte').value='';cerrarSoporte();
}

/* ---------- eventos ---------- */
document.addEventListener('click',function(e){
  var add=e.target.closest('[data-add]');
  if(add){
    var p=P.filter(function(x){return x.id==add.dataset.add})[0];
    if(p)addToCart(p);
    return;
  }
  var fb=e.target.closest('.filtro-btn');
  if(fb){filtroCat=fb.dataset.cat;paintFiltros();render();return}
  if(e.target.id==='btnSoporte'||e.target.closest('.soporte-btn')){abrirSoporte();return}
  if(e.target.id==='cerrarSoporte'||e.target.id==='modalSoporte'){cerrarSoporte();return}
  if(e.target.id==='enviarSoporte'){enviarSoporte();return}
});
document.addEventListener('keydown',function(e){if(e.key==='Escape')cerrarSoporte()});
var sq=$('buscador');
if(sq)sq.addEventListener('input',function(){q=this.value.trim().toLowerCase();render()});

paintCount();
loadProducts();
loadSettings();
})();
