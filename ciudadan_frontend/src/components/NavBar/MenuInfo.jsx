import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/NotificationsMenu.css';
import '../../styles/MenuInfo.css';
import wikiImage from '../../assets/wikiciudadan.png'; 
import quienesImage from '../../assets/quienes.png'; 
import logoImage from '../../assets/logo_cuadro.png'; 
import helpImage from '../../assets/help.png'; 
import contactImage from '../../assets/faq.png'; 
import VideosImage from '../../assets/videos.png'; 

const MenuInfo = ({ handleLogout, isOpen, onClose, onLogout, containerRef, setIsOpen }) => {
  const navigate = useNavigate();

  const items = [
    { href: "/", img: logoImage, alt: "Presentación", label: "Presentación" },
    { href: "/info/quienes", img: quienesImage, alt: "¿Quiénes Somos?", label: "¿Quiénes Somos?" },
    { href: "/wiki", img: wikiImage, alt: "Wiki Ciudadan.org", label: "Wiki", target: "_blank" },
    { href: "/wiki/faq", img: contactImage, alt: "Preguntas Frecuentes", label: "Preguntas Frecuentes" },
    { href: "/wiki/ayuda", img: helpImage, alt: "Ayuda", label: "Ayuda" },
    { href: "https://www.youtube.com/@ciudadanmex", img: VideosImage, alt: "Canal YT", label: "Canal YT", target: "_blank" },
  ];

  return (
    <div ref={containerRef}>
      <div className={`notifications-menu ${isOpen ? 'open' : 'closed'} verde`}>
        <div className="grid-container verde">
          {items.map((item, index) => (
            <div
              className="grid-item margin-bot"
              key={index}
              onClick={() => {
                onClose();
                if (item.target === "_blank") {
                  window.open(item.href, "_blank", "noopener,noreferrer");
                } else {
                  navigate(item.href);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <img src={item.img} width="50px" alt={item.alt} />
              <p>{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MenuInfo;
