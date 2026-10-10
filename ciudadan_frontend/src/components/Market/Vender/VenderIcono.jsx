// Mapa de iconos SVG (MUI) para la landing. Sin fotos en beneficios.
import StorefrontIcon from '@mui/icons-material/Storefront';
import PercentIcon from '@mui/icons-material/Percent';
import PaymentsIcon from '@mui/icons-material/Payments';
import PublicIcon from '@mui/icons-material/Public';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import HubIcon from '@mui/icons-material/Hub';
import VerifiedIcon from '@mui/icons-material/Verified';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import GroupsIcon from '@mui/icons-material/Groups';
import DiscountIcon from '@mui/icons-material/Discount';
import CampaignIcon from '@mui/icons-material/Campaign';
import LanguageIcon from '@mui/icons-material/Language';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import CableIcon from '@mui/icons-material/Cable';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import React from 'react';

const MAPA = {
  Storefront: StorefrontIcon,
  Percent: PercentIcon,
  Payments: PaymentsIcon,
  Public: PublicIcon,
  Inventory: Inventory2Icon,
  Hub: HubIcon,
  Verified: VerifiedIcon,
  CurrencyExchange: CurrencyExchangeIcon,
  CardGiftcard: CardGiftcardIcon,
  Groups: GroupsIcon,
  Discount: DiscountIcon,
  Campaign: CampaignIcon,
  Language: LanguageIcon,
  SmartToy: SmartToyIcon,
  WhatsApp: WhatsAppIcon,
  Cable: CableIcon,
  RocketLaunch: RocketLaunchIcon,
};

export default function VenderIcono({ nombre, sx }) {
  const Icono = MAPA[nombre] || CheckCircleIcon;
  return <Icono fontSize="large" sx={sx} aria-hidden="true" />;
}
