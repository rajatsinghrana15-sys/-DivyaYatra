export function tripTypeLabel(type) {
  return ({
    general: "General trip",
    pilgrimage: "Pilgrimage",
    family_vacation: "Family vacation package",
    family: "Family trip",
  })[type] || "General trip";
}

export function pickupLabel(type) {
  return ({
    city_points: "Pickup at 1–2 city points",
    door_to_door: "Door-to-door pickup",
    none: "Pickup details to be confirmed",
  })[type] || "Pickup details to be confirmed";
}

export function pickupMapUrl(trip, point) {
  const index = (trip?.pickupPoints || []).indexOf(point);
  const supplied = index >= 0 ? trip?.pickupMapUrls?.[index] : "";
  if (supplied && /^https:\/\//i.test(supplied)) return supplied;
  const query = [point, trip?.pickupCity || trip?.origin, trip?.state].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
