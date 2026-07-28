import React from "react";
import { Box, Card, CardContent, Typography } from "@mui/material";

// Helper para extraer el ID de YouTube
const getYouTubeEmbedUrl = (url) => {
  const match = url.match(/(?:youtube\.com\/.*v=|youtu\.be\/)([^&]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}?rel=0&showinfo=0` : null;
};

const IntroVideo = () => {
  const videoUrl = process.env.REACT_APP_PRESENTATION_VIDEO;

  if (!videoUrl) {
    return (
      <Box sx={{ textAlign: "center", mt: 4 }}>
        <Typography variant="h6" color="text.secondary">
          No se ha configurado el video de presentación (.env)
        </Typography>
      </Box>
    );
  }

  const youTubeEmbed = getYouTubeEmbedUrl(videoUrl);
  const isDirectVideo = videoUrl.match(/\.(mp4|webm|ogg)$/i);

  return (
    <Card
      elevation={4}
      sx={{
        width: "100%",
        borderRadius: 4,
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      <CardContent sx={{ p: 0 }}>
        <Box
          sx={{
            position: "relative",
            width: "100%",
            paddingTop: "56.25%", // 16:9 aspect ratio
            overflow: "hidden",
            "& iframe, & video": {
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              border: 0,
            },
          }}
        >
          {youTubeEmbed ? (
            <iframe
              src={youTubeEmbed}
              title="Presentación"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : isDirectVideo ? (
            <video controls autoPlay muted loop>
              <source src={videoUrl} />
              Tu navegador no soporta video HTML5.
            </video>
          ) : (
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            >
              URL de video no reconocida
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default IntroVideo;
