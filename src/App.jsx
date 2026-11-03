import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Bell, Check, CheckCircle2,
  ChevronDown, ChevronRight, CircleHelp, Clapperboard, Clipboard, CreditCard, Download,
  ExternalLink, FileText, FolderOpen, GripVertical, ImagePlus, LayoutGrid, Link2,
  LoaderCircle, Menu, Moon, Plus, Settings2, ShieldCheck, Sparkles, Sun, Trash2,
  Upload, UserRound, X,
} from 'lucide-react';
import { createVideo, MOTION_STYLES, parseListing, VIDEO_FORMATS, VIDEO_LANGUAGES } from './video.js';

const EMPTY_FORM = {
  projectName: '', make: '', model: '', trim: '', year: '', mileage: '', fuel: '',
  transmission: '', askingPrice: '', currency: '₩', location: '', additionalDetails: '',
};
const MAX_PHOTOS = 10;
const MAX_FILE_BYTES = 20 * 1024 * 1024;

function applyParsed(setForm, parsed) {
  setForm((current) => ({
    ...current,
    make: parsed.make || current.make,
    model: parsed.model || current.model,
    year: parsed.year || current.year,
    mileage: parsed.mileage || current.mileage,
    fuel: parsed.fuel || current.fuel,
    transmission: parsed.transmission || current.transmission,
    askingPrice: parsed.askingPrice || current.askingPrice,
    projectName: current.projectName || [parsed.year, parsed.make, parsed.model].filter(Boolean).join(' '),
    additionalDetails: current.additionalDetails || parsed.text?.slice(0, 1200) || '',
  }));
}

function Field({ label, value, onChange, placeholder, type = 'text', suffix, ...props }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className={`input-shell ${suffix ? 'has-suffix' : ''}`}>
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} {...props} />
        {suffix && <span className="input-suffix">{suffix}</span>}
      </span>
    </label>
  );
}

function PanelLabel({ icon: Icon, children }) {
  return <div className="panel-label"><Icon size={14} strokeWidth={2.2} /><span>{children}</span></div>;
}

function Brand() {
  return (
    <div className="brand-lockup" aria-label="OtoVideo">
      <img src="./brand/logo-dark.svg" alt="" />
      <strong>OTOVIDEO</strong>
      <span className="brand-domain">.NET</span>
    </div>
  );
}

function SideBar({ open, close, onNavigate }) {
  return (
    <>
      {open && <button className="drawer-scrim" aria-label="메뉴 닫기" onClick={close} />}
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="sidebar-brand"><Brand /><button className="icon-button drawer-close" onClick={close} aria-label="메뉴 닫기"><X size={19} /></button></div>
        <div className="sidebar-content">
          <button className="new-video-button" onClick={() => { onNavigate('create'); close(); }}><Plus size={18} /><span>영상 만들기</span><Sparkles size={15} /></button>
          <div className="nav-group">
            <span className="nav-heading">콘텐츠 스튜디오</span>
            <button className="nav-item" onClick={() => onNavigate('overview')}><LayoutGrid size={17} /><span>개요</span></button>
            <button className="nav-item" onClick={() => onNavigate('projects')}><FolderOpen size={17} /><span>내 프로젝트</span></button>
            <button className="nav-item active" onClick={() => onNavigate('create')}><Clapperboard size={17} /><span>영상 만들기</span></button>
          </div>
          <div className="nav-group">
            <span className="nav-heading">결제 및 패키지</span>
            <button className="nav-item" onClick={() => onNavigate('rights')}><CreditCard size={17} /><span>영상 이용권</span><span className="nav-lock">안내</span></button>
            <button className="nav-item" onClick={() => onNavigate('orders')}><Clipboard size={17} /><span>주문 내역</span></button>
          </div>
          <div className="nav-group">
            <span className="nav-heading">계정 및 지원</span>
            <button className="nav-item" onClick={() => onNavigate('brand')}><UserRound size={17} /><span>프로필 및 브랜딩</span></button>
            <button className="nav-item" onClick={() => onNavigate('notifications')}><Bell size={17} /><span>알림</span></button>
            <button className="nav-item" onClick={() => onNavigate('support')}><CircleHelp size={17} /><span>도움말</span></button>
          </div>
        </div>
        <div className="sidebar-footer">
          <div className="privacy-card"><ShieldCheck size={15} /><span>사진과 영상은 이 브라우저에서 처리됩니다.</span></div>
          <div className="account-row"><div className="account-avatar">OV</div><div className="account-info"><strong>브라우저 제작 모드</strong><span>로그인 없이 바로 사용</span></div><Settings2 size={17} /></div>
        </div>
      </aside>
    </>
  );
}

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState('url');
  const [language, setLanguage] = useState('ko');
  const [listingUrl, setListingUrl] = useState('');
  const [listingText, setListingText] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [photos, setPhotos] = useState([]);
  const [formatId, setFormatId] = useState('vertical');
  const [motionId, setMotionId] = useState('cinematic');
  const [busyImport, setBusyImport] = useState(false);
  const [toast, setToast] = useState(null);
  const [phase, setPhase] = useState('editing');
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const inputRef = useRef(null);
  const photoSectionRef = useRef(null);
  const fileInputRef = useRef(null);
  const toastTimer = useRef(null);
  const photosRef = useRef(photos);
  const videoUrlRef = useRef(videoUrl);
  const selectedFormat = useMemo(() => VIDEO_FORMATS.find((item) => item.id === formatId) || VIDEO_FORMATS[0], [formatId]);
  const selectedMotion = useMemo(() => MOTION_STYLES.find((item) => item.id === motionId) || MOTION_STYLES[1], [motionId]);

  useEffect(() => { photosRef.current = photos; }, [photos]);
  useEffect(() => { videoUrlRef.current = videoUrl; }, [videoUrl]);
  useEffect(() => () => {
    photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.preview));
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    window.clearTimeout(toastTimer.current);
  }, []);

  function notify(message, kind = 'info') {
    setToast({ message, kind });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }

  function patchForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function addPhotos(fileList) {
    const candidates = Array.from(fileList || []);
    if (!candidates.length) return;
    const allowed = candidates.filter((file) => file.size <= MAX_FILE_BYTES && (/image\/(jpeg|png|webp)/i.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name)));
    const tooLarge = candidates.length - candidates.filter((file) => file.size <= MAX_FILE_BYTES).length;
    const room = MAX_PHOTOS - photos.length;
    const accepted = allowed.slice(0, Math.max(0, room)).map((file) => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }));
    if (accepted.length) setPhotos((current) => [...current, ...accepted]);
    if (tooLarge) notify('사진 한 장의 크기는 20MB를 넘을 수 없습니다.', 'error');
    else if (allowed.length !== candidates.length) notify('JPG, PNG 또는 WebP 사진을 추가해 주세요. HEIC 사진은 먼저 JPG로 변환해야 합니다.', 'error');
    else if (allowed.length > room) notify('사진은 최대 10장까지 추가할 수 있습니다.', 'error');
    else if (accepted.length) notify(`${accepted.length}장의 사진을 추가했습니다.`, 'success');
  }

  function removePhoto(id) {
    setPhotos((current) => {
      const found = current.find((photo) => photo.id === id);
      if (found) URL.revokeObjectURL(found.preview);
      return current.filter((photo) => photo.id !== id);
    });
  }

  function movePhoto(from, to) {
    if (from === null || from === to || to < 0 || to >= photos.length) return;
    setPhotos((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  async function addRemotePhotos(urls) {
    if (!urls.length) return 0;
    let added = 0;
    for (const url of urls.slice(0, MAX_PHOTOS - photos.length)) {
      try {
        const response = await fetch(url, { mode: 'cors', signal: AbortSignal.timeout(8000) });
        if (!response.ok) continue;
        const blob = await response.blob();
        if (!blob.type.startsWith('image/') || blob.size > MAX_FILE_BYTES) continue;
        const file = new File([blob], `매물사진-${added + 1}.${blob.type.split('/')[1] || 'jpg'}`, { type: blob.type });
        setPhotos((current) => current.length < MAX_PHOTOS ? [...current, { id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }] : current);
        added += 1;
      } catch { /* 사이트가 교차 출처 사진 읽기를 허용하지 않으면 직접 업로드로 전환 */ }
    }
    return added;
  }

  async function importFromLink() {
    if (!listingUrl.trim()) return notify('매물 페이지 주소를 입력해 주세요.', 'error');
    let url;
    try { url = new URL(listingUrl.trim()); } catch { return notify('http 또는 https로 시작하는 주소를 입력해 주세요.', 'error'); }
    if (!['http:', 'https:'].includes(url.protocol)) return notify('웹 페이지 주소만 가져올 수 있습니다.', 'error');
    setBusyImport(true);
    try {
      const response = await fetch(url.href, { mode: 'cors', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('listing_fetch_failed');
      const source = await response.text();
      const parsed = parseListing(source);
      applyParsed(setForm, parsed);
      const loaded = await addRemotePhotos(parsed.images);
      if (!parsed.make && !parsed.model && !parsed.year && loaded === 0) {
        throw new Error('listing_parse_empty');
      }
      notify(loaded ? `차량 정보와 사진 ${loaded}장을 가져왔습니다.` : '차량 정보를 채웠습니다. 사진은 직접 추가해 주세요.', 'success');
    } catch {
      setMode('text');
      notify('매물 사이트가 외부 가져오기를 차단했습니다. 매물 텍스트 또는 페이지 소스를 붙여넣어 주세요.', 'error');
    } finally { setBusyImport(false); }
  }

  async function parsePastedText() {
    if (!listingText.trim()) return notify('매물 텍스트 또는 페이지 소스를 붙여넣어 주세요.', 'error');
    const parsed = parseListing(listingText);
    applyParsed(setForm, parsed);
    const loaded = await addRemotePhotos(parsed.images);
    if (!parsed.make && !parsed.model && !parsed.year && !parsed.text) {
      return notify('차량 정보를 찾지 못했습니다. 제조사·모델·연식이 포함된 텍스트를 확인해 주세요.', 'error');
    }
    notify(loaded ? `차량 정보를 채우고 사진 ${loaded}장을 가져왔습니다.` : '차량 정보를 채웠습니다. 사진을 업로드해 주세요.', 'success');
  }

  function validate() {
    if (!form.make.trim() || !form.model.trim() || !form.year.trim()) {
      notify('제조사, 모델, 연식을 입력해 주세요.', 'error');
      document.getElementById(!form.make.trim() ? 'make' : !form.model.trim() ? 'model' : 'year')?.focus();
      return false;
    }
    if (!photos.length) {
      notify('차량 사진을 한 장 이상 추가해 주세요. 8장 이상이면 더 풍부한 영상을 만들 수 있습니다.', 'error');
      photoSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  }

  async function createProject() {
    if (!validate()) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl('');
    setVideoInfo(null);
    setProgress(0);
    setPhase('rendering');
    const normalizedPrice = form.askingPrice.replace(/[^\d,.]/g, '').replace(/,/g, '');
    const spec = { ...form, askingPrice: normalizedPrice ? Number(normalizedPrice).toLocaleString('ko-KR') : '', currency: form.currency };
    try {
      const result = await createVideo(photos.map((photo) => photo.file), spec, {
        width: selectedFormat.width,
        height: selectedFormat.height,
        style: motionId,
      }, setProgress);
      const url = URL.createObjectURL(result.blob);
      setVideoUrl(url);
      setVideoInfo({ ...result, fileName: `${(form.projectName || `${form.make}-${form.model}`).toLowerCase().replace(/[^a-z0-9가-힣]+/gi, '-').replace(/^-|-$/g, '') || 'otovideo'}.mp4`, bytes: result.blob.size });
      setPhase('complete');
      notify('MP4 영상이 준비됐습니다.', 'success');
    } catch (error) {
      setPhase('editing');
      notify(error?.message || '영상 생성 중 문제가 발생했습니다. 사진과 브라우저 지원 여부를 확인해 주세요.', 'error');
    }
  }

  function startOver() {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl('');
    setVideoInfo(null);
    setPhase('editing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function navNotice(section) {
    const names = { overview: '개요', projects: '내 프로젝트', rights: '영상 이용권', orders: '주문 내역', brand: '프로필 및 브랜딩', notifications: '알림', support: '도움말' };
    if (section === 'create') { document.getElementById('create-form')?.scrollIntoView({ behavior: 'smooth' }); return; }
    notify(`${names[section] || '이 메뉴'}는 계정 서버 연결 후 사용할 수 있습니다.`);
  }

  function renderEditingForm() {
    return (
      <>
        <div className="intro-row"><div><div className="eyebrow">OTOVIDEO STUDIO</div><h1>영상 만들기</h1></div><div className="intro-badge"><Sparkles size={15} /><span>브라우저에서 제작</span></div></div>
        <section className="page-intro">
          <h2>차량 영상 만들기</h2>
          <p>매물 정보를 가져오거나 직접 입력해 주세요.</p>
        </section>

        <section className="language-panel panel">
          <div className="language-mark"><span>文</span><span>A</span></div>
          <div className="language-copy"><h3>영상 언어</h3><p>영상 제목과 자막에 사용할 언어를 선택합니다. 이 제작기 화면은 한국어입니다.</p></div>
          <label className="language-select"><span>선택한 언어</span><span className="select-shell"><select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="영상 언어">{VIDEO_LANGUAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown size={16} /></span></label>
        </section>

        <section className="import-panel panel">
          <div className="import-methods" role="group" aria-label="차량 정보 입력 방법">
            <button className={`method-card ${mode === 'url' ? 'selected' : ''}`} onClick={() => setMode('url')} aria-pressed={mode === 'url'}>
              <Link2 size={21} /><strong>매물 링크로 시작</strong><span>매물 페이지에서 정보를 자동으로 가져옵니다.</span>
            </button>
            <button className={`method-card ${mode === 'text' ? 'selected' : ''}`} onClick={() => setMode('text')} aria-pressed={mode === 'text'}>
              <Clipboard size={21} />{mode === 'text' && <span className="recommended">권장 방법</span>}<strong>매물 텍스트 붙여넣기</strong><span>복사한 매물 정보나 페이지 소스를 분석합니다.</span>
            </button>
            <button className={`method-card ${mode === 'manual' ? 'selected' : ''}`} onClick={() => setMode('manual')} aria-pressed={mode === 'manual'}>
              <FileText size={21} /><strong>직접 입력</strong><span>차량 정보와 사진을 직접 추가합니다.</span>
            </button>
          </div>
          {mode === 'url' && (
            <div className="import-url-row">
              <label className="import-url-label" htmlFor="listing-url"><span />차량 매물 주소를 붙여넣으세요</label>
              <div className="import-inline"><input id="listing-url" ref={inputRef} value={listingUrl} onChange={(event) => setListingUrl(event.target.value)} placeholder="mobile.de, AutoScout24, 보배드림 등 매물 URL" type="url" /><button className="button button-primary import-button" onClick={importFromLink} disabled={busyImport}>{busyImport ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={17} />}{busyImport ? '가져오는 중' : '정보 가져오기'}</button></div>
            </div>
          )}
          {mode === 'text' && (
            <div className="paste-panel">
              <div className="paste-guide"><div className="guide-title"><Clipboard size={17} />매물 정보를 가져오는 두 가지 방법</div><div className="guide-columns"><div><span>1</span><div><strong>상세 정보 + 사진 (권장)</strong><p>매물 페이지에서 페이지 소스를 열고 전체 내용을 복사해 아래에 붙여넣으세요. 차량 정보와 페이지에 공개된 사진 주소를 분석합니다.</p></div></div><div><span>2</span><div><strong>텍스트만 복사</strong><p>매물 페이지의 텍스트를 복사해 넣으면 차량 사양을 입력란에 채워 줍니다. 사진은 기기에서 추가해 주세요.</p></div></div></div></div>
              <label className="field full-width"><span className="field-label">복사한 매물 텍스트 또는 페이지 소스</span><textarea value={listingText} onChange={(event) => setListingText(event.target.value)} placeholder="매물의 전체 텍스트나 페이지 소스를 붙여넣으세요. 예: 제조사 BMW, 모델 320i, 연식 2023, 가격 3,500만원, 주행거리 25,000km..." rows={5} /></label>
              <label className="field full-width"><span className="field-label">원본 매물 주소 (선택 사항 · 사진 가져오기 시도)</span><input value={listingUrl} onChange={(event) => setListingUrl(event.target.value)} placeholder="https://" type="url" /></label>
              <p className="helper-text"><ImagePlus size={15} />매물 사이트에서 직접 가져오지 못하면 페이지 소스를 복사해 붙여넣으세요. 찾은 사진 주소는 출처가 허용할 때만 가져오며, 안 되면 기기에서 업로드할 수 있습니다.</p>
              <button className="button button-primary parse-button" onClick={parsePastedText}><Sparkles size={17} />차량 정보 분석하기</button>
            </div>
          )}
        </section>

        <section className="vehicle-panel panel" id="vehicle-details">
          <div className="panel-title"><h3>차량 정보</h3><span>필수 항목을 입력하세요</span></div>
          <div className="fields-grid">
            <Field label="프로젝트 이름" value={form.projectName} onChange={(value) => patchForm('projectName', value)} placeholder="예: 2023 BMW 320i M 스포츠" />
            <Field label="제조사 *" value={form.make} onChange={(value) => patchForm('make', value)} placeholder="예: 현대" id="make" required />
            <Field label="모델 *" value={form.model} onChange={(value) => patchForm('model', value)} placeholder="예: 쏘나타" id="model" required />
            <Field label="트림" value={form.trim} onChange={(value) => patchForm('trim', value)} placeholder="예: 인스퍼레이션" />
            <Field label="연식 *" value={form.year} onChange={(value) => patchForm('year', value)} placeholder="예: 2022" type="number" id="year" required />
            <Field label="주행거리" value={form.mileage} onChange={(value) => patchForm('mileage', value)} placeholder="예: 35,000" suffix="km" inputMode="numeric" />
            <Field label="연료" value={form.fuel} onChange={(value) => patchForm('fuel', value)} placeholder="예: 휘발유" />
            <Field label="변속기" value={form.transmission} onChange={(value) => patchForm('transmission', value)} placeholder="예: 자동" />
            <div className="price-field"><Field label="판매 가격" value={form.askingPrice} onChange={(value) => patchForm('askingPrice', value)} placeholder="예: 2,450만원" inputMode="decimal" /><select className="currency-select" value={form.currency} onChange={(event) => patchForm('currency', event.target.value)} aria-label="가격 통화"><option value="₩">KRW ₩</option><option value="€">EUR €</option><option value="$">USD $</option><option value="£">GBP £</option><option value="₺">TRY ₺</option></select></div>
            <Field label="위치" value={form.location} onChange={(value) => patchForm('location', value)} placeholder="예: 서울 강남구" />
            <label className="field full-width"><span className="field-label">추가 차량 정보</span><textarea value={form.additionalDetails} onChange={(event) => patchForm('additionalDetails', event.target.value)} placeholder="주요 옵션, 차량 상태, 점검 내역 등 추가로 소개할 내용을 입력해 주세요." rows={4} /></label>
          </div>
        </section>

        <section className="photos-panel panel" id="vehicle-photos" ref={photoSectionRef}>
          <div className="panel-title photos-title"><div><h3>차량 사진</h3><p>서로 다른 각도의 사진을 8장 이상 추가하면 더 풍부한 영상을 만들 수 있습니다.</p></div><span className="photo-count">{photos.length} / {MAX_PHOTOS}장</span></div>
          <div className="trial-note"><Sparkles size={14} />한 영상에 사진을 최대 10장까지 넣을 수 있습니다.</div>
          <div className={`dropzone ${photos.length ? 'has-photos' : ''}`} onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add('drag-over'); }} onDragLeave={(event) => event.currentTarget.classList.remove('drag-over')} onDrop={(event) => { event.preventDefault(); event.currentTarget.classList.remove('drag-over'); addPhotos(event.dataTransfer.files); }} onClick={() => photos.length < MAX_PHOTOS && fileInputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click(); }}>
            {!photos.length ? <><ImagePlus size={27} /><strong>사진을 선택하거나 여기에 끌어놓으세요</strong><span>JPG, PNG 또는 WebP · 한 장 최대 20MB</span></> : <div className="photo-grid" onClick={(event) => event.stopPropagation()}>
              {photos.map((photo, index) => (
                <div key={photo.id} className={`photo-thumb ${dragIndex === index ? 'dragging' : ''}`} draggable onDragStart={() => setDragIndex(index)} onDragEnd={() => setDragIndex(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.stopPropagation(); movePhoto(dragIndex, index); setDragIndex(null); }}>
                  <img src={photo.preview} alt={`차량 사진 ${index + 1}`} />
                  <span className="photo-number">{index + 1}</span>
                  <div className="photo-actions"><button type="button" aria-label={`${index + 1}번 사진 앞으로`} onClick={() => movePhoto(index, index - 1)} disabled={index === 0}><ArrowUp size={14} /></button><button type="button" aria-label={`${index + 1}번 사진 뒤로`} onClick={() => movePhoto(index, index + 1)} disabled={index === photos.length - 1}><ArrowDown size={14} /></button><button type="button" aria-label={`${index + 1}번 사진 삭제`} onClick={() => removePhoto(photo.id)}><Trash2 size={14} /></button></div>
                  <span className="drag-handle"><GripVertical size={15} /></span>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && <button type="button" className="add-photo-tile" onClick={(event) => { event.stopPropagation(); fileInputRef.current?.click(); }}><Plus size={24} /><span>사진 추가</span></button>}
            </div>}
          </div>
          <input ref={fileInputRef} className="visually-hidden" type="file" multiple accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(event) => { addPhotos(event.target.files); event.target.value = ''; }} />
          {photos.length > 0 && <div className="photo-footnote"><Check size={14} /><span>첫 번째 사진이 영상의 첫 장면입니다. 사진을 드래그해 순서를 바꾸세요.</span></div>}
        </section>

        <section className="settings-panel panel">
          <PanelLabel icon={Sparkles}>영상 형식 및 설정</PanelLabel>
          <div className="setting-block"><h3>영상 비율</h3><div className="choice-list" role="group" aria-label="영상 비율">{VIDEO_FORMATS.map((item) => <button key={item.id} className={`choice-row ${formatId === item.id ? 'selected' : ''}`} onClick={() => setFormatId(item.id)} aria-pressed={formatId === item.id}><strong>{item.label}</strong><span>{item.detail}</span></button>)}</div></div>
          <div className="setting-block motion-block"><h3>편집 및 모션 스타일</h3><div className="choice-list" role="group" aria-label="편집 및 모션 스타일">{MOTION_STYLES.map((item) => <button key={item.id} className={`choice-row ${motionId === item.id ? 'selected' : ''}`} onClick={() => setMotionId(item.id)} aria-pressed={motionId === item.id}><strong>{item.label}</strong><span>{item.detail}</span>{item.id === 'cinematic' && <span className="recommended">추천</span>}</button>)}</div></div>
          <div className="settings-summary"><span>{selectedFormat.width} × {selectedFormat.height} px</span><span>·</span><span>{selectedMotion.description}</span></div>
          <div className="create-row"><p><ShieldCheck size={15} />생성 파일은 이 브라우저 안에서 만들어지며 서버에 업로드되지 않습니다.</p><button className="button button-primary create-button" onClick={createProject}><Upload size={17} />영상 프로젝트 만들기<ArrowRight size={17} /></button></div>
        </section>
        <p className="privacy-note"><ShieldCheck size={15} />매물 사진과 입력 정보는 기기에서 처리합니다. 이 버전은 로그인·결제·음성 합성·소셜 자동 게시를 연결하지 않습니다.</p>
      </>
    );
  }

  function renderResult() {
    const title = [form.make, form.model, form.trim].filter(Boolean).join(' ');
    const details = [form.year, form.mileage ? `${Number(form.mileage).toLocaleString()}km` : '', form.fuel, form.transmission].filter(Boolean).join(' · ');
    return (
      <div className="result-wrap">
        <button className="back-link" onClick={startOver}><ArrowLeft size={17} />편집 화면으로 돌아가기</button>
        <div className="result-heading"><div className="success-mark"><CheckCircle2 size={26} /></div><div><h2>영상이 완성됐습니다</h2><p>미리 확인한 뒤 MP4 파일로 저장하세요.</p></div></div>
        <div className="result-grid">
          <div className="result-player"><video src={videoUrl} controls playsInline preload="metadata" aria-label="완성된 차량 영상 미리보기" /><div className="result-under"><div><strong>{title}</strong><span>{details || `${photos.length}장 사진 · ${selectedFormat.label}`}</span></div><span className="result-duration">{Math.round(videoInfo?.duration || 0)}초</span></div></div>
          <div className="result-side panel"><span className="success-kicker"><Check size={14} />영상 파일 준비 완료</span><h3>{form.projectName || title}</h3><p>선택한 사진 {photos.length}장으로 {selectedFormat.label} 영상을 만들었습니다.</p><div className="result-stats"><div><span>해상도</span><strong>{videoInfo?.width} × {videoInfo?.height}</strong></div><div><span>파일 크기</span><strong>{videoInfo ? `${(videoInfo.bytes / (1024 * 1024)).toFixed(1)} MB` : '—'}</strong></div><div><span>편집 스타일</span><strong>{selectedMotion.label}</strong></div></div><a className="button button-primary download-button" href={videoUrl} download={videoInfo?.fileName || 'otovideo.mp4'}><Download size={18} />MP4 다운로드</a><button className="button button-secondary" onClick={startOver}><Plus size={17} />새 영상 만들기</button><p className="download-hint">영상은 MP4(H.264) 형식으로 저장됩니다. 음성·음악 트랙은 포함되지 않습니다.</p></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-shell theme-${theme}`}>
      <SideBar open={menuOpen} close={() => setMenuOpen(false)} onNavigate={navNotice} />
      <div className="main-column">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setMenuOpen(true)} aria-label="메뉴 열기"><Menu size={20} /></button>
          <div className="topbar-title"><span>OTOVIDEO STUDIO</span><strong>영상 만들기</strong></div>
          <div className="topbar-actions"><button className="icon-button theme-button" onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? '밝은 모드로 전환' : '어두운 모드로 전환'}>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button><a className="header-link" href="https://otovideo.net/" target="_blank" rel="noreferrer"><span>사이트 보기</span><ExternalLink size={14} /></a><button className="icon-button notification-button" aria-label="알림"><Bell size={18} /><span className="notification-dot" /></button><div className="rights-pill"><Clapperboard size={15} /><span>이 기기에서 제작</span><span className="rights-plus"><Plus size={12} /></span></div><button className="account-menu"><span className="account-avatar small">OV</span><span>브라우저</span><ChevronDown size={15} /></button></div>
        </header>
        <main className="main-content" id="create-form">
          {phase === 'complete' && videoUrl ? renderResult() : phase === 'rendering' ? (
            <section className="rendering-card panel"><div className="render-spinner"><LoaderCircle size={40} className="spin" /></div><span className="eyebrow">OTOVIDEO STUDIO</span><h2>차량 영상을 만들고 있습니다</h2><p>사진을 다듬고 장면을 연결해 MP4로 인코딩합니다. 브라우저를 닫지 마세요.</p><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><div className="progress-meta"><span>영상 렌더링</span><strong>{progress}%</strong></div></section>
          ) : renderEditingForm()}
        </main>
      </div>
      {toast && <div className={`toast toast-${toast.kind}`} role="status">{toast.kind === 'error' ? <AlertCircle size={17} /> : toast.kind === 'success' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}<span>{toast.message}</span><button onClick={() => setToast(null)} aria-label="알림 닫기"><X size={15} /></button></div>}
    </div>
  );
}
