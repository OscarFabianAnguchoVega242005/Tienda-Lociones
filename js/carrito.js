/* ============================================================
   LA VICTORIA · PERFUMERÍA — carrito (carrito.html)
   Lee el carrito de localStorage (lv_cart_v1), permite
   seleccionar, cantidades y confirma el pedido por WhatsApp
   (y lo registra en la tabla orders).
   ============================================================ */
(function(){
'use strict';
var $=function(i){return document.getElementById(i)};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var money=function(n){return n>0?'$'+Number(n).toLocaleString('es-CO'):'Consultar'};

var CART_KEY='lv_cart_v1', CFG_KEY='lv_store_cfg';
var carrito=[], sel={}, modo='home', addr='';

var S={wa:'',ship:0,addr:'',ft:''};
try{var c=JSON.parse(localStorage.getItem(CFG_KEY));if(c)S=c}catch(e){}

var sb=null;
try{if(window.supabase&&CFG.SUPABASE_URL&&CFG.SUPABASE_URL.indexOf('TU-PROYECTO')<0)sb=window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})}catch(e){}

function getCart(){try{return JSON.parse(localStorage.getItem(CART_KEY))||[]}catch(e){return[]}}
function setCart(c){localStorage.setItem(CART_KEY,JSON.stringify(c))}

function toast(m){
  var t=$('toast');if(!t)return;
  t.textContent=m;t.classList.add('on');
  clearTimeout(toast.h);toast.h=setTimeout(function(){t.classList.remove('on')},1800);
}

function selItems(){return carrito.filter(function(x){return sel[x.id]})}
function subtotal(){return selItems().reduce(function(t,x){return t+x.price*x.q},0)}

/* ---------- render ---------- */
function bottle(s){
  return '<div class="bottle" style="--s:'+s+'px" aria-hidden="true"><div class="c"></div><div class="b"></div></div>';
}

function render(){
  var lista=$('listaCarrito'), header=$('carritoHeader'), totalDiv=$('total-carrito');

  if(!carrito.length){
    header.hidden=true;
    lista.innerHTML='<div class="carrito-vacio">'
      +'<div class="carrito-vacio-icon">🧴</div>'
      +'<h3>Tu carrito está vacío</h3>'
      +'<p>¡Agrega perfumes desde nuestra tienda!</p>'
      +'<a href="index.html" class="btn-seguir">← Seguir comprando</a>'
      +'</div>';
    totalDiv.innerHTML='<span class="sin-seleccion">Tu carrito está vacío</span>';
    $('btnContinuar').disabled=true;
    return;
  }

  header.hidden=false;
  lista.innerHTML=carrito.map(function(x){
    var media=x.img
      ? '<img src="'+esc(x.img)+'" alt="'+esc(x.name)+'" class="producto-imagen" loading="lazy">'
      : '<div class="producto-img-fallback">'+bottle(46)+'</div>';
    var precio=x.price>0
      ? '<span class="precio-final">'+money(x.price*x.q)+'</span>'
      : '<span class="precio-consultar">Consultar precio</span>';
    return '<div class="producto" data-id="'+x.id+'">'
      +media
      +'<div class="producto-info">'
        +'<div class="nombre">'+esc(x.name)+'</div>'
        +'<div class="marca">'+esc(x.brand||'')+(x.ml?' · '+esc(x.ml):'')+'</div>'
        +'<div class="producto-precio">'+precio+'</div>'
        +'<div class="producto-acciones">'
          +'<input type="checkbox" class="producto-check" data-sel="'+x.id+'" '+(sel[x.id]?'checked':'')+'>'
          +'<span class="chk-label">Seleccionar</span>'
          +'<input type="number" min="1" max="99" value="'+x.q+'" data-qty="'+x.id+'" aria-label="Cantidad">'
          +'<button class="btn-eliminar" data-del="'+x.id+'">❌ Eliminar</button>'
        +'</div>'
      +'</div></div>';
  }).join('');

  var n=selItems().length, sub=subtotal();
  $('selectTodo').checked=(n>0&&n===carrito.length);
  totalDiv.innerHTML=n>0
    ? '<div class="resumen-envio">Subtotal ('+n+' perfume'+(n>1?'s':'')+'): <strong>'+money(sub)+'</strong></div>'
      +'<div class="resumen-envio">Envío: se calcula al elegir la entrega</div>'
      +'<div style="font-size:1.2rem;margin-top:.5rem">Total: <strong style="color:var(--gold)">'+money(sub)+'</strong></div>'
    : '<span class="sin-seleccion">Selecciona productos para ver el total</span>';
  $('btnContinuar').disabled=(n===0);
}

/* ---------- modal ---------- */
function abrirModal(){
  var items=selItems();
  if(!items.length){toast('Selecciona al menos un perfume');return}

  $('productosSeleccionados').innerHTML=items.map(function(x){
    var lbl=x.price>0?money(x.price*x.q):'Consultar';
    return '<div class="producto-resumen"><span>'+esc(x.name)+' × '+x.q+'</span><span>'+lbl+'</span></div>';
  }).join('');

  $('direccionLocal').textContent=S.addr||'—';
  $('costoEnvio').textContent=S.ship>0?money(S.ship)+' · Entrega en 1–2 días':'Gratis';
  $('direccion-entrega').value=addr;

  $('modal-compra').classList.add('active');
  actualizarEntrega();
}

function cerrarModal(){$('modal-compra').classList.remove('active')}

function actualizarEntrega(){
  modo=(document.querySelector('input[name="tipo-entrega"]:checked')||{}).value||'home';
  var campo=$('campo-direccion'), btn=$('btn-comprar-whatsapp'), sub=subtotal();
  var envio=modo==='home'?S.ship:0;

  campo.style.display=(modo==='home')?'block':'none';
  btn.disabled=(modo==='home')&&!addr.trim();

  $('envioValor').innerHTML=(modo==='pickup')
    ? '$0 (recoger en el local)'
    : (S.ship>0?money(S.ship):'<span class="envio-gratis">¡Gratis!</span>');
  $('totalValor').textContent=money(sub+envio);
}

/* ---------- pedido ---------- */
function mensajePedido(){
  var items=selItems(), sub=subtotal(), envio=modo==='home'?S.ship:0, tot=sub+envio;
  var msg='Hola, quiero hacer este pedido en La Victoria Perfumería:\n\n';
  items.forEach(function(x){
    var lbl=x.price>0?money(x.price*x.q):'Consultar precio';
    msg+='• '+x.q+' × '+x.name+(x.brand?' ('+x.brand+')':'')+' — '+lbl+'\n';
  });
  msg+='\nSubtotal: '+(sub>0?money(sub):'Consultar');
  msg+='\nEntrega: '+(modo==='home'?'Envío a domicilio':'Recoger en el local');
  if(modo==='home'){msg+='\nDirección: '+addr;msg+='\nEnvío: '+(S.ship>0?money(S.ship):'Gratis')}
  msg+='\nTotal: '+money(tot);
  return msg;
}

function guardarPedido(){
  if(!sb)return;
  var items=selItems(), sub=subtotal(), envio=modo==='home'?S.ship:0;
  sb.from('orders').insert({
    items:items.map(function(x){return {id:x.id,name:x.name,qty:x.q,price:x.price}}),
    subtotal:sub,shipping:envio,total:sub+envio,
    delivery:modo,address:modo==='home'?addr.trim():null
  }).then(function(){});
}

function comprar(){
  var items=selItems();
  if(!items.length)return;
  if(modo==='home'&&!addr.trim()){toast('Ingresa la dirección de entrega');return}
  if(!S.wa){toast('WhatsApp no configurado');return}

  guardarPedido();

  // Quitar del carrito lo comprado
  carrito=carrito.filter(function(x){return !sel[x.id]});
  sel={};
  setCart(carrito);

  window.open('https://wa.me/'+S.wa+'?text='+encodeURIComponent(mensajePedido()),'_blank');
  cerrarModal();
  render();
}

/* ---------- settings desde Supabase (respaldo) ---------- */
function loadSettings(){
  if(!sb)return;
  sb.from('settings').select('key,value').then(function(r){
    if(r.error||!r.data)return;
    var s={};r.data.forEach(function(x){s[x.key]=x.value});
    S.wa=(function(w){w=String(CFG.WHATSAPP||'').replace(/\D/g,'');return /^\d{10,15}$/.test(w)?w:''})();
    S.ship=parseInt(s.ship,10)||0;S.addr=s.addr||'';
    S.ft=(s.footer_year||s.footer_text)?'© '+(s.footer_year||new Date().getFullYear())+' '+(s.footer_text||'La Victoria · Todos los derechos reservados'):'';
    if(S.ft)$('pie').textContent=S.ft;
    try{localStorage.setItem(CFG_KEY,JSON.stringify(S))}catch(e){}
    if($('modal-compra').classList.contains('active'))actualizarEntrega();
  });
}

/* ---------- eventos ---------- */
document.addEventListener('click',function(e){
  var del=e.target.closest('[data-del]');
  if(del){
    var id=del.dataset.del;
    if(!confirm('¿Eliminar este perfume del carrito?'))return;
    carrito=carrito.filter(function(x){return String(x.id)!==String(id)});
    delete sel[id];
    setCart(carrito);render();
    return;
  }
  if(e.target.id==='btnVaciar'){
    if(!confirm('¿Vaciar todo el carrito?'))return;
    carrito=[];sel={};setCart(carrito);render();
    return;
  }
  if(e.target.id==='btnContinuar'){abrirModal();return}
  if(e.target.id==='cerrarModal'||e.target.id==='modal-compra'){cerrarModal();return}
  if(e.target.id==='btn-comprar-whatsapp'){comprar();return}
});

document.addEventListener('change',function(e){
  var t=e.target;
  if(t.id==='selectTodo'){
    carrito.forEach(function(x){sel[x.id]=t.checked});
    if(!t.checked)sel={};
    render();
    return;
  }
  if(t.dataset.sel!==undefined&&t.classList.contains('producto-check')){
    var id=t.dataset.sel;
    if(t.checked)sel[id]=true;else delete sel[id];
    render();
    return;
  }
  if(t.dataset.qty){
    var q=Math.max(1,Math.min(99,parseInt(t.value,10)||1));
    var it=carrito.filter(function(x){return String(x.id)===String(t.dataset.qty)})[0];
    if(it){it.q=q;setCart(carrito)}
    render();
    return;
  }
  if(t.name==='tipo-entrega'){actualizarEntrega();return}
});

document.addEventListener('input',function(e){
  if(e.target.id==='direccion-entrega'){
    addr=e.target.value;
    $('btn-comprar-whatsapp').disabled=!addr.trim();
  }
});

document.addEventListener('keydown',function(e){if(e.key==='Escape')cerrarModal()});

/* ---------- init ---------- */
S.wa=S.wa||(function(w){w=String(CFG.WHATSAPP||'').replace(/\D/g,'');return /^\d{10,15}$/.test(w)?w:''})();
carrito=getCart();
carrito.forEach(function(x){sel[x.id]=true}); // todo seleccionado por defecto
render();
loadSettings();
})();
