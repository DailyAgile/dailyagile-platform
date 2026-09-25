import { Config } from 'remotion';

export const config: Config = () => {
  return {
    durationInFrames: 1800, // 60 seconds at 30fps
    fps: 30,
    width: 1920,
    height: 1080,
    defaultCodec: 'h264',
    defaultPixelFormat: 'yuv420p',
    defaultMetadata: {
      title: 'DailyAgile Tutorial Videos',
      author: 'DailyAgile',
      copyright: 'DailyAgile 2026',
    },
  };
};
