import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';

const BottomSheet = ({
  children,
  initialState = 'collapsed',
  onStateChange,
  collapsedHeight = 90,
  mediumHeight = 380,
  fullHeight = window.innerHeight - 50,
}) => {
  const [mounted, setMounted] = useState(false);
  const [currentState, setCurrentState] = useState(initialState);
  const [height, setHeight] = useState(
    initialState === 'collapsed'
      ? collapsedHeight
      : initialState === 'medium'
        ? mediumHeight
        : fullHeight,
  );

  useEffect(() => {
    let newHeight;
    if (currentState === 'collapsed') newHeight = collapsedHeight;
    else if (currentState === 'medium') newHeight = mediumHeight;
    else newHeight = fullHeight;
    setHeight(newHeight);
    onStateChange?.(currentState);
  }, [currentState, collapsedHeight, mediumHeight, fullHeight, onStateChange]);

  const handleDragEnd = (event, info) => {
    const velocityY = info.velocity.y;
    const currentH = height;

    let newState = currentState;
    if (Math.abs(velocityY) > 300) {
      if (velocityY < 0) {
        if (currentH < mediumHeight) newState = 'medium';
        else if (currentH < fullHeight) newState = 'full';
      } else {
        if (currentH > mediumHeight) newState = 'medium';
        else if (currentH > collapsedHeight) newState = 'collapsed';
      }
    } else {
      const dist = {
        collapsed: Math.abs(currentH - collapsedHeight),
        medium: Math.abs(currentH - mediumHeight),
        full: Math.abs(currentH - fullHeight),
      };
      if (dist.collapsed <= dist.medium && dist.collapsed <= dist.full)
        newState = 'collapsed';
      else if (dist.medium <= dist.collapsed && dist.medium <= dist.full)
        newState = 'medium';
      else newState = 'full';
    }

    if (newState !== currentState) setCurrentState(newState);
  };

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <motion.div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1300,
        height: height,
      }}
      animate={{ height }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      drag='y'
      dragElastic={0.2}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
    >
      <Paper
        elevation={8}
        sx={{
          height: '100%',
          width: '100%',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            pt: 1,
            pb: 0.5,
            cursor: 'grab',
            '&:active': { cursor: 'grabbing' },
          }}
        >
          <Box
            sx={{ width: 40, height: 5, bgcolor: 'grey.400', borderRadius: 3 }}
          />
        </Box>
        <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>{children}</Box>
      </Paper>
    </motion.div>,
    document.body,
  );
};

export default BottomSheet;
