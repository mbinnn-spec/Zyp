/**
 * VDown Extractor Engine
 * High-speed & reliable media extraction for TikTok, Instagram (Reels, Photos, Carousel, Stories), and Universal
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core';

/**
 * Universal safe HTTP fetch helper
 * Handles native Android via CapacitorHttp (bypassing CORS) and Web development via Vite proxy
 */
async function safeHttp(url, options = {}) {
  const isNative = typeof Capacitor !== 'undefined' && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform();

  if (isNative) {
    const method = (options.method || 'GET').toUpperCase();
    const headers = options.headers || {};
    let data = options.body;
    if (data instanceof URLSearchParams) {
      data = data.toString();
    }

    const res = await CapacitorHttp.request({
      url,
      method,
      headers,
      data
    });

    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      text: async () => (typeof res.data === 'string' ? res.data : JSON.stringify(res.data)),
      json: async () => (typeof res.data === 'object' && res.data !== null ? res.data : JSON.parse(res.data))
    };
  }

  // Web environment: route proxies to avoid CORS
  let targetUrl = url;
  if (url.startsWith('https://saveinsta.to')) {
    targetUrl = url.replace('https://saveinsta.to', '/saveinsta-proxy');
  } else if (url.startsWith('https://loader.to')) {
    targetUrl = url.replace('https://loader.to', '/loader-proxy');
  } else if (url.startsWith('https://lto2.affadaffa.com')) {
    targetUrl = url.replace('https://lto2.affadaffa.com', '/loader-progress-proxy');
  }

  return await fetch(targetUrl, options);
}

/**
 * Detect platform from URL
 */
export function detectPlatform(url) {
  if (!url || typeof url !== 'string') return null;
  const lower = url.toLowerCase();
  if (lower.includes('tiktok.com') || lower.includes('douyin.com')) return 'tiktok';
  if (lower.includes('instagram.com') || lower.includes('instagr.am')) return 'instagram';
  if (
    lower.includes('terabox.com') ||
    lower.includes('teraboxapp.com') ||
    lower.includes('terabox.app') ||
    lower.includes('1024tera.com') ||
    lower.includes('1024terabox.com') ||
    lower.includes('terafileshare.com') ||
    lower.includes('terasharelink.com') ||
    lower.includes('mirrobox.com') ||
    lower.includes('nephobox.com') ||
    lower.includes('4funbox.com') ||
    lower.includes('momerybox.com') ||
    lower.includes('freeterabox.com') ||
    lower.includes('teraboxshare.com') ||
    lower.includes('teraboxlink.com')
  ) {
    return 'terabox';
  }
  if (lower.includes('twitter.com') || lower.includes('x.com')) return 'twitter';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('facebook.com') || lower.includes('fb.watch') || lower.includes('fb.com')) return 'facebook';
  if (lower.includes('pinterest.com') || lower.includes('pin.it')) return 'pinterest';
  return 'universal';
}

/**
 * Clean URL: strip unnecessary tracking query params
 */
export function cleanMediaUrl(rawUrl) {
  try {
    const u = new URL(rawUrl.trim());
    if (u.hostname.includes('instagram.com') || u.hostname.includes('twitter.com') || u.hostname.includes('x.com')) {
      return `${u.origin}${u.pathname}`;
    }
    return rawUrl.trim();
  } catch (e) {
    return rawUrl ? rawUrl.trim() : '';
  }
}

/**
 * Extract TikTok Video (HD No-WM), Audio (MP3), and Photo Slides
 */
export async function extractTikTok(url) {
  try {
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
    const res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json = await res.json();

    if (json.code === 0 && json.data) {
      const d = json.data;
      const isPhotos = Array.isArray(d.images) && d.images.length > 0;
      const formats = [];

      let bestVideoUrl = null;

      if (!isPhotos) {
        // HD Video (No Watermark)
        if (d.hdplay) {
          const fullHd = d.hdplay.startsWith('http') ? d.hdplay : `https://www.tikwm.com${d.hdplay}`;
          bestVideoUrl = fullHd;
          formats.push({
            id: 'hd_no_wm',
            label: 'Video HD 1080p (Tanpa Watermark)',
            badge: 'HD No-WM',
            type: 'video',
            url: fullHd,
            thumb: d.cover,
            size: d.hd_size ? formatBytes(d.hd_size) : null,
            ext: 'mp4',
            recommended: true
          });
        }

        // Standard Video (No Watermark)
        if (d.play) {
          const fullSd = d.play.startsWith('http') ? d.play : `https://www.tikwm.com${d.play}`;
          if (!bestVideoUrl) bestVideoUrl = fullSd;
          formats.push({
            id: 'sd_no_wm',
            label: 'Video Standar (Tanpa Watermark)',
            badge: 'SD MP4',
            type: 'video',
            url: fullSd,
            thumb: d.cover,
            size: d.size ? formatBytes(d.size) : null,
            ext: 'mp4',
            recommended: !d.hdplay
          });
        }

        // Original Watermark
        if (d.wmplay) {
          formats.push({
            id: 'wm',
            label: 'Video Asli (Dengan Watermark)',
            badge: 'Watermark',
            type: 'video',
            url: d.wmplay.startsWith('http') ? d.wmplay : `https://www.tikwm.com${d.wmplay}`,
            thumb: d.cover,
            ext: 'mp4'
          });
        }
      }

      // Audio MP3 (Soundtrack)
      let audioUrl = null;
      let audioTitle = d.music_info?.title || 'Soundtrack TikTok';
      if (d.music) {
        audioUrl = d.music.startsWith('http') ? d.music : `https://www.tikwm.com${d.music}`;
        formats.push({
          id: 'audio_mp3',
          label: `Audio Musik MP3 (${audioTitle})`,
          badge: 'MP3 Musik',
          type: 'audio',
          url: audioUrl,
          ext: 'mp3'
        });
      }

      // HD Thumbnail / Cover
      if (d.cover) {
        formats.push({
          id: 'cover_hd',
          label: 'Gambar Sampul / Cover HD',
          badge: 'Cover HD',
          type: 'image',
          url: d.cover.startsWith('http') ? d.cover : `https://www.tikwm.com${d.cover}`,
          thumb: d.cover,
          ext: 'jpg'
        });
      }

      return {
        success: true,
        platform: 'tiktok',
        title: d.title || 'Video TikTok',
        author: {
          name: d.author?.nickname || 'TikTok Creator',
          username: d.author?.unique_id ? `@${d.author.unique_id}` : '',
          avatar: d.author?.avatar
        },
        thumbnail: d.cover,
        previewVideo: bestVideoUrl,
        audioUrl: audioUrl,
        audioTitle: audioTitle,
        duration: d.duration ? `${d.duration}s` : null,
        isPhotos: isPhotos,
        images: isPhotos ? d.images : [],
        slides: isPhotos ? d.images.map((imgUrl, i) => ({
          index: i + 1,
          type: 'image',
          ext: 'jpg',
          url: imgUrl,
          thumb: imgUrl,
          label: `Foto #${i + 1}`
        })) : [],
        formats
      };
    }

    throw new Error(json.msg || 'Gagal mengekstrak video TikTok. Pastikan link aktif & publik.');
  } catch (err) {
    console.warn('TikWM error:', err);
    throw new Error(err.message || 'Gagal mengekstrak media TikTok.');
  }
}

/**
 * Extract Instagram Reels, Photos, Carousel, and Stories via SaveInsta Engine
 */
export async function extractInstagram(url) {
  const cleanUrl = cleanMediaUrl(url);

  try {
    // Step 1: Get dynamic k_token & k_exp
    const homeRes = await safeHttp('https://saveinsta.to/en1', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    });

    if (!homeRes.ok) {
      throw new Error(`Gagal menghubungi server ekstraktor Instagram (${homeRes.status})`);
    }

    const homeHtml = await homeRes.text();
    const tokenMatch = homeHtml.match(/k_token\s*=\s*"([^"]+)"/);
    const expMatch = homeHtml.match(/k_exp\s*=\s*"([^"]+)"/);

    if (!tokenMatch || !expMatch) {
      throw new Error('Gagal mendapatkan sesi verifikasi Instagram.');
    }

    const k_token = tokenMatch[1];
    const k_exp = expMatch[1];

    // Step 2: Request verified cftoken for the target URL
    const verifyRes = await safeHttp('https://saveinsta.to/api/userverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: new URLSearchParams({ url: cleanUrl })
    });

    const verifyJson = await verifyRes.json();
    if (!verifyJson || !verifyJson.token) {
      throw new Error('Verifikasi tautan Instagram tidak berhasil.');
    }

    // Step 3: Fetch media data
    const searchRes = await safeHttp('https://saveinsta.to/api/ajaxSearch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: new URLSearchParams({
        k_exp,
        k_token,
        q: cleanUrl,
        t: 'media',
        lang: 'en',
        v: 'v2',
        cftoken: verifyJson.token
      })
    });

    const searchJson = await searchRes.json();

    if (searchJson.mess && searchJson.mess.toLowerCase().includes('private')) {
      throw new Error('Akun atau konten ini bersifat privat. Pastikan link berasal dari akun publik.');
    }

    if (searchJson.status !== 'ok' || !searchJson.data) {
      throw new Error(searchJson.mess || 'Gagal mengekstrak media Instagram. Pastikan link masih aktif & publik.');
    }

    return parseSaveInstaHtml(searchJson.data, cleanUrl);
  } catch (err) {
    console.error('Instagram extraction error:', err);
    throw new Error(err.message || 'Gagal mengekstrak Instagram. Pastikan link aktif & publik.');
  }
}

/**
 * Parse SaveInsta HTML output into structured VDown media object
 */
function parseSaveInstaHtml(dataHtml, originalUrl) {
  const downloadItems = [...dataHtml.matchAll(/<div class="download-items">([\s\S]*?)<\/div>\s*<\/li>/gi)];
  if (downloadItems.length === 0) {
    throw new Error('Tidak ada media yang ditemukan pada tautan ini.');
  }

  const isStory = originalUrl.includes('/stories/');
  const isSingle = downloadItems.length === 1;
  const formats = [];
  const images = [];
  const slides = [];
  let firstVideoUrl = null;
  let firstThumbUrl = null;

  downloadItems.forEach((itemMatch, index) => {
    const itemHtml = itemMatch[1];
    const thumbMatch = itemHtml.match(/<img[^>]+(?:src|data-src|data-original)="([^">]+)"/i) || itemHtml.match(/<img[^>]+src="([^">]+)"/i);
    let itemThumb = thumbMatch ? thumbMatch[1] : null;
    if (itemThumb && itemThumb.startsWith('//')) {
      itemThumb = 'https:' + itemThumb;
    }
    if (!firstThumbUrl && itemThumb) firstThumbUrl = itemThumb;

    const buttons = [...itemHtml.matchAll(/<a[^>]+href="([^">]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
    const hasVideoBtn = buttons.some(b => b[2].includes('Video') || b[1].includes('.mp4'));
    const isVideo = itemHtml.includes('icon-dlvideo') || hasVideoBtn;

    let slideVideoUrl = null;
    let slideImageUrl = null;
    let slideThumbUrl = itemThumb;

    buttons.forEach(btn => {
      const href = btn[1];
      const btnText = btn[2].replace(/<[^>]+>/g, '').trim();

      // Skip non-download promotional links
      if (href.startsWith('/') || href.includes('play.google.com')) return;

      if (btnText.includes('Thumbnail')) {
        slideThumbUrl = slideThumbUrl || href;
        formats.push({
          id: `ig_thumb_${index + 1}`,
          label: isSingle ? 'Thumbnail / Sampul HD' : `Thumbnail Slide #${index + 1}`,
          badge: 'Cover HD',
          type: 'image',
          url: href,
          thumb: itemThumb || href,
          ext: 'jpg',
          recommended: false
        });
      } else if (btnText.includes('Video') || isVideo) {
        if (!firstVideoUrl) firstVideoUrl = href;
        slideVideoUrl = href;
        formats.push({
          id: `ig_video_${index + 1}`,
          label: isSingle ? (isStory ? 'Video Story HD' : 'Video Reel HD (Kualitas Terbaik)') : `Video Slide #${index + 1} HD`,
          badge: 'HD MP4',
          type: 'video',
          url: href,
          thumb: itemThumb,
          ext: 'mp4',
          recommended: true
        });
      } else {
        // Image / Photo
        images.push(href);
        slideImageUrl = href;
        slideThumbUrl = slideThumbUrl || href;
        formats.push({
          id: `ig_image_${index + 1}`,
          label: isSingle ? (isStory ? 'Foto Story HD' : 'Foto HD Instagram') : `Foto Slide #${index + 1}`,
          badge: 'Foto HD',
          type: 'image',
          url: href,
          thumb: itemThumb || href,
          ext: 'jpg',
          recommended: false
        });
      }
    });

    const primaryUrl = slideVideoUrl || slideImageUrl;
    if (primaryUrl) {
      slides.push({
        index: index + 1,
        type: slideVideoUrl ? 'video' : 'image',
        ext: slideVideoUrl ? 'mp4' : 'jpg',
        url: primaryUrl,
        thumb: slideThumbUrl || primaryUrl,
        label: isStory ? `Story #${index + 1}` : `Slide #${index + 1}`
      });
    }
  });

  // Ensure exactly one recommended item exists
  const hasRecommended = formats.some(f => f.recommended);
  if (!hasRecommended && formats.length > 0) {
    formats[0].recommended = true;
  }

  const isPhotos = images.length > 0;
  let title = 'Instagram Media';
  if (isStory) {
    title = `Instagram Story (${downloadItems.length} Media)`;
  } else if (downloadItems.length > 1) {
    title = `Instagram Post (${downloadItems.length} Slide)`;
  } else if (firstVideoUrl) {
    title = 'Instagram Reel / Video';
  } else {
    title = 'Instagram Foto';
  }

  return {
    success: true,
    platform: 'instagram',
    title: title,
    author: {
      name: 'Instagram Creator',
      username: '@instagram',
      avatar: null
    },
    thumbnail: firstThumbUrl || (images[0] || null),
    previewVideo: firstVideoUrl,
    audioUrl: null,
    duration: null,
    isPhotos: isPhotos,
    images: images,
    slides: slides,
    isCarousel: downloadItems.length > 1,
    formats: formats
  };
}

/**
 * Extract TeraBox SURL key
 */
export function extractTeraboxSurl(rawUrl) {
  try {
    const u = new URL(rawUrl.trim());
    if (u.searchParams.has('surl')) return u.searchParams.get('surl').replace(/^1/, '');
    const m = u.pathname.match(/\/(?:s|share)\/([a-zA-Z0-9_-]+)/);
    if (m) return m[1].replace(/^1/, '');
  } catch (e) {
    const m = rawUrl.match(/(?:\/s\/|surl=|\/share\/)([a-zA-Z0-9_-]+)/);
    if (m) return m[1].replace(/^1/, '');
  }
  return null;
}

/**
 * Secret TeraBox Extractor Engine (Private Vault)
 */
export async function extractTerabox(url) {
  const surl = extractTeraboxSurl(url);
  if (!surl) {
    throw new Error('Tautan TeraBox tidak valid. Pastikan link memiliki format /s/ atau surl=');
  }

  const customCookie = localStorage.getItem('vdown_tb_cookie') || '';
  const cookieHeader = customCookie ? (customCookie.startsWith('ndus=') ? customCookie : `ndus=${customCookie.trim()}`) : '';

  try {
    const sharePageUrl = `https://www.terabox.app/sharing/link?surl=${surl}`;
    const reqHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    };
    if (cookieHeader) {
      reqHeaders['Cookie'] = cookieHeader;
    }

    const pageRes = await safeHttp(sharePageUrl, { headers: reqHeaders });
    if (pageRes.ok) {
      const html = await pageRes.text();
      const tokenMatch = html.match(/fn%28%22([A-Fa-f0-9]+)%22%29/);
      const jsToken = tokenMatch ? tokenMatch[1] : null;

      if (jsToken) {
        const apiUrl = `https://www.terabox.app/share/list?app_id=250528&shorturl=${surl}&root=1&jsToken=${jsToken}`;
        const apiHeaders = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': sharePageUrl
        };
        if (cookieHeader) {
          apiHeaders['Cookie'] = cookieHeader;
        }

        const apiRes = await safeHttp(apiUrl, { headers: apiHeaders });
        if (apiRes.ok) {
          const apiJson = await apiRes.json();
          if (apiJson && apiJson.errno === 0 && Array.isArray(apiJson.list) && apiJson.list.length > 0) {
            const file = apiJson.list[0];
            const filename = file.server_filename || 'TeraBox File';
            const filesize = file.size ? formatBytes(file.size) : null;
            const thumb = file.thumbs?.url3 || file.thumbs?.url2 || file.thumbs?.icon || null;
            const dlink = file.dlink || null;
            const isVideo = /\.(mp4|mkv|avi|mov|flv|webm)$/i.test(filename) || file.category === 1;

            const formats = [];
            if (dlink) {
              formats.push({
                id: 'tb_direct',
                label: `Unduh Langsung (${filesize || 'File'})`,
                badge: filename.split('.').pop()?.toUpperCase() || 'DIRECT',
                type: isVideo ? 'video' : 'file',
                url: dlink,
                size: filesize,
                ext: filename.split('.').pop() || 'bin',
                recommended: true
              });
            }

            // Web Direct Fallback
            formats.push({
              id: 'tb_cloud',
              label: 'Unduh via Cloud Mirror',
              badge: 'CLOUD',
              type: isVideo ? 'video' : 'file',
              url: `https://1024tera.com/s/${surl}`,
              size: filesize,
              ext: filename.split('.').pop() || 'bin',
              recommended: !dlink
            });

            return {
              success: true,
              platform: 'terabox',
              title: filename,
              author: {
                name: 'Private Cloud Storage',
                username: 'TeraBox Vault',
                avatar: null
              },
              thumbnail: thumb,
              previewVideo: isVideo ? dlink : null,
              audioUrl: null,
              duration: null,
              isPhotos: false,
              images: [],
              formats: formats
            };
          }
        }
      }

      // Title parsing fallback
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      let pageTitle = titleMatch ? titleMatch[1].replace(/ - TeraBox$/i, '').trim() : 'TeraBox Cloud File';
      if (pageTitle.includes('file(s) including')) {
        pageTitle = 'TeraBox Shared File';
      }

      return {
        success: true,
        platform: 'terabox',
        title: pageTitle,
        author: {
          name: 'Private Cloud Storage',
          username: 'TeraBox Vault',
          avatar: null
        },
        thumbnail: null,
        previewVideo: null,
        audioUrl: null,
        duration: null,
        isPhotos: false,
        images: [],
        formats: [{
          id: 'tb_open',
          label: 'Buka & Unduh File di Cloud',
          badge: 'VAULT',
          type: 'file',
          url: `https://1024tera.com/s/${surl}`,
          ext: 'bin',
          recommended: true
        }]
      };
    }
  } catch (err) {
    console.warn('TeraBox extraction failed:', err);
  }

  // Fallback direct
  return {
    success: true,
    platform: 'terabox',
    title: 'TeraBox Cloud File',
    author: {
      name: 'Private Cloud Storage',
      username: 'TeraBox Vault',
      avatar: null
    },
    thumbnail: null,
    previewVideo: null,
    audioUrl: null,
    duration: null,
    isPhotos: false,
    images: [],
    formats: [{
      id: 'tb_fallback',
      label: 'Unduh File Cloud',
      badge: 'VAULT',
      type: 'file',
      url: `https://1024tera.com/s/${surl}`,
      ext: 'bin',
      recommended: true
    }]
  };
}

/**
 * Extract Twitter / X Tweet ID
 */
export function extractTwitterId(url) {
  if (!url) return null;
  const m = url.match(/(?:twitter\.com|x\.com)\/(?:#!\/)?(?:[a-zA-Z0-9_]+)\/status\/([0-9]+)/i);
  return m ? m[1] : null;
}

/**
 * Extract Twitter / X Media (HD Videos, GIFs, and High-Resolution Photos)
 */
export async function extractTwitter(url) {
  const tweetId = extractTwitterId(url);
  if (!tweetId) {
    throw new Error('Tautan Twitter / X tidak valid. Pastikan link berisi /status/[id].');
  }

  const apiUrl = `https://api.fxtwitter.com/i/status/${tweetId}`;
  const res = await safeHttp(apiUrl, {
    headers: {
      'User-Agent': 'ZypApp/1.0',
      'Accept': 'application/json'
    }
  });

  if (!res.ok) {
    throw new Error(`Gagal menghubungi server Twitter/X (${res.status}). Pastikan tweet masih ada & publik.`);
  }

  const json = await res.json();
  if (json.code !== 200 || !json.tweet) {
    throw new Error(json.message || 'Gagal mengambil data Tweet. Postingan mungkin privat atau dihapus.');
  }

  const tweet = json.tweet;
  const formats = [];
  const photos = tweet.media?.photos || [];
  const videos = tweet.media?.videos || [];
  const isPhotos = photos.length > 0 && videos.length === 0;

  let bestVideoUrl = null;
  let thumbUrl = null;

  // Handle Videos & GIFs
  if (videos.length > 0) {
    videos.forEach((video, vIdx) => {
      thumbUrl = thumbUrl || video.thumbnail_url;
      const variants = Array.isArray(video.variants) ? video.variants : [];
      const mp4Variants = variants
        .filter(v => v.content_type === 'video/mp4' && v.url)
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

      if (mp4Variants.length > 0) {
        // Highest bitrate (HD MP4)
        const hd = mp4Variants[0];

        // Optimal preview stream (720p / 1080p) for instantaneous decoding without lag
        const previewStream = mp4Variants.find(v => (v.url && (v.url.includes('720x') || v.url.includes('1080x'))) || (v.bitrate >= 1500000 && v.bitrate <= 8000000)) || mp4Variants[0];
        if (!bestVideoUrl) bestVideoUrl = previewStream.url;

        formats.push({
          id: `x_video_hd_${vIdx + 1}`,
          label: `Video HD MP4${videos.length > 1 ? ` (Video #${vIdx + 1})` : ' (Kualitas Terbaik)'}`,
          badge: 'HD MP4',
          type: 'video',
          url: hd.url,
          thumb: video.thumbnail_url || thumbUrl,
          ext: 'mp4',
          recommended: vIdx === 0
        });

        // Medium or lowest bitrate (SD MP4)
        if (mp4Variants.length > 1) {
          const sd = mp4Variants[mp4Variants.length - 1];
          formats.push({
            id: `x_video_sd_${vIdx + 1}`,
            label: `Video Standar (Ukuran Lebih Ringan)`,
            badge: 'SD MP4',
            type: 'video',
            url: sd.url,
            thumb: video.thumbnail_url || thumbUrl,
            ext: 'mp4',
            recommended: false
          });
        }
      } else if (video.url) {
        if (!bestVideoUrl) bestVideoUrl = video.url;
        formats.push({
          id: `x_video_${vIdx + 1}`,
          label: `Video MP4${videos.length > 1 ? ` #${vIdx + 1}` : ''}`,
          badge: 'MP4',
          type: 'video',
          url: video.url,
          thumb: video.thumbnail_url || thumbUrl,
          ext: 'mp4',
          recommended: vIdx === 0
        });
      }
    });
  }

  // Handle Photos (Single or Carousel)
  const images = [];
  const slides = [];
  if (photos.length > 0) {
    photos.forEach((photo, pIdx) => {
      const imgUrl = photo.url;
      images.push(imgUrl);
      if (!thumbUrl) thumbUrl = imgUrl;

      formats.push({
        id: `x_photo_${pIdx + 1}`,
        label: photos.length === 1 ? 'Foto HD Resolusi Asli' : `Foto #${pIdx + 1} Resolusi Asli`,
        badge: 'Foto HD',
        type: 'image',
        url: imgUrl,
        thumb: imgUrl,
        ext: 'jpg',
        recommended: videos.length === 0 && pIdx === 0
      });

      slides.push({
        index: pIdx + 1,
        type: 'image',
        ext: 'jpg',
        url: imgUrl,
        thumb: imgUrl,
        label: `Foto #${pIdx + 1}`
      });
    });
  }

  if (formats.length === 0) {
    throw new Error('Postingan Twitter/X ini tidak memiliki media (video atau foto) yang dapat diunduh.');
  }

  // Title: clean tweet text
  let title = tweet.text ? tweet.text.replace(/https?:\/\/\S+/g, '').trim() : '';
  if (!title) {
    title = isPhotos
      ? `Foto Twitter oleh @${tweet.author?.screen_name || 'user'}`
      : `Video Twitter oleh @${tweet.author?.screen_name || 'user'}`;
  }

  return {
    success: true,
    platform: 'twitter',
    title: title,
    author: {
      name: tweet.author?.name || 'Twitter User',
      username: tweet.author?.screen_name ? `@${tweet.author.screen_name}` : '',
      avatar: tweet.author?.avatar_url || null
    },
    thumbnail: thumbUrl,
    previewVideo: bestVideoUrl,
    audioUrl: null,
    duration: null,
    isPhotos: isPhotos,
    images: images,
    slides: slides,
    formats: formats
  };
}

/**
 * Extract YouTube Video ID from any YouTube URL
 */
export function extractYoutubeId(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i);
  return m ? m[1] : null;
}

/**
 * Extract YouTube Video & Shorts (HD MP4 with Audio, MP3 Soundtrack, and HD Cover)
 */
export async function extractYouTube(url) {
  const videoId = extractYoutubeId(url);
  if (!videoId) {
    throw new Error('Tautan YouTube tidak valid. Pastikan link video atau Shorts benar.');
  }

  const thumbMax = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  // Engine 1: loader.to stream conversion engine
  try {
    const initRes = await safeHttp(`https://loader.to/ajax/download.php?format=720&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`);
    if (initRes.ok) {
      const initData = await initRes.json();
      if (initData && (initData.id || initData.download_url)) {
        let downloadUrl = initData.download_url;
        let title = initData.title || initData.info?.title || 'YouTube Video';
        let thumbnail = initData.info?.image || thumbMax;

        if (!downloadUrl && initData.id) {
          const progressUrl = initData.progress_url || `https://lto2.affadaffa.com/api/progress?id=${initData.id}`;
          for (let i = 0; i < 14; i++) {
            await new Promise(r => setTimeout(r, 1200));
            const pRes = await safeHttp(progressUrl);
            if (pRes.ok) {
              const pData = await pRes.json();
              if (pData.download_url) {
                downloadUrl = pData.download_url;
                title = pData.title || title;
                thumbnail = pData.info?.image || thumbnail;
                break;
              }
              if (pData.success === 0 && pData.text?.toLowerCase().includes('error')) {
                break;
              }
            }
          }
        }

        if (downloadUrl) {
          const formats = [
            {
              id: 'yt_720p',
              label: 'Video HD 720p (Audio & Video)',
              badge: 'HD 720P',
              type: 'video',
              url: downloadUrl,
              thumb: thumbnail,
              ext: 'mp4',
              recommended: true
            },
            {
              id: 'yt_thumb',
              label: 'Gambar Sampul / Thumbnail HD',
              badge: 'Cover HD',
              type: 'image',
              url: thumbMax,
              thumb: thumbMax,
              ext: 'jpg',
              recommended: false
            }
          ];

          return {
            success: true,
            platform: 'youtube',
            title: title,
            author: {
              name: 'YouTube Creator',
              username: '@youtube',
              avatar: null
            },
            thumbnail: thumbnail,
            previewVideo: downloadUrl,
            audioUrl: null,
            duration: null,
            isPhotos: false,
            images: [],
            formats: formats
          };
        }
      }
    }
  } catch (err) {
    console.warn('YouTube Engine 1 error:', err);
  }

  // Engine 2: Piped API Fallback Engine
  try {
    const pipedRes = await safeHttp(`https://api.piped.private.coffee/streams/${videoId}`);
    if (pipedRes.ok) {
      const data = await pipedRes.json();
      const videoStreams = Array.isArray(data.videoStreams) ? data.videoStreams : [];
      const progressive = videoStreams.filter(s => s.videoOnly === false && s.url);
      const audioStreams = Array.isArray(data.audioStreams) ? data.audioStreams : [];

      if (progressive.length > 0 || videoStreams.length > 0) {
        const best = progressive[0] || videoStreams[0];
        const formats = [];

        progressive.forEach((stream, idx) => {
          formats.push({
            id: `yt_piped_${idx}`,
            label: `Video MP4 (${stream.quality || 'Standar'})`,
            badge: stream.quality || 'MP4',
            type: 'video',
            url: stream.url,
            thumb: data.thumbnailUrl || thumbMax,
            ext: 'mp4',
            recommended: idx === 0
          });
        });

        if (audioStreams.length > 0) {
          formats.push({
            id: 'yt_audio',
            label: `Audio MP3/M4A (${audioStreams[0].quality || 'HQ'})`,
            badge: 'Audio',
            type: 'audio',
            url: audioStreams[0].url,
            ext: 'm4a'
          });
        }

        formats.push({
          id: 'yt_thumb',
          label: 'Gambar Sampul / Thumbnail HD',
          badge: 'Cover HD',
          type: 'image',
          url: data.thumbnailUrl || thumbMax,
          thumb: data.thumbnailUrl || thumbMax,
          ext: 'jpg'
        });

        return {
          success: true,
          platform: 'youtube',
          title: data.title || 'YouTube Video',
          author: {
            name: data.uploader || 'YouTube Creator',
            username: data.uploaderUrl ? `@${data.uploaderUrl.split('/').pop()}` : '',
            avatar: data.uploaderAvatar || null
          },
          thumbnail: data.thumbnailUrl || thumbMax,
          previewVideo: best.url,
          audioUrl: audioStreams[0]?.url || null,
          duration: data.duration ? `${data.duration}s` : null,
          isPhotos: false,
          images: [],
          formats: formats
        };
      }
    }
  } catch (err) {
    console.warn('YouTube Engine 2 fallback error:', err);
  }

  throw new Error('Gagal mengekstrak video YouTube. Pastikan tautan masih aktif dan publik.');
}

/**
 * Universal Extractor Fallback
 */
export async function extractUniversal(url, forcedPlatform = null) {
  const platform = forcedPlatform || detectPlatform(url);

  // For universal URLs, attempt direct fetch if available
  return {
    success: true,
    platform: platform,
    title: `${capitalize(platform)} Media`,
    author: {
      name: `${capitalize(platform)} Creator`,
      username: '',
      avatar: null
    },
    thumbnail: null,
    previewVideo: null,
    audioUrl: null,
    formats: [{
      id: 'universal_media',
      label: 'Buka / Unduh Media',
      badge: 'DIRECT',
      type: 'video',
      url: url,
      ext: 'mp4',
      recommended: true
    }]
  };
}

/**
 * Format bytes to readable string (MB, KB)
 */
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
