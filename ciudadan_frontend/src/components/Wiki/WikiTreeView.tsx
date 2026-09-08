import React, { useState } from 'react';
import { TreeNodeDTO } from '../../types/wiki';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

export interface WikiTreeViewProps {
  nodes: TreeNodeDTO[] | any[];
  onSelectDocument?: (fullPath: string) => void;
  onSelectFolder?: () => void;
}

const WikiTreeView: React.FC<WikiTreeViewProps> = ({ nodes, onSelectDocument, onSelectFolder }) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (path: string) => {
    setExpanded((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const renderTree = (items: any[], depth = 0) => {
    if (!Array.isArray(items)) return null;

    return (
      <List dense disablePadding>
        {items.map((node) => {
          const hasChildren = Array.isArray(node.children) && node.children.length > 0;
          const isFolder = node.type === 'folder' || hasChildren;
          const nodeId = node.path || node.documentId || node.name;
          const isExpanded = !!expanded[nodeId];

          return (
            <React.Fragment key={nodeId}>
              <ListItem
                sx={{ pl: 2 + depth * 2, cursor: 'pointer' }}
                onClick={() => {
                  if (isFolder) {
                    toggleExpand(nodeId);
                    if (onSelectFolder) onSelectFolder();
                  } else if (onSelectDocument) {
                    onSelectDocument(nodeId);
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: isFolder ? '#f9a825' : '#4caf50' }}>
                  {isFolder ? (
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleExpand(nodeId); }}>
                      {isExpanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
                    </IconButton>
                  ) : (
                    <DescriptionIcon fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText primary={node.name} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isFolder ? 600 : 400 }} />
              </ListItem>
              {isFolder && hasChildren && (
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  {renderTree(node.children, depth + 1)}
                </Collapse>
              )}
            </React.Fragment>
          );
        })}
      </List>
    );
  };

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {renderTree(nodes)}
    </div>
  );
};

export default WikiTreeView;

