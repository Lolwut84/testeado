/* ============================================================
   SCRIPT.JS
   Maneja toda la logica del carrusel de promociones:
     - Autoplay cada 5 segundos con loop infinito
     - Pausa al pasar el mouse encima (escritorio)
     - Swipe tactil (movil) y arrastre con mouse (escritorio)
     - Cambia de slide si el arrastre supera el 30% del ancho
     - Genera los puntitos indicadores automaticamente
     - El puntito correspondiente a la slide activa se activa solo
============================================================ */

(function () {

  /* ----------------------------------------------------------
     CONFIGURACION
     Modificar estos valores para ajustar el comportamiento
  ---------------------------------------------------------- */
  var INTERVALO_MS       = 5000;   /* Milisegundos entre cambios automaticos */
  var UMBRAL_PORCENTAJE  = 0.15;   /* Fraccion minima de arrastre para cambiar slide (0 a 1) */


  /* ----------------------------------------------------------
     REFERENCIAS AL DOM
  ---------------------------------------------------------- */
  var pista              = document.getElementById('carrusel-pista');
  var contenedorPuntitos = document.getElementById('carrusel-indicadores');

  /* Si los elementos no existen en la pagina, salir sin errores */
  if (!pista || !contenedorPuntitos) { return; }

  var diapositivas = pista.querySelectorAll('.carrusel-diapositiva');
  var total        = diapositivas.length;

  if (total === 0) { return; }


  /* ----------------------------------------------------------
     ESTADO INTERNO
  ---------------------------------------------------------- */
  var indiceActual   = 0;       /* Numero de la slide visible */
  var temporizador   = null;    /* ID del setInterval del autoplay */
  var pausado        = false;   /* true mientras el mouse esta encima */

  /* Variables de arrastre / swipe */
  var arrastrando         = false;
  var xInicio             = 0;  /* Posicion X donde empezo el gesto */
  var desplazamiento      = 0;  /* Pixeles movidos en el gesto actual */


  /* ----------------------------------------------------------
     GENERACION DE PUNTITOS
     Se crean tantos botones como diapositivas haya en el HTML
  ---------------------------------------------------------- */
  function crearPuntitos() {
    contenedorPuntitos.innerHTML = '';

    for (var i = 0; i < total; i++) {
      var boton = document.createElement('button');
      boton.className = 'puntito' + (i === 0 ? ' activo' : '');
      boton.setAttribute('aria-label', 'Ir a promo numero ' + (i + 1));

      /* Al hacer click en un puntito se va directo a esa slide */
      boton.addEventListener('click', (function (indice) {
        return function () {
          irA(indice);
          reiniciarAutoplay();
        };
      }(i)));

      contenedorPuntitos.appendChild(boton);
    }
  }

  /* Marca como activo solo el puntito correspondiente a la slide visible */
  function actualizarPuntitos() {
    var puntitos = contenedorPuntitos.querySelectorAll('.puntito');
    for (var i = 0; i < puntitos.length; i++) {
      if (i === indiceActual) {
        puntitos[i].classList.add('activo');
      } else {
        puntitos[i].classList.remove('activo');
      }
    }
  }


  /* ----------------------------------------------------------
     NAVEGACION
  ---------------------------------------------------------- */
  /* Mueve la pista al indice indicado con loop infinito */
  function irA(indice) {
    if (indice >= total) { indice = 0; }
    if (indice < 0)      { indice = total - 1; }

    indiceActual = indice;

    /* Mover la pista: cada slide ocupa el 100% del ancho, entonces
       para ir al indice N se desplaza N * 100% hacia la izquierda */
    pista.style.transform = 'translateX(-' + (indiceActual * 100) + '%)';

    actualizarPuntitos();
  }

  function siguiente() { irA(indiceActual + 1); }
  function anterior()  { irA(indiceActual - 1); }


  /* ----------------------------------------------------------
     AUTOPLAY
  ---------------------------------------------------------- */
  function iniciarAutoplay() {
    temporizador = setInterval(function () {
      if (!pausado && !arrastrando) {
        siguiente();
      }
    }, INTERVALO_MS);
  }

  function detenerAutoplay() {
    if (temporizador !== null) {
      clearInterval(temporizador);
      temporizador = null;
    }
  }

  function reiniciarAutoplay() {
    detenerAutoplay();
    iniciarAutoplay();
  }

  /* Pausar cuando el mouse esta encima del carrusel (solo escritorio) */
  pista.addEventListener('mouseenter', function () { pausado = true; });
  pista.addEventListener('mouseleave', function () { pausado = false; });


  /* ----------------------------------------------------------
     SWIPE TACTIL (movil)
  ---------------------------------------------------------- */
  pista.addEventListener('touchstart', function (ev) {
    xInicio      = ev.touches[0].clientX;
    desplazamiento = 0;
    arrastrando  = true;
    detenerAutoplay();
  }, { passive: true });

  pista.addEventListener('touchmove', function (ev) {
    if (!arrastrando) { return; }
    desplazamiento = ev.touches[0].clientX - xInicio;

    /* Mover la pista visualmente mientras se arrastra */
    var baseTranslate = indiceActual * pista.offsetWidth;
    pista.style.transform = 'translateX(' + (-baseTranslate + desplazamiento) + 'px)';
  }, { passive: true });

  pista.addEventListener('touchend', function () {
    if (!arrastrando) { return; }
    resolverArrastre();
  });

  pista.addEventListener('touchcancel', function () {
    if (!arrastrando) { return; }
    resolverArrastre();
  });


  /* ----------------------------------------------------------
     ARRASTRE CON MOUSE (escritorio)
  ---------------------------------------------------------- */
  pista.addEventListener('mousedown', function (ev) {
    xInicio        = ev.clientX;
    desplazamiento = 0;
    arrastrando    = true;
    pista.classList.add('arrastrando');
    detenerAutoplay();
    ev.preventDefault(); /* Evita seleccion de texto al arrastrar */
  });

  /* Los eventos mousemove y mouseup se escuchan en el documento
     para capturar el gesto aunque el cursor salga de la pista */
  document.addEventListener('mousemove', function (ev) {
    if (!arrastrando) { return; }
    desplazamiento = ev.clientX - xInicio;

    var baseTranslate = indiceActual * pista.offsetWidth;
    pista.style.transform = 'translateX(' + (-baseTranslate + desplazamiento) + 'px)';
  });

  document.addEventListener('mouseup', function () {
    if (!arrastrando) { return; }
    pista.classList.remove('arrastrando');
    resolverArrastre();
  });


  /* ----------------------------------------------------------
     RESOLVER ARRASTRE
     Decide si cambiar de slide o volver a la actual
     segun si el arrastre supero el umbral configurado
  ---------------------------------------------------------- */
  function resolverArrastre() {
    arrastrando = false;

    /* Reactivar la transicion CSS antes de animar el snap */
    pista.style.transition = '';

    var umbralPixeles = pista.offsetWidth * UMBRAL_PORCENTAJE;

    if (desplazamiento < -umbralPixeles) {
      /* Arrastro hacia la izquierda: ir a la siguiente promo */
      siguiente();
    } else if (desplazamiento > umbralPixeles) {
      /* Arrastro hacia la derecha: volver a la promo anterior */
      anterior();
    } else {
      /* Arrastre insuficiente: quedarse en la slide actual */
      irA(indiceActual);
    }

    desplazamiento = 0;
    iniciarAutoplay();
  }


  /* ----------------------------------------------------------
     INICIALIZACION
     Se ejecuta una sola vez al cargar la pagina
  ---------------------------------------------------------- */
  crearPuntitos();
  irA(0);
  iniciarAutoplay();

}()); /* Fin del modulo - no contamina el scope global */
