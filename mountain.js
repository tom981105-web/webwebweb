// mountain.js
let map;
let markers = [];
let mountainsCache = [];
let mountainBoardBootstrapped = false;

function getApiBase() {
    if (window.location.protocol === 'file:') {
        return 'http://localhost:3000';
    }
    return '';
}

function getApiUrl(path) {
    return getApiBase() + path;
}

function safeParse(value, fallback) {
    try {
        return JSON.parse(value);
    } catch (error) {
        return fallback;
    }
}

async function retryAsync(task, attempts = 4, delayMs = 300) {
    let lastError = null;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
            return await task();
        } catch (error) {
            lastError = error;
            if (attempt < attempts - 1) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }
    }
    throw lastError || new Error('요청에 실패했습니다.');
}

const initialMountains = [
    {
        id: "m_1",
        name: "한라산 백록담",
        lat: 33.3614,
        lng: 126.5298,
        alt: "1,947m",
        date: "2023-10-15",
        members: "admin, 철수",
        desc: "안개가 걷히면서 백록담 풍경이 또렷하게 보여서 오래 기억에 남은 산행입니다. 정상까지 이어진 시간도 길었지만 충분히 보람 있었어요.",
        photo: "https://images.unsplash.com/photo-1542401886-65d6c61db217?q=80&w=800&auto=format&fit=crop"
    },
    {
        id: "m_2",
        name: "지리산 천왕봉",
        lat: 35.3369,
        lng: 127.7297,
        alt: "1,915m",
        date: "2024-01-01",
        members: "친구들, 지원",
        desc: "새해 일출을 보러 갔던 겨울 산행이었습니다. 추웠지만 잊기 어려운 풍경이라 다시 꺼내보게 되는 기록입니다.",
        photo: "https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?q=80&w=800&auto=format&fit=crop"
    }
];

function getMountains() {
    if (Array.isArray(mountainsCache) && mountainsCache.length) {
        return mountainsCache;
    }
    const mtns = safeParse(localStorage.getItem('mountains_db') || '[]', []);
    if (Array.isArray(mtns) && mtns.length) {
        mountainsCache = mtns.map(normalizeMountainRecord);
        return mountainsCache;
    }
    mountainsCache = window.location.protocol === 'file:'
        ? initialMountains.map(normalizeMountainRecord)
        : [];
    return mountainsCache;
}

function getNormalizedMountainsCache() {
    if (!Array.isArray(mountainsCache)) {
        mountainsCache = [];
    }
    mountainsCache = mountainsCache.map(normalizeMountainRecord);
    return mountainsCache;
}

async function fetchMountainsFromServer() {
    const response = await fetch(getApiUrl('/api/mountains'), { cache: 'no-store' });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false || !Array.isArray(result.mountains)) {
        throw new Error(result.message || '산 기록을 불러오지 못했습니다.');
    }
    return result.mountains;
}

async function createMountainOnServer(payload) {
    const response = await fetch(getApiUrl('/api/mountains'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false || !result.mountain) {
        throw new Error(result.message || '산 기록 저장에 실패했습니다.');
    }
    return normalizeMountainRecord(result.mountain);
}

async function updateMountainOnServer(id, payload) {
    const response = await fetch(getApiUrl(`/api/mountains/${encodeURIComponent(id)}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false || !result.mountain) {
        throw new Error(result.message || '산 기록 수정에 실패했습니다.');
    }
    return normalizeMountainRecord(result.mountain);
}

async function deleteMountainOnServer(id) {
    const response = await fetch(getApiUrl(`/api/mountains/${encodeURIComponent(id)}`), {
        method: 'DELETE'
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false) {
        throw new Error(result.message || '산 기록 삭제에 실패했습니다.');
    }
}

async function refreshMountainsFromServer(options = {}) {
    const attempts = Number.isFinite(Number(options.attempts)) ? Number(options.attempts) : 2;
    const delayMs = Number.isFinite(Number(options.delayMs)) ? Number(options.delayMs) : 150;
    const nextMountains = (await retryAsync(() => fetchMountainsFromServer(), attempts, delayMs)).map(normalizeMountainRecord);
    const previousSerialized = JSON.stringify(getNormalizedMountainsCache());
    const nextSerialized = JSON.stringify(nextMountains);
    mountainsCache = nextMountains;
    saveMountains(nextMountains);
    if (mountainBoardBootstrapped && previousSerialized !== nextSerialized) {
        renderMarkers();
        renderMountainBoard();
    }
    return nextMountains;
}

document.addEventListener('DOMContentLoaded', () => {
    mountainsCache = getMountains().map(normalizeMountainRecord);

    // ?쒕컲???꾩껜媛 蹂댁씪 ???덈룄濡?以묒븰 醫뚰몴瑜??쎄컙 遺곸そ?쇰줈 ?곹뼢
    const koreaCenter = [38.0, 127.5];
    
    // ??쒕?援?遺곹븳 ?꾩껜媛 ?ы븿?섎룄濡?吏???대룞 諛?異뺤냼 ?쒓퀎(Boundary) ?뺤옣
    const southWest = L.latLng(33.0, 124.0); // 諛깅졊???쒖＜???쒖륫 ?ъ쑀 踰붿쐞
    const northEast = L.latLng(43.5, 132.0); // 遺곹븳 理쒕턿??諛??낅룄 ?숈륫 ?ъ쑀 踰붿쐞
    const koreaBounds = L.latLngBounds(southWest, northEast);

    // Create map limits
    map = L.map('map', {
        center: koreaCenter,
        zoom: 6, // ?꾩껜媛 ?쒕늿???ㅼ뼱?ㅻ룄濡?湲곕낯 異뺤쟻移?議곗젙
        minZoom: 6, // 遺곹븳源뚯? 蹂댁씠?ㅻ㈃ ???볤쾶 異뺤냼?섏뼱????        maxBounds: koreaBounds,
        maxBoundsViscosity: 1.0 // ?쒕컲???곸뿭???꾩쟾??怨좎젙
    });

    // 諛앹? ?쒓뎅???곗븙 吏?뺣룄 ???(?깆궛濡? 怨좊룄, ?꾨꼍???쒓뎅???띿뒪??吏??
    L.tileLayer('https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&hl=ko', {
        attribution: '&copy; Google Maps Terrain',
        maxZoom: 18
    }).addTo(map);

    // Right Click Context Menu Feature
    const mapContextMenu = document.getElementById('mapContextMenu');
    
    map.on('contextmenu', function(e) {
        window.contextMenuLatLng = e.latlng;
        mapContextMenu.style.display = 'block';
        mapContextMenu.style.left = e.originalEvent.pageX + 'px';
        mapContextMenu.style.top = e.originalEvent.pageY + 'px';
    });

    document.addEventListener('click', function(e) {
        if(mapContextMenu && mapContextMenu.style.display === 'block') {
            mapContextMenu.style.display = 'none';
        }
    });

    map.on('dragstart', function() {
        if(mapContextMenu) mapContextMenu.style.display = 'none';
    });

    // Zoom 湲곕컲 ?ㅼ???議곗젙 (?붾㈃ ?뺣?/異뺤냼 ???앹뾽 ?ш린 議곗젅)
    function updatePopupScale() {
        const currentZoom = map.getZoom();
        // Zoom 7 -> ~0.75 scale | Zoom 18 -> ~1.4 scale
        let scale = 0.75 + ((currentZoom - 7) / 11) * 0.65;
        scale = Math.max(0.6, Math.min(scale, 1.4));
        document.documentElement.style.setProperty('--map-zoom-scale', scale);
    }
    
    map.on('zoomend', updatePopupScale);
    updatePopupScale(); // 珥덇린 ?쒕뜑留?異뺤쿃

    renderMarkers();
    renderMountainBoard();
    mountainBoardBootstrapped = true;

    void refreshMountainsFromServer().catch(() => {});
});

function renderMarkers() {
    // clear existing markers
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    const mountains = getNormalizedMountainsCache();

    mountains.forEach(mtn => {
        // Red Map Marker for Leaflet
        const customIcon = L.icon({
            iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        const marker = L.marker([parseFloat(mtn.lat), parseFloat(mtn.lng)], { icon: customIcon }).addTo(map);

        // ?됰꽕??泥섎━ (李몄뿬?몄썝??肄ㅻ쭏濡?援щ텇??寃쎌슦 泥섎━)
        const users = JSON.parse(localStorage.getItem('users_db') || '{}');
        const getDisplayName = (id) => {
            const trimmedId = id ? id.trim() : '';
            return (users[trimmedId] && users[trimmedId].nickname) ? users[trimmedId].nickname : trimmedId;
        };
        const memberDisplay = mtn.members.split(',').map(m => getDisplayName(m)).join(', ');

        // Hover Tooltip UI Design
        const contentString = `
            <div class="info-window">
                ${mtn.photo ? `<img src="${mtn.photo}" alt="${mtn.name}">` : ''}
                <div class="info-content">
                    <h3>${mtn.name}</h3>
                    <div class="info-grid">
                        <span class="label">고도</span><span class="val">${mtn.alt}</span>
                        <span class="label">등산일</span><span class="val">${mtn.date}</span>
                        <span class="label">참여 인원</span><span class="val">${memberDisplay}</span>
                    </div>
                    <div class="info-desc">${mtn.desc}</div>
                    ${canManageMountain(normalizeMountainRecord(mtn)) ? 
                        `<button class="btn-delete-marker" onclick="deleteMountain('${mtn.id}')">기록 삭제</button>` 
                        : ''}
                </div>
            </div>
        `;

        // Bind Leaflet popup with interactive behavior
        marker.bindPopup(contentString);

        // Toggle popup smoothly on hover (and keep it open if interaction is needed)
        marker.on('mouseover', function (e) {
            this.openPopup();
        });

        markers.push(marker);
    });
}

window.deleteMountain = function(id) {
    if(confirm('이 산 기록을 삭제하시겠습니까? 삭제하면 되돌릴 수 없습니다.')) {
        const mountains = getMountains();
        const updated = mountains.filter(m => m.id !== id);
        localStorage.setItem('mountains_db', JSON.stringify(updated));
        
        map.closePopup();
        renderMarkers();
    }
};

// -- Modal Logic & Drag and Drop for Photo --
const modal = document.getElementById('mountainModal');

window.handleContextMenuClick = function() {
    const contextMenu = document.getElementById('mapContextMenu');
    contextMenu.style.display = 'none';
    
    if(window.contextMenuLatLng) {
        openAddModal();
        document.getElementById('mLat').value = window.contextMenuLatLng.lat.toFixed(6);
        document.getElementById('mLng').value = window.contextMenuLatLng.lng.toFixed(6);
        window.contextMenuLatLng = null; // reset
    }
};

window.openAddModal = function() {
    modal.style.display = 'block';
    document.getElementById('mDate').valueAsDate = new Date(); // default today
};

window.closeAddModal = function() {
    modal.style.display = 'none';
    document.getElementById('mountainForm').reset();
    document.getElementById('photoPreview').style.display = 'none';
    document.getElementById('dropText').style.display = 'block';
};

window.onclick = function(event) {
    if (event.target === document.getElementById('mtDetailModal')) {
        closeMtDetailModal();
    }
};

// Form submission to create new marker on Leaflet map
document.getElementById('mountainForm').onsubmit = (e) => {
    e.preventDefault();
    const mountains = getMountains();
    const newId = 'm_' + Date.now();
    
    mountains.push({
        id: newId,
        name: document.getElementById('mName').value,
        lat: document.getElementById('mLat').value,
        lng: document.getElementById('mLng').value,
        alt: document.getElementById('mAlt').value,
        date: document.getElementById('mDate').value,
        members: document.getElementById('mMembers').value,
        desc: document.getElementById('mDesc').value,
        photo: document.getElementById('photoPreview').src || document.getElementById('mPhoto').value
    });
    
    localStorage.setItem('mountains_db', JSON.stringify(mountains));
    renderMarkers();
    closeAddModal();
    
    // Leaflet smooth flyTo animation
    map.flyTo([parseFloat(document.getElementById('mLat').value), parseFloat(document.getElementById('mLng').value)], 11, {
        animate: true,
        duration: 1.5
    });
};

// Drag and drop photo setup
const dropZone = document.getElementById('photoDropZone');
const photoInput = document.getElementById('mPhoto');
const mountainPhotoFileInput = document.getElementById('mountainPhotoFile');
const preview = document.getElementById('photoPreview');
const dropText = document.getElementById('dropText');

async function uploadMountainPhoto(file) {
    const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('사진 파일을 읽지 못했습니다.'));
        reader.readAsDataURL(file);
    });

    const response = await fetch(getApiUrl('/api/uploads/image'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            folder: 'board-inline',
            fileName: file.name || 'mountain-photo',
            dataUrl
        })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success === false || !result.url) {
        throw new Error(result.message || '산행 사진 업로드에 실패했습니다.');
    }
    return result.url;
}

async function handleMountainPhotoFiles(fileList) {
    const imageFiles = Array.from(fileList || []).filter((file) => file && String(file.type || '').startsWith('image/'));
    if (!imageFiles.length) return;

    const remainingSlots = Math.max(0, 4 - pendingMountainPhotos.length);
    if (!remainingSlots) {
        alert('산행 사진은 최대 4장까지 추가할 수 있습니다.');
        return;
    }

    for (const file of imageFiles.slice(0, remainingSlots)) {
        try {
            addMountainPhoto(await uploadMountainPhoto(file));
        } catch (error) {
            alert(error.message || '산행 사진 업로드에 실패했습니다.');
        }
    }

    if (imageFiles.length > remainingSlots) {
        alert('산행 사진은 최대 4장까지 추가할 수 있습니다.');
    }
}

if (dropText) {
    dropText.textContent = '사진을 선택하거나 이곳에 드래그해 넣어 주세요. 최대 4장까지 가능합니다.';
}

photoInput.addEventListener('input', (e) => {
    const values = String(e.target.value || '')
        .split(/[\n,]+/)
        .map((value) => value.trim())
        .filter(Boolean);
    values.forEach((value) => addMountainPhoto(value));
    e.target.value = '';
});

if (mountainPhotoFileInput) {
    mountainPhotoFileInput.addEventListener('change', async (e) => {
        await handleMountainPhotoFiles(e.target.files);
        e.target.value = '';
    });
}

dropZone.addEventListener('click', (e) => {
    if (!mountainPhotoFileInput) return;
    if (e.target.closest('button')) return;
    mountainPhotoFileInput.click();
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});
dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    await handleMountainPhotoFiles(e.dataTransfer.files || []);
});

// -- Region Masking Logic --
let regionMaskLayer = null;
let geoJsonData = null;

// 諛깃렇?쇱슫?쒖뿉??理쒖떊 SK ?됱젙援ъ뿭 GeoJSON ?먯뀑 遺덈윭?ㅺ린
fetch('https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2013/json/skorea_provinces_geo_simple.json')
    .then(res => res.json())
    .then(data => { geoJsonData = data; })
    .catch(e => console.error("GeoJSON Load Error:", e));

window.filterRegion = function(regionGroup) {
    // 踰꾪듉 UI ?곹깭 ?꾪솚
    document.querySelectorAll('.region-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.textContent.includes(regionGroup) || btn.getAttribute('onclick').includes(regionGroup)) {
            btn.classList.add('active');
        }
    });

    if (regionMaskLayer) {
        map.removeLayer(regionMaskLayer);
        regionMaskLayer = null;
    }

    if (regionGroup === '?꾩껜') {
        const southWest = L.latLng(33.0, 124.0);
        const northEast = L.latLng(43.5, 132.0);
        map.flyToBounds(L.latLngBounds(southWest, northEast), {duration: 1.5});
        return;
    }

    if (!geoJsonData) {
        alert("지역 데이터가 아직 로딩 중입니다. 잠시 후 다시 시도해 주세요.");
        return;
    }

    const regionNames = [];
    if(regionGroup === '서울') regionNames.push('서울특별시');
    if(regionGroup.includes('경기')) regionNames.push('경기도', '인천광역시');
    if(regionGroup === '강원') regionNames.push('강원도');
    if(regionGroup.includes('충청')) regionNames.push('충청북도', '충청남도', '대전광역시', '세종특별자치시');
    if(regionGroup.includes('전라')) regionNames.push('전라북도', '전라남도', '광주광역시');
    if(regionGroup.includes('경상')) regionNames.push('경상북도', '경상남도', '부산광역시', '대구광역시', '울산광역시');
    if(regionGroup === '제주') regionNames.push('제주특별자치도');

    // GeoJSON ?쇱쿂 留ㅼ묶
    const matchingFeatures = geoJsonData.features.filter(f => regionNames.includes(f.properties.name));
    if (matchingFeatures.length === 0) return;

    // 바깥 마스크 영역 생성
    const outerRing = [
        [90, -180],
        [90, 180],
        [-90, 180],
        [-90, -180]
    ];

    let holes = [];
    let combinedBounds = L.latLngBounds();

    matchingFeatures.forEach(feature => {
        // 2. 援щ찉 ?뚭린 (GeoJSON: Lng, Lat -> Leaflet: Lat, Lng 蹂??
        if (feature.geometry.type === 'Polygon') {
            feature.geometry.coordinates.forEach(ring => {
                holes.push(ring.map(c => [c[1], c[0]]));
            });
        } else if (feature.geometry.type === 'MultiPolygon') {
            feature.geometry.coordinates.forEach(poly => {
                poly.forEach(ring => {
                    holes.push(ring.map(c => [c[1], c[0]]));
                });
            });
        }
        // 3. 援ъ뿭 以뚯쓣 ?꾪븳 ?대━怨?諛붿슫?붾━ ?섏쭛
        const tempLayer = L.geoJSON(feature);
        combinedBounds.extend(tempLayer.getBounds());
    });

    regionMaskLayer = L.polygon([outerRing, ...holes], {
        color: '#60a5fa',     // ?섎젮?섍컙 援ъ뿭(?좏깮援ъ뿭)???뚮몢由??됱긽
        weight: 3,
        fillColor: '#0c111c', // 寃? ?댄듃 ?꾪꽣 ?④낵
        fillOpacity: 0.85,    // ???대몢?뚯???遺덊닾紐낅룄
        interactive: false    // 留덉뒪???ъ떆 ?대┃ ?멸? (?대몢??怨??꾨옒 留덉빱 ?대┃ 媛??
    }).addTo(map);

    // ?대떦 吏??씠 苑?李⑤낫?닿쾶 遺?쒕윭??Zoom In
    map.flyToBounds(combinedBounds, { padding: [50, 50], duration: 1.5 });
};
// -- Mountain Board Logic --
function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeMountainRecord(mountain) {
    const normalizedPhotos = Array.isArray(mountain.photos)
        ? mountain.photos.filter(Boolean).slice(0, 4)
        : (mountain.photo ? [mountain.photo] : []);
    return {
        ...mountain,
        id: mountain.id || `m_${Date.now()}`,
        title: mountain.title || mountain.name || '산행 기록',
        author: (mountain.author ? String(mountain.author).trim() : 'admin') || 'admin',
        createdAt: mountain.createdAt || mountain.date || new Date().toISOString(),
        updatedAt: mountain.updatedAt || mountain.createdAt || mountain.date || new Date().toISOString(),
        photos: normalizedPhotos,
        photo: normalizedPhotos[0] || mountain.photo || '',
        desc: mountain.desc || '',
        members: mountain.members || ''
    };
}

function saveMountains(nextMountains) {
    mountainsCache = nextMountains.map(normalizeMountainRecord);
    localStorage.setItem('mountains_db', JSON.stringify(mountainsCache));
}

function getMountainById(id) {
    return getNormalizedMountainsCache().find((mountain) => mountain.id === id) || null;
}

function canManageMountain(mountain) {
    const currentUser = localStorage.getItem('current_user');
    return !!currentUser && (currentUser === 'admin' || currentUser === mountain.author);
}

function formatMountainDate(dateValue) {
    if (!dateValue) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
    const parsed = new Date(dateValue);
    return Number.isNaN(parsed.getTime()) ? dateValue : parsed.toLocaleDateString('ko-KR');
}

function getMountainAuthorName(authorId) {
    const users = JSON.parse(localStorage.getItem('users_db') || '{}');
    const trimmedId = String(authorId || '').trim();
    return (users[trimmedId] && users[trimmedId].nickname) ? users[trimmedId].nickname : trimmedId;
}

let pendingMountainPhotos = [];

function ensureMountainPhotoPreviewGrid() {
    const dropZone = document.getElementById('photoDropZone');
    if (!dropZone) return null;
    let grid = document.getElementById('photoPreviewGrid');
    if (!grid) {
        grid = document.createElement('div');
        grid.id = 'photoPreviewGrid';
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
        grid.style.gap = '10px';
        grid.style.width = '100%';
        grid.style.marginTop = '10px';
        dropZone.appendChild(grid);
    }
    return grid;
}

function renderMountainPhotoPreviews() {
    const grid = ensureMountainPhotoPreviewGrid();
    const preview = document.getElementById('photoPreview');
    const dropText = document.getElementById('dropText');
    if (!grid || !preview || !dropText) return;
    preview.style.display = 'none';
    preview.src = '';
    if (!pendingMountainPhotos.length) {
        grid.innerHTML = '';
        dropText.style.display = 'block';
        return;
    }
    dropText.style.display = 'none';
    grid.innerHTML = pendingMountainPhotos.map((photo, index) => `
        <div style="position:relative; border-radius:14px; overflow:hidden; background:rgba(255,255,255,0.75); border:1px solid rgba(109, 64, 38, 0.12);">
            <img src="${photo}" style="width:100%; height:120px; object-fit:cover; display:block;">
            <button type="button" onclick="removeMountainPhoto(${index})" style="position:absolute; top:8px; right:8px; width:30px; height:30px; border:none; border-radius:50%; background:rgba(47,31,24,0.72); color:#fff; cursor:pointer;">×</button>
        </div>
    `).join('');
}

function addMountainPhoto(photoUrl) {
    const normalized = String(photoUrl || '').trim();
    if (!normalized) return;
    if (pendingMountainPhotos.length >= 4) {
        alert('산행 사진은 최대 4장까지 추가할 수 있습니다.');
        return;
    }
    pendingMountainPhotos.push(normalized);
    renderMountainPhotoPreviews();
}

window.removeMountainPhoto = function(index) {
    pendingMountainPhotos.splice(index, 1);
    renderMountainPhotoPreviews();
};

function resetMountainForm() {
    const form = document.getElementById('mountainForm');
    if (!form) return;
    form.reset();
    const nameInput = document.getElementById('mName');
    if (nameInput) nameInput.maxLength = 15;
    const storyTitleInput = document.getElementById('mtTitle');
    if (storyTitleInput) storyTitleInput.maxLength = 15;
    document.getElementById('mEditId').value = '';
    pendingMountainPhotos = [];
    renderMountainPhotoPreviews();
    const submitButton = document.querySelector('#mountainForm .btn-submit');
    if (submitButton) submitButton.textContent = '기록 저장하기';
    const modalTitle = document.querySelector('#mountainModal .modal-title');
    if (modalTitle) modalTitle.textContent = '산 기록 추가';
}

window.openAddModal = function() {
    resetMountainForm();
    modal.style.display = 'block';
    document.getElementById('mDate').valueAsDate = new Date();
};

window.closeAddModal = function() {
    modal.style.display = 'none';
    resetMountainForm();
};

window.openEditMountain = function(id) {
    const mountain = getMountainById(id);
    if (!mountain || !canManageMountain(mountain)) return;

    modal.style.display = 'block';
    document.getElementById('mName').maxLength = 15;
    document.getElementById('mEditId').value = mountain.id;
    document.getElementById('mName').value = mountain.name || '';
    document.getElementById('mLat').value = mountain.lat || '';
    document.getElementById('mLng').value = mountain.lng || '';
    document.getElementById('mAlt').value = mountain.alt || '';
    document.getElementById('mDate').value = mountain.date || '';
    document.getElementById('mMembers').value = mountain.members || '';
    document.getElementById('mDesc').value = mountain.desc || '';
    document.getElementById('mPhoto').value = '';
    pendingMountainPhotos = Array.isArray(mountain.photos) ? mountain.photos.slice(0, 4) : (mountain.photo ? [mountain.photo] : []);
    renderMountainPhotoPreviews();
    const submitButton = document.querySelector('#mountainForm .btn-submit');
    if (submitButton) submitButton.textContent = '기록 수정하기';
    const modalTitle = document.querySelector('#mountainModal .modal-title');
    if (modalTitle) modalTitle.textContent = '산 기록 수정';
};

const mountainNameInput = document.getElementById('mName');
if (mountainNameInput) mountainNameInput.maxLength = 15;
const mountainStoryTitleInput = document.getElementById('mtTitle');
if (mountainStoryTitleInput) mountainStoryTitleInput.maxLength = 15;

window.deleteMountain = async function(id) {
    const mountain = getMountainById(id);
    if (!mountain || !canManageMountain(mountain)) return;
    if (!confirm('이 산 기록을 삭제하시겠습니까? 삭제하면 되돌릴 수 없습니다.')) return;

    try {
        await deleteMountainOnServer(id);
    } catch (error) {
        alert(error.message || '산 기록 삭제에 실패했습니다.');
        return;
    }

    const updated = getNormalizedMountainsCache()
        .filter((item) => item.id !== id);

    saveMountains(updated);
    map.closePopup();
    renderMarkers();
    renderMountainBoard();
    closeMtDetailModal();
};

document.getElementById('mountainForm').onsubmit = async (e) => {
    e.preventDefault();

    const mountains = getNormalizedMountainsCache();
    const editId = document.getElementById('mEditId').value;
    const currentUser = localStorage.getItem('current_user') || 'admin';
    const titleValue = document.getElementById('mName').value.trim().slice(0, 15);
    const photoValues = pendingMountainPhotos.slice(0, 4);

    const nextRecord = normalizeMountainRecord({
        id: editId || `m_${Date.now()}`,
        title: titleValue,
        name: titleValue,
        lat: document.getElementById('mLat').value,
        lng: document.getElementById('mLng').value,
        alt: document.getElementById('mAlt').value,
        date: document.getElementById('mDate').value,
        members: document.getElementById('mMembers').value,
        desc: document.getElementById('mDesc').value,
        photos: photoValues,
        photo: photoValues[0] || '',
        author: editId ? (getMountainById(editId)?.author || currentUser) : currentUser,
        createdAt: editId ? (getMountainById(editId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });

    let savedRecord;
    try {
        savedRecord = editId
            ? await updateMountainOnServer(editId, nextRecord)
            : await createMountainOnServer(nextRecord);
    } catch (error) {
        alert(error.message || '산 기록 저장에 실패했습니다.');
        return;
    }

    const nextMountains = editId
        ? mountains.map((mountain) => mountain.id === editId ? savedRecord : mountain)
        : [savedRecord, ...mountains];

    saveMountains(nextMountains);
    renderMarkers();
    renderMountainBoard();
    closeAddModal();

    map.flyTo([parseFloat(savedRecord.lat), parseFloat(savedRecord.lng)], 11, {
        animate: true,
        duration: 1.5
    });
};

function renderMountainBoard() {
    const grid = document.getElementById('mountainBoardGrid');
    if (!grid) return;

      const mountains = getNormalizedMountainsCache()
          .sort((a, b) => new Date(b.updatedAt || b.createdAt || b.date) - new Date(a.updatedAt || a.createdAt || a.date));

    if (!mountains.length) {
        grid.innerHTML = '<div class="mountain-board-empty">첫 산행기를 남겨보세요.</div>';
        return;
    }

      grid.innerHTML = mountains.map((mountain) => `
          <article class="mountain-post-card" onclick="openMtDetailById('${escapeHtml(mountain.id)}')">
              ${mountain.photo ? `<img src="${escapeHtml(mountain.photo)}" class="mountain-post-thumb" alt="${escapeHtml(mountain.title)}">` : '<div class="mountain-post-thumb-placeholder">△</div>'}
              <div class="mountain-post-body">
                  <h3>${escapeHtml(mountain.title)}</h3>
                  <div class="mountain-post-meta">
                      <span>${escapeHtml(getMountainAuthorName(mountain.author))}</span>
                    <span>${escapeHtml(formatMountainDate(mountain.date))}</span>
                </div>
            </div>
        </article>
    `).join('');
}

window.openMtDetailById = function(id) {
    const mountain = getMountainById(id);
    if (!mountain) return;
    openMtDetail(mountain);
};

window.openMtDetail = function(mountain) {
    const modalElement = document.getElementById('mtDetailModal');
    const content = document.getElementById('mtDetailContent');
    const editable = canManageMountain(mountain);

    const photoGallery = (mountain.photos || []).length
        ? `
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-bottom:20px;">
                ${(mountain.photos || []).map((photo) => `<img src="${escapeHtml(photo)}" class="mountain-detail-image" alt="${escapeHtml(mountain.title)}" style="max-height:260px; border-radius:18px;">`).join('')}
            </div>
        `
        : '';

    modalElement.style.display = 'block';
    content.innerHTML = `
        <h2>${escapeHtml(mountain.title)}</h2>
        <div class="mountain-detail-meta">
            <span>작성자 ${escapeHtml(getMountainAuthorName(mountain.author))}</span>
            <span>${escapeHtml(formatMountainDate(mountain.date))}</span>
            <span>고도 ${escapeHtml(mountain.alt)}</span>
        </div>
        ${photoGallery}
        <div class="mountain-detail-body">${escapeHtml(mountain.desc).replace(/\n/g, '<br>')}</div>
        <div class="mountain-detail-meta" style="margin-top:20px;">
            <span>위치 ${escapeHtml(String(mountain.lat))}, ${escapeHtml(String(mountain.lng))}</span>
            <span>참여 인원 ${escapeHtml(mountain.members)}</span>
        </div>
        ${editable ? `
            <div style="display:flex; gap:12px; flex-wrap:wrap; margin-top:28px;">
                <button onclick="openEditMountain('${escapeHtml(mountain.id)}'); closeMtDetailModal();" class="detail-delete-btn" type="button">수정하기</button>
                <button onclick="deleteMountain('${escapeHtml(mountain.id)}')" class="detail-delete-btn" type="button">삭제하기</button>
            </div>
        ` : ''}
    `;
};

window.closeMtDetailModal = function() {
    document.getElementById('mtDetailModal').style.display = 'none';
};

window.addEventListener('load', () => {
    if (Array.isArray(mountainsCache) && mountainsCache.length) {
        renderMountainBoard();
    }
});


