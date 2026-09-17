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
      url: res.url || res.headers?.Location || res.headers?.location || url,
      text: async () => (typeof res.data === 'string' ? res.data : JSON.stringify(res.data)),
      json: async () => (typeof res.data === 'object' && res.data !== null ? res.data : JSON.parse(res.data))
    };
  }

  // Web browser environment: route proxies to avoid CORS
  let targetUrl = url;
  if (typeof window !== 'undefined') {
    if (url.startsWith('https://saveinsta.to')) {
      targetUrl = url.replace('https://saveinsta.to', '/saveinsta-proxy');
    } else if (url.startsWith('https://loader.to')) {
      targetUrl = url.replace('https://loader.to', '/loader-proxy');
    } else if (url.startsWith('https://lto2.affadaffa.com')) {
      targetUrl = url.replace('https://lto2.affadaffa.com', '/loader-progress-proxy');
    } else if (url.startsWith('https://api.bilibili.com')) {
      targetUrl = url.replace('https://api.bilibili.com', '/bili-api');
    } else if (url.startsWith('https://api.bilibili.tv')) {
      targetUrl = url.replace('https://api.bilibili.tv', '/bili-tv-api');
    } else if (url.startsWith('https://www.bilibili.tv')) {
      targetUrl = url.replace('https://www.bilibili.tv', '/bili-tv-web');
    } else if (url.startsWith('https://bili.im')) {
      targetUrl = url.replace('https://bili.im', '/bili-im-proxy');
    } else if (url.startsWith('https://threadster.app')) {
      targetUrl = url.replace('https://threadster.app', '/threadster-proxy');
    } else if (url.startsWith('https://getmyfb.com')) {
      targetUrl = url.replace('https://getmyfb.com', '/getmyfb-proxy');
    } else if (url.startsWith('https://backend1.tioo.eu.org')) {
      targetUrl = url.replace('https://backend1.tioo.eu.org', '/tioo-pinterest-proxy');
    }
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
  if (lower.includes('threads.net') || lower.includes('threads.com')) return 'threads';
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
  if (lower.includes('spotify.com') || lower.includes('spotify.link')) return 'spotify';
  if (lower.includes('facebook.com') || lower.includes('fb.watch') || lower.includes('fb.com')) return 'facebook';
  if (lower.includes('pinterest.com') || lower.includes('pin.it')) return 'pinterest';
  if (
    lower.includes('bilibili.com') ||
    lower.includes('bilibili.tv') ||
    lower.includes('b23.tv') ||
    lower.includes('bili.im')
  ) {
    return 'bilibili';
  }
  return 'universal';
}

/**
 * Clean URL: strip unnecessary tracking query params
 */
export function cleanMediaUrl(rawUrl) {
  try {
    const u = new URL(rawUrl.trim());
    if (
      u.hostname.includes('instagram.com') ||
      u.hostname.includes('threads.net') ||
      u.hostname.includes('threads.com') ||
      u.hostname.includes('twitter.com') ||
      u.hostname.includes('x.com') ||
      u.hostname.includes('spotify.com') ||
      u.hostname.includes('bilibili.com') ||
      u.hostname.includes('bilibili.tv')
    ) {
      if (u.pathname.includes('/share/')) {
        return rawUrl.trim();
      }
      u.search = '';
      return u.toString();
    }
    if (
      u.hostname.includes('facebook.com') ||
      u.hostname.includes('fb.watch') ||
      u.hostname.includes('fb.com')
    ) {
      u.searchParams.delete('fbclid');
      u.searchParams.delete('mibextid');
      u.searchParams.delete('rdid');
      return u.toString();
    }
    if (u.hostname.includes('pinterest.com') || u.hostname.includes('pin.it')) {
      let path = u.pathname;
      if (path.includes('/sent/')) {
        path = path.replace('/sent/', '/');
      }
      return `${u.origin}${path}`;
    }
    return `${u.origin}${u.pathname}`;
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
 * Extract Spotify Track ID from any Spotify URL
 */
export function extractSpotifyTrackId(url) {
  if (!url || typeof url !== 'string') return null;
  const m = url.match(/(?:spotify\.com\/(?:[a-z]{2}(?:-[a-zA-Z]{2})?\/)?track\/|spotify:track:)([a-zA-Z0-9]{22})/i);
  return m ? m[1] : null;
}

/**
 * Extract Spotify Track (Full MP3 Music, Instant Preview Audio, and Album Cover Art)
 */
export async function extractSpotify(url) {
  let targetUrl = url.trim();

  // Handle spotify.link shortlinks
  if (targetUrl.includes('spotify.link/')) {
    try {
      const resp = await safeHttp(targetUrl);
      const html = await resp.text();
      const trackMatch = html.match(/https:\/\/open\.spotify\.com\/track\/([a-zA-Z0-9]{22})/);
      if (trackMatch) {
        targetUrl = trackMatch[0];
      }
    } catch (e) {
      console.warn('Spotify shortlink resolve error:', e);
    }
  }

  const trackId = extractSpotifyTrackId(targetUrl);
  if (!trackId) {
    throw new Error('Tautan Spotify tidak valid. Pastikan Anda menyalin tautan lagu (Track) dari Spotify.');
  }

  // 1. Fetch Official Spotify Embed Metadata & Audio Preview
  let entity = null;
  try {
    const embedRes = await safeHttp(`https://open.spotify.com/embed/track/${trackId}`);
    if (embedRes.ok) {
      const embedHtml = await embedRes.text();
      const nextMatch = embedHtml.match(/id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
      if (nextMatch) {
        const nextData = JSON.parse(nextMatch[1]);
        entity = nextData?.props?.pageProps?.state?.data?.entity;
      }
    }
  } catch (err) {
    console.warn('Spotify embed fetch error:', err);
  }

  // 2. Fetch OEmbed for High-Res Thumbnail Fallback
  let coverArtUrl = null;
  let oembedTitle = null;
  try {
    const oRes = await safeHttp(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`);
    if (oRes.ok) {
      const oData = await oRes.json();
      coverArtUrl = oData.thumbnail_url || null;
      oembedTitle = oData.title || null;
    }
  } catch (err) {
    console.warn('Spotify oEmbed fetch error:', err);
  }

  const songTitle = entity?.name || oembedTitle || 'Lagu Spotify';
  const artistName = Array.isArray(entity?.artists)
    ? entity.artists.map(a => a.name).join(', ')
    : 'Artis Spotify';
  const durationMs = entity?.duration || 0;
  const durationSec = Math.round(durationMs / 1000);
  const previewAudioUrl = entity?.audioPreview?.url || null;

  // Cover image from entity or oembed
  if (!coverArtUrl && entity?.coverArt?.sources?.length > 0) {
    coverArtUrl = entity.coverArt.sources[0].url;
  }

  let fullMp3Url = null;

  // 3. Search and match full song audio via music search
  try {
    const cleanSearchQuery = `${artistName} ${songTitle}`.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const searchUrl = `https://api.piped.private.coffee/search?q=${encodeURIComponent(cleanSearchQuery)}&filter=music_songs`;
    const searchRes = await safeHttp(searchUrl);
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const topMatch = Array.isArray(searchData?.items) ? searchData.items[0] : null;
      const ytVideoId = topMatch?.url ? topMatch.url.replace('/watch?v=', '') : null;

      if (ytVideoId) {
        // Convert to Full MP3 using loader.to engine
        const initRes = await safeHttp(`https://loader.to/ajax/download.php?format=mp3&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${ytVideoId}`)}`);
        if (initRes.ok) {
          const initData = await initRes.json();
          if (initData && (initData.download_url || initData.id)) {
            fullMp3Url = initData.download_url;
            if (!fullMp3Url && initData.id) {
              const progressUrl = initData.progress_url || `https://lto2.affadaffa.com/api/progress?id=${initData.id}`;
              for (let i = 0; i < 14; i++) {
                await new Promise(r => setTimeout(r, 1200));
                const pRes = await safeHttp(progressUrl);
                if (pRes.ok) {
                  const pData = await pRes.json();
                  if (pData.download_url) {
                    fullMp3Url = pData.download_url;
                    break;
                  }
                  if (pData.success === 0 && pData.text?.toLowerCase().includes('error')) {
                    break;
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch (searchErr) {
    console.warn('Spotify full song match error:', searchErr);
  }

  // Fallback: If full MP3 converter was busy, check if audioPreview exists
  if (!fullMp3Url && !previewAudioUrl) {
    throw new Error(`Gagal mengekstrak lagu "${songTitle}". Pastikan lagu tersedia di Spotify dan publik.`);
  }

  const formats = [];

  // Full Song MP3 Format
  if (fullMp3Url) {
    formats.push({
      id: 'spotify_full_mp3',
      label: `Lagu Lengkap MP3 (Kualitas Terbaik)`,
      badge: 'FULL MP3',
      type: 'audio',
      url: fullMp3Url,
      thumb: coverArtUrl,
      ext: 'mp3',
      recommended: true
    });
  }

  // Official Spotify 30-second Preview Audio
  if (previewAudioUrl) {
    formats.push({
      id: 'spotify_preview_mp3',
      label: `Audio Preview Resmi (30 Detik Cepat)`,
      badge: 'PREVIEW MP3',
      type: 'audio',
      url: previewAudioUrl,
      thumb: coverArtUrl,
      ext: 'mp3',
      recommended: !fullMp3Url
    });
  }

  // Cover Album Artwork
  if (coverArtUrl) {
    formats.push({
      id: 'spotify_cover_hd',
      label: 'Gambar Sampul Album HD',
      badge: 'COVER HD',
      type: 'image',
      url: coverArtUrl,
      thumb: coverArtUrl,
      ext: 'jpg',
      recommended: false
    });
  }

  const durationFormatted = durationSec > 0
    ? `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`
    : null;

  return {
    success: true,
    platform: 'spotify',
    title: `${songTitle} - ${artistName}`,
    author: {
      name: artistName,
      username: 'Spotify Track',
      avatar: coverArtUrl
    },
    thumbnail: coverArtUrl,
    previewVideo: null,
    audioUrl: previewAudioUrl || fullMp3Url,
    duration: durationFormatted,
    isPhotos: false,
    isAudio: true,
    images: [],
    formats: formats
  };
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

/**
 * Minimal Pure JavaScript MD5 Implementation
 */
function md5(string) {
  function rotateLeft(lValue, iShiftBits) {
    return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
  }
  function addUnsigned(lX, lY) {
    const lX8 = (lX & 0x80000000);
    const lY8 = (lY & 0x80000000);
    const lX4 = (lX & 0x40000000);
    const lY4 = (lY & 0x40000000);
    const lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
    if (lX4 & lY4) return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
      else return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
    } else {
      return (lResult ^ lX8 ^ lY8);
    }
  }
  function F(x, y, z) { return (x & y) | ((~x) & z); }
  function G(x, y, z) { return (x & z) | (y & (~z)); }
  function H(x, y, z) { return (x ^ y ^ z); }
  function I(x, y, z) { return (y ^ (x | (~z))); }

  function FF(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function GG(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function HH(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function II(a, b, c, d, x, s, ac) {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function convertToWordArray(str) {
    let lWordCount;
    const lMessageLength = str.length;
    const lNumberOfWords_temp1 = lMessageLength + 8;
    const lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
    const lWordArray = new Array(lNumberOfWords - 1);
    let lBytePosition = 0;
    let lByteCount = 0;
    while (lByteCount < lMessageLength) {
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = (lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition));
      lByteCount++;
    }
    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  }

  function wordToHex(lValue) {
    let WordToHexValue = '', WordToHexValue_temp = '', lByte, lCount;
    for (lCount = 0; lCount <= 3; lCount++) {
      lByte = (lValue >>> (lCount * 8)) & 255;
      WordToHexValue_temp = '0' + lByte.toString(16);
      WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
    }
    return WordToHexValue;
  }

  function utf8Encode(str) {
    return unescape(encodeURIComponent(str));
  }

  const encodedStr = utf8Encode(string);
  const x = convertToWordArray(encodedStr);
  let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;
  const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;
    a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
    d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
    b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
    a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
    c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
    b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
    d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
    c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
    b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
    d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
    b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);

    a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
    d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
    b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
    a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
    d = GG(d, a, b, c, x[k + 10], S22, 0x02441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
    b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
    d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
    b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
    a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
    d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
    b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);

    a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
    d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
    b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
    a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
    d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
    b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
    d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
    c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
    b = HH(b, c, d, a, x[k + 6], S34, 0x04881D05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
    d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
    b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);

    a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
    d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
    c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
    b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
    d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
    c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
    b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
    d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
    c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
    b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
    a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
    d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
    b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);

    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }

  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

/**
 * Bilibili WBI Sign Key Permutation Table & Helpers
 */
const BILI_MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40,
  61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11,
  36, 20, 34, 44, 52
];

function getBiliMixinKey(orig) {
  let temp = '';
  for (let i = 0; i < BILI_MIXIN_KEY_ENC_TAB.length; i++) {
    temp += orig[BILI_MIXIN_KEY_ENC_TAB[i]];
  }
  return temp.slice(0, 32);
}

function encodeBiliWbi(params, imgKey, subKey) {
  const mixinKey = getBiliMixinKey(imgKey + subKey);
  const currTime = Math.round(Date.now() / 1000);
  const chrFilter = /[!'()*]/g;

  const newParams = { ...params, wts: currTime };
  const queryList = [];

  Object.keys(newParams).sort().forEach(key => {
    let val = newParams[key].toString().replace(chrFilter, '');
    queryList.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
  });

  const query = queryList.join('&');
  const w_rid = md5(query + mixinKey);

  return `${query}&w_rid=${w_rid}`;
}

let cachedBiliKeys = null;
let cachedBiliKeysTime = 0;

async function getBilibiliWbiKeys() {
  const now = Date.now();
  if (cachedBiliKeys && (now - cachedBiliKeysTime < 3600000)) {
    return cachedBiliKeys;
  }

  try {
    const res = await safeHttp('https://api.bilibili.com/x/web-interface/nav', {
      headers: {
        'Accept': 'application/json',
        'Referer': 'https://www.bilibili.com/'
      }
    });
    if (res.ok) {
      const json = await res.json();
      const wbiImg = json.data?.wbi_img;
      if (wbiImg?.img_url && wbiImg?.sub_url) {
        const imgKey = wbiImg.img_url.slice(wbiImg.img_url.lastIndexOf('/') + 1, wbiImg.img_url.lastIndexOf('.'));
        const subKey = wbiImg.sub_url.slice(wbiImg.sub_url.lastIndexOf('/') + 1, wbiImg.sub_url.lastIndexOf('.'));
        cachedBiliKeys = { imgKey, subKey };
        cachedBiliKeysTime = now;
        return cachedBiliKeys;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch Bilibili WBI keys from nav:', err);
  }

  // Fallback defaults
  return {
    imgKey: '7cd084941338484aae1ad9425b84077c',
    subKey: '4932caff0ff746eab6f01bf08b70ac45'
  };
}

/**
 * Extract Bstation / Bilibili TV (bilibili.tv, bili.im)
 */
/**
 * Extract Bstation / Bilibili TV (bilibili.tv, bili.im)
 */
async function extractBstation(rawUrl) {
  let url = (rawUrl || '').trim();

  // 1. Resolve shortlinks (e.g. bili.im/...) or links without direct video/play path
  if (url.includes('bili.im') || (!url.includes('/video/') && !url.includes('/play/'))) {
    try {
      const redirectRes = await safeHttp(url);
      if (redirectRes.url && redirectRes.url !== url) {
        url = redirectRes.url;
      }
    } catch (e) {
      console.warn('Failed to resolve Bstation shortlink redirect:', e);
    }
  }

  // 2. Check if this is an Anime / Series / OGV page (/play/seasonId/epId or /play/seasonId)
  const playMatch = url.match(/\/play\/([0-9]+)(?:\/([0-9]+))?/i);
  if (playMatch) {
    return await extractBstationAnimePlay(url, playMatch[1], playMatch[2] || null);
  }

  // 3. Otherwise treat as standard video (/video/aid)
  let aidMatch = url.match(/\/video\/([0-9]+)/i) || url.match(/(?:aid=|video_id=)([0-9]+)/i) || url.match(/\/([0-9]{6,})/);
  const aid = aidMatch ? aidMatch[1] : null;

  if (!aid) {
    throw new Error('ID video Bstation / Bilibili TV tidak ditemukan dalam tautan.');
  }

  return await extractBstationVideo(url, aid);
}

/**
 * Extract Bstation Anime & Series (/play/...)
 */
async function extractBstationAnimePlay(url, seasonId, specificEpId = null) {
  let title = 'Anime Bstation';
  let coverArt = null;
  let authorName = 'Bstation Anime';
  let epId = specificEpId;
  let epTitle = '';

  try {
    const pageUrl = `https://www.bilibili.tv/id/play/${seasonId}${specificEpId ? '/' + specificEpId : ''}`;
    const pageRes = await safeHttp(pageUrl, {
      headers: { 'Referer': 'https://www.bilibili.tv/' }
    });

    if (pageRes.ok) {
      const html = await pageRes.text();
      const ogTitle = html.match(/<meta property="og:title" content="([^"]*)"/i);
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const ogImage = html.match(/<meta property="og:image" content="([^"]*)"/i);

      if (ogTitle && ogTitle[1]) {
        title = ogTitle[1].replace(/\s*\|\s*bilibili$/i, '').trim();
      } else if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].replace(/\s*-\s*Bstation$/i, '').trim();
      }

      if (ogImage && ogImage[1]) {
        coverArt = ogImage[1];
      }

      // Parse window.__initialState safely
      const stateMatch = html.match(/<script>window\.__initialState\s*=\s*([\s\S]*?)<\/script>/);
      if (stateMatch) {
        try {
          const fnBody = stateMatch[1];
          const getState = new Function(`return ${fnBody}`);
          const state = getState();
          const ogv = state?.ogv;
          if (ogv?.season?.title) {
            title = ogv.season.title;
          }
          if (!coverArt && (ogv?.season?.horizontal_cover || ogv?.season?.vertical_cover)) {
            coverArt = ogv.season.horizontal_cover || ogv.season.vertical_cover;
          }

          if (!epId) {
            epId = ogv?.epId || ogv?.season?.first_episode?.episode_id;
            if (ogv?.season?.first_episode?.title_display) {
              epTitle = ` (${ogv.season.first_episode.title_display})`;
            }
          }
        } catch (stateErr) {
          console.warn('Initial state parse warning:', stateErr);
        }
      }
    }
  } catch (err) {
    console.warn('Anime play page fetch warning:', err);
  }

  if (!epId) {
    throw new Error(`Tidak dapat menemukan ID episode anime untuk serial "${title}".`);
  }

  const playUrl = `https://api.bilibili.tv/intl/gateway/web/playurl?s_locale=id_ID&platform=web&ep_id=${epId}&qn=112`;
  const res = await safeHttp(playUrl, {
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Referer': 'https://www.bilibili.tv/'
    }
  });

  if (!res.ok) {
    throw new Error(`Gagal menghubungi server Bstation (${res.status}).`);
  }

  const json = await res.json();
  if (json.code === 10004005 || json.code === 10004001) {
    throw new Error(`Episode "${title}${epTitle}" membutuhkan akun login atau status VIP di Bstation.`);
  }

  if (json.code !== 0 || !json.data?.playurl) {
    throw new Error(json.message || `Gagal memuat video episode ${title}.`);
  }

  return parseBstationPlayData(json.data.playurl, `${title}${epTitle}`, authorName, coverArt);
}

/**
 * Extract Bstation Standard Video (/video/...)
 */
async function extractBstationVideo(url, aid) {
  let title = 'Bstation Video';
  let coverArt = null;
  let authorName = 'Bstation Creator';

  try {
    const pageRes = await safeHttp(`https://www.bilibili.tv/id/video/${aid}`, {
      headers: { 'Referer': 'https://www.bilibili.tv/' }
    });
    if (pageRes.ok) {
      const html = await pageRes.text();
      const ogTitle = html.match(/<meta property="og:title" content="([^"]*)"/i);
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const ogImage = html.match(/<meta property="og:image" content="([^"]*)"/i);

      if (ogTitle && ogTitle[1]) {
        title = ogTitle[1].replace(/\s*\|\s*bilibili$/i, '').trim();
      } else if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].replace(/\s*-\s*Bstation$/i, '').trim();
      }

      if (ogImage && ogImage[1]) {
        coverArt = ogImage[1];
      }
    }
  } catch (err) {
    console.warn('Bstation page fetch warning:', err);
  }

  const playUrl = `https://api.bilibili.tv/intl/gateway/web/playurl?s_locale=id_ID&platform=web&aid=${aid}&qn=112`;
  const res = await safeHttp(playUrl, {
    headers: {
      'Accept': 'application/json, text/plain, */*',
      'Referer': 'https://www.bilibili.tv/'
    }
  });

  if (!res.ok) {
    throw new Error(`Gagal menghubungi server Bstation (${res.status}).`);
  }

  const json = await res.json();
  if (json.code === 10004005 || json.code === 10004001) {
    throw new Error(`Video "${title}" membutuhkan akun login atau status VIP di Bstation.`);
  }

  if (json.code !== 0 || !json.data?.playurl) {
    throw new Error(json.message || 'Video Bstation tidak ditemukan atau membutuhkan langganan VIP.');
  }

  return parseBstationPlayData(json.data.playurl, title, authorName, coverArt);
}

/**
 * Common Stream Format Parser for Bstation
 */
/**
 * Common Stream Format Parser for Bstation
 */
function parseBstationPlayData(playData, title, authorName, coverArt) {
  const videos = Array.isArray(playData.video) ? playData.video : [];
  const audios = Array.isArray(playData.audio_resource) ? playData.audio_resource : [];

  // Deduplicate streams by resolution quality (preferring AVC / avc1 for maximum compatibility)
  const qualityMap = new Map();
  videos.forEach(v => {
    const vr = v.video_resource;
    if (!vr || !vr.url) return;
    const q = vr.quality || 0;
    const existing = qualityMap.get(q);
    if (!existing) {
      qualityMap.set(q, vr);
    } else {
      const isAvc = (vr.codecs || '').toLowerCase().startsWith('avc');
      const existingIsAvc = (existing.codecs || '').toLowerCase().startsWith('avc');
      if (isAvc && !existingIsAvc) {
        qualityMap.set(q, vr);
      }
    }
  });

  const sortedStreams = Array.from(qualityMap.values()).sort((a, b) => (b.quality || 0) - (a.quality || 0));

  const formats = [];

  sortedStreams.forEach((stream, idx) => {
    const q = stream.quality;
    let label = 'Video MP4';
    let badge = 'MP4';

    if (q >= 80) {
      label = 'Video Full HD 1080p (Kualitas Tertinggi)';
      badge = 'FHD 1080P';
    } else if (q >= 64) {
      label = 'Video HD 720p (Jernih & Lancar)';
      badge = 'HD 720P';
    } else if (q >= 32) {
      label = 'Video Standar 480p';
      badge = 'SD 480P';
    } else if (q >= 16) {
      label = 'Video Hemat Kuota 360p';
      badge = 'SD 360P';
    } else if (q === 6) {
      label = 'Video Ringan 240p';
      badge = 'SD 240P';
    } else {
      label = 'Video Super Ringan 144p';
      badge = 'SD 144P';
    }

    formats.push({
      id: `bstation_${q}`,
      label: label,
      badge: badge,
      type: 'video',
      url: stream.url,
      thumb: coverArt,
      size: stream.size ? formatBytes(stream.size) : null,
      ext: 'mp4',
      recommended: idx === 0
    });
  });

  if (audios.length > 0 && audios[0].url) {
    formats.push({
      id: 'bstation_audio',
      label: 'Audio Soundtrack Musik (M4A)',
      badge: 'AUDIO',
      type: 'audio',
      url: audios[0].url,
      thumb: coverArt,
      size: audios[0].size ? formatBytes(audios[0].size) : null,
      ext: 'm4a',
      recommended: false
    });
  }

  if (coverArt) {
    formats.push({
      id: 'bstation_cover',
      label: 'Gambar Sampul / Cover HD',
      badge: 'COVER HD',
      type: 'image',
      url: coverArt,
      thumb: coverArt,
      ext: 'jpg',
      recommended: false
    });
  }

  if (formats.length === 0) {
    throw new Error('Format video Bstation tidak ditemukan atau membutuhkan akun VIP.');
  }

  const durationSec = playData.duration ? Math.round(playData.duration / 1000) : 0;
  const durationFormatted = durationSec > 0
    ? `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`
    : null;

  return {
    success: true,
    platform: 'bilibili',
    title: title,
    author: {
      name: authorName,
      username: 'Bstation',
      avatar: coverArt
    },
    thumbnail: coverArt,
    previewVideo: sortedStreams[0]?.url || null,
    audioUrl: audios[0]?.url || null,
    duration: durationFormatted,
    isPhotos: false,
    images: [],
    formats: formats
  };
}

/**
 * Extract Main Bilibili (bilibili.com, b23.tv)
 */
async function extractBilibiliMain(url) {
  // Extract BVID or AID from URL
  let bvidMatch = url.match(/(BV[a-zA-Z0-9]+)/i);
  let aidMatch = url.match(/(?:av|aid=)([0-9]+)/i);

  let bvid = bvidMatch ? bvidMatch[1] : null;
  let aid = aidMatch ? aidMatch[1] : null;

  // Handle b23.tv shortlink without direct BV in pathname
  if (!bvid && !aid && url.toLowerCase().includes('b23.tv')) {
    try {
      const res = await safeHttp(url);
      const finalUrl = res.url || '';
      bvidMatch = finalUrl.match(/(BV[a-zA-Z0-9]+)/i);
      if (bvidMatch) bvid = bvidMatch[1];
    } catch (e) {
      console.warn('b23 redirect follow error:', e);
    }
  }

  if (!bvid && !aid) {
    throw new Error('Tautan Bilibili tidak valid. Pastikan link berisi ID video (BV... atau av...).');
  }

  // 1. Get dynamic WBI keys
  const { imgKey, subKey } = await getBilibiliWbiKeys();

  // 2. Fetch video metadata
  const viewParams = bvid ? { bvid } : { aid };
  const viewQuery = encodeBiliWbi(viewParams, imgKey, subKey);
  const viewRes = await safeHttp(`https://api.bilibili.com/x/web-interface/wbi/view?${viewQuery}`, {
    headers: {
      'Accept': 'application/json',
      'Referer': 'https://www.bilibili.com/'
    }
  });

  if (!viewRes.ok) {
    throw new Error(`Gagal menghubungi server Bilibili (${viewRes.status}).`);
  }

  const viewJson = await viewRes.json();
  if (viewJson.code !== 0 || !viewJson.data) {
    throw new Error(viewJson.message || 'Video Bilibili tidak ditemukan atau telah dihapus.');
  }

  const videoData = viewJson.data;
  const cid = videoData.cid;
  const title = videoData.title || 'Bilibili Video';
  let coverPic = videoData.pic || null;
  if (coverPic && coverPic.startsWith('http://')) {
    coverPic = coverPic.replace('http://', 'https://');
  }

  const authorName = videoData.owner?.name || 'Bilibili Creator';
  let authorFace = videoData.owner?.face || null;
  if (authorFace && authorFace.startsWith('http://')) {
    authorFace = authorFace.replace('http://', 'https://');
  }

  // 3. Fetch stream URLs using WBI playurl
  const playParams = {
    cid: cid,
    qn: 64,
    fnval: 0,
    fnver: 0,
    fourk: 1
  };
  if (bvid) playParams.bvid = bvid;
  else playParams.aid = aid;

  const playQuery = encodeBiliWbi(playParams, imgKey, subKey);
  const playRes = await safeHttp(`https://api.bilibili.com/x/player/wbi/playurl?${playQuery}`, {
    headers: {
      'Accept': 'application/json',
      'Referer': 'https://www.bilibili.com/'
    }
  });

  if (!playRes.ok) {
    throw new Error(`Gagal mengambil link stream Bilibili (${playRes.status}).`);
  }

  const playJson = await playRes.json();
  if (playJson.code !== 0 || !playJson.data) {
    throw new Error(playJson.message || 'Gagal memuat format pemutaran video Bilibili.');
  }

  const playData = playJson.data;
  const durl = Array.isArray(playData.durl) ? playData.durl : [];
  const formats = [];
  let bestVideoUrl = null;

  if (durl.length > 0 && durl[0].url) {
    const primary = durl[0];
    bestVideoUrl = primary.url;

    const qualityVal = playData.quality || 64;
    const qualityLabel = qualityVal >= 80 ? 'Video HD 1080p (Audio & Video)' : (qualityVal >= 64 ? 'Video HD 720p (Audio & Video)' : 'Video MP4 Standar');
    const qualityBadge = qualityVal >= 80 ? 'HD 1080P' : (qualityVal >= 64 ? 'HD 720P' : 'MP4');

    formats.push({
      id: 'bili_primary_video',
      label: qualityLabel,
      badge: qualityBadge,
      type: 'video',
      url: primary.url,
      thumb: coverPic,
      size: primary.size ? formatBytes(primary.size) : null,
      ext: 'mp4',
      recommended: true
    });

    // If there are backup / additional durl segments
    for (let i = 1; i < durl.length; i++) {
      if (durl[i].url) {
        formats.push({
          id: `bili_video_part_${i + 1}`,
          label: `Video Bagian #${i + 1}`,
          badge: `PART ${i + 1}`,
          type: 'video',
          url: durl[i].url,
          thumb: coverPic,
          size: durl[i].size ? formatBytes(durl[i].size) : null,
          ext: 'mp4',
          recommended: false
        });
      }
    }
  }

  // Cover Artwork
  if (coverPic) {
    formats.push({
      id: 'bili_cover',
      label: 'Gambar Sampul / Cover HD',
      badge: 'COVER HD',
      type: 'image',
      url: coverPic,
      thumb: coverPic,
      ext: 'jpg',
      recommended: formats.length === 0
    });
  }

  if (formats.length === 0) {
    throw new Error('Format video Bilibili ini membutuhkan login akun atau dibatasi.');
  }

  const durationSec = videoData.duration || 0;
  const durationFormatted = durationSec > 0
    ? `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`
    : null;

  return {
    success: true,
    platform: 'bilibili',
    title: title,
    author: {
      name: authorName,
      username: `@${authorName}`,
      avatar: authorFace
    },
    thumbnail: coverPic,
    previewVideo: bestVideoUrl,
    audioUrl: null,
    duration: durationFormatted,
    isPhotos: false,
    images: [],
    formats: formats
  };
}

/**
 * Main Exported Bilibili Extractor
 */
export async function extractBilibili(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('Tautan Bilibili tidak valid.');
  }

  const url = rawUrl.trim();
  const lower = url.toLowerCase();

  if (lower.includes('bilibili.tv') || lower.includes('bili.im')) {
    return await extractBstation(url);
  }

  return await extractBilibiliMain(url);
}

/**
 * Helper to decode base64 JWT payload from Threadster token URL
 */
function decodeJwtUrl(tokenUrl) {
  if (!tokenUrl || typeof tokenUrl !== 'string') return tokenUrl;
  try {
    const match = tokenUrl.match(/token=([a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/);
    if (!match) return tokenUrl;
    const base64 = match[1].split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonStr);
    return payload.url || tokenUrl;
  } catch (e) {
    return tokenUrl;
  }
}

/**
 * Main Exported Threads Extractor (threads.net & threads.com)
 * Supports short share links (/share/...), HD Videos, Full-Res Photos, and Carousels
 */
export async function extractThreads(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('Tautan Threads tidak valid.');
  }

  let url = rawUrl.trim();

  // 1. Resolve mobile share links (e.g. threads.net/share/... or threads.com/share/...)
  if (url.includes('/share/')) {
    try {
      const shareRes = await safeHttp(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
        }
      });

      let loc = null;
      if (typeof shareRes.headers?.get === 'function') {
        loc = shareRes.headers.get('location');
      } else if (shareRes.headers?.location || shareRes.headers?.Location) {
        loc = shareRes.headers.location || shareRes.headers.Location;
      }

      if (!loc && shareRes.url && shareRes.url !== url) {
        loc = shareRes.url;
      }

      if (loc) {
        if (loc.includes('error=invalid_post')) {
          throw new Error('Postingan Threads ini tidak tersedia, bersifat privat, atau sudah dihapus oleh pemiliknya.');
        }
        if (loc.includes('/post/') || loc.includes('/t/')) {
          url = loc;
        }
      }

      // If url is still a share link, inspect body text
      if (url.includes('/share/')) {
        const bodyText = await shareRes.text();
        if (bodyText.includes('error=invalid_post')) {
          throw new Error('Postingan Threads ini tidak tersedia, bersifat privat, atau sudah dihapus oleh pemiliknya.');
        }

        const cleanBody = (bodyText || '').replace(/&#064;/g, '@').replace(/%40/g, '@');
        const postLinkMatch = cleanBody.match(/(https?:\/\/(?:www\.)?threads\.(?:net|com)\/(?:@[^\/"'\s?#<>]+\/post\/|t\/)[a-zA-Z0-9_-]+)/i);
        if (postLinkMatch) {
          url = postLinkMatch[1];
        } else {
          const scMatch = cleanBody.match(/"shortcode"\s*:\s*"([a-zA-Z0-9_-]+)"/i);
          if (scMatch) {
            url = `https://www.threads.net/t/${scMatch[1]}`;
          }
        }
      }
    } catch (shareErr) {
      if (shareErr.message && (shareErr.message.includes('tidak tersedia') || shareErr.message.includes('privat'))) {
        throw shareErr;
      }
      console.warn('Threads share resolver warning:', shareErr);
    }
  }

  if (url.includes('/share/')) {
    throw new Error('Gagal membuka tautan berbagi Threads. Pastikan tautan masih aktif dan bukan postingan privat.');
  }

  if (url.includes('error=invalid_post')) {
    throw new Error('Postingan Threads ini tidak tersedia, bersifat privat, atau sudah dihapus oleh pemiliknya.');
  }

  const match = url.match(/(?:threads\.net|threads\.com)\/(?:@([^\/\?#]+)\/post\/|t\/)([a-zA-Z0-9_-]+)/i);
  if (!match) {
    throw new Error('Format tautan Threads tidak dikenali. Pastikan link berisi /@user/post/[id], /t/[id], atau tautan berbagi Threads.');
  }

  const usernameMatch = match[1] || null;
  const fullShortcode = match[2];
  // Threads post shortcodes are standard 11 characters. Tracking hashes can make it longer (e.g. 39 chars).
  const cleanShortcode = fullShortcode.length > 11 ? fullShortcode.slice(0, 11) : fullShortcode;

  // Build candidate canonical URLs to query
  const candidateUrls = [
    usernameMatch ? `https://www.threads.net/@${usernameMatch}/post/${cleanShortcode}` : `https://www.threads.net/t/${cleanShortcode}`,
    `https://www.threads.net/t/${cleanShortcode}`
  ];
  if (fullShortcode !== cleanShortcode) {
    candidateUrls.push(usernameMatch ? `https://www.threads.net/@${usernameMatch}/post/${fullShortcode}` : `https://www.threads.net/t/${fullShortcode}`);
    candidateUrls.push(`https://www.threads.net/t/${fullShortcode}`);
  }

  // Deduplicate candidates
  const uniqueUrls = [...new Set(candidateUrls)];

  // Strategy 1: Threadster Engine with Direct Meta CDN Decoding
  for (const targetCanonicalUrl of uniqueUrls) {
    try {
      const homeRes = await safeHttp('https://threadster.app/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      let cookies = '';
      if (typeof homeRes.headers?.get === 'function') {
        cookies = homeRes.headers.get('set-cookie') || '';
      }

      const postHeaders = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Origin': 'https://threadster.app',
        'Referer': 'https://threadster.app/'
      };
      if (cookies) {
        postHeaders['Cookie'] = cookies;
      }

      const postRes = await safeHttp('https://threadster.app/download', {
        method: 'POST',
        headers: postHeaders,
        body: new URLSearchParams({ url: targetCanonicalUrl }).toString()
      });

      if (postRes.ok) {
        const html = await postRes.text();
        const formats = [];
        const images = [];
        const slides = [];
        let detectedAuthor = usernameMatch || 'Threads User';
        let detectedAvatar = null;
        let firstVideoUrl = null;
        let firstThumbUrl = null;

        // Extract author info from HTML
        const userMatch = html.match(/<span>@([^\s<·]+)/i);
        if (userMatch) detectedAuthor = userMatch[1].replace(/·/g, '').trim();

        const avatarMatch = html.match(/<div class="download__item__profile_pic">\s*<img[^>]*src="([^"]+)"/i);
        if (avatarMatch) {
          detectedAvatar = decodeJwtUrl(avatarMatch[1]);
        }

        // Find all download buttons in the page
        const buttons = [...html.matchAll(/<a[^>]*class="[^"]*download__item__download_btn[^"]*"[^>]*href="([^"]+)"[^>]*>/gi)];
        const thumbs = [...html.matchAll(/<div class="download__item__thumb[^"]*">\s*<img[^>]*src="([^"]+)"/gi)];

        if (buttons.length > 0) {
          buttons.forEach((btnMatch, idx) => {
            const rawHref = btnMatch[1];
            const directUrl = decodeJwtUrl(rawHref);
            const isVideo = rawHref.includes('/video?') || directUrl.includes('.mp4') || directUrl.includes('vts_vod');
            
            let thumbUrl = thumbs[idx] ? decodeJwtUrl(thumbs[idx][1]) : null;
            if (!firstThumbUrl && thumbUrl) firstThumbUrl = thumbUrl;

            if (isVideo) {
              if (!firstVideoUrl) firstVideoUrl = directUrl;
              formats.push({
                id: `threads_video_${idx + 1}`,
                label: buttons.length === 1 ? 'Video Threads HD (Kualitas Asli)' : `Video Slide #${idx + 1} HD`,
                badge: 'HD MP4',
                type: 'video',
                url: directUrl,
                thumb: thumbUrl,
                ext: 'mp4',
                recommended: idx === 0
              });
              slides.push({
                index: idx + 1,
                type: 'video',
                ext: 'mp4',
                url: directUrl,
                thumb: thumbUrl,
                label: `Video #${idx + 1}`
              });
            } else {
              images.push(directUrl);
              formats.push({
                id: `threads_photo_${idx + 1}`,
                label: buttons.length === 1 ? 'Foto Threads HD Resolusi Penuh' : `Foto Slide #${idx + 1} HD`,
                badge: 'Foto HD',
                type: 'image',
                url: directUrl,
                thumb: thumbUrl || directUrl,
                ext: 'jpg',
                recommended: idx === 0 && !firstVideoUrl
              });
              slides.push({
                index: idx + 1,
                type: 'image',
                ext: 'jpg',
                url: directUrl,
                thumb: thumbUrl || directUrl,
                label: `Foto #${idx + 1}`
              });
            }
          });

          if (formats.length > 0) {
            const isPhotos = images.length > 0 && !firstVideoUrl;
            return {
              success: true,
              platform: 'threads',
              title: `Threads Media oleh @${detectedAuthor}`,
              author: {
                name: detectedAuthor,
                username: `@${detectedAuthor}`,
                avatar: detectedAvatar
              },
              thumbnail: firstThumbUrl || images[0] || detectedAvatar,
              previewVideo: firstVideoUrl,
              audioUrl: null,
              duration: null,
              isPhotos: isPhotos,
              images: images,
              slides: slides,
              formats: formats
            };
          }
        }
      }
    } catch (err) {
      console.warn(`Threads Strategy 1 (Threadster) failed for ${targetCanonicalUrl}:`, err);
    }
  }

  // Strategy 2: Direct Embed Scraper Fallback
  for (const sc of [cleanShortcode, fullShortcode]) {
    try {
      const embedUrl = `https://www.threads.net/t/${sc}/embed`;
      const embedRes = await safeHttp(embedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      if (embedRes.ok) {
        const html = await embedRes.text();
        if (html.includes('Thread not available') || html.includes('class="ErrorText"')) {
          throw new Error('Postingan Threads ini tidak tersedia, bersifat privat, atau sudah dihapus oleh pemiliknya.');
        }

        const mediaImgMatch = html.match(/<div class="SingleInnerMediaContainer">\s*<img[^>]*src="([^"]+)"/i);
        const userLinkMatch = html.match(/href="https:\/\/www\.threads\.(?:net|com)\/(?:&#064;|@)([^\/\?#]+)/i);
        const avatarMatch = html.match(/<img class="img" src="([^"]+)"[^>]*alt="([^"]*)"[^>]*height="36"/i);
        const bodyMatch = html.match(/<span class="BodyTextContainer">([\s\S]*?)<\/span>/i);

        const username = userLinkMatch ? userLinkMatch[1] : (usernameMatch || 'Threads User');
        const avatar = avatarMatch ? avatarMatch[1].replace(/&amp;/g, '&') : null;
        const caption = bodyMatch ? bodyMatch[1].replace(/<[^>]+>/g, '').trim() : null;

        if (mediaImgMatch) {
          const imgUrl = mediaImgMatch[1].replace(/&amp;/g, '&');
          const formats = [{
            id: 'threads_photo_1',
            label: 'Foto Threads HD Resolusi Penuh',
            badge: 'Foto HD',
            type: 'image',
            url: imgUrl,
            thumb: imgUrl,
            ext: 'jpg',
            recommended: true
          }];

          return {
            success: true,
            platform: 'threads',
            title: caption ? (caption.length > 50 ? caption.slice(0, 50) + '...' : caption) : `Threads Foto oleh @${username}`,
            author: {
              name: username,
              username: `@${username}`,
              avatar: avatar
            },
            thumbnail: imgUrl,
            previewVideo: null,
            audioUrl: null,
            duration: null,
            isPhotos: true,
            images: [imgUrl],
            slides: [{
              index: 1,
              type: 'image',
              ext: 'jpg',
              url: imgUrl,
              thumb: imgUrl,
              label: 'Foto'
            }],
            formats: formats
          };
        }
      }
    } catch (err) {
      if (err.message && (err.message.includes('tidak tersedia') || err.message.includes('privat'))) {
        throw err;
      }
      console.warn(`Threads Strategy 2 (Embed) failed for ${sc}:`, err);
    }
  }

  throw new Error('Gagal mengekstrak postingan Threads. Pastikan link berasal dari postingan publik yang aktif.');
}

/**
 * Extract Facebook Videos, Reels, and Audio
 * Two-tiered extraction engine: Direct HTML stream parsing with GetMyFB API fallback
 */
export async function extractFacebook(url) {
  let cleanUrl = cleanMediaUrl(url);

  // Follow short/share link redirects if needed (fb.watch / share links)
  if (cleanUrl.includes('fb.watch') || cleanUrl.includes('/share/')) {
    try {
      const redirectRes = await safeHttp(cleanUrl, {
        method: 'HEAD',
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        }
      });
      if (redirectRes.url && !redirectRes.url.includes('/share/')) {
        cleanUrl = redirectRes.url;
      }
    } catch (e) {
      try {
        const getRes = await safeHttp(cleanUrl, {
          method: 'GET',
          headers: {
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
          }
        });
        if (getRes.url && !getRes.url.includes('/share/')) {
          cleanUrl = getRes.url;
        }
      } catch (err) {}
    }
  }

  function unescapeFbUrl(str) {
    if (!str) return '';
    try {
      return JSON.parse(`"${str}"`).replace(/\\\//g, '/');
    } catch (e) {
      return str.replace(/\\\//g, '/').replace(/\\u0026/g, '&');
    }
  }

  // Strategy 1: Direct Facebook Page Scraping (Ultra-fast direct CDN links)
  try {
    const res = await safeHttp(cleanUrl, {
      headers: {
        'sec-fetch-user': '?1',
        'sec-ch-ua-mobile': '?0',
        'sec-fetch-site': 'none',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'authority': 'www.facebook.com',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9'
      }
    });

    if (res.ok) {
      const rawHtml = await res.text();

      const hdMatch =
        rawHtml.match(/"browser_native_hd_url":"([^"]+)"/) ||
        rawHtml.match(/"playable_url_quality_hd":"([^"]+)"/) ||
        rawHtml.match(/hd_src\s*:\s*"([^"]+)"/) ||
        rawHtml.match(/hd_src_no_ratelimit\s*:\s*"([^"]+)"/);

      const sdMatch =
        rawHtml.match(/"browser_native_sd_url":"([^"]+)"/) ||
        rawHtml.match(/"playable_url":"([^"]+)"/) ||
        rawHtml.match(/sd_src\s*:\s*"([^"]+)"/) ||
        rawHtml.match(/sd_src_no_ratelimit\s*:\s*"([^"]+)"/);

      if (hdMatch || sdMatch) {
        const thumbMatch =
          rawHtml.match(/"preferred_thumbnail":{"image":{"uri":"([^"]+)"/) ||
          rawHtml.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);

        const titleMatch =
          rawHtml.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
          rawHtml.match(/<title>([^<]+)<\/title>/i);

        const hdUrl = hdMatch ? unescapeFbUrl(hdMatch[1]) : null;
        const sdUrl = sdMatch ? unescapeFbUrl(sdMatch[1]) : null;
        const thumbUrl = thumbMatch ? unescapeFbUrl(thumbMatch[1]) : null;
        let title = titleMatch ? titleMatch[1].replace(/&#xb7;/g, '·').replace(/&amp;/g, '&').replace(/&quot;/g, '"') : 'Facebook Video';
        title = title.replace(/\s*\|\s*Facebook$/i, '').trim();

        const formats = [];
        if (hdUrl) {
          formats.push({
            id: 'fb_hd',
            label: 'Video HD 720p (Kualitas Tinggi)',
            badge: 'HD 720p',
            type: 'video',
            url: hdUrl,
            thumb: thumbUrl,
            ext: 'mp4',
            recommended: true
          });
        }
        if (sdUrl) {
          formats.push({
            id: 'fb_sd',
            label: 'Video SD 360p (Standar)',
            badge: 'SD 360p',
            type: 'video',
            url: sdUrl,
            thumb: thumbUrl,
            ext: 'mp4',
            recommended: !hdUrl
          });
        }

        return {
          success: true,
          platform: 'facebook',
          title: title,
          author: {
            name: 'Facebook Video',
            username: '',
            avatar: null
          },
          thumbnail: thumbUrl,
          previewVideo: hdUrl || sdUrl,
          audioUrl: null,
          isPhotos: false,
          images: [],
          slides: [],
          formats
        };
      }
    }
  } catch (err) {
    console.warn('Direct FB scraper error, trying GetMyFB fallback:', err);
  }

  // Strategy 2: GetMyFB API Fallback (Supports Reels, Watch, & Private/Restricted)
  try {
    const res = await safeHttp('https://getmyfb.com/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: new URLSearchParams({ id: cleanUrl })
    });

    if (res.ok) {
      const html = await res.text();
      const thumbMatch = html.match(/<img[^>]+src="([^"]+)"/i);
      const thumbUrl = thumbMatch ? thumbMatch[1] : null;

      const titleMatch = html.match(/<figcaption[^>]*class="results-item-text"[^>]*>([\s\S]*?)<\/figcaption>/i) ||
        html.match(/<h5[^>]*>([\s\S]*?)<\/h5>/i);
      let title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Facebook Video';
      if (title.length <= 3) title = 'Facebook Video';

      const items = [...html.matchAll(/<li class="results-list-item[^"]*">([\s\S]*?)<\/li>/gi)];
      const formats = [];
      let previewVideo = null;
      let audioUrl = null;

      for (const item of items) {
        const itemHtml = item[1];
        const aMatch = itemHtml.match(/href="([^"]+)"/);
        if (!aMatch || aMatch[1].includes('play.google.com') || aMatch[1].startsWith('/')) continue;

        const url = aMatch[1];
        const labelText = itemHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

        if (labelText.toLowerCase().includes('hd') || labelText.includes('720p') || labelText.includes('1080p')) {
          if (!previewVideo) previewVideo = url;
          formats.push({
            id: 'fb_hd',
            label: 'Video HD 720p (Kualitas Tinggi)',
            badge: 'HD 720p',
            type: 'video',
            url: url,
            thumb: thumbUrl,
            ext: 'mp4',
            recommended: true
          });
        } else if (labelText.toLowerCase().includes('sd') || labelText.includes('360p')) {
          if (!previewVideo) previewVideo = url;
          formats.push({
            id: 'fb_sd',
            label: 'Video SD 360p (Standar)',
            badge: 'SD 360p',
            type: 'video',
            url: url,
            thumb: thumbUrl,
            ext: 'mp4',
            recommended: formats.length === 0
          });
        } else if (labelText.toLowerCase().includes('mp3') || labelText.toLowerCase().includes('audio')) {
          audioUrl = url;
          formats.push({
            id: 'fb_audio',
            label: 'Audio Musik MP3',
            badge: 'MP3 Audio',
            type: 'audio',
            url: url,
            ext: 'mp3'
          });
        }
      }

      if (formats.length > 0) {
        return {
          success: true,
          platform: 'facebook',
          title: title,
          author: {
            name: 'Facebook Video',
            username: '',
            avatar: null
          },
          thumbnail: thumbUrl,
          previewVideo: previewVideo,
          audioUrl: audioUrl,
          isPhotos: false,
          images: [],
          slides: [],
          formats
        };
      }
    }
  } catch (err) {
    console.error('GetMyFB error:', err);
  }

  throw new Error('Gagal mengekstrak video Facebook. Pastikan link aktif & video bersifat publik.');
}

/**
 * Pinterest Extractor (Videos, Photos, Reels, and GIFs)
 * Supports pin.it, pinterest.com/pin/..., id.pinterest.com, etc.
 */
export async function extractPinterest(rawUrl) {
  let cleanUrl = rawUrl.trim();

  // Try Primary Engine: backend1.tioo.eu.org/pinterest
  try {
    const apiUrl = `https://backend1.tioo.eu.org/pinterest?url=${encodeURIComponent(cleanUrl)}`;
    const res = await safeHttp(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.result) {
        const item = data.result;
        const formats = [];
        const isVideo = !!(item.is_video || item.video_url || item.videos);

        let previewVideo = null;
        let thumbUrl = item.image || item.images?.orig?.url || item.images?.['736x']?.url || item.images?.['564x']?.url || null;

        let title = (item.title || item.description || '').trim();
        if (!title || title.length < 3) {
          title = item.user?.full_name ? `Pin Oleh ${item.user.full_name}` : 'Pinterest Pin';
        }
        if (title.length > 80) title = title.substring(0, 77) + '...';

        const author = {
          name: item.user?.full_name || item.user?.username || 'Pinterest User',
          username: item.user?.username ? `@${item.user.username}` : '',
          avatar: item.user?.avatar_url || null
        };

        if (isVideo) {
          let videoUrl = item.video_url;
          if (!videoUrl && item.videos) {
            videoUrl = item.videos.V_720P?.url || item.videos.V_EXP7?.url || item.videos.V_HLSV4?.url;
          }

          if (videoUrl) {
            if (videoUrl.includes('.m3u8')) {
              const mp4Candidate = videoUrl.replace('/hls/', '/expMp4/').replace('.m3u8', '_720w.mp4');
              videoUrl = mp4Candidate;
            }

            previewVideo = videoUrl;
            formats.push({
              id: 'pin_video_hd',
              label: 'Video HD MP4 (Kualitas Terbaik)',
              badge: 'HD 720p',
              type: 'video',
              url: videoUrl,
              thumb: thumbUrl,
              ext: 'mp4',
              recommended: true
            });
          }

          if (thumbUrl) {
            formats.push({
              id: 'pin_poster',
              label: 'Gambar Sampul Pin (Resolusi Asli)',
              badge: 'Foto HD',
              type: 'photo',
              url: thumbUrl,
              thumb: thumbUrl,
              ext: 'jpg'
            });
          }

          return {
            success: true,
            platform: 'pinterest',
            title,
            author,
            thumbnail: thumbUrl,
            previewVideo,
            isPhotos: false,
            images: thumbUrl ? [thumbUrl] : [],
            slides: [],
            formats
          };
        } else {
          // Photo Pin
          const origImage = item.images?.orig?.url || item.image;
          const hqImage = item.images?.['736x']?.url || item.images?.['564x']?.url || origImage;

          if (origImage) {
            formats.push({
              id: 'pin_photo_orig',
              label: 'Foto HD Resolusi Asli (Original)',
              badge: 'Ultra HD',
              type: 'photo',
              url: origImage,
              thumb: origImage,
              ext: 'jpg',
              recommended: true
            });
          }

          if (hqImage && hqImage !== origImage) {
            formats.push({
              id: 'pin_photo_hq',
              label: 'Foto Kualitas Standar (Lebih Ringan)',
              badge: 'Standar HD',
              type: 'photo',
              url: hqImage,
              thumb: hqImage,
              ext: 'jpg'
            });
          }

          return {
            success: true,
            platform: 'pinterest',
            title,
            author,
            thumbnail: origImage || hqImage,
            previewVideo: null,
            isPhotos: true,
            images: [origImage || hqImage],
            slides: [origImage || hqImage],
            formats
          };
        }
      }
    }
  } catch (err) {
    console.warn('Pinterest Primary Engine failed, trying fallback:', err);
  }

  // Fallback Engine: Direct HTML scraping
  try {
    const res = await safeHttp(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    });

    if (res.ok) {
      const html = await res.text();

      const origMatch = html.match(/https?:\/\/i\.pinimg\.com\/originals\/[a-f0-9\/]+\.(?:jpg|png|webp|gif)/i);
      const videoMatch = html.match(/https?:\/\/(?:v1|v)\.pinimg\.com\/videos\/[^\s"'\\]+\.(?:mp4|m3u8)/i);
      const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);

      let title = titleMatch ? titleMatch[1].replace(' | Pinterest', '').trim() : 'Pinterest Pin';
      if (title.length > 80) title = title.substring(0, 77) + '...';

      const formats = [];

      if (videoMatch) {
        let vidUrl = videoMatch[0];
        if (vidUrl.includes('.m3u8')) {
          vidUrl = vidUrl.replace('/hls/', '/expMp4/').replace('.m3u8', '_720w.mp4');
        }
        formats.push({
          id: 'pin_direct_video',
          label: 'Video Pinterest HD',
          badge: 'HD Video',
          type: 'video',
          url: vidUrl,
          thumb: origMatch ? origMatch[0] : null,
          ext: 'mp4',
          recommended: true
        });
      }

      if (origMatch) {
        formats.push({
          id: 'pin_direct_photo',
          label: 'Foto HD Original',
          badge: 'Original HD',
          type: 'photo',
          url: origMatch[0],
          thumb: origMatch[0],
          ext: 'jpg',
          recommended: !videoMatch
        });
      }

      if (formats.length > 0) {
        return {
          success: true,
          platform: 'pinterest',
          title,
          author: {
            name: 'Pinterest Creator',
            username: '',
            avatar: null
          },
          thumbnail: origMatch ? origMatch[0] : null,
          previewVideo: videoMatch ? formats[0].url : null,
          isPhotos: !videoMatch,
          images: origMatch ? [origMatch[0]] : [],
          slides: origMatch ? [origMatch[0]] : [],
          formats
        };
      }
    }
  } catch (err) {
    console.error('Pinterest fallback failed:', err);
  }

  throw new Error('Gagal mengekstrak media Pinterest. Pastikan tautan pin benar & aktif.');
}




