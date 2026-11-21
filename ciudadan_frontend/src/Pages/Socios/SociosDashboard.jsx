import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Container, Grid, Typography, Card, CardContent, CardHeader, Chip, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Alert, Tabs, Tab } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useSubdomain } from '../../Contexts/SubdomainContext';

const SociosDashboard = () => {
  const { getAccessTokenSilently } = useAuth0();
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

      const response = await fetch(`${process.env.REACT_APP_STRAPI_URL}/api/state-partner/me`, {
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

  if (!dashboard?.isStatePartner) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>No eres Socio Estatal</Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Completa tu postulación y pago para acceder al dashboard de socio.
        </Typography>
        <Button variant="contained" size="large" component={Link} to="/registro">
          Postularme como Socio Estatal
        </Button>
      </Container>
    );
  }

  const { partner, stats, commissions, drivers, leaders } = dashboard;

  const tabs = [
    { label: 'Resumen', index: 0 },
    { label: 'Comisiones', index: 1 },
    { label: 'Conductores', index: 2 },
    { label: 'Líderes', index: 3 },
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
              {config.title} - {partner.state}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {partner.company_name} | {partner.full_name}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={partner.status === 'active' ? 'Activo' : partner.status === 'pending_payment' ? 'Pendiente de Pago' : partner.status}
              color={partner.status === 'active' ? 'success' : partner.status === 'pending_payment' ? 'warning' : 'default'}
              size="medium"
            />
          </Box>
        </Box>

        {partner.status === 'pending_payment' && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Tu cuota de ingreso de {formatCurrency(partner.entry_fee_mxn)} está pendiente.
            <Button variant="outlined" component={Link} to="/pago-cuota" sx={{ ml: 2 }}>
              Pagar Cuota
            </Button>
          </Alert>
        )}
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Total Conductores</Typography>
              <Typography variant="h4" component="div">{stats.total_drivers}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Conductores Activos</Typography>
              <Typography variant="h4" component="div" color="success.main">{stats.active_drivers}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Total Líderes</Typography>
              <Typography variant="h4" component="div">{stats.total_leaders}</Typography>
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
              <Typography color="text.secondary" gutterBottom>Comisiones Pagadas</Typography>
              <Typography variant="h4" component="div" color="success.main">{formatCurrency(stats.paid_commissions)}</Typography>
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
                <CardHeader title="Información del Socio" />
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography><strong>Estado:</strong> {partner.state}</Typography>
                    <Typography><strong>Empresa:</strong> {partner.company_name}</Typography>
                    <Typography><strong>Contacto:</strong> {partner.full_name} ({partner.email})</Typography>
                    <Typography><strong>Cuota pagada:</strong> {partner.entry_fee_paid_at ? formatCurrency(partner.entry_fee_mxn) + ' el ' + new Date(partner.entry_fee_paid_at).toLocaleDateString('es-MX') : 'Pendiente'}</Typography>
                    <Typography><strong>Comisión:</strong> {partner.commission_pct}%</Typography>
                    <Typography><strong>Activado:</strong> {partner.activated_at ? new Date(partner.activated_at).toLocaleDateString('es-MX') : 'No activado'}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="Configuración" />
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography><strong>Cuota mínima:</strong> {formatCurrency(dashboard.config.entry_fee_min)}</Typography>
                    <Typography><strong>Cuota máxima:</strong> {formatCurrency(dashboard.config.entry_fee_max)}</Typography>
                    <Typography><strong>Máx. MSI:</strong> {dashboard.config.max_msi_months} meses</Typography>
                    <Typography><strong>Comisión estándar:</strong> {dashboard.config.commission_pct}%</Typography>
                  </Box>
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
                          {commissions.pending.slice(0, 15).map(comm => (
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
                          {commissions.recent_paid.slice(0, 15).map(comm => (
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
            <CardHeader title="Conductores en tu Estado" />
            <CardContent>
              {drivers.length === 0 ? (
                <Typography color="text.secondary">No hay conductores registrados en tu estado aún</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Nombre</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Estado Membresía</TableCell>
                        <TableCell>Plan</TableCell>
                        <TableCell>Referido por Líder</TableCell>
                        <TableCell>Fecha Registro</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {drivers.map(driver => (
                        <TableRow key={driver.id}>
                          <TableCell>{driver.full_name}</TableCell>
                          <TableCell>{driver.email}</TableCell>
                          <TableCell>
                            <Chip
                              label={driver.status}
                              size="small"
                              color={driver.status === 'active' ? 'success' : driver.status === 'pending' ? 'warning' : 'default'}
                            />
                          </TableCell>
                          <TableCell>{driver.plan}</TableCell>
                          <TableCell>
                            {driver.referred_by_leader ? (
                              <Typography variant="body2">{driver.referred_by_leader.full_name}</Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary">Directo</Typography>
                            )}
                          </TableCell>
                          <TableCell>{new Date(driver.created_at).toLocaleDateString('es-MX')}</TableCell>
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
        // Líderes
        <Box>
          <Card>
            <CardHeader title="Líderes Verificadores en tu Estado" />
            <CardContent>
              {leaders.length === 0 ? (
                <Typography color="text.secondary">No hay líderes verificadores en tu estado aún</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Nombre</TableCell>
                        <TableCell>Ciudad</TableCell>
                        <TableCell>Total Referidos</TableCell>
                        <TableCell>Activos</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {leaders.map(leader => (
                        <TableRow key={leader.id}>
                          <TableCell>{leader.full_name}</TableCell>
                          <TableCell>{leader.city}</TableCell>
                          <TableCell>{leader.total_referred}</TableCell>
                          <TableCell>{leader.active_referred}</TableCell>
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
    </Container>
  );
};

export default SociosDashboard;