export interface DedRow {
  track:number; capture:number; powerCmdW:number; speedCmdMmS:number; powderFlowCmdGMin:number;
  laserMeanW:number; laserStdW:number; tcpMeanMmS:number; tcpStdMmS:number; alignedIrFrames:number;
  irDiameter50MedianPx:number; irIntensitySumMedian:number; irWeightedRadiusMedianPx:number;
  macrographScalePxPerMm:number; beadWidthMm:number; beadHeightMm:number; beadAreaMm2:number;
}
export interface Metrics { rmseMm:number; maeMm:number; r2:number; }
export interface DedAnalysis {
  schema:"fixture-structural.ded-process-prediction/v1";
  observations:number; alignedIrFrames:number;
  maximumLaserMeanRelativeDeviation:number; maximumTcpMeanRelativeDeviation:number;
  primary:{recipeOnly:Metrics; recipePlusIr:Metrics; relativeRmseReduction:number; irAddsPredictiveValue:boolean};
  stress:{recipeOnly:Metrics; recipePlusIr:Metrics; relativeRmseReduction:number; unseenSpeedExtrapolationSupported:boolean};
}
const H=["track","capture","power_cmd_w","speed_cmd_mm_s","powder_flow_cmd_g_min","laser_mean_w","laser_std_w","tcp_mean_mm_s","tcp_std_mm_s","aligned_ir_frames","ir_diameter50_median_px","ir_intensity_sum_median","ir_weighted_radius_median_px","macrograph_scale_px_per_mm","bead_width_mm","bead_height_mm","bead_area_mm2"];
export function parseDedCsv(csv:string):DedRow[] {
  const lines=csv.trim().split(/\r?\n/); const hdr=lines[0]!.split(",");
  if (hdr.length!==H.length || hdr.some((v,i)=>v!==H[i])) throw new Error("unexpected DED CSV header");
  return lines.slice(1).map((line,ri)=>{
    const f=line.split(",").map(Number); if (f.length!==H.length || f.some(v=>!Number.isFinite(v))) throw new Error("invalid DED row "+ri);
    return {track:f[0]!,capture:f[1]!,powerCmdW:f[2]!,speedCmdMmS:f[3]!,powderFlowCmdGMin:f[4]!,laserMeanW:f[5]!,laserStdW:f[6]!,tcpMeanMmS:f[7]!,tcpStdMmS:f[8]!,alignedIrFrames:f[9]!,irDiameter50MedianPx:f[10]!,irIntensitySumMedian:f[11]!,irWeightedRadiusMedianPx:f[12]!,macrographScalePxPerMm:f[13]!,beadWidthMm:f[14]!,beadHeightMm:f[15]!,beadAreaMm2:f[16]!};
  });
}
function solve(a:number[][],b:number[]):number[] {
  const n=b.length,m=a.map((r,i)=>[...r,b[i]!]);
  for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(m[r]![c]!)>Math.abs(m[p]![c]!))p=r;[m[c],m[p]]=[m[p]!,m[c]!];const d=m[c]![c]!;if(Math.abs(d)<1e-12)throw new Error("singular");for(let j=c;j<=n;j++)m[c]![j]=m[c]![j]!/d;for(let r=0;r<n;r++){if(r===c)continue;const q=m[r]![c]!;for(let j=c;j<=n;j++)m[r]![j]=m[r]![j]!-q*m[c]![j]!;}}
  return m.map(r=>r[n]!);
}
function fit(x:number[][],y:number[],lambda=10){
  const p=x[0]!.length,mu=Array.from({length:p},(_,j)=>x.reduce((s,r)=>s+r[j]!,0)/x.length);
  const sd=mu.map((u,j)=>{const v=Math.sqrt(x.reduce((s,r)=>s+(r[j]!-u)**2,0)/x.length);return v<1e-12?1:v;});
  const d=x.map(r=>[1,...r.map((v,j)=>(v-mu[j]!)/sd[j]!)]);
  const n=p+1,ata=Array.from({length:n},()=>Array(n).fill(0) as number[]),aty=Array(n).fill(0) as number[];
  for(let i=0;i<d.length;i++)for(let j=0;j<n;j++){aty[j]=aty[j]!+d[i]![j]!*y[i]!;for(let k=0;k<n;k++)ata[j]![k]=ata[j]![k]!+d[i]![j]!*d[i]![k]!;}
  for(let j=1;j<n;j++)ata[j]![j]=ata[j]![j]!+lambda;
  return {mu,sd,b:solve(ata,aty)};
}
function pred(m:ReturnType<typeof fit>,r:number[]){let v=m.b[0]!;for(let j=0;j<r.length;j++)v+=m.b[j+1]!*((r[j]!-m.mu[j]!)/m.sd[j]!);return v;}
function grouped(rows:DedRow[],group:(r:DedRow)=>number,features:(r:DedRow)=>number[]):Metrics{
  const gs=[...new Set(rows.map(group))],pm=new Map<number,number>();
  for(const g of gs){const tr=rows.filter(r=>group(r)!==g),te=rows.filter(r=>group(r)===g),m=fit(tr.map(features),tr.map(r=>r.beadWidthMm));for(const r of te)pm.set(r.track,pred(m,features(r)));}
  const y=rows.map(r=>r.beadWidthMm),yh=rows.map(r=>pm.get(r.track)!);const e=y.map((v,i)=>yh[i]!-v),mean=y.reduce((a,b)=>a+b,0)/y.length,sse=e.reduce((a,b)=>a+b*b,0),sst=y.reduce((a,b)=>a+(b-mean)**2,0);
  return {rmseMm:Math.sqrt(sse/y.length),maeMm:e.reduce((a,b)=>a+Math.abs(b),0)/e.length,r2:1-sse/sst};
}
export function analyzeDed(rows:DedRow[]):DedAnalysis{
  const s=[...rows].sort((a,b)=>a.track-b.track);
  if(s.length!==23||s.some((r,i)=>r.track!==i+28))throw new Error("requires tracks 28-50");
  if(s.some(r=>r.capture!==r.track+12))throw new Error("track/capture identity mismatch");
  if(s.some(r=>r.powerCmdW!==1000||r.alignedIrFrames<=0||r.beadWidthMm<=0))throw new Error("invalid curated DED row");
  const ldev=Math.max(...s.map(r=>Math.abs(r.laserMeanW-r.powerCmdW)/r.powerCmdW)),sdev=Math.max(...s.map(r=>Math.abs(r.tcpMeanMmS-r.speedCmdMmS)/r.speedCmdMmS));
  if(ldev>0.07||sdev>0.04)throw new Error("monitoring consistency gate failed");
  const recipe=(r:DedRow)=>[r.speedCmdMmS,r.powderFlowCmdGMin],ir=(r:DedRow)=>[r.speedCmdMmS,r.powderFlowCmdGMin,r.irDiameter50MedianPx,r.irIntensitySumMedian];
  const p0=grouped(s,r=>r.powderFlowCmdGMin,recipe),p1=grouped(s,r=>r.powderFlowCmdGMin,ir),q0=grouped(s,r=>r.speedCmdMmS,recipe),q1=grouped(s,r=>r.speedCmdMmS,ir);
  return {schema:"fixture-structural.ded-process-prediction/v1",observations:s.length,alignedIrFrames:s.reduce((a,r)=>a+r.alignedIrFrames,0),maximumLaserMeanRelativeDeviation:ldev,maximumTcpMeanRelativeDeviation:sdev,primary:{recipeOnly:p0,recipePlusIr:p1,relativeRmseReduction:1-p1.rmseMm/p0.rmseMm,irAddsPredictiveValue:p1.rmseMm<p0.rmseMm},stress:{recipeOnly:q0,recipePlusIr:q1,relativeRmseReduction:1-q1.rmseMm/q0.rmseMm,unseenSpeedExtrapolationSupported:q1.r2>0}};
}
