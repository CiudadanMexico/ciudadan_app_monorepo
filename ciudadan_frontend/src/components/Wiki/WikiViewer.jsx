import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import PreLoader from "../PreLoader";
import "../../styles/WikiViewer.css";
import { WIKI_BASE_URL, WIKI_ROUTES } from "../../utils/constants.js";

const WikiViewer = () => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  

  useEffect(() => {
    const fetchWiki = async () => {
      try {
        const path = window.location.pathname;

        const pageId = WIKI_ROUTES[path] || WIKI_ROUTES.default;
        const notionUrl = `https://wiki.ciudadan.org/wiki/${pageId}`;

        setLoading(true);

        const res = await fetch(notionUrl);
        if (!res.ok) throw new Error("Error al cargar la wiki");

        let html = await res.text();
        html = html.replace("<details>", "<details open>");

        setContent(html);
      } catch (error) {
        console.error(error);
        setContent("<p>Error al cargar el contenido.</p>");
      } finally {
        setLoading(false);
      }
    };

    fetchWiki();
  }, [location.pathname]);

  if (loading) return (<PreLoader />);

  const isMatrix = location.pathname === "/quienes-somos";

  return (
    <div
      className={`wiki-content ${isMatrix ? "matrix-mode" : ""}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

export default WikiViewer;
