const puppeteer = require('puppeteer');
const axios = require('axios');

async function run() {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-blink-features=AutomationControlled', // Ukrywa, że to bot
            '--window-size=1920,1080'
        ]
    });

    try {
        const page = await browser.newPage();
        
        // Ukrywamy webdriver przed Cloudflare
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });

        console.log('Wchodzę na stronę mta4life.pl...');
        await page.goto('https://mta4life.pl/', { waitUntil: 'networkidle2', timeout: 50000 });
        
        console.log('Czekam na przejście weryfikacji Cloudflare i załadowanie widgetów...');
        // Dajemy dłuższą chwilę, aby Cloudflare autmatycznie zweryfikowało sesję headless
        await new Promise(r => setTimeout(r, 10000));

        // Symulujemy ruch myszką, co często pomaga zamknąć Cloudflare Challenge
        await page.mouse.move(100, 100);
        await page.mouse.down();
        await page.mouse.up();
        await new Promise(r => setTimeout(r, 4000));

        const fetched = await page.evaluate(() => {
            const results = {};
            const mapping = {
                'pszenica': 'Pszenica',
                'rapeseed': 'Rzepak',
                'corn': 'Kukurydza',
                'pumpkin': 'Dynia',
                'coal': 'Węgiel'
            };

            for (const [key, name] of Object.entries(mapping)) {
                const el = document.querySelector(`.mtaCommodityPrice--${key}`);
                if (el) {
                    const amountEl = el.querySelector('.mtaCommodityPrice__amount');
                    const unitEl = el.querySelector('.mtaCommodityPrice__unit');

                    if (amountEl) {
                        const amountText = amountEl.innerText.trim();
                        const currentVal = parseFloat(amountText.replace(',', '.'));
                        const unitText = unitEl ? unitEl.innerText.trim() : 'PLN / kg';

                        if (!isNaN(currentVal)) {
                            results[name] = {
                                value: currentVal,
                                unit: unitText.includes('m³') ? 'm³' : 'kg',
                                raw: `${amountText} ${unitText}`
                            };
                        }
                    }
                }
            }

            return results;
        });

        console.log('Pobrane surowce:', JSON.stringify(fetched));

        if (Object.keys(fetched).length > 0) {
            const workerUrl = 'https://patient-star-01ba.frebcraft17.workers.dev/';
            await axios.post(workerUrl, fetched);
            console.log('Ceny zostały pomyślnie wysłane do Cloudflare Workera!');
        } else {
            const bodyHTML = await page.evaluate(() => document.body.innerHTML.substring(0, 500));
            console.log('DEBUG HTML (pierwsze 500 znaków):', bodyHTML);
            console.error('Nadal zablokowane przez Cloudflare lub brak elementów.');
            process.exit(1);
        }

        await browser.close();
    } catch (error) {
        if (browser) await browser.close();
        console.error('Błąd krytyczny:', error.message);
        process.exit(1);
    }
}

run();
