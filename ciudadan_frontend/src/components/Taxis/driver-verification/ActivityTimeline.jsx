import React from 'react';
import PropTypes from 'prop-types';
import { Typography } from '@mui/material';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';

const DOT_COLOR = {
  approved: 'success.main',
  rejected: 'error.main',
  resub: '#7F77DD',
  info: 'info.main',
};

const ActivityTimeline = ({ events = [] }) =>
  events.length ? (
    <Timeline sx={{ m: 0, p: 0 }}>
      {events.map((event, idx) => (
        <TimelineItem key={event.id} sx={{ '&::before': { display: 'none' } }}>
          <TimelineSeparator>
            <TimelineDot sx={{ bgcolor: DOT_COLOR[event.type] || 'grey.500' }} />
            {idx < events.length - 1 && <TimelineConnector />}
          </TimelineSeparator>
          <TimelineContent sx={{ py: 0.5, px: 1 }}>
            <Typography variant="body2">{event.text}</Typography>
            {event.detail ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 0.25, whiteSpace: 'pre-wrap' }}
              >
                {event.detail}
              </Typography>
            ) : null}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 0.25 }}
            >
              {event.time}
              {event.actorName ? ` • ${event.actorName}` : ''}
            </Typography>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  ) : (
    <Typography variant="body2" color="text.secondary">
      Sin actividad registrada.
    </Typography>
  );

ActivityTimeline.propTypes = {
  events: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      type: PropTypes.string.isRequired,
      text: PropTypes.string.isRequired,
      time: PropTypes.string.isRequired,
      detail: PropTypes.string,
      actorName: PropTypes.string,
    })
  ),
};

export default ActivityTimeline;
