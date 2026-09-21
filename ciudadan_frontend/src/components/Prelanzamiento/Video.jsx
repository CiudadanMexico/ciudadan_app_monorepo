import React, { useState } from 'react';

export default function Video({ id, title }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className='pre-video'>
      {playing ? <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
        title={title} loading='lazy'
        allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
        allowFullScreen referrerPolicy='strict-origin-when-cross-origin'
      /> : <button type='button' onClick={() => setPlaying(true)} aria-label={`Reproducir: ${title}`}>
        <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt='' loading='lazy' width='480' height='360' />
        <span className='pre-play' aria-hidden='true'>▶</span>
        <span className='pre-video-title'>{title}</span>
      </button>}
    </div>
  );
}
