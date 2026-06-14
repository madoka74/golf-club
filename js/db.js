// ===== GOLF CLUB DATA STORE =====
// JSONBin.io를 백엔드로 사용하는 데이터 레이어

const DB = {
  // ─── 설정 ───────────────────────────────────────────
  // 최초 설정 후 아래 값들을 채워야 합니다. setup.html 참조.
  binId: localStorage.getItem('gc_bin_id') || '',
  apiKey: localStorage.getItem('gc_api_key') || '',
  BASE_URL: 'https://api.jsonbin.io/v3/b',

  // ─── 기본 데이터 구조 ────────────────────────────────
  defaultData: {
    members: [],
    meetings: [],
    participants: {},   // { meetingId: [{ name, phone, joinedAt }] }
    teamResults: {},    // { meetingId: [[member, ...], ...] }
    admin: { id: 'admin', pw: '123456' }
  },

  // ─── 초기화 ──────────────────────────────────────────
  isConfigured() {
    return this.binId && this.apiKey;
  },

  setConfig(binId, apiKey) {
    this.binId = binId;
    this.apiKey = apiKey;
    localStorage.setItem('gc_bin_id', binId);
    localStorage.setItem('gc_api_key', apiKey);
  },

  // ─── JSONBin API 호출 ─────────────────────────────────
  async _fetch(method = 'GET', body = null) {
    if (!this.isConfigured()) throw new Error('DB가 설정되지 않았습니다.');
    const opts = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': this.apiKey,
        'X-Bin-Versioning': 'false'
      }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${this.BASE_URL}/${this.binId}`, opts);
    if (!res.ok) throw new Error(`API 오류: ${res.status}`);
    const json = await res.json();
    return method === 'GET' ? json.record : json.record;
  },

  async load() {
    try {
      return await this._fetch('GET');
    } catch {
      return { ...this.defaultData };
    }
  },

  async save(data) {
    return await this._fetch('PUT', data);
  },

  // ─── 회원 CRUD ────────────────────────────────────────
  async getMembers() {
    const d = await this.load();
    return d.members || [];
  },

  async addMember(member) {
    const d = await this.load();
    // 중복 체크: 이름+전화번호 동일하면 차단
    const dup = d.members.find(m => m.name === member.name && m.phone === member.phone);
    if (dup) throw new Error('같은 이름과 전화번호로 이미 등록된 회원입니다.');
    member.id = Date.now().toString();
    member.createdAt = new Date().toISOString();
    d.members.push(member);
    await this.save(d);
    return member;
  },

  async deleteMember(id) {
    const d = await this.load();
    d.members = d.members.filter(m => m.id !== id);
    await this.save(d);
  },

  // 전화번호로 본인 확인 후 수정
  async updateMember(id, phone, updates) {
    const d = await this.load();
    const idx = d.members.findIndex(m => m.id === id);
    if (idx === -1) throw new Error('회원을 찾을 수 없습니다.');
    if (d.members[idx].phone !== phone) throw new Error('전화번호가 일치하지 않습니다.');
    d.members[idx] = { ...d.members[idx], ...updates, id, phone };
    await this.save(d);
    return d.members[idx];
  },

  async searchMembers(query) {
    const members = await this.getMembers();
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(m =>
      m.name.toLowerCase().includes(q) || m.phone.includes(q)
    );
  },

  // ─── 골프 모임 CRUD ───────────────────────────────────
  async getMeetings() {
    const d = await this.load();
    return (d.meetings || []).sort((a, b) => new Date(a.date) - new Date(b.date));
  },

  async getMeeting(id) {
    const d = await this.load();
    return (d.meetings || []).find(m => m.id === id);
  },

  async addMeeting(meeting) {
    const d = await this.load();
    meeting.id = Date.now().toString();
    meeting.createdAt = new Date().toISOString();
    d.meetings.push(meeting);
    if (!d.participants) d.participants = {};
    d.participants[meeting.id] = [];
    await this.save(d);
    return meeting;
  },

  async deleteMeeting(id) {
    const d = await this.load();
    d.meetings = d.meetings.filter(m => m.id !== id);
    delete d.participants?.[id];
    delete d.teamResults?.[id];
    await this.save(d);
  },

  // ─── 참가 신청/취소 ────────────────────────────────────
  async getParticipants(meetingId) {
    const d = await this.load();
    return (d.participants?.[meetingId] || []);
  },

  async joinMeeting(meetingId, name, phone) {
    const d = await this.load();
    if (!d.participants) d.participants = {};
    if (!d.participants[meetingId]) d.participants[meetingId] = [];
    const already = d.participants[meetingId].find(
      p => p.name === name && p.phone === phone
    );
    if (already) throw new Error('이미 신청된 참가자입니다.');
    d.participants[meetingId].push({
      name, phone,
      joinedAt: new Date().toISOString()
    });
    await this.save(d);
  },

  async cancelMeeting(meetingId, name, phone) {
    const d = await this.load();
    if (!d.participants?.[meetingId]) throw new Error('참가 정보가 없습니다.');
    const before = d.participants[meetingId].length;
    d.participants[meetingId] = d.participants[meetingId].filter(
      p => !(p.name === name && p.phone === phone)
    );
    if (d.participants[meetingId].length === before) {
      throw new Error('해당 이름/전화번호로 신청된 내역이 없습니다.');
    }
    await this.save(d);
  },

  // ─── 팀 매칭 ──────────────────────────────────────────
  async saveTeamResult(meetingId, teams) {
    const d = await this.load();
    if (!d.teamResults) d.teamResults = {};
    d.teamResults[meetingId] = teams;
    await this.save(d);
  },

  async getTeamResult(meetingId) {
    const d = await this.load();
    return d.teamResults?.[meetingId] || null;
  },

  // ─── 관리자 ───────────────────────────────────────────
  async verifyAdmin(id, pw) {
    const d = await this.load();
    return d.admin.id === id && d.admin.pw === pw;
  }
};

// ─── 관리자 세션 ────────────────────────────────────────
const AdminSession = {
  KEY: 'gc_admin_logged',
  login() { sessionStorage.setItem(this.KEY, '1'); },
  logout() { sessionStorage.removeItem(this.KEY); },
  isLoggedIn() { return sessionStorage.getItem(this.KEY) === '1'; }
};

// ─── 유틸 ────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

function formatDateShort(iso) {
  const d = new Date(iso);
  return `${d.getMonth()+1}/${d.getDate()}`;
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h);
  return `${hour < 12 ? '오전' : '오후'} ${hour > 12 ? hour - 12 : hour}:${m}`;
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeTeams(participants, size = 4) {
  const shuffled = shuffleArray(participants);
  const teams = [];
  for (let i = 0; i < shuffled.length; i += size) {
    teams.push(shuffled.slice(i, i + size));
  }
  return teams;
}

// Toast 알림
function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// 로딩 버튼 상태
function setLoading(btn, loading, text = '저장') {
  btn.disabled = loading;
  btn.textContent = loading ? '처리 중...' : text;
}
