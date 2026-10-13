import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { SnackbarProvider, useSnackbar } from 'notistack';

import NotifToast, {
  ICON_BY_VARIANT,
  NOTIF_TOAST_COMPONENTS,
  NOTIF_VARIANTS,
  VERDE_NEON,
} from './NotifToast';
import { MORADO, MORADO_OSCURO } from './PurpleButton';

const ALL_VARIANTS = Object.values(NOTIF_VARIANTS);

/**
 * Dispara un toast a través del contexto real de notistack, para que el snack
 * pase por el SnackbarProvider de verdad (Collapse + Snackbar + Slide +
 * Transition) y no sólo por nuestro render directo.
 */
function EnqueueButton({ message, variant }) {
  const { enqueueSnackbar } = useSnackbar();
  return (
    <button type="button" onClick={() => enqueueSnackbar(message, { variant })}>
      lanzar
    </button>
  );
}

describe('NotifToast — look de marca del módulo de notificaciones', () => {
  it('pinta el mensaje que le pasa notistack', () => {
    render(<NotifToast message="Notificación enviada y persistida" variant={NOTIF_VARIANTS.info} />);
    expect(screen.getByText('Notificación enviada y persistida')).toBeInTheDocument();
  });

  it('respeta className y style (notistack los reenvía desde el snack)', () => {
    render(
      <NotifToast message="x" variant={NOTIF_VARIANTS.info} className="notiff-toast" style={{ marginTop: 8 }} />
    );
    const card = screen.getByRole('alert');
    expect(card).toHaveClass('notiff-toast');
    expect(card).toHaveStyle({ marginTop: '8px' });
  });

  it('usa los colores de marca y el verde neón del sitio', () => {
    expect(VERDE_NEON).toBe('#00ff88');
    expect(MORADO).toBe('#8A5CF5');
    expect(MORADO_OSCURO).toBe('#6A3FCB');
  });

  it('registra exactamente las 5 variantes custom que consume el contexto', () => {
    expect(Object.keys(NOTIF_TOAST_COMPONENTS).sort()).toEqual([
      'notif-default',
      'notif-error',
      'notif-info',
      'notif-success',
      'notif-warning',
    ]);
    ALL_VARIANTS.forEach((variant) => {
      const Component = NOTIF_TOAST_COMPONENTS[variant];
      // forwardRef devuelve un "exotic component" (objeto), no una función.
      // Es justo lo que necesita notistack: si fuera una función plana, Slide no
      // podría inyectarle el ref y Transition lanzaría al montar.
      expect(Component.$$typeof).toBe(Symbol.for('react.forward_ref'));
    });
  });

  it('no pisa las variantes por defecto de notistack (el legacy sigue igual)', () => {
    ['default', 'success', 'error', 'warning', 'info'].forEach((variant) => {
      expect(NOTIF_TOAST_COMPONENTS[variant]).toBeUndefined();
    });
  });

  it('tiene un icono distinto por variante (el fondo no cambia, el icono sí)', () => {
    const icons = ALL_VARIANTS.map((variant) => ICON_BY_VARIANT[variant]);

    icons.forEach((Icon) => expect(Icon).toBeTruthy());
    // 5 variantes -> 5 iconos distintos; si dos se duplican, algo se copió mal.
    expect(new Set(icons).size).toBe(ALL_VARIANTS.length);
  });

  it('renderiza cualquier variante sin romper y con su mensaje', () => {
    ALL_VARIANTS.forEach((variant) => {
      const { unmount } = render(<NotifToast message={`mensaje de ${variant}`} variant={variant} />);
      expect(screen.getByText(`mensaje de ${variant}`)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
      unmount();
    });
  });

  it('si llega una variante desconocida, cae al icono por defecto sin romper', () => {
    expect(ICON_BY_VARIANT['notif-inventado']).toBeUndefined();
    render(<NotifToast message="raro" variant="notif-inventado" />);
    expect(screen.getByText('raro')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  // --- Regresión del bug que tumbaba la app -------------------------------
  // notistack v3 envuelve el snack custom en su TransitionComponent (Slide),
  // que hace cloneElement(children, { ref }) y luego lee nodeRef.current para
  // animar. Sin forwardRef, Transition lanza "Custom snackbar is not
  // refForwarding" en el mount y CRA panta la app con "Uncaught runtime errors".
  // Nada de lo de arriba lo detectaba: se renderizaba el componente SUELTO.

  it('reenvía el ref al nodo raíz (contrato que exige notistack)', () => {
    const ref = React.createRef();
    render(<NotifToast ref={ref} message="con ref" variant={NOTIF_VARIANTS.success} />);

    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current).toHaveAttribute('role', 'alert');
  });

  it.each(ALL_VARIANTS)('monta %s dentro del SnackbarProvider real sin reventar', (variant) => {
    const mensaje = `toast real de ${variant}`;
    render(
      <SnackbarProvider Components={NOTIF_TOAST_COMPONENTS}>
        <EnqueueButton message={mensaje} variant={variant} />
      </SnackbarProvider>
    );

    fireEvent.click(screen.getByText('lanzar'));
    expect(screen.getByText(mensaje)).toBeInTheDocument();
  });

  it('aplica el style que le inyecta Slide (la animación necesita sus transforms)', () => {
    render(
      <SnackbarProvider Components={NOTIF_TOAST_COMPONENTS}>
        <EnqueueButton message="animado" variant={NOTIF_VARIANTS.info} />
      </SnackbarProvider>
    );

    fireEvent.click(screen.getByText('lanzar'));
    const tarjeta = screen.getByRole('alert');
    // Slide escribe transform/transition inline; si no los reenviáramos, el
    // toast aparecería sin animación y mal posicionado.
    expect(tarjeta.getAttribute('style')).toContain('transform');
  });
});
