// ===== GOLF CLUB APP =====

document.addEventListener('DOMContentLoaded', () => {
  if (!DB.isConfigured()) {
    // Bin ID / API Key가 코드에 입력되지 않은 상태
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;
                  font-family:'Noto Sans KR',sans-serif;background:#faf8f2;padding:20px;">
        <div style="text-align:center;max-width:440px;">
          <div style="font-size:3rem;margin-bottom:16px;">⛳</div>
          <h2 style="color:#1a3a2a;margin-bottom:12px;">설정이 필요합니다</h2>
          <p style="color:#4a4a4a;font-size:0.9rem;line-height:1.7;">
            <code>js/db.js</code> 파일을 열어<br>
            <strong>binId</strong>와 <strong>apiKey</strong>에<br>
            JSONBin 값을 입력한 뒤 다시 배포해주세요.
          </p>
        </div>
      </div>`;
    return;
  }
  initApp();
});

// ─── 설정 화면 제거됨 (db.js에 직접 입력 방식) ───

// ─── 앱 초기화 ────────────────────────────────────────────
function initApp() {
  document.getElementById('app-screen').style.display = 'block';
  updateAdminUI();
  navigateTo('home');
  document.querySelectorAll('.main-nav a[data-page]').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); navigateTo(a.dataset.page); });
  });
}

function navigateTo(page) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.main-nav a').forEach(a => a.classList.remove('active'));
  const sec = document.getElementById(`page-${page}`);
  if (sec) sec.classList.add('active');
  const navLink = document.querySelector(`.main-nav a[data-page="${page}"]`);
  if (navLink) navLink.classList.add('active');
  if (page === 'home')     renderHomePage();
  if (page === 'members')  renderMembersPage();
  if (page === 'calendar') renderCalendarPage();
  if (page === 'admin')    renderAdminPage();
}

function updateAdminUI() {
  const isAdmin  = AdminSession.isLoggedIn();
  const adminNav = document.getElementById('admin-nav-btn');
  if (adminNav) adminNav.textContent = isAdmin ? '⚙ 관리자' : '🔑 관리자';

  // 관리자 전용 버튼 표시/숨김
  const meetingBar = document.getElementById('admin-meeting-bar');
  if (meetingBar) meetingBar.style.display = isAdmin ? 'block' : 'none';
}

// ════════════════════════════════════════════════════════════
// 회원 신상정보 페이지
// ════════════════════════════════════════════════════════════
async function renderMembersPage() {
  const wrap = document.getElementById('member-list-wrap');
  wrap.innerHTML = '<div class="empty-state"><p>불러오는 중...</p></div>';
  try {
    const members = await DB.getMembers();
    renderMemberTable(members);
  } catch(e) {
    wrap.innerHTML = `<div class="empty-state"><p>⚠ ${e.message}</p></div>`;
  }
}

function renderMemberTable(members) {
  const wrap = document.getElementById('member-list-wrap');
  if (!members.length) {
    wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><p>등록된 회원이 없습니다.<br>상단 [+ 회원 등록] 버튼으로 등록해주세요.</p></div>`;
    return;
  }
  wrap.innerHTML = `
    <div style="overflow-x:auto;">
      <table class="data-table">
        <thead><tr>
          <th>이름</th><th>성별</th><th>전화번호</th>
          <th>학과</th><th>학번</th><th>직장</th><th>직책</th>
        </tr></thead>
        <tbody>
          ${members.map(m => `
            <tr style="cursor:pointer" onclick="openMemberDetail('${m.id}')">
              <td><strong>${m.name}</strong></td>
              <td>${m.gender || '-'}</td>
              <td>${m.phone || '-'}</td>
              <td>${m.dept || '-'}</td>
              <td>${m.studentId || '-'}</td>
              <td>${m.company || '-'}</td>
              <td>${m.position || '-'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <p style="margin-top:12px; font-size:0.78rem; color:var(--ink-soft);">총 ${members.length}명 | 행을 클릭하면 상세 정보를 볼 수 있습니다.</p>
  `;
}

window.searchMembers = async function() {
  try {
    const q = document.getElementById('member-search').value;
    const members = await DB.searchMembers(q);
    renderMemberTable(members);
  } catch(e) { showToast(e.message, 'error'); }
};

// ─── 회원 상세 ───────────────────────────────────────────
window.openMemberDetail = async function(id) {
  try {
    const members = await DB.getMembers();
    const m = members.find(x => x.id === id);
    if (!m) return;
    document.getElementById('detail-content').innerHTML = `
      <div class="info-list">
        ${row('이름', m.name)}
        ${row('성별', m.gender||'-')} ${row('전화번호', m.phone||'-')}
        ${row('학과', m.dept||'-')}  ${row('학번', m.studentId||'-')}
        ${row('직장', m.company||'-')} ${row('직책', m.position||'-')}
      </div>
      <div style="margin-top:20px; padding-top:16px; border-top:1px solid var(--line); display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn btn-outline btn-sm" onclick="openEditMember('${m.id}')">✏️ 정보 수정</button>
        ${AdminSession.isLoggedIn() ? `
          <button class="btn btn-danger btn-sm" onclick="deleteMemberConfirm('${m.id}','${m.name}')">🗑 회원 삭제</button>` : ''}
      </div>`;
    openModal('modal-member-detail');
  } catch(e) { showToast(e.message, 'error'); }
};

function row(label, value) {
  return `<div class="info-row"><span class="info-label">${label}</span><span class="info-value">${value}</span></div>`;
}

// ─── 회원 수정 ───────────────────────────────────────────
window.openEditMember = async function(id) {
  const members = await DB.getMembers();
  const m = members.find(x => x.id === id);
  if (!m) return;
  document.getElementById('detail-content').innerHTML = `
    <p style="font-size:0.82rem; color:var(--ink-soft); margin-bottom:16px; background:var(--green-light); border-radius:8px; padding:10px 14px;">
      🔒 등록 시 입력한 <strong>전화번호</strong>가 일치해야 수정됩니다. 전화번호 자체는 변경할 수 없습니다.
    </p>
    <div class="form-grid">
      <div class="form-group"><label>이름</label><input id="edit-name" value="${m.name}"></div>
      <div class="form-group"><label>전화번호 (본인확인·변경불가)</label><input id="edit-phone" value="${m.phone}" placeholder="010-0000-0000"></div>
      <div class="form-group"><label>성별</label>
        <select id="edit-gender">
          <option value="">선택</option>
          <option value="남" ${m.gender==='남'?'selected':''}>남</option>
          <option value="여" ${m.gender==='여'?'selected':''}>여</option>
        </select>
      </div>
      <div class="form-group"><label>학과</label><input id="edit-dept" value="${m.dept||''}"></div>
      <div class="form-group"><label>학번</label><input id="edit-studentid" value="${m.studentId||''}"></div>
      <div class="form-group"><label>직장</label><input id="edit-company" value="${m.company||''}"></div>
      <div class="form-group"><label>직책</label><input id="edit-position" value="${m.position||''}"></div>
    </div>
    <div style="display:flex; gap:10px; margin-top:20px;">
      <button class="btn btn-outline btn-sm" onclick="openMemberDetail('${id}')">← 취소</button>
      <button id="btn-save-edit" class="btn btn-primary btn-sm" onclick="submitEditMember('${id}')">저장</button>
    </div>`;
};

window.submitEditMember = async function(id) {
  const v = elId => document.getElementById(elId).value.trim();
  const phone = v('edit-phone');
  const name  = v('edit-name');
  if (!phone) { showToast('전화번호를 입력해주세요.', 'error'); return; }
  const btn = document.getElementById('btn-save-edit');
  setLoading(btn, true, '저장');
  try {
    await DB.updateMember(id, phone, {
      name, gender: v('edit-gender'),
      dept: v('edit-dept'), studentId: v('edit-studentid'),
      company: v('edit-company'), position: v('edit-position')
    });
    showToast(`${name} 회원 정보가 수정되었습니다.`);
    closeModal('modal-member-detail');
    renderMembersPage();
  } catch(e) {
    showToast(e.message, 'error');
  } finally {
    setLoading(btn, false, '저장');
  }
};

window.deleteMemberConfirm = async function(id, name) {
  if (!confirm(`"${name}" 회원을 삭제하시겠습니까?`)) return;
  try {
    await DB.deleteMember(id);
    closeModal('modal-member-detail');
    showToast('회원이 삭제되었습니다.');
    renderMembersPage();
  } catch(e) { showToast('삭제 실패: ' + e.message, 'error'); }
};

window.openAddMemberGlobal = function() { openModal('modal-add-member'); };

window.submitAddMember = async function() {
  const v    = id => document.getElementById(id).value.trim();
  const name = v('inp-name'), phone = v('inp-phone');
  if (!name || !phone) { showToast('이름과 전화번호는 필수입니다.', 'error'); return; }
  const btn = document.getElementById('btn-add-member');
  setLoading(btn, true, '등록');
  try {
    await DB.addMember({
      name, phone, gender: v('inp-gender'),
      dept: v('inp-dept'), studentId: v('inp-studentid'),
      company: v('inp-company'), position: v('inp-position')
    });
    closeModal('modal-add-member');
    document.getElementById('form-add-member').reset();
    showToast(`${name} 회원이 등록되었습니다.`);
    renderMembersPage();
  } catch(e) {
    showToast('등록 실패: ' + e.message, 'error');
  } finally {
    setLoading(btn, false, '등록');
  }
};

// ════════════════════════════════════════════════════════════
// 캘린더 페이지
// ════════════════════════════════════════════════════════════
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let calMeetings = [];

async function renderCalendarPage() {
  try {
    calMeetings = await DB.getMeetings();
  } catch(e) {
    calMeetings = [];
  }
  renderCalendar();
  renderMeetingList();
}

function renderCalendar() {
  const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  document.getElementById('cal-month-label').textContent = `${calYear}년 ${monthNames[calMonth]}`;
  const firstDay    = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const prevDays    = new Date(calYear, calMonth, 0).getDate();
  const today       = new Date();

  const meetingMap = {};
  calMeetings.forEach(m => {
    const d = new Date(m.date);
    if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
      const k = d.getDate();
      if (!meetingMap[k]) meetingMap[k] = [];
      meetingMap[k].push(m);
    }
  });

  let html = '';
  for (let i = firstDay - 1; i >= 0; i--)
    html += `<div class="cal-day other-month"><div class="day-num">${prevDays - i}</div></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dow     = new Date(calYear, calMonth, d).getDay();
    const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
    const meets   = meetingMap[d] || [];
    const cls     = `cal-day${isToday ? ' today' : ''}${dow===0?' sunday':dow===6?' saturday':''}`;
    html += `<div class="${cls}" onclick="onCalDayClick(${d})">
      <div class="day-num">${d}</div>
      ${meets.map(m => `<span class="cal-event-dot" onclick="event.stopPropagation();openMeetingModal('${m.id}')">${m.place}</span>`).join('')}
    </div>`;
  }

  const remaining = (firstDay + daysInMonth) % 7;
  for (let i = 1; i <= (remaining ? 7 - remaining : 0); i++)
    html += `<div class="cal-day other-month"><div class="day-num">${i}</div></div>`;

  document.getElementById('cal-days').innerHTML = html;
}

window.calPrev = function() { if (--calMonth < 0)  { calMonth=11; calYear--; } renderCalendar(); };
window.calNext = function() { if (++calMonth > 11) { calMonth=0;  calYear++; } renderCalendar(); };

window.onCalDayClick = function(day) {
  if (!AdminSession.isLoggedIn()) return;
  const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  document.getElementById('inp-meeting-date').value = dateStr;
  openModal('modal-add-meeting');
};

function renderMeetingList() {
  const wrap = document.getElementById('meeting-list');
  if (!calMeetings.length) {
    wrap.innerHTML = '<div class="empty-state"><div class="empty-icon">🏌️</div><p>등록된 모임이 없습니다.</p></div>';
    return;
  }
  const now      = new Date(new Date().toDateString());
  const upcoming = calMeetings.filter(m => new Date(m.date) >= now);
  const past     = calMeetings.filter(m => new Date(m.date) <  now);
  let html = '';
  if (upcoming.length) {
    html += `<p style="font-size:0.75rem;font-weight:600;color:var(--ink-soft);letter-spacing:0.05em;text-transform:uppercase;margin-bottom:8px;">예정된 모임</p>`;
    html += upcoming.map(meetingCardHTML).join('');
  }
  if (past.length) {
    html += `<p style="font-size:0.75rem;font-weight:600;color:var(--ink-soft);letter-spacing:0.05em;text-transform:uppercase;margin:16px 0 8px;">지난 모임</p>`;
    html += past.map(meetingCardHTML).join('');
  }
  wrap.innerHTML = html;
}

function meetingCardHTML(m) {
  return `
    <div class="meeting-card" onclick="openMeetingModal('${m.id}')">
      <div class="mc-date">${formatDate(m.date)}</div>
      <div class="mc-title">📍 ${m.place}</div>
      <div class="mc-info">⏰ ${formatTime(m.time)}</div>
      <div class="mc-count">👤 참가자 보기</div>
    </div>`;
}

// ─── 모임 상세 모달 ────────────────────────────────────────
window.openMeetingModal = async function(id) {
  try {
    const [meeting, participants, teamResult] = await Promise.all([
      DB.getMeeting(id),
      DB.getParticipants(id),
      DB.getTeamResult(id)
    ]);
    if (!meeting) return;
    document.getElementById('meeting-modal-title').textContent = `${meeting.place} 모임`;

    document.getElementById('meeting-modal-body').innerHTML = `
      <div class="info-list" style="margin-bottom:20px;">
        ${row('날짜', formatDate(meeting.date))}
        ${row('장소', meeting.place)}
        ${row('시간', formatTime(meeting.time))}
        ${meeting.note ? row('메모', meeting.note) : ''}
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <strong style="font-size:0.9rem;">참가 신청 현황 <span style="color:var(--green-fairway)">${participants.length}명</span></strong>
      </div>
      <div class="participant-list">
        ${participants.length
          ? participants.map(p => `
              <div class="participant-item">
                <div><div class="p-name">${p.name}</div><div class="p-info">${p.phone}</div></div>
                <span class="badge badge-green">신청완료</span>
              </div>`).join('')
          : '<div class="empty-state" style="padding:20px"><p>아직 신청자가 없습니다.</p></div>'}
      </div>

      ${teamResult ? `
        <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--line);">
          <strong style="font-size:0.9rem;color:var(--green-deep);">🏌️ 팀 매칭 결과</strong>
          <div class="team-grid" style="margin-top:12px;">
            ${teamResult.map((team, i) => `
              <div class="team-card">
                <div class="team-card-header">
                  <div class="team-num">${i+1}</div>
                  <span style="font-weight:600;font-size:0.85rem;">Team ${i+1}</span>
                </div>
                ${team.map(p => `
                  <div class="team-member">
                    <div class="avatar">${p.name[0]}</div>
                    <div>
                      <div style="font-weight:600;font-size:0.85rem;">${p.name}</div>
                      <div style="font-size:0.75rem;color:var(--ink-soft);">${p.phone}</div>
                    </div>
                  </div>`).join('')}
              </div>`).join('')}
          </div>
        </div>` : ''}

      <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--line);">
        <p style="font-size:0.82rem;color:var(--ink-soft);background:var(--green-light);border-radius:8px;padding:10px 14px;margin-bottom:14px;">
          ℹ️ 회원으로 등록된 분만 신청/취소가 가능합니다. 이름과 전화번호는 회원 정보와 정확히 일치해야 합니다.
        </p>
        <div class="tabs">
          <button class="tab-btn active" onclick="switchTab('join',this)">참가 신청</button>
          <button class="tab-btn"        onclick="switchTab('cancel',this)">참가 취소</button>
        </div>
        <div id="tab-join">
          <div class="form-grid" style="gap:10px;">
            <div class="form-group"><label>이름 (회원 등록 이름)</label><input id="join-name" placeholder="홍길동"></div>
            <div class="form-group"><label>전화번호 (회원 등록 번호)</label><input id="join-phone" placeholder="010-0000-0000"></div>
          </div>
          <button class="btn btn-primary btn-block" style="margin-top:14px" onclick="joinMeeting('${id}')">신청하기</button>
        </div>
        <div id="tab-cancel" style="display:none">
          <div class="form-grid" style="gap:10px;">
            <div class="form-group"><label>이름 (회원 등록 이름)</label><input id="cancel-name" placeholder="홍길동"></div>
            <div class="form-group"><label>전화번호 (회원 등록 번호)</label><input id="cancel-phone" placeholder="010-0000-0000"></div>
          </div>
          <button class="btn btn-danger btn-block" style="margin-top:14px" onclick="cancelMeeting('${id}')">취소하기</button>
        </div>
      </div>

      ${AdminSession.isLoggedIn() ? `
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--line);display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-gold btn-sm" onclick="doTeamMatch('${id}')">🎲 팀 랜덤 매칭</button>
          <button class="btn btn-danger btn-sm" onclick="deleteMeetingConfirm('${id}')">🗑 모임 삭제</button>
        </div>` : ''}
    `;
    openModal('modal-meeting-detail');
  } catch(e) { showToast(e.message, 'error'); }
};

window.switchTab = function(tab, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-join').style.display   = tab==='join'   ? 'block' : 'none';
  document.getElementById('tab-cancel').style.display = tab==='cancel' ? 'block' : 'none';
};

window.joinMeeting = async function(meetingId) {
  const name  = document.getElementById('join-name').value.trim();
  const phone = document.getElementById('join-phone').value.trim();
  if (!name || !phone) { showToast('이름과 전화번호를 입력해주세요.', 'error'); return; }
  try {
    await DB.joinMeeting(meetingId, name, phone);
    showToast(`${name}님의 참가 신청이 완료되었습니다.`);
    openMeetingModal(meetingId);
  } catch(e) { showToast(e.message, 'error'); }
};

window.cancelMeeting = async function(meetingId) {
  const name  = document.getElementById('cancel-name').value.trim();
  const phone = document.getElementById('cancel-phone').value.trim();
  if (!name || !phone) { showToast('이름과 전화번호를 입력해주세요.', 'error'); return; }
  try {
    await DB.cancelMeeting(meetingId, name, phone);
    showToast(`${name}님의 참가가 취소되었습니다.`);
    openMeetingModal(meetingId);
  } catch(e) { showToast(e.message, 'error'); }
};

window.doTeamMatch = async function(meetingId) {
  const participants = await DB.getParticipants(meetingId);
  if (participants.length < 2) { showToast('참가자가 2명 이상이어야 합니다.', 'error'); return; }
  const teams = makeTeams(participants, 4);
  await DB.saveTeamResult(meetingId, teams);
  showToast('팀 매칭이 완료되었습니다!');
  openMeetingModal(meetingId);
};

window.deleteMeetingConfirm = async function(id) {
  if (!confirm('이 모임을 삭제하시겠습니까?')) return;
  try {
    await DB.deleteMeeting(id);
    closeModal('modal-meeting-detail');
    showToast('모임이 삭제되었습니다.');
    calMeetings = await DB.getMeetings();
    renderCalendar();
    renderMeetingList();
  } catch(e) { showToast(e.message, 'error'); }
};

window.submitAddMeeting = async function() {
  const date  = document.getElementById('inp-meeting-date').value;
  const place = document.getElementById('inp-meeting-place').value.trim();
  const time  = document.getElementById('inp-meeting-time').value;
  if (!date || !place) { showToast('날짜와 장소는 필수입니다.', 'error'); return; }
  const btn = document.getElementById('btn-add-meeting');
  setLoading(btn, true, '생성');
  try {
    await DB.addMeeting({ date, place, time, note: document.getElementById('inp-meeting-note').value.trim() });
    closeModal('modal-add-meeting');
    document.getElementById('form-add-meeting').reset();
    showToast('모임이 생성되었습니다.');
    calMeetings = await DB.getMeetings();
    renderCalendar();
    renderMeetingList();
  } catch(e) {
    showToast('생성 실패: ' + e.message, 'error');
  } finally {
    setLoading(btn, false, '생성');
  }
};

window.openAddMeetingModal = function() {
  openModal('modal-add-meeting');
};

// ════════════════════════════════════════════════════════════
// 관리자 페이지
// ════════════════════════════════════════════════════════════
function renderAdminPage() {
  if (AdminSession.isLoggedIn()) {
    document.getElementById('admin-login-area').style.display  = 'none';
    document.getElementById('admin-panel-area').style.display  = 'block';
    renderAdminPanel();
  } else {
    document.getElementById('admin-login-area').style.display  = 'block';
    document.getElementById('admin-panel-area').style.display  = 'none';
  }
}

window.adminLogin = async function() {
  const id = document.getElementById('admin-id').value.trim();
  const pw = document.getElementById('admin-pw').value.trim();
  if (!id || !pw) { showToast('아이디와 비밀번호를 입력해주세요.', 'error'); return; }
  const btn = document.getElementById('btn-admin-login');
  setLoading(btn, true, '로그인');
  try {
    const ok = await DB.verifyAdmin(id, pw);
    if (!ok) { showToast('아이디 또는 비밀번호가 틀렸습니다.', 'error'); return; }
    AdminSession.login();
    showToast('관리자로 로그인했습니다.');
    updateAdminUI();
    renderAdminPage();
  } catch(e) {
    showToast('로그인 실패: ' + e.message, 'error');
  } finally {
    setLoading(btn, false, '로그인');
  }
};

window.adminLogout = function() {
  AdminSession.logout();
  updateAdminUI();
  renderAdminPage();
  showToast('로그아웃 되었습니다.');
};

async function renderAdminPanel() {
  try {
    const [members, meetings] = await Promise.all([DB.getMembers(), DB.getMeetings()]);
    document.getElementById('stat-members').textContent  = members.length  + '명';
    document.getElementById('stat-meetings').textContent = meetings.length + '건';
    const upcoming = meetings.filter(m => new Date(m.date) >= new Date(new Date().toDateString())).length;
    document.getElementById('stat-upcoming').textContent = upcoming + '건';
  } catch(e) {}
}

// ─── 모달 헬퍼 ────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
window.closeModal = closeModal;

document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape')
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
});

// ════════════════════════════════════════════════════════════
// 홈 페이지
// ════════════════════════════════════════════════════════════
let homeMeetings = [];      // 전체 모임 목록 (날짜순)
let homeIdx = 0;            // 현재 보고 있는 모임 인덱스
let homeParticipants = [];  // 현재 모임 참가자 전체

async function renderHomePage() {
  try {
    const all = await DB.getMeetings();
    // 오늘 이후 예정 모임 먼저, 없으면 지난 모임 역순으로
    const now = new Date(new Date().toDateString());
    const upcoming = all.filter(m => new Date(m.date) >= now);
    const past     = all.filter(m => new Date(m.date) <  now).reverse();
    homeMeetings = [...upcoming, ...past];

    if (!homeMeetings.length) {
      homeIdx = 0;
      renderHomeMeetingCard(null);
      return;
    }
    homeIdx = 0;
    await renderHomeMeetingCard(homeMeetings[homeIdx]);
  } catch(e) {
    showToast(e.message, 'error');
  }
}

async function renderHomeMeetingCard(meeting) {
  const infoEl   = document.getElementById('home-meeting-info');
  const prevBtn  = document.getElementById('home-btn-prev');
  const nextBtn  = document.getElementById('home-btn-next');
  const wrapEl   = document.getElementById('home-participants-wrap');

  // 버튼 활성/비활성
  prevBtn.disabled = (homeIdx <= 0);
  nextBtn.disabled = (homeIdx >= homeMeetings.length - 1);

  if (!meeting) {
    infoEl.innerHTML = `
      <div class="empty-state" style="padding:32px 0">
        <div class="empty-icon">🏌️</div>
        <p>등록된 모임이 없습니다.</p>
      </div>`;
    wrapEl.style.display = 'none';
    return;
  }

  // 참가자 로드
  homeParticipants = await DB.getParticipants(meeting.id);
  const cnt = homeParticipants.length;

  infoEl.innerHTML = `
    <div class="home-meeting-place">📍 ${meeting.place}</div>
    <div class="home-meeting-meta">
      <div class="home-meta-item">📅 <strong>${formatDate(meeting.date)}</strong></div>
      <div class="home-meta-item">⏰ <strong>${meeting.time ? formatTime(meeting.time) : '시간 미정'}</strong></div>
    </div>
    <div class="home-count-badge">
      👥 참가 신청 <span class="home-count-num" id="home-count-num">${cnt}</span>명
    </div>
    <div class="home-action-btns">
      <button class="btn btn-primary" onclick="homeOpenJoinForm('${meeting.id}')">✋ 참가 신청</button>
    </div>
    ${homeMeetings.length > 1 ? `
    <div class="home-meeting-index">${homeIdx + 1} / ${homeMeetings.length}</div>` : ''}
  `;

  // 참가자 목록 표시
  wrapEl.style.display = 'block';
  document.getElementById('home-participant-count').textContent = `${cnt}명 신청`;
  document.getElementById('home-search').value = '';
  renderHomeParticipantTable(homeParticipants);
}

// 이전/다음 모임 이동
window.homeMoveMeeting = async function(dir) {
  const next = homeIdx + dir;
  if (next < 0 || next >= homeMeetings.length) return;
  homeIdx = next;
  await renderHomeMeetingCard(homeMeetings[homeIdx]);
};

// 참가자 테이블 렌더링 (회원 탭과 동일 형태)
function renderHomeParticipantTable(list) {
  const el = document.getElementById('home-participant-list');
  if (!list.length) {
    el.innerHTML = `<div class="empty-state" style="padding:20px 0">
      <div class="empty-icon">👥</div><p>신청자가 없습니다.</p></div>`;
    return;
  }
  el.innerHTML = `
    <div style="overflow-x:auto;">
      <table class="data-table">
        <thead><tr>
          <th>이름</th><th>전화번호</th><th>신청일시</th>
        </tr></thead>
        <tbody>
          ${list.map(p => `
            <tr>
              <td><strong>${p.name}</strong></td>
              <td>${p.phone}</td>
              <td>${p.joinedAt ? new Date(p.joinedAt).toLocaleDateString('ko-KR',
                   {month:'long', day:'numeric', hour:'2-digit', minute:'2-digit'}) : '-'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <p style="margin-top:10px; font-size:0.78rem; color:var(--ink-soft);">총 ${list.length}명</p>
  `;
}

// 참가자 검색
window.homeSearchParticipants = function() {
  const q = document.getElementById('home-search').value.trim().toLowerCase();
  if (!q) {
    renderHomeParticipantTable(homeParticipants);
    return;
  }
  const filtered = homeParticipants.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.phone.replace(/-/g, '').includes(q.replace(/-/g, ''))
  );
  renderHomeParticipantTable(filtered);
};

// 참가 신청 폼 열기
window.homeOpenJoinForm = function(meetingId) {
  document.getElementById('home-join-meeting-id').value = meetingId;
  document.getElementById('home-join-name').value  = '';
  document.getElementById('home-join-phone').value = '';
  document.getElementById('home-join-error').style.display = 'none';
  openModal('modal-home-join');
};

// 참가 신청 처리 (신청 또는 취소 분기)
window.homeSubmitJoin = async function() {
  const meetingId = document.getElementById('home-join-meeting-id').value;
  const name      = document.getElementById('home-join-name').value.trim();
  const phone     = document.getElementById('home-join-phone').value.trim();
  const errEl     = document.getElementById('home-join-error');

  if (!name || !phone) {
    errEl.style.display = 'block';
    errEl.textContent   = '이름과 전화번호를 입력해주세요.';
    return;
  }
  errEl.style.display = 'none';

  const btn = document.getElementById('btn-home-join-submit');
  setLoading(btn, true, '확인 중');

  try {
    // 이미 신청한 사람인지 확인
    const already = homeParticipants.find(p => p.name === name && p.phone === phone);

    if (already) {
      // 취소 확인 팝업
      setLoading(btn, false, '신청하기');
      closeModal('modal-home-join');
      if (!confirm(`${name}님은 이미 참가 신청하셨습니다.\n참가를 취소하시겠습니까?`)) return;

      // 취소 처리
      await DB.cancelMeeting(meetingId, name, phone);
      showToast(`${name}님의 참가가 취소되었습니다.`);
    } else {
      // 신청 처리
      await DB.joinMeeting(meetingId, name, phone);
      closeModal('modal-home-join');
      showToast(`${name}님의 참가 신청이 완료되었습니다.`);
    }

    // 화면 갱신
    homeParticipants = await DB.getParticipants(meetingId);
    const cnt = homeParticipants.length;
    const countEl = document.getElementById('home-count-num');
    if (countEl) countEl.textContent = cnt;
    document.getElementById('home-participant-count').textContent = `${cnt}명 신청`;
    document.getElementById('home-search').value = '';
    renderHomeParticipantTable(homeParticipants);

  } catch(e) {
    errEl.style.display = 'block';
    errEl.textContent   = e.message;
    setLoading(btn, false, '신청하기');
  } finally {
    if (btn) setLoading(btn, false, '신청하기');
  }
};
