// Inverse orthographic projection: project each visible pixel back onto the unit
// sphere, rotate it into geographic space, and sample an equirectangular mask.
// This replaces thousands of JS → native path operations on every UI frame.
export const GLOBE_LAND_SHADER = `
uniform shader landMask;
uniform float2 center;
uniform float radius;
uniform float3 east;
uniform float3 north;
uniform float3 forward;
uniform float4 landColor;
uniform float4 edgeColor;
uniform float4 gridColor;

half4 main(float2 xy) {
  float2 p = (xy - center) / radius;
  p.y = -p.y;
  float z2 = 1.0 - dot(p, p);
  if (z2 < 0.0) return half4(0.0);
  float3 world = p.x * east + p.y * north + sqrt(z2) * forward;
  float lon = atan(world.y, world.x);
  float lat = asin(clamp(world.z, -1.0, 1.0));
  float2 uv = float2((lon + 3.14159265359) * 325.949323452,
                     (1.57079632679 - lat) * 325.949323452);
  half4 mask = landMask.eval(uv);
  float landAlpha = mask.r * landColor.a;
  float edgeAlpha = mask.g * edgeColor.a;
  float gridAlpha = mask.b * gridColor.a * (1.0 - landAlpha);
  float3 color = edgeColor.rgb * edgeAlpha
    + (landColor.rgb * landAlpha + gridColor.rgb * gridAlpha) * (1.0 - edgeAlpha);
  float alpha = edgeAlpha + (landAlpha + gridAlpha) * (1.0 - edgeAlpha);
  return half4(color, alpha);
}
`
