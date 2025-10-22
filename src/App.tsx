import React, { useMemo, useState } from "react";
// 간이 컴포넌트 (shadcn/ui 대체) — props 타입 추가
const Card: React.FC<React.PropsWithChildren<{ className?: string }>> = ({
  className = "",
  children,
}) => (
  <div className={`rounded-2xl border border-neutral-200 shadow-sm p-5 ${className}`}>
    {children}
  </div>
);

const Button: React.FC<React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>> = ({
  className = "",
  children,
  ...props
}) => (
  <button {...props} className={`px-4 py-2 rounded-2xl border bg-white hover:bg-neutral-50 ${className}`}>
    {children}
  </button>
);

// 아이콘 대체 (className 등 props를 받을 수 있도록 타입 선언)
type SpanIconProps = React.HTMLAttributes<HTMLSpanElement>;

const Sparkles: React.FC<SpanIconProps> = ({ className = "", ...rest }) => (
  <span className={className} {...rest}>✨</span>
);
const Calendar: React.FC<SpanIconProps> = ({ className = "", ...rest }) => (
  <span className={className} {...rest}>📅</span>
);
const Clock: React.FC<SpanIconProps> = ({ className = "", ...rest }) => (
  <span className={className} {...rest}>⏰</span>
);
const User: React.FC<SpanIconProps> = ({ className = "", ...rest }) => (
  <span className={className} {...rest}>👤</span>
);
const Loader2: React.FC<SpanIconProps> = ({ className = "", ...rest }) => (
  <span className={className} {...rest}>…</span>
);


// ------------------------------------------------------------
// ⚠️ 안내
// - 이 앱은 교육/연습용 미니 엔진을 내장해 사주(년/월/일/시) 간지와 간단한 오행 분석을 제공합니다.
// - 실제 명확한 사주풀이에선 절기(24절기) 정확 계산, 시간대, 일광절약, 지역 위도/경도 보정 등이 필요합니다.
// - 본 코드는 고정된 절입일(예: 2/4 입춘 등)을 사용한 근사치이며, 생산용에선 정밀 역법 라이브러리로 교체하세요.
// ------------------------------------------------------------

// 간지/오행 테이블
const stems = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const branches = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const stemElement: Record<string, string> = {"甲":"木","乙":"木","丙":"火","丁":"火","戊":"土","己":"土","庚":"金","辛":"金","壬":"水","癸":"水"};
const branchElement: Record<string, string> = {"子":"水","丑":"土","寅":"木","卯":"木","辰":"土","巳":"火","午":"火","未":"土","申":"金","酉":"金","戌":"土","亥":"水"};

// 절기 경계(근사) — 서울 기준 고정값 (월/일)
const SOLAR_TERMS = [
  { m: 2, d: 4, name: "입춘", branch: "寅" },
  { m: 3, d: 6, name: "경칩", branch: "卯" },
  { m: 4, d: 5, name: "청명", branch: "辰" },
  { m: 5, d: 6, name: "입하", branch: "巳" },
  { m: 6, d: 6, name: "망종", branch: "午" },
  { m: 7, d: 7, name: "소서", branch: "未" },
  { m: 8, d: 8, name: "입추", branch: "申" },
  { m: 9, d: 8, name: "백로", branch: "酉" },
  { m: 10, d: 8, name: "한로", branch: "戌" },
  { m: 11, d: 7, name: "입동", branch: "亥" },
  { m: 12, d: 7, name: "대설", branch: "子" },
  { m: 1, d: 6, name: "소한", branch: "丑" }, // 다음해 1/6 ~ 2/3
];

// 유틸: 날짜 → JDN (UTC기준 단순화)
function toJDN(y:number, m:number, d:number){
  // Fliegel–Van Flandern algorithm
  const a = Math.floor((14 - m)/12);
  const y2 = y + 4800 - a;
  const m2 = m + 12*a - 3;
  return d + Math.floor((153*m2 + 2)/5) + 365*y2 + Math.floor(y2/4) - Math.floor(y2/100) + Math.floor(y2/400) - 32045;
}

// 60갑자 인덱스 → 간지 문자열
function ganzhiFromIndex(idx: number){
  const s = stems[(idx % 10 + 10) % 10];
  const b = branches[(idx % 12 + 12) % 12];
  return s + b;
}

// 연간지: 기준 — 1984년(갑자) 입춘 이후는 그해, 이전은 전년
function yearIndexSolar(y:number, m:number, d:number){
  // 입춘 경계 (2/4 고정 근사)
  let year = (m > 2 || (m === 2 && d >= 4)) ? y : y - 1;
  // 1984 = 갑자(0)
  return ((year - 1984) % 60 + 60) % 60;
}

// 월간지: 입춘부터 寅월, 이후 절입일 경계로 12지 순행
function monthBranchByDate(y:number,m:number,d:number){
  // 절입 리스트를 y년도 적절히 배치
  const terms = [
    { y: m===1? y : y, m: 1, d: 6, br: "丑" },
    { y, m: 2, d: 4, br: "寅" },{ y, m: 3, d: 6, br: "卯" },{ y, m: 4, d: 5, br: "辰" },
    { y, m: 5, d: 6, br: "巳" },{ y, m: 6, d: 6, br: "午" },{ y, m: 7, d: 7, br: "未" },
    { y, m: 8, d: 8, br: "申" },{ y, m: 9, d: 8, br: "酉" },{ y, m: 10, d: 8, br: "戌" },
    { y, m: 11, d: 7, br: "亥" },{ y, m: 12, d: 7, br: "子" },
  ];
  // 해당 날짜가 속한 마지막 절입을 찾기
  let br = "丑"; // 기본값 (소한~입춘 직전)
  for(const t of terms){
    if(new Date(y, m-1, d) >= new Date(t.y, t.m-1, t.d)) br = t.br;
  }
  return br;
}

// 월간의 천간: 연간 천간군에 따라 1월(寅월) 시작천간이 정해짐
// 甲己年→丙, 乙庚年→戊, 丙辛年→庚, 丁壬年→壬, 戊癸年→甲
function monthStemStartByYearStem(yStem: string){
  const map: Record<string,string> = {
    "甲":"丙","己":"丙",
    "乙":"戊","庚":"戊",
    "丙":"庚","辛":"庚",
    "丁":"壬","壬":"壬",
    "戊":"甲","癸":"甲",
  };
  return map[yStem];
}

function monthStem(yStem:string, monthBranch:string){
  const order = ["寅","卯","辰","巳","午","未","申","酉","戌","亥","子","丑"]; // 절월 순서
  const start = monthStemStartByYearStem(yStem);
  const startIdx = stems.indexOf(start!);
  const mIdx = order.indexOf(monthBranch);
  return stems[(startIdx + mIdx) % 10];
}

// 일간지: 기준일 1984-02-04을 甲子(가정)로 두는 근사 JDN 기반.
// 정확 역법이 필요하면 교체하세요.
const JIAZI_REF = { y:1984, m:2, d:4, idx:0 }; // 甲子
function dayIndex(y:number,m:number,d:number){
  const ref = toJDN(JIAZI_REF.y, JIAZI_REF.m, JIAZI_REF.d);
  const cur = toJDN(y,m,d);
  return ((cur - ref) % 60 + 60) % 60;
}

// 시지/시간: 23~01 子, 01~03 丑 ... 2시간 단위
function hourBranch(h:number){
  const map = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
  // 전통적으로 23:00~01:00이 子시. 여기선 반올림 없이 구간 기준.
  const idx = Math.floor(((h + 1) % 24) / 2);
  return map[idx];
}
// 시간: 일간에 따라 子시 시작 천간이 달라지고, 이후 12지 순 증감
// 甲己→甲, 乙庚→丙, 丙辛→戊, 丁壬→庚, 戊癸→壬
function hourStem(dayStem:string, hBranch:string){
  const startMap: Record<string,string> = {
    "甲":"甲","己":"甲",
    "乙":"丙","庚":"丙",
    "丙":"戊","辛":"戊",
    "丁":"庚","壬":"庚",
    "戊":"壬","癸":"壬",
  };
  const order = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
  const startStem = startMap[dayStem];
  const baseIdx = stems.indexOf(startStem);
  const offset = order.indexOf(hBranch);
  return stems[(baseIdx + offset) % 10];
}

// 간단 오행 스코어
function scoreElements(pillars: {stem:string, branch:string}[]){
  const score: Record<string, number> = {"木":0,"火":0,"土":0,"金":0,"水":0};
  for(const p of pillars){
    score[stemElement[p.stem]] += 1;
    score[branchElement[p.branch]] += 0.8; // 지지는 가중치 낮춤
  }
  return score;
}

function prettyPillar(s:string,b:string){
  return `${s}${b}`;
}

function suggestions(score: Record<string,number>, dayStem:string){
  // 가장 약한/강한 오행을 찾아서 조언 구성
  const entries = Object.entries(score).sort((a,b)=>b[1]-a[1]);
  const strongest = entries[0][0];
  const weakest = entries[entries.length-1][0];
  const elemK = {"木":"성장·유연성","火":"표현·자신감","土":"안정·실행","金":"구조화·결단","水":"감성·사고"} as const;
  const lines = [
    `일간: ${dayStem}(${stemElement[dayStem]}) 기반 — 일주 중심 성향 반영`,
    `강한 오행: ${strongest} → 장점이 두드러집니다 (키워드: ${elemK[strongest as keyof typeof elemK]}).`,
    `보완 오행: ${weakest} → 생활 습관/업무 스타일로 보완을 권장합니다 (키워드: ${elemK[weakest as keyof typeof elemK]}).`
  ];
  return lines;
}

function readMeaning(pillars: {stem:string,branch:string}[]){
  const score = scoreElements(pillars);
  const dayStem = pillars[2].stem; // 일주 천간
  const tips = suggestions(score, dayStem);
  return { score, tips };
}

function formatScore(score: Record<string,number>){
  const labels = {"木":"목","火":"화","土":"토","金":"금","水":"수"};
  return Object.entries(score).map(([k,v])=>`${labels[k as keyof typeof labels]}: ${v.toFixed(1)}`).join(" · ");
}

export default function App(){
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("");
  const [gender, setGender] = useState<"남"|"여"|"">("");
  const [calendar, setCalendar] = useState<"양력"|"음력">("양력");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");

  const compute = ()=>{
    setError("");
    try{
      if(!date || !time || !gender){
        setError("생년월일, 시각, 성별을 모두 입력하세요.");
        return;
      }
      const dt = new Date(`${date}T${time}:00`);
      const y = dt.getFullYear();
      const m = dt.getMonth()+1;
      const d = dt.getDate();
      const hh = dt.getHours();

      // 양력/음력 전환 로직은 생략(실서비스에선 필요). 여기선 양력 기준으로 계산.
      if(calendar === "음력"){
        // 안내만: 실제 변환 필요
        console.warn("음력 입력은 정확도를 위해 양력 변환 모듈이 필요합니다.");
      }

      // 연간지
      const yIdx = yearIndexSolar(y,m,d);
      const yStem = stems[yIdx % 10];
      const yBranch = branches[yIdx % 12];

      // 월간지
      const mBranch = monthBranchByDate(y,m,d);
      const mStem = monthStem(yStem, mBranch);

      // 일간지
      const di = dayIndex(y,m,d);
      const dStem = stems[di % 10];
      const dBranch = branches[di % 12];

      // 시간
      const hBranch = hourBranch(hh);
      const hStem = hourStem(dStem, hBranch);

      const pillars = [
        { title: "년주", stem: yStem, branch: yBranch },
        { title: "월주", stem: mStem, branch: mBranch },
        { title: "일주", stem: dStem, branch: dBranch },
        { title: "시주", stem: hStem, branch: hBranch },
      ];

      const analysis = readMeaning(pillars.map(p=>({stem:p.stem, branch:p.branch})));

      setResult({ pillars, analysis, meta: { gender, calendar }});
    }catch(e:any){
      setError(e?.message || "계산 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 text-neutral-900">
      <div className="max-w-4xl mx-auto p-6">
        <header className="flex items-center gap-3 mb-6">
          <Sparkles className="w-6 h-6"/>
          <h1 className="text-2xl font-bold">사주 풀이 미니앱 · Beta</h1>
        </header>

        <Card className="p-5 shadow-sm border border-neutral-200">
          <div className="grid md:grid-cols-4 gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium flex items-center gap-2"><Calendar className="w-4 h-4"/>생년월일</span>
              <input type="date" className="border rounded-xl px-3 py-2" value={date} onChange={e=>setDate(e.target.value)} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium flex items-center gap-2"><Clock className="w-4 h-4"/>태어난 시각</span>
              <input type="time" className="border rounded-xl px-3 py-2" value={time} onChange={e=>setTime(e.target.value)} />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">달력</span>
              <select className="border rounded-xl px-3 py-2" value={calendar} onChange={e=>setCalendar(e.target.value as any)}>
                <option>양력</option>
                <option>음력</option>
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium flex items-center gap-2"><User className="w-4 h-4"/>성별</span>
              <select className="border rounded-xl px-3 py-2" value={gender} onChange={e=>setGender(e.target.value as any)}>
                <option value="">선택</option>
                <option>남</option>
                <option>여</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-3">
            <Button onClick={compute} className="rounded-2xl">
              {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : "사주 풀이하기"}
            </Button>
            <div className="text-xs text-neutral-500 self-center">※ 교육용 근사 계산 · 입춘(2/4) 기준, 절기 고정치 사용</div>
          </div>
        </Card>

        {error && (
          <div className="mt-4 text-sm text-red-600">{error}</div>
        )}

        {result && (
          <div className="mt-6 grid gap-4">
            <Card className="p-5">
              <h2 className="text-lg font-semibold mb-3">사주팔자 (四柱八字)</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {result.pillars.map((p:any, idx:number)=> (
                  <div key={idx} className="border rounded-2xl p-3 text-center">
                    <div className="text-xs text-neutral-500 mb-1">{p.title}</div>
                    <div className="text-2xl font-bold">{p.stem}{p.branch}</div>
                    <div className="text-xs">{stemElement[p.stem]} / {branchElement[p.branch]}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-lg font-semibold mb-2">오행 균형</h2>
              <p className="text-sm text-neutral-600 mb-3">간단 스코어(지지는 가중치 0.8 적용)</p>
              <div className="text-sm">{formatScore(result.analysis.score)}</div>
            </Card>

            <Card className="p-5">
              <h2 className="text-lg font-semibold mb-2">해석 요약</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {result.analysis.tips.map((line:string, i:number)=> (
                  <li key={i}>{line}</li>
                ))}
              </ul>
              <div className="mt-3 text-xs text-neutral-500">※ 상세 격국/용신/대운/주역 해석 로직은 서비스 확장 시 모듈로 분리하여 심화 가능합니다.</div>
            </Card>

            <Card className="p-5">
              <h2 className="text-lg font-semibold mb-2">개발자 메모</h2>
              <ol className="list-decimal pl-5 text-sm space-y-1">
                <li>정확 역법을 위해서는 24절기(UTC)와 타임존 변환, 윤초/윤달 계산을 포함한 천문 라이브러리 연동이 필요합니다.</li>
                <li>음력 입력은 현재 안내만 제공(양력 변환 모듈 필요). 생산환경에서는 한국천문연구원 API 또는 오픈소스 역법 사용 권장.</li>
                <li>일주(일간지) 기준 엔진이므로 일간 오행에 가중치를 높여 심화 분석을 구현할 수 있습니다.</li>
                <li>주역 통합: 대운 계산 후 시기별 키워드를 괘상(예: 震→巽→離…)에 매핑하는 룰셋 추가 가능.</li>
              </ol>
            </Card>
          </div>
        )}

        <footer className="mt-10 text-xs text-neutral-500">
          © 2025 사주·주역 미니앱 · Educational use only
        </footer>
      </div>
    </div>
  );
}
