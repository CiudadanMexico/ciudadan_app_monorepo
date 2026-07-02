import React from 'react';
import PropTypes from 'prop-types';
import { Avatar, Chip, List, ListItem, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CancelIcon from '@mui/icons-material/Cancel';

const STATUS_COPY = {
  needs_review: 'Revisar',
  pending: 'Pendiente',
  rejected: 'Rechazado',
  resub_requested: 'Reenvío',
};

const OperativeChecklist = ({ documents }) => (
  <List dense sx={{ py: 0 }}>
    {documents.map((item) => {
      const docStatus = item.status || 'pending';

      const isApproved = docStatus === 'approved';
      const isRejected = docStatus === 'rejected';
      let Icon = HourglassEmptyIcon;
      let color = 'warning.main';
      if (isApproved) {
        Icon = CheckCircleIcon;
        color = 'success.main';
      } else if (isRejected) {
        Icon = CancelIcon;
        color = 'error.main';
      }

      return (
        <ListItem key={item.id} disablePadding sx={{ py: 0.5 }}>
          <Avatar sx={{ width: 24, height: 24, mr: 1.25, bgcolor: 'background.default', flexShrink: 0 }}>
            <Icon sx={{ color, fontSize: 16 }} />
          </Avatar>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ width: '100%', minWidth: 0 }}>
            <Typography variant="body2" sx={{ pr: 0.5 }}>
              {item.name}
            </Typography>
            {!isApproved && (
              <Chip
                size="small"
                label={STATUS_COPY[docStatus] || docStatus}
                sx={{ flexShrink: 0, '& .MuiChip-label': { px: 1 } }}
              />
            )}
          </Stack>
        </ListItem>
      );
    })}
  </List>
);

OperativeChecklist.propTypes = {
  documents: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      status: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
};

export default OperativeChecklist;
