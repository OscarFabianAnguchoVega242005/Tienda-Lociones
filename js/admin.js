(function(){
var $=function(i){return document.getElementById(i)};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var money=function(n){return n>0?'$'+Number(n).toLocaleString('es-CO'):'Consultar'};
var BUCKET='products',ST=['nuevo','confirmado','entregado','cancelado'],sb,prods=[],editing=null,picked=null,mt;

function msg(t,bad){var m=$('msg');m.textContent=t;m.className=bad?'bad':'ok';clearTimeout(mt);mt=setTimeout(function(){m.textContent=''},4500)}

if(!window.supabase||!CFG.SUPABASE_URL||CFG.SUPABASE_URL.indexOf('TU-PROYECTO')>-1){
  $('login').hidden=false;$('lerr').textContent='Configura SUPABASE_URL y SUPABASE_ANON_KEY en config.js.';return;
}
sb=window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY);

/* ---------- sesion ---------- */
sb.auth.onAuthStateChange(function(_e,s){
  var u=s&&s.user,ok=u&&String(u.email||'').toLowerCase()===String(CFG.ADMIN_EMAIL).toLowerCase();
  if(u&&!ok){$('lerr').textContent='Esta cuenta no es la del administrador.';sb.auth.signOut();return}
  $('login').hidden=!!ok;$('app').hidden=!ok;
  if(ok)setTimeout(loadAll,0);
});
var mode='in';
$('lt').addEventListener('click',function(e){
  var m=e.target.dataset.m;if(!m)return;
  mode=m;$('lerr').textContent='';$('lb').textContent=m==='in'?'Entrar':'Crear cuenta';
  $('lp').autocomplete=m==='in'?'current-password':'new-password';
  Array.prototype.forEach.call($('lt').children,function(b){b.classList.toggle('on',b.dataset.m===m)});
});
$('lf').addEventListener('submit',function(e){
  e.preventDefault();var er=$('lerr');er.textContent='';er.className='bad';
  var em=$('le').value.trim(),pw=$('lp').value;
  if(mode==='in'){
    sb.auth.signInWithPassword({email:em,password:pw}).then(function(r){if(r.error)er.textContent='Correo o contraseña incorrectos.'});
    return;
  }
  if(em.toLowerCase()!==String(CFG.ADMIN_EMAIL).toLowerCase()){er.textContent='Solo se puede registrar el correo del administrador.';return}
  if(pw.length<8){er.textContent='La contraseña debe tener al menos 8 caracteres.';return}
  sb.auth.signUp({email:em,password:pw,options:{emailRedirectTo:location.origin+'/admin.html'}}).then(function(r){
    if(r.error){er.textContent=r.error.message;return}
    if(!r.data.session){er.className='ok';er.textContent='Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesion.'}
  });
});
$('out').onclick=function(){sb.auth.signOut()};
function loadAll(){loadProds();loadOrders();loadSet()}

/* ---------- pestanas ---------- */
$('tabs').addEventListener('click',function(e){
  var t=e.target.dataset.t;if(!t)return;
  ['prod','ord','set'].forEach(function(k){$('t-'+k).hidden=k!==t});
  Array.prototype.forEach.call($('tabs').children,function(b){b.classList.toggle('on',b.dataset.t===t)});
});

/* ---------- imagenes ---------- */
function shrink(f){
  return new Promise(function(res,rej){
    var img=new Image(),u=URL.createObjectURL(f);
    img.onload=function(){
      var s=Math.min(1,900/Math.max(img.width,img.height)),c=document.createElement('canvas');
      c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(u);
      c.toBlob(function(b){b?res(b):rej(new Error('No se pudo procesar la imagen.'))},'image/webp',.85);
    };
    img.onerror=function(){rej(new Error('La imagen no es valida.'))};
    img.src=u;
  });
}
async function upload(f){
  var blob=await shrink(f),path='p/'+Date.now()+'-'+Math.random().toString(36).slice(2,8)+'.webp';
  var r=await sb.storage.from(BUCKET).upload(path,blob,{contentType:'image/webp',cacheControl:'31536000'});
  if(r.error)throw r.error;
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
function rmImg(url){
  var p=String(url).split('/object/public/'+BUCKET+'/')[1];
  return p?sb.storage.from(BUCKET).remove([decodeURIComponent(p)]):Promise.resolve();
}

/* ---------- productos ---------- */
function loadProds(){
  return sb.from('products').select('*').order('id',{ascending:false}).then(function(r){
    if(r.error)return msg(r.error.message,1);
    prods=r.data;drawProds();
  });
}
function drawProds(){
  var q=$('pq').value.trim().toLowerCase();
  var rows=prods.filter(function(p){return !q||(p.name+' '+p.brand).toLowerCase().indexOf(q)>-1});
  $('plist').innerHTML=rows.length?rows.map(function(p){
    return '<div class="r"><div class="th">'+(p.image_url?'<img src="'+esc(p.image_url)+'" alt="" loading="lazy">':'')+'</div>'
     +'<div class="nm"><b>'+esc(p.name)+'</b><small>'+esc(p.brand)+' · '+esc(p.category)+' · '+esc(p.ml)+(p.active?'':' · oculto')+'</small></div>'
     +'<div class="pr">'+money(p.price)+'</div>'
     +'<div class="ac"><button class="lnk cap" data-e="'+p.id+'">Editar</button><button class="lnk cap dng" data-d="'+p.id+'">Eliminar</button></div></div>';
  }).join(''):'<div class="empty">Sin productos.</div>';
}
$('pq').oninput=drawProds;
$('plist').addEventListener('click',function(e){
  var b=e.target.closest('[data-e],[data-d]');if(!b)return;
  if(b.dataset.e)openForm(prods.find(function(x){return x.id==b.dataset.e}));
  else del(b.dataset.d);
});
$('new').onclick=function(){openForm(null)};

function prev(u){var i=$('fprev');if(u){i.src=u;i.hidden=false}else{i.removeAttribute('src');i.hidden=true}}
function openForm(p){
  editing=p||null;picked=null;
  $('ftitle').textContent=p?'Editar producto':'Nuevo producto';
  $('fn').value=p?p.name:'';$('fb').value=p?p.brand:'';$('fc').value=p?p.category:'Hombre';
  $('fp').value=p?p.price:0;$('fm').value=p?p.ml:'100 ml';$('fa').checked=p?p.active:true;
  $('fi').value='';$('frm').checked=false;prev(p&&p.image_url);
  $('pm').hidden=false;$('fn').focus();
}
function closeForm(){$('pm').hidden=true}
$('fc2').onclick=closeForm;
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeForm()});
$('fi').onchange=function(){
  var f=this.files[0];if(!f)return;
  if(!/^image\/(jpeg|png|webp)$/.test(f.type)){msg('Usa JPG, PNG o WEBP.',1);this.value='';return}
  picked=f;$('frm').checked=false;prev(URL.createObjectURL(f));
};
$('pf').addEventListener('submit',async function(e){
  e.preventDefault();var btn=$('fs'),fresh=null;btn.disabled=true;
  try{
    var rec={name:$('fn').value.trim(),brand:$('fb').value.trim(),category:$('fc').value,
      price:Math.max(0,parseInt($('fp').value,10)||0),ml:$('fm').value.trim()||'100 ml',active:$('fa').checked};
    if(!rec.name)throw new Error('Falta el nombre.');
    var old=editing&&editing.image_url,drop=null;
    if(picked){fresh=await upload(picked);rec.image_url=fresh;drop=old}
    else if($('frm').checked&&old){rec.image_url=null;drop=old}
    var r=editing?await sb.from('products').update(rec).eq('id',editing.id):await sb.from('products').insert(rec);
    if(r.error)throw r.error;
    if(drop)await rmImg(drop);
    closeForm();msg('Guardado.');loadProds();
  }catch(err){
    if(fresh)rmImg(fresh);
    msg(err.message||'No se pudo guardar.',1);
  }
  btn.disabled=false;
});
async function del(id){
  var p=prods.find(function(x){return x.id==id});
  if(!p||!confirm('¿Eliminar "'+p.name+'"? Esta accion no se puede deshacer.'))return;
  var r=await sb.from('products').delete().eq('id',id);
  if(r.error)return msg(r.error.message,1);
  if(p.image_url)await rmImg(p.image_url);
  msg('Eliminado.');loadProds();
}

/* ---------- pedidos ---------- */
function loadOrders(){
  sb.from('orders').select('*').order('id',{ascending:false}).limit(100).then(function(r){
    if(r.error)return msg(r.error.message,1);
    $('olist').innerHTML=r.data.length?r.data.map(function(o){
      var it=(o.items||[]).map(function(x){return esc(x.qty+' × '+x.name)}).join('<br>');
      return '<div class="o"><div><b>#'+o.id+'</b> · '+esc(new Date(o.created_at).toLocaleString('es-CO'))+'<br><small class="mute">'
        +(o.delivery==='home'?'Domicilio: '+esc(o.address):'Recoge en el local')+'</small></div><div>'+it+'</div>'
        +'<div><b>'+money(o.total)+'</b><select data-o="'+o.id+'">'+ST.map(function(s){return '<option'+(s===o.status?' selected':'')+'>'+s+'</option>'}).join('')+'</select></div></div>';
    }).join(''):'<div class="empty">Aun no hay pedidos.</div>';
  });
}
$('olist').addEventListener('change',function(e){
  var id=e.target.dataset.o;if(!id)return;
  sb.from('orders').update({status:e.target.value}).eq('id',id).then(function(r){r.error?msg(r.error.message,1):msg('Estado actualizado.')});
});

/* ---------- ajustes ---------- */
var F={ship:'ss',addr:'sa',hrs:'sh',map:'sm',notice:'sn',footer_year:'sy',footer_text:'st'};
function fp(){$('sprev').textContent='© '+$('sy').value+' '+$('st').value}
function loadSet(){
  sb.from('settings').select('key,value').then(function(r){
    if(r.error)return msg(r.error.message,1);
    var s={};(r.data||[]).forEach(function(x){s[x.key]=x.value});
    Object.keys(F).forEach(function(k){$(F[k]).value=s[k]!=null?s[k]:''});
    if(!$('sy').value)$('sy').value=new Date().getFullYear();
    fp();
  });
}
$('sy').oninput=fp;$('st').oninput=fp;
$('sny').onclick=function(){$('sy').value=new Date().getFullYear();fp()};
$('sf').addEventListener('submit',function(e){
  e.preventDefault();
  var rows=Object.keys(F).map(function(k){var v=$(F[k]).value.trim();return {key:k,value:v}});
  sb.from('settings').upsert(rows).then(function(r){r.error?msg(r.error.message,1):msg('Ajustes guardados.')});
});
})();