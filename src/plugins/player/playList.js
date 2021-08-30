import TrackPlayer from 'react-native-track-player'
import BackgroundTimer from 'react-native-background-timer'
import { defaultUrl } from '@/config'

const list = []
const defaultUserAgent = 'Mozilla/5.0 (Linux; Android 10; Pixel 3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Mobile Safari/537.36'
const httpRxp = /^(https?:\/\/.+|\/.+)/

export const buildTracks = (musicInfo, type, url) => {
  const track = []
  if (url) {
    track.push({
      id: `${musicInfo.source}__//${musicInfo.songmid}__//${type}__//${Math.random()}__//${url}`,
      url,
      title: musicInfo.name || 'Unknow',
      artist: musicInfo.singer || 'Unknow',
      album: musicInfo.albumName || null,
      artwork: httpRxp.test(musicInfo.img) ? musicInfo.img : null,
      userAgent: defaultUserAgent,
      original: { ...musicInfo },
    })
  }
  track.push({
    id: `${musicInfo.source}__//${musicInfo.songmid}__//${type}__//${Math.random()}__//default`,
    url: defaultUrl,
    title: musicInfo.name || 'Unknow',
    artist: musicInfo.singer || 'Unknow',
    album: musicInfo.albumName || null,
    artwork: httpRxp.test(musicInfo.img) ? musicInfo.img : null,
    original: { ...musicInfo },
  })
  return track
  // console.log('buildTrack', musicInfo.name, url)
}
export const buildTrack = (musicInfo, type, url) => {
  return url
    ? {
        id: `${musicInfo.source}__//${musicInfo.songmid}__//${type}__//${Math.random()}__//${url}`,
        url,
        title: musicInfo.name || 'Unknow',
        artist: musicInfo.singer || 'Unknow',
        album: musicInfo.albumName || null,
        artwork: httpRxp.test(musicInfo.img) ? musicInfo.img : null,
        userAgent: defaultUserAgent,
        original: { ...musicInfo },
      }
    : {
        id: `${musicInfo.source}__//${musicInfo.songmid}__//${type}__//${Math.random()}__//default`,
        url: defaultUrl,
        title: musicInfo.name || 'Unknow',
        artist: musicInfo.singer || 'Unknow',
        album: musicInfo.albumName || null,
        artwork: httpRxp.test(musicInfo.img) ? musicInfo.img : null,
        original: { ...musicInfo },
      }
}

export const isTempTrack = trackId => /\/\/default$/.test(trackId)


export const getCurrentTrackId = async() => {
  const currentTrackIndex = await TrackPlayer.getCurrentTrack()
  return list[currentTrackIndex]?.id
}
export const getCurrentTrack = async() => {
  const currentTrackIndex = await TrackPlayer.getCurrentTrack()
  return list[currentTrackIndex]
}

export const playMusic = async(tracks, time) => {
  // console.log(tracks, time)
  const track = tracks[0]
  // await updateMusicInfo(track)
  const currentTrackIndex = await TrackPlayer.getCurrentTrack()
  await TrackPlayer.add(tracks).then(() => list.push(...tracks))
  await TrackPlayer.skip(list.indexOf(track))

  if (currentTrackIndex == null) {
    if (!isTempTrack(track.id)) {
      if (time) await TrackPlayer.seekTo(time)
      if (global.restorePlayInfo) {
        await TrackPlayer.pause()
        global.restorePlayInfo = null
      } else {
        await TrackPlayer.play()
      }
    }
  } else {
    if (isTempTrack(track.id)) {
      await TrackPlayer.pause()
    } else {
      await TrackPlayer.seekTo(time)
      await TrackPlayer.play()
    }
  }

  if (list.length > 2) {
    TrackPlayer.remove(Array(list.length - 2).fill(null).map((_, i) => i)).then(() => list.splice(0, list.length - 2))
  }
}


export const updateMetaInfo = async track => {
  console.log('+++++updateMusicPic+++++', track.artwork)
  await TrackPlayer.updateNowPlayingMetadata({
    title: track.title || 'Unknow',
    artist: track.artist || 'Unknow',
    album: track.album || null,
    artwork: track.artwork || null,
  })
}


// 解决快速切歌导致的通知栏歌曲信息与当前播放歌曲对不上的问题
const debounceUpdateMetaInfoTools = {
  updateMetaPromise: Promise.resolve(),
  track: null,
  isDebounced: false,
  debounce(fn) {
    let delayTimer = null
    let isDelayRun = false
    let timer = null
    let _track = null
    return (track, time) => {
      if (!this.isDebounced && _track != null) this.isDebounced = true
      if (timer) {
        BackgroundTimer.clearTimeout(timer)
        timer = null
      }
      if (delayTimer) {
        BackgroundTimer.clearTimeout(delayTimer)
        delayTimer = null
      }
      if (isDelayRun) {
        _track = track
        timer = BackgroundTimer.setTimeout(() => {
          timer = null
          let track = _track
          _track = null
          isDelayRun = false
          fn(track, time)
        }, 800)
      } else {
        isDelayRun = true
        fn(track, time)
        delayTimer = BackgroundTimer.setTimeout(() => {
          delayTimer = null
          isDelayRun = false
        }, 500)
      }
    }
  },
  delayUpdateMusicInfo() {
    if (this.delayTimer) BackgroundTimer.clearTimeout(this.delayTimer)
    this.delayTimer = BackgroundTimer.setTimeout(() => {
      this.delayTimer = null
      if (this.track) {
        this.updateMetaPromise.then(() => {
          this.updateMetaPromise = updateMetaInfo(this.track)
        })
      }
    }, 1500)
  },
  init() {
    return this.debounce(track => {
      this.track = track
      return this.updateMetaPromise.then(() => {
        // console.log('run')
        if (this.track === track) {
          this.updateMetaPromise = updateMetaInfo(track).then(() => {
            if (this.isDebounced) {
              this.delayUpdateMusicInfo()
              this.isDebounced = false
            }
          })
        }
      })
    })
  },
}

export const delayUpdateMusicInfo = debounceUpdateMetaInfoTools.init()

// export const delayUpdateMusicInfo = ((fn, delay = 800) => {
//   let delayTimer = null
//   let isDelayRun = false
//   let timer = null
//   let _track = null
//   return track => {
//     _track = track
//     if (timer) {
//       BackgroundTimer.clearTimeout(timer)
//       timer = null
//     }
//     if (isDelayRun) {
//       if (delayTimer) {
//         BackgroundTimer.clearTimeout(delayTimer)
//         delayTimer = null
//       }
//       timer = BackgroundTimer.setTimeout(() => {
//         timer = null
//         let track = _track
//         _track = null
//         isDelayRun = false
//         fn(track)
//       }, delay)
//     } else {
//       isDelayRun = true
//       fn(track)
//       delayTimer = BackgroundTimer.setTimeout(() => {
//         delayTimer = null
//         isDelayRun = false
//       }, 500)
//     }
//   }
// })(track => {
//   console.log('+++++delayUpdateMusicPic+++++', track.artwork)
//   updateMetaInfo(track)
// })