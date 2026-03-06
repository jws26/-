import { useState, useEffect } from "react";

const STORAGE_KEY = "survey_app_data";

const defaultSurvey = {
  title: "내 설문지",
  description: "설문에 참여해 주셔서 감사합니다.",
  questions: [
    { id: 1, type: "radio", text: "이 서비스에 만족하시나요?", options: ["매우 만족", "만족", "보통", "불만족", "매우 불만족"] },
    { id: 2, type: "checkbox", text: "어떤 기능이 가장 유용했나요? (복수 선택)", options: ["기능 A", "기능 B", "기능 C", "기능 D"] },
    { id: 3, type: "text", text: "개선하고 싶은 점이 있으시면 적어주세요.", options: [] },
  ],
};

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { survey: defaultSurvey, responses: [] };
    return JSON.parse(raw);
  } catch {
    return { survey: defaultSurvey, responses: [] };
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function QRCode({ url, size = 200 }) {
  if (!url) return null;
  const encoded = encodeURIComponent(url);
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
  return (
    <img src={src} alt="QR Code" style={{ width: size, height: size, borderRadius: 8, border: "4px solid #fff", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }} />
  );
}

// ── TAB: 설문 편집 ──────────────────────────────────────────────
function EditTab({ survey, onChange }) {
  const [localSurvey, setLocalSurvey] = useState(survey);
  useEffect(() => setLocalSurvey(survey), [survey]);

  const update = (updated) => { setLocalSurvey(updated); onChange(updated); };
  const addQuestion = () => {
    const newQ = { id: Date.now(), type: "radio", text: "새 질문", options: ["옵션 1", "옵션 2"] };
    update({ ...localSurvey, questions: [...localSurvey.questions, newQ] });
  };
  const removeQuestion = (id) => update({ ...localSurvey, questions: localSurvey.questions.filter(q => q.id !== id) });
  const updateQuestion = (id, field, value) => update({ ...localSurvey, questions: localSurvey.questions.map(q => q.id === id ? { ...q, [field]: value } : q) });
  const addOption = (id) => { const q = localSurvey.questions.find(q => q.id === id); updateQuestion(id, "options", [...q.options, `옵션 ${q.options.length + 1}`]); };
  const updateOption = (qid, idx, val) => { const q = localSurvey.questions.find(q => q.id === qid); const opts = [...q.options]; opts[idx] = val; updateQuestion(qid, "options", opts); };
  const removeOption = (qid, idx) => { const q = localSurvey.questions.find(q => q.id === qid); updateQuestion(qid, "options", q.options.filter((_, i) => i !== idx)); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={cardStyle}>
        <label style={labelStyle}>설문 제목</label>
        <input style={inputStyle} value={localSurvey.title} onChange={e => update({ ...localSurvey, title: e.target.value })} placeholder="설문 제목을 입력하세요" />
        <label style={{ ...labelStyle, marginTop: 12 }}>설명</label>
        <textarea style={{ ...inputStyle, height: 72, resize: "vertical" }} value={localSurvey.description} onChange={e => update({ ...localSurvey, description: e.target.value })} placeholder="설문 설명을 입력하세요" />
      </div>
      {localSurvey.questions.map((q, qi) => (
        <div key={q.id} style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontWeight: 700, color: "#6C63FF", fontSize: 13 }}>질문 {qi + 1}</span>
            <button onClick={() => removeQuestion(q.id)} style={dangerBtnStyle}>삭제</button>
          </div>
          <label style={labelStyle}>질문 내용</label>
          <input style={inputStyle} value={q.text} onChange={e => updateQuestion(q.id, "text", e.target.value)} placeholder="질문을 입력하세요" />
          <label style={{ ...labelStyle, marginTop: 12 }}>답변 유형</label>
          <select style={inputStyle} value={q.type} onChange={e => updateQuestion(q.id, "type", e.target.value)}>
            <option value="radio">단일 선택 (라디오)</option>
            <option value="checkbox">복수 선택 (체크박스)</option>
            <option value="text">주관식 텍스트</option>
          </select>
          {q.type !== "text" && (
            <div style={{ marginTop: 12 }}>
              <label style={labelStyle}>선택지</label>
              {q.options.map((opt, oi) => (
                <div key={oi} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                  <input style={{ ...inputStyle, flex: 1, marginBottom: 0 }} value={opt} onChange={e => updateOption(q.id, oi, e.target.value)} />
                  <button onClick={() => removeOption(q.id, oi)} style={dangerBtnStyle}>×</button>
                </div>
              ))}
              <button onClick={() => addOption(q.id)} style={secondaryBtnStyle}>+ 선택지 추가</button>
            </div>
          )}
        </div>
      ))}
      <button onClick={addQuestion} style={primaryBtnStyle}>+ 질문 추가</button>
    </div>
  );
}

// ── TAB: 설문 참여 ──────────────────────────────────────────────
function SurveyTab({ survey, onSubmit }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleRadio = (qid, val) => setAnswers(a => ({ ...a, [qid]: val }));
  const handleCheckbox = (qid, val, checked) => setAnswers(a => { const prev = a[qid] || []; return { ...a, [qid]: checked ? [...prev, val] : prev.filter(v => v !== val) }; });
  const handleText = (qid, val) => setAnswers(a => ({ ...a, [qid]: val }));
  const handleSubmit = () => { onSubmit({ answers, timestamp: new Date().toISOString() }); setSubmitted(true); setAnswers({}); };

  if (submitted) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
      <h2 style={{ color: "#6C63FF", marginBottom: 8 }}>응답 완료!</h2>
      <p style={{ color: "#888", marginBottom: 24 }}>소중한 의견 감사합니다.</p>
      <button onClick={() => setSubmitted(false)} style={primaryBtnStyle}>다시 참여하기</button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ ...cardStyle, background: "linear-gradient(135deg, #6C63FF22, #FF6B9D22)", border: "1px solid #6C63FF44" }}>
        <h2 style={{ margin: "0 0 8px", color: "#6C63FF" }}>{survey.title}</h2>
        <p style={{ margin: 0, color: "#666" }}>{survey.description}</p>
      </div>
      {survey.questions.map((q, qi) => (
        <div key={q.id} style={cardStyle}>
          <p style={{ fontWeight: 700, marginBottom: 14, color: "#222" }}><span style={{ color: "#6C63FF" }}>{qi + 1}.</span> {q.text}</p>
          {q.type === "radio" && q.options.map(opt => (
            <label key={opt} style={choiceStyle}>
              <input type="radio" name={`q_${q.id}`} value={opt} checked={answers[q.id] === opt} onChange={() => handleRadio(q.id, opt)} style={{ accentColor: "#6C63FF" }} />
              {opt}
            </label>
          ))}
          {q.type === "checkbox" && q.options.map(opt => (
            <label key={opt} style={choiceStyle}>
              <input type="checkbox" value={opt} checked={(answers[q.id] || []).includes(opt)} onChange={e => handleCheckbox(q.id, opt, e.target.checked)} style={{ accentColor: "#6C63FF" }} />
              {opt}
            </label>
          ))}
          {q.type === "text" && (
            <textarea style={{ ...inputStyle, height: 80, resize: "vertical" }} value={answers[q.id] || ""} onChange={e => handleText(q.id, e.target.value)} placeholder="답변을 입력해 주세요..." />
          )}
        </div>
      ))}
      <button onClick={handleSubmit} style={{ ...primaryBtnStyle, fontSize: 16, padding: "16px 24px" }}>제출하기 →</button>
    </div>
  );
}

// ── TAB: 결과 보기 ──────────────────────────────────────────────
function ResultsTab({ survey, responses, onClear }) {
  if (responses.length === 0) return (
    <div style={{ textAlign: "center", padding: "60px 20px", color: "#aaa" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
      <p>아직 응답이 없습니다.</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ background: "#6C63FF", color: "#fff", borderRadius: 20, padding: "6px 18px", fontWeight: 700 }}>총 {responses.length}명 응답</div>
        <button onClick={onClear} style={dangerBtnStyle}>전체 초기화</button>
      </div>
      {survey.questions.map((q, qi) => {
        const allAnswers = responses.map(r => r.answers[q.id]).filter(Boolean);
        if (q.type === "text") return (
          <div key={q.id} style={cardStyle}>
            <h4 style={{ color: "#6C63FF", marginBottom: 12 }}>{qi + 1}. {q.text}</h4>
            {allAnswers.length === 0 ? <p style={{ color: "#aaa" }}>응답 없음</p> : allAnswers.map((ans, i) => (
              <div key={i} style={{ background: "#f8f8ff", borderRadius: 8, padding: "10px 14px", marginBottom: 8, fontSize: 14, color: "#444", borderLeft: "3px solid #6C63FF" }}>{ans}</div>
            ))}
          </div>
        );
        const counts = {};
        q.options.forEach(opt => counts[opt] = 0);
        allAnswers.forEach(ans => { const vals = Array.isArray(ans) ? ans : [ans]; vals.forEach(v => { if (counts[v] !== undefined) counts[v]++; }); });
        return (
          <div key={q.id} style={cardStyle}>
            <h4 style={{ color: "#6C63FF", marginBottom: 16 }}>{qi + 1}. {q.text}</h4>
            {q.options.map(opt => {
              const count = counts[opt];
              const pct = Math.round((count / responses.length) * 100);
              return (
                <div key={opt} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4 }}>
                    <span style={{ color: "#444" }}>{opt}</span>
                    <span style={{ fontWeight: 700, color: "#6C63FF" }}>{count}명 ({pct}%)</span>
                  </div>
                  <div style={{ background: "#f0eeff", borderRadius: 20, height: 10, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #6C63FF, #FF6B9D)", borderRadius: 20, transition: "width 0.5s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
      <div style={cardStyle}>
        <h4 style={{ color: "#6C63FF", marginBottom: 12 }}>개별 응답 기록</h4>
        {responses.map((r, i) => (
          <div key={i} style={{ borderBottom: "1px solid #f0f0f0", paddingBottom: 10, marginBottom: 10, fontSize: 13, color: "#666" }}>
            <span style={{ fontWeight: 600 }}>응답 {i + 1}</span> · {new Date(r.timestamp).toLocaleString("ko-KR")}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── TAB: QR 코드 ──────────────────────────────────────────────
function QRTab() {
  const currentBase = window.location.origin;
  const publicUrl = `${currentBase}?mode=public`;
  const [customUrl, setCustomUrl] = useState("");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* 참여자용 QR (자동 생성) */}
      <div style={cardStyle}>
        <h3 style={{ color: "#6C63FF", marginBottom: 4 }}>👥 참여자용 QR (설문만 보임)</h3>
        <p style={{ color: "#888", fontSize: 13, marginBottom: 16 }}>이 QR을 인쇄해서 나눠주세요.<br />탭 없이 설문 화면만 바로 열립니다!</p>
        <div style={{ textAlign: "center" }}>
          <QRCode url={publicUrl} size={200} />
          <p style={{ fontSize: 11, color: "#bbb", marginTop: 10, wordBreak: "break-all" }}>{publicUrl}</p>
          <a
            href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(publicUrl)}`}
            download="survey-qr-public.png" target="_blank" rel="noreferrer"
            style={{ ...primaryBtnStyle, display: "inline-block", textDecoration: "none", marginTop: 8 }}
          >⬇ QR 이미지 다운로드</a>
        </div>
      </div>

      {/* 커스텀 URL QR */}
      <div style={cardStyle}>
        <h3 style={{ color: "#6C63FF", marginBottom: 4 }}>🔗 다른 URL로 QR 만들기</h3>
        <input style={{ ...inputStyle, marginTop: 8 }} value={customUrl} onChange={e => setCustomUrl(e.target.value)} placeholder="https://..." />
        {customUrl && (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <QRCode url={customUrl} size={180} />
            <a
              href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(customUrl)}`}
              download="survey-qr-custom.png" target="_blank" rel="noreferrer"
              style={{ ...primaryBtnStyle, display: "inline-block", textDecoration: "none", marginTop: 12 }}
            >⬇ QR 이미지 다운로드</a>
          </div>
        )}
      </div>

      <div style={{ ...cardStyle, background: "#fffbeb", border: "1px solid #fde68a" }}>
        <h4 style={{ color: "#92400e", marginTop: 0, marginBottom: 8 }}>💡 두 가지 링크 정리</h4>
        <div style={{ fontSize: 14, color: "#78350f", lineHeight: 2 }}>
          <p style={{ margin: 0 }}>👤 <b>관리자용</b> (탭 전체 보임): <span style={{ fontSize: 11, color: "#999" }}>{currentBase}</span></p>
          <p style={{ margin: 0 }}>👥 <b>참여자용</b> (설문만 보임): <span style={{ fontSize: 11, color: "#999" }}>{publicUrl}</span></p>
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────
export default function App() {
  const isPublicMode = new URLSearchParams(window.location.search).get("mode") === "public";
  const [tab, setTab] = useState("survey");
  const [data, setData] = useState(loadData);

  const updateSurvey = (survey) => { const updated = { ...data, survey }; setData(updated); saveData(updated); };
  const addResponse = (response) => { const updated = { ...data, responses: [...data.responses, response] }; setData(updated); saveData(updated); };
  const clearResponses = () => { if (!window.confirm("모든 응답을 삭제할까요?")) return; const updated = { ...data, responses: [] }; setData(updated); saveData(updated); };

  const tabs = [
    { id: "survey", label: "📝 설문 참여" },
    { id: "edit", label: "✏️ 설문 편집" },
    { id: "results", label: `📊 결과 (${data.responses.length})` },
    { id: "qr", label: "📱 QR 코드" },
  ];

  // ── 참여자 전용 모드 ──
  if (isPublicMode) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f5f3ff 0%, #fdf2f8 100%)", fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" }}>
        <div style={{ background: "linear-gradient(135deg, #6C63FF, #FF6B9D)", padding: "24px 20px", textAlign: "center", boxShadow: "0 4px 20px rgba(108,99,255,0.3)" }}>
          <h1 style={{ margin: 0, color: "#fff", fontSize: 22, fontWeight: 800 }}>📋 설문 참여</h1>
          <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.8)", fontSize: 13 }}>잠깐의 시간을 내어 주셔서 감사합니다 🙏</p>
        </div>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px 40px" }}>
          <SurveyTab survey={data.survey} onSubmit={addResponse} />
        </div>
      </div>
    );
  }

  // ── 관리자 모드 ──
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f5f3ff 0%, #fdf2f8 100%)", fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" }}>
      <div style={{ background: "linear-gradient(135deg, #6C63FF, #FF6B9D)", padding: "24px 20px", textAlign: "center", boxShadow: "0 4px 20px rgba(108,99,255,0.3)" }}>
        <h1 style={{ margin: 0, color: "#fff", fontSize: 22, fontWeight: 800 }}>📋 Survey Builder</h1>
        <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.8)", fontSize: 13 }}>설문 만들기 · 참여하기 · 결과 보기</p>
      </div>
      <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #eee", overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "14px 8px", border: "none", background: "none", cursor: "pointer",
            fontSize: 13, fontWeight: tab === t.id ? 700 : 400,
            color: tab === t.id ? "#6C63FF" : "#999",
            borderBottom: tab === t.id ? "2px solid #6C63FF" : "2px solid transparent",
            transition: "all 0.2s", whiteSpace: "nowrap"
          }}>{t.label}</button>
        ))}
      </div>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px 40px" }}>
        {tab === "survey" && <SurveyTab survey={data.survey} onSubmit={addResponse} />}
        {tab === "edit" && <EditTab survey={data.survey} onChange={updateSurvey} />}
        {tab === "results" && <ResultsTab survey={data.survey} responses={data.responses} onClear={clearResponses} />}
        {tab === "qr" && <QRTab />}
      </div>
    </div>
  );
}

// ── Styles ──
const cardStyle = { background: "#fff", borderRadius: 16, padding: "20px", boxShadow: "0 2px 12px rgba(108,99,255,0.08)", border: "1px solid #f0eeff" };
const inputStyle = { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e5e0ff", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 4, background: "#fafaff", fontFamily: "inherit", color: "#333" };
const labelStyle = { display: "block", fontSize: 12, fontWeight: 700, color: "#888", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 };
const primaryBtnStyle = { background: "linear-gradient(135deg, #6C63FF, #9B59FF)", color: "#fff", border: "none", borderRadius: 12, padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", width: "100%", textAlign: "center" };
const secondaryBtnStyle = { background: "#f0eeff", color: "#6C63FF", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 8 };
const dangerBtnStyle = { background: "#fff0f0", color: "#e55", border: "1px solid #fdd", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" };
const choiceStyle = { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "#fafaff", border: "1.5px solid #e5e0ff", marginBottom: 8, cursor: "pointer", fontSize: 14, color: "#333" };
