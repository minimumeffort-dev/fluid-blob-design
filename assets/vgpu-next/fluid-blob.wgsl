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
  highlight_strength: f32,
  depth_strength: f32,
}

@group(0) @binding(0) var<uniform> params: Params;

fn hash_2d(point: vec2f) -> f32 {
  return fract(sin(dot(point, vec2f(127.1, 311.7))) * 43758.5453);
}

fn landscape_sdf(point: vec2f, aspect: f32, phase: f32) -> f32 {
  let center = vec2f(
    sin(phase * 0.31) * 0.018 * aspect,
    cos(phase * 0.27) * 0.014,
  );
  let radii = vec2f(0.47 * aspect, 0.34);
  let normalized = (point - center) / radii;
  let angle = atan2(normalized.y, normalized.x);
  let fold = sin(angle * 2.0 - phase * 0.82) * 0.085
    + sin(angle * 3.0 + phase * 0.57) * 0.052
    + sin(angle * 5.0 - phase * 0.36) * 0.022;
  let breath = sin(phase * 0.29) * 0.014;
  return (length(normalized) - (1.0 + fold + breath)) * min(radii.x, radii.y);
}

fn portrait_sdf(point: vec2f, aspect: f32, phase: f32) -> f32 {
  let center = vec2f(
    sin(phase * 0.28) * 0.012 * aspect,
    0.012 + cos(phase * 0.24) * 0.012,
  );
  let radii = vec2f(0.36 * aspect, 0.45);
  let normalized = (point - center) / radii;
  let angle = atan2(normalized.y, normalized.x);
  let fold = sin(angle * 2.0 - phase * 0.72) * 0.062
    + sin(angle * 3.0 + phase * 0.51) * 0.038
    + sin(angle * 5.0 - phase * 0.32) * 0.018;
  let taper = normalized.y * 0.045;
  return (length(normalized) - (1.0 + fold + taper)) * min(radii.x, radii.y);
}

fn blob_sdf(point: vec2f, aspect: f32, phase: f32) -> f32 {
  if (params.shape_mode > 0.5) {
    return portrait_sdf(point, aspect, phase);
  }
  return landscape_sdf(point, aspect, phase);
}

fn palette_at(point: vec2f, phase: f32) -> vec3f {
  let drift = vec2f(
    sin(point.y * 2.1 + phase * 0.24),
    cos(point.x * 1.8 - phase * 0.21),
  ) * 0.072;
  let warped = point + drift;

  let anchor_a = vec2f(-0.58 + sin(phase * 0.18) * 0.055, -0.38);
  let anchor_b = vec2f(0.02, -0.62 + cos(phase * 0.16) * 0.05);
  let anchor_c = vec2f(0.61 + cos(phase * 0.17) * 0.05, -0.16);
  let anchor_d = vec2f(0.53, 0.5 + sin(phase * 0.15) * 0.05);
  let anchor_e = vec2f(-0.08 + cos(phase * 0.14) * 0.05, 0.62);
  let anchor_f = vec2f(-0.62, 0.25 + sin(phase * 0.17) * 0.05);

  let weight_a = 0.025 + exp(-dot(warped - anchor_a, warped - anchor_a) * 2.85);
  let weight_b = 0.025 + exp(-dot(warped - anchor_b, warped - anchor_b) * 2.85);
  let weight_c = 0.025 + exp(-dot(warped - anchor_c, warped - anchor_c) * 2.85);
  let weight_d = 0.025 + exp(-dot(warped - anchor_d, warped - anchor_d) * 2.85);
  let weight_e = 0.025 + exp(-dot(warped - anchor_e, warped - anchor_e) * 2.85);
  let weight_f = 0.025 + exp(-dot(warped - anchor_f, warped - anchor_f) * 2.85);
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
  let phase = params.time * 0.58 * params.motion;

  var point = uv - vec2f(0.5);
  point.x *= aspect;

  // The scale leaves transparent safety area around the maximum deformation.
  var shape_point = point / 0.76;
  if (params.shape_mode > 0.5) {
    shape_point = point / 0.79;
  }

  let distance_field = blob_sdf(shape_point, aspect, phase);
  let edge_aa = max(fwidth(distance_field), 0.00065);
  let alpha = 1.0 - smoothstep(-edge_aa, edge_aa, distance_field);

  let epsilon = 0.0025;
  let gradient = vec2f(
    blob_sdf(shape_point + vec2f(epsilon, 0.0), aspect, phase)
      - blob_sdf(shape_point - vec2f(epsilon, 0.0), aspect, phase),
    blob_sdf(shape_point + vec2f(0.0, epsilon), aspect, phase)
      - blob_sdf(shape_point - vec2f(0.0, epsilon), aspect, phase),
  );
  let normal = normalize(gradient + vec2f(0.00001));

  var normalization = vec2f(0.49 * aspect, 0.36);
  if (params.shape_mode > 0.5) {
    normalization = vec2f(0.39 * aspect, 0.47);
  }
  let material_point = shape_point / normalization;
  var color = palette_at(material_point, phase);

  let radial_depth = clamp(length(material_point), 0.0, 1.2);
  color *= 1.0 - params.depth_strength * smoothstep(0.28, 1.12, radial_depth);

  let key_light = normalize(vec2f(-0.7, -0.72));
  let specular = pow(max(dot(normal, key_light), 0.0), 12.0);
  let palette_highlight = mix(color, vec3f(1.0), 0.28);
  color += palette_highlight * specular * params.highlight_strength;

  let grain = hash_2d(floor(uv * params.resolution)) - 0.5;
  color *= 1.0 + grain * 0.007 * alpha;

  let premultiplied = clamp(color, vec3f(0.0), vec3f(1.0)) * alpha;
  return vec4f(premultiplied, alpha);
}
