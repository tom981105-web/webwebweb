// Initial AI Data
const defaultAIs = [
    { id: 1, name: 'ChatGPT', logo: '💬', category: '텍스트', url: 'https://chat.openai.com', description: 'OpenAI의 전 세계 1위 대화형 AI 컴패니언. 코딩, 아이디어 기획 등 다방면에서 활용 가능합니다.' },
    { id: 2, name: 'Claude', logo: '🤖', category: '텍스트', url: 'https://claude.ai', description: '자연스럽고 문맥 파악이 뛰어난 Anthropic의 AI. 긴 글 분석에 가장 강력합니다.' },
    { id: 3, name: 'Gemini', logo: '✨', category: '텍스트', url: 'https://gemini.google.com', description: '가장 빠르고 구글 생태계와 연동되는 멀티모달 AI.' },
    { id: 4, name: 'Perplexity', logo: '🔍', category: '텍스트', url: 'https://www.perplexity.ai', description: '인터넷 실시간 검색 기반의 강력한 AI 검색 엔진.' },
    { id: 5, name: 'Copilot', logo: '✈️', category: '텍스트', url: 'https://copilot.microsoft.com', description: 'MS 오피스 및 윈도우 11과 완벽하게 통합된 AI 비서.' },
    { id: 6, name: 'Llama 3', logo: '🦙', category: '텍스트', url: 'https://meta.ai', description: 'Meta(페이스북)에서 공개한 세계 최고 수준의 고성능 오픈소스 AI.' },
    { id: 7, name: 'Mistral', logo: '🌪️', category: '텍스트', url: 'https://chat.mistral.ai', description: '유럽 최고의 성능을 자랑하는 경량화 및 고효율 오픈소스 AI 모델.' },
    { id: 8, name: 'Midjourney', logo: '🎨', category: '이미지', url: 'https://midjourney.com', description: '디스코드 기반의 압도적인 퀄리티를 자랑하는 최고의 이미지 생성 AI.' },
    { id: 9, name: 'Stable Diffusion', logo: '🖼️', category: '이미지', url: 'https://stability.ai', description: '무료로 원하는 만큼 자유롭게 생성 가능한 오픈소스 이미지 AI의 혁명.' },
    { id: 10, name: 'DALL-E 3', logo: '🖌️', category: '이미지', url: 'https://openai.com/dall-e-3', description: 'ChatGPT 안에서 곧바로 정확하게 명령을 알아듣고 뽑아주는 이미지 도구.' },
    { id: 11, name: 'Leonardo AI', logo: '🦁', category: '이미지', url: 'https://leonardo.ai', description: '게임 에셋 및 화려한 2D/3D 아트워크 생성에 최적화된 컨트롤 플랫폼.' },
    { id: 12, name: 'Runway', logo: '🎬', category: '비디오', url: 'https://runwayml.com', description: '텍스트와 이미지를 움직이는 영상(Gen-2)으로 자유롭게 편집해주는 1툴.' },
    { id: 13, name: 'Sora', logo: '🎥', category: '비디오', url: 'https://openai.com/sora', description: '현실과 구분이 안 될 정도의 사실적인 물리법칙을 구현하는 OpenAI 특급 비디오 AI.' },
    { id: 14, name: 'Pika Labs', logo: '🐹', category: '비디오', url: 'https://pika.art', description: '애니메이션과 짧은 클립 생성에 특화된 디스코드/웹 기반 비디오 AI.' },
    { id: 15, name: 'HeyGen', logo: '🧑‍💼', category: '비디오', url: 'https://www.heygen.com', description: '진짜 사람과 구분이 힘든 가상 아바타와 완벽한 입모양 더빙 비디오 AI.' },
    { id: 16, name: 'Luma Dream Machine', logo: '☁️', category: '비디오', url: 'https://lumalabs.ai/dream-machine', description: '누구나 무료로 고품질 짧은 영상을 바로 빠르게 뽑을 수 있는 최신 생성 AI.' },
    { id: 17, name: 'Suno', logo: '🎵', category: '오디오', url: 'https://suno.com', description: '가사만 적어주면 라디오에서 당장 틀어도 될 퀄리티의 보컬 KPOP을 만들어줍니다.' },
    { id: 18, name: 'Udio', logo: '🎧', category: '오디오', url: 'https://www.udio.com', description: 'Suno의 강력한 라이벌, 엄청난 악기 해상도와 세밀한 장르 구현 능력을 가졌습니다.' },
    { id: 19, name: 'ElevenLabs', logo: '🎙️', category: '오디오', url: 'https://elevenlabs.io', description: '텍스트를 가장 현실적인 사람의 목소리와 감정으로 읽어주는 더빙/TTS 1위.' },
    { id: 20, name: 'GitHub Copilot', logo: '💻', category: '코딩', url: 'https://github.com/features/copilot', description: '개발자의 타이핑을 예측해서 코드를 자동 완성해주는 필수 코딩 비서.' },
    { id: 21, name: 'Cursor', logo: '⌨️', category: '코딩', url: 'https://cursor.sh', description: 'VS Code 기반으로 만든 AI 내장 에디터. 파일 전체 구조를 읽고 코드를 직접 작성합니다.' },
    { id: 22, name: 'v0', logo: '📐', category: '코딩', url: 'https://v0.dev', description: '원하는 UI 디자인을 말하면 실시간으로 리액트(Next.js) 코드로 짜주는 Vercel의 마법 AI.' },
    { id: 23, name: 'Devin', logo: '🧠', category: '코딩', url: 'https://cognition-labs.com/devin', description: '세계 최초의 완전 자율형 AI 소프트웨어 엔지니어. 혼자 버그를 잡고 깃헙에 반영합니다.' },
    { id: 24, name: 'Notion AI', logo: '📝', category: '기타', url: 'https://www.notion.so/product/ai', description: '노션 문서 안에서 즉시 글을 요약하고 교정하고 번역해주는 직장인 업무 필수품.' },
    { id: 25, name: 'Gamma', logo: '📊', category: '기타', url: 'https://gamma.app', description: '주제나 내용만 던져주면 PPT 슬라이드를 10초 만에 완벽하게 디자인해서 완성해줍니다.' }
];

// State
let aiData = [];
let currentFilter = '전체';
let editingId = null;

// Prompt Variables
const defaultPrompts = [
    { id: 1, title: '블로그 포스팅 작성', category: '블로그', recommendedAi: 'ChatGPT', description: 'SEO에 최적화된 블로그 글을 작성해주는 프롬프트입니다.', text: '당신은 10년차 전문 블로그 마케터입니다.\n다음에 주어지는 주제로 SEO에 최적화된 블로그 포스트를 작성해주세요.\n\n[조건]\n1. 제목은 클릭 유도할 수 있게 매력적으로 짓기\n2. 서론, 본론, 결론 구조로 작성\n3. 관련 해시태그 5개 마지막에 추가\n\n주제: ' },
    { id: 2, title: '코드 리팩토링 및 주석', category: '코딩', recommendedAi: 'Claude 3.5', description: '가독성과 성능을 높이기 위해 코드를 리팩토링하는 프롬프트.', text: '다음 코드를 분석하고 더 깔끔하고 성능이 좋게 리팩토링 해주세요.\n그리고 각 핵심 변경 사항에 대해 왜 이렇게 변경했는지 자세한 주석도 함께 달아주세요.\n\n```\n(여기에 코드 입력)\n```' }
];
let promptData = [];
let promptFilter = '전체';
let promptSort = 'latest';
let promptSearchTerm = '';
let editingPromptId = null;

function normalizeRecommendedAi(value) {
    if (Array.isArray(value)) {
        return value.filter(Boolean);
    }

    if (typeof value === 'string' && value.trim()) {
        return [value.trim()];
    }

    return [];
}

function normalizePromptEntry(prompt) {
    const numericId = Number(prompt && prompt.id);
    const id = Number.isFinite(numericId) ? numericId : Date.now();
    const inferredDate = id > 1000000000000 ? new Date(id).toISOString() : '';
    return {
        ...prompt,
        id,
        author: (prompt && prompt.author ? String(prompt.author).trim() : 'admin') || 'admin',
        recommendedAi: normalizeRecommendedAi(prompt && prompt.recommendedAi),
        createdAt: (prompt && prompt.createdAt) || inferredDate || '',
        updatedAt: (prompt && prompt.updatedAt) || (prompt && prompt.createdAt) || inferredDate || ''
    };
}

function normalizeAiEntry(ai) {
    return {
        ...ai,
        author: (ai && ai.author ? String(ai.author).trim() : 'admin') || 'admin'
    };
}

function getCurrentAiUser() {
    return localStorage.getItem('current_user') || '';
}

function canManageAiEntry(ai) {
    const currentUser = getCurrentAiUser();
    return !!ai && !!currentUser && (currentUser === 'admin' || ai.author === currentUser);
}

function canManagePromptEntry(prompt) {
    const currentUser = getCurrentAiUser();
    return !!prompt && !!currentUser && (currentUser === 'admin' || prompt.author === currentUser);
}

// DOM Elements
const aiGrid = document.getElementById('aiGrid');
const filterGroup = document.getElementById('filterGroup');

// Modal Elements
const viewModal = document.getElementById('viewModal');
const formModal = document.getElementById('formModal');
const aiForm = document.getElementById('aiForm');

// Initialize
function init() {
    // Load AI
    const storedAI = localStorage.getItem('my_ai_directory');
    if (storedAI) {
        aiData = JSON.parse(storedAI).map(normalizeAiEntry);
        let addedCount = 0;
        defaultAIs.forEach(defAi => {
            if (!aiData.find(a => a.name === defAi.name)) {
                aiData.push(normalizeAiEntry({ ...defAi, id: Date.now() + Math.random(), author: 'admin' }));
                addedCount++;
            }
        });
        if (addedCount > 0) saveData();
    }
    else { aiData = defaultAIs.map((item) => normalizeAiEntry({ ...item, author: 'admin' })); saveData(); }
    
    // Load Prompts
    const storedPrompts = localStorage.getItem('my_prompt_directory');
    if (storedPrompts) {
        promptData = JSON.parse(storedPrompts).map(normalizePromptEntry);
        savePromptData();
    }
    else { promptData = defaultPrompts.map(normalizePromptEntry); savePromptData(); }
    
    renderFilters();
    renderCards();
    
    renderPromptFilters();
    renderPromptCards();
    
    setupEventListeners();
    setupDropZone();
    setupPromptEventListeners();
}

function saveData() {
    localStorage.setItem('my_ai_directory', JSON.stringify(aiData.map(normalizeAiEntry)));
}

function savePromptData() {
    localStorage.setItem('my_prompt_directory', JSON.stringify(promptData.map(normalizePromptEntry)));
}

function renderLogo(logo) {
    if (!logo) return '🤖';
    if (logo.startsWith('http') || logo.startsWith('data:')) {
        return `<img src="${logo}" alt="logo" style="width:100%; height:100%; object-fit:contain; border-radius:12px;">`;
    }
    return logo;
}

function isImageLogoValue(value) {
    const raw = String(value || '').trim();
    if (!raw) return false;
    return raw.startsWith('data:image/')
        || /^https?:\/\/.+\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(raw)
        || /^\/uploads\/.+\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(raw);
}

function getCategories() {
    // Unique categories from data
    const categories = new Set(aiData.map(ai => ai.category));
    return ['전체', ...Array.from(categories)];
}

function renderFilters() {
    const categories = getCategories();
    filterGroup.innerHTML = '';
    
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `filter-btn ${cat === currentFilter ? 'active' : ''}`;
        btn.textContent = cat;
        btn.onclick = () => {
            currentFilter = cat;
            renderFilters();
            renderCards();
        };
        filterGroup.appendChild(btn);
    });
}

function renderCards() {
    aiGrid.innerHTML = '';
    
    const filteredData = currentFilter === '전체' 
        ? aiData 
        : aiData.filter(ai => ai.category === currentFilter);
        
    filteredData.forEach(ai => {
        const card = document.createElement('div');
        card.className = 'ai-item-card';
        card.onclick = () => openViewModal(ai);
        
        card.innerHTML = `
            <div class="ai-item-logo">${renderLogo(ai.logo)}</div>
            <div class="ai-item-title">${ai.name}</div>
            <div class="ai-item-preview">
                <span class="preview-category">${ai.category}</span>
                <p class="preview-desc">${ai.description}</p>
            </div>
        `;
        aiGrid.appendChild(card);
    });
}

function setupEventListeners() {
    // Add AI Button
    document.getElementById('addAiBtn').onclick = () => {
        editingId = null;
        aiForm.reset();
        document.getElementById('logoPreview').innerHTML = '';
        document.getElementById('formModalTitle').textContent = '새로운 AI 추가';
        openModal(formModal);
    };

    // Close buttons
    document.getElementById('closeViewModal').onclick = () => closeModal(viewModal);
    document.getElementById('closeFormModal').onclick = () => closeModal(formModal);
    document.getElementById('cancelFormBtn').onclick = () => closeModal(formModal);
    
    // View Modal Actions
    document.getElementById('editAiBtn').onclick = () => {
        const currentAi = aiData.find(a => a.id === editingId);
        if (!canManageAiEntry(currentAi)) {
            alert('작성자 본인 또는 관리자만 수정할 수 있습니다.');
            return;
        }
        closeModal(viewModal);
        openEditModal(editingId);
    };
    
    document.getElementById('deleteAiBtn').onclick = () => {
        const currentAi = aiData.find(a => a.id === editingId);
        if (!canManageAiEntry(currentAi)) {
            alert('작성자 본인 또는 관리자만 삭제할 수 있습니다.');
            return;
        }
        if(confirm('정말 이 AI 자료를 삭제하시겠습니까? (연결된 프롬프트 추천 AI 목록에서도 함께 삭제됩니다)')) {
            const aiToDelete = aiData.find(a => a.id === editingId);
            
            // 프롬프트 추천 목록에서 삭제된 AI 일괄 연동 정리
            if(aiToDelete) {
                promptData = promptData.map(p => {
                    return {
                        ...p,
                        recommendedAi: normalizeRecommendedAi(p.recommendedAi).filter(name => name !== aiToDelete.name)
                    };
                });
                savePromptData();
                renderPromptCards();
            }

            aiData = aiData.filter(a => a.id !== editingId);
            saveData();
            closeModal(viewModal);
            
            // 만약 현재 필터에 해당하는 항목이 하나도 안남게 되면 '전체'로 돌아가기
            const RemainingInCategory = aiData.filter(a => a.category === currentFilter);
            if(currentFilter !== '전체' && RemainingInCategory.length === 0) {
                currentFilter = '전체';
            }
            
            renderFilters();
            renderCards();
        }
    };

    // Form Submit (Save / Update)
    aiForm.onsubmit = (e) => {
        e.preventDefault();
        const logoValue = document.getElementById('aiLogo').value.trim();
        if (!isImageLogoValue(logoValue)) {
            alert('AI 로고는 이미지 주소나 이미지 파일만 사용할 수 있습니다.');
            return;
        }
        
        const newAi = {
            id: editingId ? editingId : Date.now(),
            name: document.getElementById('aiName').value,
            logo: logoValue,
            category: document.getElementById('aiCategory').value,
            url: document.getElementById('aiUrl').value,
            description: document.getElementById('aiDescription').value,
            author: editingId ? ((aiData.find(a => a.id === editingId) || {}).author || getCurrentAiUser() || 'admin') : (getCurrentAiUser() || 'admin')
        };

        if (editingId) {
            // Update
            const index = aiData.findIndex(a => a.id === editingId);
            if(index !== -1) aiData[index] = newAi;
        } else {
            // Add
            aiData.push(newAi);
        }

        saveData();
        closeModal(formModal);
        
        // 새로 추가하거나 수정한 카테고리가 보이도록 필터를 갱신하고 현재 필터를 맞춤
        currentFilter = newAi.category;
        renderFilters();
        renderCards();
    };
    
    // Click outside modal to close
    window.onclick = (e) => {
        if (e.target === viewModal) closeModal(viewModal);
    };
}

function openViewModal(ai) {
    editingId = ai.id;
    document.getElementById('viewLogo').innerHTML = renderLogo(ai.logo);
    document.getElementById('viewTitle').textContent = ai.name;
    document.getElementById('viewCategory').textContent = ai.category;
    document.getElementById('viewDescription').textContent = ai.description;
    document.getElementById('viewUrl').href = Math.random() ? ai.url : '#'; // Just ensuring it has a link
    document.getElementById('viewUrl').href = ai.url;
    const canManage = canManageAiEntry(ai);
    document.getElementById('editAiBtn').style.display = canManage ? 'inline-flex' : 'none';
    document.getElementById('deleteAiBtn').style.display = canManage ? 'inline-flex' : 'none';
    
    openModal(viewModal);
}

function openEditModal(id) {
    const ai = aiData.find(a => a.id === id);
    if (!ai) return;
    if (!canManageAiEntry(ai)) {
        alert('작성자 본인 또는 관리자만 수정할 수 있습니다.');
        return;
    }
    
    document.getElementById('aiId').value = ai.id;
    document.getElementById('aiName').value = ai.name;
    document.getElementById('aiLogo').value = ai.logo;
    document.getElementById('logoPreview').innerHTML = renderLogo(ai.logo);
    document.getElementById('aiUrl').value = ai.url;
    document.getElementById('aiDescription').value = ai.description;
    
    // Check if category exists in select, if not add it
    const catSelect = document.getElementById('aiCategory');
    let exists = false;
    for(let opt of catSelect.options) {
        if(opt.value === ai.category) exists = true;
    }
    if(!exists) {
        const newOpt = new Option(ai.category, ai.category);
        catSelect.add(newOpt);
    }
    catSelect.value = ai.category;
    
    document.getElementById('formModalTitle').textContent = 'AI 정보 수정';
    openModal(formModal);
}

function openModal(modal) {
    modal.classList.add('active');
}

function closeModal(modal) {
    modal.classList.remove('active');
}

function setupDropZone() {
    const dropZone = document.getElementById('logoDropZone');
    const logoInput = document.getElementById('aiLogo');
    const logoPreview = document.getElementById('logoPreview');

    function updateLogoPreview(val) {
        logoPreview.innerHTML = isImageLogoValue(val) ? renderLogo(val) : '';
    }

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    logoInput.value = reader.result;
                    updateLogoPreview(reader.result);
                };
                reader.readAsDataURL(file);
            }
        }
    }, false);

    logoInput.addEventListener('input', (e) => {
        updateLogoPreview(e.target.value);
    });
}

/* ==================== PROMPT LOGIC ==================== */

function renderPromptFilters() {
    const categories = new Set(promptData.map(p => p.category));
    const filterSelect = document.getElementById('promptFilter');
    
    for(let cat of categories) {
        let exists = false;
        for(let opt of filterSelect.options) {
            if(opt.value === cat) exists = true;
        }
        if(!exists) {
            filterSelect.add(new Option(cat, cat));
        }
    }
}

function renderPromptCards() {
    const grid = document.getElementById('promptGrid');
    grid.innerHTML = '';
    
    let filtered = promptData;
    
    // Search
    if (promptSearchTerm) {
        const lowerTerm = promptSearchTerm.toLowerCase();
        filtered = filtered.filter(p => 
            p.title.toLowerCase().includes(lowerTerm) || 
            p.description.toLowerCase().includes(lowerTerm) ||
            p.text.toLowerCase().includes(lowerTerm)
        );
    }
    
    // Filter
    if (promptFilter !== '전체') {
        filtered = filtered.filter(p => p.category === promptFilter);
    }
    
    // Sort
    filtered = filtered.slice().sort((a, b) => {
        if (promptSort === 'latest') return b.id - a.id;
        if (promptSort === 'name') return a.title.localeCompare(b.title);
        return 0;
    });

    filtered.forEach(p => {
        const recommendedList = normalizeRecommendedAi(p.recommendedAi);
        const card = document.createElement('div');
        card.className = 'prompt-card';
        card.onclick = () => openViewPromptModal(p);
        
        card.innerHTML = `
            <div class="prompt-card-header">
                <div class="prompt-card-title">${p.title}</div>
                <div style="display:flex; gap: 6px; flex-wrap:wrap; justify-content:flex-end;">
                    <div class="prompt-card-category">${p.category}</div>
                    ${recommendedList.length > 0 ? recommendedList.map(aiName => {
                        const targetAi = aiData.find(a => a.name === aiName);
                        let logoSafe = '🤖';
                        if(targetAi && targetAi.logo) {
                            if(targetAi.logo.startsWith('data:') || targetAi.logo.startsWith('http')) {
                                logoSafe = `<img src="${targetAi.logo}" style="width:16px; height:16px; border-radius:4px; object-fit:contain; vertical-align:middle;">`;
                            } else {
                                logoSafe = targetAi.logo;
                            }
                        }
                        return `<div class="prompt-card-ai">${logoSafe} ${aiName}</div>`;
                    }).join('') : ''}
                </div>
            </div>
            <div class="prompt-card-desc">${p.description}</div>
        `;
        grid.appendChild(card);
    });
}

function setupPromptEventListeners() {
    const promptTitleInput = document.getElementById('promptTitle');
    if (promptTitleInput) {
        promptTitleInput.maxLength = 20;
        promptTitleInput.setAttribute('maxlength', '20');
    }

    function renderDynamicAiCheckboxes() {
        const box = document.getElementById('aiCheckboxList');
        if(!box) return;
        box.innerHTML = '';
        aiData.forEach(ai => {
            let logoSafe = ai.logo || '🤖';
            if(logoSafe.startsWith('data:') || logoSafe.startsWith('http')) {
                logoSafe = `<img src="${logoSafe}" style="width:20px; height:20px; border-radius:4px; object-fit:contain; flex-shrink:0;">`;
            }
            box.innerHTML += `
                <label class="ai-checkbox-chip">
                    <input type="checkbox" name="promptAi" value="${ai.name}">
                    <span class="ai-checkbox-text"><span class="ai-checkbox-icon">${logoSafe}</span>${ai.name}</span>
                </label>
            `;
        });
    }

    document.getElementById('addPromptBtn').onclick = () => {
        editingPromptId = null;
        document.getElementById('promptForm').reset();
        renderDynamicAiCheckboxes();
        document.getElementById('formPromptModalTitle').textContent = '새로운 프롬프트 추가';
        openModal(document.getElementById('formPromptModal'));
    };

    // Controls
    document.getElementById('promptSearch').addEventListener('input', (e) => {
        promptSearchTerm = e.target.value;
        renderPromptCards();
    });
    
    document.getElementById('promptFilter').addEventListener('change', (e) => {
        promptFilter = e.target.value;
        renderPromptCards();
    });
    
    document.getElementById('promptSort').addEventListener('change', (e) => {
        promptSort = e.target.value;
        renderPromptCards();
    });

    // Close Modals
    document.getElementById('closeViewPromptModal').onclick = () => closeModal(document.getElementById('viewPromptModal'));
    document.getElementById('closeFormPromptModal').onclick = () => closeModal(document.getElementById('formPromptModal'));
    document.getElementById('cancelPromptFormBtn').onclick = () => closeModal(document.getElementById('formPromptModal'));
    
    // View Modal Actions
    document.getElementById('editPromptBtn').onclick = () => {
        const currentPrompt = promptData.find(p => p.id === editingPromptId);
        if (!canManagePromptEntry(currentPrompt)) {
            alert('작성자 본인 또는 관리자만 수정할 수 있습니다.');
            return;
        }
        closeModal(document.getElementById('viewPromptModal'));
        openEditPromptModal(editingPromptId);
    };
    
    document.getElementById('deletePromptBtn').onclick = () => {
        const currentPrompt = promptData.find(p => p.id === editingPromptId);
        if (!canManagePromptEntry(currentPrompt)) {
            alert('작성자 본인 또는 관리자만 삭제할 수 있습니다.');
            return;
        }
        if(confirm('정말 이 프롬프트를 삭제하시겠습니까?')) {
            promptData = promptData.filter(p => p.id !== editingPromptId);
            savePromptData();
            closeModal(document.getElementById('viewPromptModal'));
            renderPromptFilters();
            renderPromptCards();
        }
    };
    
    document.getElementById('copyPromptBtn').onclick = () => {
        const text = document.getElementById('viewPromptText').textContent;
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('copyPromptBtn');
            btn.textContent = '복사 성공!';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = '복사';
                btn.classList.remove('copied');
            }, 2000);
        });
    };

    // Form Submit
    document.getElementById('promptForm').onsubmit = (e) => {
        e.preventDefault();
        
        const checkboxes = document.querySelectorAll('input[name="promptAi"]:checked');
        const selectedAIs = Array.from(checkboxes).map(cb => cb.value);

        const newPrompt = {
            id: editingPromptId ? editingPromptId : Date.now(),
            title: document.getElementById('promptTitle').value,
            category: document.getElementById('promptCategory').value,
            recommendedAi: selectedAIs,
            description: document.getElementById('promptDescription').value,
            text: document.getElementById('promptText').value,
            author: editingPromptId ? ((promptData.find(p => p.id === editingPromptId) || {}).author || getCurrentAiUser() || 'admin') : (getCurrentAiUser() || 'admin'),
            createdAt: editingPromptId ? ((promptData.find(p => p.id === editingPromptId) || {}).createdAt || new Date().toISOString()) : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (editingPromptId) {
            const index = promptData.findIndex(p => p.id === editingPromptId);
            if(index !== -1) promptData[index] = newPrompt;
        } else {
            promptData.push(newPrompt);
        }

        savePromptData();
        closeModal(document.getElementById('formPromptModal'));
        renderPromptFilters();
        renderPromptCards();
    };
    
    window.onclick = (e) => {
        if (e.target === viewModal) closeModal(viewModal);
        if (e.target === document.getElementById('viewPromptModal')) closeModal(document.getElementById('viewPromptModal'));
    };
}

function openViewPromptModal(p) {
    editingPromptId = p.id;
    const recommendedList = normalizeRecommendedAi(p.recommendedAi);
    document.getElementById('viewPromptTitle').textContent = p.title;
    document.getElementById('viewPromptCategory').textContent = p.category;
    
    const recommendedElem = document.getElementById('viewPromptRecommendedAi');
    if (recommendedList.length > 0) {
        recommendedElem.style.display = 'inline-block';
        recommendedElem.innerHTML = recommendedList.map(aiName => {
            const targetAi = aiData.find(a => a.name === aiName);
            let logoSafe = '🤖';
            if(targetAi) {
                if(targetAi.logo.startsWith('data:') || targetAi.logo.startsWith('http')) {
                    logoSafe = `<img src="${targetAi.logo}" style="width:16px; height:16px; border-radius:4px; object-fit:contain; vertical-align:middle;">`;
                } else {
                    logoSafe = targetAi.logo;
                }
            }
            return `<span style="display:inline-flex; align-items:center; gap:4px;">${logoSafe} ${aiName}</span>`;
        }).join('<span style="color:rgba(255,255,255,0.3); margin:0 4px;">|</span>');
    } else {
        recommendedElem.style.display = 'none';
    }
    
    document.getElementById('viewPromptDesc').textContent = p.description;
    document.getElementById('viewPromptText').textContent = p.text;
    
    const btn = document.getElementById('copyPromptBtn');
    btn.textContent = '복사';
    btn.classList.remove('copied');
    const canManage = canManagePromptEntry(p);
    document.getElementById('editPromptBtn').style.display = canManage ? 'inline-flex' : 'none';
    document.getElementById('deletePromptBtn').style.display = canManage ? 'inline-flex' : 'none';

    openModal(document.getElementById('viewPromptModal'));
}

function openEditPromptModal(id) {
    const p = promptData.find(a => a.id === id);
    if (!p) return;
    if (!canManagePromptEntry(p)) {
        alert('작성자 본인 또는 관리자만 수정할 수 있습니다.');
        return;
    }
    
    document.getElementById('promptId').value = p.id;
    document.getElementById('promptTitle').value = p.title;
    
    // Checkboxes 렌더링 후 값 매핑 (Dynamic Setup)
    const box = document.getElementById('aiCheckboxList');
    if(box) {
        box.innerHTML = '';
        aiData.forEach(ai => {
            let logoSafe = ai.logo;
            if(ai.logo.startsWith('data:') || ai.logo.startsWith('http')) {
                logoSafe = `<img src="${ai.logo}" style="width:20px; height:20px; border-radius:4px; object-fit:contain;">`;
            }
            const isChecked = normalizeRecommendedAi(p.recommendedAi).includes(ai.name) ? 'checked' : '';
            box.innerHTML += `
                <label class="ai-checkbox-chip">
                    <input type="checkbox" name="promptAi" value="${ai.name}" ${isChecked}>
                    <span class="ai-checkbox-text"><span class="ai-checkbox-icon">${logoSafe}</span>${ai.name}</span>
                </label>
            `;
        });
    }

    document.getElementById('promptDescription').value = p.description;
    document.getElementById('promptText').value = p.text;
    
    const catSelect = document.getElementById('promptCategory');
    let exists = false;
    for(let opt of catSelect.options) {
        if(opt.value === p.category) exists = true;
    }
    if(!exists) catSelect.add(new Option(p.category, p.category));
    catSelect.value = p.category;
    
    document.getElementById('formPromptModalTitle').textContent = '프롬프트 수정';
    openModal(document.getElementById('formPromptModal'));
}

// Run
init();

const aiPageParams = new URLSearchParams(window.location.search);
const initialPromptId = Number(aiPageParams.get('prompt'));
if (Number.isFinite(initialPromptId) && initialPromptId > 0) {
    setTimeout(() => {
        const targetPrompt = promptData.find((prompt) => Number(prompt.id) === initialPromptId);
        if (targetPrompt) {
            openViewPromptModal(targetPrompt);
        }
    }, 0);
}
