// src/Pages/HomeRoute.jsx
import React, { useEffect } from "react";
import Intro from "../components/Home/Intro.jsx";
import IntroVideo from "../components/Home/IntroVideo.jsx";
import WikiViewer from "../components/Wiki/WikiViewer.jsx";

export default function HomeRoute() {
  useEffect(() => {
    window.dispatchEvent(new Event("closeTopBar"));
  }, []);

  return (
    <div className="home bg-gray-50 min-h-screen">
      <Intro />
      <IntroVideo />

      {/* 👇 Sección Wiki integrada debajo del video */}
      <WikiViewer />
    </div>
  );
}
