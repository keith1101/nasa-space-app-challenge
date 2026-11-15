/**
 * Fast Geodesic and Point-in-Polygon (PIP) ray casting utilities.
 * Used for boundary validation against Natural Earth Admin-0 polygons.
 */

export function isPointInPolygonRing(lat: number, lon: number, ring: number[][]): boolean {
  let inside = false;
  const n = ring.length;
  let p1Lon = ring[0][0];
  let p1Lat = ring[0][1];

  for (let i = 1; i <= n; i++) {
    const p2 = ring[i % n];
    const p2Lon = p2[0];
    const p2Lat = p2[1];

    if (lat > Math.min(p1Lat, p2Lat) && lat <= Math.max(p1Lat, p2Lat)) {
      if (lon <= Math.max(p1Lon, p2Lon)) {
        let xinters = p1Lon;
        if (p1Lat !== p2Lat) {
          xinters = ((lat - p1Lat) * (p2Lon - p1Lon)) / (p2Lat - p1Lat) + p1Lon;
        }
        if (p1Lon === p2Lon || lon <= xinters) {
          inside = !inside;
        }
      }
    }
    p1Lon = p2Lon;
    p1Lat = p2Lat;
  }
  return inside;
}

export function isPointInGeoJson(lat: number, lon: number, geometry: any): boolean {
  if (!geometry || !geometry.coordinates) return false;
  if (geometry.type === 'Polygon') {
    return isPointInPolygonRing(lat, lon, geometry.coordinates[0]);
  }
  if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) {
      if (isPointInPolygonRing(lat, lon, poly[0])) return true;
    }
  }
  return false;
}
