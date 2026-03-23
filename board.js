// board.js
(function () {
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

    let boardPosts = safeParse(localStorage.getItem('board_posts') || '[]', []);
    const currentUser = localStorage.getItem('current_user') || '익명';
    let currentOpenPostId = null;
    let likedPosts = safeParse(localStorage.getItem('liked_posts') || '[]', []);
    let dislikedPosts = safeParse(localStorage.getItem('disliked_posts') || '[]', []);
    const defaultBoardCategories = ['카테고리 1', '카테고리 2', '카테고리 3', '카테고리 4'];
    let boardCategories = defaultBoardCategories.slice();
    let activeCategory = boardCategories[0];
    let currentSearchType = 'title';
    let currentSearchQuery = '';
    let currentSortType = 'latest';
    let currentEditingPostId = null;
    let selectedEditorImage = null;
    let isResizingImage = false;
    let resizeStartX = 0;
    let resizeStartWidth = 0;

    function getUsersDb() {
        return safeParse(localStorage.getItem('users_db') || '{}', {});
    }

    function loadBoardCategories() {
        const saved = safeParse(localStorage.getItem('board_categories') || '[]', []);
        if (Array.isArray(saved) && saved.length === 4) {
            const normalized = saved.map((item, index) => String(item || '').trim() || defaultBoardCategories[index]);
            boardCategories = normalized;
        } else {
            boardCategories = defaultBoardCategories.slice();
        }
        if (!boardCategories.includes(activeCategory)) {
            activeCategory = boardCategories[0];
        }
    }

    function fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
            reader.readAsDataURL(file);
        });
    }

    async function uploadInlineImage(file) {
        const dataUrl = await fileToDataUrl(file);
        const response = await fetch(getApiUrl('/api/uploads/image'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                folder: 'board-inline',
                fileName: file.name || '',
                dataUrl
            })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.success === false || !result.url) {
            throw new Error(result.message || '이미지 업로드에 실패했습니다.');
        }
        return result.url;
    }

    function normalizeStoredUploadUrl(value) {
        const rawValue = String(value || '').trim();
        if (!rawValue) return '';
        const localhostMatch = rawValue.match(/^https?:\/\/localhost:\d+(\/uploads\/.+)$/i);
        if (localhostMatch) return localhostMatch[1];
        return rawValue;
    }

    function normalizeContentForStorage(html) {
        return String(html || '').replace(/https?:\/\/localhost:\d+(\/uploads\/[^"' )]+)/gi, '$1');
    }

    function resolveContentForDisplay(html) {
        const content = String(html || '');
        if (window.location.protocol !== 'file:') return content;
        return content.replace(/(["'])\/uploads\/([^"')\s>]+)\1/gi, (match, quote, pathValue) => {
            return `${quote}${getApiBase()}/uploads/${pathValue}${quote}`;
        });
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function savePosts() {
        localStorage.setItem('board_posts', JSON.stringify(boardPosts));
    }

    function normalizePost(post) {
        return {
            ...post,
            category: boardCategories.includes(post && post.category) ? post.category : boardCategories[0],
            comments: Array.isArray(post && post.comments) ? post.comments : []
        };
    }

    function clearSelectedEditorImage() {
        if (selectedEditorImage) {
            selectedEditorImage.style.outline = '';
            selectedEditorImage.style.boxShadow = '';
        }
        selectedEditorImage = null;
    }

    function selectEditorImage(img) {
        clearSelectedEditorImage();
        selectedEditorImage = img;
        selectedEditorImage.style.outline = '2px solid #60a5fa';
        selectedEditorImage.style.boxShadow = '0 0 0 4px rgba(96, 165, 250, 0.2)';
    }

    function bindEditorImages() {
        const editor = document.getElementById('richEditor');
        if (!editor) return;

        editor.querySelectorAll('img').forEach((img) => {
            img.style.cursor = 'pointer';
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.onclick = (event) => {
                event.preventDefault();
                event.stopPropagation();
                selectEditorImage(img);
            };
            img.onmousemove = (event) => {
                const rect = img.getBoundingClientRect();
                const isNearCorner = rect.right - event.clientX < 18 && rect.bottom - event.clientY < 18;
                img.style.cursor = isNearCorner ? 'nwse-resize' : 'pointer';
            };
            img.onmousedown = (event) => {
                const rect = img.getBoundingClientRect();
                const isNearCorner = rect.right - event.clientX < 18 && rect.bottom - event.clientY < 18;
                if (!isNearCorner) return;
                event.preventDefault();
                event.stopPropagation();
                selectEditorImage(img);
                isResizingImage = true;
                resizeStartX = event.clientX;
                resizeStartWidth = img.getBoundingClientRect().width;
                document.body.style.userSelect = 'none';
            };
        });
    }

    async function insertInlineImage(file) {
        const imageUrl = normalizeStoredUploadUrl(await uploadInlineImage(file));
        const displayUrl = imageUrl.startsWith('/uploads/') && window.location.protocol === 'file:'
            ? `${getApiBase()}${imageUrl}`
            : imageUrl;
        const html = `<img src="${displayUrl}" data-upload-path="${imageUrl}" style="max-width:100%; width:min(100%, 420px); height:auto; border-radius:8px; margin:15px 0; display:block;">`;
        document.execCommand('insertHTML', false, html);
        bindEditorImages();
    }

    function extractYoutubeVideoId(value) {
        const url = String(value || '').trim();
        if (!url) return '';

        const patterns = [
            /(?:youtube\.com\/watch\?v=)([A-Za-z0-9_-]{11})/i,
            /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/i,
            /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/i,
            /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/i
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) return match[1];
        }

        return '';
    }

    function createYoutubeEmbedHtml(videoId, sourceUrl) {
        const safeId = escapeHtml(videoId);
        const safeUrl = escapeHtml(sourceUrl);
        return `
            <div class="youtube-embed" contenteditable="false">
                <iframe src="https://www.youtube.com/embed/${safeId}" title="유튜브 미리보기" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>
                <span class="youtube-caption">유튜브 링크 미리보기 · ${safeUrl}</span>
            </div>
            <p><br></p>
        `;
    }

    function insertYoutubeEmbedFromUrl(url) {
        const videoId = extractYoutubeVideoId(url);
        if (!videoId) return false;
        document.execCommand('insertHTML', false, createYoutubeEmbedHtml(videoId, url));
        return true;
    }

    function ensureSeedPosts() {
        if (boardPosts.length > 0) return;
        boardPosts = [
            {
                id: 2,
                title: '주말에 본 영화 어땠나요?',
                content: '결말이 꽤 인상적이었어요. 다른 분들 생각도 궁금합니다.',
                category: '카테고리 2',
                author: 'admin',
                date: '2024-03-20 14:30',
                views: 42,
                likes: 5,
                dislikes: 0,
                comments: [
                    { author: '철수', text: '저는 중반부 전개가 좋았어요.', date: '2024-03-20 15:00' }
                ]
            },
            {
                id: 1,
                title: '가입 인사 드립니다!',
                content: '초대 코드를 받아서 가입했습니다. 잘 부탁드려요.',
                category: '카테고리 1',
                author: '철수',
                date: '2024-03-19 09:15',
                views: 105,
                likes: 12,
                dislikes: 0,
                comments: [
                    { author: 'admin', text: '환영합니다. 편하게 이용해 주세요.', date: '2024-03-19 09:20' }
                ]
            }
        ];
        boardPosts = boardPosts.map(normalizePost);
        savePosts();
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const [datePart, timePart] = String(dateString).split(' ');
        const today = new Date().toISOString().split('T')[0];
        if (datePart === today && timePart) return timePart;
        return (datePart || '').replace(/-/g, '.');
    }

    function getCommentCount(post) {
        if (!Array.isArray(post.comments)) return 0;
        return post.comments.reduce((sum, comment) => sum + 1 + (comment.reply ? 1 : 0), 0);
    }

    function getAuthorDisplayName(authorId) {
        const users = getUsersDb();
        const author = (authorId || '').trim();
        return users[author] && users[author].nickname ? users[author].nickname : author || '익명';
    }

    function getSortedPosts() {
        return [...boardPosts].map(normalizePost).sort((a, b) => {
            if (a.isNotice && !b.isNotice) return -1;
            if (!a.isNotice && b.isNotice) return 1;
            if (currentSortType === 'likes') {
                return (b.likes || 0) - (a.likes || 0) || (b.id || 0) - (a.id || 0);
            }
            if (currentSortType === 'views') {
                return (b.views || 0) - (a.views || 0) || (b.id || 0) - (a.id || 0);
            }
            return (b.id || 0) - (a.id || 0);
        });
    }

    function getCategoryPosts(category = activeCategory) {
        return getSortedPosts().filter((post) => post.category === category);
    }

    function updateCategoryChrome() {
        const title = document.getElementById('boardCategoryTitle');
        const description = document.getElementById('boardCategoryDescription');
        const searchTypeSelect = document.getElementById('searchType');
        const sortTypeSelect = document.getElementById('sortType');
        if (title) title.innerText = activeCategory;
        if (description) description.innerText = `${activeCategory}에 올라온 공지와 최신 글을 한 흐름으로 보고, 검색과 글쓰기까지 바로 이어갈 수 있게 구성했습니다.`;
        if (searchTypeSelect) searchTypeSelect.value = currentSearchType;
        if (sortTypeSelect) sortTypeSelect.value = currentSortType;
        document.querySelectorAll('#boardCategoryMenu .board-menu-item').forEach((button) => {
            button.classList.toggle('active', button.getAttribute('data-category') === activeCategory);
        });
    }

    function renderCategoryControls() {
        const menu = document.getElementById('boardCategoryMenu');
        const select = document.getElementById('postCategory');
        if (menu) {
            menu.innerHTML = boardCategories.map((category, index) => `
                <button type="button" class="board-menu-item${index === 0 && category === activeCategory ? ' active' : ''}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>
            `).join('');
        }
        if (select) {
            select.innerHTML = boardCategories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
            select.value = activeCategory;
        }
        updateCategoryChrome();
    }

    function truncateText(value, maxLength) {
        const text = String(value || '').replace(/<[^>]*>/g, '').trim();
        if (text.length <= maxLength) return text;
        return `${text.slice(0, maxLength)}...`;
    }

    function renderSidebarSummary() {
        const totalCount = document.getElementById('boardTotalCount');
        const noticeCount = document.getElementById('boardNoticeCount');
        const noticeList = document.getElementById('boardNoticeList');
        const popularList = document.getElementById('boardPopularList');
        const sortedPosts = getCategoryPosts();
        const notices = sortedPosts.filter((post) => post.isNotice).slice(0, 5);
        const popularPosts = [...sortedPosts]
            .filter((post) => !post.isNotice)
            .sort((a, b) => {
                const scoreA = (a.likes || 0) * 10 + (a.views || 0);
                const scoreB = (b.likes || 0) * 10 + (b.views || 0);
                return scoreB - scoreA;
            })
            .slice(0, 5);

        if (totalCount) totalCount.innerText = String(sortedPosts.length);
        if (noticeCount) noticeCount.innerText = String(sortedPosts.filter((post) => post.isNotice).length);

        function fillList(container, posts, emptyText, metaBuilder) {
            if (!container) return;
            if (!posts.length) {
                container.innerHTML = `<div class="sidebar-empty">${emptyText}</div>`;
                return;
            }

            container.innerHTML = posts.map((post) => `
                <a href="javascript:void(0)" class="sidebar-link-item" onclick="openPostDetail(${post.id})">
                    <strong>${escapeHtml(truncateText(post.title, 34))}</strong>
                    <span>${metaBuilder(post)}</span>
                </a>
            `).join('');
        }

        fillList(
            noticeList,
            notices,
            '등록된 공지가 없습니다.',
            (post) => `조회 ${post.views || 0} · 추천 ${post.likes || 0}`
        );

        fillList(
            popularList,
            popularPosts,
            '아직 인기 글이 없습니다.',
            (post) => `${escapeHtml(getAuthorDisplayName(post.author))} · 조회 ${post.views || 0}`
        );
    }

    function renderBoard(filterType = '', filterQuery = '') {
        const tbody = document.getElementById('boardBody');
        const pinnedNotice = document.getElementById('boardPinnedNotice');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (filterType) currentSearchType = filterType;
        if (typeof filterQuery === 'string') currentSearchQuery = filterQuery;
        updateCategoryChrome();

        let sortedList = getCategoryPosts();
        const query = String(currentSearchQuery || '').trim().toLowerCase();

        if (query) {
            sortedList = sortedList.filter((post) => {
                const title = String(post.title || '').toLowerCase();
                const content = String(post.content || '').toLowerCase();
                const author = String(post.author || '').toLowerCase();
                if (currentSearchType === 'author') return author.includes(query);
                return title.includes(query) || content.includes(query);
            });
        }

        if (!sortedList.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="padding:60px; color:rgba(47,31,24,0.52); font-size:1.05rem;">작성된 게시글이 없습니다.</td></tr>';
            if (pinnedNotice) pinnedNotice.style.display = 'none';
            renderSidebarSummary();
            return;
        }

        const leadNotice = sortedList.find((post) => post.isNotice);
        if (pinnedNotice) {
            if (leadNotice) {
                pinnedNotice.style.display = 'block';
                pinnedNotice.innerHTML = `
                    <button type="button" onclick="openPostDetail(${leadNotice.id})">
                        <span class="board-pinned-label">고정 공지</span>
                        <strong class="board-pinned-title">${escapeHtml(leadNotice.title || '제목 없음')}</strong>
                        <span class="board-pinned-meta">${escapeHtml(getAuthorDisplayName(leadNotice.author))} · 조회 ${leadNotice.views || 0} · 추천 ${leadNotice.likes || 0}</span>
                    </button>
                `;
            } else {
                pinnedNotice.style.display = 'none';
                pinnedNotice.innerHTML = '';
            }
        }

        sortedList.forEach((post) => {
            const comments = getCommentCount(post);
            const commentBadge = comments > 0 ? `<span class="comment-count">[${comments}]</span>` : '';
            const hotTag = post.isNotice
                ? '<span class="hot-tag" style="background:rgba(245, 158, 11, 0.2); color:#fbbf24; border:1px solid rgba(245, 158, 11, 0.4);">공지</span> '
                : ((post.likes || 0) >= 10 ? '<span class="hot-tag">인기</span> ' : '');
            const imageIcon = post.image ? ' <span style="font-size:0.8rem;">🖼️</span>' : '';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${post.id}</td>
                <td class="title-cell" onclick="openPostDetail(${post.id})">${hotTag}${post.title || '제목 없음'} ${imageIcon} ${commentBadge}</td>
                <td><span class="post-category-badge">${escapeHtml(post.category || boardCategories[0])}</span></td>
                <td>${getAuthorDisplayName(post.author)}</td>
                <td>${formatDate(post.date)}</td>
                <td>${post.views || 0}</td>
                <td>${post.likes || 0}</td>
            `;
            tbody.appendChild(tr);
        });

        renderSidebarSummary();
    }

    window.searchPosts = function () {
        currentSortType = document.getElementById('sortType').value;
        currentSearchType = document.getElementById('searchType').value;
        currentSearchQuery = document.getElementById('searchInput').value;
        renderBoard(currentSearchType, currentSearchQuery);
    };

    const writeModal = document.getElementById('writeModal');
    window.openWriteModal = function () {
        if (!writeModal) return;
        writeModal.style.display = 'block';
        clearSelectedEditorImage();
        document.getElementById('postTitle').focus();
        const noticeToggle = document.getElementById('noticeToggleContainer');
        if (noticeToggle) {
            noticeToggle.style.display = currentUser === 'admin' ? 'flex' : 'none';
            document.getElementById('isNotice').checked = false;
        }
        const categorySelect = document.getElementById('postCategory');
        if (categorySelect) categorySelect.value = activeCategory;
        currentEditingPostId = null;
        const submitButton = document.querySelector('#writeForm .board-submit');
        if (submitButton) submitButton.innerText = '등록하기';
        document.getElementById('richEditor').innerHTML = '<p><br></p>';
    };

    window.closeWriteModal = function () {
        if (!writeModal) return;
        writeModal.style.display = 'none';
        document.getElementById('writeForm').reset();
        document.getElementById('richEditor').innerHTML = '<p><br></p>';
        clearSelectedEditorImage();
        currentEditingPostId = null;
        const submitButton = document.querySelector('#writeForm .board-submit');
        if (submitButton) submitButton.innerText = '등록하기';
    };

    window.execCommand = function (command, value = null) {
        document.execCommand(command, false, value);
        document.getElementById('richEditor').focus();
    };

    window.insertImageTrigger = function () {
        document.getElementById('inlineImageInput').click();
    };

    window.insertYoutubePrompt = function () {
        const url = prompt('유튜브 링크를 입력해 주세요.');
        if (!url) return;
        const inserted = insertYoutubeEmbedFromUrl(url);
        if (!inserted) {
            alert('유효한 유튜브 링크를 입력해 주세요.');
        }
    };

    window.handleInlineImage = async function (input) {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];

        try {
            await insertInlineImage(file);
        } catch (error) {
            alert('이미지를 첨부하지 못했습니다. 다시 시도해 주세요.');
        } finally {
            input.value = '';
        }
    };

    document.getElementById('writeForm').onsubmit = function (event) {
        event.preventDefault();
        const title = document.getElementById('postTitle').value.trim();
        const content = normalizeContentForStorage(document.getElementById('richEditor').innerHTML.trim());
        const isNotice = currentUser === 'admin' && document.getElementById('isNotice').checked;
        const category = document.getElementById('postCategory').value || activeCategory;
        if (!title || !content || content === '<p><br></p>') {
            alert('제목과 내용을 입력해 주세요.');
            return;
        }
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
        if (currentEditingPostId) {
            const targetPost = boardPosts.find((post) => post.id === currentEditingPostId);
            if (!targetPost) return;
            if (targetPost.author !== currentUser && currentUser !== 'admin') {
                alert('수정 권한이 없습니다.');
                return;
            }
            targetPost.title = title;
            targetPost.content = content;
            targetPost.category = category;
            targetPost.isNotice = isNotice;
            targetPost.isRich = true;
        } else {
            const newId = boardPosts.length ? Math.max(...boardPosts.map((post) => post.id || 0)) + 1 : 1;
            boardPosts.push({ id: newId, title, content, category, author: currentUser, date: dateStr, views: 0, likes: 0, dislikes: 0, comments: [], isNotice, isRich: true });
        }
        savePosts();
        activeCategory = category;
        renderBoard(currentSearchType, currentSearchQuery);
        closeWriteModal();
    };

    const boardListView = document.getElementById('boardListView');
    const boardDetailView = document.getElementById('boardDetailView');

    function getCurrentVisiblePosts() {
        let sortedList = getCategoryPosts(activeCategory);
        const query = String(currentSearchQuery || '').trim().toLowerCase();
        if (!query) return sortedList;
        return sortedList.filter((post) => {
            const title = String(post.title || '').toLowerCase();
            const content = String(post.content || '').toLowerCase();
            const author = String(post.author || '').toLowerCase();
            if (currentSearchType === 'author') return author.includes(query);
            return title.includes(query) || content.includes(query);
        });
    }

    function updateDetailNavigation(postId) {
        const visiblePosts = getCurrentVisiblePosts();
        const currentIndex = visiblePosts.findIndex((post) => post.id === postId);
        const prevPost = currentIndex >= 0 ? visiblePosts[currentIndex - 1] : null;
        const nextPost = currentIndex >= 0 ? visiblePosts[currentIndex + 1] : null;
        const prevButton = document.getElementById('prevPostButton');
        const nextButton = document.getElementById('nextPostButton');

        if (prevButton) {
            prevButton.disabled = !prevPost;
            prevButton.innerText = prevPost ? `이전글 · ${truncateText(prevPost.title, 22)}` : '이전글 없음';
        }
        if (nextButton) {
            nextButton.disabled = !nextPost;
            nextButton.innerText = nextPost ? `다음글 · ${truncateText(nextPost.title, 22)}` : '다음글 없음';
        }
    }

    function renderRelatedPosts(postId) {
        const relatedPostsList = document.getElementById('relatedPostsList');
        if (!relatedPostsList) return;

        const relatedPosts = getCategoryPosts(activeCategory)
            .filter((post) => post.id !== postId)
            .slice(0, 5);

        if (!relatedPosts.length) {
            relatedPostsList.innerHTML = '<div class="sidebar-empty">같은 카테고리의 다른 게시글이 아직 없습니다.</div>';
            return;
        }

        relatedPostsList.innerHTML = relatedPosts.map((post) => `
            <a href="javascript:void(0)" class="related-post-link" onclick="openPostDetail(${post.id})">
                <strong>${escapeHtml(truncateText(post.title, 42))}</strong>
                <span>${escapeHtml(getAuthorDisplayName(post.author))} · ${formatDate(post.date)}</span>
            </a>
        `).join('');
    }

    function updateVoteUI(post) {
        document.getElementById('btnLikeCount').innerText = post.likes || 0;
        document.getElementById('detailLikes').innerText = post.likes || 0;
        document.getElementById('btnDislikeCount').innerText = post.dislikes || 0;
        document.getElementById('detailDislikes').innerText = post.dislikes || 0;
        document.getElementById('likeBtn').classList.toggle('active', likedPosts.includes(post.id));
        document.getElementById('dislikeBtn').classList.toggle('active', dislikedPosts.includes(post.id));
    }

    function renderComments(post) {
        const commentsList = document.getElementById('commentsList');
        const count = getCommentCount(post);
        document.getElementById('commentCount').innerText = count;
        const detailCommentMeta = document.getElementById('detailCommentMeta');
        if (detailCommentMeta) detailCommentMeta.innerText = `댓글 ${count}`;
        commentsList.innerHTML = '';
        if (!Array.isArray(post.comments) || !post.comments.length) {
            commentsList.innerHTML = '<div style="color:#94a3b8; padding:12px 0;">첫 댓글을 남겨보세요.</div>';
            return;
        }
        post.comments.forEach((comment, index) => {
            const authorName = escapeHtml(getAuthorDisplayName(comment.author));
            const commentText = escapeHtml(comment.text || '');
            const commentDate = escapeHtml(comment.date || '');
            const hasReply = Boolean(comment.reply && comment.reply.text);
            const canReply = currentUser === 'admin' && !hasReply;
            const item = document.createElement('div');
            item.className = 'comment-item';
            item.innerHTML = `
                <div class="comment-meta">
                    <div class="c-author">${authorName}</div>
                    <div>${commentDate}</div>
                    ${canReply ? `<button type="button" class="btn-reply" onclick="toggleReplyForm(${index})">답글 달기</button>` : ''}
                </div>
                <div class="comment-body">${commentText}</div>
                ${canReply ? `
                    <form class="reply-form-container" id="replyForm-${index}" onsubmit="submitReply(event, ${index})">
                        <input type="text" id="replyInput-${index}" placeholder="관리자 답글을 입력해 주세요." autocomplete="off" maxlength="300">
                        <button type="submit">등록</button>
                    </form>
                ` : ''}
            `;
            commentsList.appendChild(item);
            if (comment.reply) {
                const reply = document.createElement('div');
                reply.className = 'comment-reply';
                reply.innerHTML = `
                    <div class="comment-meta">
                        <div class="c-author author-marker">관리자 답글</div>
                        <div>${escapeHtml(comment.reply.date || '')}</div>
                    </div>
                    <div class="comment-body">${escapeHtml(comment.reply.text || '')}</div>
                `;
                commentsList.appendChild(reply);
            }
        });
    }

    window.toggleReplyForm = function (index) {
        const targetForm = document.getElementById(`replyForm-${index}`);
        if (!targetForm) return;

        document.querySelectorAll('.reply-form-container').forEach((form) => {
            if (form !== targetForm) {
                form.style.display = 'none';
            }
        });

        targetForm.style.display = targetForm.style.display === 'flex' ? 'none' : 'flex';
        if (targetForm.style.display === 'flex') {
            const input = document.getElementById(`replyInput-${index}`);
            if (input) input.focus();
        }
    };

    window.submitReply = function (event, index) {
        event.preventDefault();
        if (currentUser !== 'admin' || !currentOpenPostId) return;

        const input = document.getElementById(`replyInput-${index}`);
        const text = input ? input.value.trim() : '';
        if (!text) return;

        const post = boardPosts.find((item) => item.id === currentOpenPostId);
        if (!post || !Array.isArray(post.comments) || !post.comments[index]) return;

        post.comments[index].reply = {
            author: currentUser,
            text,
            date: new Date().toLocaleString('ko-KR')
        };

        if (typeof window.createUserNotification === 'function' && post.comments[index].author && post.comments[index].author !== currentUser) {
            window.createUserNotification(post.comments[index].author, {
                type: 'reply',
                title: '관리자 답글이 도착했습니다.',
                message: `"${post.title || '게시글'}" 댓글에 관리자 답글이 등록되었습니다.`,
                link: `board.html?id=${post.id}`
            });
        }

        savePosts();
        renderComments(post);
        renderBoard(currentSearchType, currentSearchQuery);
        updateDetailNavigation(post.id);
    };

    window.openPostDetail = function (id) {
        const post = boardPosts.find((item) => item.id === id);
        if (!post || !boardDetailView) return;
        post.views = (post.views || 0) + 1;
        savePosts();
        currentOpenPostId = id;
        activeCategory = post.category || boardCategories[0];
        document.getElementById('detailTitle').innerText = post.title || '제목 없음';
        document.getElementById('detailCategory').innerText = post.category || boardCategories[0];
        document.getElementById('detailPostType').innerText = post.isNotice ? '공지글' : '일반글';
        document.getElementById('detailCommentMeta').innerText = `댓글 ${getCommentCount(post)}`;
        document.getElementById('detailAuthor').innerText = getAuthorDisplayName(post.author);
        document.getElementById('detailTime').innerText = formatDate(post.date);
        document.getElementById('detailViews').innerText = post.views || 0;
        document.getElementById('detailContent').innerHTML = post.isRich
            ? resolveContentForDisplay(post.content || '')
            : String(post.content || '').replace(/\n/g, '<br>');
        document.getElementById('authorActions').style.display = post.author === currentUser || currentUser === 'admin' ? 'flex' : 'none';
        updateVoteUI(post);
        renderComments(post);
        renderBoard(currentSearchType, currentSearchQuery);
        updateDetailNavigation(post.id);
        renderRelatedPosts(post.id);
        if (boardListView) boardListView.classList.add('is-hidden');
        boardDetailView.style.display = 'block';
        boardDetailView.classList.add('is-active');
        boardDetailView.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    window.closeDetailModal = function () {
        if (boardListView) boardListView.classList.remove('is-hidden');
        if (boardDetailView) {
            boardDetailView.style.display = 'none';
            boardDetailView.classList.remove('is-active');
        }
        currentOpenPostId = null;
        document.getElementById('commentForm').reset();
    };

    window.openAdjacentPost = function (direction) {
        if (!currentOpenPostId) return;
        const visiblePosts = getCurrentVisiblePosts();
        const currentIndex = visiblePosts.findIndex((post) => post.id === currentOpenPostId);
        if (currentIndex < 0) return;
        const nextIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
        const targetPost = visiblePosts[nextIndex];
        if (!targetPost) return;
        openPostDetail(targetPost.id);
    };

    window.editCurrentPost = function () {
        if (!currentOpenPostId) return;
        const post = boardPosts.find((item) => item.id === currentOpenPostId);
        if (!post) return;
        if (post.author !== currentUser && currentUser !== 'admin') return;

        openWriteModal();
        currentEditingPostId = post.id;
        document.getElementById('postTitle').value = post.title || '';
        document.getElementById('richEditor').innerHTML = resolveContentForDisplay(post.content || '<p><br></p>');
        document.getElementById('postCategory').value = post.category || activeCategory;
        if (currentUser === 'admin') {
            document.getElementById('isNotice').checked = Boolean(post.isNotice);
        }
        const submitButton = document.querySelector('#writeForm .board-submit');
        if (submitButton) submitButton.innerText = '수정 저장';
        bindEditorImages();
    };

    function persistVotes() {
        localStorage.setItem('liked_posts', JSON.stringify(likedPosts));
        localStorage.setItem('disliked_posts', JSON.stringify(dislikedPosts));
        savePosts();
        renderBoard(currentSearchType, currentSearchQuery);
        updateDetailNavigation(currentOpenPostId);
    }

    window.toggleLike = function () {
        if (!currentOpenPostId) return;
        const post = boardPosts.find((item) => item.id === currentOpenPostId);
        if (!post) return;
        if (likedPosts.includes(post.id)) {
            post.likes = Math.max(0, (post.likes || 0) - 1);
            likedPosts = likedPosts.filter((id) => id !== post.id);
        } else {
            post.likes = (post.likes || 0) + 1;
            likedPosts.push(post.id);
            if (dislikedPosts.includes(post.id)) {
                post.dislikes = Math.max(0, (post.dislikes || 0) - 1);
                dislikedPosts = dislikedPosts.filter((id) => id !== post.id);
            }
        }
        updateVoteUI(post);
        persistVotes();
    };

    window.toggleDislike = function () {
        if (!currentOpenPostId) return;
        const post = boardPosts.find((item) => item.id === currentOpenPostId);
        if (!post) return;
        if (dislikedPosts.includes(post.id)) {
            post.dislikes = Math.max(0, (post.dislikes || 0) - 1);
            dislikedPosts = dislikedPosts.filter((id) => id !== post.id);
        } else {
            post.dislikes = (post.dislikes || 0) + 1;
            dislikedPosts.push(post.id);
            if (likedPosts.includes(post.id)) {
                post.likes = Math.max(0, (post.likes || 0) - 1);
                likedPosts = likedPosts.filter((id) => id !== post.id);
            }
        }
        updateVoteUI(post);
        persistVotes();
    };

    document.getElementById('commentForm').onsubmit = function (event) {
        event.preventDefault();
        if (!currentOpenPostId) return;
        const input = document.getElementById('commentInput');
        const text = input.value.trim();
        if (!text) return;
        const post = boardPosts.find((item) => item.id === currentOpenPostId);
        if (!post) return;
        post.comments = Array.isArray(post.comments) ? post.comments : [];
        post.comments.push({ author: currentUser, text, date: new Date().toLocaleString('ko-KR') });
        if (typeof window.createUserNotification === 'function' && post.author && post.author !== currentUser) {
            window.createUserNotification(post.author, {
                type: 'comment',
                title: '내 글에 새 댓글이 달렸습니다.',
                message: `"${post.title || '게시글'}"에 ${getAuthorDisplayName(currentUser)}님이 댓글을 남겼습니다.`,
                link: `board.html?id=${post.id}`
            });
        }
        savePosts();
        renderComments(post);
        input.value = '';
        renderBoard(currentSearchType, currentSearchQuery);
        updateDetailNavigation(post.id);
    };

    document.getElementById('richEditor').addEventListener('click', (event) => {
        if (event.target.tagName !== 'IMG') {
            clearSelectedEditorImage();
        }
    });

    document.getElementById('richEditor').addEventListener('dragover', (event) => {
        if ([...event.dataTransfer.items].some((item) => item.type.startsWith('image/'))) {
            event.preventDefault();
        }
    });

    document.getElementById('richEditor').addEventListener('drop', async (event) => {
        const imageFile = [...event.dataTransfer.files].find((file) => file.type.startsWith('image/'));
        if (!imageFile) return;
        event.preventDefault();
        document.getElementById('richEditor').focus();
        try {
            await insertInlineImage(imageFile);
        } catch (error) {
            alert('이미지를 첨부하지 못했습니다. 다시 시도해 주세요.');
        }
    });

    document.getElementById('richEditor').addEventListener('paste', (event) => {
        const pastedText = event.clipboardData && event.clipboardData.getData
            ? event.clipboardData.getData('text/plain').trim()
            : '';

        if (!pastedText) return;
        if (!extractYoutubeVideoId(pastedText)) return;

        event.preventDefault();
        insertYoutubeEmbedFromUrl(pastedText);
    });

    document.addEventListener('mousemove', (event) => {
        if (!isResizingImage || !selectedEditorImage) return;
        const deltaX = event.clientX - resizeStartX;
        const editorWidth = document.getElementById('richEditor').clientWidth;
        const nextWidth = Math.max(120, Math.min(editorWidth, resizeStartWidth + deltaX));
        selectedEditorImage.style.width = `${nextWidth}px`;
        selectedEditorImage.style.maxWidth = '100%';
        selectedEditorImage.style.height = 'auto';
    });

    document.addEventListener('mouseup', () => {
        if (!isResizingImage) return;
        isResizingImage = false;
        document.body.style.userSelect = '';
    });

    window.deleteCurrentPost = function () {
        if (!currentOpenPostId) return;
        const post = boardPosts.find((item) => item.id === currentOpenPostId);
        if (!post) return;
        if (post.author !== currentUser && currentUser !== 'admin') return;
        if (!confirm('이 게시글을 삭제하시겠습니까?')) return;
        boardPosts = boardPosts.filter((item) => item.id !== currentOpenPostId);
        savePosts();
        closeDetailModal();
        renderBoard(currentSearchType, currentSearchQuery);
    };

    document.getElementById('boardCategoryMenu').addEventListener('click', (event) => {
        const target = event.target.closest('[data-category]');
        if (!target) return;
        activeCategory = target.getAttribute('data-category') || boardCategories[0];
        currentOpenPostId = null;
        currentSearchQuery = '';
        document.getElementById('searchInput').value = '';
        if (boardListView) boardListView.classList.remove('is-hidden');
        if (boardDetailView) {
            boardDetailView.style.display = 'none';
            boardDetailView.classList.remove('is-active');
        }
        renderBoard(currentSearchType, currentSearchQuery);
    });

    document.getElementById('searchInput').addEventListener('keydown', (event) => {
        if (event.key === 'Enter') searchPosts();
    });

    document.getElementById('sortType').addEventListener('change', (event) => {
        currentSortType = event.target.value || 'latest';
        renderBoard(currentSearchType, currentSearchQuery);
    });

    ensureSeedPosts();
    loadBoardCategories();
    boardPosts = boardPosts.map(normalizePost);
    savePosts();
    renderCategoryControls();
    renderBoard(currentSearchType, currentSearchQuery);
    bindEditorImages();

    const params = new URLSearchParams(window.location.search);
    const postId = Number(params.get('id'));
    if (postId) {
        setTimeout(() => openPostDetail(postId), 0);
    }
})();
