import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const projectDir = resolve("projects/fixture-load-path-structural-verification");
const figureDir = resolve(projectDir, "figures");
mkdirSync(figureDir, { recursive: true });

const ded = JSON.parse(readFileSync(resolve(projectDir, "data/ded-process-prediction.json"), "utf8"));
const quality = JSON.parse(readFileSync(resolve(projectDir, "data/quality-control-workflow.json"), "utf8"));

const esc = (value: unknown) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const svg = (width: number, height: number, body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
  <style>
    text { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: #111827; }
    .title { font-size: 34px; font-weight: 700; }
    .subtitle { font-size: 19px; fill: #4b5563; }
    .section { font-size: 20px; font-weight: 700; }
    .label { font-size: 17px; font-weight: 600; }
    .small { font-size: 15px; fill: #4b5563; }
    .tiny { font-size: 13px; fill: #6b7280; }
    .box { fill: #ffffff; stroke: #334155; stroke-width: 2; rx: 16; }
    .core { fill: #f8fafc; stroke: #0f172a; stroke-width: 3; rx: 18; }
    .flow { stroke: #64748b; stroke-width: 2.5; fill: none; marker-end: url(#arrow); }
    .rule { stroke: #94a3b8; stroke-width: 1.5; }
  </style>
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#64748b"/>
    </marker>
  </defs>
  <rect width="100%" height="100%" fill="#ffffff"/>
  ${body}
</svg>
`;

function architectureFigure() {
  const sources = [
    { x: 40, w: 250, title: "Product definition", lines: ["STEP Part 21 / AP242", "product + revision identity"] },
    { x: 330, w: 250, title: "CAE", lines: ["CalculiX / Nastran", "normalized solver results"] },
    { x: 620, w: 320, title: "Machine / edge", lines: ["OPC UA · MTConnect · Sparkplug", "timestamped process signals"] },
    { x: 980, w: 250, title: "MES genealogy", lines: ["REST / SQL adapters", "unit → run → recipe → equipment"] },
    { x: 1270, w: 290, title: "Metrology", lines: ["QIF 3.x", "CTQ + device + uncertainty"] },
  ];
  let body = `
    <text x="40" y="58" class="title">Manufacturing engineering integration architecture</text>
    <text x="40" y="91" class="subtitle">External systems normalize into one evidence model before FEA or quality decisions are allowed to consume them.</text>
  `;
  for (const source of sources) {
    body += `<rect x="${source.x}" y="135" width="${source.w}" height="135" class="box"/>
      <text x="${source.x + 18}" y="171" class="section">${esc(source.title)}</text>
      <text x="${source.x + 18}" y="204" class="small">${esc(source.lines[0])}</text>
      <text x="${source.x + 18}" y="230" class="small">${esc(source.lines[1])}</text>
      <path d="M${source.x + source.w / 2} 270 L${source.x + source.w / 2} 330 L800 330 L800 370" class="flow"/>
    `;
  }
  body += `
    <rect x="430" y="370" width="740" height="205" class="core"/>
    <text x="800" y="414" text-anchor="middle" class="section">Canonical engineering model</text>
    <text x="800" y="454" text-anchor="middle" class="label">product revision · feature / CTQ identity · unit / run / recipe genealogy</text>
    <text x="800" y="488" text-anchor="middle" class="label">process signal · measurement observation · normalized structural result</text>
    <line x1="475" y1="515" x2="1125" y2="515" class="rule"/>
    <text x="800" y="548" text-anchor="middle" class="small">fail closed on missing identity, bad quality, invalid sequence, or unsupported evidence</text>

    <path d="M650 575 L650 650" class="flow"/>
    <path d="M950 575 L950 650" class="flow"/>

    <rect x="300" y="650" width="520" height="160" class="box"/>
    <text x="560" y="690" text-anchor="middle" class="section">FEA verification</text>
    <text x="560" y="726" text-anchor="middle" class="small">geometry / load revision → solver adapter → normalized results</text>
    <text x="560" y="756" text-anchor="middle" class="small">equilibrium · mesh convergence · independent Julia cross-check</text>
    <text x="560" y="786" text-anchor="middle" class="tiny">Current live solver: CalculiX · recorded compatibility fixture: Nastran BDF/F06</text>

    <rect x="850" y="650" width="520" height="160" class="box"/>
    <text x="1110" y="690" text-anchor="middle" class="section">Predictive quality &amp; process control</text>
    <text x="1110" y="726" text-anchor="middle" class="small">process signals → physical CTQ → grouped validation</text>
    <text x="1110" y="756" text-anchor="middle" class="small">MSA → stability → capability → SPC → OCAP → requalification</text>
    <text x="1110" y="786" text-anchor="middle" class="tiny">Real DED evidence stops before unsupported MSA / capability / SPC claims</text>

    <text x="40" y="865" class="tiny">Portfolio boundary: protocol/compatibility fixtures demonstrate integration seams; live vendor certification is not claimed.</text>
  `;
  writeFileSync(resolve(figureDir, "system-architecture.svg"), svg(1600, 900, body));
}

function predictionFigure() {
  const recipe = ded.primary.recipeOnly;
  const ir = ded.primary.recipePlusIr;
  const reduction = ded.primary.relativeRmseReduction * 100;
  const stress = ded.stress.recipePlusIr;
  const maxRmse = Math.max(recipe.rmseMm, ir.rmseMm) * 1.25;
  const chartX = 100, chartY = 190, chartW = 600, chartH = 330;
  const barW = 170;
  const scaleY = (v: number) => chartY + chartH - (v / maxRmse) * chartH;
  const baseY = chartY + chartH;
  let body = `
    <text x="60" y="60" class="title">Does in-process sensing add predictive value?</text>
    <text x="60" y="94" class="subtitle">Real public DED-LB data · leave-one-powder-flow-level-out validation · bead-width CTQ</text>
    <text x="100" y="150" class="section">Held-out RMSE</text>
    <line x1="${chartX}" y1="${baseY}" x2="${chartX + chartW}" y2="${baseY}" stroke="#334155" stroke-width="2"/>
    <line x1="${chartX}" y1="${chartY}" x2="${chartX}" y2="${baseY}" stroke="#334155" stroke-width="2"/>
  `;
  const bars = [
    { x: 180, label: "Recipe only", value: recipe.rmseMm, r2: recipe.r2, fill: "#cbd5e1" },
    { x: 420, label: "Recipe + IR", value: ir.rmseMm, r2: ir.r2, fill: "#94a3b8" },
  ];
  for (const bar of bars) {
    const y = scaleY(bar.value);
    const h = baseY - y;
    body += `
      <rect x="${bar.x}" y="${y}" width="${barW}" height="${h}" rx="12" fill="${bar.fill}" stroke="#475569" stroke-width="1.5"/>
      <text x="${bar.x + barW/2}" y="${y - 14}" text-anchor="middle" class="label">${bar.value.toFixed(4)} mm</text>
      <text x="${bar.x + barW/2}" y="${baseY + 34}" text-anchor="middle" class="label">${bar.label}</text>
      <text x="${bar.x + barW/2}" y="${baseY + 61}" text-anchor="middle" class="small">held-out R² = ${bar.r2.toFixed(3)}</text>
    `;
  }
  body += `
    <rect x="765" y="175" width="375" height="165" class="core"/>
    <text x="952" y="217" text-anchor="middle" class="section">${reduction.toFixed(2)}% lower RMSE</text>
    <text x="952" y="254" text-anchor="middle" class="small">IR adds incremental predictive value</text>
    <text x="952" y="282" text-anchor="middle" class="small">inside the curated 1000 W window</text>
    <text x="952" y="315" text-anchor="middle" class="tiny">23 tracks · 4,905 aligned active IR frames</text>

    <rect x="765" y="375" width="375" height="175" class="box"/>
    <text x="952" y="417" text-anchor="middle" class="section">Stress test</text>
    <text x="952" y="454" text-anchor="middle" class="label">leave-one-speed-level-out R² = ${stress.r2.toFixed(3)}</text>
    <text x="952" y="491" text-anchor="middle" class="small">RMSE improves, but R² remains negative</text>
    <text x="952" y="521" text-anchor="middle" class="label">Unseen-speed extrapolation: unsupported</text>

    <rect x="60" y="625" width="1080" height="62" rx="12" fill="#f8fafc" stroke="#cbd5e1"/>
    <text x="85" y="653" class="small">Bounded conclusion:</text>
    <text x="85" y="677" class="label">Sensing carries useful information about final geometry inside the sampled process window; general extrapolation is not established.</text>
  `;
  writeFileSync(resolve(figureDir, "prediction-performance.svg"), svg(1200, 720, body));
}

function spcFigure() {
  const demo = quality.syntheticProductionDemonstration;
  const base: number[] = demo.controlPlan.controlMethod.baselineObservations
    ? JSON.parse(readFileSync(resolve(projectDir, "data/synthetic/quality-control-demo.json"), "utf8")).baselineValues
    : [];
  const monitor: number[] = JSON.parse(readFileSync(resolve(projectDir, "data/synthetic/quality-control-demo.json"), "utf8")).monitoringValues;
  const all = [...base, ...monitor];
  const lsl = demo.ctq.lsl;
  const usl = demo.ctq.usl;
  const lcl = demo.baseline.lcl;
  const ucl = demo.baseline.ucl;
  const center = demo.baseline.mean;
  const width = 1400, height = 760;
  const x0 = 90, y0 = 145, chartW = 1200, chartH = 470;
  const ymin = lsl - 0.05, ymax = usl + 0.05;
  const x = (i: number) => x0 + (i / (all.length - 1)) * chartW;
  const y = (v: number) => y0 + (ymax - v) / (ymax - ymin) * chartH;
  const poly = all.map((v,i)=>`${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const first = demo.firstViolation;
  const firstOverallIndex = base.length + first.index;
  const lines = [
    { v: usl, label: `USL ${usl.toFixed(1)}`, dash: "8 7", stroke: "#64748b" },
    { v: ucl, label: `UCL ${ucl.toFixed(4)}`, dash: "5 5", stroke: "#334155" },
    { v: center, label: `Center ${center.toFixed(4)}`, dash: "3 6", stroke: "#94a3b8" },
    { v: lcl, label: `LCL ${lcl.toFixed(4)}`, dash: "5 5", stroke: "#334155" },
    { v: lsl, label: `LSL ${lsl.toFixed(1)}`, dash: "8 7", stroke: "#64748b" },
  ];
  let body = `
    <text x="60" y="58" class="title">SPC catches the process shift before specification failure</text>
    <text x="60" y="92" class="subtitle">Synthetic production-control demonstration · I-MR baseline and fixed control limits</text>
    <rect x="${x0}" y="${y0}" width="${chartW}" height="${chartH}" fill="#ffffff" stroke="#cbd5e1"/>
  `;
  for (const line of lines) {
    body += `
      <line x1="${x0}" y1="${y(line.v)}" x2="${x0+chartW}" y2="${y(line.v)}" stroke="${line.stroke}" stroke-width="1.7" stroke-dasharray="${line.dash}"/>
      <text x="${x0+chartW+12}" y="${y(line.v)+5}" class="tiny">${line.label}</text>
    `;
  }
  const transitionX = x(base.length - 0.5);
  body += `
    <line x1="${transitionX}" y1="${y0}" x2="${transitionX}" y2="${y0+chartH}" stroke="#64748b" stroke-width="2"/>
    <text x="${x(base.length/2)}" y="${y0+chartH+35}" text-anchor="middle" class="small">32-point qualified baseline</text>
    <text x="${x(base.length + monitor.length/2 - 1)}" y="${y0+chartH+35}" text-anchor="middle" class="small">synthetic monitoring stream</text>
    <polyline points="${poly}" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
  `;
  all.forEach((v,i)=>{
    const alarm = i === firstOverallIndex;
    body += `<circle cx="${x(i)}" cy="${y(v)}" r="${alarm ? 7 : 4}" fill="${alarm ? "#111827" : "#ffffff"}" stroke="#0f172a" stroke-width="2"/>`;
  });
  body += `
    <path d="M${x(firstOverallIndex)} ${y(first.value)-10} L1085 220" class="flow"/>
    <rect x="880" y="135" width="395" height="120" class="core"/>
    <text x="1077" y="174" text-anchor="middle" class="section">First special-cause signal</text>
    <text x="1077" y="207" text-anchor="middle" class="label">${first.value.toFixed(2)} mm &gt; UCL ${ucl.toFixed(4)} mm</text>
    <text x="1077" y="234" text-anchor="middle" class="small">still inside the ${lsl.toFixed(1)}–${usl.toFixed(1)} mm engineering spec</text>

    <rect x="90" y="670" width="1200" height="58" rx="12" fill="#f8fafc" stroke="#cbd5e1"/>
    <text x="115" y="696" class="label">OCAP response:</text>
    <text x="265" y="696" class="small">outOfControl → containment → corrective action → requalificationRequired</text>
    <text x="115" y="719" class="tiny">The workflow does not automatically resume production after correction.</text>
  `;
  writeFileSync(resolve(figureDir, "spc-ocap.svg"), svg(width, height, body));
}

architectureFigure();
predictionFigure();
spcFigure();

console.log(JSON.stringify({
  figures: [
    "figures/system-architecture.svg",
    "figures/prediction-performance.svg",
    "figures/spc-ocap.svg",
  ],
}, null, 2));
