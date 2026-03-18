const https = require('https');

const urls = [
    'https://cdn.islamic.network/quran/images/1_auto.png',
    'https://cdn.islamic.network/quran/images/1.png',
    'https://cdn.islamic.network/quran/images/high-resolution/1.png',
    'https://quran-images-api.herokuapp.com/show/page/1',
    'https://raw.githubusercontent.com/quran/quran.com-images/master/width_1024/page001.png',
    'https://raw.githubusercontent.com/quran/quran.com-images/master/width_1024/page001.png'
];

async function checkUrl(url) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            resolve({ url, status: res.statusCode });
        }).on('error', () => resolve({ url, status: 'error' }));
    });
}

async function main() {
    for (const url of urls) {
        const res = await checkUrl(url);
        console.log(res);
    }
}
main();
