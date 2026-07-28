// lib/fareServer.js
function metersToKm(meters) { return (meters || 0) / 1000; }
function secondsToMinutes(seconds) { return (seconds || 0) / 60; }

function calculateFareFromMetersSeconds(meters, seconds, opts = {}) {
  const baseFare = opts.baseFare ?? 10;
  const perKm = opts.perKm ?? 6.0;
  const perMin = opts.perMin ?? 1.5;
  const surge = opts.surge ?? 1;
  const minFare = opts.minFare ?? 25;
  const roundTo = opts.roundTo ?? 1;

  const km = metersToKm(meters);
  const minutes = secondsToMinutes(seconds);
  const raw = (baseFare + (perKm * km) + (perMin * minutes)) * surge;
  const rounded = Math.round(raw / roundTo) * roundTo;
  const fare = Math.max(minFare, rounded);

  return {
    fare,
    breakdown: {
      baseFare,
      perKm,
      perMin,
      km: Number(km.toFixed(3)),
      minutes: Number(minutes.toFixed(2)),
      surge,
      raw: Number(raw.toFixed(2)),
      rounded: Number(rounded.toFixed(2)),
      minFare
    }
  };
}

module.exports = { calculateFareFromMetersSeconds, metersToKm, secondsToMinutes };
