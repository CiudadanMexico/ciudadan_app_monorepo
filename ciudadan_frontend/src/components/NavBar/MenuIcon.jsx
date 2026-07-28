import React, { useState, useRef, useEffect } from 'react';
import { TbHelpTriangleFilled } from "react-icons/tb";
import '../../styles/MessagesIcon.css';

/**
 * MenuIcon ahora SOLO actúa como disparador de la topbar.
 * No renderiza MenuMenu ni abre otros menús.
 *
 * Props:
 * - isOpen (opcional): modo controlado
 * - setIsOpen (opcional): callback del padre
 * - onClick (opcional): callback adicional (ej: toggleTopBar)
 * - className (opcional)
 */
const MenuIcon = ({
  count = 0,
  isOpen: controlledIsOpen,
  setIsOpen: controlledSetIsOpen,
  onClick,
  className = '',
  ...rest
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof controlledIsOpen !== 'undefined' && typeof controlledSetIsOpen === 'function';
  const open = isControlled ? controlledIsOpen : internalOpen;
  const containerRef = useRef(null);

  const toggle = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();

    // callback opcional externo (ej: NavBar.toggleTopBar)
    if (typeof onClick === 'function') {
      try { onClick(); } catch (err) { /* no parar por errores externos */ }
    }

    if (isControlled) {
      controlledSetIsOpen(!controlledIsOpen);
    } else {
      setInternalOpen((s) => !s);
    }
  };

  // Si no está controlado, cerramos al click fuera
  useEffect(() => {
    if (isControlled) return;
    const onDocClick = (ev) => {
      if (containerRef.current && !containerRef.current.contains(ev.target)) {
        setInternalOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isControlled]);

  return (
    <div
      ref={containerRef}
      className={`message-icon-container ${className}`}
      onClick={toggle}
      aria-expanded={!!open}
      {...rest}
    >
      <TbHelpTriangleFilled className={`message-icon ${open ? 'open' : ''}`} />
      {count > 0 && <span className="badge-count">{count}</span>}
    </div>
  );
};

export default MenuIcon;
