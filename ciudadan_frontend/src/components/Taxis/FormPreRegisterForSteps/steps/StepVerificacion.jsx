import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { FaCircleCheck, FaTriangleExclamation, FaWhatsapp } from 'react-icons/fa6';
import { useFormContext } from 'react-hook-form';
import {
  sendWhatsAppVerificationCode,
  verifyWhatsAppVerificationCode,
} from '../../../../services/FormPreRegisterForSteps/driverDraftApi';
import {
  OTP_LENGTH,
  formatPhoneDigits,
  getFullPhone,
  toOtpArray,
} from '../../../../utils/preRegisterForSteps/helpers';

// Temporal fallback: permite completar verificacion sin backend de WhatsApp.
const TEMP_MANUAL_WHATSAPP_VERIFICATION = true;

const StatusPill = ({ type, message }) => {
  if (!type || !message) return null;

  const variants = {
    loading: {
      bg: 'var(--color-background-secondary, #f1f5f9)',
      color: 'var(--color-text-secondary, #64748b)',
      icon: <CircularProgress size={14} color="inherit" />,
    },
    success: {
      bg: 'rgba(27,179,88,0.12)',
      color: '#0F6E56',
      icon: <FaCircleCheck />,
    },
    error: {
      bg: 'rgba(226,75,74,0.10)',
      color: '#A32D2D',
      icon: <FaTriangleExclamation />,
    },
  };

  const variant = variants[type];
  if (!variant) return null;

  return (
    <Box
      sx={{
        borderRadius: '99px',
        px: 1.75,
        py: 0.75,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.9,
        bgcolor: variant.bg,
        color: variant.color,
        fontWeight: 600,
        fontSize: 13,
      }}
    >
      {variant.icon}
      <span>{message}</span>
    </Box>
  );
};

const StepVerificacion = () => {
  const { getValues, setValue, watch } = useFormContext();
  const inputRefs = useRef([]);
  const progressInterval = useRef(null);

  const initialPhoneDigits = useMemo(() => {
    const fromForm = String(getValues('telefono') || '').replace(/\D/g, '');
    return fromForm.slice(0, 10);
  }, [getValues]);

  const [phoneDigits, setPhoneDigits] = useState(initialPhoneDigits);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendError, setSendError] = useState('');
  const [codeSent, setCodeSent] = useState(Boolean(getValues('phoneVerified')));
  const [otp, setOtp] = useState(Array.from({ length: OTP_LENGTH }, () => ''));
  const [statusType, setStatusType] = useState(getValues('phoneVerified') ? 'success' : '');
  const [statusMessage, setStatusMessage] = useState(
    getValues('phoneVerified') ? 'Numero verificado correctamente' : ''
  );
  const [isVerifying, setIsVerifying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [resendIn, setResendIn] = useState(getValues('phoneVerified') ? 0 : 60);
  const [shakeError, setShakeError] = useState(false);

  const isVerified = Boolean(watch('phoneVerified'));
  const isPhoneValid = phoneDigits.length === 10;
  const fullPhone = getFullPhone(phoneDigits);

  useEffect(() => {
    if (!codeSent || resendIn <= 0) return undefined;
    const timer = setInterval(() => {
      setResendIn((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [codeSent, resendIn]);

  useEffect(
    () => () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    },
    []
  );

  const startProgress = () => {
    setShowProgress(true);
    setProgress(0);
    if (progressInterval.current) clearInterval(progressInterval.current);
    progressInterval.current = setInterval(() => {
      setProgress((prev) => (prev >= 90 ? 90 : prev + 6));
    }, 110);
  };

  const completeProgress = () => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    setProgress(100);
    setTimeout(() => {
      setShowProgress(false);
      setProgress(0);
    }, 350);
  };

  const handleSendCode = async () => {
    if (!isPhoneValid || sendLoading) return;
    if (TEMP_MANUAL_WHATSAPP_VERIFICATION) {
      setSendError('');
      setStatusType('');
      setStatusMessage('');
      setValue('phoneVerified', false, { shouldDirty: true });
      setValue('telefono', phoneDigits, { shouldDirty: true });
      setCodeSent(true);
      setResendIn(60);
      setOtp(Array.from({ length: OTP_LENGTH }, () => ''));
      setTimeout(() => inputRefs.current[0]?.focus(), 120);
      return;
    }

    setSendLoading(true);
    setSendError('');
    setStatusType('');
    setStatusMessage('');
    setValue('phoneVerified', false, { shouldDirty: true });
    try {
      await sendWhatsAppVerificationCode(fullPhone);
      setValue('telefono', phoneDigits, { shouldDirty: true });
      setCodeSent(true);
      setResendIn(60);
      setOtp(Array.from({ length: OTP_LENGTH }, () => ''));
      setTimeout(() => inputRefs.current[0]?.focus(), 120);
    } catch (error) {
      setSendError(error?.message || 'No se pudo enviar el codigo por WhatsApp.');
    } finally {
      setSendLoading(false);
    }
  };

  const failOtpVerification = () => {
    setStatusType('error');
    setStatusMessage('Codigo incorrecto. Intentalo de nuevo.');
    setShakeError(true);
    setValue('phoneVerified', false, { shouldDirty: true });
    completeProgress();
    setTimeout(() => setShakeError(false), 360);
    setTimeout(() => {
      setOtp(Array.from({ length: OTP_LENGTH }, () => ''));
      inputRefs.current[0]?.focus();
    }, 1800);
  };

  const verifyCode = async (otpCode) => {
    if (isVerifying || isVerified || otpCode.length !== OTP_LENGTH) return;
    if (TEMP_MANUAL_WHATSAPP_VERIFICATION) {
      setIsVerifying(true);
      setStatusType('loading');
      setStatusMessage('Verificando codigo...');
      startProgress();
      setTimeout(() => {
        setStatusType('success');
        setStatusMessage('Numero verificado correctamente');
        setValue('telefono', phoneDigits, { shouldDirty: true });
        setValue('phoneVerified', true, { shouldDirty: true });
        completeProgress();
        setIsVerifying(false);
      }, 450);
      return;
    }

    setIsVerifying(true);
    setStatusType('loading');
    setStatusMessage('Verificando codigo...');
    startProgress();
    try {
      await verifyWhatsAppVerificationCode(fullPhone, otpCode);
      setStatusType('success');
      setStatusMessage('Numero verificado correctamente');
      setValue('telefono', phoneDigits, { shouldDirty: true });
      setValue('phoneVerified', true, { shouldDirty: true });
      completeProgress();
    } catch (error) {
      failOtpVerification();
    } finally {
      setIsVerifying(false);
    }
  };

  const onOtpChange = (index, rawValue) => {
    if (isVerified) return;
    const digit = String(rawValue || '')
      .replace(/\D/g, '')
      .slice(-1);
    const nextOtp = [...otp];
    nextOtp[index] = digit;
    setOtp(nextOtp);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const joined = nextOtp.join('');
    if (joined.length === OTP_LENGTH && !nextOtp.includes('')) {
      verifyCode(joined);
    }
  };

  const onOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const onPasteOtp = (event) => {
    if (isVerified) return;
    event.preventDefault();
    const pasted = event.clipboardData.getData('text');
    const digits = pasted.replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!digits) return;
    const filled = toOtpArray(digits);
    setOtp(filled);
    const targetIdx = Math.min(digits.length, OTP_LENGTH - 1);
    inputRefs.current[targetIdx]?.focus();
    if (digits.length === OTP_LENGTH) verifyCode(digits);
  };

  return (
    <Stack
      spacing={2.2}
      alignItems="center"
      sx={{
        '@keyframes whatsappPing': {
          '0%': { transform: 'scale(1)', opacity: 0.6 },
          '100%': { transform: 'scale(1.9)', opacity: 0 },
        },
        '@keyframes whatsappFloat': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        '@keyframes slideUp': {
          '0%': { opacity: 0, transform: 'translateY(14px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        '@keyframes otpShake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-5px)' },
          '40%, 80%': { transform: 'translateX(5px)' },
        },
      }}
    >
      <Stack
        spacing={0.8}
        alignItems="center"
        sx={{ animation: 'slideUp 0.45s ease both', animationDelay: '50ms' }}
      >
        <Box sx={{ position: 'relative', width: 54, height: 54 }}>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              bgcolor: 'rgba(37,211,102,0.25)',
              animation: 'whatsappPing 1.2s ease-out infinite',
            }}
          />
          <Box
            sx={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              bgcolor: '#25D366',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              position: 'relative',
              animation: 'whatsappFloat 3s ease-in-out infinite',
            }}
          >
            <FaWhatsapp size={24} />
          </Box>
        </Box>
        <Typography variant="h6" fontWeight={800}>
          Verificacion por WhatsApp
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', textAlign: 'center', maxWidth: 380 }}>
          Confirma tu numero para continuar con el preregistro del conductor.
        </Typography>
      </Stack>

      <Stack
        spacing={1}
        sx={{
          width: '100%',
          maxWidth: 360,
          animation: 'slideUp 0.45s ease both',
          animationDelay: '100ms',
        }}
      >
        <Stack direction="row" spacing={1}>
          <TextField
            value="+52"
            InputProps={{ readOnly: true }}
            sx={{ width: 88, '& .MuiInputBase-input': { textAlign: 'center', fontWeight: 700 } }}
          />
          <TextField
            fullWidth
            value={formatPhoneDigits(phoneDigits)}
            disabled={codeSent && isVerified}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, '').slice(0, 10);
              setPhoneDigits(digits);
              setValue('telefono', digits, { shouldDirty: true });
              setSendError('');
              if (isVerified) {
                setValue('phoneVerified', false, { shouldDirty: true });
                setStatusType('');
                setStatusMessage('');
              }
            }}
            inputMode="numeric"
            label="Numero de celular"
            placeholder="55 0000 0000"
          />
        </Stack>

        {sendError ? (
          <Typography variant="caption" sx={{ color: '#A32D2D' }}>
            {sendError}
          </Typography>
        ) : null}

        <Button
          fullWidth
          onClick={handleSendCode}
          disabled={!isPhoneValid || sendLoading || isVerifying || (isVerified && codeSent)}
          startIcon={sendLoading ? null : <FaWhatsapp />}
          sx={{
            textTransform: 'none',
            fontWeight: 700,
            bgcolor: codeSent ? 'rgba(27,179,88,0.15)' : '#25D366',
            border: codeSent ? '0.5px solid rgba(27,179,88,0.3)' : 'none',
            color: codeSent ? '#0F6E56' : '#fff',
            '&:hover': { bgcolor: codeSent ? 'rgba(27,179,88,0.22)' : '#1fb85a' },
          }}
        >
          {sendLoading ? (
            <CircularProgress size={18} sx={{ color: 'inherit' }} />
          ) : codeSent ? (
            'Codigo enviado'
          ) : (
            'Enviar codigo por WhatsApp'
          )}
        </Button>
      </Stack>

      {codeSent ? (
        <Stack
          spacing={1.2}
          alignItems="center"
          sx={{
            width: '100%',
            maxWidth: 360,
            animation: 'slideUp 0.45s ease both',
            animationDelay: '150ms',
          }}
        >
          <Stack direction="row" spacing={1} onPaste={onPasteOtp}>
            {otp.map((digit, index) => {
              const isFilled = Boolean(digit);
              const errorState = statusType === 'error';
              const successState = statusType === 'success';
              return (
                <Box
                  key={`otp-${index}`}
                  sx={{
                    animation: shakeError && errorState ? 'otpShake 0.35s ease' : 'none',
                  }}
                >
                  <TextField
                    value={digit}
                    disabled={successState}
                    inputRef={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    onChange={(event) => onOtpChange(index, event.target.value)}
                    onKeyDown={(event) => onOtpKeyDown(index, event)}
                    inputProps={{
                      maxLength: 1,
                      inputMode: 'numeric',
                      style: {
                        textAlign: 'center',
                        fontSize: 22,
                        fontFamily: 'monospace',
                        padding: 0,
                      },
                    }}
                    sx={{
                      width: 44,
                      '& .MuiOutlinedInput-root': {
                        width: 44,
                        height: 52,
                        borderRadius: '8px',
                        bgcolor: successState
                          ? 'rgba(37,211,102,0.14)'
                          : isFilled
                          ? 'rgba(37,211,102,0.10)'
                          : 'transparent',
                        '& fieldset': {
                          borderWidth: '1.5px',
                          borderColor: errorState
                            ? '#E24B4A'
                            : successState || isFilled
                            ? '#25D366'
                            : 'var(--color-border-secondary, #cbd5e1)',
                        },
                        '&:hover fieldset': {
                          borderColor: errorState ? '#E24B4A' : '#25D366',
                        },
                        '&.Mui-focused': {
                          boxShadow: '0 0 0 2px rgba(37,211,102,0.15)',
                          bgcolor: 'rgba(37,211,102,0.10)',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#25D366',
                        },
                      },
                    }}
                  />
                </Box>
              );
            })}
          </Stack>

          <StatusPill type={statusType} message={statusMessage} />

          {showProgress ? (
            <Box
              sx={{
                width: '100%',
                height: 3,
                borderRadius: 99,
                bgcolor: 'rgba(37,211,102,0.2)',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  height: '100%',
                  width: `${progress}%`,
                  bgcolor: '#25D366',
                  transition: 'width 120ms linear',
                }}
              />
            </Box>
          ) : null}

          <Typography variant="caption" sx={{ color: '#64748b' }}>
            {resendIn > 0
              ? `Reenviar en 0:${String(resendIn).padStart(2, '0')}`
              : 'No recibiste el codigo?'}
          </Typography>

          <Button
            size="small"
            disabled={resendIn > 0 || sendLoading}
            onClick={handleSendCode}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Reenviar codigo
          </Button>
        </Stack>
      ) : null}
    </Stack>
  );
};

export default StepVerificacion;
