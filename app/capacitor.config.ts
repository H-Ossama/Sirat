import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.me3raj.app',
    appName: 'Sirat',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    },
    plugins: {
        StatusBar: {
            overlaysWebView: true,
            style: 'LIGHT',
            backgroundColor: '#00000000'
        },
        LocalNotifications: {
            smallIcon: 'ic_notification',
            iconColor: '#D4A528',
            sound: 'beep.wav',
        },
        CapacitorHttp: {
            enabled: true,
        },
    },
};

export default config;
