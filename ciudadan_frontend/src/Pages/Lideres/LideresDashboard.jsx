import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Box, Container, Grid, Typography, Card, CardContent, CardHeader, Divider, Chip, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Alert, Tabs, Tab, Link } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useSubdomain } from '../../Contexts/SubdomainContext';
import { useNavigate } from 'react-router-dom';

const LideresDashboard = () => {
  const { getAccessTokenSilently, user } = useAuth0();
  const { enqueueSnackbar } = useSnackbar();
  const { config } = useSubdomain();
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const token = await getAccessTokenSilently();

      const response = await fetch(`${process.env.REACT_APP_STRAPI_URL}/api/leader/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          navigate('/registro');
          return;
        }
        throw new Error('Error al cargar dashboard');
      }

      const data = await response.json();
      setDashboard(data.data);
    } catch (err) {
      setError(err.message);
      enqueueSnackbar(err.message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={fetchDashboard} variant="contained">Reintentar</Button>
      </Container>
    );
  }

  if (!dashboard?.isLeader) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>No eres Líder Verificador</Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Completa tu postulación para acceder al dashboard de líder.
        </Typography>
        <Button variant="contained" size="large" component={Link} to="/registro">
          Postularme como Líder
        </Button>
      </Container>
    );
  }

  const { leader, stats, commissions, referred_drivers, kit, testing } = dashboard;

  const tabs = [
    { label: 'Resumen', index: 0 },
    { label: 'Comisiones', index: 1 },
    { label: 'Conductores', index: 2 },
    { label: 'Kit de Tarjetas', index: 3 },
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {config.title}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Bienvenido, {leader.full_name}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={leader.status === 'active' ? 'Activo' : leader.status === 'candidate' ? 'En Prueba' : leader.status}
              color={leader.status === 'active' ? 'success' : leader.status === 'candidate' ? 'warning' : 'default'}
              size="medium"
            />
          </Box>
        </Box>

        {/* Periodo de prueba */}
        {testing && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>Periodo de prueba:</strong> {testing.days_remaining} días restantes para incorporar {testing.referrals_needed} conductores más
            (necesitas {testing.required} en total). Termina el {new Date(testing.ends_at).toLocaleDateString('es-MX')}.
          </Alert>
        )}
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Total Referidos</Typography>
              <Typography variant="h4" component="div">{stats.total_referred}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Conductores Activos</Typography>
              <Typography variant="h4" component="div" color="success.main">{stats.active_referred}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Total Ganado</Typography>
              <Typography variant="h4" component="div">{formatCurrency(stats.total_earned)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Comisiones Pendientes</Typography>
              <Typography variant="h4" component="div" color="warning.main">{formatCurrency(stats.pending_commissions)}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="fullWidth" sx={{ mb: 3 }}>
        {tabs.map(tab => (
          <Tab key={tab.index} label={tab.label} />
        ))}
      </Tabs>

      {/* Tab Content */}
      {activeTab === 0 && (
        // Resumen
        <Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Tu Código de Referido" />
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Typography variant="h5" sx={{ fontFamily: 'monospace', letterSpacing: 1 }}>
                      {leader.referral_code}
                    </Typography>
                    <Button variant="outlined" startIcon={<i className="material-icons">content_copy</i>} onClick={() => navigator.clipboard.writeText(leader.referral_code)}>
                      Copiar
                    </Button>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Comparte este código con conductores para que se registren bajo tu referencia.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Tu QR Personalizado" />
                <CardContent>
                  {leader.qr_image && (
                    <Box sx={{ textAlign: 'center', my: 2 }}>
                      <img src={leader.qr_image} alt="QR Código" style={{ width: 200, height: 200 }} />
                    </Box>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    Los conductores pueden escanear este QR para registrarse directamente.
                  </Typography>
                  <Button variant="outlined" component={Link} to="/qr" sx={{ mt: 2 }}>
                    Ver QR Completo
                  </Button>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card>
                <CardHeader title="Enlace de WhatsApp" />
                <CardContent>
                  {leader.whatsapp_group_url ? (
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Únete al grupo de WhatsApp para líderes verificadores:
                      </Typography>
                      <Button variant="contained" component="a" href={leader.whatsapp_group_url} target="_blank" rel="noopener" sx={{ mt: 1 }}>
                        Unirse al Grupo
                      </Button>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      El enlace de WhatsApp se configurará cuando actives tu liderazgo.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {activeTab === 1 && (
        // Comisiones
        <Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Comisiones Pendientes" />
                <CardContent>
                  {commissions.pending.length === 0 ? (
                    <Typography color="text.secondary">No hay comisiones pendientes</Typography>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Conductor</TableCell>
                            <TableCell align="right">Monto</TableCell>
                            <TableCell>Fecha</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {commissions.pending.slice(0, 10).map(comm => (
                            <TableRow key={comm.id}>
                              <TableCell>{comm.membership?.driver?.full_name || 'N/A'}</TableCell>
                              <TableCell align="right">{formatCurrency(comm.amount_mxn)}</TableCell>
                              <TableCell>{new Date(comm.createdAt).toLocaleDateString('es-MX')}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Comisiones Pagadas Recientemente" />
                <CardContent>
                  {commissions.recent_paid.length === 0 ? (
                    <Typography color="text.secondary">No hay comisiones pagadas</Typography>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Conductor</TableCell>
                            <TableCell align="right">Monto</TableCell>
                            <TableCell>Fecha</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {commissions.recent_paid.slice(0, 10).map(comm => (
                            <TableRow key={comm.id}>
                              <TableCell>{comm.membership?.driver?.full_name || 'N/A'}</TableCell>
                              <TableCell align="right">{formatCurrency(comm.amount_mxn)}</TableCell>
                              <TableCell>{new Date(comm.createdAt).toLocaleDateString('es-MX')}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {activeTab === 2 && (
        // Conductores
        <Box>
          <Card>
            <CardHeader title="Mis Conductores Referidos" />
            <CardContent>
              {referred_drivers.length === 0 ? (
                <Typography color="text.secondary">No tienes conductores referidos aún</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Nombre</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Estado Membresía</TableCell>
                        <TableCell>Plan</TableCell>
                        <TableCell>Fecha Registro</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {referred_drivers.map(driver => (
                        <TableRow key={driver.id}>
                          <TableCell>{driver.full_name}</TableCell>
                          <TableCell>{driver.email}</TableCell>
                          <TableCell>
                            <Chip
                              label={driver.membership?.status || 'Sin membresía'}
                              size="small"
                              color={driver.membership?.status === 'active' ? 'success' : 'default'}
                            />
                          </TableCell>
                          <TableCell>{driver.membership?.plan || '-'}</TableCell>
                          <TableCell>{new Date(driver.createdAt).toLocaleDateString('es-MX')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {activeTab === 3 && (
        // Kit de Tarjetas
        <Box>
          <Card>
            <CardHeader title="Kit de 5000 Tarjetas QR" />
            <CardContent>
              {kit.purchased ? (
                <Box>
                  <Alert severity="success">
                    <strong>Kit comprado el {new Date(kit.purchase_date).toLocaleDateString('es-MX')}</strong>
                  </Alert>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography><strong>Tarjetas recibidas:</strong> {kit.cards_received?.toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography><strong>Tarjetas distribuidas:</strong> {kit.cards_distributed?.toLocaleString()}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography><strong>Disponibles:</strong> {(kit.cards_received - kit.cards_distributed)?.toLocaleString()}</Typography>
                    </Grid>
                  </Grid>
                </Box>
              ) : (
                <Box>
                  <Alert severity="info">
                    <strong>Precio del kit: {formatCurrency(kit.price)}</strong> + {formatCurrency(kit.shipping_fee)} de envío = <strong>{formatCurrency(kit.price + kit.shipping_fee)}</strong>
                  </Alert>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    El kit incluye 5000 tarjetas QR físicas personalizadas con tu código de referido.
                    Se envían a tu dirección registrada.
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    component={Link}
                    to="/kit"
                    startIcon={<i className="material-icons">shopping_cart</i>}
                  >
                    Comprar Kit ({formatCurrency(kit.price + kit.shipping_fee)})
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      )}
    </Container>
  );
};

export default LideresDashboard;