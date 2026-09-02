import React, { useState } from 'react';
import { TreeNodeDTO } from '../../types/wiki';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import FolderIcon from '@mui/icons-material/Folder';
import DescriptionIcon from '@mui/icons-material/Description';

export interface WikiTreeViewProps {
    nodes: TreeNodeDTO[] | any[];
    onSelectDocument?: (fullPath: string) => void;
    onSelectFolder?: () => void;
}

const WikiTreeView: React.FC<WikiTreeViewProps> = ({ nodes, onSelectDocument, onSelectFolder }) => {
    const [expanded, setExpanded] = useState<string[]>([]);
    const [selected, setSelected] = useState<string>('');

    const handleToggle = (event: React.SyntheticEvent | null, nodeIds: string[]) => {
        setExpanded(nodeIds);
    };

    const handleSelect = (event: React.SyntheticEvent | null, itemId: string | null) => {
        if (!itemId) return;
        
        const cleanId = decodeURIComponent(itemId);
        setSelected(cleanId);

        // Validamos si es un archivo (tiene extensión o punto)
        const isFile = cleanId.includes('.');

        if (isFile) {
            if (onSelectDocument) {
                onSelectDocument(cleanId);
            }
        } else {
            if (onSelectFolder) {
                onSelectFolder();
            }
        }
    };

    // Renderizamos recursivamente los nodos que ya vienen estructurados y limpios desde el backend
    const renderTree = (items: any[]) => {
        if (!Array.isArray(items)) return null;

        return items.map((node) => {
            const hasChildren = Array.isArray(node.children) && node.children.length > 0;
            const isFolder = node.type === 'folder' || hasChildren;
            const nodeId = node.path || node.documentId || node.name;

            return (
                <TreeItem
                    key={nodeId}
                    itemId={nodeId}
                    label={node.name}
                    slots={{
                        icon: isFolder ? FolderIcon : DescriptionIcon,
                    }}
                >
                    {hasChildren ? renderTree(node.children) : null}
                </TreeItem>
            );
        });
    };

    return (
        <div className="wiki-tree-container" style={{ padding: '1rem', minWidth: '250px' }}>
            <SimpleTreeView
                aria-label="wiki tree"
                expandedItems={expanded}
                selectedItems={selected}
                onExpandedItemsChange={handleToggle}
                onSelectedItemsChange={handleSelect}
            >
                {renderTree(nodes)}
            </SimpleTreeView>
        </div>
    );
};

export default WikiTreeView;