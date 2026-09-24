import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  IconButton,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Paper,
  TextField,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import LinkIcon from '@mui/icons-material/Link';
import LockIcon from '@mui/icons-material/Lock';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SendIcon from '@mui/icons-material/Send';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  MediaStorageService,
  MEDIA_STORAGE_PROVIDERS,
  DriveApiError,
  DRIVE_ERROR_CODES,
  describeDriveError,
  loadGoogleIdentityScript,
} from '../../services/mediaStorageService';
import { saveLocalMediaCopy, deleteLocalMediaCopy, buildLocalMediaKey } from '../../services/localMediaStore';
import { createProof } from '../../services/mediaIntegrityService';
import {
  MEDIA_VERIFICATION_STATUS,
  verifyLocalMediaCopy,
  verifyProviderMediaCopy,
} from '../../services/mediaAccessService';

const SEARCH_SCOPES = {
  feed: ['Publicaciones', 'Personas', 'Contenido'],
  chats: ['Conversaciones', 'Personas'],
  contactos: ['Contactos', 'Personas'],
  grupos: ['Grupos', 'Personas', 'Contenido'],
  asamblea: ['Temas', 'Personas', 'Contenido'],
};

const MOCK_CONTENT_BY_SECTION = {
  feed: [
    { id: 'feed-1', title: 'Convocatoria de huerto urbano', subtitle: 'Publicación de Distrito Centro', tags: ['publicacion', 'comunidad'] },
    { id: 'feed-2', title: 'Ronda de intercambio local', subtitle: 'Contenido cooperativo de la semana', tags: ['contenido', 'intercambio'] },
    { id: 'feed-3', title: 'Marta Rivera compartió actualización', subtitle: 'Actividad reciente en Ciudadan Social', tags: ['persona', 'publicaciones'] },
  ],
  chats: [
    { id: 'chat-1', title: 'Asamblea Federal - Moderación', subtitle: '12 mensajes nuevos', tags: ['conversacion', 'asamblea'] },
    { id: 'chat-2', title: 'Distrito Norte - Coordinación', subtitle: 'Agenda semanal', tags: ['conversacion', 'distrito'] },
    { id: 'chat-3', title: 'Sofía Delgado', subtitle: 'Último mensaje: propuesta de brigada', tags: ['persona', 'contacto'] },
  ],
  contactos: [
    { id: 'contacto-1', title: 'Alejandro Torres', subtitle: 'Coordinador de comunidad', tags: ['persona', 'contacto'] },
    { id: 'contacto-2', title: 'Brigada Salud Centro', subtitle: 'Equipo disponible', tags: ['contacto', 'grupo'] },
    { id: 'contacto-3', title: 'Carla Mendoza', subtitle: 'Voluntaria activa', tags: ['persona', 'agenda'] },
  ],
  grupos: [
    { id: 'grupo-1', title: 'Nodo Producción Local', subtitle: '14 integrantes', tags: ['grupo', 'contenido'] },
    { id: 'grupo-2', title: 'Laboratorio de Movilidad', subtitle: '7 integrantes', tags: ['grupo', 'comunidad'] },
    { id: 'grupo-3', title: 'Mesa de Asamblea Distrito Sur', subtitle: 'Nuevo hilo de discusión', tags: ['grupo', 'asamblea'] },
  ],
  asamblea: [
    { id: 'asamblea-1', title: 'Orden del día federal', subtitle: 'Sesión de hoy 20:00', tags: ['tema', 'asamblea'] },
    { id: 'asamblea-2', title: 'Propuesta de reglamento local', subtitle: 'En revisión de comunidad', tags: ['contenido', 'distrito'] },
    { id: 'asamblea-3', title: 'Carlos Herrera', subtitle: 'Ponente invitado', tags: ['persona', 'tema'] },
  ],
};

const CHAT_THREADS = {
  'chat-1': {
    id: 'chat-1',
    name: 'Asamblea Federal - Moderación',
    avatar: 'AF',
    lastActivity: 'Hace 4 min',
    time: '20:18',
    unreadCount: 12,
    messagesCount: 148,
    unread: true,
    messages: [
      { id: 'm1', sender: 'Sistema', content: 'Se publicó el orden del día.', time: '19:50', incoming: true },
      { id: 'm2', sender: 'Laura', content: 'Confirmado el enlace de acceso.', time: '19:56', incoming: false },
      { id: 'm3', sender: 'Mario', content: 'Falta compartir la minuta final.', time: '20:01', incoming: true },
    ],
  },
  'chat-2': {
    id: 'chat-2',
    name: 'Distrito Norte - Coordinación',
    avatar: 'DN',
    lastActivity: 'Hace 22 min',
    time: '19:40',
    unreadCount: 3,
    messagesCount: 92,
    unread: true,
    messages: [
      { id: 'm1', sender: 'Ana', content: 'La brigada sale a las 8:30.', time: '18:12', incoming: true },
      { id: 'm2', sender: 'Tú', content: 'Perfecto, comparto la ruta.', time: '18:15', incoming: false },
      { id: 'm3', sender: 'Ana', content: 'Gracias, avisamos al grupo.', time: '18:18', incoming: true },
    ],
  },
  'chat-3': {
    id: 'chat-3',
    name: 'Sofía Delgado',
    avatar: 'SD',
    lastActivity: 'Hoy',
    time: '17:05',
    unreadCount: 0,
    messagesCount: 24,
    unread: false,
    messages: [
      { id: 'm1', sender: 'Sofía', content: 'Te comparto la propuesta de brigada.', time: '16:52', incoming: true },
      { id: 'm2', sender: 'Tú', content: 'La reviso y te respondo en un rato.', time: '16:55', incoming: false },
      { id: 'm3', sender: 'Sofía', content: 'Va perfecto, gracias.', time: '17:05', incoming: true },
    ],
  },
};

const normalizeText = (value) => String(value || '').toLowerCase();

const normalizeLinkUrl = (value) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(candidate).toString();
  } catch (error) {
    return '';
  }
};

const getLinkLabel = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./i, '');
  } catch (error) {
    return url;
  }
};

const detectContentTypes = ({ text, mediaReferences, linkReference }) => {
  const types = [];

  if (String(text || '').trim()) types.push('texto');
  if ((mediaReferences || []).some((media) => String(media.type || '').startsWith('image/'))) types.push('imágenes');
  if ((mediaReferences || []).some((media) => String(media.type || '').startsWith('video/'))) types.push('vídeos');
  if (linkReference?.url) types.push('enlaces');

  return types.length > 0 ? types : ['texto'];
};

const FEED_PRIVACY_OPTIONS = [
  {
    value: 'publico',
    label: 'Público',
    description: 'Visible dentro del ámbito correspondiente de Ciudadan.',
  },
  {
    value: 'contactos',
    label: 'Mis contactos',
    description: 'Visible para los contactos del usuario.',
  },
  {
    value: 'solo_yo',
    label: 'Solo yo',
    description: 'Visible únicamente para el propietario.',
  },
];

const getFeedPrivacyLabel = (privacy) => FEED_PRIVACY_OPTIONS.find((option) => option.value === privacy)?.label || 'Público';

const getFeedPrivacyDescription = (privacy) => FEED_PRIVACY_OPTIONS.find((option) => option.value === privacy)?.description || FEED_PRIVACY_OPTIONS[0].description;

const createBaseFeedPost = ({
  id,
  author,
  authorInitials,
  body,
  publishedAt,
  mediaReferences = [],
  linkReference = null,
  tags = [],
  ownerId = 'ciudadan',
  kind = 'seed',
  privacy = 'publico',
}) => ({
  id,
  author,
  authorInitials,
  body,
  publishedAt,
  mediaReferences,
  linkReference,
  tags,
  ownerId,
  kind,
  privacy,
  contentTypes: detectContentTypes({ text: body, mediaReferences, linkReference }),
  proof: {
    algorithm: 'SHA-256',
    digest: '',
  },
  likesCount: 0,
  sharesCount: 0,
  savesCount: 0,
  likedByCurrentUser: false,
  savedByCurrentUser: false,
  comments: [],
});

const FEED_STORAGE_KEY = 'ciudadan_social_feed_posts_v1';
const FEED_DRAFT_KEY = 'ciudadan_social_feed_draft_v1';
const GOOGLE_DRIVE_STORAGE_KEY = 'ciudadan_social_google_drive_v1';
const MEDIA_STORAGE_PROVIDER_ID = 'google-drive';

const getMediaVerificationKey = (postId, mediaId) => `${postId}::${mediaId}`;

const formatFeedTime = (value) => {
  try {
    return new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch (error) {
    return new Date(value).toLocaleString();
  }
};

const SocialSectionPage = ({
  sectionKey = 'asamblea',
  title,
  description,
  note,
  primaryActionLabel,
  primaryActionPath = '/comunidad',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { isAuthenticated, user, loginWithRedirect } = useAuth0();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const feedFileInputRef = useRef(null);

  const query = useMemo(() => new URLSearchParams(location.search).get('q') || '', [location.search]);
  const scopes = SEARCH_SCOPES[sectionKey] || SEARCH_SCOPES.asamblea;
  const baseItems = MOCK_CONTENT_BY_SECTION[sectionKey] || MOCK_CONTENT_BY_SECTION.asamblea;
  const selectedThreadId = sectionKey === 'chats' ? params.conversationId || params.threadId || null : null;
  const selectedThread = selectedThreadId ? CHAT_THREADS[selectedThreadId] || null : null;
  const feedSeedPosts = useMemo(() => ([
    createBaseFeedPost({
      id: 'seed-feed-1',
      author: 'Ciudadan Social',
      authorInitials: 'CS',
      body: 'Convocatoria de huerto urbano para este fin de semana. Si te interesa colaborar, revisa el detalle y confirma asistencia.',
      publishedAt: new Date(Date.now() - (1000 * 60 * 45)).toISOString(),
      tags: ['publicacion', 'comunidad'],
      ownerId: 'ciudadan',
      kind: 'seed',
    }),
    createBaseFeedPost({
      id: 'seed-feed-2',
      author: 'Distrito Centro',
      authorInitials: 'DC',
      body: 'Galería de la ronda de intercambio local. Las imágenes quedan referenciadas sin que Ciudadan tenga que guardar el archivo original.',
      publishedAt: new Date(Date.now() - (1000 * 60 * 120)).toISOString(),
      mediaReferences: [
        { id: 'seed-img-1', name: 'intercambio-local.jpg', type: 'image/jpeg', size: 0, sha256: 'pending' },
      ],
      tags: ['contenido', 'intercambio'],
      ownerId: 'ciudadan',
      kind: 'seed',
    }),
    createBaseFeedPost({
      id: 'seed-feed-3',
      author: 'Mesa de Coordinación',
      authorInitials: 'MC',
      body: 'Documento de trabajo publicado junto con enlace a la propuesta completa.',
      publishedAt: new Date(Date.now() - (1000 * 60 * 240)).toISOString(),
      linkReference: {
        url: 'https://ciudadan.org/',
        title: 'Ver propuesta',
      },
      tags: ['enlace', 'propuesta'],
      ownerId: 'ciudadan',
      kind: 'seed',
    }),
  ]), []);

  const [feedDraftText, setFeedDraftText] = useState('');
  const [feedDraftLink, setFeedDraftLink] = useState('');
  const [feedDraftPrivacy, setFeedDraftPrivacy] = useState('publico');
  const [feedAttachments, setFeedAttachments] = useState([]);
  const [feedPosts, setFeedPosts] = useState(() => {
    if (typeof window === 'undefined') {
      return feedSeedPosts;
    }

    try {
      const raw = window.localStorage.getItem(FEED_STORAGE_KEY);
      if (!raw) return feedSeedPosts;

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : feedSeedPosts;
    } catch (error) {
      return feedSeedPosts;
    }
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [feedMessage, setFeedMessage] = useState('');
  const [commentDrafts, setCommentDrafts] = useState({});
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState(null);
  const [editDialog, setEditDialog] = useState({ open: false, postId: null, text: '', link: '' });
  const [isDriveReady, setIsDriveReady] = useState(false);
  const [isDriveConnecting, setIsDriveConnecting] = useState(false);
  const [driveMessage, setDriveMessage] = useState('');
  const [driveConnection, setDriveConnection] = useState(() => {
    if (typeof window === 'undefined') {
      return { connected: false, folders: null, connectedAt: null };
    }

    try {
      const raw = window.localStorage.getItem(GOOGLE_DRIVE_STORAGE_KEY);
      if (!raw) return { connected: false, folders: null, connectedAt: null };

      const parsed = JSON.parse(raw);
      return {
        connected: Boolean(parsed?.connected),
        folders: parsed?.folders || null,
        connectedAt: parsed?.connectedAt || null,
      };
    } catch (error) {
      return { connected: false, folders: null, connectedAt: null };
    }
  });
  const [driveSession, setDriveSession] = useState({ accessToken: '', expiresAt: 0 });
  const [mediaVerification, setMediaVerification] = useState({});
  const verifiedLocalMediaKeysRef = useRef(new Set());

  const googleDriveClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || process.env.REACT_APP_GOOGLE_OAUTH_CLIENT_ID || '';

  const filteredItems = useMemo(() => {
    const q = normalizeText(query).trim();
    if (!q) return baseItems;

    return baseItems.filter((item) => {
      const haystack = [item.title, item.subtitle, ...(item.tags || [])]
        .map(normalizeText)
        .join(' ');
      return haystack.includes(q);
    });
  }, [baseItems, query]);

  const filteredThreads = useMemo(() => {
    if (sectionKey !== 'chats') return [];

    const q = normalizeText(query).trim();
    const threads = Object.values(CHAT_THREADS);

    if (!q) return threads;

    return threads.filter((thread) => {
      const haystack = [thread.name, thread.lastActivity, String(thread.unreadCount), String(thread.messagesCount), ...(thread.messages || []).map((message) => message.content)]
        .map(normalizeText)
        .join(' ');
      return haystack.includes(q);
    });
  }, [query, sectionKey]);

  const goToCiudadan = () => {
    navigate('/');
  };

  const goToCommunityPath = (path) => {
    navigate(path);
  };

  const openThread = (threadId) => {
    navigate(`/comunidad/chats/${threadId}`);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(GOOGLE_DRIVE_STORAGE_KEY, JSON.stringify(driveConnection));
  }, [driveConnection]);

  useEffect(() => {
    let mounted = true;

    loadGoogleIdentityScript()
      .then(() => {
        if (mounted) {
          setIsDriveReady(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setIsDriveReady(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const getDriveAccessToken = async ({ forceConsent = false } = {}) => {
    const hasActiveToken = driveSession.accessToken && (Date.now() < (driveSession.expiresAt - 30000));
    if (hasActiveToken && !forceConsent) {
      return driveSession.accessToken;
    }

    const session = await MediaStorageService.connect(MEDIA_STORAGE_PROVIDER_ID, {
      clientId: googleDriveClientId,
      prompt: forceConsent ? 'consent' : '',
    });

    setDriveSession(session);
    return session.accessToken;
  };

  // Silent-first token retry: reuse the cached token, and only prompt for consent
  // again if the provider reports the token actually expired mid-operation.
  const withDriveTokenRetry = async (action) => {
    try {
      const token = await getDriveAccessToken();
      return await action(token);
    } catch (error) {
      if (error instanceof DriveApiError && error.code === DRIVE_ERROR_CODES.TOKEN_EXPIRED) {
        const refreshedToken = await getDriveAccessToken({ forceConsent: true });
        return action(refreshedToken);
      }
      throw error;
    }
  };

  const connectGoogleDrive = async () => {
    setDriveMessage('');
    setIsDriveConnecting(true);

    try {
      const accessToken = await getDriveAccessToken({ forceConsent: true });
      const folders = await MediaStorageService.ensureFolderStructure(MEDIA_STORAGE_PROVIDER_ID, accessToken);

      setDriveConnection({
        connected: true,
        folders,
        connectedAt: new Date().toISOString(),
      });
      setDriveMessage('Google Drive conectado y estructura Ciudadan/Social/Media verificada.');
    } catch (error) {
      setDriveMessage(error instanceof DriveApiError
        ? describeDriveError(error)
        : 'No se pudo conectar Google Drive. Verifica autorización y configuración del Client ID.');
    } finally {
      setIsDriveConnecting(false);
    }
  };

  const disconnectGoogleDrive = () => {
    setDriveSession({ accessToken: '', expiresAt: 0 });
    setDriveConnection({ connected: false, folders: null, connectedAt: null });
    setDriveMessage('Conexión de Google Drive cerrada en este navegador.');
  };

  const chatNavItems = [
    { key: 'conversaciones', label: 'Conversaciones', path: '/comunidad/chats' },
    { key: 'feed', label: 'Feed', path: '/comunidad/feed' },
    { key: 'contactos', label: 'Contactos', path: '/comunidad/contactos' },
    { key: 'grupos', label: 'Grupos', path: '/comunidad/grupos' },
    { key: 'ciudadan', label: 'Ciudadan', path: '/' },
  ];

  const renderChatNavigationBar = ({ dense = false } = {}) => (
    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mt: dense ? 1 : 1.5 }}>
      {chatNavItems.map((item) => {
        const isActive = item.path === '/comunidad/chats'
          ? location.pathname.startsWith('/comunidad/chats')
          : location.pathname === item.path;

        return (
          <Button
            key={item.key}
            size="small"
            variant={isActive ? 'contained' : 'outlined'}
            onClick={() => goToCommunityPath(item.path)}
            sx={{
              minHeight: 34,
              textTransform: 'none',
              fontWeight: 700,
              color: isActive ? '#111' : '#222',
              background: isActive ? '#fff200' : '#fff',
              borderColor: 'rgba(122, 63, 242, 0.28)',
              '&:hover': {
                background: isActive ? '#ffea00' : 'rgba(122, 63, 242, 0.05)',
                borderColor: '#7a3ff2',
              },
            }}
          >
            {item.label}
          </Button>
        );
      })}
    </Stack>
  );

  const renderDriveConnectionPanel = ({ compact = false } = {}) => (
    <Box
      sx={{
        mt: compact ? 1 : 1.5,
        p: compact ? 1.25 : 1.5,
        borderRadius: 2,
        border: '1px solid rgba(122, 63, 242, 0.2)',
        background: 'linear-gradient(135deg, rgba(255,242,0,0.15) 0%, rgba(122,63,242,0.06) 100%)',
      }}
    >
      <Stack spacing={1}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {driveConnection.connected ? (
            <CloudDoneIcon fontSize="small" sx={{ color: '#2f7d32' }} />
          ) : (
            <CloudOffIcon fontSize="small" sx={{ color: '#7a3ff2' }} />
          )}
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#111' }}>
            Almacenamiento externo (Media Service)
          </Typography>
        </Box>

        <Stack spacing={0.25}>
          {MEDIA_STORAGE_PROVIDERS.map((provider) => {
            const isImplemented = MediaStorageService.isImplemented(provider.id);
            const statusLabel = isImplemented
              ? (driveConnection.connected ? 'Conectado' : 'No conectado')
              : 'Próximamente';

            return (
              <Typography
                key={provider.id}
                variant="caption"
                sx={{ color: isImplemented ? '#111' : '#888', fontWeight: isImplemented ? 700 : 500 }}
              >
                {provider.label} — {statusLabel}
              </Typography>
            );
          })}
        </Stack>

        <Typography variant="caption" sx={{ color: '#555' }}>
          Alcance mínimo usado: drive.file. Ciudadan crea y reutiliza Ciudadan/Social/Media automáticamente.
        </Typography>

        {driveConnection.folders?.mediaId ? (
          <Typography variant="caption" sx={{ color: '#555' }}>
            Carpeta activa: Ciudadan/Social/Media ({driveConnection.folders.mediaId})
          </Typography>
        ) : null}

        {!googleDriveClientId ? (
          <Typography variant="caption" sx={{ color: '#8a1f11', fontWeight: 700 }}>
            Falta variable REACT_APP_GOOGLE_CLIENT_ID en el frontend.
          </Typography>
        ) : null}

        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button
            size="small"
            variant="contained"
            disabled={isDriveConnecting || !isDriveReady || !googleDriveClientId}
            onClick={connectGoogleDrive}
            startIcon={isDriveConnecting ? <CloudSyncIcon fontSize="small" /> : <CloudDoneIcon fontSize="small" />}
            sx={{
              minHeight: 34,
              textTransform: 'none',
              fontWeight: 700,
              background: '#fff200',
              color: '#111',
              border: '1px solid rgba(122, 63, 242, 0.22)',
              '&:hover': { background: '#ffea00' },
            }}
          >
            {driveConnection.connected ? 'Reconectar Drive' : 'Conectar Drive'}
          </Button>
          {driveConnection.connected ? (
            <Button
              size="small"
              variant="outlined"
              onClick={disconnectGoogleDrive}
              sx={{
                minHeight: 34,
                textTransform: 'none',
                fontWeight: 700,
                color: '#111',
                borderColor: 'rgba(122, 63, 242, 0.28)',
              }}
            >
              Desconectar
            </Button>
          ) : null}
        </Stack>

        {driveMessage ? (
          <Typography variant="caption" sx={{ color: driveMessage.includes('conect') ? '#2f7d32' : '#7a3ff2', fontWeight: 700 }}>
            {driveMessage}
          </Typography>
        ) : null}
      </Stack>
    </Box>
  );

  useEffect(() => {
    if (sectionKey !== 'feed' || typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(feedPosts));
    } catch (error) {
      // Keep the feed usable even if storage is temporarily unavailable.
    }
  }, [feedPosts, sectionKey]);

  // 2.11: verification runs silently in normal conditions. Checking the on-device
  // copy is free (no network/token), so it can happen automatically; only a
  // mismatch needs to surface anything in the UI.
  useEffect(() => {
    if (sectionKey !== 'feed') return undefined;

    let cancelled = false;

    const runSilentLocalVerification = async () => {
      for (const post of feedPosts) {
        for (const media of post.mediaReferences || []) {
          const key = getMediaVerificationKey(post.id, media.id);
          if (verifiedLocalMediaKeysRef.current.has(key) || !media.localCopy?.available) continue;
          verifiedLocalMediaKeysRef.current.add(key);

          // eslint-disable-next-line no-await-in-loop
          const result = await verifyLocalMediaCopy({ media });
          if (cancelled) return;

          setMediaVerification((current) => ({
            ...current,
            [key]: { ...result, scope: 'local', checkedAt: Date.now() },
          }));
        }
      }
    };

    runSilentLocalVerification();

    return () => {
      cancelled = true;
    };
  }, [feedPosts, sectionKey]);

  useEffect(() => {
    if (sectionKey !== 'feed' || typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(FEED_DRAFT_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (typeof parsed?.text === 'string') {
        setFeedDraftText(parsed.text);
      }
      if (typeof parsed?.link === 'string') {
        setFeedDraftLink(parsed.link);
      }
      if (typeof parsed?.privacy === 'string') {
        setFeedDraftPrivacy(parsed.privacy);
      }
    } catch (error) {
      // Draft restore is best-effort only.
    }
  }, [sectionKey]);

  useEffect(() => {
    if (sectionKey !== 'feed' || typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(FEED_DRAFT_KEY, JSON.stringify({ text: feedDraftText, link: feedDraftLink, privacy: feedDraftPrivacy }));
    } catch (error) {
      // Draft persistence is best-effort only.
    }
  }, [feedDraftLink, feedDraftPrivacy, feedDraftText, sectionKey]);

  const currentUserOwnerId = user?.sub || user?.email || user?.name || 'anonymous';

  const visibleFeedPosts = useMemo(() => {
    if (sectionKey !== 'feed') return [];

    const q = normalizeText(query).trim();
    const posts = [...feedPosts].sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime());
    const canSeePost = (post) => {
      if (post.privacy === 'solo_yo') {
        return post.ownerId === currentUserOwnerId;
      }

      if (post.privacy === 'contactos') {
        return isAuthenticated || post.ownerId === currentUserOwnerId;
      }

      return true;
    };

    const availablePosts = posts.filter(canSeePost);

    if (!q) return availablePosts;

    return availablePosts.filter((post) => {
      const haystack = [
        post.author,
        post.body,
        post.linkReference?.url,
        post.linkReference?.title,
        ...(post.tags || []),
        ...(post.mediaReferences || []).map((media) => media.name),
        ...(post.comments || []).map((comment) => comment.text),
      ]
        .map(normalizeText)
        .join(' ');
      return haystack.includes(q);
    });
  }, [currentUserOwnerId, feedPosts, isAuthenticated, query, sectionKey]);

  const upsertFeedPost = (postId, updater) => {
    setFeedPosts((current) => current.map((post) => (post.id === postId ? updater(post) : post)));
  };

  const clearEditDialog = () => setEditDialog({ open: false, postId: null, text: '', link: '' });

  const resetFeedComposer = () => {
    setFeedDraftText('');
    setFeedAttachments([]);
    setFeedMessage('');

    if (feedFileInputRef.current) {
      feedFileInputRef.current.value = '';
    }
  };

  const handleFeedFiles = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Copia local inmediata (2.6): el usuario conserva su archivo aunque aún no se publique ni suba a Drive.
    files.forEach((file) => {
      saveLocalMediaCopy(buildLocalMediaKey(file), file).catch(() => {});
    });

    setFeedAttachments((current) => [...current, ...files]);
    if (feedFileInputRef.current) {
      feedFileInputRef.current.value = '';
    }
  };

  const removeFeedAttachment = (indexToRemove) => {
    setFeedAttachments((current) => current.filter((_, index) => index !== indexToRemove));
  };

  const togglePostLike = (postId) => {
    upsertFeedPost(postId, (post) => {
      const likedByCurrentUser = !post.likedByCurrentUser;
      return {
        ...post,
        likedByCurrentUser,
        likesCount: Math.max(0, Number(post.likesCount || 0) + (likedByCurrentUser ? 1 : -1)),
      };
    });
  };

  const togglePostSave = (postId) => {
    upsertFeedPost(postId, (post) => {
      const savedByCurrentUser = !post.savedByCurrentUser;
      return {
        ...post,
        savedByCurrentUser,
        savesCount: Math.max(0, Number(post.savesCount || 0) + (savedByCurrentUser ? 1 : -1)),
      };
    });
  };

  const toggleComments = (postId) => {
    setExpandedCommentsPostId((current) => (current === postId ? null : postId));
  };

  const addCommentToPost = (postId) => {
    const draft = String(commentDrafts[postId] || '').trim();
    if (!draft) return;

    const commenterName = user?.name || user?.nickname || user?.email || 'Ciudadan';
    const commenterInitials = commenterName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'C';

    upsertFeedPost(postId, (post) => ({
      ...post,
      comments: [
        ...(post.comments || []),
        {
          id: `comment-${Date.now()}`,
          author: commenterName,
          authorInitials: commenterInitials,
          text: draft,
          createdAt: new Date().toISOString(),
        },
      ],
    }));

    setCommentDrafts((current) => ({
      ...current,
      [postId]: '',
    }));
    setExpandedCommentsPostId(postId);
  };

  const sharePost = async (post) => {
    const shareText = `${post.author}: ${post.body}`.trim();
    const shareUrl = post.linkReference?.url || window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Ciudadan Feed',
          text: shareText,
          url: shareUrl,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      }

      upsertFeedPost(post.id, (currentPost) => ({
        ...currentPost,
        sharesCount: Number(currentPost.sharesCount || 0) + 1,
      }));
      setFeedMessage('Publicación compartida.');
    } catch (error) {
      setFeedMessage('No se pudo compartir esta publicación.');
    }
  };

  const openEditDialog = (post) => {
    setEditDialog({
      open: true,
      postId: post.id,
      text: post.body || '',
      link: post.linkReference?.url || '',
    });
  };

  const saveEditedPost = () => {
    const text = editDialog.text.trim();
    const normalizedLink = normalizeLinkUrl(editDialog.link);

    upsertFeedPost(editDialog.postId, (post) => ({
      ...post,
      body: text,
      linkReference: normalizedLink ? {
        url: normalizedLink,
        title: getLinkLabel(normalizedLink),
      } : null,
      contentTypes: detectContentTypes({
        text,
        mediaReferences: post.mediaReferences || [],
        linkReference: normalizedLink ? { url: normalizedLink } : null,
      }),
      editedAt: new Date().toISOString(),
    }));

    clearEditDialog();
    setFeedMessage('Publicación actualizada.');
  };

  const deletePost = (postId) => {
    const confirmed = window.confirm('¿Eliminar esta publicación? Esta acción no se puede deshacer.');
    if (!confirmed) return;

    setFeedPosts((current) => current.filter((post) => post.id !== postId));
    setExpandedCommentsPostId((current) => (current === postId ? null : current));
    setFeedMessage('Publicación eliminada.');
  };

  // 2.6: si se borra la copia local, la publicación sigue funcionando gracias a la copia externa (Drive).
  const removeLocalMediaCopy = async (postId, mediaId) => {
    const post = feedPosts.find((item) => item.id === postId);
    const media = post?.mediaReferences?.find((item) => item.id === mediaId);
    if (!media?.localCopy?.key) return;

    await deleteLocalMediaCopy(media.localCopy.key);

    upsertFeedPost(postId, (currentPost) => ({
      ...currentPost,
      mediaReferences: (currentPost.mediaReferences || []).map((item) => (
        item.id === mediaId
          ? { ...item, localCopy: { ...item.localCopy, available: false } }
          : item
      )),
    }));

    // La copia local ya no existe: descarta cualquier verificación previa basada en ella.
    const verificationKey = getMediaVerificationKey(postId, mediaId);
    verifiedLocalMediaKeysRef.current.delete(verificationKey);
    setMediaVerification((current) => {
      const next = { ...current };
      delete next[verificationKey];
      return next;
    });

    setFeedMessage('Copia local eliminada. La publicación sigue disponible gracias a la copia en Google Drive.');
  };

  // 2.10/2.11: la verificación remota exige el token del propietario; en este MVP,
  // sin backend intermediario, solo puede ejecutarla el propio dueño de la publicación.
  const verifyMediaAgainstProvider = async (post, media) => {
    const verificationKey = getMediaVerificationKey(post.id, media.id);

    if (post.ownerId !== currentUserOwnerId) {
      setMediaVerification((current) => ({
        ...current,
        [verificationKey]: { status: MEDIA_VERIFICATION_STATUS.UNAVAILABLE, scope: 'drive', checkedAt: Date.now() },
      }));
      return;
    }

    setMediaVerification((current) => ({
      ...current,
      [verificationKey]: { status: MEDIA_VERIFICATION_STATUS.CHECKING, scope: 'drive' },
    }));

    try {
      const result = await withDriveTokenRetry((token) => verifyProviderMediaCopy({
        media,
        providerId: MEDIA_STORAGE_PROVIDER_ID,
        accessToken: token,
      }));

      setMediaVerification((current) => ({
        ...current,
        [verificationKey]: { ...result, scope: 'drive', checkedAt: Date.now() },
      }));
    } catch (error) {
      setMediaVerification((current) => ({
        ...current,
        [verificationKey]: { status: MEDIA_VERIFICATION_STATUS.ERROR, scope: 'drive', checkedAt: Date.now() },
      }));
    }
  };

  const handleFeedPublish = async () => {
    const trimmedText = feedDraftText.trim();
    const normalizedLink = normalizeLinkUrl(feedDraftLink);

    if (!isAuthenticated) {
      await loginWithRedirect({
        appState: {
          returnTo: `${location.pathname}${location.search}`,
        },
      });
      return;
    }

    if (!trimmedText && feedAttachments.length === 0) {
      setFeedMessage('Escribe algo o adjunta al menos un medio antes de publicar.');
      return;
    }

    if (feedAttachments.length > 0 && !driveConnection.connected) {
      setFeedMessage('Para publicar imágenes o vídeos en el MVP debes conectar Google Drive primero.');
      return;
    }

    setIsPublishing(true);
    setFeedMessage('');

    try {
      const mediaReferences = [];
      let mediaFolderId = driveConnection.folders?.mediaId || null;

      if (feedAttachments.length > 0) {
        const folders = await withDriveTokenRetry((token) => MediaStorageService.ensureFolderStructure(MEDIA_STORAGE_PROVIDER_ID, token));
        mediaFolderId = folders.mediaId;
        setDriveConnection((current) => ({
          ...current,
          connected: true,
          folders,
          connectedAt: current.connectedAt || new Date().toISOString(),
        }));
      }

      for (const file of feedAttachments) {
        const localKey = buildLocalMediaKey(file);
        // Rama local del flujo 2.6: se asegura la copia local antes/junto con la copia externa.
        // eslint-disable-next-line no-await-in-loop
        await saveLocalMediaCopy(localKey, file);
        // 2.8: archivo original -> SHA-256 -> hash -> firma del usuario -> registro asociado.
        // eslint-disable-next-line no-await-in-loop
        const mediaProof = await createProof({ file, signerId: currentUserOwnerId });
        let driveFile = null;

        if (mediaFolderId) {
          // Rama externa (Media Service -> proveedor Google Drive), sin acoplar el Feed al proveedor.
          // eslint-disable-next-line no-await-in-loop
          driveFile = await withDriveTokenRetry((token) => MediaStorageService.uploadFile(MEDIA_STORAGE_PROVIDER_ID, {
            accessToken: token,
            folderId: mediaFolderId,
            file,
          }));
        }

        mediaReferences.push({
          id: driveFile?.remoteId || localKey,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          lastModified: file.lastModified,
          // 2.9: lo que guarda Ciudadan por medio (proveedor, identificador, tipo, tamaño, hash, firma).
          provider: driveFile ? MEDIA_STORAGE_PROVIDER_ID : null,
          remoteId: driveFile?.remoteId || null,
          sha256: mediaProof.hash,
          proof: mediaProof,
          localCopy: { available: true, key: localKey },
          driveCopy: driveFile ? {
            available: true,
            fileId: driveFile.remoteId,
            webViewLink: driveFile.webViewLink,
            webContentLink: driveFile.webContentLink,
          } : { available: false, fileId: null, webViewLink: null, webContentLink: null },
        });
      }

      const linkReference = normalizedLink
        ? {
            url: normalizedLink,
            title: getLinkLabel(normalizedLink),
          }
        : null;

      const canonicalPayload = JSON.stringify({
        text: trimmedText,
        link: linkReference,
        privacy: feedDraftPrivacy,
        media: mediaReferences.map((media) => ({
          name: media.name,
          type: media.type,
          size: media.size,
          sha256: media.sha256,
          provider: media.provider,
          remoteId: media.remoteId,
        })),
        author: user?.sub || user?.email || user?.name || 'anonymous',
      });

      // 2.8: la publicación completa también queda firmada e identificada con su propio registro.
      const publicationProof = await createProof({ text: canonicalPayload, signerId: currentUserOwnerId });
      const publishedAt = new Date().toISOString();
      const authorName = user?.name || user?.nickname || user?.email || 'Ciudadan';
      const authorInitials = authorName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('') || 'C';

      const nextPost = {
        id: `post-${publishedAt}`,
        author: authorName,
        authorInitials,
        body: trimmedText,
        tags: ['publicacion', 'social'],
        publishedAt,
        mediaReferences,
        linkReference,
        contentTypes: detectContentTypes({ text: trimmedText, mediaReferences, linkReference }),
        ownerId: currentUserOwnerId,
        privacy: feedDraftPrivacy,
        proof: {
          algorithm: publicationProof.hashAlgorithm,
          digest: publicationProof.hash,
          signatureAlgorithm: publicationProof.signatureAlgorithm,
          signerId: publicationProof.signerId,
          signedAt: publicationProof.signedAt,
          signature: publicationProof.signature,
        },
        kind: 'user',
        likesCount: 0,
        sharesCount: 0,
        savesCount: 0,
        likedByCurrentUser: false,
        savedByCurrentUser: false,
        comments: [],
      };

      setFeedPosts((current) => [nextPost, ...current]);
      resetFeedComposer();
      setFeedDraftPrivacy('publico');
      setFeedMessage('Publicación guardada con privacidad, referencia y huella SHA-256.');
    } catch (error) {
      setFeedMessage(error instanceof DriveApiError
        ? describeDriveError(error)
        : 'No se pudo publicar en este momento. Intenta nuevamente.');
    } finally {
      setIsPublishing(false);
    }
  };

  if (sectionKey === 'chats') {
    const showThreadList = !isMobile || !selectedThread;

    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #fffde7 0%, #ffffff 45%, #f7f7f7 100%)',
          color: '#111',
          px: { xs: 1, md: 2 },
          py: { xs: 1, md: 2 },
        }}
      >
        <Container maxWidth="xl" sx={{ height: '100%' }}>
          <Paper
            elevation={2}
            sx={{
              minHeight: { xs: 'calc(100dvh - 132px)', md: 'calc(100vh - 128px)' },
              borderRadius: 3,
              overflow: 'hidden',
              background: '#ffffff',
              border: '1px solid rgba(109, 110, 113, 0.22)',
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '360px 1fr' },
                height: '100%',
                minHeight: { xs: 'calc(100dvh - 132px)', md: 'calc(100vh - 128px)' },
              }}
            >
              <Box
                sx={{
                  display: { xs: showThreadList ? 'flex' : 'none', md: 'flex' },
                  flexDirection: 'column',
                  borderRight: { xs: 'none', md: '1px solid rgba(109, 110, 113, 0.18)' },
                  minHeight: 0,
                  background: 'linear-gradient(180deg, #fffef3 0%, #ffffff 100%)',
                }}
              >
                <Box sx={{ p: { xs: 1.5, md: 2 }, borderBottom: '1px solid rgba(109, 110, 113, 0.12)' }}>
                  <Typography variant="overline" sx={{ color: '#8a7a00', letterSpacing: 2, fontWeight: 800 }}>
                    Chats
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: '#111' }}>
                    Conversaciones
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', mt: 0.5 }}>
                    Lista de conversaciones, mensajes no leídos y actividad reciente.
                  </Typography>
                  {isMobile ? (
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#8a7a00', fontWeight: 700 }}>
                      En móvil, usa la barra de navegación para moverte entre conversaciones y secciones.
                    </Typography>
                  ) : null}
                  {renderChatNavigationBar()}
                  {renderDriveConnectionPanel({ compact: true })}
                </Box>

                <Box sx={{ flex: 1, overflowY: 'auto' }}>
                  <List disablePadding>
                    {filteredThreads.map((thread) => {
                      const isActive = selectedThreadId === thread.id;
                      return (
                        <ListItemButton
                          key={thread.id}
                          onClick={() => openThread(thread.id)}
                          selected={isActive}
                          sx={{
                            px: { xs: 1.5, md: 2 },
                            py: 1.5,
                            borderBottom: '1px solid rgba(109, 110, 113, 0.08)',
                            alignItems: 'flex-start',
                            '&.Mui-selected': {
                              backgroundColor: '#fff7c8',
                            },
                          }}
                        >
                          <ListItemAvatar sx={{ minWidth: 52, mt: 0.5 }}>
                            <Badge
                              color="warning"
                              variant={thread.unread ? 'standard' : 'dot'}
                              badgeContent={thread.unreadCount || undefined}
                              overlap="circular"
                            >
                              <Avatar sx={{ bgcolor: thread.unread ? '#fff200' : '#e7e7e7', color: '#111', fontWeight: 800 }}>
                                {thread.avatar}
                              </Avatar>
                            </Badge>
                          </ListItemAvatar>

                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                                <Typography
                                  variant="subtitle2"
                                  sx={{
                                    color: '#111',
                                    fontWeight: thread.unread ? 800 : 700,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {thread.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#777', flexShrink: 0 }}>
                                  {thread.time}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 0.5 }}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: thread.unread ? '#111' : '#555',
                                    fontWeight: thread.unread ? 700 : 400,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {thread.lastActivity}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#777' }}>
                                  {thread.messagesCount} mensajes · {thread.unreadCount} no leídos
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItemButton>
                      );
                    })}

                    {filteredThreads.length === 0 ? (
                      <Box sx={{ p: 2 }}>
                        <Typography variant="body2" sx={{ color: '#c8d9e5' }}>
                          No hay conversaciones para "{query}".
                        </Typography>
                      </Box>
                    ) : null}
                  </List>
                </Box>
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
                }}
              >
                {selectedThread ? (
                  <>
                    <Box
                      sx={{
                        px: { xs: 1.5, md: 2 },
                        py: 1.5,
                        borderBottom: '1px solid rgba(109, 110, 113, 0.12)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        backgroundColor: '#fff',
                      }}
                    >
                      {renderChatNavigationBar({ dense: true })}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0, flex: 1 }}>
                        <Avatar sx={{ bgcolor: '#fff200', color: '#111', fontWeight: 800 }}>
                          {selectedThread.avatar}
                        </Avatar>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="subtitle1" sx={{ color: '#111', fontWeight: 800 }} noWrap>
                            {selectedThread.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#666' }}>
                            {selectedThread.messagesCount} mensajes · última actividad {selectedThread.lastActivity}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 1.5, md: 2.5 } }}>
                      <Typography variant="body2" sx={{ color: '#666', mb: 1.5 }}>
                        Conversación centrada en la identidad Ciudadan, sin salir del shell de Social.
                      </Typography>
                      <Stack spacing={1.25}>
                        {selectedThread.messages.map((message) => (
                          <Box
                            key={message.id}
                            sx={{
                              display: 'flex',
                              justifyContent: message.incoming ? 'flex-start' : 'flex-end',
                            }}
                          >
                            <Box
                              sx={{
                                maxWidth: { xs: '92%', md: '72%' },
                                px: 1.5,
                                py: 1,
                                borderRadius: 3,
                                backgroundColor: message.incoming ? '#f5f5f5' : '#fff200',
                                border: '1px solid rgba(109, 110, 113, 0.14)',
                              }}
                            >
                              <Typography variant="caption" sx={{ color: '#666' }}>
                                {message.sender} · {message.time}
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#111', mt: 0.4 }}>
                                {message.content}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Stack>
                    </Box>

                    <Box
                      sx={{
                        px: { xs: 1.5, md: 2 },
                        py: 1.5,
                        borderTop: '1px solid rgba(109, 110, 113, 0.12)',
                        display: 'flex',
                        gap: 1,
                        alignItems: 'center',
                        backgroundColor: '#fff',
                      }}
                    >
                      <Box
                        component="input"
                        placeholder="Escribe un mensaje..."
                        sx={{
                          flex: 1,
                          border: '1px solid rgba(109, 110, 113, 0.22)',
                          backgroundColor: '#fff',
                          color: '#111',
                          borderRadius: 999,
                          px: 2,
                          py: 1.1,
                          outline: 'none',
                          minWidth: 0,
                        }}
                      />
                      <IconButton sx={{ bgcolor: '#fff200', color: '#111', border: '1px solid rgba(109, 110, 113, 0.22)', '&:hover': { bgcolor: '#ffea00' } }}>
                        <SendIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </>
                ) : (
                  <Box
                    sx={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      px: 3,
                      py: 6,
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="h5" sx={{ color: '#111', fontWeight: 800 }}>
                      Selecciona una conversación
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#666', mt: 1, maxWidth: 460 }}>
                      La conversación ocupará este espacio principal. En móvil, abre una conversación desde la lista para entrar en pantalla completa.
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Paper>
        </Container>
      </Box>
    );
  }

  if (sectionKey === 'feed') {
    const feedComposerLocked = !isAuthenticated;

    return (
      <Box
        sx={{
          minHeight: '100vh',
          py: { xs: 2, md: 4 },
          px: { xs: 1.25, sm: 2 },
          background: 'linear-gradient(180deg, #fffde7 0%, #ffffff 45%, #f7f7f7 100%)',
          color: '#111',
        }}
      >
        <Container maxWidth="md" disableGutters={isMobile}>
          <Stack spacing={2}>
            <Paper
              elevation={2}
              sx={{
                p: { xs: 2, md: 3 },
                borderRadius: { xs: 2, md: 3 },
                background: 'linear-gradient(180deg, rgba(255,242,0,0.16) 0%, #ffffff 45%, rgba(122,63,242,0.06) 100%)',
                border: '1px solid rgba(122, 63, 242, 0.18)',
              }}
            >
              <Stack spacing={2}>
                <Box>
                  <Typography variant="overline" sx={{ color: '#7a3ff2', letterSpacing: 2, fontWeight: 800 }}>
                    Feed
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, color: '#111' }}>
                    Publicar en Ciudadan
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#555', mt: 0.75, lineHeight: 1.7 }}>
                    El usuario conserva sus medios. Ciudadan conserva la publicación, las referencias, la privacidad elegida y la huella criptográfica para verificar su integridad.
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mt: 1.25 }}>
                    {['texto', 'imágenes', 'vídeos', 'enlaces'].map((typeLabel) => (
                      <Chip
                        key={typeLabel}
                        label={typeLabel}
                        size="small"
                        sx={{ backgroundColor: '#fff200', color: '#111', fontWeight: 700 }}
                      />
                    ))}
                  </Stack>
                </Box>

                {renderDriveConnectionPanel()}

                {feedComposerLocked ? (
                  <Box
                    sx={{
                      p: { xs: 2, md: 2.5 },
                      borderRadius: 2,
                      border: '1px solid rgba(122, 63, 242, 0.18)',
                      background: 'linear-gradient(135deg, rgba(255,242,0,0.18) 0%, rgba(122,63,242,0.08) 100%)',
                    }}
                  >
                    <Stack spacing={1.5}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LockIcon fontSize="small" sx={{ color: '#7a3ff2' }} />
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#111' }}>
                          Inicia sesión para publicar
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: '#555', lineHeight: 1.7 }}>
                        El Feed puede consultarse sin sesión, pero publicar requiere una cuenta iniciada para asociar la autoría y generar la huella de integridad.
                      </Typography>
                      <Button
                        variant="contained"
                        onClick={() => loginWithRedirect({ appState: { returnTo: `${location.pathname}${location.search}` } })}
                        sx={{
                          alignSelf: 'flex-start',
                          background: '#fff200',
                          color: '#111',
                          fontWeight: 700,
                          border: '1px solid rgba(122, 63, 242, 0.22)',
                          '&:hover': { background: '#ffea00' },
                        }}
                      >
                        Iniciar sesión
                      </Button>
                    </Stack>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      p: { xs: 2, md: 2.5 },
                      borderRadius: 2,
                      border: '1px solid rgba(122, 63, 242, 0.16)',
                      backgroundColor: '#fff',
                    }}
                  >
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: '#7a3ff2', color: '#fff', fontWeight: 800 }}>
                          {(user?.name || user?.email || 'C').charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#111' }}>
                            {user?.name || user?.nickname || user?.email || 'Ciudadan'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#666' }}>
                            La privacidad se define antes de publicar y queda guardada con la publicación.
                          </Typography>
                        </Box>
                      </Box>

                      <Box>
                        <Typography variant="subtitle2" sx={{ color: '#7a3ff2', fontWeight: 800, mb: 1 }}>
                          Privacidad de la publicación
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                          {FEED_PRIVACY_OPTIONS.map((option) => {
                            const selected = feedDraftPrivacy === option.value;

                            return (
                              <Button
                                key={option.value}
                                size="small"
                                variant={selected ? 'contained' : 'outlined'}
                                onClick={() => setFeedDraftPrivacy(option.value)}
                                sx={{
                                  minHeight: 34,
                                  borderColor: selected ? '#7a3ff2' : 'rgba(122, 63, 242, 0.28)',
                                  backgroundColor: selected ? '#7a3ff2' : '#fff',
                                  color: selected ? '#fff' : '#111',
                                  fontWeight: 700,
                                  textTransform: 'none',
                                  '&:hover': {
                                    backgroundColor: selected ? '#6a31e8' : 'rgba(122, 63, 242, 0.05)',
                                    borderColor: '#7a3ff2',
                                  },
                                }}
                              >
                                {option.label}
                              </Button>
                            );
                          })}
                        </Stack>
                        <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 1 }}>
                          {getFeedPrivacyDescription(feedDraftPrivacy)}
                        </Typography>
                      </Box>

                      <TextField
                        multiline
                        minRows={4}
                        value={feedDraftText}
                        onChange={(event) => setFeedDraftText(event.target.value)}
                        placeholder="Escribe aquí tu publicación..."
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                              <VerifiedUserIcon fontSize="small" sx={{ color: '#7a3ff2' }} />
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 3,
                            backgroundColor: '#fffdf8',
                          },
                        }}
                      />

                      <TextField
                        value={feedDraftLink}
                        onChange={(event) => setFeedDraftLink(event.target.value)}
                        placeholder="Agregar enlace opcional"
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <LinkIcon fontSize="small" sx={{ color: '#7a3ff2' }} />
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 3,
                            backgroundColor: '#fffdf8',
                          },
                        }}
                      />

                      <Box>
                        <input
                          ref={feedFileInputRef}
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          hidden
                          onChange={handleFeedFiles}
                        />

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                          <Button
                            variant="outlined"
                            onClick={() => feedFileInputRef.current?.click()}
                            startIcon={<AddPhotoAlternateIcon />}
                            sx={{
                              borderColor: 'rgba(122, 63, 242, 0.32)',
                              color: '#111',
                              minHeight: 44,
                            }}
                          >
                            Adjuntar medios
                          </Button>

                          <Button
                            variant="contained"
                            onClick={handleFeedPublish}
                            disabled={isPublishing}
                            startIcon={isPublishing ? <CircularProgress size={16} sx={{ color: '#111' }} /> : <SendIcon />}
                            sx={{
                              background: '#fff200',
                              color: '#111',
                              fontWeight: 700,
                              border: '1px solid rgba(122, 63, 242, 0.22)',
                              minHeight: 44,
                              '&:hover': { background: '#ffea00' },
                            }}
                          >
                            Publicar
                          </Button>
                        </Stack>
                      </Box>

                      {feedAttachments.length > 0 ? (
                        <Stack spacing={1}>
                          <Typography variant="caption" sx={{ color: '#7a3ff2', fontWeight: 800 }}>
                            Medios adjuntos
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                            {feedAttachments.map((file, index) => (
                              <Chip
                                key={`${file.name}-${file.lastModified}`}
                                icon={<AttachFileIcon />}
                                label={file.name}
                                onDelete={() => removeFeedAttachment(index)}
                                sx={{
                                  maxWidth: '100%',
                                  '& .MuiChip-label': {
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  },
                                }}
                              />
                            ))}
                          </Stack>
                        </Stack>
                      ) : null}

                      <Typography variant="caption" sx={{ color: '#666', lineHeight: 1.6 }}>
                        Cada foto o vídeo adjunto guarda una copia local en este dispositivo y, al publicar, también una copia en Google Drive. Si borras la copia local después, la publicación sigue funcionando gracias a la copia externa.
                      </Typography>

                      {feedMessage ? (
                        <Typography variant="body2" sx={{ color: feedMessage.includes('Publicación guardada') ? '#2f7d32' : '#8a7a00', fontWeight: 700 }}>
                          {feedMessage}
                        </Typography>
                      ) : null}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </Paper>

            <Paper
              elevation={2}
              sx={{
                p: { xs: 2, md: 3 },
                borderRadius: { xs: 2, md: 3 },
                background: '#ffffff',
                border: '1px solid rgba(122, 63, 242, 0.18)',
              }}
            >
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#7a3ff2' }}>
                    Publicaciones recientes
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', mt: 0.5 }}>
                    Las publicaciones se muestran en orden reciente y puedes filtrarlas con la búsqueda del shell.
                  </Typography>
                </Box>

                <Stack spacing={1.5}>
                  {visibleFeedPosts.map((post) => (
                    <Box
                      key={post.id}
                      sx={{
                        p: { xs: 1.5, md: 2 },
                        borderRadius: 2,
                        border: '1px solid rgba(122, 63, 242, 0.14)',
                        backgroundColor: '#fff',
                      }}
                    >
                      <Stack spacing={1.25}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                          <Avatar sx={{ bgcolor: post.kind === 'user' ? '#7a3ff2' : '#fff200', color: post.kind === 'user' ? '#fff' : '#111', fontWeight: 800 }}>
                            {(post.authorInitials || post.author?.charAt(0) || 'C').slice(0, 2)}
                          </Avatar>

                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ color: '#111', fontWeight: 800 }}>
                              {post.author}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#666' }}>
                              {formatFeedTime(post.publishedAt)}
                            </Typography>
                          </Box>

                          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end' }}>
                            <Chip
                              size="small"
                              label={post.kind === 'user' ? 'Publicado' : 'Sugerencia'}
                              sx={{
                                backgroundColor: post.kind === 'user' ? '#fff200' : '#f1f1f1',
                                color: '#111',
                                fontWeight: 700,
                              }}
                            />
                            <Chip
                              size="small"
                              label={getFeedPrivacyLabel(post.privacy)}
                              sx={{
                                backgroundColor: '#7a3ff2',
                                color: '#fff',
                                fontWeight: 700,
                              }}
                            />
                          </Stack>
                        </Box>

                          {post.contentTypes?.length ? (
                            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                              {post.contentTypes.map((contentType) => (
                                <Chip
                                  key={contentType}
                                  size="small"
                                  label={contentType}
                                  sx={{
                                    backgroundColor: '#fff200',
                                    color: '#111',
                                    fontWeight: 700,
                                  }}
                                />
                              ))}
                            </Stack>
                          ) : null}

                        <Typography variant="body1" sx={{ color: '#222', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                          {post.body}
                        </Typography>

                        {post.linkReference?.url ? (
                          <Box
                            component="a"
                            href={post.linkReference.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              p: 1.25,
                              borderRadius: 2,
                              border: '1px solid rgba(122, 63, 242, 0.18)',
                              backgroundColor: 'rgba(122, 63, 242, 0.04)',
                              color: '#111',
                              textDecoration: 'none',
                            }}
                          >
                            <LinkIcon fontSize="small" sx={{ color: '#7a3ff2' }} />
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#111' }} noWrap>
                                {post.linkReference.title || getLinkLabel(post.linkReference.url)}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#666' }} noWrap>
                                {post.linkReference.url}
                              </Typography>
                            </Box>
                          </Box>
                        ) : null}

                        {post.mediaReferences?.length > 0 ? (
                          <Stack spacing={0.75}>
                            {post.mediaReferences.map((media) => (
                              <Stack key={media.id} direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                                <Chip
                                  size="small"
                                  label={`${media.name} · ${media.sha256.slice(0, 10)}…`}
                                  variant="outlined"
                                  sx={{ borderColor: 'rgba(122, 63, 242, 0.22)' }}
                                />
                                <Chip
                                  size="small"
                                  icon={media.localCopy?.available ? <CloudDoneIcon fontSize="small" /> : <CloudOffIcon fontSize="small" />}
                                  label={media.localCopy?.available ? 'Copia local' : 'Sin copia local'}
                                  onDelete={media.localCopy?.available && post.ownerId === currentUserOwnerId
                                    ? () => removeLocalMediaCopy(post.id, media.id)
                                    : undefined}
                                  sx={{
                                    backgroundColor: media.localCopy?.available ? '#fff200' : '#f1f1f1',
                                    color: '#111',
                                    fontWeight: 700,
                                  }}
                                />
                                {media.driveCopy?.available ? (
                                  <Chip
                                    component="a"
                                    href={media.driveCopy.webViewLink || undefined}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    clickable={Boolean(media.driveCopy.webViewLink)}
                                    size="small"
                                    icon={<CloudDoneIcon fontSize="small" />}
                                    label="Google Drive"
                                    sx={{ backgroundColor: '#7a3ff2', color: '#fff', fontWeight: 700, textDecoration: 'none' }}
                                  />
                                ) : (
                                  <Chip
                                    size="small"
                                    icon={<CloudOffIcon fontSize="small" />}
                                    label="Sin copia externa"
                                    sx={{ backgroundColor: '#f1f1f1', color: '#111', fontWeight: 700 }}
                                  />
                                )}

                                {(() => {
                                  const verification = mediaVerification[getMediaVerificationKey(post.id, media.id)];
                                  const status = verification?.status;
                                  const isChecking = status === MEDIA_VERIFICATION_STATUS.CHECKING;
                                  const isVerified = status === MEDIA_VERIFICATION_STATUS.VERIFIED;
                                  const isMismatch = status === MEDIA_VERIFICATION_STATUS.MISMATCH;
                                  const canCheckDrive = media.driveCopy?.available && post.ownerId === currentUserOwnerId;

                                  return (
                                    <Chip
                                      size="small"
                                      icon={isChecking
                                        ? <CircularProgress size={12} sx={{ color: '#7a3ff2' }} />
                                        : isMismatch
                                          ? <ReportProblemOutlinedIcon fontSize="small" />
                                          : <VerifiedUserIcon fontSize="small" />}
                                      label={isVerified ? 'Verificado' : isMismatch ? 'No coincide' : isChecking ? 'Verificando…' : 'Verificar en Drive'}
                                      clickable={canCheckDrive && !isChecking}
                                      onClick={canCheckDrive && !isChecking ? () => verifyMediaAgainstProvider(post, media) : undefined}
                                      sx={{
                                        backgroundColor: isMismatch ? '#c62828' : isVerified ? 'rgba(47, 125, 50, 0.14)' : '#f1f1f1',
                                        color: isMismatch ? '#fff' : '#111',
                                        fontWeight: 700,
                                      }}
                                    />
                                  );
                                })()}
                              </Stack>
                            ))}
                          </Stack>
                        ) : null}

                        {post.mediaReferences?.some((media) => mediaVerification[getMediaVerificationKey(post.id, media.id)]?.status === MEDIA_VERIFICATION_STATUS.MISMATCH) ? (
                          <Typography variant="body2" sx={{ color: '#c62828', fontWeight: 700 }}>
                            Contenido no coincide con el original firmado.
                          </Typography>
                        ) : null}

                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                          {(post.tags || []).map((tag) => (
                            <Chip
                              key={tag}
                              size="small"
                              label={tag}
                              sx={{
                                backgroundColor: '#fff7c8',
                                color: '#111',
                                fontWeight: 700,
                              }}
                            />
                          ))}
                        </Stack>

                        <Typography variant="caption" sx={{ color: '#666', lineHeight: 1.6 }}>
                          Huella {post.proof?.algorithm || 'SHA-256'}: {post.proof?.digest ? `${post.proof.digest.slice(0, 16)}…` : 'referencia inicial'} · Firma: {post.proof?.signature ? `${post.proof.signature.slice(0, 10)}…` : 'sin firmar'} · Privacidad {getFeedPrivacyLabel(post.privacy).toLowerCase()}
                        </Typography>

                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                          <Button
                            size="small"
                            variant={post.likedByCurrentUser ? 'contained' : 'outlined'}
                            startIcon={post.likedByCurrentUser ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                            onClick={() => togglePostLike(post.id)}
                            sx={{
                              minHeight: 36,
                              borderColor: 'rgba(122, 63, 242, 0.24)',
                              background: post.likedByCurrentUser ? '#fff200' : '#fff',
                              color: '#111',
                              fontWeight: 700,
                            }}
                          >
                            Me gusta {post.likesCount ? `(${post.likesCount})` : ''}
                          </Button>

                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<ChatBubbleOutlineIcon fontSize="small" />}
                            onClick={() => toggleComments(post.id)}
                            sx={{
                              minHeight: 36,
                              borderColor: 'rgba(122, 63, 242, 0.24)',
                              color: '#111',
                              fontWeight: 700,
                            }}
                          >
                            Comentarios {post.comments?.length ? `(${post.comments.length})` : ''}
                          </Button>

                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<ContentCopyIcon fontSize="small" />}
                            onClick={() => sharePost(post)}
                            sx={{
                              minHeight: 36,
                              borderColor: 'rgba(122, 63, 242, 0.24)',
                              color: '#111',
                              fontWeight: 700,
                            }}
                          >
                            Compartir {post.sharesCount ? `(${post.sharesCount})` : ''}
                          </Button>

                          <Button
                            size="small"
                            variant={post.savedByCurrentUser ? 'contained' : 'outlined'}
                            startIcon={post.savedByCurrentUser ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />}
                            onClick={() => togglePostSave(post.id)}
                            sx={{
                              minHeight: 36,
                              borderColor: 'rgba(122, 63, 242, 0.24)',
                              background: post.savedByCurrentUser ? '#fff200' : '#fff',
                              color: '#111',
                              fontWeight: 700,
                            }}
                          >
                            Guardar {post.savesCount ? `(${post.savesCount})` : ''}
                          </Button>

                          {post.ownerId === currentUserOwnerId ? (
                            <>
                              <Button
                                size="small"
                                variant="text"
                                startIcon={<EditOutlinedIcon fontSize="small" />}
                                onClick={() => openEditDialog(post)}
                                sx={{ minHeight: 36, color: '#111', fontWeight: 700 }}
                              >
                                Editar
                              </Button>
                              <Button
                                size="small"
                                variant="text"
                                startIcon={<DeleteOutlineIcon fontSize="small" />}
                                onClick={() => deletePost(post.id)}
                                sx={{ minHeight: 36, color: '#7a3ff2', fontWeight: 700 }}
                              >
                                Eliminar
                              </Button>
                            </>
                          ) : null}
                        </Stack>

                        {expandedCommentsPostId === post.id ? (
                          <Box
                            sx={{
                              mt: 1,
                              p: { xs: 1.25, md: 1.5 },
                              borderRadius: 2,
                              border: '1px solid rgba(122, 63, 242, 0.14)',
                              background: 'rgba(122, 63, 242, 0.03)',
                            }}
                          >
                            <Stack spacing={1.25}>
                              <TextField
                                size="small"
                                multiline
                                minRows={2}
                                value={commentDrafts[post.id] || ''}
                                onChange={(event) => setCommentDrafts((current) => ({
                                  ...current,
                                  [post.id]: event.target.value,
                                }))}
                                placeholder="Escribe un comentario..."
                                fullWidth
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    backgroundColor: '#fff',
                                  },
                                }}
                              />

                              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <Button
                                  variant="contained"
                                  onClick={() => addCommentToPost(post.id)}
                                  sx={{
                                    background: '#fff200',
                                    color: '#111',
                                    fontWeight: 700,
                                      border: '1px solid rgba(122, 63, 242, 0.22)',
                                    '&:hover': { background: '#ffea00' },
                                  }}
                                >
                                  Comentar
                                </Button>
                              </Box>

                              {post.comments?.length > 0 ? (
                                <Stack spacing={1}>
                                  {post.comments.map((comment) => (
                                    <Box key={comment.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                      <Avatar sx={{ width: 30, height: 30, bgcolor: '#e7e7e7', color: '#111', fontSize: 13, fontWeight: 800 }}>
                                        {comment.authorInitials || 'C'}
                                      </Avatar>
                                      <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography variant="subtitle2" sx={{ color: '#111', fontWeight: 700 }}>
                                          {comment.author}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#444', lineHeight: 1.6 }}>
                                          {comment.text}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  ))}
                                </Stack>
                              ) : null}
                            </Stack>
                          </Box>
                        ) : null}
                        </Stack>
                  </Box>
                ))}

                {visibleFeedPosts.length === 0 ? (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: '1px dashed rgba(122, 63, 242, 0.3)',
                    }}
                  >
                    <Typography variant="body2" sx={{ color: '#555' }}>
                      No hay publicaciones para "{query}" en este Feed.
                    </Typography>
                  </Box>
                ) : null}
              </Stack>
            </Stack>
          </Paper>

          <Dialog open={editDialog.open} onClose={clearEditDialog} fullWidth maxWidth="sm">
            <DialogTitle>Editar publicación</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Typography variant="body2" sx={{ color: '#666' }}>
                Puedes ajustar el texto y el enlace. Los medios adjuntos se conservan como referencias.
              </Typography>

              <TextField
                multiline
                minRows={4}
                value={editDialog.text}
                onChange={(event) => setEditDialog((current) => ({ ...current, text: event.target.value }))}
                placeholder="Texto de la publicación"
                fullWidth
              />

              <TextField
                value={editDialog.link}
                onChange={(event) => setEditDialog((current) => ({ ...current, link: event.target.value }))}
                placeholder="Enlace opcional"
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LinkIcon fontSize="small" sx={{ color: '#7a3ff2' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={clearEditDialog} sx={{ color: '#111' }}>
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={saveEditedPost}
                sx={{
                  background: '#fff200',
                  color: '#111',
                  fontWeight: 700,
                  border: '1px solid rgba(122, 63, 242, 0.22)',
                  '&:hover': { background: '#ffea00' },
                }}
              >
                Guardar cambios
              </Button>
            </DialogActions>
          </Dialog>
          </Stack>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        py: { xs: 3, md: 8 },
        px: { xs: 1.25, sm: 2 },
        background: 'linear-gradient(180deg, #fffde7 0%, #ffffff 45%, #f7f7f7 100%)',
        color: '#111',
      }}
    >
      <Container maxWidth="md" disableGutters={isMobile}>
        <Paper
          elevation={2}
          sx={{
            p: { xs: 2.5, md: 5 },
            borderRadius: { xs: 2, md: 3 },
            background: '#ffffff',
            border: '1px solid rgba(109, 110, 113, 0.22)',
          }}
        >
          <Stack spacing={3}>
            <Box>
              <Typography variant="overline" sx={{ color: '#8a7a00', letterSpacing: 2, fontWeight: 800 }}>
                Comunidad
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 800, mt: 1, color: '#111' }}>
                {title}
              </Typography>
            </Box>

            <Typography variant="body1" sx={{ color: '#333', lineHeight: 1.8 }}>
              {description}
            </Typography>

            {note ? (
              <Typography variant="body2" sx={{ color: '#666' }}>
                {note}
              </Typography>
            ) : null}

            {renderDriveConnectionPanel()}

            <Divider sx={{ borderColor: 'rgba(109, 110, 113, 0.14)' }} />

            <Stack spacing={1.2}>
              <Typography variant="subtitle2" sx={{ color: '#8a7a00', fontWeight: 800 }}>
                Búsqueda contextual activa
              </Typography>

              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {scopes.map((scope) => (
                  <Chip
                    key={scope}
                    label={scope}
                    size="small"
                    sx={{
                      color: '#111',
                      borderColor: 'rgba(109, 110, 113, 0.25)',
                      backgroundColor: '#fff7c8',
                      fontWeight: 700,
                    }}
                    variant="outlined"
                  />
                ))}
              </Stack>

              <Typography variant="body2" sx={{ color: '#333' }}>
                {query
                  ? `Filtro actual: "${query}" · ${filteredItems.length} resultado(s)`
                  : `Sin filtro activo · ${filteredItems.length} elemento(s) disponibles`}
              </Typography>

              <Stack spacing={isMobile ? 1.25 : 1}>
                {filteredItems.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      p: { xs: 1.5, md: 1.25 },
                      borderRadius: { xs: 2.5, md: 2 },
                      border: '1px solid rgba(109, 110, 113, 0.16)',
                      backgroundColor: '#fff',
                      width: '100%',
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ color: '#111', fontWeight: 700 }}>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#555' }}>
                      {item.subtitle}
                    </Typography>
                  </Box>
                ))}

                {filteredItems.length === 0 ? (
                  <Box
                    sx={{
                      p: { xs: 1.5, md: 1.25 },
                      borderRadius: { xs: 2.5, md: 2 },
                      border: '1px dashed rgba(109, 110, 113, 0.3)',
                    }}
                  >
                    <Typography variant="body2" sx={{ color: '#555' }}>
                      No hay coincidencias para "{query}" en esta sección.
                    </Typography>
                  </Box>
                ) : null}
              </Stack>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              {primaryActionLabel ? (
                <Button
                  variant="contained"
                  onClick={() => navigate(primaryActionPath)}
                  fullWidth={isMobile}
                  sx={{
                    background: '#fff200',
                    color: '#111',
                    fontWeight: 700,
                    border: '1px solid rgba(109, 110, 113, 0.22)',
                    minHeight: 44,
                    '&:hover': {
                      background: '#ffea00',
                    },
                  }}
                >
                  {primaryActionLabel}
                </Button>
              ) : null}

              <Button
                variant="outlined"
                onClick={goToCiudadan}
                fullWidth={isMobile}
                sx={{
                  borderColor: 'rgba(109, 110, 113, 0.35)',
                  color: '#111',
                  minHeight: 44,
                }}
              >
                Volver a Ciudadan
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

export default SocialSectionPage;