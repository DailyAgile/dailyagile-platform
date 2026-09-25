import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dailyagile.quiz',
  appName: 'DailyAgile Quiz',
  webDir: 'public',  // Fallback for static assets only
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'http://localhost:3000',
    cleartext: process.env.NODE_ENV !== 'production',
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      backgroundColor: '#1E3A5F',
      showSpinner: true,
      spinnerColor: '#0891B2'
    }
  }
};

export default config;
