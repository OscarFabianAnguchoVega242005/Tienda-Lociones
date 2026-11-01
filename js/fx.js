/* fx.js · efectos ligeros de interfaz (no toca la lógica de la tienda) */
(function () {
  // 1) La barra superior se compacta y gana sombra al hacer scroll
  var bar = document.querySelector('.topbar');
  if (bar) {
    var onScroll = function () { bar.classList.toggle('scrolled', window.scrollY > 24); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // 2) El contador del carrito "salta" cada vez que cambia
  var cnt = document.getElementById('cartCount');
  if (cnt && 'MutationObserver' in window) {
    new MutationObserver(function () {
      cnt.classList.remove('pop');
      void cnt.offsetWidth;          // reinicia la animación
      cnt.classList.add('pop');
    }).observe(cnt, { childList: true, characterData: true, subtree: true });
  }
})();