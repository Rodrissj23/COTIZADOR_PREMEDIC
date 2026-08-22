window.PremedicMotor = (() => {
  const data = window.PREMEDIC_DATA;

  function money(value) {
    return '$ ' + Number(value).toLocaleString('es-AR', { maximumFractionDigits: 2, minimumFractionDigits: Number(value) % 1 === 0 ? 0 : 2 });
  }

  function tramoIndex(edad) {
    if (edad <= 29) return 0;
    if (edad <= 39) return 1;
    if (edad <= 49) return 2;
    return 3;
  }

  function aporteComputable(aporte) {
    return (Number(aporte || 0) / 3) * 7.65;
  }

  function validate(state) {
    if (!state.nombre?.trim()) {
      return { ok: false, error: 'Completá el nombre del cliente.' };
    }
    if (!state.edadTitular || state.edadTitular < 1 || state.edadTitular > data.edadMaxima) {
      return { ok: false, error: 'Ingresá una edad válida para el titular. Premedic se comercializa hasta los 59 años.' };
    }
    if (['pareja', 'pareja_hijos'].includes(state.composicion)) {
      if (!state.edadPareja || state.edadPareja < 1 || state.edadPareja > data.edadMaxima) {
        return { ok: false, error: 'Ingresá una edad válida para la pareja. Si tiene 60 años o más, queda fuera del rango comercial.' };
      }
    }
    if (['titular_hijos', 'pareja_hijos'].includes(state.composicion)) {
      if (!Array.isArray(state.hijos) || state.hijos.length === 0) {
        return { ok: false, error: 'Indicá la cantidad de hijos y completá sus edades.' };
      }
      for (const edad of state.hijos) {
        if (edad === null || edad === '' || Number.isNaN(Number(edad))) {
          return { ok: false, error: 'Completá la edad de todos los hijos.' };
        }
        if (Number(edad) < 0 || Number(edad) >= 25) {
          return { ok: false, error: 'Las edades de hijos contempladas por esta lista deben ser menores de 25 años.' };
        }
      }
    }
    if (state.modalidad === 'desregulado' && (state.aporteRecibo === null || state.aporteRecibo === '' || Number(state.aporteRecibo) < 0)) {
      return { ok: false, error: 'Ingresá un aporte del recibo válido para calcular Desregulado.' };
    }
    return { ok: true };
  }

  function buildCaseLabel(state) {
    const map = {
      individual: 'Individual',
      titular_hijos: 'Titular + hijo/s',
      pareja: 'Titular + pareja',
      pareja_hijos: 'Titular + pareja + hijo/s'
    };
    return map[state.composicion] || state.composicion;
  }

  function calculatePlan(plan, state, refAge) {
    const band = tramoIndex(refAge);
    let base = 0;
    let baseLabel = '';
    let extras = [];
    const hijos = state.hijos || [];

    if (state.composicion === 'individual') {
      base = plan.individual[band];
      baseLabel = 'Individual';
    }
    if (state.composicion === 'pareja') {
      base = plan.matrimonio[band];
      baseLabel = 'Titular + pareja';
    }
    if (state.composicion === 'titular_hijos') {
      base = plan.individual[band];
      baseLabel = 'Titular';
      extras = hijos.slice();
    }
    if (state.composicion === 'pareja_hijos') {
      const covered = Math.min(hijos.length, 3);
      if (covered === 1) base = plan.matrimonio1[band];
      if (covered === 2) base = plan.matrimonio2[band];
      if (covered >= 3) base = plan.matrimonio3[band];
      baseLabel = `Titular + pareja + ${covered} hijo${covered > 1 ? 's' : ''}`;
      extras = hijos.slice(3);
    }

    const extraItems = extras.map(edad => ({
      edad,
      tipo: edad < 1 ? 'Menor de 1 año' : 'Menor de 25 años',
      valor: edad < 1 ? plan.adicionalMenor1 : plan.adicionalMenor25
    }));
    const totalAdicionales = extraItems.reduce((sum, item) => sum + item.valor, 0);
    const bruto = base + totalAdicionales;
    const aporteComp = state.modalidad === 'desregulado' ? aporteComputable(state.aporteRecibo) : 0;
    const neto = Math.max(0, bruto - aporteComp);

    return {
      band,
      base,
      baseLabel,
      extras: extraItems,
      totalAdicionales,
      bruto,
      aporteComputable: aporteComp,
      neto,
      cubiertoPorAporte: state.modalidad === 'desregulado' && aporteComp >= bruto
    };
  }

  function quote(state) {
    const validation = validate(state);
    if (!validation.ok) return validation;

    const refAge = ['pareja', 'pareja_hijos'].includes(state.composicion)
      ? Math.max(state.edadTitular, state.edadPareja)
      : state.edadTitular;

    const band = tramoIndex(refAge);
    const zonePlans = data.tarifas[state.modalidad][state.zona];
    const canonicalPlanOrder = ['C-100', '200', '300', '400', '500'];
    const plans = Object.keys(zonePlans)
      .sort((a, b) => canonicalPlanOrder.indexOf(a) - canonicalPlanOrder.indexOf(b))
      .map(name => ({
        plan: name,
        ...calculatePlan(zonePlans[name], state, refAge)
      }));

    return {
      ok: true,
      refAge,
      band,
      bandLabel: data.tramos[band],
      compositionLabel: buildCaseLabel(state),
      plans,
      aporteRecibo: state.modalidad === 'desregulado' ? Number(state.aporteRecibo) : 0,
      aporteComputable: state.modalidad === 'desregulado' ? aporteComputable(state.aporteRecibo) : 0
    };
  }

  return { data, money, quote, buildCaseLabel, aporteComputable };
})();
