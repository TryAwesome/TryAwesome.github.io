const backgroundImages = [
  'background/1.jpg',
  'background/2.jpg',
  'background/3.jpg',
  'background/4.jpg',
  'background/5.jpg',
];

const escapeResumeHtml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatResumeInline = (input) => {
  let text = escapeResumeHtml(input);

  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, rawLabel, rawUrl) => {
    const url = rawUrl.trim();
    const isSafe = /^https?:\/\//i.test(url) || /^mailto:/i.test(url);
    if (!isSafe) return rawLabel.trim();

    const label = escapeResumeHtml(rawLabel.trim());
    const attrs = /^https?:\/\//i.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a class="resume__link" href="${url}"${attrs}>${label}</a>`;
  });

  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/`(.+?)`/g, '<code>$1</code>');
  return text;
};

const renderResumeMarkdown = (markdown) => {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const parts = [];
  let currentSection = null;
  let currentSectionSlug = null;
  let inList = false;

  const append = (markup) => {
    if (currentSection) {
      currentSection.push(markup);
    } else {
      parts.push(markup);
    }
  };

  const closeList = () => {
    if (!inList) return;
    append('</ul>');
    inList = false;
  };

  const closeSection = () => {
    if (!currentSection) return;
    const slugClass = currentSectionSlug ? ` resume__section--${currentSectionSlug}` : '';
    parts.push(`<section class="resume__section${slugClass}">${currentSection.join('')}</section>`);
    currentSection = null;
    currentSectionSlug = null;
  };

  const openSection = (headingMarkup, slug) => {
    closeList();
    closeSection();
    currentSection = [headingMarkup];
    currentSectionSlug = slug || null;
  };

  lines.forEach((originalLine) => {
    const line = originalLine.trimEnd();
    if (!line.trim()) {
      closeList();
      return;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const rawContent = heading[2].trim();
      const content = formatResumeInline(rawContent);
      if (level === 1) {
        closeList();
        closeSection();
        parts.push(`<h1 class="resume__heading resume__heading--name">${content}</h1>`);
        return;
      }

      if (level === 2) {
        const slug = rawContent
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-');
        openSection(`<h2 class="resume__heading resume__heading--section">${content}</h2>`, slug);
        return;
      }

      closeList();
      const markup = `<h3 class="resume__heading resume__heading--item">${content}</h3>`;
      if (!currentSection) {
        currentSection = [markup];
      } else {
        currentSection.push(markup);
      }
      return;
    }

    const listItem = line.match(/^-\s+(.*)$/);
    if (listItem) {
      if (!inList) {
        append('<ul class="resume__list">');
        inList = true;
      }
      append(`<li class="resume__list-item">${formatResumeInline(listItem[1].trim())}</li>`);
      return;
    }

    append(`<p class="resume__paragraph">${formatResumeInline(line)}</p>`);
  });

  closeList();
  closeSection();
  return parts.join('');
};

const initResumeLoader = () => {
  const container = document.querySelector('.resume[data-resume-source]');
  if (!container) return;

  const source = container.dataset.resumeSource;
  if (!source) return;

  const setState = (markup, hasError = false) => {
    container.innerHTML = markup;
    container.classList.toggle('resume--error', hasError);
  };

  fetch(source, { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load resume: ${response.status}`);
      }
      return response.text();
    })
    .then((markdown) => {
      const rendered = renderResumeMarkdown(markdown);
      if (rendered) {
        setState(rendered, false);
      } else {
        setState('<p class="resume__status">Resume is currently unavailable.</p>', false);
      }
    })
    .catch(() => {
      setState('<p class="resume__status resume__status--error">Unable to load resume. Please refresh to try again.</p>', true);
    });
};

const photographyShowcaseImages = [
  { src: 'photography/show/1.JPG', alt: 'Photography showcase image 1' },
  { src: 'photography/show/2.JPG', alt: 'Photography showcase image 2' },
  { src: 'photography/show/3.jpg', alt: 'Photography showcase image 3' },
  { src: 'photography/show/4.jpg', alt: 'Photography showcase image 4' },
  { src: 'photography/show/5.JPG', alt: 'Photography showcase image 5' },
  { src: 'photography/show/6.JPG', alt: 'Photography showcase image 6' },
  { src: 'photography/show/7.JPG', alt: 'Photography showcase image 7' },
  { src: 'photography/show/8.JPG', alt: 'Photography showcase image 8' },
  { src: 'photography/show/9.JPG', alt: 'Photography showcase image 9' },
  { src: 'photography/show/10.jpg', alt: 'Photography showcase image 10' },
  { src: 'photography/show/11.png', alt: 'Photography showcase image 11' },
];

const rotationIntervalMs = 40000;
let rotationStarted = false;
let rotationTimer;

const preloadBackgroundImages = () =>
  Promise.all(
    backgroundImages.map(
      (src) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = resolve;
          img.src = src;
        })
    )
  );

const createLayer = () => {
  const layer = document.createElement('div');
  layer.className = 'background-layer';
  document.body.prepend(layer);
  return layer;
};

const startBackgroundRotation = () => {
  if (!backgroundImages.length || rotationStarted) return;
  rotationStarted = true;

  const layers = [createLayer(), createLayer()];
  let visibleLayer = 0;
  let index = 0;

  const swapToImage = (imgIndex) => {
    const nextLayer = layers[1 - visibleLayer];
    const previousLayerIndex = visibleLayer;
    const img = new Image();
    let swapped = false;

    const applySwap = () => {
      if (swapped) return;
      swapped = true;
      nextLayer.style.backgroundImage = `url("${backgroundImages[imgIndex]}")`;
      requestAnimationFrame(() => {
        nextLayer.classList.add('active');
        setTimeout(() => {
          layers[previousLayerIndex].classList.remove('active');
        }, 320);
        visibleLayer = 1 - visibleLayer;
      });
    };

    img.onload = applySwap;
    img.onerror = applySwap;
    img.src = backgroundImages[imgIndex];
    if (img.complete) {
      applySwap();
    }
  };

  layers[visibleLayer].style.backgroundImage = `url("${backgroundImages[index]}")`;
  layers[visibleLayer].classList.add('active');

  rotationTimer = window.setInterval(() => {
    index = (index + 1) % backgroundImages.length;
    swapToImage(index);
  }, rotationIntervalMs);
};

const loadPlaylistManifest = async () => {
  try {
    const response = await fetch('music/playlist.json', {
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const payload = await response.json();
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.tracks)) return payload.tracks;
  } catch (error) {
    console.warn('Failed to load playlist.json, falling back to defaults.', error);
  }
  return null;
};

const initMusicWidget = () => {
  const widget = document.querySelector('.music-widget');
  const audio = document.getElementById('music-player');
  if (!widget || !audio) return null;

  const toggleButton = widget.querySelector('.music-widget__toggle');
  const panel = widget.querySelector('.music-widget__panel');
  const playButton = panel.querySelector('[data-action="play"]');
  const nextButton = panel.querySelector('[data-action="next"]');
  const prevButton = panel.querySelector('[data-action="prev"]');
  const progressTrack = panel.querySelector('.music-widget__progress-track');
  const progressFill = panel.querySelector('.music-widget__progress-fill');
  const currentTimeEl = panel.querySelector('.music-widget__time--current');
  const totalTimeEl = panel.querySelector('.music-widget__time--total');
  const playlistContainer = panel.querySelector('.music-widget__playlist');
  const titleEl = panel.querySelector('.music-widget__title');
  const artistEl = panel.querySelector('.music-widget__artist');

  const defaultPlaylist = [];

  let playlist = Array.isArray(window.HAOSEN_MUSIC_PLAYLIST) && window.HAOSEN_MUSIC_PLAYLIST.length
    ? window.HAOSEN_MUSIC_PLAYLIST.slice()
    : defaultPlaylist.slice();

  let currentIndex = 0;

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return '0:00';
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const secs = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${secs}`;
  };

  const updatePlayButton = () => {
    playButton.textContent = audio.paused ? '▶' : '⏸';
    playButton.setAttribute('aria-label', audio.paused ? 'Play' : 'Pause');
  };

  const setPanelVisibility = (expanded) => {
    widget.classList.toggle('music-widget--open', expanded);
    toggleButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    panel.setAttribute('aria-hidden', expanded ? 'false' : 'true');
  };

  const updateTrackInfo = () => {
    const track = playlist[currentIndex];
    if (!track) return;
    titleEl.textContent = track.title ?? `Track ${currentIndex + 1}`;
    artistEl.textContent = track.artist ?? '—';
  };

  const highlightActiveTrack = () => {
    Array.from(playlistContainer.children).forEach((item, idx) => {
      item.classList.toggle('music-widget__track--active', idx === currentIndex);
    });
  };

  const renderPlaylist = () => {
    playlistContainer.innerHTML = '';

    if (!playlist.length) {
      const placeholder = document.createElement('li');
      placeholder.className = 'music-widget__track';
      placeholder.textContent = 'No tracks available yet';
      placeholder.setAttribute('role', 'status');
      placeholder.style.cursor = 'default';
      playlistContainer.appendChild(placeholder);
      return;
    }

    playlist.forEach((track, index) => {
      const li = document.createElement('li');
      li.className = 'music-widget__track';
      li.innerHTML = `
        <span class="music-widget__track-title">${track.title ?? `Track ${index + 1}`}</span>
        <span class="music-widget__track-artist">${track.artist ?? '—'}</span>
      `;
      li.tabIndex = 0;
      li.addEventListener('click', () => loadTrack(index, true));
      li.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          loadTrack(index, true);
        }
      });
      playlistContainer.appendChild(li);
    });

    highlightActiveTrack();
  };

  const loadTrack = (index, autoplay = false) => {
    if (!playlist.length) return;
    currentIndex = (index + playlist.length) % playlist.length;
    const track = playlist[currentIndex];
    if (!track?.src) return;
    audio.src = track.src;
    updateTrackInfo();
    highlightActiveTrack();
    updatePlayButton();
    if (autoplay) {
      audio.play().catch(() => {
        updatePlayButton();
      });
    }
  };

  const togglePanel = () => {
    setPanelVisibility(!widget.classList.contains('music-widget--open'));
  };

  const playNext = () => loadTrack(currentIndex + 1, true);
  const playPrev = () => loadTrack(currentIndex - 1, true);

  const updateProgress = () => {
    const { currentTime, duration } = audio;
    progressFill.style.width = duration ? `${(currentTime / duration) * 100}%` : '0%';
    currentTimeEl.textContent = formatTime(currentTime);
    totalTimeEl.textContent = formatTime(duration);
  };

  const seek = (event) => {
    const rect = progressTrack.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    if (Number.isFinite(audio.duration)) {
      audio.currentTime = ratio * audio.duration;
    }
  };

  toggleButton.addEventListener('click', togglePanel);
  playButton.addEventListener('click', () => {
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  });
  nextButton.addEventListener('click', playNext);
  prevButton.addEventListener('click', playPrev);
  progressTrack.addEventListener('click', seek);

  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('loadedmetadata', updateProgress);
  audio.addEventListener('play', updatePlayButton);
  audio.addEventListener('pause', updatePlayButton);
  audio.addEventListener('ended', playNext);

  const handleOutsideClick = (event) => {
    if (!widget.classList.contains('music-widget--open')) return;
    if (widget.contains(event.target)) return;
    setPanelVisibility(false);
  };

  document.addEventListener('click', handleOutsideClick);

  renderPlaylist();
  loadTrack(0, false);

  const attemptAutoStart = () => {
    if (!playlist.length) return;
    if (audio.paused) {
      audio.play().catch(() => {
        toggleButton.classList.add('music-widget__toggle--attention');
        setTimeout(() => toggleButton.classList.remove('music-widget__toggle--attention'), 2400);
      });
    }
  };

  return {
    attemptAutoStart,
    setPlaylist: (tracks, autoplay = false) => {
      if (!Array.isArray(tracks)) return false;
      const filtered = tracks.filter((track) => track && typeof track.src === 'string');
      if (!filtered.length) return false;
      playlist = filtered;
      currentIndex = 0;
      renderPlaylist();
      loadTrack(currentIndex, autoplay);
      return true;
    },
    hasTracks: () => playlist.length > 0,
  };
};


const initialiseNavIndicators = () => {
  const navs = Array.from(document.querySelectorAll('.site-nav'));

  navs.forEach((nav) => {
    const indicator = nav.querySelector('.nav-indicator');
    const links = Array.from(nav.querySelectorAll('.nav-link'));
    if (!indicator || !links.length) return;

    let defaultTarget = nav.querySelector('.nav-link.active') || links[0];

    const moveIndicator = (element) => {
      if (!element) return;
      const left = element.offsetLeft;
      const width = element.offsetWidth;
      indicator.style.width = `${width}px`;
      indicator.style.transform = `translateX(${left}px)`;
      indicator.style.opacity = '1';
    };

    const resetIndicator = () => {
      requestAnimationFrame(() => moveIndicator(defaultTarget));
    };

    resetIndicator();

    links.forEach((link) => {
      link.addEventListener('mouseenter', () => moveIndicator(link));
      link.addEventListener('focus', () => moveIndicator(link));
      link.addEventListener('click', () => {
        links.forEach((item) => item.classList.remove('active'));
        link.classList.add('active');
        defaultTarget = link;
        moveIndicator(link);
      });
    });

    nav.addEventListener('mouseleave', resetIndicator);
    nav.addEventListener('focusout', () => {
      if (!nav.contains(document.activeElement)) {
        resetIndicator();
      }
    });

    window.addEventListener('resize', resetIndicator);
  });
};


const initPhotographyExplore = () => {
  const exploreButton = document.querySelector('.photography-explore-trigger__button');
  if (!exploreButton) return;

  const targetSelector = exploreButton.dataset.target;
  const target = targetSelector ? document.querySelector(targetSelector) : null;

  exploreButton.addEventListener('click', () => {
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
};


const initPhotographyGallery = () => {
  const items = document.querySelectorAll('.photography-gallery__item img');
  if (!items.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target;
        requestAnimationFrame(() => {
          img.classList.add('is-visible');
        });
        obs.unobserve(img);
      }
    });
  }, {
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.1,
  });

  items.forEach((img, index) => {
    img.dataset.galleryIndex = String(index);
    const baseDelay = index * 0.05;
    img.style.transitionDelay = `${baseDelay}s`;
    observer.observe(img);
  });
};

const initPhotographyShowcase = () => {
  if (!document.body.classList.contains('photography-page')) return;

  const container = document.querySelector('.photography-showcase');
  if (!container) return;

  const viewport = container.querySelector('.photography-showcase__viewport');

  if (!viewport) return;

  const slides = photographyShowcaseImages.map((item, index) => {
    const figure = document.createElement('figure');
    figure.className = 'photography-showcase__slide';
    if (index === 0) figure.classList.add('photography-showcase__slide--active');

    const img = document.createElement('img');
    img.src = item.src;
    img.alt = item.alt;
    img.decoding = 'async';
    img.loading = index === 0 ? 'eager' : 'lazy';

    figure.appendChild(img);
    viewport.appendChild(figure);
    return figure;
  });

  if (!slides.length) {
    return;
  }

  let index = 0;

  const reduceMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const prefersReducedMotion = Boolean(reduceMotionQuery?.matches);

  if (prefersReducedMotion || slides.length < 2) {
    return;
  }

  const interval = 6200;
  let timerId;

  const setActive = (nextIndex) => {
    if (nextIndex === index) return;
    slides[index]?.classList.remove('photography-showcase__slide--active');
    slides[nextIndex]?.classList.add('photography-showcase__slide--active');
    index = nextIndex;
  };

  const scheduleNext = () => {
    clearTimer();
    timerId = window.setTimeout(() => {
      const nextIndex = (index + 1) % slides.length;
      setActive(nextIndex);
      scheduleNext();
    }, interval);
  };

  const clearTimer = () => {
    if (timerId) {
      window.clearTimeout(timerId);
      timerId = undefined;
    }
  };

  scheduleNext();

  const handleVisibility = () => {
    if (document.visibilityState === 'hidden') {
      clearTimer();
    } else {
      clearTimer();
      scheduleNext();
    }
  };

  document.addEventListener('visibilitychange', handleVisibility);

  let motionListener;
  if (reduceMotionQuery) {
    motionListener = (event) => {
      if (event.matches) {
        clearTimer();
      } else if (!timerId) {
        scheduleNext();
      }
    };

    if (typeof reduceMotionQuery.addEventListener === 'function') {
      reduceMotionQuery.addEventListener('change', motionListener);
    } else if (typeof reduceMotionQuery.addListener === 'function') {
      reduceMotionQuery.addListener(motionListener);
    }
  }

  const teardown = () => {
    clearTimer();
    document.removeEventListener('visibilitychange', handleVisibility);
    if (reduceMotionQuery && motionListener) {
      if (typeof reduceMotionQuery.removeEventListener === 'function') {
        reduceMotionQuery.removeEventListener('change', motionListener);
      } else if (typeof reduceMotionQuery.removeListener === 'function') {
        reduceMotionQuery.removeListener(motionListener);
      }
    }
    window.removeEventListener('beforeunload', teardown);
  };

  window.addEventListener('beforeunload', teardown);
};

const initPhotographyHeroReveal = () => {
  if (!document.body.classList.contains('photography-page')) return;

  const hero = document.querySelector('.photography-hero');
  if (!hero) return;

  hero.classList.add('photography-hero--animate');

  const reveal = () => {
    hero.classList.add('photography-hero--revealed');
  };

  window.requestAnimationFrame(() => {
    window.setTimeout(reveal, 80);
  });
};

const initHomeFooter = () => {
  const emailButton = document.querySelector('.home-footer__icon--email');
  const label = document.querySelector('.home-footer__label');
  if (!emailButton || !label) return;

  const email = emailButton.dataset.email;
  const defaultLabel = label.dataset.defaultLabel || label.textContent?.trim() || 'contact';
  let resetTimer;

  const resetState = () => {
    emailButton.classList.remove('home-footer__icon--copied', 'home-footer__icon--error');
    label.textContent = defaultLabel;
    label.classList.remove('home-footer__label--success', 'home-footer__label--error');
  };

  const showState = (text, iconClass, labelClass) => {
    window.clearTimeout(resetTimer);
    emailButton.classList.remove('home-footer__icon--copied', 'home-footer__icon--error');
    label.classList.remove('home-footer__label--success', 'home-footer__label--error');
    label.textContent = text;
    if (iconClass) emailButton.classList.add(iconClass);
    if (labelClass) label.classList.add(labelClass);
    resetTimer = window.setTimeout(resetState, 2200);
  };

  const fallbackCopy = () => {
    const textarea = document.createElement('textarea');
    textarea.value = email;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  };

  const copyEmail = async () => {
    if (!email) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(email);
      } else if (!fallbackCopy()) {
        throw new Error('Clipboard unavailable');
      }
      showState('email copied', 'home-footer__icon--copied', 'home-footer__label--success');
    } catch (error) {
      console.warn('Copy email failed', error);
      showState('copy failed', 'home-footer__icon--error', 'home-footer__label--error');
    }
  };

  emailButton.addEventListener('click', copyEmail);
  resetState();
};

const initMobileUsageNotice = () => {
  const { body } = document;
  if (!body) return;

  const shouldWarn = body.classList.contains('home-page') || body.classList.contains('photography-page');
  if (!shouldWarn) return;

  const mediaQuery = window.matchMedia('(max-width: 820px)');

  const getNotice = () => document.querySelector('.mobile-notice');

  const removeNotice = () => {
    const notice = getNotice();
    if (!notice) return;
    notice.remove();
    document.documentElement.classList.remove('mobile-notice-active');
  };

  const renderNotice = () => {
    if (!mediaQuery.matches || getNotice()) return;

    const overlay = document.createElement('div');
    overlay.className = 'mobile-notice';
    overlay.innerHTML = `
      <div class="mobile-notice__card" role="dialog" aria-live="polite" aria-label="Mobile viewing notice">
        <p class="mobile-notice__title">最佳浏览体验提示</p>
        <p class="mobile-notice__message">本站在电脑端浏览效果最佳。手机端可能无法完整呈现动画与布局。</p>
        <button type="button" class="mobile-notice__button" data-mobile-notice-dismiss>继续浏览</button>
      </div>
    `;

    const dismissBtn = overlay.querySelector('[data-mobile-notice-dismiss]');
    dismissBtn?.addEventListener('click', () => {
      removeNotice();
    });

    document.documentElement.classList.add('mobile-notice-active');
    document.body.appendChild(overlay);
  };

  const handleChange = () => {
    if (mediaQuery.matches) {
      renderNotice();
    } else {
      removeNotice();
    }
  };

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleChange);
  } else if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(handleChange);
  }

  if (mediaQuery.matches) {
    renderNotice();
  }
};

const runGreeting = () => {
  const container = document.getElementById('home-greeting');
  if (!container) return Promise.resolve();

  const textEl = container.querySelector('.typewriter__text');
  if (!textEl) return Promise.resolve();

  const typingDelay = 80;
  const fadeBetween = 360;
  const finalHold = 2600;
  const fadeOutDuration = 820;
  const initialPause = 620;

  const sequences = [
    {
      className: 'typewriter__text--intro',
      lines: ['Hello', "Welcome to Haosen's space"],
      pauseAfter: 1200,
      measureWidth: false,
      linePause: 620,
    },
    {
      className: 'typewriter__text--story',
      lines: [
        'I am Haosen Shi,',
        'drawn to spaces where silence meets code',
        'and',
        'where images carry more weight than words.',
        'My studies in computer science converge with my passion for',
        'music, photography, and philosophy',
        '—fields that, to me, all share a language of',
        'structure, rhythm, and resonance.',
      ],
      pauseAfter: 3200,
      linePause: 720,
    },
  ];

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const typeLine = (element, text) =>
    new Promise((resolve) => {
      if (!text) {
        element.textContent = '';
        resolve();
        return;
      }

      let index = 0;

      const step = () => {
        index += 1;
        element.textContent = text.slice(0, index);
        if (index < text.length) {
          setTimeout(step, typingDelay);
        } else {
          resolve();
        }
      };

      step();
    });

  const typeSequence = async (sequence) => {
    textEl.className = `typewriter__text ${sequence.className ?? ''}`.trim();
    textEl.style.width = '';
    textEl.innerHTML = '';

    if (sequence.measureWidth) {
      const longest = sequence.lines.reduce((acc, line) => (line.length > acc.length ? line : acc), '');
      const measure = document.createElement('span');
      measure.className = 'typewriter__line';
      measure.style.position = 'absolute';
      measure.style.visibility = 'hidden';
      measure.style.whiteSpace = 'normal';
      measure.textContent = longest || '\u00A0';
      textEl.appendChild(measure);
      const width = measure.getBoundingClientRect().width;
      textEl.removeChild(measure);
      if (Number.isFinite(width) && width > 0) {
        textEl.style.width = `${Math.ceil(width)}px`;
      }
    }

    const lineElements = sequence.lines.map(() => {
      const span = document.createElement('span');
      span.className = 'typewriter__line';
      span.innerHTML = '&nbsp;';
      textEl.appendChild(span);
      return span;
    });

    for (let i = 0; i < sequence.lines.length; i += 1) {
      await typeLine(lineElements[i], sequence.lines[i]);
      if (sequence.linePause && i < sequence.lines.length - 1) {
        await delay(sequence.linePause);
      }
    }

    if (sequence.pauseAfter) {
      await delay(sequence.pauseAfter);
    }
  };

  return new Promise((resolve) => {
    (async () => {
      if (initialPause > 0) {
        await delay(initialPause);
      }

      for (let i = 0; i < sequences.length; i += 1) {
        await typeSequence(sequences[i]);

        if (i < sequences.length - 1) {
          textEl.classList.add('typewriter__text--hidden');
          await delay(fadeBetween);
          textEl.innerHTML = '';
          textEl.classList.remove('typewriter__text--hidden');
          await delay(120);
        }
      }

      await delay(finalHold);
      textEl.classList.add('typewriter__text--hidden');
      container.classList.add('typewriter--hidden');
      setTimeout(() => {
        container.remove();
        resolve();
      }, fadeOutDuration);
    })();
  });
};

document.addEventListener('DOMContentLoaded', () => {
  preloadBackgroundImages().finally(() => {
    startBackgroundRotation();
  });
  initialiseNavIndicators();
  initMobileUsageNotice();
  initResumeLoader();
  initPhotographyHeroReveal();
  initPhotographyShowcase();
  initPhotographyExplore();
  initPhotographyGallery();
  initHomeFooter();
  const musicWidget = initMusicWidget();
  const greetingPromise = runGreeting();

  if (musicWidget) {
    let playlistReady = Promise.resolve(musicWidget.hasTracks());

    playlistReady = loadPlaylistManifest().then((tracks) => {
      if (tracks && tracks.length) {
        return musicWidget.setPlaylist(tracks, false);
      }
      return musicWidget.hasTracks();
    });

    Promise.all([greetingPromise, playlistReady]).then(([, hasTracks]) => {
      if (hasTracks) {
        musicWidget.attemptAutoStart();
      }
    });
  }
});
