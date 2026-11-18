const SVG_NS = "http://www.w3.org/2000/svg";

export function buildChartModel(measurements, width = 600, height = 220) {
  if (!measurements.length) return null;
  const margin = 24;
  const values = measurements.flatMap((item) => [item.durationSeconds, item.baselineSeconds]);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = Math.max(60, maxValue - minValue);
  const times = measurements.map((item) => Date.parse(item.observedAt));
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const timeRange = Math.max(1, maxTime - minTime);

  const point = (item, value) => {
    const x = margin + ((Date.parse(item.observedAt) - minTime) / timeRange) * (width - margin * 2);
    const y = height - margin - ((value - minValue) / valueRange) * (height - margin * 2);
    return `${Number(x.toFixed(1))},${Number(y.toFixed(1))}`;
  };

  return {
    currentPoints: measurements.map((item) => point(item, item.durationSeconds)).join(" "),
    baselinePoints: measurements.map((item) => point(item, item.baselineSeconds)).join(" "),
    labels: {
      min: `${Math.round(minValue / 60)} min`,
      max: `${Math.round(maxValue / 60)} min`,
    },
  };
}

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

export function renderHistoryChart(container, measurements) {
  container.replaceChildren();
  const model = buildChartModel(measurements);
  if (!model) {
    const empty = document.createElement("p");
    empty.className = "empty-chart";
    empty.textContent = "Noch kein Verlauf verfügbar.";
    container.append(empty);
    return;
  }

  const svg = svgElement("svg", {
    viewBox: "0 0 600 220",
    role: "img",
    "aria-label": "Fahrzeitverlauf der letzten 60 Minuten",
  });
  svg.append(
    svgElement("line", { x1: 24, y1: 196, x2: 576, y2: 196, class: "chart-grid" }),
    svgElement("polyline", { points: model.baselinePoints, class: "chart-line chart-line--baseline" }),
    svgElement("polyline", { points: model.currentPoints, class: "chart-line chart-line--current" }),
  );
  const maxLabel = svgElement("text", { x: 24, y: 18, class: "chart-label" });
  maxLabel.textContent = model.labels.max;
  const minLabel = svgElement("text", { x: 24, y: 216, class: "chart-label" });
  minLabel.textContent = model.labels.min;
  svg.append(maxLabel, minLabel);
  container.append(svg);
}
