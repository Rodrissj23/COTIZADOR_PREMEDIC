(() => {
  const MONOTRIBUTO_APORTES = Object.freeze({
    A: 19791,
    B: 19791,
    C: 19791,
    D: 23520,
    E: 28862,
    F: 32985,
    G: 35566,
    H: 42736,
    I: 52766,
    J: 59299,
    K: 67690
  });

  const PROMOS = Object.freeze([
    { id: 'ninguna', label: 'Sin beneficio', modalidades: ['directo', 'desregulado'], zonas: ['amba', 'interior', 'cordoba', 'mendoza', 'misiones', 'tucuman'], planes: ['C-100', '200', '300', '400', '500'], tipo: 'none', valor: 0 },
    { id: 'monotributo', label: 'Monotributo · descuento por categoría', modalidades: ['directo'], zonas: ['amba', 'cordoba', 'mendoza', 'misiones', 'tucuman'], planes: ['200', '300', '400', '500'], tipo: 'monotributo', valor: 0 },
    { id: 'tc15', label: 'Débito automático en TC · 15%', modalidades: ['directo', 'desregulado'], zonas: ['amba', 'interior', 'cordoba', 'mendoza', 'misiones', 'tucuman'], planes: ['200', '300', '400', '500'], tipo: 'porcentaje', valor: 15 },
    { id: 'cbu15', label: 'Débito en CBU · 15%', modalidades: ['directo', 'desregulado'], zonas: ['amba', 'interior', 'cordoba', 'mendoza', 'misiones', 'tucuman'], planes: ['200', '300', '400', '500'], tipo: 'porcentaje', valor: 15 },
    { id: 'efectivo10', label: 'Efectivo / débito / transferencia · 10%', modalidades: ['directo', 'desregulado'], zonas: ['amba', 'interior', 'cordoba', 'mendoza', 'misiones', 'tucuman'], planes: ['200', '300', '400', '500'], tipo: 'porcentaje', valor: 10 },
    { id: 'promo40', label: 'Promo 40% AMBA / Córdoba', modalidades: ['directo', 'desregulado'], zonas: ['amba', 'cordoba'], planes: ['200', '300', '400', '500'], tipo: 'porcentaje', valor: 40 },
    { id: 'interior25', label: 'Promo 25% Interior Nuevo', modalidades: ['directo', 'desregulado'], zonas: ['mendoza', 'misiones', 'tucuman'], planes: ['C-100', '200', '300', '400', '500'], tipo: 'porcentaje', valor: 25 }
  ]);

  const state = {
    promoId: 'ninguna',
    categoriaMonotributo: 'A'
  };

  function getPromo(id = state.promoId) {
    return PROMOS.find(p => p.id === id) || PROMOS[0];
  }

  function aporteMonotributo(categoria = state.categoriaMonotributo) {
    return MONOTRIBUTO_APORTES[categoria] || 0;
  }

  function pricingZone(zone) {
    return zone === 'amba' ? 'amba' : 'interior';
  }

  function promoAplica({ promo = getPromo(), modalidad, zona, plan }) {
    return promo.modalidades.includes(modalidad) && promo.zonas.includes(zona) && promo.planes.includes(plan);
  }

  function aplicarPromocion(bruto, { modalidad, zona, plan }) {
    const promo = getPromo();
    if (!promoAplica({ promo, modalidad, zona, plan })) {
      return { promo: PROMOS[0], descuento: 0, subtotal: bruto, aporteMonotributo: 0 };
    }

    if (promo.tipo === 'porcentaje') {
      const descuento = bruto * (promo.valor / 100);
      return { promo, descuento, subtotal: Math.max(0, bruto - descuento), aporteMonotributo: 0 };
    }

    if (promo.tipo === 'monotributo') {
      const aporte = aporteMonotributo();
      return { promo, descuento: aporte, subtotal: Math.max(0, bruto - aporte), aporteMonotributo: aporte };
    }

    return { promo, descuento: 0, subtotal: bruto, aporteMonotributo: 0 };
  }

  function promosDisponibles(modalidad, zona) {
    return PROMOS.filter(p => p.modalidades.includes(modalidad) && p.zonas.includes(zona));
  }

  window.PremedicPromos = {
    MONOTRIBUTO_APORTES,
    PROMOS,
    state,
    getPromo,
    aporteMonotributo,
    pricingZone,
    promoAplica,
    aplicarPromocion,
    promosDisponibles
  };
})();
