import React, { useEffect, useRef, useState } from 'react';
import { STRAPI_URL } from '../../utils/strapiHelpers';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
  Typography
} from "@mui/material";

import {
  Add,
  CheckCircle,
  Delete,
  ExpandLess,
  ExpandMore,
  Image as ImageIcon,
  RestaurantMenu
} from "@mui/icons-material";

const initialGroupForm = {
  nombre: "",
  descripcion: "",
  requerido: false,
  activo: true
};

const initialModifierForm = {
  nombre: "",
  descripcion: "",
  precio: "0",
  activo: true,
  disponible: true
};

export default function ModificadoresRestaurante({ restaurante }) {
  const [groups, setGroups] = useState([]);

  const [loadingGroups, setLoadingGroups] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [savingModifier, setSavingModifier] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [modifierDialogOpen, setModifierDialogOpen] = useState(false);

  const [selectedGroup, setSelectedGroup] = useState(null);

  const [expandedGroups, setExpandedGroups] = useState({});

  const [groupForm, setGroupForm] = useState(initialGroupForm);
  const [modifierForm, setModifierForm] = useState(initialModifierForm);

  const [modifierImage, setModifierImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const fileInputRef = useRef(null);

  /*
    * ============================================================
    * CARGAR GRUPOS
    * ============================================================
  */

  const loadFoodGroupsModifiers = async (restaurant_id) => {

    if (!restaurant_id) return;

    try {

      setLoadingGroups(true);
      setError("");

      const response = await fetch(
        `${STRAPI_URL}/api/food-modifier-groups` +
        `?filters[food_restaurant][id][$eq]=${restaurant_id}` +
        `&populate[food_modifiers][populate]=imagen` +
        `&sort[0]=orden:asc`
      );

      if (!response.ok) {
        throw new Error("No fue posible obtener los grupos.");
      }

      const data = await response.json();

      setGroups(data.data || []);

    } catch (err) {

      console.error(err);
      setError(err.message);

    } finally {

      setLoadingGroups(false);

    }
  };

  useEffect(() => {
    if (!restaurante?.id) return;
    loadFoodGroupsModifiers(restaurante?.id);
  }, [restaurante?.id]);

  /*
    * ============================================================
    * FORMULARIO GRUPO
    * ============================================================
  */

  const handleGroupChange = (event) => {
    const { name, value, type, checked } = event.target;

    setGroupForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  /*
    * ============================================================
    * CREAR GRUPO
    * ============================================================
  */

  const handleCreateGroup = async () => {
    if (!groupForm.nombre.trim()) {
      setError("El nombre del grupo es obligatorio.");
      return;
    }

    try {
      setSavingGroup(true);
      setError("");

      const response = await fetch(
        `${STRAPI_URL}/api/food-modifier-groups`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            data: {
              nombre: groupForm.nombre.trim(),
              descripcion: groupForm.descripcion.trim(),
              requerido: groupForm.requerido,
              activo: groupForm.activo,
              orden: groups.length,
              food_restaurant: restaurante?.id
            }
          })
        }
      );

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error?.message ?? "No fue posible crear el grupo.");
      }

      const result = await response.json();

      const newGroup = {
        ...result.data,
        attributes: {
          ...(result.data.attributes || {}),
          food_modifiers: []
        }
      };

      setGroups((prev) => [...prev, newGroup]);

      setGroupForm(initialGroupForm);
      setGroupDialogOpen(false);

      setSuccess("Grupo creado correctamente. Ahora puedes agregar modificadores.");

      /*
       * Abrimos automáticamente el grupo recién creado.
      */
      setExpandedGroups((prev) => ({
        ...prev,
        [result.data.id]: true
      }));

      /*
       * Opcionalmente cargamos nuevamente desde Strapi
       * para tener la estructura completa.
      */
      await loadFoodGroupsModifiers(restaurante?.id);
    } catch (err) {
      console.error("<handleCreateGroup> Error:", err);
      setError(err.message);
    } finally {
      setSavingGroup(false);
    }
  };

  /*
   * ============================================================
   * FORMULARIO MODIFICADOR
   * ============================================================
  */

  const handleModifierChange = (event) => {
    const { name, value, type, checked } = event.target;
    setModifierForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  /*
    * ============================================================
    * SELECCIONAR IMAGEN
    * ============================================================
  */

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("El archivo seleccionado debe ser una imagen.");
      return;
    }

    setModifierImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  /*
    * ============================================================
    * ABRIR MODAL MODIFICADOR
    * ============================================================
  */
  const openModifierDialog = (group) => {
    setSelectedGroup(group);
    setModifierForm(initialModifierForm);
    setModifierImage(null);
    setImagePreview(null);
    setError("");
    setModifierDialogOpen(true);
  };

  /*
    * ============================================================
    * SUBIR IMAGEN A STRAPI
    * ============================================================
  */

  const uploadImage = async () => {

    if (!modifierImage) {
      return null;
    }

    const formData = new FormData();
    formData.append("files", modifierImage);

    const response = await fetch(
      `${STRAPI_URL}/api/upload`,
      {
        method: "POST",
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error("No fue posible subir la imagen.");
    }
    const data = await response.json();

    return data?.[0]?.id || null;
  };

  /*
    * ============================================================
    * CREAR MODIFICADOR
    * ============================================================
  */

  const handleCreateModifier = async () => {
    if (!selectedGroup) {
      setError("No se ha seleccionado un grupo.");
      return;
    }

    if (!modifierForm.nombre.trim()) {
      setError("El nombre del modificador es obligatorio.");
      return;
    }

    const price = Number(modifierForm.precio);

    if (Number.isNaN(price) || price < 0) {
      setError("El precio debe ser un número válido.");
      return;
    }

    try {

      setSavingModifier(true);
      setError("");

      /*
       * Primero subimos la imagen.
      */
      const imageId = await uploadImage();

      const currentModifiers = selectedGroup?.attributes?.food_modifiers?.data ?? selectedGroup?.food_modifiers?.data ?? [];

      const response = await fetch(
        `${STRAPI_URL}/api/food-modifiers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            data: {
              nombre: modifierForm.nombre.trim(),
              descripcion: modifierForm.descripcion.trim(),
              precio: price,
              activo: modifierForm.activo,
              disponible: modifierForm.disponible,
              orden: currentModifiers.length,
              food_modifier_group: selectedGroup.id,
              ...(imageId ? { imagen: imageId } : {})
            }
          })
        }
      );

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error?.message ?? "No fue posible crear el modificador.");
      }

      setModifierDialogOpen(false);

      setModifierForm(initialModifierForm);
      setModifierImage(null);
      setImagePreview(null);

      setSuccess(`El modificador "${modifierForm.nombre}" fue agregado correctamente.`);

      await loadFoodGroupsModifiers(restaurante?.id);

    } catch (err) {

      console.error("< handleCreateModifier > Error:", err);
      setError(err?.message);

    } finally {
      setSavingModifier(false);
    }
  };

  /*
    * ============================================================
    * EXPANDIR / CONTRAER GRUPO
    * ============================================================
  */

  const toggleGroup = (groupId) => {

    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId] ?? true
    }));
  };

  /*
    * ============================================================
    * OBTENER MODIFICADORES
    * ============================================================
  */

  const getModifiers = (group) => {
    return (group?.attributes?.food_modifiers?.data ?? group?.food_modifiers?.data ?? []);
  };

  /*
    * ============================================================
    * OBTENER ATRIBUTOS STRAPI V4/V5
    * ============================================================
  */

  const getAttributes = (item) => {
    return item?.attributes ?? item ?? {};
  };

  /*
    * ============================================================
    * IMAGEN DEL MODIFICADOR
    * ============================================================
  */

  const getModifierImage = (modifier) => {
    const attributes = getAttributes(modifier);

    const image = attributes?.imagen?.data ?? attributes?.imagen;

    if (!image) return null;

    const imageAttributes = getAttributes(image);

    const url = imageAttributes?.url;

    if (!url) return null;

    return url.startsWith("http") ? url : `${STRAPI_URL}${url}`;
  };

  /*
  * ============================================================
  * RENDER
  * ============================================================
  */

  return (
    <Box>

      {
        /* ======================================================
            HEADER
        ====================================================== */
      }

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: {
            xs: "flex-start",
            sm: "center"
          },
          flexDirection: {
            xs: "column",
            sm: "row"
          },
          gap: 2,
          mb: 3
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Modificadores
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Administra los grupos y opciones que tus clientes
            pueden agregar a los productos.
          </Typography>

        </Box>

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setError("");
            setGroupForm(initialGroupForm);
            setGroupDialogOpen(true);
          }}
          sx={{
            borderRadius: 2,
            whiteSpace: "nowrap"
          }}
        >
          Nuevo grupo
        </Button>

      </Box>


      {/* ======================================================
          MENSAJES
      ====================================================== */}

      {
        error && (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            onClose={() => setError("")}
          >
            {error}
          </Alert>
        )
      }
      {
        success && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            onClose={() => setSuccess("")}
          >
            {success}
          </Alert>
        )
      }
      {
        /* ======================================================
            LOADING
        ====================================================== */
      }
      {
        loadingGroups ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              py: 8
            }}
          >
            <CircularProgress />
          </Box>

        ) : groups.length === 0 ? (

          <Card
            sx={{
              borderRadius: 3,
              border: "1px dashed",
              borderColor: "divider"
            }}
          >

            <CardContent
              sx={{
                textAlign: "center",
                py: 7
              }}
            >
              <RestaurantMenu
                sx={{
                  fontSize: 52,
                  color: "text.secondary",
                  mb: 1
                }}
              />

              <Typography variant="h6" fontWeight={600}>No tienes grupos de modificadores </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  maxWidth: 450,
                  mx: "auto",
                  mt: 1,
                  mb: 3
                }}
              >
                Crea un grupo como "Extras", "Tamaño",
                "Salsas" o "Complementos" y agrega sus
                modificadores.
              </Typography>

              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setGroupDialogOpen(true)}
              >
                Crear primer grupo
              </Button>
            </CardContent>
          </Card>

        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2
            }}
          >
            {
              groups.map((group) => {

                const groupAttributes = getAttributes(group);

                const modifiers = getModifiers(group);

                const expanded =
                  expandedGroups[group.id] ?? true;

                return (

                  <Card
                    key={group.id}
                    sx={{
                      borderRadius: 3,
                      overflow: "hidden"
                    }}
                  >

                    {/* ==================================================
                    GRUPO
                ================================================== */}

                    <Box
                      sx={{
                        p: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 2
                      }}
                    >

                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: 2,
                          backgroundColor: "action.hover",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0
                        }}
                      >
                        <RestaurantMenu />
                      </Box>

                      <Box sx={{ flex: 1, minWidth: 0 }}>

                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            flexWrap: "wrap"
                          }}
                        >

                          <Typography
                            fontWeight={700}
                          >
                            {groupAttributes.nombre}
                          </Typography>

                          {groupAttributes.requerido && (
                            <Chip
                              size="small"
                              label="Requerido"
                              color="primary"
                            />
                          )}

                          {!groupAttributes.activo && (
                            <Chip
                              size="small"
                              label="Inactivo"
                            />
                          )}

                        </Box>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mt: 0.3
                          }}
                        >
                          {groupAttributes.descripcion ||
                            "Sin descripción"}
                        </Typography>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          {modifiers.length}{" "}
                          {modifiers.length === 1
                            ? "modificador"
                            : "modificadores"}
                        </Typography>

                      </Box>


                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Add />}
                        onClick={() =>
                          openModifierDialog(group)
                        }
                        sx={{
                          display: {
                            xs: "none",
                            sm: "inline-flex"
                          },
                          whiteSpace: "nowrap"
                        }}
                      >
                        Agregar modificador
                      </Button>


                      <IconButton
                        onClick={() =>
                          toggleGroup(group.id)
                        }
                      >
                        {expanded
                          ? <ExpandLess />
                          : <ExpandMore />
                        }
                      </IconButton>

                    </Box>


                    {/* ==================================================
                    BOTÓN MÓVIL
                ================================================== */}

                    <Box
                      sx={{
                        display: {
                          xs: "block",
                          sm: "none"
                        },
                        px: 2,
                        pb: 2
                      }}
                    >

                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={() =>
                          openModifierDialog(group)
                        }
                      >
                        Agregar modificador
                      </Button>

                    </Box>


                    <Collapse in={expanded}>

                      <Divider />


                      {/* ==================================================
                      SIN MODIFICADORES
                  ================================================== */}

                      {modifiers.length === 0 ? (

                        <Box
                          sx={{
                            p: 4,
                            textAlign: "center"
                          }}
                        >

                          <Typography
                            variant="body2"
                            color="text.secondary"
                          >
                            Este grupo todavía no tiene
                            modificadores.
                          </Typography>

                          <Button
                            size="small"
                            startIcon={<Add />}
                            sx={{ mt: 1 }}
                            onClick={() =>
                              openModifierDialog(group)
                            }
                          >
                            Agregar modificador
                          </Button>

                        </Box>

                      ) : (

                        <Box
                          sx={{
                            p: 2,
                            display: "grid",
                            gridTemplateColumns: {
                              xs: "1fr",
                              sm: "repeat(2, 1fr)",
                              lg: "repeat(3, 1fr)"
                            },
                            gap: 2
                          }}
                        >

                          {modifiers.map((modifier) => {

                            const modifierAttributes =
                              getAttributes(modifier);

                            const image =
                              getModifierImage(modifier);

                            return (

                              <Card
                                key={modifier.id}
                                variant="outlined"
                                sx={{
                                  borderRadius: 2,
                                  overflow: "hidden"
                                }}
                              >

                                {image ? (

                                  <CardMedia
                                    component="img"
                                    height="150"
                                    image={image}
                                    alt={
                                      modifierAttributes.nombre
                                    }
                                    sx={{
                                      objectFit: "cover"
                                    }}
                                  />

                                ) : (

                                  <Box
                                    sx={{
                                      height: 150,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      backgroundColor: "action.hover"
                                    }}
                                  >
                                    <ImageIcon
                                      sx={{
                                        fontSize: 40,
                                        color: "text.disabled"
                                      }}
                                    />
                                  </Box>

                                )}


                                <CardContent>

                                  <Box
                                    sx={{
                                      display: "flex",
                                      justifyContent:
                                        "space-between",
                                      alignItems: "flex-start",
                                      gap: 1
                                    }}
                                  >

                                    <Typography
                                      fontWeight={700}
                                      sx={{
                                        wordBreak: "break-word"
                                      }}
                                    >
                                      {modifierAttributes.nombre}
                                    </Typography>

                                    <Typography
                                      fontWeight={700}
                                      sx={{
                                        whiteSpace: "nowrap"
                                      }}
                                    >
                                      $
                                      {Number(
                                        modifierAttributes.precio || 0
                                      ).toFixed(2)}
                                    </Typography>

                                  </Box>


                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                      mt: 0.8,
                                      minHeight: 40
                                    }}
                                  >
                                    {modifierAttributes.descripcion ||
                                      "Sin descripción"}
                                  </Typography>


                                  <Box
                                    sx={{
                                      mt: 2,
                                      display: "flex",
                                      gap: 0.7,
                                      flexWrap: "wrap"
                                    }}
                                  >

                                    {modifierAttributes.activo ? (

                                      <Chip
                                        size="small"
                                        icon={<CheckCircle />}
                                        label="Activo"
                                        color="success"
                                        variant="outlined"
                                      />

                                    ) : (

                                      <Chip
                                        size="small"
                                        label="Inactivo"
                                        variant="outlined"
                                      />

                                    )}


                                    {!modifierAttributes.disponible && (
                                      <Chip
                                        size="small"
                                        label="No disponible"
                                        color="warning"
                                        variant="outlined"
                                      />
                                    )}

                                  </Box>

                                </CardContent>

                              </Card>

                            );

                          })}

                        </Box>

                      )}

                    </Collapse>

                  </Card>

                );

              })
            }

          </Box>

        )}


      {/* ==========================================================
          DIALOG NUEVO GRUPO
      ========================================================== */}

      <Dialog
        open={groupDialogOpen}
        onClose={() => !savingGroup && setGroupDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Nuevo grupo
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              pt: 1,
              display: "flex",
              flexDirection: "column",
              gap: 2
            }}
          >
            <TextField
              label="Nombre"
              name="nombre"
              value={groupForm.nombre}
              onChange={handleGroupChange}
              fullWidth
              required
              placeholder="Ej. Extras"
            />

            <TextField
              label="Descripción"
              name="descripcion"
              value={groupForm.descripcion}
              onChange={handleGroupChange}
              fullWidth
              multiline
              minRows={3}
              placeholder="Ej. Selecciona los ingredientes adicionales"
            />
            <FormControlLabel
              control={
                <Switch
                  name="activo"
                  checked={groupForm.activo}
                  onChange={handleGroupChange}
                />
              }
              label="Grupo activo"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setGroupDialogOpen(false)} disabled={savingGroup}>
            Cancelar
          </Button>

          <Button
            variant="contained"
            onClick={handleCreateGroup}
            disabled={savingGroup}
            startIcon={
              savingGroup
                ? <CircularProgress size={18} />
                : <Add />
            }
          >
            Crear grupo
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==========================================================
          DIALOG NUEVO MODIFICADOR
      ========================================================== */}
      <Dialog
        open={modifierDialogOpen}
        onClose={() =>
          !savingModifier &&
          setModifierDialogOpen(false)
        }
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight={700}>
            Nuevo modificador
          </Typography>
          {
            selectedGroup && (
              <Typography
                variant="body2"
                color="text.secondary"
              >
                Grupo:{" "}
                {getAttributes(selectedGroup).nombre}
              </Typography>
            )
          }

        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              pt: 1,
              display: "flex",
              flexDirection: "column",
              gap: 2
            }}
          >
            <TextField
              label="Nombre"
              name="nombre"
              value={modifierForm.nombre}
              onChange={handleModifierChange}
              fullWidth
              required
              placeholder="Ej. Queso extra"
            />
            <TextField
              label="Descripción"
              name="descripcion"
              value={modifierForm.descripcion}
              onChange={handleModifierChange}
              fullWidth
              multiline
              minRows={3}
              placeholder="Ej. Queso mozzarella adicional"
            />
            <TextField
              label="Precio"
              name="precio"
              type="number"
              value={modifierForm.precio}
              onChange={handleModifierChange}
              fullWidth
              inputProps={{
                min: 0,
                step: "0.01"
              }}
              InputProps={{
                startAdornment: (
                  <Typography
                    sx={{
                      mr: 1,
                      color: "text.secondary"
                    }}
                  >
                    $
                  </Typography>
                )
              }}
            />


            {/* ==================================================
                IMAGEN
            ================================================== */}

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Imagen</Typography>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleImageChange}
              />
              <Box
                onClick={() =>
                  fileInputRef.current?.click()
                }
                sx={{
                  border: "2px dashed",
                  borderColor: "divider",
                  borderRadius: 2,
                  minHeight: 150,
                  cursor: "pointer",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "action.hover",
                  "&:hover": {
                    borderColor: "primary.main"
                  }
                }}
              >

                {
                  imagePreview ? (
                    <Box
                      component="img"
                      src={imagePreview}
                      alt="Vista previa"
                      sx={{
                        width: "100%",
                        height: 200,
                        objectFit: "cover"
                      }}
                    />
                  ) : (
                    <Box sx={{ textAlign: "center" }}>
                      <ImageIcon
                        sx={{
                          fontSize: 42,
                          color: "text.disabled"
                        }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        Seleccionar imagen
                      </Typography>
                    </Box>
                  )
                }
              </Box>
            </Box>
            <Divider />
            <FormControlLabel
              control={
                <Switch
                  name="activo"
                  checked={modifierForm.activo}
                  onChange={handleModifierChange}
                />
              }
              label="Modificador activo"
            />
            <FormControlLabel
              control={
                <Switch
                  name="disponible"
                  checked={modifierForm.disponible}
                  onChange={handleModifierChange}
                />
              }
              label="Disponible para venta"
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() =>
              setModifierDialogOpen(false)
            }
            disabled={savingModifier}
          >
            Cancelar
          </Button>

          <Button
            variant="contained"
            onClick={handleCreateModifier}
            disabled={savingModifier}
            startIcon={
              savingModifier
                ? <CircularProgress size={18} />
                : <Add />
            }
          >
            Agregar modificador
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
