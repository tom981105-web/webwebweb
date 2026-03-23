// mountain.js
let map;
let markers = [];

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
    let mtns = localStorage.getItem('mountains_db');
    if (!mtns) {
        localStorage.setItem('mountains_db', JSON.stringify(initialMountains));
        return initialMountains;
    }
    return JSON.parse(mtns);
}

document.addEventListener('DOMContentLoaded', () => {
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
});

function renderMarkers() {
    // clear existing markers
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    const mountains = getMountains();

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
                    ${localStorage.getItem('current_user') === 'admin' ? 
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
    if (event.target == modal) {
        closeAddModal();
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
const preview = document.getElementById('photoPreview');
const dropText = document.getElementById('dropText');

photoInput.addEventListener('input', (e) => {
    if(e.target.value) {
        preview.src = e.target.value;
        preview.style.display = 'block';
        dropText.style.display = 'none';
    } else {
        preview.src = '';
        preview.style.display = 'none';
        dropText.style.display = 'block';
    }
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const file = e.dataTransfer.files[0];
        const reader = new FileReader();
        reader.onload = function(evt) {
            photoInput.value = ''; // clear text URL if dragging photo
            preview.src = evt.target.result; // Base64 encoding
            preview.style.display = 'block';
            dropText.style.display = 'none';
        }
        reader.readAsDataURL(file);
    }
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
function normalizeLocalImageUrl(url) {
    const value = String(url || '').trim();
    if (!value) return '';
    if (value.startsWith('data:image/')) return value;
    if (/^https?:\/\/localhost:\d+\/uploads\//i.test(value)) return '';
    if (/^\/uploads\//i.test(value)) return '';
    return value;
}

let mountainPosts = JSON.parse(localStorage.getItem('mountain_posts') || '[]').map((post) => ({
    ...post,
    image: normalizeLocalImageUrl(post.image)
}));

window.openMountainWriteModal = function() {
    document.getElementById('mountainWriteModal').style.display = 'block';
};

window.closeMountainWriteModal = function() {
    document.getElementById('mountainWriteModal').style.display = 'none';
    document.getElementById('mountainWriteForm').reset();
    document.getElementById('mtImagePreview').style.display = 'none';
    document.getElementById('mtImageDropText').style.display = 'block';
    window.uploadedMtImage = '';
};

const mtDropZone = document.getElementById('mtImageDropZone');
const mtFileInput = document.getElementById('mtImageFile');
const mtPreview = document.getElementById('mtImagePreview');
const mtDropText = document.getElementById('mtImageDropText');
window.uploadedMtImage = '';

if(mtDropZone) {
    mtDropZone.onclick = () => mtFileInput.click();
        mtDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            mtDropZone.classList.add('dragover');
        });
        mtDropZone.addEventListener('dragleave', () => {
            mtDropZone.classList.remove('dragover');
        });
        mtDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            mtDropZone.classList.remove('dragover');
            if(e.dataTransfer.files.length) handleMtImage(e.dataTransfer.files[0]);
        });
    mtFileInput.addEventListener('change', (e) => {
        if(e.target.files.length) handleMtImage(e.target.files[0]);
    });
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('file-read-failed'));
        reader.readAsDataURL(file);
    });
}

async function handleMtImage(file) {
    if (!file || !file.type.startsWith('image/')) return;

    try {
        const imageUrl = await fileToDataUrl(file);
        window.uploadedMtImage = imageUrl;
        mtPreview.innerHTML = `<img src="${imageUrl}" style="max-height:200px; border-radius:8px;">`;
        mtPreview.style.display = 'block';
        mtDropText.style.display = 'none';
    } catch (e) {
        alert('이미지를 불러오지 못했습니다.');
    }
}

document.getElementById('mountainWriteForm').onsubmit = (e) => {
    e.preventDefault();
    const title = document.getElementById('mtTitle').value;
    const content = document.getElementById('mtContent').value;
    const author = localStorage.getItem('current_user') || '?듬챸';
    
    const newPost = {
        id: Date.now(),
        title,
        content,
        author,
        image: window.uploadedMtImage,
        date: new Date().toLocaleString('ko-KR')
    };
    
    mountainPosts.unshift(newPost);
    localStorage.setItem('mountain_posts', JSON.stringify(mountainPosts));
    renderMountainBoard();
    closeMountainWriteModal();
};

function renderMountainBoard() {
    const grid = document.getElementById('mountainBoardGrid');
    if(!grid) return;
    grid.innerHTML = '';
    
    if(mountainPosts.length === 0) {
        grid.innerHTML = '<div class="mountain-board-empty">첫 산행기를 남겨보세요.</div>';
        return;
    }
    
    mountainPosts.forEach(post => {
        const users = JSON.parse(localStorage.getItem('users_db') || '{}');
        const authorId = post.author ? post.author.trim() : '';
        const authorDisplayName = (users[authorId] && users[authorId].nickname) ? users[authorId].nickname : authorId;

        const card = document.createElement('div');
        card.className = 'mountain-post-card';
        card.onclick = () => openMtDetail(post);
        
        card.innerHTML = `
            ${post.image ? `<img src="${post.image}" class="mountain-post-thumb" alt="${post.title}">` : '<div class="mountain-post-thumb-placeholder">△</div>'}
            <div class="mountain-post-body">
                <h3>${post.title}</h3>
                <div class="mountain-post-meta">
                    <span>${authorDisplayName}</span>
                    <span>${post.date.split(' ')[0]}</span>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

window.openMtDetail = function(post) {
    const modal = document.getElementById('mtDetailModal');
    const content = document.getElementById('mtDetailContent');
    modal.style.display = 'block';
    
    const users = JSON.parse(localStorage.getItem('users_db') || '{}');
    const authorDisplayName = (users[post.author] && users[post.author].nickname) ? users[post.author].nickname : post.author;

    content.innerHTML = `
        <h2>${post.title}</h2>
        <div class="mountain-detail-meta">
            <span>작성자 ${authorDisplayName}</span>
            <span>${post.date}</span>
        </div>
        ${post.image ? `<img src="${post.image}" class="mountain-detail-image" alt="${post.title}">` : ''}
        <div class="mountain-detail-body">${post.content}</div>
        
        ${(localStorage.getItem('current_user') === post.author || localStorage.getItem('current_user') === 'admin') ? 
            `<button onclick="deleteMtPost(${post.id})" class="detail-delete-btn" style="margin-top:30px;">삭제하기</button>` : ''}
    `;
};

window.closeMtDetailModal = function() {
    document.getElementById('mtDetailModal').style.display = 'none';
};

window.deleteMtPost = function(id) {
    if(confirm('???고뻾湲?湲곕줉????젣?섏떆寃좎뒿?덇퉴?')) {
        mountainPosts = mountainPosts.filter(p => p.id !== id);
        localStorage.setItem('mountain_posts', JSON.stringify(mountainPosts));
        renderMountainBoard();
        closeMtDetailModal();
    }
};

// ?섏씠吏 濡쒕뱶 ??寃뚯떆???뚮뜑留?window.addEventListener('load', renderMountainBoard);


