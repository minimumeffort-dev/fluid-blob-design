struct Params {
  color_a: vec4f,
  color_b: vec4f,
  color_c: vec4f,
  color_d: vec4f,
  color_e: vec4f,
  color_f: vec4f,
  resolution: vec2f,
  time: f32,
  motion: f32,
  shape_mode: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

const TAU: f32 = 6.28318530718;

fn hash_2d(point: vec2f) -> f32 {
  return fract(sin(dot(point, vec2f(127.1, 311.7))) * 43758.5453);
}

fn landscape_blob_sdf(point: vec2f, aspect: f32, phase: f32) -> f32 {
  let center = vec2f(
    sin(phase * 0.31) * 0.035 * aspect,
    cos(phase * 0.27) * 0.028,
  );
  let radii = vec2f(0.48 * aspect, 0.345);
  let normalized = (point - center) / radii;
  let angle = atan2(normalized.y, normalized.x);
  let fold = sin(angle * 2.0 - phase * 0.88) * 0.115
    + sin(angle * 3.0 + phase * 0.63) * 0.072
    + sin(angle * 5.0 - phase * 0.42) * 0.035;
  let swell = sin(phase * 0.37) * 0.026;
  return (length(normalized) - (1.0 + fold + swell)) * min(radii.x, radii.y);
}

fn portrait_blob_sdf(point: vec2f, aspect: f32, phase: f32) -> f32 {
  let center = vec2f(
    sin(phase * 0.28) * 0.024 * aspect,
    0.015 + cos(phase * 0.24) * 0.022,
  );
  let radii = vec2f(0.405 * aspect, 0.47);
  let normalized = (point - center) / radii;
  let angle = atan2(normalized.y, normalized.x);
  let fold = sin(angle * 2.0 - phase * 0.75) * 0.075
    + sin(angle * 3.0 + phase * 0.58) * 0.05
    + sin(angle * 5.0 - phase * 0.39) * 0.024;
  let vertical_taper = normalized.y * 0.055;
  return (length(normalized) - (1.0 + fold + vertical_taper)) * min(radii.x, radii.y);
}

fn blob_sdf(point: vec2f, aspect: f32, phase: f32) -> f32 {
  if (params.shape_mode > 0.5) {
    return portrait_blob_sdf(point, aspect, phase);
  }
  return landscape_blob_sdf(point, aspect, phase);
}

fn contour_palette_at(angle: f32, phase: f32) -> vec3f {
  let t = fract(angle / TAU + 0.5 + phase * 0.012);
  let weight_a = 0.07 + pow(max(cos((t - 0.02) * TAU), 0.0), 5.0);
  let weight_b = 0.07 + pow(max(cos((t - 0.19) * TAU), 0.0), 5.0);
  let weight_c = 0.07 + pow(max(cos((t - 0.36) * TAU), 0.0), 5.0);
  let weight_d = 0.07 + pow(max(cos((t - 0.53) * TAU), 0.0), 5.0);
  let weight_e = 0.07 + pow(max(cos((t - 0.70) * TAU), 0.0), 5.0);
  let weight_f = 0.07 + pow(max(cos((t - 0.87) * TAU), 0.0), 5.0);
  let weight_sum = weight_a + weight_b + weight_c + weight_d + weight_e + weight_f;
  return (
    params.color_a.rgb * weight_a
      + params.color_b.rgb * weight_b
      + params.color_c.rgb * weight_c
      + params.color_d.rgb * weight_d
      + params.color_e.rgb * weight_e
      + params.color_f.rgb * weight_f
  ) / weight_sum;
}

fn liquid_palette_at(point: vec2f, phase: f32) -> vec3f {
  let drift = vec2f(
    sin(point.y * 2.15 + phase * 0.31),
    cos(point.x * 1.85 - phase * 0.27),
  ) * 0.095;
  let warped = point + drift;
  let anchor_a = vec2f(-0.62 + sin(phase * 0.21) * 0.08, -0.38);
  let anchor_b = vec2f(0.05, -0.63 + cos(phase * 0.18) * 0.08);
  let anchor_c = vec2f(0.62 + cos(phase * 0.2) * 0.07, -0.18);
  let anchor_d = vec2f(0.54, 0.52 + sin(phase * 0.17) * 0.08);
  let anchor_e = vec2f(-0.08 + cos(phase * 0.16) * 0.07, 0.64);
  let anchor_f = vec2f(-0.64, 0.28 + sin(phase * 0.19) * 0.08);
  let weight_a = 0.025 + exp(-dot(warped - anchor_a, warped - anchor_a) * 2.8);
  let weight_b = 0.025 + exp(-dot(warped - anchor_b, warped - anchor_b) * 2.8);
  let weight_c = 0.025 + exp(-dot(warped - anchor_c, warped - anchor_c) * 2.8);
  let weight_d = 0.025 + exp(-dot(warped - anchor_d, warped - anchor_d) * 2.8);
  let weight_e = 0.025 + exp(-dot(warped - anchor_e, warped - anchor_e) * 2.8);
  let weight_f = 0.025 + exp(-dot(warped - anchor_f, warped - anchor_f) * 2.8);
  let weight_sum = weight_a + weight_b + weight_c + weight_d + weight_e + weight_f;
  return (
    params.color_a.rgb * weight_a
      + params.color_b.rgb * weight_b
      + params.color_c.rgb * weight_c
      + params.color_d.rgb * weight_d
      + params.color_e.rgb * weight_e
      + params.color_f.rgb * weight_f
  ) / weight_sum;
}

@fragment
fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let safe_height = max(params.resolution.y, 1.0);
  let aspect = params.resolution.x / safe_height;
  let phase = params.time * 0.72 * params.motion;

  var point = uv - vec2f(0.5);
  point.x *= aspect;

  var shape_point = point / 0.75;
  if (params.shape_mode > 0.5) {
    shape_point = point / 0.78;
  }

  let distance_field = blob_sdf(shape_point, aspect, phase);
  let edge_aa = max(fwidth(distance_field) * 0.9, 0.0007);
  let inside = 1.0 - smoothstep(-edge_aa, edge_aa, distance_field);
  let depth = max(-distance_field, 0.0);
  let inner_edge = 1.0 - smoothstep(0.0, 0.064, depth);
  let fine_rim = exp(-abs(distance_field) * 142.0);

  let epsilon = 0.0025;
  let gradient = vec2f(
    blob_sdf(shape_point + vec2f(epsilon, 0.0), aspect, phase)
      - blob_sdf(shape_point - vec2f(epsilon, 0.0), aspect, phase),
    blob_sdf(shape_point + vec2f(0.0, epsilon), aspect, phase)
      - blob_sdf(shape_point - vec2f(0.0, epsilon), aspect, phase),
  );
  let normal = normalize(gradient + vec2f(0.00001));
  let angle = atan2(normal.y, normal.x);
  let contour_palette = contour_palette_at(angle, phase);
  let luminous_palette = mix(contour_palette, vec3f(1.0), 0.18);

  var normalization = vec2f(0.49 * aspect, 0.36);
  if (params.shape_mode > 0.5) {
    normalization = vec2f(0.44 * aspect, 0.49);
  }
  let normalized = shape_point / normalization;
  let velvet = 0.5 + 0.5 * sin(
    normalized.x * 3.4
      - normalized.y * 2.7
      + phase * 0.35
  );
  let surface_palette = liquid_palette_at(normalized, phase);
  let crossing_palette = liquid_palette_at(
    normalized * vec2f(-0.82, 0.88) + vec2f(0.18, -0.12),
    phase + 1.7,
  );
  let dark_tint = mix(vec3f(0.018, 0.03, 0.026), params.color_c.rgb * 0.24, 0.46);
  var body = mix(surface_palette, crossing_palette, velvet * 0.18);
  let edge_depth = clamp(length(normalized), 0.0, 1.15);
  body = mix(body, dark_tint, 0.1 + edge_depth * 0.13);
  body *= 0.94 + (1.0 - clamp(edge_depth, 0.0, 1.0)) * 0.12;

  let key_light = normalize(vec2f(-0.68, -0.74));
  let fill_light = normalize(vec2f(0.8, 0.6));
  let key_specular = pow(max(dot(normal, key_light), 0.0), 10.0);
  let fill_specular = pow(max(dot(normal, fill_light), 0.0), 18.0);
  let moving_glint = 0.64 + 0.36 * sin(angle * 6.0 - phase * 1.25);

  body += luminous_palette * inner_edge * (0.08 + moving_glint * 0.07);
  body += vec3f(0.94, 0.98, 0.96) * key_specular * inner_edge * 0.58;
  body += luminous_palette * fill_specular * inner_edge * 0.38;

  let rim_strength = fine_rim * (0.68 + moving_glint * 0.34);
  var color = mix(body, luminous_palette * 1.16, clamp(rim_strength, 0.0, 0.94));

  let grain = hash_2d(floor(uv * params.resolution)) - 0.5;
  color += vec3f(grain * 0.0045 * inside);
  let premultiplied = clamp(color, vec3f(0.0), vec3f(1.0)) * inside;
  return vec4f(premultiplied, inside);
}
